import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findTimerPreset, TIMER_PRESETS } from "@/constants/presets.constants";
import { PresetTimerView } from "./PresetTimerView";

interface PresetPageProps {
  params: Promise<{ preset: string }>;
}

/**
 * Statically generates one route per entry in `TIMER_PRESETS` at build time
 * -- see node_modules/next/dist/docs/.../generate-static-params.md.
 * `dynamicParams` is left at its default (`true`), but every slug this app
 * links to (Header/footer nav, sitemap.ts) comes from `TIMER_PRESETS`
 * itself, so in practice every visited preset route is prerendered.
 */
export function generateStaticParams() {
  return TIMER_PRESETS.map((preset) => ({ preset: preset.slug }));
}

export async function generateMetadata({ params }: PresetPageProps): Promise<Metadata> {
  const { preset: slug } = await params;
  const preset = findTimerPreset(slug);
  if (!preset) return {};

  const canonicalPath = `/presets/${preset.slug}`;
  return {
    title: preset.title,
    description: preset.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${preset.title} | Pomodoro`,
      description: preset.description,
      url: canonicalPath,
      type: "website",
    },
  };
}

export default async function PresetPage({ params }: PresetPageProps) {
  const { preset: slug } = await params;
  const preset = findTimerPreset(slug);
  if (!preset) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text-primary">
      <main id="main-content" className="app-shell flex flex-1 flex-col">
        <PresetTimerView preset={preset} />
      </main>
    </div>
  );
}
