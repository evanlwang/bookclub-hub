// @spec CAT-UI-PAGE-001, CAT-UI-NOM-002
import Link from "next/link";
import { Suspense } from "react";
import { getServerCaller } from "@/trpc/server";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { CatalogClient } from "./catalog-client";

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  // CAT-UI-NOM-002: detect an active "nominating" round so the Nominate button
  // can be gated server-side. We don't surface "voting" or "decided" rounds —
  // catalog import is only meaningful during nominating.
  let nominatingRoundId: string | null = null;
  try {
    const caller = await getServerCaller();
    const rounds = await caller.rounds.list({ clubId });
    const active = rounds.find((r: { status: string; id: string }) => r.status === "nominating");
    nominatingRoundId = active?.id ?? null;
  } catch {
    // If we can't load rounds, fall through with nominate disabled.
  }

  return (
    <div className="max-w-6xl">
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
            Browse books
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Search Open Library and nominate a title for your club&rsquo;s next round.
          </p>
        </div>
      </div>

      {/* useSearchParams() needs a Suspense boundary. */}
      <Suspense fallback={<div className="h-10" />}>
        <CatalogClient clubId={clubId} nominatingRoundId={nominatingRoundId} />
      </Suspense>
    </div>
  );
}
