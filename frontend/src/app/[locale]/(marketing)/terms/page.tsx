import { setRequestLocale } from "next-intl/server";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const fr = locale === "fr";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 prose-sm">
      <h1 className="text-3xl font-bold text-primary">
        {fr ? "Conditions d'utilisation" : "Terms of Service"}
      </h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-text/80">
        <p>
          {fr
            ? "LandChain est une plateforme de vérification et d'intégrité des registres fonciers. Un enregistrement LandChain constitue une preuve de vérification, et non un substitut légal au titre foncier officiel délivré par l'État du Cameroun."
            : "LandChain is a land-record verification and integrity platform. A LandChain record constitutes verification evidence and is not a legal substitute for the official land title issued by the State of Cameroon."}
        </p>
        <p>
          {fr
            ? "En utilisant la plateforme, vous acceptez de fournir des informations exactes, de ne soumettre que des documents authentiques et de vous conformer aux lois camerounaises applicables. Les paiements sont traités par Fapshi ; les abonnements se renouvellent manuellement."
            : "By using the platform you agree to provide accurate information, submit only authentic documents, and comply with applicable Cameroonian law. Payments are processed by Fapshi; subscriptions renew manually."}
        </p>
        <p>
          {fr
            ? "Ce texte est un modèle de démarrage — une revue juridique est requise avant le lancement public (spécification §24.1)."
            : "This text is a starter template — legal review is required before public launch (spec §24.1)."}
        </p>
      </div>
    </div>
  );
}
