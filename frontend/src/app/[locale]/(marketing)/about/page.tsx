import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

const SECTION_IMAGES = [
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=900&q=70",
];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tn = await getTranslations("nav");

  const sections = [
    { title: t("mission"), text: t("missionText") },
    { title: t("whyNow"), text: t("whyNowText") },
    { title: t("story"), text: t("storyText") },
  ];

  return (
    <>
      {/* Page hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=70)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/80 to-primary" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">{t("title")}</h1>
        </div>
      </section>

      {/* Alternating sections */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:px-6 sm:py-24">
          {sections.map((s, i) => (
            <Reveal key={s.title}>
              <div
                className={`grid items-center gap-10 lg:grid-cols-2 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-secondary">
                    0{i + 1}
                  </span>
                  <h2 className="mt-2 text-2xl font-extrabold text-primary sm:text-3xl">{s.title}</h2>
                  <p className="mt-4 leading-relaxed text-text/80">{s.text}</p>
                </div>
                <div className="overflow-hidden rounded-3xl shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SECTION_IMAGES[i % SECTION_IMAGES.length]}
                    alt={s.title}
                    className="h-64 w-full object-cover sm:h-80"
                    loading="lazy"
                  />
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal>
            <div className="rounded-2xl border-l-4 border-secondary bg-accent/40 p-7 text-sm leading-relaxed text-primary sm:text-base">
              {t("legalNote")}
            </div>
          </Reveal>

          <Reveal>
            <div className="text-center">
              <Link
                href="/team"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
              >
                {tn("team")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
