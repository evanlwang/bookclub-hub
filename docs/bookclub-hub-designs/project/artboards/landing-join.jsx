/* global React, Avatar, Button, Badge, BookCover, Card, ChapterChip, Field, I */
const { useState, useEffect } = React;

/* ---------- Landing page artboard ---------- */
function LandingArtboard() {
  return (
    <div className="paper" style={{ height: '100%', overflow: 'auto', position: 'relative' }}>
      {/* Top nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 56px', borderBottom: '1px solid transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <I.logo size={26}/>
          <span className="t-display" style={{ fontSize: 20, fontWeight: 600 }}>BookClub Hub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <a style={navLink}>How it works</a>
          <a style={navLink}>For organizers</a>
          <Button variant="ghost" size="sm">Sign in</Button>
          <Button variant="primary" size="sm">Join a club</Button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '56px 56px 72px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderRadius: 999, fontSize: 12, fontWeight: 500, marginBottom: 20 }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--accent-ink)' }}/>
            Spoiler-safe by default
          </div>
          <h1 className="t-display" style={{ fontSize: 72, lineHeight: 1.0, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
            Your book club,<br/>
            <em style={{ fontStyle: 'italic', color: 'var(--primary)' }}>finally</em> organized.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-2)', maxWidth: 480, lineHeight: 1.55, margin: '0 0 28px' }}>
            Pick books by approval vote, find a meeting time everyone can make, and keep the chapter twelve discussions away from the chapter four readers.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="primary" size="lg" iconRight={<I.chev size={14}/>}>Join a club</Button>
            <Button variant="secondary" size="lg">Create a club</Button>
          </div>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {['Marisol O', 'Jules B', 'Theo P', 'Naomi K'].map((n, i) => (
                <div key={n} style={{ marginLeft: i ? -8 : 0, border: '2px solid var(--bg)', borderRadius: 999 }}>
                  <Avatar name={n} size="md"/>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              <strong style={{ color: 'var(--ink-2)' }}>2,400+</strong> readers · <strong style={{ color: 'var(--ink-2)' }}>340</strong> active clubs
            </div>
          </div>
        </div>

        {/* Hero collage */}
        <div style={{ position: 'relative', height: 460 }}>
          {/* Floating cards */}
          <Card style={{ position: 'absolute', top: 0, right: 30, width: 280, padding: 16, transform: 'rotate(-2deg)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Badge tone="accent" dot>Voting</Badge>
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Round 4</span>
            </div>
            <div className="t-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Pick up to 3</div>
            {[['The Saint of Bright Doors', true], ['North Woods', false], ['Birnam Wood', true]].map(([t, on]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line-strong)'}`,
                  background: on ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                }}>{on && <I.check size={10} sw={3}/>}</span>
                {t}
              </div>
            ))}
          </Card>

          <Card style={{ position: 'absolute', top: 90, left: 0, width: 260, padding: 18, transform: 'rotate(1.5deg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="t-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Thursday potluck?</div>
            {[['Thu Apr 18, 7pm', 5, 'most'], ['Fri Apr 19, 6pm', 3, ''], ['Sat Apr 20, 5pm', 2, '']].map(([d, n, hot]) => (
              <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: 6, borderRadius: 8, background: hot ? 'var(--success-soft)' : 'var(--bg-soft)', fontSize: 12 }}>
                <span style={{ fontWeight: hot ? 600 : 400 }}>{d}</span>
                <span style={{ color: hot ? 'var(--success)' : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{n} ✓</span>
              </div>
            ))}
          </Card>

          <Card style={{ position: 'absolute', bottom: 10, right: 60, width: 290, padding: 16, transform: 'rotate(2deg)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ChapterChip tag="Ch. 5–8" chapter={2}/>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>4 comments</span>
            </div>
            <div className="t-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>The dinner scene — was that earned?</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Started by Marisol · 2 hours ago</div>
          </Card>

          <BookCover title="Sea of Tranquility" author="Mandel" variant="teal" size="xl"
            // wrapper styles via outer div instead
          />
        </div>
      </div>

      {/* Feature row */}
      <div style={{ padding: '0 56px 72px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { icon: <I.vote size={22}/>, title: 'Approval voting', body: 'No bullying, no ties. Members pick every book they\u2019d enjoy; the highest tally wins.' },
            { icon: <I.calendar size={22}/>, title: 'Meeting scheduling', body: 'Propose time slots, members vote, the heatmap surfaces the slot that works for everyone.' },
            { icon: <I.chat size={22}/>, title: 'Spoiler-safe threads', body: 'Tag a thread by chapter and only readers past that point will see it in their feed.' },
          ].map(f => (
            <Card key={f.title} style={{ padding: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {f.icon}
              </div>
              <div className="t-display" style={{ fontSize: 19, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{f.body}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '28px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.logo size={18}/> <span>BookClub Hub</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>For people who finish the book.</span>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <a style={navLink}>Privacy</a>
          <a style={navLink}>Terms</a>
          <a style={navLink}>Changelog</a>
        </div>
      </div>
    </div>
  );
}

const navLink = { color: 'var(--ink-2)', cursor: 'pointer', textDecoration: 'none', padding: '6px 10px' };

/* ---------- Join Flow artboard (interactive) ----------
   Sequential flow:
     1. Identity (email + display name)
     2. Choice (join existing club  |  create new club)
     3a. Join branch — invite code lookup
     3b. Create branch — club name + voting cadence
     4. Success (welcome state, branch-aware)
*/
function JoinFlowArtboard() {
  const [step, setStep] = useState(1);                 // 1 | 2 | 3 | 4
  const [path, setPath] = useState(null);              // 'join' | 'create' | null
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  // join branch state
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState(null);          // { clubName, memberCount } | 'not_found' | 'inactive' | null
  const [loading, setLoading] = useState(false);
  // create branch state
  const [clubName, setClubName] = useState('');
  const [cadence, setCadence] = useState('monthly');
  // submit
  const [submitting, setSubmitting] = useState(false);

  const knownClubs = {
    'OAKWOOD-7Q': { clubName: 'Oakwood Library Society', memberCount: 12 },
    'SLOW-READS': { clubName: 'Slow Reads', memberCount: 7 },
  };

  // debounced lookup on code change
  useEffect(() => {
    if (path !== 'join') return;
    const c = code.trim().toUpperCase();
    if (c.length < 4) { setLookup(null); return; }
    setLoading(true);
    const t = setTimeout(() => {
      setLoading(false);
      if (knownClubs[c]) setLookup(knownClubs[c]);
      else if (c === 'CLOSED-1') setLookup('inactive');
      else setLookup('not_found');
    }, 600);
    return () => clearTimeout(t);
  }, [code, path]);

  const identityValid = email.includes('@') && name.trim().length > 0;
  const joinReady = lookup && typeof lookup !== 'string';
  const createReady = clubName.trim().length >= 3;

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setStep(4); }, 900);
  };

  const reset = () => {
    setStep(1); setPath(null);
    setEmail(''); setName('');
    setCode(''); setLookup(null);
    setClubName(''); setCadence('monthly');
  };

  const stepLabels = ['You', 'Path', path === 'create' ? 'Club' : 'Code'];

  return (
    <div className="paper" style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <I.logo size={22}/>
          <span className="t-display" style={{ fontSize: 16, fontWeight: 600 }}>BookClub Hub</span>
        </div>
        {step < 4 && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Already a member? <a style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none' }}>Sign in</a>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 480, padding: 32 }}>
          {step < 4 && (
            <>
              <h1 className="t-display" style={{ fontSize: 28, margin: '0 0 6px' }}>
                {step === 1 && 'Let\u2019s get you started'}
                {step === 2 && `Welcome, ${name.split(' ')[0] || 'reader'}`}
                {step === 3 && path === 'join' && 'Find your club'}
                {step === 3 && path === 'create' && 'Set up your club'}
              </h1>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
                {step === 1 && 'Tell us who you are. We\u2019ll send a magic link \u2014 no password required.'}
                {step === 2 && 'Are you joining a club someone invited you to, or starting your own?'}
                {step === 3 && path === 'join' && 'Enter the invite code your organizer sent you.'}
                {step === 3 && path === 'create' && 'You can change all of this later.'}
              </p>

              {/* 3-segment stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 11, color: 'var(--ink-3)' }}>
                {[1, 2, 3].map(n => (
                  <React.Fragment key={n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: n === step ? '0 0 auto' : '0 0 auto' }}>
                      <StepDot n={n} active={step === n} done={step > n}/>
                      {step === n && <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{stepLabels[n - 1]}</span>}
                    </div>
                    {n < 3 && <div style={{ flex: 1, height: 1, background: step > n ? 'var(--primary)' : 'var(--line)' }}/>}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}

          {/* STEP 1 — identity */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Email">
                <input
                  className="input" type="email" placeholder="you@home.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Display name" hint="Visible to other members in the club.">
                <input
                  className="input" placeholder="e.g. Marisol"
                  value={name} onChange={e => setName(e.target.value)}
                />
              </Field>
              <Button
                variant="primary" size="lg"
                disabled={!identityValid}
                onClick={() => setStep(2)}
                iconRight={<I.chev size={14}/>}
                style={{ marginTop: 4 }}
              >
                Continue
              </Button>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5 }}>
                By continuing you agree to our <a style={inlineLink}>Terms</a> and <a style={inlineLink}>Privacy Policy</a>.
              </div>
            </div>
          )}

          {/* STEP 2 — path choice */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <PathCard
                icon={<I.users size={20}/>}
                title="Join an existing club"
                body="Use an invite code from your organizer. Most readers start here."
                meta="2,400+ readers in 340 clubs"
                onClick={() => { setPath('join'); setStep(3); }}
              />
              <PathCard
                icon={<I.plus size={20}/>}
                title="Create a new club"
                body="Start fresh, invite your friends, and run the first vote. Free for clubs up to 12 members."
                meta="Takes about 90 seconds"
                onClick={() => { setPath('create'); setStep(3); }}
              />
              <button
                onClick={() => setStep(1)}
                style={{
                  marginTop: 4, padding: '10px', background: 'transparent', border: 0,
                  color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center',
                }}
              >
                <I.chev size={12} style={{ transform: 'rotate(180deg)' }}/> Back
              </button>
            </div>
          )}

          {/* STEP 3a — join branch */}
          {step === 3 && path === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Club code" hint="Try OAKWOOD-7Q or SLOW-READS to preview.">
                <div style={{ position: 'relative' }}>
                  <input
                    className="input t-mono"
                    placeholder="OAKWOOD-7Q"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 15, paddingRight: 42 }}
                    autoFocus
                  />
                  {loading && <Spinner style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}/>}
                </div>
              </Field>

              {lookup && typeof lookup !== 'string' && (
                <div style={{ padding: 14, background: 'var(--primary-soft)', border: '1px solid oklch(0.85 0.04 195)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <I.book size={18}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary-ink)' }}>{lookup.clubName}</div>
                    <div style={{ fontSize: 12, color: 'var(--primary-ink)', opacity: 0.75 }}>{lookup.memberCount} members</div>
                  </div>
                  <I.check size={18} stroke="var(--primary)" sw={2}/>
                </div>
              )}
              {lookup === 'not_found' && <ErrorBox>We couldn\u2019t find a club with that code.</ErrorBox>}
              {lookup === 'inactive' && <ErrorBox>This club is no longer active.</ErrorBox>}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button variant="ghost" size="md" onClick={() => setStep(2)}>Back</Button>
                <Button variant="primary" size="md" disabled={!joinReady || submitting} onClick={handleSubmit} style={{ flex: 1 }}>
                  {submitting ? <><Spinner light/> Joining…</> : `Join ${joinReady ? lookup.clubName : 'the club'}`}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3b — create branch */}
          {step === 3 && path === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Club name" hint="What your members will see.">
                <input
                  className="input"
                  placeholder="e.g. Slow Reads, Oakwood Library Society"
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Voting cadence" hint="How often you pick a new book. Change anytime.">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { v: 'monthly', label: 'Monthly', sub: '12 books/yr' },
                    { v: 'six_weeks', label: '6 weeks', sub: '~9 books/yr' },
                    { v: 'flex', label: 'Flexible', sub: 'No schedule' },
                  ].map(o => {
                    const on = cadence === o.v;
                    return (
                      <button
                        key={o.v}
                        onClick={() => setCadence(o.v)}
                        style={{
                          padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line)'}`,
                          background: on ? 'oklch(0.985 0.012 195)' : 'var(--bg)',
                          textAlign: 'left', fontFamily: 'inherit',
                          boxShadow: on ? '0 0 0 3px oklch(0.42 0.06 195 / 0.12)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div className="t-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: on ? 'var(--primary-ink)' : 'var(--ink)' }}>{o.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{o.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 10, fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <I.spark size={14} stroke="var(--primary)"/>
                <div style={{ lineHeight: 1.5 }}>
                  After this you\u2019ll get a shareable invite code. We\u2019ll walk you through nominating the first book.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button variant="ghost" size="md" onClick={() => setStep(2)}>Back</Button>
                <Button variant="primary" size="md" disabled={!createReady || submitting} onClick={handleSubmit} style={{ flex: 1 }}>
                  {submitting ? <><Spinner light/> Creating…</> : 'Create club'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 — success (branch-aware) */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 18px', borderRadius: 999,
                background: 'var(--success-soft)', color: 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <I.check size={28} sw={2.5}/>
              </div>
              <h2 className="t-display" style={{ fontSize: 26, margin: '0 0 6px' }}>
                {path === 'join' ? `Welcome to ${lookup?.clubName}!` : `${clubName} is live!`}
              </h2>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 22px', lineHeight: 1.5 }}>
                {path === 'join'
                  ? <>We sent a magic link to <strong style={{ color: 'var(--ink-2)' }}>{email}</strong>. Click it to start reading.</>
                  : <>We sent a magic link to <strong style={{ color: 'var(--ink-2)' }}>{email}</strong>. Open it to invite members and nominate your first book.</>}
              </p>

              {path === 'create' && (
                <div style={{ padding: 16, background: 'var(--bg-soft)', borderRadius: 12, marginBottom: 18, textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Your invite code</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="t-mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--primary-ink)', flex: 1 }}>
                      {clubName.trim().toUpperCase().replace(/[^A-Z]+/g, '').slice(0, 6) || 'CLUB'}-7K2
                    </span>
                    <Button variant="secondary" size="sm" icon={<I.copy size={12}/>}>Copy</Button>
                  </div>
                </div>
              )}

              <Button variant="primary" size="md" onClick={reset}>
                {path === 'join' ? 'Open dashboard' : 'Go to club setup'}
              </Button>
              <div style={{ marginTop: 10 }}>
                <button onClick={reset} style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Replay flow
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

const inlineLink = { color: 'var(--ink-2)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line-strong)' };

function PathCard({ icon, title, body, meta, onClick }) {
  return (
    <button
      onClick={onClick}
      className="path-card"
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14,
        padding: 18, borderRadius: 12, cursor: 'pointer',
        border: '1.5px solid var(--line)', background: 'var(--bg)',
        textAlign: 'left', fontFamily: 'inherit',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'var(--primary-soft)', color: 'var(--primary-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="t-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 6 }}>{body}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{meta}</div>
      </div>
      <div style={{ alignSelf: 'center', color: 'var(--ink-3)' }}>
        <I.chev size={16}/>
      </div>
    </button>
  );
}

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 999,
      background: done ? 'var(--primary)' : (active ? 'var(--bg)' : 'var(--bg)'),
      border: `1.5px solid ${done || active ? 'var(--primary)' : 'var(--line-strong)'}`,
      color: done ? 'white' : (active ? 'var(--primary)' : 'var(--ink-3)'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600,
    }}>
      {done ? <I.check size={12} sw={3}/> : n}
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <div style={{ padding: '10px 14px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 10, fontSize: 13, border: '1px solid oklch(0.88 0.04 25)' }}>
      {children}
    </div>
  );
}

function Spinner({ light, style }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 999,
      border: `2px solid ${light ? 'rgba(255,255,255,0.35)' : 'var(--line)'}`,
      borderTopColor: light ? 'white' : 'var(--primary)',
      animation: 'spn 0.8s linear infinite',
      ...style,
    }}/>
  );
}

// inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('__anim_styles')) {
  const s = document.createElement('style'); s.id = '__anim_styles';
  s.textContent = `@keyframes spn { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`;
  document.head.appendChild(s);
}

window.LandingArtboard = LandingArtboard;
window.JoinFlowArtboard = JoinFlowArtboard;
