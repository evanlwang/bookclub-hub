// dogear-voting.jsx — Voting ("Recommendation slips") with three phases
const { useState, useEffect, useMemo } = React;

/* ---------- big dog-ear fold on a slip card ---------- */
function SlipFold({ folded }) {
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 44, pointerEvents: 'none', zIndex: 2 }}>
      <div style={{
        position: 'absolute', inset: 0, borderTopRightRadius: 'var(--r-card)', overflow: 'hidden',
        transform: folded ? 'scale(1)' : 'scale(0)', transformOrigin: 'top right',
        transition: 'transform calc(.32s * var(--dur)) var(--spring)',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderTop: '44px solid var(--paper)', borderLeft: '44px solid transparent',
        }}></div>
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderBottom: '44px solid var(--terracotta)', borderRight: '44px solid transparent',
          filter: 'drop-shadow(-2px 2px 3px rgba(96,64,32,.3))',
        }}></div>
      </div>
    </div>
  );
}

/* ---------- a recommendation slip ---------- */
function Slip({ nom, selectable, selected, onToggle, rank, votes, maxVotes }) {
  return (
    <div onClick={selectable ? onToggle : undefined} className="dg-card" style={{
      position: 'relative', padding: 14, display: 'flex', gap: 14,
      cursor: selectable ? 'pointer' : 'default',
      border: selected ? '2px solid var(--terracotta)' : '2px solid transparent',
      transition: 'border-color .15s ease, transform .15s var(--spring), box-shadow .2s ease',
      boxShadow: selected ? 'var(--shadow-lift)' : 'var(--shadow-card)',
    }}>
      {selectable && <SlipFold folded={selected} />}
      {rank && (
        <div className="dg-display" style={{
          position: 'absolute', top: -8, left: -6, width: 26, height: 26, borderRadius: '50%',
          background: rank === 1 ? 'var(--amber)' : 'var(--paper-edge)',
          color: rank === 1 ? '#4A3413' : 'var(--ink-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          boxShadow: 'var(--shadow-card)',
        }}>{rank}</div>
      )}
      <DgBookCover title={nom.title} author={nom.author}
        src={`https://covers.openlibrary.org/b/isbn/${nom.isbn}-M.jpg`} width={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="dg-display" style={{ fontSize: 16, lineHeight: 1.15, paddingRight: selectable ? 30 : 0 }}>{nom.title}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ink-faint)', marginTop: 1 }}>{nom.author}</div>
        {/* the handwritten-feeling slip */}
        <div style={{
          marginTop: 8, background: 'var(--paper)', borderRadius: 10, padding: '8px 10px',
          transform: 'rotate(-0.5deg)', border: '1px solid var(--paper-edge)',
        }}>
          <p className="dg-serif" style={{ margin: 0, fontSize: 14, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--ink)' }}>&ldquo;{nom.pitch}&rdquo;</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <DgAvatar name={nom.by} size="xs" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5, color: 'var(--ink-faint)' }}>{nom.by} · {nom.when} ago</span>
          {votes != null && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
              <div style={{ flex: 1 }}><DgBar value={(votes / maxVotes) * 100} height={6} /></div>
              <span className="dg-display" style={{ fontSize: 12, color: 'var(--terracotta)' }}>{votes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- nominate modal (nominating phase) ---------- */
function NominateSheet({ open, onClose }) {
  const [q, setQ] = useState('');
  const [pitch, setPitch] = useState('');
  if (!open) return null;
  const results = q.trim() ? [
    { title: 'James', author: 'Percival Everett', isbn: '9780385550369' },
    { title: 'Orbital', author: 'Samantha Harvey', isbn: '9780802161543' },
    { title: 'Wellness', author: 'Nathan Hill', isbn: '9780593536117' },
  ] : [];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(61,47,36,.42)', animation: 'dg-fade-in calc(.2s * var(--dur)) ease both' }}></div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '86%', overflowY: 'auto',
        background: 'var(--paper)', borderRadius: '26px 26px 0 0', boxShadow: 'var(--shadow-sheet)',
        padding: '14px 20px 24px', animation: 'dg-slide-up calc(.32s * var(--dur)) var(--ease-out) both',
      }}>
        <div style={{ width: 40, height: 4.5, borderRadius: 999, background: 'var(--paper-edge)', margin: '0 auto 14px' }}></div>
        <h3 className="dg-display" style={{ fontSize: 21, margin: '0 0 10px' }}>Recommend a book</h3>
        <input className="dg-input" placeholder="Search Open Library…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {q.trim() ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {results.map(r => (
              <div key={r.title} className="dg-card" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <DgBookCover title={r.title} author={r.author} src={`https://covers.openlibrary.org/b/isbn/${r.isbn}-M.jpg`} width={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dg-display" style={{ fontSize: 14 }}>{r.title}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5, color: 'var(--ink-faint)' }}>{r.author}</div>
                </div>
                <DgButton variant="secondary" size="sm">Nominate</DgButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="dg-serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-faint)', margin: '12px 2px 0' }}>
            Type a title or author — like flipping through the card catalog.
          </p>
        )}
        <div style={{ marginTop: 14 }}>
          <label className="dg-display" style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--ink-soft)' }}>Why this book? <span style={{ fontWeight: 600, color: 'var(--ink-faint)' }}>(optional)</span></label>
          <textarea className="dg-input" rows="2" maxLength="500" placeholder="Your pitch goes on the slip…"
            value={pitch} onChange={(e) => setPitch(e.target.value)}
            style={{ resize: 'none', fontFamily: 'var(--font-body)', fontStyle: 'italic', fontWeight: 400 }}></textarea>
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: 'var(--ink-faint)' }}>{pitch.length}/500</div>
        </div>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: 'var(--terracotta)', textDecoration: 'underline',
        }}>Can&rsquo;t find it? Enter details manually</button>
      </div>
    </div>
  );
}

/* ---------- phase: nominating ---------- */
function NominatingPhase({ data, admin, toast }) {
  const [sheet, setSheet] = useState(false);
  return (
    <div>
      <div className="dg-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="dg-display" style={{ fontSize: 14 }}>Nominations close in 2 days</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{data.nominations.length} slips from 5 members · 3 picks each at the vote</div>
        </div>
        <DgButton variant="primary" size="sm" onClick={() => setSheet(true)}>+ Nominate</DgButton>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.nominations.map(n => <Slip key={n.title} nom={n} />)}
      </div>
      {admin && (
        <div className="dg-card" style={{ marginTop: 16, padding: 14 }}>
          <div className="dg-display" style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>ADMIN</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><DgButton variant="primary" size="sm" full onClick={() => toast('Round advanced to voting', false)}>Advance to voting</DgButton></div>
            <DgButton variant="ghost" size="sm">Cancel round</DgButton>
          </div>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5, color: 'var(--ink-faint)' }}>Needs at least 2 nominations — you have {data.nominations.length}.</p>
        </div>
      )}
      <NominateSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}

/* ---------- phase: voting ---------- */
function VotingPhase({ data, admin, toast }) {
  const max = data.vote.picksMax;
  const [picks, setPicks] = useState([]);
  const [savedPicks, setSavedPicks] = useState(null); // null = never submitted
  const toggle = (title) => {
    setPicks(p => p.includes(title) ? p.filter(x => x !== title)
      : p.length >= max ? p : [...p, title]);
  };
  const dirty = savedPicks !== null && JSON.stringify([...picks].sort()) !== JSON.stringify([...savedPicks].sort());
  const submit = () => {
    setSavedPicks([...picks]);
    toast(savedPicks === null ? 'Votes saved — tallies stay sealed until close' : 'Changes saved', false);
  };
  const label = savedPicks === null ? `Submit ${picks.length} vote${picks.length === 1 ? '' : 's'}`
    : dirty ? 'Save changes' : '✓ Votes saved';
  return (
    <div>
      {/* picks indicator */}
      <div className="dg-card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: max }).map((_, i) => <DgEarGlyph key={i} filled={i < picks.length} size={20} />)}
          </div>
          <span className="dg-display" style={{ fontSize: 15 }}>{picks.length}/{max} dog-eared</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--ink-faint)' }}>{data.vote.voted} of {data.vote.of} have voted</span>
        </div>
        <p className="dg-serif" style={{ margin: '8px 0 0', fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink-faint)' }}>
          {savedPicks !== null
            ? 'You voted previously — tap a book to add or remove it.'
            : 'Your selections stay private. Tallies are revealed when voting closes.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.nominations.map(n => (
          <Slip key={n.title} nom={n} selectable selected={picks.includes(n.title)} onToggle={() => toggle(n.title)} />
        ))}
      </div>

      <div style={{ position: 'sticky', bottom: 10, marginTop: 16 }}>
        <DgButton variant="primary" size="lg" full disabled={picks.length === 0 || (savedPicks !== null && !dirty)} onClick={submit}>
          {label}
        </DgButton>
      </div>
      {admin && (
        <div style={{ marginTop: 12 }}>
          <DgButton variant="secondary" size="sm" full onClick={() => toast('Voting closed — winner revealed', false)}>Close voting &amp; reveal winner</DgButton>
        </div>
      )}
    </div>
  );
}

/* ---------- phase: decided ---------- */
function DecidedPhase({ data, admin }) {
  const winner = data.nominations[0];
  const tallies = [6, 4, 3, 2, 1];
  return (
    <div>
      {/* the Now Reading shelf moment */}
      <div className="dg-card" style={{
        padding: '22px 18px 0', textAlign: 'center', overflow: 'hidden',
        background: 'linear-gradient(180deg, var(--amber-tint), var(--paper-card) 75%)',
      }}>
        <DgBadge tone="accent" dot>Now reading</DgBadge>
        <h2 className="dg-display" style={{ fontSize: 23, margin: '10px 0 2px' }}>{winner.title}</h2>
        <p className="dg-serif" style={{ margin: 0, fontSize: 15, fontStyle: 'italic', color: 'var(--ink-soft)' }}>{winner.author} · 6/7 approval votes</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <DgBookCover title={winner.title} author={winner.author} src={`https://covers.openlibrary.org/b/isbn/${winner.isbn}-L.jpg`} width={92} />
        </div>
        {/* the shelf */}
        <div style={{ height: 12, background: 'var(--ink)', borderRadius: '4px 4px 0 0', margin: '0 -18px', boxShadow: '0 -3px 8px rgba(96,64,32,.18)' }}></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1 }}><DgButton variant="primary" size="sm" full>Set up first meeting</DgButton></div>
        <DgButton variant="secondary" size="sm">Open Library ↗</DgButton>
      </div>

      <DgSectionTitle>Final tallies</DgSectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.nominations.map((n, i) => (
          <Slip key={n.title} nom={n} rank={i + 1} votes={tallies[i]} maxVotes={7} />
        ))}
      </div>
      {admin && (
        <div style={{ marginTop: 14 }}>
          <DgButton variant="secondary" size="sm" full>Start new round</DgButton>
        </div>
      )}
    </div>
  );
}

/* ---------- the screen ---------- */
function VotingScreen({ data, admin, phase, toast }) {
  const sub = { nominating: 'Slip your recommendations in', voting: 'Dog-ear your favorites', decided: 'The club has spoken' }[phase];
  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <div style={{ margin: '10px 2px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 className="dg-display" style={{ fontSize: 26, margin: 0, color: 'var(--terracotta)' }}>Round {data.vote.round}</h1>
          <DgBadge tone={phase === 'decided' ? 'accent' : 'live'} dot>{phase === 'nominating' ? 'Nominating' : phase === 'voting' ? 'Voting open' : 'Decided'}</DgBadge>
        </div>
        <p className="dg-serif" style={{ margin: '2px 0 0', fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)' }}>{sub}</p>
      </div>
      {phase === 'nominating' && <NominatingPhase data={data} admin={admin} toast={toast} />}
      {phase === 'voting' && <VotingPhase data={data} admin={admin} toast={toast} />}
      {phase === 'decided' && <DecidedPhase data={data} admin={admin} />}
    </div>
  );
}

Object.assign(window, { VotingScreen });
