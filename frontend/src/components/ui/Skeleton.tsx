/** Pulse placeholders for async content — use instead of centered spinners on layout-heavy views. */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-text/10 ${className}`}
    />
  );
}

export function ListingCardSkeleton({ dark = false }: { dark?: boolean }) {
  const bg = dark ? "bg-white/10" : "bg-text/10";
  return (
    <div
      className={`flex gap-3 rounded-xl border p-3 ${
        dark ? "border-white/10 bg-white/5" : "border-text/10 bg-surface"
      }`}
    >
      <Skeleton className={`hidden h-14 w-14 shrink-0 rounded-lg sm:block ${bg}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-between gap-2">
          <Skeleton className={`h-3.5 w-28 ${bg}`} />
          <Skeleton className={`h-4 w-14 rounded-full ${bg}`} />
        </div>
        <Skeleton className={`h-3 w-36 ${bg}`} />
        <div className="flex justify-between pt-1">
          <Skeleton className={`h-4 w-24 ${bg}`} />
          <Skeleton className={`h-3 w-12 ${bg}`} />
        </div>
      </div>
    </div>
  );
}

export function MapSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-primary ${className}`}
      aria-label="Loading map"
      role="status"
    >
      <Skeleton className="absolute inset-0 rounded-none bg-white/5" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
      <div className="absolute bottom-6 left-6 space-y-2">
        <Skeleton className="h-3 w-32 bg-white/10" />
        <Skeleton className="h-3 w-24 bg-white/10" />
      </div>
      <div className="absolute bottom-6 right-6 flex flex-col gap-1">
        <Skeleton className="h-8 w-8 rounded bg-white/10" />
        <Skeleton className="h-8 w-8 rounded bg-white/10" />
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Skeleton className="h-8 w-20 rounded-full bg-secondary/30" />
      </div>
    </div>
  );
}

export function MarketplacePageSkeleton() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-lg lg:rounded-3xl">
          <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,26rem)_1fr]">
            <div className="relative order-1 min-h-[14rem] sm:min-h-[18rem] lg:order-2 lg:min-h-[28rem]">
              <MapSkeleton className="h-full w-full min-h-[14rem] lg:min-h-[28rem]" />
            </div>
            <div className="order-2 border-t border-primary/10 bg-background/60 p-4 sm:p-5 lg:order-1 lg:border-t-0 lg:border-r">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-2">
                <ListingCardSkeleton />
                <ListingCardSkeleton />
              </div>
              <div className="mt-3 rounded-xl border border-secondary/20 bg-accent/30 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-4 w-36" />
                <Skeleton className="mt-3 h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketplacePreviewSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-text/10 bg-surface shadow-sm"
        >
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="flex items-center justify-between p-5">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PricingCardsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col rounded-2xl border border-text/10 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-9 w-36" />
          <div className="mt-6 flex-1 space-y-2">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-3.5 w-full max-w-[12rem]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-10 w-full rounded-lg" />
        </div>
      ))}
    </>
  );
}

export function VerifyResultSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-xl shadow-primary/5"
      role="status"
      aria-label="Loading verification result"
    >
      <div className="border-b border-primary/10 bg-primary px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-white/10" />
              <Skeleton className="h-5 w-44 bg-white/10" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="space-y-4 p-6 sm:p-8">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-text/20 bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3.5 w-24" />
          <Skeleton className="mt-2 h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-text/20 bg-surface p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-text/10 bg-surface p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
        </div>
      ))}
    </div>
  );
}

export function ParcelDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}
