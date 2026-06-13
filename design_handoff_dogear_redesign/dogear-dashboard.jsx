// dogear-dashboard.jsx — Club dashboard ("Your reading nook")
const { useState, useEffect, useRef } = React;

/* ============ club switcher + code chip ============ */
function ClubHeader({ data, admin }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const role = admin ? 'Admin' : 'Member';
  return (
    <div style={{ position: 'relative', zIndex: 40, padding: '6px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button onClick={() => setOpen(!open)} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '6px 2px', minHeight: 44,
        }}>
          <span className="dg-display" style={{ fontSize: 21, color: 'var(--ink)' }}>{data.club.name}</span>
          <DgBadge tone={admin ? 'accent' : 'neutral'}>{role}</DgBadge>
          <span style={{ color: 'var(--ink-faint)', fontSize: 11, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s var(--spring)' }}>▼</span>
        </button>
        <button onClick={copy} className="dg-mono" style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-card)',
          border: '1.5px dashed var(--ink-faint)', borderRadius: 10, padding: '6px 10px',
          fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', cursor: 'pointer', minHeight: 36,
        }}>
          {data.club.code}
          <span style={{ color: copied ? 'var(--success)' : 'var(--terracotta)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11 }}>
            {copied ? '✓' : 'Copy'}
          </span>
        </button>
      </div>

      {open && (
        <div className="dg-card" style={{
          position: 'absolute', top: 52, left: 16, right: 16, padding: 8, boxShadow: 'var(--shadow-lift)',
          animation: 'dg-pop-in calc(.22s * var(--dur)) var(--spring) both',
        }}>
          {data.clubs.map((c) => (
            <button key={c.name} onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              background: c.name === data.club.name ? 'var(--terracotta-tint)' : 'transparent',
              border: 'none', borderRadius: 12, padding: '11px 12px', cursor: 'pointer', minHeight: 44,
            }}>
              <span className="dg-display" style={{ fontSize: 15, flex: 1 }}>{c.name}</span>
              {c.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--terracotta)' }}></span>}
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5, color: 'var(--ink-faint)' }}>{c.role}</span>
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--paper-edge)', margin: '6px 8px' }}></div>
          {admin && (
            <div style={{ display: 'flex' }}>
              {['Members', 'Settings'].map(x => (
                <button key={x} onClick={() => setOpen(false)} style={{
                  flex: 1, background: 'transparent', border: 'none', borderRadius: 12, padding: '10px 12px',
                  cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5,
                  color: 'var(--ink-soft)', textAlign: 'left', minHeight: 44,
                }}>{x}</button>
              ))}
            </div>
          )}
          <button onClick={() => setOpen(false)} style={{
            display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
            borderRadius: 12, padding: '11px 12px', cursor: 'pointer', minHeight: 44,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5, color: 'var(--terracotta)',
          }}>+ Create or join a club</button>
        </div>
      )}
    </div>
  );
}

/* ============ attention banner ============ */
function AttentionBanner({ onGoVote }) {
  return (
    <div className="dg-card" style={{ margin: '14px 16px 0', padding: '14px 16px', background: 'var(--amber-tint)', border: '1px solid rgba(185,123,31,.18)' }}>
      <div className="dg-display" style={{ fontSize: 14.5, color: 'var(--amber-deep)', marginBottom: 10 }}>2 things need your attention</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="dg-serif" style={{ fontSize: 14.5, color: 'var(--ink)' }}>Round 14 voting closes Friday</span>
          <DgButton variant="primary" size="sm" onClick={onGoVote}>Cast my vote</DgButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="dg-serif" style={{ fontSize: 14.5, color: 'var(--ink)' }}>June meet-up needs your RSVP</span>
          <DgButton variant="secondary" size="sm">Respond</DgButton>
        </div>
      </div>
    </div>
  );
}

/* ============ the bookmark hero (signature moment) ============ */
function BookmarkEdge({ members, median }) {
  const [active, setActive] = useState(null);
  return (
    <div style={{ position: 'relative', paddingTop: 30 }}>
      {/* tooltip */}
      {active && (
        <div key={active.name} style={{
          position: 'absolute', top: -8, left: `clamp(8px, calc(${active.pct}% - 50px), calc(100% - 110px))`,
          background: 'var(--ink)', color: 'var(--paper)', borderRadius: 10, padding: '5px 10px',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap',
          animation: 'dg-pop-in calc(.18s * var(--dur)) var(--spring) both', zIndex: 5, pointerEvents: 'none',
        }}>
          {active.name} · {active.status === 'waiting' ? 'not started' : active.status === 'done' ? 'finished ✓' : `ch. ${active.chapter}`}
        </div>
      )}
      {/* the page edge */}
      <div style={{
        position: 'relative', height: 26, borderRadius: 8,
        background: 'repeating-linear-gradient(90deg, var(--paper-card) 0 3px, var(--paper-edge) 3px 4px)',
        border: '1.5px solid var(--paper-edge)', overflow: 'visible',
      }}>
        {/* median fill */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: `${median}%`,
          background: 'linear-gradient(180deg, rgba(199,91,57,.32), rgba(199,91,57,.18))',
          borderRadius: '6px 0 0 6px', borderRight: '2px solid var(--terracotta)',
        }}></div>
        {/* member bookmarks sticking out the top */}
        {members.map((m) => (
          <button key={m.name}
            onClick={(e) => { e.stopPropagation(); setActive(active && active.name === m.name ? null : m); }}
            aria-label={`${m.name}, ${m.pct}%`}
            style={{
              position: 'absolute', left: `calc(${Math.max(2, Math.min(97, m.pct))}% - 7px)`, top: -16,
              width: 14, height: 34, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent',
            }}>
            <div style={{
              width: '100%', height: '100%',
              background: m.you ? 'var(--terracotta)' : m.status === 'done' ? 'var(--amber)' : '#C9A98A',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
              borderRadius: '3px 3px 0 0',
              boxShadow: '1px 0 2px rgba(96,64,32,.25)',
              transform: active && active.name === m.name ? 'translateY(-4px)' : 'none',
              transition: 'transform .18s var(--spring)',
            }}></div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10.5, color: 'var(--ink-faint)' }}>
        <span>FIRST PAGE</span><span>THE END</span>
      </div>
    </div>
  );
}

function CurrentlyReadingHero({ data, earTrigger, onGoProgress }) {
  const done = data.progress.filter(m => m.status === 'done').length;
  const waiting = data.progress.filter(m => m.status === 'waiting').length;
  return (
    <div className="dg-card" style={{ margin: '14px 16px 0', padding: 18, position: 'relative' }}>
      <DogEarCorner trigger={earTrigger} />
      <DgBadge tone="primary" dot>Now reading</DgBadge>
      <div onClick={onGoProgress} style={{ display: 'flex', gap: 16, marginTop: 12, cursor: 'pointer' }}>
        <DgBookCover title={data.book.title} author={data.book.author} src={data.book.cover} width={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="dg-display" style={{ fontSize: 22, margin: '2px 0 1px', lineHeight: 1.1 }}>{data.book.title}</h2>
          <p className="dg-serif" style={{ margin: 0, fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)' }}>{data.book.author}</p>
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            <HeroStat n={`${data.median}%`} label="median" accent />
            <HeroStat n={done} label="finished" />
            <HeroStat n={waiting} label="not started" />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <BookmarkEdge members={data.progress} median={data.median} />
      </div>
      <p className="dg-serif" style={{ margin: '8px 0 0', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-faint)', textAlign: 'center' }}>
        Tap a bookmark to see who&rsquo;s there
      </p>
    </div>
  );
}
function HeroStat({ n, label, accent }) {
  return (
    <div>
      <div className="dg-display" style={{ fontSize: 21, lineHeight: 1, color: accent ? 'var(--terracotta)' : 'var(--ink)' }}>{n}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10.5, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

/* ============ preview cards ============ */
function VotePreview({ data, admin, onGoVote }) {
  const v = data.vote;
  return (
    <div className="dg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="dg-display" style={{ fontSize: 15.5 }}>Round {v.round}</span>
        <DgBadge tone="live" dot>{v.phase}</DgBadge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: v.picksMax }).map((_, i) => <DgEarGlyph key={i} filled={i < v.picksUsed} />)}
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: 'var(--ink-soft)' }}>
          {v.picksUsed}/{v.picksMax} picks dog-eared · {v.voted} of {v.of} have voted
        </span>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><DgButton variant="primary" size="sm" full onClick={onGoVote}>Cast my vote</DgButton></div>
        {admin && <DgButton variant="ghost" size="sm">Close voting</DgButton>}
      </div>
    </div>
  );
}

function MeetingPreview({ data }) {
  const m = data.meeting;
  return (
    <div className="dg-card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
      {/* date stamp */}
      <div style={{
        width: 58, textAlign: 'center', border: '2px solid var(--terracotta)', borderRadius: 12,
        padding: '7px 0 8px', color: 'var(--terracotta-deep)', transform: 'rotate(-2deg)', flexShrink: 0,
      }}>
        <div className="dg-mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em' }}>{m.dow}</div>
        <div className="dg-display" style={{ fontSize: 24, lineHeight: 1 }}>{m.day}</div>
        <div className="dg-mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em' }}>{m.mon}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dg-display" style={{ fontSize: 15.5 }}>June meet-up</span>
          <DgBadge tone="success">Confirmed</DgBadge>
        </div>
        <div className="dg-serif" style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 2 }}>{m.time} · {m.place}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <DgAvatarStack names={m.attendees} max={4} size="xs" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--ink-faint)' }}>{m.going} going · {m.maybe} maybe</span>
        </div>
      </div>
    </div>
  );
}

function DiscussionsPreview({ data }) {
  return (
    <div className="dg-card" style={{ padding: '6px 0', overflow: 'hidden' }}>
      {data.threads.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--paper-edge)' }}>
          <div style={{ paddingTop: 1 }}><DgChapterChip n={t.ch} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="dg-serif" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.4, color: 'var(--ink)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.text}</p>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3 }}>{t.author} · {t.when} ago</div>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--terracotta)',
            background: 'var(--terracotta-tint)', borderRadius: 999, padding: '3px 9px', flexShrink: 0,
          }}>{t.replies}</span>
        </div>
      ))}
    </div>
  );
}

/* ============ the screen ============ */
function DashboardScreen({ data, admin, earTrigger, onGoVote, onGoProgress }) {
  return (
    <div style={{ paddingBottom: 16 }}>
      <ClubHeader data={data} admin={admin} />
      <AttentionBanner onGoVote={onGoVote} />
      <CurrentlyReadingHero data={data} earTrigger={earTrigger} onGoProgress={onGoProgress} />
      <div style={{ padding: '0 16px' }}>
        <DgSectionTitle>Active vote</DgSectionTitle>
        <VotePreview data={data} admin={admin} onGoVote={onGoVote} />
        <DgSectionTitle>Next meeting</DgSectionTitle>
        <MeetingPreview data={data} />
        <DgSectionTitle>Margin notes</DgSectionTitle>
        <DiscussionsPreview data={data} />
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
