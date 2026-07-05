"""Email sending via Resend. Falls back to logging in development
when RESEND_API_KEY is not configured, so flows remain testable."""

import logging

import httpx

from app.core.config import settings
from app.services.email_layout import cta_button, info_box, wrap_email

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

# Each template: subject, preheader, and inner HTML (wrapped at send time).
# Use {cta} where a primary button should appear (link passed via kwargs).
TEMPLATES: dict[str, dict[str, dict[str, str]]] = {
    "verify_email": {
        "en": {
            "subject": "Verify your LandChain account",
            "preheader": "One click to activate your account",
            "cta_label": "Verify my email",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Welcome to LandChain</h1>
<p style="margin:0 0 12px;">Thanks for signing up. Confirm your email address to access parcel verification and registration.</p>
{cta}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">This link expires in <strong>3 days</strong>. If you did not create an account, you can ignore this email.</p>
""",
        },
        "fr": {
            "subject": "Vérifiez votre compte LandChain",
            "preheader": "Un clic pour activer votre compte",
            "cta_label": "Vérifier mon e-mail",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Bienvenue sur LandChain</h1>
<p style="margin:0 0 12px;">Merci pour votre inscription. Confirmez votre adresse e-mail pour accéder à la vérification et l'enregistrement de parcelles.</p>
{cta}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Ce lien expire dans <strong>3 jours</strong>. Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>
""",
        },
    },
    "password_reset": {
        "en": {
            "subject": "Reset your LandChain password",
            "preheader": "Password reset request for your account",
            "cta_label": "Reset my password",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Reset your password</h1>
<p style="margin:0 0 12px;">We received a request to reset the password for your LandChain account.</p>
{cta}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">This link expires in <strong>1 hour</strong>. If you did not request a reset, you can safely ignore this email — your password will not change.</p>
""",
        },
        "fr": {
            "subject": "Réinitialisez votre mot de passe LandChain",
            "preheader": "Demande de réinitialisation de mot de passe",
            "cta_label": "Réinitialiser mon mot de passe",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Réinitialiser votre mot de passe</h1>
<p style="margin:0 0 12px;">Nous avons reçu une demande de réinitialisation du mot de passe de votre compte LandChain.</p>
{cta}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Ce lien expire dans <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe ne sera pas modifié.</p>
""",
        },
    },
    "waitlist_confirmation": {
        "en": {
            "subject": "You're on the LandChain waitlist",
            "preheader": "We'll notify you when we launch",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">You're on the list</h1>
<p style="margin:0 0 12px;">Thanks for joining the LandChain waitlist. We're building a safer way to buy and verify land in Cameroon.</p>
<p style="margin:0;">We'll email you as soon as we're ready. Together, we're ending land fraud — one verified parcel at a time.</p>
""",
        },
        "fr": {
            "subject": "Vous êtes sur la liste d'attente LandChain",
            "preheader": "Nous vous préviendrons au lancement",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Vous êtes inscrit(e)</h1>
<p style="margin:0 0 12px;">Merci d'avoir rejoint la liste d'attente LandChain. Nous construisons une façon plus sûre d'acheter et de vérifier des terrains au Cameroun.</p>
<p style="margin:0;">Nous vous écrirons dès que nous serons prêts. Ensemble, mettons fin à la fraude foncière — une parcelle vérifiée à la fois.</p>
""",
        },
    },
    "kyc_approved": {
        "en": {
            "subject": "Identity verified — you're all set",
            "preheader": "Your KYC has been approved",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Identity verified ✓</h1>
<p style="margin:0 0 12px;">Good news — your identity verification (KYC) has been approved.</p>
{info}
<p style="margin:0;">You can now register parcels, subscribe for full verification reports, and list on the marketplace.</p>
""",
            "info": "Your account is fully activated. Head to your dashboard to get started.",
        },
        "fr": {
            "subject": "Identité vérifiée — tout est prêt",
            "preheader": "Votre KYC a été approuvé",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Identité vérifiée ✓</h1>
<p style="margin:0 0 12px;">Bonne nouvelle — votre vérification d'identité (KYC) a été approuvée.</p>
{info}
<p style="margin:0;">Vous pouvez désormais enregistrer des parcelles, souscrire un abonnement pour les rapports complets et publier sur le marché.</p>
""",
            "info": "Votre compte est entièrement activé. Rendez-vous sur votre tableau de bord pour commencer.",
        },
    },
    "kyc_rejected": {
        "en": {
            "subject": "KYC update — action required",
            "preheader": "Your identity verification was not approved",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Verification not approved</h1>
<p style="margin:0 0 12px;">Unfortunately, we could not approve your identity verification at this time.</p>
{info}
<p style="margin:0;">You can review the reason above and submit updated documents from your dashboard.</p>
""",
            "info": "<strong>Reason:</strong> {reason}",
            "info_tone": "warning",
        },
        "fr": {
            "subject": "Mise à jour KYC — action requise",
            "preheader": "Votre vérification d'identité n'a pas été approuvée",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Vérification non approuvée</h1>
<p style="margin:0 0 12px;">Malheureusement, nous n'avons pas pu approuver votre vérification d'identité pour le moment.</p>
{info}
<p style="margin:0;">Consultez la raison ci-dessus et soumettez de nouveaux documents depuis votre tableau de bord.</p>
""",
            "info": "<strong>Raison :</strong> {reason}",
            "info_tone": "warning",
        },
    },
    "payment_successful": {
        "en": {
            "subject": "Payment received — thank you",
            "preheader": "Your LandChain payment was successful",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Payment confirmed</h1>
<p style="margin:0 0 12px;">We've received your payment. Thank you for trusting LandChain.</p>
{info}
""",
            "info": "<strong>Amount:</strong> {amount} XAF<br/><strong>Details:</strong> {details}",
            "info_tone": "success",
        },
        "fr": {
            "subject": "Paiement reçu — merci",
            "preheader": "Votre paiement LandChain a réussi",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Paiement confirmé</h1>
<p style="margin:0 0 12px;">Nous avons bien reçu votre paiement. Merci de faire confiance à LandChain.</p>
{info}
""",
            "info": "<strong>Montant :</strong> {amount} XAF<br/><strong>Détails :</strong> {details}",
            "info_tone": "success",
        },
    },
    "payment_failed": {
        "en": {
            "subject": "Payment could not be completed",
            "preheader": "Your LandChain payment was unsuccessful",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Payment unsuccessful</h1>
<p style="margin:0 0 12px;">Your payment could not be completed. No charge was made.</p>
{info}
<p style="margin:0;">Please try again from your dashboard. If the problem persists, contact your mobile money provider.</p>
""",
            "info": "<strong>Amount:</strong> {amount} XAF",
            "info_tone": "danger",
        },
        "fr": {
            "subject": "Le paiement n'a pas abouti",
            "preheader": "Votre paiement LandChain a échoué",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Paiement non abouti</h1>
<p style="margin:0 0 12px;">Votre paiement n'a pas pu être effectué. Aucun débit n'a été appliqué.</p>
{info}
<p style="margin:0;">Veuillez réessayer depuis votre tableau de bord. Si le problème persiste, contactez votre opérateur Mobile Money.</p>
""",
            "info": "<strong>Montant :</strong> {amount} XAF",
            "info_tone": "danger",
        },
    },
    "subscription_expiring": {
        "en": {
            "subject": "Your subscription expires soon",
            "preheader": "Renew to keep full verification access",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Subscription expiring</h1>
<p style="margin:0 0 12px;">Your LandChain subscription will expire soon. LandChain renews manually — no automatic charges.</p>
{info}
<p style="margin:0;">Visit your dashboard to renew and keep access to full ownership history and document reports.</p>
""",
            "info": "<strong>Expires on:</strong> {date}",
        },
        "fr": {
            "subject": "Votre abonnement expire bientôt",
            "preheader": "Renouvelez pour garder l'accès complet",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Abonnement bientôt expiré</h1>
<p style="margin:0 0 12px;">Votre abonnement LandChain expire prochainement. LandChain se renouvelle manuellement — aucun prélèvement automatique.</p>
{info}
<p style="margin:0;">Rendez-vous sur votre tableau de bord pour renouveler et conserver l'accès à l'historique complet et aux rapports de documents.</p>
""",
            "info": "<strong>Expire le :</strong> {date}",
        },
    },
    "listing_expiring": {
        "en": {
            "subject": "Your marketplace listing expires soon",
            "preheader": "Renew to stay visible to buyers",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Listing expiring</h1>
<p style="margin:0 0 12px;">Your marketplace listing will expire soon. Renew it to stay visible to potential buyers.</p>
{info}
""",
            "info": "<strong>Parcel:</strong> {parcel}<br/><strong>Expires on:</strong> {date}",
        },
        "fr": {
            "subject": "Votre annonce expire bientôt",
            "preheader": "Renouvelez pour rester visible",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Annonce bientôt expirée</h1>
<p style="margin:0 0 12px;">Votre annonce sur le marché expire prochainement. Renouvelez-la pour rester visible auprès des acheteurs.</p>
{info}
""",
            "info": "<strong>Parcelle :</strong> {parcel}<br/><strong>Expire le :</strong> {date}",
        },
    },
    "transfer_update": {
        "en": {
            "subject": "Ownership transfer update",
            "preheader": "Status change on your parcel transfer",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Transfer update</h1>
<p style="margin:0 0 12px;">There is an update on an ownership transfer involving your account.</p>
{info}
""",
            "info": "<strong>Parcel:</strong> {parcel}<br/><strong>Status:</strong> {status}",
        },
        "fr": {
            "subject": "Mise à jour du transfert de propriété",
            "preheader": "Changement de statut sur votre transfert",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Mise à jour du transfert</h1>
<p style="margin:0 0 12px;">Il y a une mise à jour concernant un transfert de propriété impliquant votre compte.</p>
{info}
""",
            "info": "<strong>Parcelle :</strong> {parcel}<br/><strong>Statut :</strong> {status}",
        },
    },
    "dispute_update": {
        "en": {
            "subject": "Dispute status update",
            "preheader": "Update on a parcel dispute",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Dispute update</h1>
<p style="margin:0 0 12px;">The status of a dispute on one of your parcels has changed.</p>
{info}
""",
            "info": "<strong>Parcel:</strong> {parcel}<br/><strong>Status:</strong> {status}<br/><strong>Notes:</strong> {notes}",
            "info_tone": "warning",
        },
        "fr": {
            "subject": "Mise à jour du litige",
            "preheader": "Changement sur un litige foncier",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Mise à jour du litige</h1>
<p style="margin:0 0 12px;">Le statut d'un litige concernant l'une de vos parcelles a changé.</p>
{info}
""",
            "info": "<strong>Parcelle :</strong> {parcel}<br/><strong>Statut :</strong> {status}<br/><strong>Notes :</strong> {notes}",
            "info_tone": "warning",
        },
    },
    "document_review": {
        "en": {
            "subject": "Document review result",
            "preheader": "Your uploaded document has been reviewed",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Document reviewed</h1>
<p style="margin:0 0 12px;">Our team has finished reviewing your uploaded document.</p>
{info}
""",
            "info": "<strong>Result:</strong> {verdict}<br/><strong>Notes:</strong> {notes}",
        },
        "fr": {
            "subject": "Résultat de l'examen du document",
            "preheader": "Votre document a été examiné",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Document examiné</h1>
<p style="margin:0 0 12px;">Notre équipe a terminé l'examen de votre document.</p>
{info}
""",
            "info": "<strong>Résultat :</strong> {verdict}<br/><strong>Notes :</strong> {notes}",
        },
    },
    "contact_received": {
        "en": {
            "subject": "We received your message",
            "preheader": "LandChain support will reply soon",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Message received</h1>
<p style="margin:0 0 12px;">Thank you for contacting LandChain. We've received your message and a member of our team will get back to you shortly.</p>
<p style="margin:0;font-size:13px;color:#6b7280;">Typical response time: 1–2 business days.</p>
""",
        },
        "fr": {
            "subject": "Nous avons reçu votre message",
            "preheader": "L'équipe LandChain vous répondra bientôt",
            "body": """
<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#111827;">Message reçu</h1>
<p style="margin:0 0 12px;">Merci d'avoir contacté LandChain. Nous avons bien reçu votre message et un membre de notre équipe vous répondra sous peu.</p>
<p style="margin:0;font-size:13px;color:#6b7280;">Délai de réponse habituel : 1 à 2 jours ouvrables.</p>
""",
        },
    },
}


def _resolve_locale(locale: str) -> str:
    return locale if locale in ("en", "fr") else "fr"


def _render_inner(tpl: dict[str, str], kwargs: dict[str, str]) -> str:
    """Build inner HTML from template parts."""
    fmt = dict(kwargs)

    # Optional info box
    if "{info}" in tpl["body"]:
        info_html = tpl.get("info", "")
        if info_html:
            try:
                info_content = info_html.format(**kwargs)
            except KeyError as exc:
                raise KeyError(f"info box: {exc}") from exc
            tone = tpl.get("info_tone", "neutral")
            fmt["info"] = info_box(info_content, tone=tone)
        else:
            fmt["info"] = ""

    # Optional CTA button
    if "{cta}" in tpl["body"]:
        link = kwargs.get("link", "")
        label = tpl.get("cta_label", "Continue")
        fmt["cta"] = cta_button(link, label) if link else ""

    return tpl["body"].format(**fmt)


async def send_email(to: str, template: str, locale: str = "fr", **kwargs: str) -> bool:
    loc = _resolve_locale(locale)
    tpl = TEMPLATES.get(template, {}).get(loc)
    if tpl is None:
        logger.error("Unknown email template: %s (locale=%s)", template, loc)
        return False

    subject = tpl["subject"]
    preheader = tpl.get("preheader", subject)

    try:
        inner = _render_inner(tpl, kwargs)
    except KeyError as exc:
        logger.error("Missing template variable for %s: %s", template, exc)
        return False

    html = wrap_email(inner, locale=loc, preheader=preheader)

    if not settings.RESEND_API_KEY:
        logger.info("[EMAIL:dev-mode] to=%s subject=%r", to, subject)
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
