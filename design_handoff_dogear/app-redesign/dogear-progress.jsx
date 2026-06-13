// dogear-progress.jsx — Reading Progress ("Dog-eared pages") + the update sheet
const { useState, useEffect, useRef, useMemo } = React;

/* ============ summary ring ============ */
function ProgressRing({ pct, size = 92 }) {
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(pct), 80); return () => clearTimeout(t); }, [pct]);
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-edge)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--terracotta)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset calc(.9s * var(--dur)) var(--ease-out)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="dg-display" style={{ fontSize: 24, color: 'var(--terracotta)', lineHeight: 1 }}>{pct}%</div>
        <div className="dg-display" style={{ fontSize: 9.5, color: 'var(--ink-faint)', letterSpacing: '.08em', marginTop: 2 }}>MEDIAN</div>
      </div>
    </div>
  );
}

/* ============ dog-ear corner (the save reward) ============ */
function DogEarCorner({ trigger }) {
  if (!trigger) return null;
  return (
    <div key={trigger} style={{ position: 'absolute', top: 0, right: 0, width: 34, height: 34, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0, borderTopRightRadius: 'var(--r-card)', overflow: 'hidden',
        animation: 'dg-dogear-fold calc(.5s * var(--dur)) var(--spring) both', transformOrigin: 'top right',
      }}>
        {/* the revealed page beneath */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderTop: '34px solid var(--paper)', borderLeft: '34px solid transparent',
        }}></div>
        {/* the folded flap */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderBottom: '34px solid var(--terracotta)', borderRight: '34px solid transparent',
          filter: 'drop-shadow(-2px 2px 3px rgba(96,64,32,.3))',
        }}></div>
      </div>
    </div>
  );
}

/* ============ summary card ============ */
function ProgressSummary({ members, pages, earTrigger }) {
  const reading = members.filter(m => m.status === 'reading');
  const done = members.filter(m => m.status === 'done').length;
  const waiting = members.filter(m => m.status === 'waiting').length;
  const median = useMemo(() => {
    const v = reading.map(m => m.pct).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  }, [members]);
  const n = members.length;
  return (
    <div className="dg-card" style={{ padding: '18px 18px 16px', position: 'relative' }}>
      <DogEarCorner trigger={earTrigger} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ProgressRing pct={median} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* segmented distribution */}
          <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
            <div style={{ width: `${(done / n) * 100}%`, background: 'var(--amber)' }}></div>
            <div style={{ width: `${(reading.length / n) * 100}%`, background: 'var(--terracotta)' }}></div>
            <div style={{ width: `${(waiting / n) * 100}%`, background: 'var(--paper-edge)' }}></div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <Legend swatch="var(--amber)" label={`${done} finished`} />
            <Legend swatch="var(--terracotta)" label={`${reading.length} reading`} />
            <Legend swatch="var(--paper-edge)" label={`${waiting} not started`} />
          </div>
          <p className="dg-serif" style={{ margin: '10px 0 0', fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            Median {median}% across {reading.length} reading · {waiting} not started
          </p>
        </div>
      </div>
    </div>
  );
}
function Legend({ swatch, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--ink-soft)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: swatch, display: 'inline-block' }}></span>{label}
    </span>
  );
}

/* ============ member rows ============ */
function MemberRow({ m, i }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  const badge = m.status === 'done' ? <DgBadge tone="accent">Done</DgBadge>
    : m.status === 'reading' ? <DgBadge tone="primary">Reading</DgBadge>
    : <DgBadge tone="neutral">Waiting</DgBadge>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
      <DgAvatar name={m.name} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="dg-display" style={{ fontSize: 15 }}>{m.name}{m.you ? ' (you)' : ''}</span>
          {m.status === 'done' && <span style={{ color: 'var(--amber-deep)', fontSize: 13 }}>✓</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ink-faint)', marginTop: 1 }}>
          {m.status === 'waiting' ? 'Hasn\u2019t started yet' : `Page ${m.page} · ch. ${m.chapter}`}
          {m.updated !== '—' && <span> · {m.updated}</span>}
        </div>
        <div className="dg-bar" style={{ height: 6, marginTop: 7 }}>
          <div className={`dg-bar__fill ${m.status === 'done' ? 'dg-bar__fill--amber' : m.status === 'waiting' ? 'dg-bar__fill--muted' : ''}`}
            style={{ width: mounted ? `${m.pct}%` : '0%', transitionDelay: `${i * 60}ms` }}></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <span className="dg-display" style={{ fontSize: 15, color: m.status === 'waiting' ? 'var(--ink-faint)' : 'var(--ink)' }}>{m.pct}%</span>
        {badge}
      </div>
    </div>
  );
}

/* ============ history shelf ============ */
function HistoryShelf({ shelf }) {
  return (
    <div className="dg-scroll-x" style={{ display: 'flex', gap: 12, padding: '4px 2px 10px' }}>
      {shelf.map((b) => (
        <div key={b.title} className="dg-card" style={{ padding: 12, width: 108, flexShrink: 0, position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DgBookCover title={b.title} author={b.author} src={b.cover} width={64} />
          </div>
          <div className="dg-display" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{b.title}</div>
          {b.current ? (
            <div style={{ marginTop: 6 }}><DgBadge tone="primary" dot>Current</DgBadge></div>
          ) : (
            <div className="dg-mono" style={{
              marginTop: 6, display: 'inline-block', transform: 'rotate(-5deg)',
              border: '1.5px solid var(--success)', color: 'var(--success)', borderRadius: 4,
              fontSize: 8.5, fontWeight: 700, padding: '2px 5px', letterSpacing: '.1em', opacity: .85,
            }}>FINISHED {b.finished.toUpperCase()}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============ the update sheet (signature interaction) ============ */
function StatusCard({ label, sub, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, border: active ? '2px solid var(--terracotta)' : '2px solid var(--paper-edge)',
      background: active ? 'var(--terracotta-tint)' : 'var(--paper-card)',
      borderRadius: 14, padding: '10px 6px 9px', cursor: 'pointer', textAlign: 'center',
      transition: 'border-color .15s ease, background .15s ease, transform .15s var(--spring)',
      transform: active ? 'scale(1.02)' : 'scale(1)',
    }}>
      <div className="dg-display" style={{ fontSize: 13.5, color: active ? 'var(--terracotta-deep)' : 'var(--ink)' }}>{label}</div>
      {sub && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 9.5, color: 'var(--ink-faint)', marginTop: 2 }}>{sub}</div>}
    </button>
  );
}

function BookmarkSlider({ pct, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const handle = (clientY) => {
    const r = trackRef.current.getBoundingClientRect();
    const usable = r.height - 26;
    let p = ((clientY - r.top - 13) / usable) * 100;
    p = Math.max(0, Math.min(100, p));
    onChange(Math.round(p));
  };
  const down = (e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); handle(e.clientY); };
  const move = (e) => { if (dragging.current) handle(e.clientY); };
  const up = () => { dragging.current = false; };
  const top = `calc(${pct / 100} * (100% - 26px))`;
  return (
    <div style={{ display: 'flex', gap: 0, height: 190 }}>
      {/* the page */}
      <div style={{
        flex: 1, background: 'var(--paper-card)', border: '1.5px solid var(--paper-edge)',
        borderRight: 'none', borderRadius: '12px 0 0 12px', position: 'relative', overflow: 'hidden',
      }}>
        {/* faint text lines */}
        <div style={{ position: 'absolute', inset: '16px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {[92, 100, 96, 88, 100, 94, 78, 98, 90, 60].map((w, i) => (
            <div key={i} style={{ height: 3.5, width: `${w}%`, borderRadius: 2, background: 'var(--paper-edge)', opacity: .8 }}></div>
          ))}
        </div>
        {/* read tint above the bookmark */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: `calc(${top} + 13px)`,
          background: 'var(--terracotta-tint)', opacity: .45, transition: dragging.current ? 'none' : 'height .15s ease',
        }}></div>
      </div>
      {/* the page edge + bookmark */}
      <div ref={trackRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{
          width: 56, position: 'relative', cursor: 'grab', touchAction: 'none',
          background: 'repeating-linear-gradient(180deg, var(--paper-card) 0 2px, var(--paper-edge) 2px 3px)',
          border: '1.5px solid var(--paper-edge)', borderRadius: '0 12px 12px 0',
        }}>
        <div style={{
          position: 'absolute', left: -7, right: 6, top, height: 26,
          transition: dragging.current ? 'none' : 'top .15s ease',
        }}>
          {/* bookmark ribbon */}
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--terracotta)', borderRadius: '6px 4px 4px 6px',
            boxShadow: '0 3px 8px rgba(199,91,57,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 18, height: 2.5, borderRadius: 2, background: 'rgba(255,248,236,.55)', boxShadow: '0 5px 0 rgba(255,248,236,.55), 0 -5px 0 rgba(255,248,236,.55)' }}></div>
          </div>
          {/* ribbon tail */}
          <div style={{
            position: 'absolute', right: -14, top: 4, bottom: 4, width: 16,
            background: 'var(--terracotta-deep)', clipPath: 'polygon(0 0, 100% 0, 62% 50%, 100% 100%, 0 100%)',
            borderRadius: '0 2px 2px 0',
          }}></div>
        </div>
      </div>
    </div>
  );
}

function UpdateSheet({ open, me, pages, onClose, onSave }) {
  const [status, setStatus] = useState(me.status);
  const [page, setPage] = useState(me.page);
  const [chapter, setChapter] = useState(me.chapter);
  useEffect(() => {
    if (open) { setStatus(me.status); setPage(me.page); setChapter(me.chapter); }
  }, [open]);
  if (!open) return null;
  const pct = Math.round((page / pages) * 100);
  const pick = (s) => {
    setStatus(s);
    if (s === 'done') setPage(pages);
    if (s === 'waiting') setPage(0);
  };
  const setByPct = (p) => { setPage(Math.round((p / 100) * pages)); if (status !== 'reading' && p > 0 && p < 100) setStatus('reading'); };
  const setByPage = (v) => {
    const n = Math.max(0, Math.min(pages, parseInt(v || '0', 10)));
    setPage(n);
    if (n === pages) setStatus('done'); else if (n > 0) setStatus('reading');
  };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(61,47,36,.42)', animation: 'dg-fade-in calc(.2s * var(--dur)) ease both' }}></div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--paper)', borderRadius: '26px 26px 0 0', boxShadow: 'var(--shadow-sheet)',
        padding: '14px 20px 24px', animation: 'dg-slide-up calc(.32s * var(--dur)) var(--ease-out) both',
      }}>
        <div style={{ width: 40, height: 4.5, borderRadius: 999, background: 'var(--paper-edge)', margin: '0 auto 14px' }}></div>
        <h3 className="dg-display" style={{ fontSize: 21, margin: '0 0 2px' }}>Where did you stop?</h3>
        <p className="dg-serif" style={{ margin: '0 0 14px', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-soft)' }}>North Woods · {pages} pages</p>

        <div style={{ display: 'flex', gap: 8 }}>
          <StatusCard label="Not started" active={status === 'waiting'} onClick={() => pick('waiting')} />
          <StatusCard label="Reading" active={status === 'reading'} onClick={() => pick('reading')} />
          <StatusCard label="Finished" sub="fills to 100%" active={status === 'done'} onClick={() => pick('done')} />
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
          <div style={{ flex: '0 0 158px' }}>
            <BookmarkSlider pct={pct} onChange={setByPct} />
            <div style={{ textAlign: 'center', marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: 'var(--ink-faint)' }}>Drag the bookmark</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="dg-display" style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--ink-soft)' }}>Page</label>
              <input className="dg-input" type="number" min="0" max={pages} value={page}
                onChange={(e) => setByPage(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
            </div>
            <div>
              <label className="dg-display" style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--ink-soft)' }}>Chapter <span style={{ fontWeight: 600, color: 'var(--ink-faint)' }}>(optional)</span></label>
              <input className="dg-input" type="number" min="0" value={chapter || ''} placeholder="—"
                onChange={(e) => setChapter(parseInt(e.target.value || '0', 10))} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, lineHeight: 1.45, color: 'var(--ink-faint)' }}>
              Your chapter sets what discussions you see — notes past it stay tucked away.
            </p>
          </div>
        </div>

        {/* live preview */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}><DgBar value={pct} height={10} /></div>
          <span className="dg-display" style={{ fontSize: 16, color: 'var(--terracotta)', minWidth: 42, textAlign: 'right' }}>{pct}%</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <DgButton variant="ghost" size="md" onClick={onClose}>Cancel</DgButton>
          <div style={{ flex: 1 }}>
            <DgButton variant="primary" size="md" full onClick={() => onSave({ status, page, chapter, pct })}>
              Save my place
            </DgButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ the screen ============ */
function ProgressScreen({ data, earTrigger, onOpenUpdate }) {
  const me = data.progress.find(m => m.you);
  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 2px 14px' }}>
        <div>
          <h1 className="dg-display" style={{ fontSize: 26, margin: 0, color: 'var(--terracotta)' }}>Dog-eared pages</h1>
          <p className="dg-serif" style={{ margin: '2px 0 0', fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)' }}>{data.book.title} · {data.book.author}</p>
        </div>
        <DgBookCover title={data.book.title} author={data.book.author} src={data.book.cover} width={46} />
      </div>

      <ProgressSummary members={data.progress} pages={data.book.pages} earTrigger={earTrigger} />

      <div style={{ marginTop: 14 }}>
        <DgButton variant="primary" size="lg" full onClick={onOpenUpdate}>
          Move my bookmark
        </DgButton>
      </div>

      <DgSectionTitle>Where everyone is</DgSectionTitle>
      <div className="dg-card" style={{ overflow: 'hidden' }}>
        {data.progress.map((m, i) => (
          <div key={m.name} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--paper-edge)', background: m.you ? 'rgba(199,91,57,.045)' : 'transparent' }}>
            <MemberRow m={m} i={i} />
          </div>
        ))}
      </div>

      <DgSectionTitle>The club&rsquo;s shelf</DgSectionTitle>
      <HistoryShelf shelf={data.shelf} />
    </div>
  );
}

Object.assign(window, { ProgressScreen, UpdateSheet, DogEarCorner });
