import { setRequestLocale } from "next-intl/server";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const fr = locale === "fr";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary">
        {fr ? "Politique de confidentialité" : "Privacy Policy"}
      </h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-text/80">
        <p>
          {fr
            ? "Vos données personnelles (identité, documents KYC, documents fonciers) sont stockées hors chaîne, chiffrées et soumises à un contrôle d'accès strict. Seules des empreintes cryptographiques anonymes (hachages) sont inscrites sur la blockchain Polygon — jamais vos données personnelles."
            : "Your personal data (identity, KYC documents, land documents) is stored off-chain, encrypted, and subject to strict access control. Only anonymous cryptographic fingerprints (hashes) are written to the Polygon blockchain — never your personal data."}
        </p>
        <p>
          {fr
            ? "Les décisions KYC sont toujours examinées par un humain. Les verdicts de l'IA sont uniquement consultatifs. Chaque action administrative sur vos données est journalisée à des fins d'audit."
            : "KYC decisions are always human-reviewed. AI verdicts are advisory only. Every administrative action on your data is logged for audit purposes."}
        </p>
        <p>
          {fr
            ? "Ce texte est un modèle de démarrage — une revue juridique est requise avant le lancement public."
            : "This text is a starter template — legal review is required before public launch."}
        </p>
      </div>
    </div>
  );
}
