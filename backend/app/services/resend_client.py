"""Email sending via Resend. Falls back to logging in development
when RESEND_API_KEY is not configured, so flows remain testable."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

# Bilingual subjects/bodies keyed by template name (§19)
TEMPLATES: dict[str, dict[str, dict[str, str]]] = {
    "verify_email": {
        "en": {
            "subject": "Verify your LandChain account",
            "body": "<p>Welcome to LandChain!</p><p>Click the link below to verify your email:</p><p><a href=\"{link}\">Verify my email</a></p><p>This link expires in 3 days.</p>",
        },
        "fr": {
            "subject": "Vérifiez votre compte LandChain",
            "body": "<p>Bienvenue sur LandChain !</p><p>Cliquez sur le lien ci-dessous pour vérifier votre adresse e-mail :</p><p><a href=\"{link}\">Vérifier mon e-mail</a></p><p>Ce lien expire dans 3 jours.</p>",
        },
    },
    "password_reset": {
        "en": {
            "subject": "Reset your LandChain password",
            "body": "<p>We received a request to reset your password.</p><p><a href=\"{link}\">Reset my password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>",
        },
        "fr": {
            "subject": "Réinitialisez votre mot de passe LandChain",
            "body": "<p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p><p><a href=\"{link}\">Réinitialiser mon mot de passe</a></p><p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>",
        },
    },
    "waitlist_confirmation": {
        "en": {
            "subject": "You're on the LandChain waitlist",
            "body": "<p>Thanks for joining the LandChain waitlist!</p><p>We'll notify you as soon as we launch. Together, we're ending land fraud in Cameroon.</p>",
        },
        "fr": {
            "subject": "Vous êtes sur la liste d'attente LandChain",
            "body": "<p>Merci d'avoir rejoint la liste d'attente LandChain !</p><p>Nous vous informerons dès notre lancement. Ensemble, mettons fin à la fraude foncière au Cameroun.</p>",
        },
    },
    "kyc_approved": {
        "en": {"subject": "Your KYC has been approved", "body": "<p>Good news — your identity verification has been approved. You can now register parcels and purchase a subscription.</p>"},
        "fr": {"subject": "Votre KYC a été approuvé", "body": "<p>Bonne nouvelle — votre vérification d'identité a été approuvée. Vous pouvez désormais enregistrer des parcelles et souscrire un abonnement.</p>"},
    },
    "kyc_rejected": {
        "en": {"subject": "Your KYC submission was rejected", "body": "<p>Unfortunately your identity verification was rejected.</p><p>Reason: {reason}</p><p>You may resubmit from your dashboard.</p>"},
        "fr": {"subject": "Votre soumission KYC a été rejetée", "body": "<p>Malheureusement, votre vérification d'identité a été rejetée.</p><p>Raison : {reason}</p><p>Vous pouvez soumettre à nouveau depuis votre tableau de bord.</p>"},
    },
    "payment_successful": {
        "en": {"subject": "Payment received — LandChain", "body": "<p>Your payment of {amount} XAF was successful. Thank you!</p><p>{details}</p>"},
        "fr": {"subject": "Paiement reçu — LandChain", "body": "<p>Votre paiement de {amount} XAF a été effectué avec succès. Merci !</p><p>{details}</p>"},
    },
    "payment_failed": {
        "en": {"subject": "Payment failed — LandChain", "body": "<p>Your payment of {amount} XAF could not be completed. Please try again from your dashboard.</p>"},
        "fr": {"subject": "Échec du paiement — LandChain", "body": "<p>Votre paiement de {amount} XAF n'a pas pu être effectué. Veuillez réessayer depuis votre tableau de bord.</p>"},
    },
    "subscription_expiring": {
        "en": {"subject": "Your LandChain subscription expires soon", "body": "<p>Your subscription expires on {date}. LandChain subscriptions renew manually — visit your dashboard to renew and keep full verification access.</p>"},
        "fr": {"subject": "Votre abonnement LandChain expire bientôt", "body": "<p>Votre abonnement expire le {date}. Les abonnements LandChain se renouvellent manuellement — rendez-vous sur votre tableau de bord pour le renouveler.</p>"},
    },
    "listing_expiring": {
        "en": {"subject": "Your land listing expires soon", "body": "<p>Your marketplace listing for parcel {parcel} expires on {date}. Renew it from your dashboard to stay visible to buyers.</p>"},
        "fr": {"subject": "Votre annonce expire bientôt", "body": "<p>Votre annonce pour la parcelle {parcel} expire le {date}. Renouvelez-la depuis votre tableau de bord pour rester visible.</p>"},
    },
    "transfer_update": {
        "en": {"subject": "Ownership transfer update — LandChain", "body": "<p>Transfer update for parcel {parcel}: {status}.</p>"},
        "fr": {"subject": "Mise à jour du transfert — LandChain", "body": "<p>Mise à jour du transfert pour la parcelle {parcel} : {status}.</p>"},
    },
    "dispute_update": {
        "en": {"subject": "Dispute status update — LandChain", "body": "<p>The dispute on parcel {parcel} is now: {status}.</p><p>{notes}</p>"},
        "fr": {"subject": "Mise à jour du litige — LandChain", "body": "<p>Le litige concernant la parcelle {parcel} est maintenant : {status}.</p><p>{notes}</p>"},
    },
    "document_review": {
        "en": {"subject": "Document verification result — LandChain", "body": "<p>Your document has been reviewed: {verdict}.</p><p>{notes}</p>"},
        "fr": {"subject": "Résultat de vérification du document — LandChain", "body": "<p>Votre document a été examiné : {verdict}.</p><p>{notes}</p>"},
    },
    "contact_received": {
        "en": {"subject": "We received your message — LandChain", "body": "<p>Thanks for contacting LandChain. Our team will get back to you shortly.</p>"},
        "fr": {"subject": "Nous avons reçu votre message — LandChain", "body": "<p>Merci d'avoir contacté LandChain. Notre équipe vous répondra sous peu.</p>"},
    },
}


async def send_email(to: str, template: str, locale: str = "en", **kwargs: str) -> bool:
    tpl = TEMPLATES.get(template, {}).get(locale if locale in ("en", "fr") else "en")
    if tpl is None:
        logger.error("Unknown email template: %s", template)
        return False
    subject = tpl["subject"]
    try:
        html = tpl["body"].format(**kwargs)
    except KeyError as exc:
        logger.error("Missing template variable for %s: %s", template, exc)
        return False

    if not settings.RESEND_API_KEY:
        logger.info("[EMAIL:dev-mode] to=%s subject=%r html=%r", to, subject, html)
        return True

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            )
        if resp.status_code >= 400:
            logger.error("Resend error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.error("Resend request failed: %s", exc)
        return False
