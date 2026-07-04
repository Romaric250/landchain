import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("howItWorksPage");
  const th = await getTranslations("home.howItWorks");
  const steps = th.raw("steps") as { title: string; text: string }[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-text/70">{t("subtitle")}</p>

      <div className="mt-12 space-y-6">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-5 rounded-xl border border-text/10 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold text-background">
              {i + 1}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">{step.title}</h2>
              <p className="mt-1 text-text/70">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-primary">{t("tech.title")}</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {(["blockchain", "ai", "privacy"] as const).map((key) => (
            <div key={key} className="rounded-xl bg-accent/40 p-6">
              <p className="text-sm leading-relaxed text-primary">{t(`tech.${key}`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
