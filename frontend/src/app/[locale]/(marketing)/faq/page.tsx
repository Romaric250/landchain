import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const items = t.raw("items") as { q: string; a: string }[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary sm:text-4xl">{t("title")}</h1>
      <div className="mt-10 space-y-4">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-text/10 p-5 open:bg-accent/20"
          >
            <summary className="cursor-pointer list-none font-semibold text-primary marker:hidden flex items-center justify-between">
              {item.q}
              <span className="ml-4 text-secondary transition-transform group-open:rotate-45 text-xl leading-none">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-text/80">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
