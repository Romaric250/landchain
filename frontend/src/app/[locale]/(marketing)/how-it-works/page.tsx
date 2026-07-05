import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRightLeft,
  ClipboardList,
  FileSearch,
  GitBranch,
  Link2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";

const STEP_ICONS = [ClipboardList, ShieldCheck, GitBranch, ArrowRightLeft];
const TECH_META = [
  { key: "blockchain" as const, icon: Link2, title: "Blockchain" },
  { key: "ai" as const, icon: FileSearch, title: "Document AI" },
  { key: "privacy" as const, icon: Lock, title: "Privacy" },
];

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
    <>
      <PageHero
        kicker={t("heroKicker")}
        title={t("title")}
        subtitle={t("subtitle")}
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80"
      />

      {/* Journey timeline */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="relative">
            <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-secondary via-secondary/40 to-transparent sm:left-8" />
            <div className="space-y-10">
              {steps.map((step, i) => {
                const Icon = STEP_ICONS[i % STEP_ICONS.length];
                return (
                  <Reveal key={step.title} delay={i * 100}>
                    <div className="relative flex gap-6 sm:gap-8">
                      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/30 sm:h-16 sm:w-16">
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
                        <span className="text-xs font-bold uppercase tracking-widest text-secondary">
                          {t("stepLabel", { n: i + 1 })}
                        </span>
                        <h2 className="mt-2 text-xl font-extrabold text-primary sm:text-2xl">
                          {step.title}
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-text/75 sm:text-base">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("tech.title")}</h2>
            <p className="mt-3 max-w-2xl text-white/70">{t("tech.subtitle")}</p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {TECH_META.map(({ key, icon: Icon, title }, i) => (
              <Reveal key={key} delay={i * 120}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur transition-all hover:border-secondary/50 hover:bg-white/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/25 text-accent">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    {t(`tech.${key}`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent/40">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">{t("ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-text/70 sm:text-base">{t("ctaText")}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verify"
                className="inline-flex items-center justify-center rounded-full bg-secondary px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-secondary/30 transition-transform hover:scale-[1.02]"
              >
                {t("ctaVerify")}
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-surface px-7 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {t("ctaSignup")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
