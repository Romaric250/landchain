import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  photoUrl?: string | null;
  skills: string[];
  featured?: boolean;
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("team");
  const members = t.raw("members") as TeamMember[];

  return (
    <>
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

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid items-end gap-8 md:grid-cols-3">
            {members.map((member, i) => (
              <Reveal key={member.name} delay={i * 130}>
                <div
                  className={`group relative h-full overflow-hidden rounded-3xl border bg-surface shadow-sm transition-all hover:-translate-y-2 hover:shadow-2xl ${
                    member.featured
                      ? "border-secondary/50 shadow-xl shadow-secondary/15 md:-translate-y-4 md:scale-[1.03]"
                      : "border-primary/10"
                  }`}
                >
                  <div className="relative h-80 overflow-hidden">
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/80">
                        <span className="text-5xl font-extrabold text-white/30">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent" />
                    {/* {member.featured && (
                      <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                        {t("featuredBadge")}
                      </span>
                    )} */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="text-xl font-extrabold text-white">{member.name}</h2>
                      <p className="mt-0.5 text-sm font-semibold text-accent">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col p-6">
                    <p className="text-sm leading-relaxed text-text/75">{member.bio}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {member.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="mt-20 flex flex-col items-center gap-6 rounded-3xl border border-primary/10 bg-accent/40 p-10 text-center sm:p-14">
              <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">{t("joinTitle")}</h2>
              <p className="max-w-xl text-sm text-text/75 sm:text-base">{t("joinText")}</p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-secondary/30 transition-transform hover:scale-[1.03]"
              >
                {t("joinCta")} →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
