// dogear-join.jsx — Landing, login, and the 4-step join wizard ("Library card application")
const { useState, useEffect } = React;

/* ---------- stepper ---------- */
function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '4px 0 18px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: i === step ? 24 : 8, height: 8, borderRadius: 999,
          background: i <= step ? 'var(--terracotta)' : 'var(--paper-edge)',
          transition: 'all calc(.25s * var(--dur)) var(--spring)',
        }}></div>
      ))}
    </div>
  );
}

/* ---------- small dog-ear mark ---------- */
function DogEarMark({ size = 30 }) {
  const fold = Math.round(size * 0.42);
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.26, background: 'var(--terracotta)', position: 'relative', overflow: 'hidden', flex: 'none', boxShadow: '0 2px 5px rgba(168,74,44,.3)' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: `${fold}px solid var(--paper)`, borderLeft: `${fold}px solid transparent` }}></div>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderBottom: `${fold}px solid var(--terracotta-deep)`, borderRight: `${fold}px solid transparent` }}></div>
    </div>
  );
}

/* ---------- landing — editorial "borrower's card" ---------- */
function LandingScreen({ onJoin, onLogin }) {
  const checkout = [
    ['Choose the next read', 'Nominate books, then dog-ear your three favourites. Tallies stay sealed until the reveal.', 'APR 02'],
    ['Stay a chapter ahead', 'Notes are tagged by chapter — anything past your bookmark stays tucked away.', 'APR 16'],
    ['Meet without the maybe', 'RSVP postcards land on the one night that works for everyone.', 'MAY 07'],
  ];
  const terms = [
    'We only ever ask for an email and a name. Nothing else, ever.',
    'No passwords — so there is nothing to forget, and nothing to steal.',
    'No ads, no algorithm, no strangers. Only the people you invite.',
  ];
  const rule = { height: 1, background: 'var(--paper-edge)' };

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* masthead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <DogEarMark size={28} />
          <span className="dg-display" style={{ fontSize: 14, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>Dogear</span>
        </div>
        <span className="dg-mono" style={{ fontSize: 10, letterSpacing: '.16em', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>EST. 2026</span>
      </div>
      <div style={{ ...rule, margin: '14px 22px 0' }}></div>

      {/* editorial hero — the literary voice */}
      <div style={{ padding: '30px 22px 0' }}>
        <h1 className="dg-serif" style={{ fontSize: 32, lineHeight: 1.2, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', margin: 0 }}>
          A small, private library for{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>the people you read with.</span>
        </h1>
        <p className="dg-serif" style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--ink-soft)', margin: '24px 0 0', maxWidth: '32ch' }}>
          Choose the next book together, settle on a night that works, and talk it through — without spoiling the ending for anyone still reading.
        </p>
      </div>

      {/* CTAs — asymmetric: one card, one quiet door */}
      <div style={{ padding: '24px 22px 0' }}>
        <DgButton variant="primary" size="lg" full onClick={onJoin}>Get your library card</DgButton>
        <div className="dg-display" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 14, fontWeight: 700, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
          Already a member?
          <button onClick={onLogin} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--terracotta)', textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap' }}>Log in</button>
        </div>
      </div>

      {/* THE borrower's card — metaphor as the centerpiece */}
      <div style={{ padding: '36px 16px 0' }}>
        <div className="dg-card" style={{ position: 'relative', padding: 0, overflow: 'hidden', transform: 'rotate(-1.3deg)', background: 'linear-gradient(170deg, #FFFDF6, var(--paper-card))', boxShadow: 'var(--shadow-lift)' }}>
          {/* dog-eared corner */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '34px solid var(--paper)', borderLeft: '34px solid transparent', zIndex: 2 }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderBottom: '34px solid var(--terracotta)', borderRight: '34px solid transparent', zIndex: 2 }}></div>

          {/* card header */}
          <div style={{ padding: '16px 18px 11px' }}>
            <div className="dg-mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', color: 'var(--ink-faint)' }}>DOGEAR LENDING LIBRARY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 7 }}>
              <span className="dg-display" style={{ fontSize: 18 }}>Borrower&rsquo;s Card</span>
              <span className="dg-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>CAT. 813.54</span>
            </div>
          </div>
          <div style={{ ...rule, background: 'var(--ink-faint)', opacity: 0.32 }}></div>
          <div style={{ ...rule, marginTop: 2 }}></div>

          {/* column heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 18px 0' }}>
            <span className="dg-mono" style={{ fontSize: 8.5, letterSpacing: '.16em', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>THE CLUB CAN &mdash;</span>
            <span className="dg-mono" style={{ fontSize: 8.5, letterSpacing: '.16em', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>DATE DUE</span>
          </div>

          {/* checkout rows = features, each with a date stamp */}
          <div style={{ padding: '0 18px 8px' }}>
            {checkout.map(([h, b, date], i) => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i < 2 ? '1px dashed var(--paper-edge)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div className="dg-display" style={{ fontSize: 14.5, color: 'var(--ink)' }}>{h}</div>
                  <div className="dg-serif" style={{ fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--ink-soft)', marginTop: 2 }}>{b}</div>
                </div>
                <div className="dg-mono" style={{ flex: 'none', border: '1.5px solid var(--terracotta)', color: 'var(--terracotta)', borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', padding: '4px 6px', textAlign: 'center', transform: `rotate(${i % 2 ? 3 : -5}deg)`, opacity: 0.9 }}>{date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* the dog-ear footnote, set like a card annotation */}
        <p className="dg-serif" style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--ink-soft)', margin: '20px 8px 0' }}>
          A dog-eared page is the universal <span style={{ color: 'var(--ink)' }}>&ldquo;here&rsquo;s where I stopped.&rdquo;</span> That little fold is the whole idea — mark your place, see where your friends are, and never spoil what&rsquo;s ahead.
        </p>
      </div>

      {/* conditions of membership — the fine print, not a callout box */}
      <div style={{ padding: '30px 22px 0' }}>
        <div className="dg-mono" style={{ fontSize: 9.5, letterSpacing: '.2em', color: 'var(--ink-faint)' }}>CONDITIONS OF MEMBERSHIP</div>
        <div style={{ marginTop: 4 }}>
          {terms.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'baseline', padding: '12px 0', borderTop: '1px solid var(--paper-edge)' }}>
              <span className="dg-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--terracotta)', flex: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="dg-serif" style={{ fontSize: 14.5, lineHeight: 1.45, color: 'var(--ink)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ex-libris bookplate footer */}
      <div style={{ padding: '32px 22px 0' }}>
        <div style={{ border: '1.5px solid var(--paper-edge)', borderRadius: 16, padding: '20px 18px', textAlign: 'center', background: 'var(--paper-card)' }}>
          <div className="dg-mono" style={{ fontSize: 9, letterSpacing: '.26em', color: 'var(--ink-faint)' }}>&middot; EX LIBRIS &middot;</div>
          <div className="dg-serif" style={{ fontSize: 19, fontStyle: 'italic', color: 'var(--terracotta)', marginTop: 9, lineHeight: 1.3 }}>For people who finish the book.</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- login ---------- */
function LoginScreen({ onBack, onDone }) {
  return (
    <div style={{ padding: '8px 22px' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', minHeight: 44,
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--terracotta)',
      }}>← Back</button>
      <h1 className="dg-display" style={{ fontSize: 28, margin: '10px 0 4px', color: 'var(--terracotta)' }}>Welcome back</h1>
      <p className="dg-serif" style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink-soft)', margin: '0 0 20px' }}>No password — just you.</p>
      <label className="dg-display" style={{ fontSize: 12.5, display: 'block', marginBottom: 5, color: 'var(--ink-soft)' }}>Email</label>
      <input className="dg-input" type="email" placeholder="june@example.com" />
      <label className="dg-display" style={{ fontSize: 12.5, display: 'block', margin: '14px 0 5px', color: 'var(--ink-soft)' }}>Pilot passcode</label>
      <input className="dg-input dg-mono" placeholder="••••••" />
      <div style={{ marginTop: 20 }}>
        <DgButton variant="primary" size="lg" full onClick={onDone}>Open my nook</DgButton>
      </div>
    </div>
  );
}

/* ---------- join wizard ---------- */
function JoinWizard({ onBack, onDone }) {
  const [step, setStep] = useState(0);          // 0 identity, 1 path, 2 branch, 3 success
  const [path, setPath] = useState(null);        // 'join' | 'create'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState('idle');  // idle | loading | found | notfound
  const [clubName, setClubName] = useState('');
  const [cadence, setCadence] = useState('monthly');

  // debounced fake lookup
  useEffect(() => {
    if (path !== 'join' || !code.trim()) { setLookup('idle'); return; }
    setLookup('loading');
    const t = setTimeout(() => setLookup(code.trim().toUpperCase() === 'TC-4417' ? 'found' : 'notfound'), 700);
    return () => clearTimeout(t);
  }, [code, path]);

  const inviteCode = clubName ? clubName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 10).replace(/-$/, '') + '-26' : '';

  return (
    <div style={{ padding: '8px 22px 24px' }}>
      <button onClick={() => step === 0 ? onBack() : setStep(step === 2 ? 1 : step - 1)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', minHeight: 44,
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--terracotta)',
        visibility: step === 3 ? 'hidden' : 'visible',
      }}>← Back</button>
      {step < 3 && <Stepper step={step} />}

      {step === 0 && (
        <div>
          <h1 className="dg-display" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--terracotta)' }}>Your library card</h1>
          <p className="dg-serif" style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink-soft)', margin: '0 0 18px' }}>
            Two lines and you&rsquo;re in. No password exists here — there&rsquo;s nothing to forget.
          </p>
          <label className="dg-display" style={{ fontSize: 12.5, display: 'block', marginBottom: 5, color: 'var(--ink-soft)' }}>Email</label>
          <input className="dg-input" type="email" placeholder="june@example.com" />
          <label className="dg-display" style={{ fontSize: 12.5, display: 'block', margin: '14px 0 5px', color: 'var(--ink-soft)' }}>Display name</label>
          <input className="dg-input" placeholder="What your club calls you" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="dg-display" style={{ fontSize: 12.5, display: 'block', margin: '14px 0 5px', color: 'var(--ink-soft)' }}>Pilot passcode</label>
          <input className="dg-input dg-mono" placeholder="••••••" />
          <div style={{ marginTop: 20 }}>
            <DgButton variant="primary" size="lg" full onClick={() => setStep(1)}>Continue</DgButton>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="dg-display" style={{ fontSize: 26, margin: '0 0 18px', color: 'var(--terracotta)' }}>Which door?</h1>
          {[
            ['join', 'Join an existing club', 'You have an invite code from a friend.'],
            ['create', 'Create a new club', 'Start fresh and invite your people.'],
          ].map(([k, h, b]) => (
            <button key={k} onClick={() => { setPath(k); setStep(2); }} className="dg-card" style={{
              display: 'block', width: '100%', textAlign: 'left', padding: 18, marginBottom: 12,
              cursor: 'pointer', border: '2px solid transparent', fontFamily: 'inherit',
            }}>
              <div className="dg-display" style={{ fontSize: 17, color: 'var(--terracotta-deep)' }}>{h}</div>
              <p className="dg-serif" style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>{b}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && path === 'join' && (
        <div>
          <h1 className="dg-display" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--terracotta)' }}>The catalog number</h1>
          <p className="dg-serif" style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink-soft)', margin: '0 0 16px' }}>Enter your club&rsquo;s code — try <span className="dg-mono" style={{ fontStyle: 'normal', fontSize: 13 }}>TC-4417</span>.</p>
          <div style={{ position: 'relative' }}>
            <input className="dg-input dg-mono" placeholder="CLUB-CODE" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontSize: 18, letterSpacing: '.12em', textAlign: 'center', padding: '14px' }} />
            {lookup === 'loading' && (
              <span style={{
                position: 'absolute', right: 14, top: '50%', marginTop: -8, width: 16, height: 16, borderRadius: '50%',
                border: '2.5px solid var(--paper-edge)', borderTopColor: 'var(--terracotta)',
                animation: 'dg-spin .7s linear infinite', display: 'inline-block',
              }}></span>
            )}
          </div>
          {lookup === 'found' && (
            <div className="dg-card" style={{ marginTop: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12, animation: 'dg-pop-in calc(.25s * var(--dur)) var(--spring) both' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--success-tint)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-display)' }}>✓</span>
              <div style={{ flex: 1 }}>
                <div className="dg-display" style={{ fontSize: 15.5 }}>Thursday Chapter</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ink-faint)' }}>7 members · found in the card drawer</div>
              </div>
            </div>
          )}
          {lookup === 'notfound' && (
            <p style={{ margin: '10px 2px 0', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: 'var(--danger)' }}>
              No club under that number — check the code with whoever invited you.
            </p>
          )}
          <div style={{ marginTop: 18 }}>
            <DgButton variant="primary" size="lg" full disabled={lookup !== 'found'} onClick={() => setStep(3)}>
              Join Thursday Chapter
            </DgButton>
          </div>
        </div>
      )}

      {step === 2 && path === 'create' && (
        <div>
          <h1 className="dg-display" style={{ fontSize: 26, margin: '0 0 16px', color: 'var(--terracotta)' }}>Found a club</h1>
          <label className="dg-display" style={{ fontSize: 12.5, display: 'block', marginBottom: 5, color: 'var(--ink-soft)' }}>Club name</label>
          <input className="dg-input" placeholder="e.g. Thursday Chapter" value={clubName} onChange={(e) => setClubName(e.target.value)} />
          <label className="dg-display" style={{ fontSize: 12.5, display: 'block', margin: '14px 0 5px', color: 'var(--ink-soft)' }}>Invite code</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="dg-input dg-mono" value={inviteCode} placeholder="Derived from the name" readOnly style={{ letterSpacing: '.1em' }} />
            {clubName && <DgBadge tone="success">Available</DgBadge>}
          </div>
          <label className="dg-display" style={{ fontSize: 12.5, display: 'block', margin: '16px 0 7px', color: 'var(--ink-soft)' }}>How often do you pick books?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['monthly', 'Monthly'], ['sixweeks', '6 weeks'], ['flexible', 'Flexible']].map(([k, label]) => (
              <button key={k} onClick={() => setCadence(k)} style={{
                flex: 1, cursor: 'pointer', borderRadius: 14, padding: '11px 4px', minHeight: 44,
                border: cadence === k ? '2px solid var(--terracotta)' : '2px solid var(--paper-edge)',
                background: cadence === k ? 'var(--terracotta-tint)' : 'var(--paper-card)',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13,
                color: cadence === k ? 'var(--terracotta-deep)' : 'var(--ink-soft)',
                transition: 'all .15s var(--spring)',
              }}>{label}</button>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <DgButton variant="primary" size="lg" full disabled={!clubName.trim()} onClick={() => setStep(3)}>
              Create {clubName.trim() || 'club'}
            </DgButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <LibraryCardSuccess path={path} name={name || 'June'} clubName={path === 'join' ? 'Thursday Chapter' : (clubName || 'Your club')}
          inviteCode={path === 'join' ? 'TC-4417' : inviteCode} onDone={onDone} />
      )}
    </div>
  );
}

/* ---------- THE library card moment ---------- */
function LibraryCardSuccess({ path, name, clubName, inviteCode, onDone }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ textAlign: 'center', paddingTop: 6 }}>
      <h1 className="dg-display" style={{ fontSize: 25, margin: '0 0 2px', color: 'var(--terracotta)' }}>
        {path === 'join' ? `Welcome to ${clubName}!` : `${clubName} is open!`}
      </h1>
      <p className="dg-serif" style={{ fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)', margin: '0 0 22px' }}>Your library card, freshly stamped.</p>

      {/* card pocket */}
      <div style={{ position: 'relative', margin: '0 6px', paddingBottom: 64 }}>
        {/* the card */}
        <div className="dg-card" style={{
          position: 'relative', zIndex: 1, margin: '0 10px', padding: '18px 18px 20px', textAlign: 'left',
          animation: 'dg-card-slide calc(.6s * var(--dur)) var(--ease-out) both',
          background: 'linear-gradient(180deg, #FFFDF6, var(--paper-card))',
        }}>
          <div className="dg-mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', color: 'var(--ink-faint)' }}>DOGEAR LENDING LIBRARY</div>
          <div style={{ height: 1.5, background: 'var(--paper-edge)', margin: '8px 0 12px' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="dg-display" style={{ fontSize: 19 }}>{name}</div>
              <div className="dg-serif" style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink-soft)', marginTop: 2 }}>Member · {clubName}</div>
              <div className="dg-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10, letterSpacing: '.1em' }}>{inviteCode}</div>
            </div>
            {/* the stamp */}
            <div className="dg-mono" style={{
              border: '2.5px solid var(--terracotta)', color: 'var(--terracotta)', borderRadius: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: '.12em', padding: '6px 9px', textAlign: 'center',
              animation: 'dg-stamp calc(.45s * var(--dur)) calc(.55s * var(--dur)) var(--ease-out) both',
            }}>JOINED<br/>JUN 10 2026</div>
          </div>
          {path === 'create' && (
            <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{
              marginTop: 14, width: '100%', cursor: 'pointer', borderRadius: 12, padding: '10px',
              border: '1.5px dashed var(--terracotta)', background: 'var(--terracotta-tint)',
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, letterSpacing: '.14em', color: 'var(--terracotta-deep)',
            }}>{copied ? '✓ COPIED' : `${inviteCode} · COPY`}</button>
          )}
        </div>
        {/* the pocket */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, zIndex: 2,
          background: 'linear-gradient(180deg, var(--amber-tint), #F0DFB8)',
          borderRadius: '14px 14px 18px 18px',
          clipPath: 'polygon(0 38%, 50% 0, 100% 38%, 100% 100%, 0 100%)',
          boxShadow: '0 -2px 8px rgba(96,64,32,.12) inset',
        }}></div>
      </div>

      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 16 }}>
        Opening your reading nook…
      </p>
    </div>
  );
}

/* ---------- entry flow wrapper ---------- */
function EntryFlow({ onEnterApp }) {
  const [route, setRoute] = useState('landing'); // landing | login | join
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingTop: 62 }} data-screen-label={'entry-' + route}>
      {route === 'landing' && <LandingScreen onJoin={() => setRoute('join')} onLogin={() => setRoute('login')} />}
      {route === 'login' && <LoginScreen onBack={() => setRoute('landing')} onDone={onEnterApp} />}
      {route === 'join' && <JoinWizard onBack={() => setRoute('landing')} onDone={onEnterApp} />}
    </div>
  );
}

Object.assign(window, { EntryFlow, LandingScreen, LoginScreen, JoinWizard, DogEarMark });
