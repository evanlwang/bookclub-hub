// @spec HOME-UI-001 through HOME-UI-011, HOME-UI-PRIVACY-CALLOUT-001, HOME-A11Y-002, HOME-A11Y-004
import Link from "next/link";
import {
  LogoIcon,
  VoteIcon,
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
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
            BookClub Hub
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
        className="bg-primary-soft/55 border-y border-primary/15 px-4 md:px-8 lg:px-14 py-4 mb-10 lg:mb-14"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] text-primary-ink">
          <span className="inline-flex items-center gap-2 font-medium">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L4 6v6c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V6l-8-4z" />
            </svg>
            Built privately
          </span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span>No personal data stored or shared</span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span>We only ask for email and display name</span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span>No ads, ever</span>
        </div>
      </section>

      {/* Feature row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 md:px-8 lg:px-14 pb-16 lg:pb-[72px]">
        <FeatureCard
          icon={<VoteIcon size={20} />}
          title="Approval voting"
          description="Everyone picks the books they'd be happy reading. The group's top choice wins."
        />
        <FeatureCard
          icon={<CalendarIcon size={20} />}
          title="Meeting scheduling"
          description="Propose times, collect availability, confirm — no more group chat negotiation."
        />
        <FeatureCard
          icon={<ChatIcon size={20} />}
          title="Spoiler-safe threads"
          description="Chapter-tagged discussions appear only when you've read that far."
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-line text-[13px] text-ink-3 flex items-center px-4 md:px-8 lg:px-14 py-7">
        <div className="flex flex-wrap items-center gap-2">
          <LogoIcon size={18} />
          <span>BookClub Hub</span>
          <span>·</span>
          <span>For people who finish the book.</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-bg border border-line rounded-[var(--radius-lg)] p-6 shadow-sm">
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink flex items-center justify-center mb-3.5">
        {icon}
      </div>
      <h3 className="font-[var(--font-display)] text-[19px] font-semibold text-ink mb-1.5">
        {title}
      </h3>
      <p className="text-[14px] text-ink-2 leading-relaxed">{description}</p>
    </div>
  );
}
