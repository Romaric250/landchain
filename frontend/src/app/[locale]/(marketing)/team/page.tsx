import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

/* Placeholder portraits — replace with real team photos later. */
const PHOTOS = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/men/68.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
];

const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "X", href: "https://x.com" },
];

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("team");
  const members = t.raw("members") as {
    name: string;
    role: string;
    bio: string;
    focus: string;
  }[];

  return (
    <>
      {/* Page hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=70)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/80 to-primary" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            {t("kicker")}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/75 sm:text-lg">{t("subtitle")}</p>
        </div>
      </section>

      {/* Member cards */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-8 md:grid-cols-3">
            {members.map((member, i) => (
              <Reveal key={member.role} delay={i * 130}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-text/10 bg-background shadow-sm transition-all hover:-translate-y-2 hover:shadow-2xl">
                  <div className="relative h-72 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PHOTOS[i % PHOTOS.length]}
                      alt={member.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="text-xl font-extrabold text-white">{member.name}</h2>
                      <p className="mt-0.5 text-sm font-semibold text-accent">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex h-[calc(100%-18rem)] flex-col p-6">
                    <p className="flex-1 text-sm leading-relaxed text-text/75">{member.bio}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">
                      {member.focus}
                    </p>
                    <div className="mt-4 flex gap-2 border-t border-text/10 pt-4">
                      {SOCIALS.map((s) => (
                        <a
                          key={s.label}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-text/15 px-3.5 py-1.5 text-xs font-semibold text-text/70 transition-colors hover:border-secondary hover:bg-secondary hover:text-white"
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Join CTA */}
          <Reveal delay={100}>
            <div className="mt-20 flex flex-col items-center gap-6 rounded-3xl bg-accent/40 p-10 text-center sm:p-14">
              <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">{t("joinTitle")}</h2>
              <p className="max-w-xl text-sm text-text/75 sm:text-base">{t("joinText")}</p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-secondary/30 transition-transform hover:scale-[1.03]"
              >
                {t("joinCta")}
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
