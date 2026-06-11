// @spec MEET-UI-DATESTAMP-001 — rubber-stamp date block (cozy redesign):
// mono weekday/month around a chunky day numeral, 2px terracotta border,
// rotated −2°. `muted` renders the past-meeting variant.
export function DateStamp({
  date,
  muted = false,
}: {
  date: Date | string;
  muted?: boolean;
}) {
  const d = new Date(date);
  const dow = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const day = d.getDate();
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return (
    <div
      className={`w-[58px] shrink-0 -rotate-2 rounded-[12px] border-2 py-1.5 text-center ${
        muted ? "border-line-strong text-ink-3" : "border-primary text-primary-ink"
      }`}
    >
      <div className="font-[var(--font-mono)] text-[9.5px] font-bold tracking-[0.14em]">{dow}</div>
      <div className="font-[var(--font-display)] font-extrabold text-2xl leading-none">{day}</div>
      <div className="font-[var(--font-mono)] text-[9.5px] font-bold tracking-[0.14em]">{mon}</div>
    </div>
  );
}
