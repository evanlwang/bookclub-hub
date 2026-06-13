// @spec HOME-UI-015, HOME-UI-016, HOME-UI-005, HOME-UI-006, HOME-UI-CTA-PRIMARY-001,
//        HOME-UI-CTA-SECONDARY-001, HOME-UI-CARD-001, HOME-UI-CARD-002, HOME-UI-CARD-003,
//        HOME-UI-CARD-004, HOME-UI-ANNOT-001, HOME-UI-TERMS-001, HOME-UI-PLATE-001,
//        HOME-UI-018, HOME-A11Y-002, HOME-A11Y-004, LANDING-UI-001
//
// Editorial landing — a library borrower's card, not a SaaS hero+grid. Server
// component (links only). Single centered column at every width; the 390px
// handoff scales up by centering. See docs/llds/auth-and-accounts.md.
import Link from "next/link";
import { LogoIcon } from "@/components/ui/icons";

const checkout: [string, string, string, number][] = [
  [
    "Choose the next read",
    "Nominate books, then dog-ear your three favourites. Tallies stay sealed until the reveal.",
    "APR 02",
    -5,
  ],
  [
    "Stay a chapter ahead",
    "Notes are tagged by chapter — anything past your bookmark stays tucked away.",
    "APR 16",
    3,
  ],
  [
    "Meet without the maybe",
    "RSVP postcards land on the one night that works for everyone.",
    "MAY 07",
    -5,
  ],
];

const terms = [
  "We only ever ask for an email and a name. Nothing else, ever.",
  "No passwords — so there is nothing to forget, and nothing to steal.",
  "No ads, no algorithm, no strangers. Only the people you invite.",
];

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-bg">
      <div
        data-testid="landing-column"
        className="mx-auto w-full max-w-[620px] px-[22px] pb-12"
      >
        {/* @spec HOME-UI-015 — masthead */}
        <header className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={28} />
            <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-[0.16em] text-ink">
              Dogear
            </span>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.16em] text-ink-3 whitespace-nowrap">
            EST. 2026
          </span>
        </header>
        <div className="mt-3.5 h-px bg-line" />

        {/* @spec HOME-UI-016 — editorial hero */}
        <section className="pt-8">
          <h1 className="font-[family-name:var(--font-serif)] text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
            A small, private library for{" "}
            <em className="italic text-primary">the people you read with.</em>
          </h1>
          <p className="mt-6 max-w-[32ch] font-[family-name:var(--font-serif)] text-base leading-[1.5] text-ink-2">
            Choose the next book together, settle on a night that works, and talk
            it through — without spoiling the ending for anyone still reading.
          </p>
        </section>

        {/* @spec HOME-UI-CTA-PRIMARY-001, HOME-UI-CTA-SECONDARY-001 — asymmetric */}
        <section className="pt-6">
          <Link
            href="/join"
            data-testid="hero-signup"
            className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-primary px-7 font-[family-name:var(--font-display)] text-[17px] font-extrabold text-bg shadow-md transition-colors hover:bg-primary-hover active:scale-[0.99]"
          >
            Get your library card
          </Link>
          <p className="mt-3.5 flex items-center justify-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold text-ink-2">
            Already a member?
            <Link
              href="/login"
              data-testid="hero-login"
              className="font-extrabold text-primary underline underline-offset-[3px]"
            >
              Log in
            </Link>
          </p>
        </section>

        {/* @spec HOME-UI-CARD-001..004 — the borrower's card */}
        <section className="pt-9">
          <div className="relative -rotate-[1.3deg] overflow-hidden rounded-[var(--radius-lg)] bg-bg-soft shadow-lg">
            {/* @spec HOME-UI-CARD-004 — decorative dog-ear corner */}
            <svg
              data-testid="card-dogear"
              aria-hidden="true"
              viewBox="0 0 34 34"
              className="absolute right-0 top-0 z-10 h-[34px] w-[34px]"
            >
              <path d="M0 0 L34 34 L0 34 Z" fill="var(--color-primary)" />
              <path d="M0 0 L34 0 L34 34 Z" fill="var(--color-bg)" />
              <path
                d="M0 0 L34 34"
                stroke="var(--color-primary-hover)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>

            {/* @spec HOME-UI-CARD-001 — header */}
            <div className="px-[18px] pb-2.5 pt-4">
              <div className="font-[family-name:var(--font-mono)] text-[9.5px] font-bold tracking-[0.22em] text-ink-3">
                DOGEAR LENDING LIBRARY
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-[family-name:var(--font-display)] text-lg font-extrabold text-ink">
                  Borrower&rsquo;s Card
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-ink-3 whitespace-nowrap">
                  CAT. 813.54
                </span>
              </div>
            </div>
            <div className="h-px bg-line" />

            {/* column heads */}
            <div className="flex justify-between px-[18px] pt-2.5">
              <span className="font-[family-name:var(--font-mono)] text-[8.5px] tracking-[0.16em] text-ink-3">
                THE CLUB CAN &mdash;
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[8.5px] tracking-[0.16em] text-ink-3">
                DATE DUE
              </span>
            </div>

            {/* @spec HOME-UI-CARD-002, HOME-UI-CARD-003 — checkout rows + stamps */}
            <div className="px-[18px] pb-2">
              {checkout.map(([title, body, date, deg], i) => (
                <div
                  key={title}
                  className={`flex items-center gap-3 py-3.5 ${
                    i < checkout.length - 1 ? "border-b border-dashed border-line" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-[family-name:var(--font-display)] text-[14.5px] font-bold text-ink">
                      {title}
                    </div>
                    <div className="mt-0.5 font-[family-name:var(--font-serif)] text-[12.5px] italic leading-[1.4] text-ink-2">
                      {body}
                    </div>
                  </div>
                  <div
                    className="shrink-0 rounded border-[1.5px] border-primary px-1.5 py-1 text-center font-[family-name:var(--font-mono)] text-[9px] font-bold tracking-[0.08em] text-primary opacity-90"
                    style={{ transform: `rotate(${deg}deg)` }}
                  >
                    {date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* @spec HOME-UI-ANNOT-001 — dog-ear metaphor annotation */}
          <p className="mx-2 mt-5 font-[family-name:var(--font-serif)] text-[13px] italic leading-[1.5] text-ink-2">
            A dog-eared page is the universal{" "}
            <span className="text-ink">&ldquo;here&rsquo;s where I stopped.&rdquo;</span>{" "}
            That little fold is the whole idea — mark your place, see where your
            friends are, and never spoil what&rsquo;s ahead.
          </p>
        </section>

        {/* @spec HOME-UI-TERMS-001 — conditions of membership */}
        <section
          data-testid="privacy-banner"
          aria-label="Conditions of membership"
          className="pt-8"
        >
          <div className="font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.2em] text-ink-3">
            CONDITIONS OF MEMBERSHIP
          </div>
          <div className="mt-1">
            {terms.map((t, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 border-t border-line py-3"
              >
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs font-bold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-[family-name:var(--font-serif)] text-[14.5px] leading-[1.45] text-ink">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* @spec HOME-UI-PLATE-001 — Ex Libris bookplate */}
        <section className="pt-8">
          <div className="rounded-2xl border-[1.5px] border-line bg-bg-soft px-[18px] py-5 text-center">
            <div className="font-[family-name:var(--font-mono)] text-[9px] tracking-[0.26em] text-ink-3">
              &middot; EX LIBRIS &middot;
            </div>
            <div className="mt-2 font-[family-name:var(--font-serif)] text-[19px] italic leading-[1.3] text-primary">
              For people who finish the book.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
