// @spec HOME-UI-001 through HOME-UI-011, HOME-UI-PRIVACY-CALLOUT-001, HOME-A11Y-002, HOME-A11Y-004
/* eslint-disable no-restricted-syntax --
 * The landing page's "cream-to-primary backdrop" gradient (~191-193) is a
 * page-private aesthetic — a subtle tonal wash distinct from the hero. The
 * gradient stops use alpha variants that don't map to global tokens, and the
 * pattern isn't reused elsewhere. DSYS-TOKEN-003 exemption per HOME-UI intent.
 */
import Link from "next/link";
import {
  LogoIcon,
  VoteIcon,
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
  TrendIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { AvatarStack, Badge, Card, BookCover, ChapterChip } from "@/components/ui";

const paperBg =
  "radial-gradient(circle at 20% 10%, oklch(0.97 0.012 75) 0, transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.96 0.018 30) 0, transparent 55%), var(--color-bg)";

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen" style={{ background: paperBg }}>
      {/* Top Nav */}
      <nav className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-8 lg:px-14 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon size={26} />
          <span className="font-[var(--font-display)] text-xl font-semibold text-ink">
            Dogear
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="text-ink-2 text-sm px-3 py-1.5 hover:text-ink transition-colors ml-2"
          >
            Log in
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] bg-primary text-bg px-3 py-1.5 text-[13px] hover:bg-primary-hover transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center px-4 md:px-8 lg:px-14 py-12 md:py-16 lg:pt-14 lg:pb-[72px]">
        {/* Left column */}
        <div>
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full bg-accent-soft text-accent-ink text-xs font-medium mb-5">
            <span className="w-[5px] h-[5px] rounded-full bg-accent-ink" />
            Spoiler-safe by default
          </div>

          <h1 className="font-[var(--font-display)] text-5xl md:text-6xl lg:text-[72px] font-semibold leading-[1.05] lg:leading-none tracking-[-0.03em] mb-5 text-ink">
            Your book club,
            <br />
            <em className="italic" style={{ color: "var(--color-primary)" }}>
              finally
            </em>{" "}
            organized.
          </h1>

          <p className="text-[18px] text-ink-2 max-w-[480px] leading-[1.55] mb-7">
            Vote on books, schedule meetings, discuss without spoilers, and track
            everyone&apos;s progress — all in one place.
          </p>

          {/* CTA row — two clear actions: returning users sign in, new users sign up */}
          <div className="flex gap-2.5">
            <Link
              href="/join"
              data-testid="hero-signup"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] bg-primary text-bg px-5 py-2.5 text-[15px] hover:bg-primary-hover transition-colors h-[46px]"
            >
              Sign up
              <ChevronRightIcon size={14} />
            </Link>
            <Link
              href="/login"
              data-testid="hero-login"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] border border-line-strong text-ink px-5 py-2.5 text-[15px] hover:bg-bg-sunken transition-colors h-[46px]"
            >
              Log in
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-3">
            <AvatarStack names={["Alice Chen", "Marcus Webb", "Priya K"]} max={3} size="sm" />
            <span className="text-[13px] text-ink-3">
              <strong className="text-ink-2">2,400+</strong> readers ·{" "}
              <strong className="text-ink-2">340</strong> active clubs
            </span>
          </div>
        </div>

        {/* Right column — decorative collage */}
        <div className="hidden lg:block relative h-[460px]" aria-hidden="true">
          {/* Voting card */}
          <Card
            className="absolute top-0 right-[30px] w-[280px] p-4"
            style={{ transform: "rotate(-2deg)", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="accent" dot>Voting</Badge>
            </div>
            <p className="text-xs text-ink-2 mb-3">Round 4 · Pick up to 3</p>
            <div className="space-y-2">
              {["Dune", "Piranesi", "Klara and the Sun"].map((title, i) => (
                <div key={title} className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 ${
                      i === 0
                        ? "border-primary bg-primary"
                        : "border-line-strong bg-bg"
                    }`}
                  >
                    {i === 0 && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-ink">{title}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Meeting card */}
          <Card
            className="absolute top-[90px] left-0 w-[260px] p-4"
            style={{ transform: "rotate(1.5deg)", boxShadow: "var(--shadow-lg)" }}
          >
            <p className="text-sm font-medium text-ink mb-2.5">Thursday potluck?</p>
            <div className="space-y-1.5">
              {[
                { time: "Thu 6:30 PM", hot: true },
                { time: "Fri 7:00 PM", hot: false },
                { time: "Sat 2:00 PM", hot: false },
              ].map((slot) => (
                <div
                  key={slot.time}
                  className={`text-xs px-2.5 py-2 rounded-[var(--radius-sm)] ${
                    slot.hot
                      ? "bg-success-soft text-ink font-semibold"
                      : "bg-bg-soft text-ink-2"
                  }`}
                >
                  {slot.time}
                </div>
              ))}
            </div>
          </Card>

          {/* Discussion card */}
          <Card
            className="absolute bottom-[10px] right-[60px] w-[290px] p-4"
            style={{ transform: "rotate(2deg)", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <ChapterChip tag="Ch. 12" chapter={12} />
              <span className="text-[11px] text-ink-3">4 comments</span>
            </div>
            <p className="text-sm font-medium text-ink mb-1">
              The lighthouse metaphor — anyone else?
            </p>
            <p className="text-xs text-ink-3">Started by Marisol · 2h ago</p>
          </Card>

          {/* Book cover */}
          <div className="absolute bottom-[110px] left-[110px]">
            <BookCover title="Sea of Tranquility" author="Mandel" variant="teal" size="xl" />
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      {/* @spec HOME-UI-PRIVACY-CALLOUT-001 */}
      <section
        data-testid="privacy-banner"
        aria-label="Privacy guarantees"
        className="relative px-4 md:px-8 lg:px-14 py-14 lg:py-20 mb-6"
      >
        {/* Soft cream-to-primary backdrop, tonally distinct from hero but not loud */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.97 0.012 195 / 0.45) 0%, oklch(0.96 0.022 75 / 0.35) 100%)",
            borderTop: "1px solid oklch(0.91 0.008 70)",
            borderBottom: "1px solid oklch(0.91 0.008 70)",
          }}
        />

        <div className="max-w-[1100px] mx-auto">
          {/* Eyebrow with hairline flanks */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span aria-hidden="true" className="h-px w-10 bg-primary/30" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-primary-ink font-medium">
              Our promises
            </span>
            <span aria-hidden="true" className="h-px w-10 bg-primary/30" />
          </div>

          {/* Display headline echoing hero "finally" italic */}
          <h2 className="font-[var(--font-display)] text-[34px] md:text-[42px] font-semibold text-ink text-center mb-3 tracking-[-0.02em] leading-[1.1]">
            Built for readers,{" "}
            <em className="italic" style={{ color: "var(--color-primary)" }}>
              not advertisers
            </em>
            .
          </h2>
          <p className="text-[14px] text-ink-3 text-center mb-10 max-w-[520px] mx-auto leading-relaxed">
            We&apos;re a small thing for small groups. Here&apos;s what that means
            for you.
          </p>

          {/* Three-up promise cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PromiseCard
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2L4 6v6c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V6l-8-4z" />
                  <path d="M9 12.5l2 2 4-4" />
                </svg>
              }
              title="No personal data"
              body="Nothing about you is stored or shared. We don't sell, analyze, or hand off anything."
            />
            <PromiseCard
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5.5" width="18" height="13" rx="2" />
                  <path d="M3.5 7l8.5 6 8.5-6" />
                </svg>
              }
              title="Just email and display name"
              body="That's the entire signup. No phone, no birthday, no contacts upload, no friend graph."
            />
            <PromiseCard
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 11l11-6v14L3 13z" />
                  <path d="M14 9.5v5" />
                  <path d="M4 18l16-12" />
                </svg>
              }
              title="No ads, ever"
              body="No banners, no sponsored books, no tracking pixels. Just the books and the people."
            />
          </div>
        </div>
      </section>

      {/* All-features deep dive */}
      {/* @spec HOME-UI-007 */}
      <section
        data-testid="features-overview"
        aria-label="Features overview"
        className="px-4 md:px-8 lg:px-14 pt-2 pb-16 lg:pb-[80px]"
      >
        <div className="max-w-[1300px] mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span aria-hidden="true" className="h-px w-10 bg-primary/30" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-primary-ink font-medium">
              Everything inside
            </span>
            <span aria-hidden="true" className="h-px w-10 bg-primary/30" />
          </div>

          <h2 className="font-[var(--font-display)] text-[34px] md:text-[42px] font-semibold text-ink text-center mb-3 tracking-[-0.02em] leading-[1.1]">
            Built for groups that{" "}
            <em className="italic" style={{ color: "var(--color-primary)" }}>
              finish the book
            </em>
            .
          </h2>
          <p className="text-[14px] text-ink-3 text-center mb-12 max-w-[560px] mx-auto leading-relaxed">
            Every habit a working club needs — refined, and out of the way.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            <CategoryCard
              icon={<VoteIcon size={20} />}
              title="Approval voting"
              tagline="Choose what's next, together."
              points={[
                "Three phases: nominate, vote, decide",
                "Open Library search built in",
                "Tie-break and close-voting controls",
                "Live status badge in the sidebar",
              ]}
            />
            <CategoryCard
              icon={<CalendarIcon size={20} />}
              title="Meeting scheduling"
              tagline="Find a time without the back-and-forth."
              points={[
                "Propose multiple slots at once",
                "Availability heatmap by responder",
                "“Most available” recommendation",
                "Edit or cancel; updates ripple out",
              ]}
            />
            <CategoryCard
              icon={<ChatIcon size={20} />}
              title="Spoiler-safe threads"
              tagline="Talk freely. Nobody spoils anything."
              points={[
                "Chapter-tagged threads",
                "Auto-hide threads above your chapter",
                "Threaded replies, two levels deep",
                "Pin, edit, delete — admin or your own",
              ]}
            />
            <CategoryCard
              icon={<TrendIcon size={20} />}
              title="Reading progress"
              tagline="See where the group is — really."
              points={[
                "Per-member page, chapter, percentage",
                "Group median + distribution chart",
                "History across past selections",
                "States: not started, reading, finished",
              ]}
            />
            <CategoryCard
              icon={<UsersIcon size={20} />}
              title="Run your club"
              tagline="One person to many; one club to many."
              points={[
                "Roles: owner, admin, member",
                "Invite codes — custom or auto-derived",
                "Switch clubs from the sidebar",
                "Custom theme color per club",
              ]}
            />
            <CategoryCard
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2L4 6v6c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V6l-8-4z" />
                  <path d="M9 12.5l2 2 4-4" />
                </svg>
              }
              title="Quiet by default"
              tagline="No tracking. No ads. No noise."
              points={[
                "Email + display name. Nothing else.",
                "Zero ads, zero tracking pixels",
                "Soft-delete with a restore window",
                "Leave any club, anytime",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line text-[13px] text-ink-3 flex items-center px-4 md:px-8 lg:px-14 py-7">
        <div className="flex flex-wrap items-center gap-2">
          <LogoIcon size={18} />
          <span>Dogear</span>
          <span>·</span>
          <span>For people who finish the book.</span>
        </div>
      </footer>
    </main>
  );
}

// @spec HOME-UI-007
function CategoryCard({
  icon,
  title,
  tagline,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  points: string[];
}) {
  return (
    <div className="group bg-bg border border-line rounded-[var(--radius-lg)] p-6 shadow-sm transition-all duration-200 hover:border-primary/35 hover:-translate-y-0.5 hover:shadow-md">
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink flex items-center justify-center mb-4 transition-transform duration-200 group-hover:-rotate-3">
        {icon}
      </div>
      <h3 className="font-[var(--font-display)] text-[19px] font-semibold text-ink mb-1 tracking-[-0.01em]">
        {title}
      </h3>
      <p className="text-[13px] text-ink-3 leading-relaxed mb-4">{tagline}</p>
      <div className="h-px bg-line mb-3.5" />
      <ul className="space-y-2">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-[13px] text-ink-2 leading-relaxed"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-primary mt-[3px] shrink-0"
            >
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// @spec HOME-UI-PRIVACY-CALLOUT-001
function PromiseCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative bg-bg/85 backdrop-blur-[2px] border border-line rounded-[var(--radius-lg)] p-5 transition-all duration-200 hover:border-primary/35 hover:shadow-sm">
      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink flex items-center justify-center mb-3 transition-transform duration-200 group-hover:-rotate-3">
        {icon}
      </div>
      <h3 className="font-[var(--font-display)] text-[17px] font-semibold text-ink mb-1 tracking-[-0.01em]">
        {title}
      </h3>
      <p className="text-[13px] text-ink-2 leading-relaxed">{body}</p>
    </div>
  );
}
