import Link from "next/link";
import { LogoIcon, VoteIcon, CalendarIcon, ChatIcon } from "@/components/ui";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-6">
          <LogoIcon size={48} />
        </div>
        <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-tight text-ink leading-tight mb-4">
          Your book club, organized
        </h1>
        <p className="text-ink-2 text-lg max-w-md mb-10">
          Vote on books, schedule meetings, discuss without spoilers, and track
          everyone&apos;s progress — all in one place.
        </p>
        <div className="flex gap-3">
          <Link
            href="/join"
            className="inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] bg-primary text-bg px-6 py-3 text-[15px] hover:bg-primary-hover transition-colors duration-150"
          >
            Join a Club
          </Link>
          <Link
            href="/clubs"
            className="inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] bg-transparent text-ink-2 px-6 py-3 text-[15px] hover:bg-bg-sunken hover:text-ink transition-colors duration-150"
          >
            My Clubs
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<VoteIcon size={20} />}
          title="Vote on books"
          description="Nominate, discuss, and vote. Everyone gets a say in what you read next."
        />
        <FeatureCard
          icon={<CalendarIcon size={20} />}
          title="Schedule meetings"
          description="Find a time that works for everyone with availability polling."
        />
        <FeatureCard
          icon={<ChatIcon size={20} />}
          title="Discuss safely"
          description="Chapter-tagged threads mean no one gets spoiled accidentally."
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8 text-center text-ink-3 text-sm">
        BookClub Hub
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
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-ink mb-1">{title}</h3>
      <p className="text-ink-3 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
