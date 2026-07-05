import { Reveal } from "@/components/ui/Reveal";

interface PageHeroProps {
  kicker?: string;
  title: React.ReactNode;
  subtitle?: string;
  image?: string;
  children?: React.ReactNode;
  compact?: boolean;
}

export function PageHero({
  kicker,
  title,
  subtitle,
  image = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80",
  children,
  compact,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-primary text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
      <div
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${
          compact ? "py-16 sm:py-20" : "py-20 sm:py-28"
        }`}
      >
        <Reveal>
          {kicker && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {kicker}
            </span>
          )}
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
