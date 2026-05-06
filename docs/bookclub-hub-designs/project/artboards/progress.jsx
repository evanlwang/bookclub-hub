/* global React, Avatar, Button, Badge, BookCover, Card, Field, I */
const { useState: uS_p } = React;

function ProgressArtboard() {
  const [updateOpen, setUpdateOpen] = uS_p(false);
  const [toast, setToast] = uS_p(null);
  const members = [
    { name: 'Theo Park', pct: 100, page: 412, ch: 20, status: 'finished' },
    { name: 'Naomi Kell', pct: 100, page: 412, ch: 20, status: 'finished' },
    { name: 'Marisol Ortega', pct: 78, page: 322, ch: 16, status: 'reading' },
    { name: 'Jules Brennan', pct: 61, page: 251, ch: 12, status: 'reading' },
    { name: 'Riya Patel', pct: 44, page: 181, ch: 9, status: 'reading' },
    { name: 'Linnea Sayers', pct: 28, page: 115, ch: 6, status: 'reading' },
    { name: 'Owen Stein', pct: 0, page: 0, ch: null, status: 'not_started' },
  ];
  const median = 61;
  const finished = members.filter(m => m.status === 'finished').length;
  const reading = members.filter(m => m.status === 'reading').length;
  const not_started = members.filter(m => m.status === 'not_started').length;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
          Oakwood Library Society <span style={{ margin: '0 6px' }}>›</span> Reading progress
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="t-display" style={{ fontSize: 30, margin: 0, letterSpacing: '-0.02em' }}>
            Reading: North Woods
            <span style={{ fontSize: 14, color: 'var(--ink-3)', marginLeft: 12, fontFamily: 'var(--font-ui)', fontWeight: 400 }}>
              412 pages · Daniel Mason
            </span>
          </h1>
          <Button variant="primary" size="md" icon={<I.edit size={14}/>} onClick={() => setUpdateOpen(true)}>Update my progress</Button>
        </div>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>
        {/* Top: ring summary + stats row */}
        <Card style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 36, alignItems: 'center' }}>
            <ProgressRing pct={median} sub={`median`} mainLabel={`${median}%`}/>
            <div>
              <div className="t-display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.02em' }}>
                {reading + finished} of {members.length} reading · median at {median}%
              </div>
              <div style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 24 }}>
                The club is past the halfway mark. Two members have finished, one hasn&rsquo;t started — usually a good moment to nudge.
              </div>

              {/* Distribution bar */}
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 14, marginBottom: 8, background: 'var(--bg-sunken)' }}>
                <div style={{ width: `${(finished / members.length) * 100}%`, background: 'var(--accent)' }}/>
                <div style={{ width: `${(reading / members.length) * 100}%`, background: 'var(--primary)' }}/>
                <div style={{ width: `${(not_started / members.length) * 100}%`, background: 'var(--ink-4)' }}/>
              </div>
              <div style={{ display: 'flex', gap: 18, fontSize: 12 }}>
                <Legend dot="var(--accent)" label="Finished" n={finished}/>
                <Legend dot="var(--primary)" label="Reading" n={reading}/>
                <Legend dot="var(--ink-4)" label="Not started" n={not_started}/>
              </div>
            </div>
          </div>
        </Card>

        {/* Member list */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div className="t-display" style={{ fontSize: 18, fontWeight: 600 }}>Where everyone is</div>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Sorted by progress</span>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {members.map((m, i) => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'center', gap: 18,
              padding: '14px 20px',
              borderTop: i ? '1px solid var(--line)' : 0,
            }}>
              <div style={{ flexShrink: 0 }}>
                <Avatar name={m.name} size="md"/>
              </div>
              <div style={{ flex: '0 1 200px', minWidth: 140 }}>
                <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.name}
                  {m.status === 'finished' && <span title="Finished" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 999, background: 'var(--accent)', color: 'oklch(0.25 0.04 75)' }}>
                    <I.check size={12} sw={3}/>
                  </span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {m.status === 'not_started' ? 'Not started yet'
                   : m.status === 'finished' ? `Finished · ${m.page} pages`
                   : `Page ${m.page}${m.ch != null ? ` · ch. ${m.ch}` : ''}`}
                </div>
              </div>
              <div className="progress-track" style={{ height: 8, flex: '1 1 100px', minWidth: 60 }}>
                <div className={`progress-fill status-${m.status} bar-anim`} style={{ width: `${m.pct}%`, animationDelay: `${i * 60}ms` }}/>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 56 }}>
                <span className="t-display" style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{m.pct}</span>
                <span style={{ color: 'var(--ink-3)' }}>%</span>
              </div>
              <div style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                {m.status === 'finished' && <Badge tone="accent">Done</Badge>}
                {m.status === 'reading' && <Badge tone="primary" dot>Reading</Badge>}
                {m.status === 'not_started' && <Badge tone="neutral">Waiting</Badge>}
              </div>
            </div>
          ))}
        </Card>

        {/* Compact summary card preview (the dashboard variant) */}
        <div style={{ marginTop: 32 }}>
          <div className="t-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--ink-3)' }}>
            Compact card (used on the dashboard)
          </div>
          <Card style={{ padding: 20, maxWidth: 360 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
              <ProgressRing pct={median} mainLabel={`${median}%`} small/>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>5 of 7 reading</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>median at {median}% · 2 finished</div>
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 6, background: 'var(--bg-sunken)' }}>
                  <div style={{ width: `${(finished / members.length) * 100}%`, background: 'var(--accent)' }}/>
                  <div style={{ width: `${(reading / members.length) * 100}%`, background: 'var(--primary)' }}/>
                  <div style={{ width: `${(not_started / members.length) * 100}%`, background: 'var(--ink-4)' }}/>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {updateOpen && <UpdateProgressModal onClose={() => setUpdateOpen(false)} onSave={(p) => {
        setUpdateOpen(false);
        setToast({ msg: `Progress saved · page ${p}`, key: Date.now() });
        setTimeout(() => setToast(null), 4000);
      }}/>}

      {/* Optimistic save toast */}
      {toast && (
        <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 60 }}>
          <div className="toast">
            <div style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I.check size={12} stroke="white"/>
            </div>
            <div style={{ flex: 1 }}>{toast.msg}</div>
            <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 0, color: 'oklch(0.78 0.13 75)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}>Undo</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ pct, mainLabel, sub, small }) {
  const sz = small ? 64 : 130;
  const stroke = small ? 7 : 12;
  const r = (sz - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
      <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="var(--primary)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="t-display" style={{ fontSize: small ? 16 : 32, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em' }}>{mainLabel}</div>
        {sub && <div style={{ fontSize: small ? 9 : 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Legend({ dot, label, n }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: dot }}/>
      {label} <strong style={{ color: 'var(--ink)' }}>{n}</strong>
    </span>
  );
}

function UpdateProgressModal({ onClose, onSave }) {
  const total = 412;
  const [page, setPage] = uS_p(322);
  const [chapter, setChapter] = uS_p(16);
  const [status, setStatus] = uS_p('reading');
  const pct = status === 'finished' ? 100 : Math.round((page / total) * 100);

  const setPct = (newPct) => {
    setPage(Math.round((newPct / 100) * total));
  };
  const setStatusAuto = (s) => {
    setStatus(s);
    if (s === 'finished') setPage(total);
    if (s === 'not_started') { setPage(0); setChapter(null); }
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'oklch(0.2 0.01 60 / 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, animation: 'fadeIn 0.15s ease', padding: 20,
    }}>
      <Card onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, padding: 0, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="t-display" style={{ fontSize: 22, fontWeight: 600 }}>Update your progress</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>North Woods · 412 pages</div>
          </div>
          <button onClick={onClose} style={iconBtnP}><I.x size={16}/></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Status — large radio cards */}
          <Field label="Status">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                ['not_started', 'Not started', 'No rush — start anytime'],
                ['reading', 'Reading', 'In the thick of it'],
                ['finished', 'Finished', 'Auto-fills to 100%'],
              ].map(([k, l, sub]) => {
                const on = status === k;
                return (
                  <button key={k} onClick={() => setStatusAuto(k)} style={{
                    padding: '14px 12px', textAlign: 'left',
                    background: on ? 'oklch(0.985 0.012 195)' : 'var(--bg)',
                    border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line)'}`,
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: on ? '0 0 0 3px oklch(0.42 0.06 195 / 0.12)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 999,
                        border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line-strong)'}`,
                        background: on ? 'var(--primary)' : 'transparent',
                        boxShadow: on ? 'inset 0 0 0 3px var(--bg)' : 'none',
                      }}/>
                      <span style={{ fontSize: 14, fontWeight: 600, color: on ? 'var(--primary-ink)' : 'var(--ink)' }}>{l}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          </Field>

          {status !== 'not_started' && (
            <>
              {/* Page / pct slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Current page</label>
                  <span className="t-display" style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {page}<span style={{ color: 'var(--ink-3)', fontSize: 14 }}> / {total}</span>
                  </span>
                </div>
                <input
                  type="range" min={0} max={total} value={page}
                  disabled={status === 'finished'}
                  onChange={e => setPage(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'oklch(0.42 0.06 195)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                  <span>0%</span><span>{pct}%</span><span>100%</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Page (precise)">
                  <input className="input" type="number" min={0} max={total} value={page}
                    disabled={status === 'finished'}
                    onChange={e => setPage(parseInt(e.target.value) || 0)}/>
                </Field>
                <Field label="Chapter (optional)">
                  <input className="input" type="number" min={1} max={20} value={chapter || ''}
                    onChange={e => setChapter(parseInt(e.target.value) || null)}/>
                </Field>
              </div>
            </>
          )}

          {/* Live preview */}
          <div style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview</div>
            <div className="progress-track"><div className={`progress-fill status-${status}`} style={{ width: `${pct}%` }}/></div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-2)' }}>
              {status === 'finished' ? '✦ Finished — nice work.'
               : status === 'not_started' ? 'Not started yet — no rush.'
               : `Page ${page}${chapter ? `, chapter ${chapter}` : ''} · ${pct}%`}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSave?.(page)}>Save progress</Button>
        </div>
      </Card>
    </div>
  );
}

const iconBtnP = { padding: 6, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', borderRadius: 6 };

window.ProgressArtboard = ProgressArtboard;
