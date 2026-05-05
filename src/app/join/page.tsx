"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LogoIcon } from "@/components/ui";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clubInfo, setClubInfo] = useState<{
    name: string;
    memberCount: number;
  } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCodeBlur() {
    if (!code.trim()) return;
    try {
      const res = await fetch(
        `/api/trpc/clubs.lookup?input=${encodeURIComponent(JSON.stringify({ code: code.trim() }))}`
      );
      const data = await res.json();
      const result = data.result?.data;
      if (result?.clubName) {
        setClubInfo({ name: result.clubName, memberCount: result.memberCount });
        setError("");
      } else {
        setClubInfo(null);
      }
    } catch {
      // silent — lookup is optional UX
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/trpc/clubs.join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, displayName }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Join failed");
      } else {
        const result = data.result?.data;
        if (result?.sessionId) {
          document.cookie = `session_id=${result.sessionId}; path=/; max-age=${30 * 24 * 60 * 60}`;
        }
        if (result?.club?.id) {
          setSuccess(result.club.name || "your club");
          setTimeout(() => router.push(`/clubs/${result.club.id}`), 1500);
        } else {
          setError("Unexpected response format");
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink mb-2">
            Welcome to {success}!
          </h1>
          <p className="text-ink-3">Redirecting you now…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <LogoIcon size={36} />
        </div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink text-center mb-2">
          Join a Book Club
        </h1>
        <p className="text-ink-3 text-sm text-center mb-8">
          Enter the invite code shared by your club organizer.
        </p>

        <form onSubmit={handleSubmit} data-testid="join-form" className="space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
              Club Code
            </label>
            <input
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onBlur={handleCodeBlur}
              required
              data-testid="code-input"
              placeholder="e.g. OAKWOOD-7Q"
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150 font-[var(--font-mono)] tracking-wider"
            />
            {clubInfo && (
              <p className="text-xs text-success mt-1.5 animate-fade-in">
                {clubInfo.name} · {clubInfo.memberCount} member
                {clubInfo.memberCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className={clubInfo ? "animate-slide-down" : ""}>
            <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="email-input"
              placeholder="you@example.com"
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
              Display Name
            </label>
            <input
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              data-testid="name-input"
              placeholder="How others will see you"
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
            />
          </div>

          {error && (
            <p data-testid="error-message" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
            data-testid="join-button"
          >
            {loading ? "Joining…" : "Join Club"}
          </Button>
        </form>
      </div>
    </main>
  );
}
