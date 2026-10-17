import type { Metadata } from "next";
import { PAGES } from "@/lib/pages-content";
import { getSettings } from "@/lib/settings";
import PageHeader from "./PageHeader";
import Reveal from "./Reveal";

export function policyMeta(key: string): Metadata {
  const p = PAGES[key];
  return { title: p.title, description: p.desc, alternates: { canonical: `/${key}` } };
}

export default async function PolicyPage({ k }: { k: string }) {
  const page = PAGES[k];
  const { store } = await getSettings();
  const days = store.return_days.toLocaleString("ar");
  const fill = (t: string) => t.replace("{days}", days);
  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.title} sub={page.intro ? undefined : page.desc} />
      <main className="max-w-3xl mx-auto px-5 mt-12">
        {page.intro && <Reveal><p className="text-xl leading-10 font-display">{page.intro}</p></Reveal>}
        {page.policy && store.show_demo_notice && (
          <p role="note" className="mt-8 rounded-2xl border border-gold/50 bg-gold/10 px-5 py-4 text-sm leading-7">
            هذا النص أولي ويحتاج إلى مراجعة قانونية واعتماد من صاحب المتجر قبل الإطلاق.
          </p>
        )}
        <div className="mt-8 space-y-4">
          {page.sections.map((s, i) =>
            page.faq ? (
              <Reveal key={s.h} delay={i * 50}>
                <details className="group rounded-2xl border border-beige bg-white px-5 py-4 open:shadow-luxe transition-shadow">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-bold">
                    {s.h}<span className="text-gold text-xl transition-transform group-open:rotate-45">+</span>
                  </summary>
                  {s.p.map((t) => <p key={t} className="mt-3 leading-8 opacity-80">{fill(t)}</p>)}
                </details>
              </Reveal>
            ) : (
              <Reveal key={s.h} delay={i * 50}>
                <section className="border-s-2 border-gold ps-5 py-1">
                  <h2 className="font-display text-2xl font-bold">{s.h}</h2>
                  {s.p.map((t) => <p key={t} className="mt-2 leading-9 opacity-80">{fill(t)}</p>)}
                </section>
              </Reveal>
            ),
          )}
        </div>
      </main>
    </>
  );
}
