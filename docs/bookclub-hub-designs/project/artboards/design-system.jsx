/* global React, Avatar, Button, Badge, BookCover, Card, ChapterChip, Field, Tabs, I */

function DesignSystemArtboard() {
  const [textVal, setTextVal] = React.useState('');
  const [check, setCheck] = React.useState({ a: true, b: false, c: true });

  return (
    <div style={{ padding: 40, background: 'var(--bg)', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <I.logo size={26}/>
            <span className="t-display" style={{ fontSize: 22 }}>BookClub Hub</span>
            <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 8 }}>v1.0 — design system</span>
          </div>
          <h1 className="t-display" style={{ fontSize: 44, margin: '0 0 8px', letterSpacing: '-0.025em' }}>
            A warm system for a literary product.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 640, lineHeight: 1.5, margin: 0 }}>
            Newsreader for headlines, Geist for UI, JetBrains Mono for tags. Deep teal as the anchor, warm amber as the spark, paper-toned neutrals throughout.
          </p>
        </div>

        {/* Type scale */}
        <Section title="Typography" subtitle="Display serif paired with a humanist UI sans">
          <div style={{ display: 'grid', gap: 18 }}>
            <TypeRow label="Display / 56" style={{ fontSize: 56, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.05 }}>The unread shelf</TypeRow>
            <TypeRow label="Headline / 32" style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em' }}>Currently reading</TypeRow>
            <TypeRow label="Title / 20" style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600 }}>Active vote — Round 4</TypeRow>
            <TypeRow label="Body / 15" style={{ fontSize: 15, lineHeight: 1.55 }}>The committee will reconvene Thursday at half past seven, in the back room of the café on Elm.</TypeRow>
            <TypeRow label="Caption / 12" style={{ fontSize: 12, color: 'var(--ink-3)' }}>Last updated 4 minutes ago by Marisol</TypeRow>
            <TypeRow label="Mono / 12" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>club_id: 7c4f-3a91 · ch.12</TypeRow>
          </div>
        </Section>

        {/* Color */}
        <Section title="Color" subtitle="Warm paper neutrals with two earned accents">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {[
              ['Paper', 'var(--bg)', '0.985 0.006 80'],
              ['Soft', 'var(--bg-soft)', '0.965 0.010 80'],
              ['Sunken', 'var(--bg-sunken)', '0.945 0.012 80'],
              ['Ink', 'var(--ink)', '0.220 0.012 60'],
              ['Ink/2', 'var(--ink-2)', '0.420 0.012 60'],
              ['Line', 'var(--line)', '0.910 0.008 70'],
            ].map(([n, c, oklch]) => <Swatch key={n} name={n} value={c} mono={oklch}/>)}
            <Swatch name="Primary" value="var(--primary)" mono="0.420 0.060 195" big/>
            <Swatch name="Primary/soft" value="var(--primary-soft)" mono="0.940 0.025 195"/>
            <Swatch name="Accent" value="var(--accent)" mono="0.780 0.130 75" big/>
            <Swatch name="Accent/soft" value="var(--accent-soft)" mono="0.950 0.040 75"/>
            <Swatch name="Success" value="var(--success)" mono="0.620 0.100 155"/>
            <Swatch name="Danger" value="var(--danger)" mono="0.550 0.160 25"/>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" subtitle="Four variants × three sizes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['sm', 'md', 'lg'].map(sz => (
              <div key={sz} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="t-mono" style={{ width: 32, fontSize: 11, color: 'var(--ink-3)' }}>{sz}</span>
                <Button variant="primary" size={sz}>Save changes</Button>
                <Button variant="secondary" size={sz} icon={<I.plus size={14}/>}>Add slot</Button>
                <Button variant="accent" size={sz}>Confirm</Button>
                <Button variant="ghost" size={sz}>Cancel</Button>
                <Button variant="danger" size={sz} icon={<I.trash size={14}/>}>Delete</Button>
              </div>
            ))}
          </div>
        </Section>

        {/* Badges */}
        <Section title="Status badges & chips">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Badge tone="primary" dot>Nominating</Badge>
            <Badge tone="accent" dot>Voting</Badge>
            <Badge tone="success" dot>Decided</Badge>
            <Badge tone="warning" dot>Awaiting</Badge>
            <Badge tone="danger" dot>Cancelled</Badge>
            <Badge tone="neutral">Owner</Badge>
            <Badge tone="primary">Admin</Badge>
            <Badge tone="neutral">Member</Badge>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <ChapterChip tag="Ch. 1–3" chapter={1}/>
            <ChapterChip tag="Ch. 4–6" chapter={2}/>
            <ChapterChip tag="Ch. 7–9" chapter={3}/>
            <ChapterChip tag="Ch. 10–12" chapter={4}/>
            <ChapterChip tag="Epilogue" chapter={5}/>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards" subtitle="Subtle elevation, hairline borders, generous padding">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <BookCover title="Sea of Tranquility" author="Mandel" variant="teal" size="sm"/>
                <div>
                  <div className="t-display" style={{ fontSize: 17, fontWeight: 600 }}>Currently reading</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>4 of 7 members underway</div>
                </div>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: '52%' }}/></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                <span>median 52%</span><span>page 214 / 412</span>
              </div>
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="t-display" style={{ fontSize: 17, fontWeight: 600 }}>Avatars</div>
                <Badge tone="accent">+3</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <Avatar name="Marisol Ortega" size="lg"/>
                <Avatar name="Jules Brennan" size="lg"/>
                <Avatar name="Theo Park" size="lg"/>
                <Avatar name="Naomi Kell" size="lg"/>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Avatar name="Marisol O" size="sm"/>
                <Avatar name="Jules B" size="sm"/>
                <Avatar name="Theo P" size="sm"/>
                <Avatar name="Naomi K" size="sm"/>
                <Avatar name="Owen S" size="sm"/>
                <Avatar name="Riya P" size="sm"/>
              </div>
            </Card>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Form inputs">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Display name" hint="How others will see you in the club">
                <input className="input" placeholder="e.g. Marisol" value={textVal} onChange={e => setTextVal(e.target.value)}/>
              </Field>
              <Field label="Club code">
                <input className="input t-mono" placeholder="OAKWOOD-7Q" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}/>
              </Field>
              <Field label="Pages read">
                <input className="input" type="number" defaultValue={214}/>
              </Field>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Why this book">
                <textarea className="textarea" placeholder="A short pitch for your fellow readers…"
                  defaultValue="Quiet, slow, and devastating in its third act. Perfect for autumn."/>
              </Field>
              <Field label="Notify me about">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['a', 'New voting rounds'], ['b', 'Meeting confirmations'], ['c', 'Replies to my threads']].map(([k, l]) => (
                    <CheckRow key={k} checked={check[k]} onChange={v => setCheck({...check, [k]: v})} label={l}/>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </Section>

        {/* Empty state */}
        <Section title="Empty state">
          <Card style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 16px',
              borderRadius: 16, background: 'var(--primary-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary-ink)',
            }}>
              <I.book size={28}/>
            </div>
            <div className="t-display" style={{ fontSize: 22, marginBottom: 6 }}>No nominations yet</div>
            <div style={{ color: 'var(--ink-2)', maxWidth: 360, margin: '0 auto 20px', fontSize: 14, lineHeight: 1.5 }}>
              Search the catalog and put forward the first book — your club will take it from here.
            </div>
            <Button variant="primary" icon={<I.plus size={14}/>}>Nominate a book</Button>
          </Card>
        </Section>

        {/* Toasts */}
        <Section title="Toasts" subtitle="Inline feedback after async actions. 150ms ease-in, dismiss after 4s.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
            <div className="toast">
              <div style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <I.check size={12} stroke="white"/>
              </div>
              <div style={{ flex: 1 }}>Progress saved</div>
              <button style={{ background: 'transparent', border: 0, color: 'oklch(0.78 0.13 75)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}>Undo</button>
            </div>
            <div className="toast" style={{ background: 'oklch(0.32 0.08 25)' }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>!</div>
              <div style={{ flex: 1 }}>Couldn't reach the server. We'll retry.</div>
              <button style={{ background: 'transparent', border: 0, color: 'oklch(0.85 0.04 80)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}>Retry</button>
            </div>
          </div>
        </Section>

        <div style={{ height: 40 }}/>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
        <h3 className="t-display" style={{ fontSize: 22, margin: 0, fontWeight: 600 }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function TypeRow({ label, style, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 24, alignItems: 'baseline' }}>
      <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{label}</span>
      <div style={style}>{children}</div>
    </div>
  );
}

function Swatch({ name, value, mono, big }) {
  return (
    <div style={{ gridColumn: big ? 'span 2' : undefined }}>
      <div style={{ height: big ? 76 : 56, background: value, borderRadius: 8, border: '1px solid var(--line)' }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11 }}>
        <span style={{ fontWeight: 500 }}>{name}</span>
        <span className="t-mono" style={{ color: 'var(--ink-3)' }}>{mono}</span>
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5,
        border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--line-strong)'}`,
        background: checked ? 'var(--primary)' : 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', flexShrink: 0,
      }} onClick={() => onChange(!checked)}>
        {checked && <I.check size={12} sw={3}/>}
      </span>
      <span>{label}</span>
    </label>
  );
}

window.DesignSystemArtboard = DesignSystemArtboard;
