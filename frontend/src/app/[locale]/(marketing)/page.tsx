import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hero } from "@/components/marketing/Hero";
import { MarketplacePreview } from "@/components/marketing/MarketplacePreview";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { Reveal } from "@/components/ui/Reveal";
import {
  AlertTriangle,
  Clock,
  Copy,
  FilePenLine,
  FileSearch,
  FileWarning,
  Layers,
  Link2,
  Lock,
  Route,
  ScanLine,
  ShieldCheck,
  UserX,
  Users,
} from "lucide-react";

const SOLUTION_ICONS = [Layers, Clock, Copy, ScanLine, Route, Users];
const PROBLEM_ICONS = [Copy, FileWarning, FilePenLine, UserX];
const TECH_ICONS = [Link2, FileSearch, Lock];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
      {children}
    </span>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const trustItems = t.raw("trustStrip") as string[];
  const problemItems = t.raw("problem.items") as { title: string; text: string }[];
  const solutionItems = t.raw("solution.items") as { title: string; text: string }[];
  const steps = t.raw("howItWorks.steps") as { title: string; text: string }[];
  const techItems = t.raw("tech.items") as { title: string; text: string }[];

  return (
    <>
      <Hero />

      {/* Trust ticker */}
      <div className="overflow-hidden border-b border-text/10 bg-primary py-4">
        <div className="flex w-max animate-[lc-ticker_28s_linear_infinite] gap-12">
          {[...trustItems, ...trustItems].map((item, i) => (
            <span key={i} className="flex shrink-0 items-center gap-2.5 text-sm font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Problem */}
      <section className="relative overflow-hidden bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <Kicker>{t("problem.kicker")}</Kicker>
            <h2 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-primary sm:text-5xl">
              {t("problem.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-text/70 sm:text-lg">{t("problem.subtitle")}</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((n, i) => (
              <Reveal key={n} delay={i * 120}>
                <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-white">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-secondary/20 blur-2xl" />
                  <div className="text-4xl font-extrabold text-accent sm:text-5xl">{t(`problem.stat${n}`)}</div>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{t(`problem.stat${n}Label`)}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {problemItems.map((item, i) => {
              const Icon = PROBLEM_ICONS[i % PROBLEM_ICONS.length];
              return (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="group h-full rounded-2xl border border-primary/10 bg-surface p-6 transition-all hover:-translate-y-1 hover:border-secondary/40 hover:shadow-lg">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-primary">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text/70">{item.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={150}>
            <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border-l-4 border-secondary bg-accent/40 p-7 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
                <AlertTriangle className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <p className="text-sm leading-relaxed text-primary sm:text-base">{t("problem.aiWarning")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Solution */}
      <section className="relative bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {t("solution.kicker")}
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
              {t("solution.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-white/70 sm:text-lg">{t("solution.subtitle")}</p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {solutionItems.map((item, i) => {
              const Icon = SOLUTION_ICONS[i % SOLUTION_ICONS.length];
              return (
                <Reveal key={item.title} delay={i * 90}>
                  <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:border-secondary/60 hover:bg-white/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 text-accent transition-colors group-hover:bg-secondary group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">{item.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal className="text-center">
            <Kicker>{t("howItWorks.kicker")}</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-primary sm:text-5xl">
              {t("howItWorks.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-text/70 sm:text-lg">
              {t("howItWorks.subtitle")}
            </p>
          </Reveal>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connector line (desktop) */}
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent lg:block" />
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 120}>
                <div className="relative text-center lg:text-left">
                  <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-xl font-extrabold text-white shadow-xl shadow-secondary/30 lg:mx-0">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-primary">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text/70">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Technology / trust */}
      <section className="relative overflow-hidden bg-accent/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <Kicker>{t("tech.kicker")}</Kicker>
            <h2 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-primary sm:text-5xl">
              {t("tech.title")}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {techItems.map((item, i) => {
              const Icon = TECH_ICONS[i % TECH_ICONS.length];
              return (
                <Reveal key={item.title} delay={i * 120}>
                  <div className="h-full rounded-2xl bg-surface p-8 shadow-sm transition-shadow hover:shadow-lg">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-accent">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-primary">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-text/75">{item.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Marketplace preview */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <Reveal>
              <Kicker>{t("marketplacePreview.kicker")}</Kicker>
              <h2 className="mt-5 max-w-xl text-3xl font-extrabold tracking-tight text-primary sm:text-5xl">
                {t("marketplacePreview.title")}
              </h2>
              <p className="mt-4 max-w-xl text-base text-text/70 sm:text-lg">
                {t("marketplacePreview.subtitle")}
              </p>
            </Reveal>
            <Reveal delay={150}>
              <Link
                href="/marketplace"
                className="group inline-flex items-center gap-2 rounded-full border border-primary/25 px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {t("marketplacePreview.cta")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </Reveal>
          </div>
          <Reveal delay={100} className="mt-12">
            <MarketplacePreview />
          </Reveal>
        </div>
      </section>

      {/* Final CTA + waitlist */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=75)",
          }}
        />
        <div className="absolute inset-0 bg-primary/85" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <Reveal>
            <div className="mx-auto flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-secondary text-white shadow-2xl shadow-secondary/40">
              <ShieldCheck className="h-8 w-8" strokeWidth={1.8} />
            </div>
            <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {t("finalCta.title")}
            </h2>
            <p className="mt-4 text-base text-white/75 sm:text-lg">{t("finalCta.subtitle")}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/verify"
                className="inline-flex items-center justify-center rounded-full bg-secondary px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-secondary/40 transition-transform hover:scale-[1.03]"
              >
                {t("finalCta.primary")}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                {t("finalCta.secondary")}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-white/15 bg-white/10 p-7 backdrop-blur-md">
              <h3 className="text-lg font-bold text-white">{t("waitlist.title")}</h3>
              <p className="mt-1 text-sm text-white/70">{t("waitlist.subtitle")}</p>
              <div className="mt-5 flex justify-center">
                <WaitlistForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
