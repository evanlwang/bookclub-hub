/* global React, Avatar, Button, Badge, BookCover, Card, Field, Tabs, I */
const { useState: uS_v } = React;

function VotingArtboard() {
  const [phase, setPhase] = uS_v('voting');
  const [searchOpen, setSearchOpen] = uS_v(false);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', position: 'relative' }}>
      {/* Mini header (acts as page header inside artboard) */}
      <div style={{ padding: '20px 32px 8px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
              Oakwood Library Society <span style={{ margin: '0 6px' }}>›</span> Voting
            </div>
            <h1 className="t-display" style={{ fontSize: 30, margin: 0, letterSpacing: '-0.02em' }}>
              Round 4
              <span style={{ fontSize: 16, color: 'var(--ink-3)', marginLeft: 12, fontFamily: 'var(--font-ui)', fontWeight: 400 }}>
                Started Apr 12 by Marisol
              </span>
            </h1>
          </div>
          <Tabs value={phase} onChange={setPhase} options={[
            { value: 'nominating', label: 'Nominating' },
            { value: 'voting', label: 'Voting' },
            { value: 'decided', label: 'Decided' },
          ]}/>
        </div>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>
        {phase === 'nominating' && <NominatingView onSearch={() => setSearchOpen(true)}/>}
        {phase === 'voting' && <VotingView/>}
        {phase === 'decided' && <DecidedView/>}
      </div>

      {searchOpen && <BookSearchModal onClose={() => setSearchOpen(false)}/>}
    </div>
  );
}

/* ---------- Phase 1: Nominating ---------- */
function NominatingView({ onSearch }) {
  const noms = [
    { title: 'North Woods', author: 'Daniel Mason', who: 'Jules Brennan', when: '2 days ago', pitch: 'Spans 300 years and one yellow-painted house. Quiet but propulsive.', cv: 'sage' },
    { title: 'Birnam Wood', author: 'Eleanor Catton', who: 'Marisol Ortega', when: '4 days ago', pitch: 'Eco-anarchist gardeners meet a billionaire prepper. Genuinely thrilling, ethically thorny.', cv: 'rust' },
    { title: 'The Saint of Bright Doors', author: 'Vajra Chandrasekera', who: 'Theo Park', when: '5 days ago', pitch: 'Strange, mythic, post-colonial. Will not be for everyone but I think it should be.', cv: 'mauve' },
    { title: 'Chain-Gang All-Stars', author: 'Nana Kwame Adjei-Brenyah', who: 'Naomi Kell', when: '6 days ago', pitch: 'Brutal premise, surprisingly tender execution. Pairs well with discussion.', cv: 'ink' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 24 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="t-display" style={{ fontSize: 20, fontWeight: 600 }}>4 nominations</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Anyone can nominate. Up to 3 approvals per voter.</div>
          </div>
          <Button variant="primary" size="md" icon={<I.search size={14}/>} onClick={onSearch}>Search & nominate</Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {noms.map((n, i) => (
            <Card key={i} style={{ padding: 18, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18 }}>
              <BookCover title={n.title} author={n.author.split(' ').pop()} variant={n.cv} size="md"/>
              <div>
                <div className="t-display" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>{n.title}</div>
                <div style={{ color: 'var(--ink-2)', fontSize: 14, fontStyle: 'italic', marginBottom: 10 }}>by {n.author}</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 12px' }}>
                  &ldquo;{n.pitch}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={n.who} size="sm"/>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    Nominated by <strong style={{ color: 'var(--ink-2)' }}>{n.who}</strong> · {n.when}
                  </span>
                </div>
              </div>
              <div>
                <button style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', padding: 4 }}>
                  <I.x size={14}/>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sidebar: round meta + admin actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <Badge tone="primary" dot>Nominating</Badge>
          <div className="t-display" style={{ fontSize: 17, fontWeight: 600, margin: '10px 0 4px' }}>Closes in 2 days</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>Sunday, April 21 at 8:00 PM</div>
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 14px' }}/>
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            <Row label="Max approvals" value="3 per member"/>
            <Row label="Members" value="7"/>
            <Row label="Nominators" value="4 of 7"/>
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Admin actions</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>Move the round forward when ready.</div>
          <Button variant="accent" size="md" style={{ width: '100%' }} iconRight={<I.chev size={13}/>}>
            Advance to voting
          </Button>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center' }}>Needs at least 2 nominations · ✓</div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ---------- Phase 2: Voting ---------- */
function VotingView() {
  const noms = [
    { id: 'a', title: 'North Woods', author: 'Daniel Mason', who: 'Jules', pitch: 'Spans 300 years and one yellow-painted house. Quiet but propulsive.', cv: 'sage' },
    { id: 'b', title: 'Birnam Wood', author: 'Eleanor Catton', who: 'Marisol', pitch: 'Eco-anarchist gardeners meet a billionaire prepper. Thrilling, ethically thorny.', cv: 'rust' },
    { id: 'c', title: 'The Saint of Bright Doors', author: 'Vajra Chandrasekera', who: 'Theo', pitch: 'Strange, mythic, post-colonial. Should be a club book.', cv: 'mauve' },
    { id: 'd', title: 'Chain-Gang All-Stars', author: 'Adjei-Brenyah', who: 'Naomi', pitch: 'Brutal premise, tender execution. Pairs well with discussion.', cv: 'ink' },
    { id: 'e', title: 'The Bee Sting', author: 'Paul Murray', who: 'Riya', pitch: 'A long Irish family novel that earns every page. Funny, then devastating.', cv: 'amber' },
  ];
  const [selected, setSelected] = uS_v(new Set(['a', 'c']));
  const [submitted, setSubmitted] = uS_v(false);
  const max = 3;
  const toggle = (id) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else if (n.size < max) n.add(id);
    setSelected(n);
    setSubmitted(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 24 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="t-display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Approve up to {max} books you&rsquo;d be happy to read
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Your selections stay private. Tallies are revealed when voting closes.
            </div>
          </div>
          {/* Inline approval bar — mirrors sidebar so picks are visible without scrolling */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Picks</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[...Array(max)].map((_, i) => {
                const filled = i < selected.size;
                return (
                  <div key={i} style={{
                    width: 16, height: 16, borderRadius: 999,
                    border: `1.5px solid ${filled ? 'var(--primary)' : 'var(--line-strong)'}`,
                    background: filled ? 'var(--primary)' : 'transparent',
                    transition: 'all 150ms ease',
                  }}/>
                );
              })}
            </div>
            <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              {selected.size}/{max}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {noms.map(n => {
            const on = selected.has(n.id);
            const disabled = !on && selected.size >= max;
            return (
              <Card key={n.id} onClick={() => !disabled && toggle(n.id)}
                style={{
                  padding: 16,
                  display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: 16, alignItems: 'center',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  borderColor: on ? 'var(--primary)' : 'var(--line)',
                  background: on ? 'oklch(0.985 0.012 195)' : 'var(--bg)',
                  opacity: disabled ? 0.55 : 1,
                  transition: 'all 0.15s',
                  boxShadow: on ? '0 0 0 3px oklch(0.42 0.06 195 / 0.12), var(--shadow-sm)' : 'var(--shadow-sm)',
                }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line-strong)'}`,
                  background: on ? 'var(--primary)' : 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  flexShrink: 0,
                }}>{on && <I.check size={14} sw={3}/>}</span>
                <BookCover title={n.title} author={n.author.split(' ').pop()} variant={n.cv} size="sm"/>
                <div style={{ minWidth: 0 }}>
                  <div className="t-display" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{n.title}</div>
                  <div style={{ color: 'var(--ink-2)', fontSize: 13, fontStyle: 'italic', marginBottom: 6 }}>by {n.author} · nom. {n.who}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>&ldquo;{n.pitch}&rdquo;</div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88, alignSelf: 'start' }}>
        <Card style={{ padding: 18 }}>
          <Badge tone="accent" dot>Voting open</Badge>
          <div className="t-display" style={{ fontSize: 17, fontWeight: 600, margin: '10px 0 4px' }}>Closes Sunday 8 PM</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>3 days, 14 hours remaining</div>
          <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }}/>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>You&rsquo;ve approved</div>
            <div className="t-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {selected.size}<span style={{ color: 'var(--ink-3)', fontSize: 18 }}> / {max}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            {[...Array(max)].map((_, i) => {
              const filled = i < selected.size;
              return (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: 999,
                  border: `2px solid ${filled ? 'var(--primary)' : 'var(--line-strong)'}`,
                  background: filled ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', transition: 'all 150ms ease',
                  boxShadow: filled ? '0 0 0 3px oklch(0.42 0.06 195 / 0.12)' : 'none',
                }}>
                  {filled && <I.check size={13} sw={3}/>}
                </div>
              );
            })}
            <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>
              {max - selected.size === 0 ? 'all used' : `${max - selected.size} left`}
            </span>
          </div>
          <Button
            variant={submitted ? 'secondary' : 'primary'}
            size="lg" style={{ width: '100%' }}
            disabled={selected.size === 0}
            onClick={() => setSubmitted(true)}>
            {submitted
              ? <><I.check size={14} stroke="var(--success)"/> ✓ Voted — update {selected.size}?</>
              : (selected.size === 0 ? 'Pick at least one' : `Submit ${selected.size} vote${selected.size === 1 ? '' : 's'}`)}
          </Button>
          {submitted && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10, textAlign: 'center' }}>You can change your vote until Sunday 8 PM.</div>}
        </Card>

        <Card style={{ padding: 18, background: 'var(--bg-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <I.users size={14} stroke="var(--ink-3)"/>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Voter turnout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="t-display" style={{ fontSize: 24, fontWeight: 600 }}>4</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>of 7 have voted</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>Tallies hidden until close</div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Phase 3: Decided ---------- */
function DecidedView() {
  const winner = { title: 'North Woods', author: 'Daniel Mason', votes: 6, who: 'Jules', cv: 'sage' };
  const others = [
    { title: 'Birnam Wood', author: 'Eleanor Catton', votes: 4, cv: 'rust' },
    { title: 'The Saint of Bright Doors', author: 'Vajra Chandrasekera', votes: 4, cv: 'mauve' },
    { title: 'The Bee Sting', author: 'Paul Murray', votes: 3, cv: 'amber' },
    { title: 'Chain-Gang All-Stars', author: 'Adjei-Brenyah', votes: 2, cv: 'ink' },
  ];
  const total = winner.votes;
  return (
    <div>
      {/* Winner banner */}
      <Card style={{
        padding: 32,
        marginBottom: 24,
        background: 'linear-gradient(135deg, oklch(0.96 0.04 75) 0%, oklch(0.94 0.05 30) 100%)',
        borderColor: 'oklch(0.85 0.06 60)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 200, opacity: 0.06, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.05em', color: 'oklch(0.45 0.10 30)' }}>
          ✦
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center', position: 'relative' }}>
          <BookCover title={winner.title} author={winner.author.split(' ').pop()} variant={winner.cv} size="lg"/>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Badge tone="accent" dot>Now reading</Badge>
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--accent-ink)' }}>Round 4 winner</span>
            </div>
            <h1 className="t-display" style={{ fontSize: 44, margin: '0 0 6px', letterSpacing: '-0.025em', color: 'oklch(0.25 0.05 60)' }}>
              {winner.title}
            </h1>
            <div style={{ fontSize: 16, color: 'oklch(0.40 0.04 60)', fontStyle: 'italic', marginBottom: 18 }}>
              by {winner.author} · nominated by {winner.who}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div className="t-display" style={{ fontSize: 32, fontWeight: 600, color: 'oklch(0.25 0.05 60)', lineHeight: 1 }}>{winner.votes}<span style={{ fontSize: 18, color: 'oklch(0.45 0.04 60)' }}> / 7</span></div>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.04 60)' }}>approval votes</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'oklch(0.75 0.05 60)' }}/>
              <Button variant="primary" size="md">Set up first meeting</Button>
              <Button variant="ghost" size="md">View on Open Library</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Runner-up tally */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="t-display" style={{ fontSize: 18, fontWeight: 600 }}>Final tallies</div>
        <Button variant="secondary" size="sm" icon={<I.plus size={13}/>}>Start a new round</Button>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {[winner, ...others].map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
            borderTop: i ? '1px solid var(--line)' : 0,
            background: i === 0 ? 'oklch(0.97 0.02 75)' : 'transparent',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: i === 0 ? 'var(--accent-ink)' : 'var(--ink-3)', fontWeight: 600, width: 28, flexShrink: 0 }}>
              {i === 0 ? '①' : `0${i + 1}`}
            </div>
            <div style={{ flexShrink: 0 }}>
              <BookCover title={b.title} author={b.author.split(' ').pop()} variant={b.cv} size="sm"/>
            </div>
            <div style={{ minWidth: 0, flex: '1 1 180px' }}>
              <div className="t-display" style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>by {b.author}</div>
            </div>
            <div className="progress-track" style={{ height: 6, flex: '1 1 120px', minWidth: 80 }}>
              <div className="progress-fill" style={{ width: `${(b.votes / total) * 100}%`, background: i === 0 ? 'var(--accent)' : 'var(--primary)' }}/>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
              <span className="t-display" style={{ fontSize: 18, fontWeight: 600 }}>{b.votes}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}> votes</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------- Book search modal ---------- */
function BookSearchModal({ onClose }) {
  const [q, setQ] = uS_v('');
  const allBooks = [
    { title: 'Babel', author: 'R. F. Kuang', year: 2022, cv: 'rust' },
    { title: 'Babel-17', author: 'Samuel R. Delany', year: 1966, cv: 'mauve' },
    { title: 'A Tale for the Time Being', author: 'Ruth Ozeki', year: 2013, cv: 'sage' },
    { title: 'The Bee Sting', author: 'Paul Murray', year: 2023, cv: 'amber' },
    { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', year: 2022, cv: 'teal' },
  ];
  const results = q.length === 0 ? allBooks : allBooks.filter(b => (b.title + b.author).toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'oklch(0.2 0.01 60 / 0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 80, zIndex: 100, animation: 'fadeIn 0.15s ease',
    }}>
      <Card onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.search size={18} stroke="var(--ink-3)"/>
            <input className="input" placeholder="Search by title or author…" value={q} onChange={e => setQ(e.target.value)}
              style={{ border: 0, padding: 0, fontSize: 16, height: 'auto' }} autoFocus/>
            <button onClick={onClose} className="kbd" style={{ cursor: 'pointer' }}>Esc</button>
          </div>
        </div>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {results.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center', padding: '10px 16px', borderTop: i ? '1px solid var(--line)' : 0 }}>
              <BookCover title={b.title} author={b.author.split(' ').pop()} variant={b.cv} size="sm"/>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>by {b.author} · {b.year}</div>
              </div>
              <Button variant="secondary" size="sm" icon={<I.plus size={13}/>}>Nominate</Button>
            </div>
          ))}
          {results.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No results for &ldquo;{q}&rdquo;</div>
          )}
        </div>
      </Card>
    </div>
  );
}

window.VotingArtboard = VotingArtboard;
