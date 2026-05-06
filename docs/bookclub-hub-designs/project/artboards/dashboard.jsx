/* global React, Avatar, Button, Badge, BookCover, Card, ChapterChip, I */
const { useState: useStateD } = React;

function DashboardArtboard() {
  const [route, setRoute] = useStateD('dashboard');
  const [clubMenu, setClubMenu] = useStateD(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '244px 1fr', height: '100%', background: 'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{
        background: 'var(--bg-soft)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        padding: '14px 12px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 14px' }}>
          <I.logo size={22}/>
          <span className="t-display" style={{ fontSize: 16, fontWeight: 600 }}>BookClub Hub</span>
        </div>

        {/* Club switcher */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <button onClick={() => setClubMenu(!clubMenu)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: 'var(--bg)',
            border: '1px solid var(--line)', borderRadius: 10,
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I.book size={16}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Oakwood Library Society</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                <Badge tone="primary">Admin</Badge>
              </div>
            </div>
            <I.chevDown size={14} stroke="var(--ink-3)"/>
          </button>
          {clubMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 10,
              background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 6,
              animation: 'fadeIn 0.15s ease',
            }}>
              {[
                { name: 'Oakwood Library Society', role: 'Admin', current: true },
                { name: 'Slow Reads', role: 'Member' },
                { name: 'The Saturday Salon', role: 'Owner' },
              ].map(c => (
                <button key={c.name} onClick={() => setClubMenu(false)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 7,
                  background: c.current ? 'var(--bg-soft)' : 'transparent',
                  border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.role}</div>
                  </div>
                  {c.current && <I.check size={14} stroke="var(--primary)"/>}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }}/>
              <button style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 7, color: 'var(--ink-2)',
                background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 13,
              }}>
                <I.plus size={14}/> Create or join a club
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { k: 'dashboard', label: 'Dashboard', icon: <I.book size={16}/> },
            { k: 'voting', label: 'Voting', icon: <I.vote size={16}/>, badge: 'Live' },
            { k: 'meetings', label: 'Meetings', icon: <I.calendar size={16}/> },
            { k: 'discussions', label: 'Discussions', icon: <I.chat size={16}/>, count: 3 },
            { k: 'progress', label: 'Progress', icon: <I.trend size={16}/> },
          ].map(item => (
            <button key={item.k} onClick={() => setRoute(item.k)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: route === item.k ? 'var(--bg)' : 'transparent',
              color: route === item.k ? 'var(--ink)' : 'var(--ink-2)',
              border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              fontSize: 13.5, fontWeight: route === item.k ? 600 : 500,
              boxShadow: route === item.k ? 'var(--shadow-sm)' : 'none',
              borderLeft: route === item.k ? '2px solid var(--primary)' : '2px solid transparent',
            }}>
              <span style={{ color: route === item.k ? 'var(--primary)' : 'var(--ink-3)' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <Badge tone="accent" dot>{item.badge}</Badge>}
              {item.count != null && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          {/* Settings (admin) */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-2)', width: '100%',
          }}>
            <I.spark size={16}/> Settings
          </button>
          <div style={{ height: 1, background: 'var(--line)', margin: '8px 0' }}/>
          {/* User menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px' }}>
            <Avatar name="Marisol Ortega" size="md"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Marisol Ortega</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>marisol@home.com</div>
            </div>
            <button style={{ padding: 6, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', borderRadius: 6 }}>
              <I.chevDown size={14}/>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ overflow: 'auto' }}>
        <DashboardMain/>
      </main>
    </div>
  );
}

function DashboardMain() {
  return (
    <div>
      {/* Breadcrumb / topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
          <span>Oakwood Library Society</span>
          <I.chev size={12}/>
          <span style={{ color: 'var(--ink) ' }}>Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '4px 8px', background: 'var(--bg-sunken)', borderRadius: 6 }}>
            OAKWOOD-7Q
          </span>
          <Button variant="secondary" size="sm" icon={<I.users size={14}/>}>Invite</Button>
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {/* Greeting + meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tuesday, April 16
            </div>
            <h1 className="t-display" style={{ fontSize: 38, margin: 0, letterSpacing: '-0.02em' }}>
              Good evening, Marisol.
            </h1>
            <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: '6px 0 0' }}>
              <strong style={{ color: 'var(--ink)' }}>2 things</strong> need your attention this week.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="md">Settings</Button>
            <Button variant="primary" size="md" icon={<I.plus size={14}/>}>New round</Button>
          </div>
        </div>

        {/* Attention banner — actionable summary */}
        <Card style={{
          padding: 16, marginBottom: 16,
          background: 'linear-gradient(90deg, oklch(0.985 0.012 195) 0%, var(--bg) 60%)',
          borderColor: 'oklch(0.85 0.04 195)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <I.bell size={16}/>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>2 things need your attention</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--ink-2)', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--accent)' }}/>
                  Voting closes in 3 days · you haven&rsquo;t voted yet
                </span>
                <span style={{ color: 'var(--line-strong)' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: 'oklch(0.65 0.10 70)' }}/>
                  Mid-book check-in awaits your availability
                </span>
              </div>
            </div>
            <Button variant="primary" size="sm" iconRight={<I.chev size={13}/>}>Cast my vote</Button>
          </div>
        </Card>


        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, padding: 24, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <BookCover title="Sea of Tranquility" author="Emily St. John Mandel" variant="teal" size="lg"/>
              <Badge tone="accent" dot style={{ position: 'absolute' }}>—</Badge>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Badge tone="primary" dot>Currently reading</Badge>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Selected April 2 · Round 3</span>
              </div>
              <h2 className="t-display" style={{ fontSize: 30, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                Sea of Tranquility
              </h2>
              <div style={{ color: 'var(--ink-2)', fontSize: 15, marginBottom: 18, fontStyle: 'italic' }}>
                by Emily St. John Mandel · 259 pages
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, marginBottom: 18 }}>
                <Stat big label="Median progress" value="61%" sub="↑ 12% since Sunday"/>
                <Stat big label="Finished" value="2 / 7" sub="Theo, Naomi"/>
                <Stat big label="Not started" value="1" sub="Owen — nudge them?"/>
              </div>

              <div style={{ position: 'relative' }}>
                <div className="progress-track" style={{ height: 12 }}>
                  <div className="progress-fill" style={{ width: '61%' }}/>
                </div>
                {/* Member tick marks on the bar — hover for chapter */}
                <div style={{ position: 'relative', height: 24, marginTop: 6 }}>
                  {[
                    { n: 'Theo P', p: 100, ch: 20 },
                    { n: 'Naomi K', p: 100, ch: 20 },
                    { n: 'Marisol O', p: 78, ch: 16 },
                    { n: 'Jules B', p: 61, ch: 12 },
                    { n: 'Riya P', p: 44, ch: 9 },
                    { n: 'Linnea S', p: 28, ch: 6 },
                    { n: 'Owen S', p: 0, ch: null },
                  ].map(m => (
                    <div key={m.n} className="hero-tick" style={{
                      position: 'absolute', left: `calc(${m.p}% - 12px)`, top: 0,
                    }}>
                      <Avatar name={m.n} size="sm"/>
                      <div className="hero-tick-tip">
                        <strong>{m.n}</strong><br/>
                        {m.ch == null ? 'Not started' : `Ch. ${m.ch} · ${m.p}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm">Update my progress</Button>
                <Button variant="ghost" size="sm">View all readers</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Three-up: Active vote, Next meeting, Recent threads */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Active vote */}
          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Badge tone="accent" dot>Voting open</Badge>
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Round 4</span>
            </div>
            <div className="t-display" style={{ fontSize: 19, fontWeight: 600, margin: '6px 0 4px' }}>
              Pick the next book
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>
              4 of 7 members have voted · closes Sunday at 8pm
            </div>
            {/* Your picks — mirrors voting screen approval bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Your picks</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                {[0, 1, 2].map(i => {
                  const filled = i < 2;
                  return (
                    <div key={i} style={{
                      width: 12, height: 12, borderRadius: 999,
                      border: `1.5px solid ${filled ? 'var(--primary)' : 'var(--line-strong)'}`,
                      background: filled ? 'var(--primary)' : 'transparent',
                    }}/>
                  );
                })}
              </div>
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>2/3</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <BookCover title="N. Woods" author="Mason" variant="sage" size="sm"/>
              <BookCover title="Birnam Wood" author="Catton" variant="rust" size="sm"/>
              <BookCover title="Saint" author="Chandrasekera" variant="mauve" size="sm"/>
              <div style={{
                width: 48, height: 70, borderRadius: 4,
                background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)',
                border: '1px dashed var(--line-strong)',
              }}>+2</div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Button variant="primary" size="sm" style={{ width: '100%' }}>Cast my vote</Button>
            </div>
          </Card>

          {/* Next meeting */}
          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Badge tone="success" dot>Confirmed</Badge>
              <I.calendar size={16} stroke="var(--ink-3)"/>
            </div>
            <div className="t-display" style={{ fontSize: 19, fontWeight: 600, margin: '6px 0 4px' }}>
              Sea of Tranquility · final discussion
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 14 }}>
              <div style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 10, minWidth: 56 }}>
                <div style={{ fontSize: 10, color: 'var(--accent-ink)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Thu</div>
                <div className="t-display" style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent-ink)' }}>18</div>
                <div style={{ fontSize: 10, color: 'var(--accent-ink)' }}>Apr</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>7:00 – 8:30 PM</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Café Lemnos, back room</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex' }}>
                {['Marisol O', 'Jules B', 'Theo P', 'Naomi K', 'Riya P'].map((n, i) => (
                  <div key={n} style={{ marginLeft: i ? -6 : 0, border: '2px solid var(--bg)', borderRadius: 999 }}>
                    <Avatar name={n} size="sm"/>
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>5 attending · 2 maybe</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Button variant="secondary" size="sm" style={{ width: '100%' }}>Add to calendar</Button>
            </div>
          </Card>

          {/* Recent threads */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="t-display" style={{ fontSize: 17, fontWeight: 600 }}>Recent discussions</div>
              <a style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>View all</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { tag: 'Ch. 5–8', ch: 2, title: 'The dinner scene — was that earned?', author: 'Marisol', cnt: 4, t: '2h ago' },
                { tag: 'Ch. 1–3', ch: 1, title: 'Vincent\u2019s diary entries reminded me of —', author: 'Jules', cnt: 7, t: '1d ago' },
                { tag: '', ch: null, title: 'Heads up: spoilers for the audiobook prologue', author: 'Theo', cnt: 2, t: '2d ago', pin: true },
              ].map((t, i) => (
                <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {t.pin && <I.pin size={11} stroke="var(--accent-ink)"/>}
                    {t.tag && <ChapterChip tag={t.tag} chapter={t.ch}/>}
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.cnt} replies · {t.t}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--ink)' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>by {t.author}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, big }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div className="t-display" style={{ fontSize: big ? 28 : 22, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

window.DashboardArtboard = DashboardArtboard;
