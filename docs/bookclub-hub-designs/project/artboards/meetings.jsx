/* global React, Avatar, Button, Badge, BookCover, Card, Field, Tabs, I */
const { useState: uS_m } = React;

function MeetingsArtboard() {
  const [view, setView] = uS_m('list');
  const [filter, setFilter] = uS_m('all');

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
          Oakwood Library Society <span style={{ margin: '0 6px' }}>›</span> Meetings
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="t-display" style={{ fontSize: 30, margin: 0, letterSpacing: '-0.02em' }}>Meetings</h1>
          <Tabs value={view} onChange={setView} options={[
            { value: 'list', label: 'List' },
            { value: 'respond', label: 'Respond' },
            { value: 'admin', label: 'Confirm (admin)' },
            { value: 'create', label: 'New' },
          ]}/>
        </div>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>
        {view === 'list' && <MeetingList filter={filter} setFilter={setFilter}/>}
        {view === 'respond' && <RespondView/>}
        {view === 'admin' && <AdminConfirmView/>}
        {view === 'create' && <CreateMeetingForm/>}
      </div>
    </div>
  );
}

/* ---------- View 1: List ---------- */
function MeetingList({ filter, setFilter }) {
  const meetings = [
    { id: '1', title: 'Sea of Tranquility · final discussion', book: 'Sea of Tranquility', status: 'confirmed', when: 'Thu Apr 18, 7:00 PM', loc: 'Café Lemnos · back room', going: ['Marisol O', 'Jules B', 'Theo P', 'Naomi K', 'Riya P'], maybe: 2 },
    { id: '2', title: 'Mid-book check-in', book: 'North Woods', status: 'proposed', when: null, slots: 4, responded: 5, total: 7 },
    { id: '3', title: 'Kickoff potluck', book: 'North Woods', status: 'proposed', when: null, slots: 3, responded: 2, total: 7 },
    { id: '4', title: 'Trust opener', book: 'Trust', status: 'past', when: 'Mar 28, 7:00 PM', loc: 'Library room B', going: ['Marisol O', 'Theo P', 'Owen S', 'Riya P'], maybe: 0 },
    { id: '5', title: 'Trust closing', book: 'Trust', status: 'past', when: 'Apr 4, 7:00 PM', loc: 'Café Lemnos', going: ['Marisol O', 'Jules B', 'Theo P', 'Naomi K'], maybe: 1 },
  ];
  const filtered = filter === 'all' ? meetings : meetings.filter(m => m.status === filter);
  const counts = {
    all: meetings.length,
    proposed: meetings.filter(m => m.status === 'proposed').length,
    confirmed: meetings.filter(m => m.status === 'confirmed').length,
    past: meetings.filter(m => m.status === 'past').length,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Tabs value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'proposed', label: 'Proposed', count: counts.proposed },
          { value: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { value: 'past', label: 'Past', count: counts.past },
        ]}/>
        <Button variant="primary" size="md" icon={<I.plus size={14}/>}>Propose meeting</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(m => (
          <Card key={m.id} style={{ padding: 18 }}>
            {m.status === 'confirmed' && <ConfirmedRow m={m}/>}
            {m.status === 'proposed' && <ProposedRow m={m}/>}
            {m.status === 'past' && <PastRow m={m}/>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ConfirmedRow({ m }) {
  const [d, time] = m.when.split(', ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18, alignItems: 'center' }}>
      <div style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--accent-soft)', borderRadius: 10, minWidth: 64 }}>
        <div style={{ fontSize: 10, color: 'var(--accent-ink)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.split(' ')[0]}</div>
        <div className="t-display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent-ink)', lineHeight: 1 }}>{d.split(' ')[2]}</div>
        <div style={{ fontSize: 10, color: 'var(--accent-ink)' }}>{d.split(' ')[1]}</div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Badge tone="success" dot>Confirmed</Badge>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {m.book}</span>
        </div>
        <div className="t-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{m.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--ink-2)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.clock size={13}/> {time}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.pin2 size={13}/> {m.loc}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          {m.going.map((n, i) => (
            <div key={n} style={{ marginLeft: i ? -6 : 0, border: '2px solid var(--bg)', borderRadius: 999 }}>
              <Avatar name={n} size="sm"/>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.going.length} going · {m.maybe} maybe</div>
      </div>
    </div>
  );
}

function ProposedRow({ m }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18, alignItems: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(0.5 0.10 70)' }}>
        <I.calendar size={24}/>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Badge tone="warning" dot>Awaiting responses</Badge>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {m.book}</span>
        </div>
        <div className="t-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{m.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
          <span>{m.slots} time slots proposed</span>
          <span style={{ color: 'var(--ink-3)' }}>·</span>
          <span><strong style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{m.responded}</strong> of {m.total} responded</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 320 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(m.responded / m.total) * 100}%`, height: '100%',
              background: m.responded === m.total ? 'var(--success)' : 'oklch(0.65 0.10 70)',
              borderRadius: 999, transition: 'width 300ms ease',
            }}/>
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
            {Math.round((m.responded / m.total) * 100)}%
          </span>
        </div>
      </div>
      <Button variant="primary" size="sm" iconRight={<I.chev size={13}/>}>Respond</Button>
    </div>
  );
}

function PastRow({ m }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 18, alignItems: 'center', opacity: 0.7 }}>
      <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
        <I.calendar size={20}/>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Badge tone="neutral">Past</Badge>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {m.book} · {m.when}</span>
        </div>
        <div className="t-display" style={{ fontSize: 16, fontWeight: 600 }}>{m.title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{m.loc} · {m.going.length} attended</div>
      </div>
      <Button variant="ghost" size="sm">Notes</Button>
    </div>
  );
}

/* ---------- View 2: Respond ---------- */
function RespondView() {
  const slots = [
    { id: 1, label: 'Thu, Apr 18 · 7:00 PM', sub: '60 min', avail: 4, maybe: 1, no: 0 },
    { id: 2, label: 'Fri, Apr 19 · 6:30 PM', sub: '60 min', avail: 2, maybe: 2, no: 1 },
    { id: 3, label: 'Sat, Apr 20 · 5:00 PM', sub: '90 min', avail: 3, maybe: 1, no: 1 },
    { id: 4, label: 'Sun, Apr 21 · 4:00 PM', sub: '60 min', avail: 1, maybe: 3, no: 2 },
  ];
  const [resp, setResp] = uS_m({ 1: 'available', 2: 'maybe' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 24 }}>
      <div style={{ minWidth: 0 }}>
        <Card style={{ padding: 24, marginBottom: 16 }}>
          <Badge tone="warning" dot>Proposed by Marisol</Badge>
          <h2 className="t-display" style={{ fontSize: 24, fontWeight: 600, margin: '10px 0 6px' }}>Mid-book check-in</h2>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 12 }}>
            Linked book: <strong>North Woods</strong>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            Quick get-together to share first impressions before we&rsquo;re too deep into Part Two. Bring snacks, theories, and your most underlined passage.
          </p>
        </Card>

        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="t-display" style={{ fontSize: 18, fontWeight: 600 }}>Mark your availability</div>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>You can change responses any time</span>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {slots.map((s, i) => (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              gap: 18, alignItems: 'center', padding: '14px 18px',
              borderTop: i ? '1px solid var(--line)' : 0,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s.sub}</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink-3)' }}>
                <span style={{ color: 'var(--success)' }}>✓ {s.avail}</span>
                <span style={{ color: 'oklch(0.5 0.10 70)' }}>? {s.maybe}</span>
                <span style={{ color: 'var(--ink-3)' }}>✗ {s.no}</span>
              </div>
              <RadioGroup value={resp[s.id]} onChange={v => setResp({ ...resp, [s.id]: v })}/>
            </div>
          ))}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
          <Button variant="ghost" size="md">Reset</Button>
          <Button variant="primary" size="md">Save responses</Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88, alignSelf: 'start' }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>Members responded</div>
          <div className="t-display" style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>5<span style={{ color: 'var(--ink-3)', fontSize: 18 }}> / 7</span></div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i < 5 ? 'var(--primary)' : 'var(--bg-sunken)' }}/>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0 12px' }}/>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>Still waiting on</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar name="Owen S" size="sm"/><Avatar name="Linnea S" size="sm"/>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Owen, Linnea</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RadioGroup({ value, onChange }) {
  const opts = [
    { v: 'available', label: '✓', tip: 'Available', color: 'var(--success)', bg: 'var(--success-soft)' },
    { v: 'maybe', label: '?', tip: 'Maybe', color: 'oklch(0.5 0.10 70)', bg: 'var(--warning-soft)' },
    { v: 'unavailable', label: '✗', tip: "Can't", color: 'var(--danger)', bg: 'var(--danger-soft)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--line)' }}>
      {opts.map(o => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} title={o.tip} style={{
            width: 36, height: 30, borderRadius: 6, border: 0, cursor: 'pointer',
            background: on ? o.bg : 'transparent',
            color: on ? o.color : 'var(--ink-3)',
            fontWeight: 700, fontSize: 14,
            boxShadow: on ? 'inset 0 0 0 1px ' + o.color : 'none',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

/* ---------- View 3: Admin confirm ---------- */
function AdminConfirmView() {
  const slots = [
    { id: 1, label: 'Thu, Apr 18 · 7:00 PM', avail: 5, maybe: 1, no: 0, total: 7 },
    { id: 2, label: 'Fri, Apr 19 · 6:30 PM', avail: 2, maybe: 2, no: 1, total: 7 },
    { id: 3, label: 'Sat, Apr 20 · 5:00 PM', avail: 4, maybe: 1, no: 1, total: 7 },
    { id: 4, label: 'Sun, Apr 21 · 4:00 PM', avail: 1, maybe: 3, no: 2, total: 7 },
  ];
  const top = Math.max(...slots.map(s => s.avail));
  const [confirmed, setConfirmed] = uS_m(null);
  const [loc, setLoc] = uS_m('Café Lemnos · back room');

  return (
    <div>
      <Card style={{ padding: 20, marginBottom: 16, background: 'var(--primary-soft)', borderColor: 'oklch(0.85 0.04 195)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', color: 'var(--primary-ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.spark size={16}/>
            <div style={{ fontSize: 13 }}>
              <strong>Thu, Apr 18 · 7:00 PM</strong> works for the most members ({top} available). Confirm to notify everyone.
            </div>
          </div>
          {/* Overall responded indicator — same vocab as respond view sidebar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span className="t-display" style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              5<span style={{ color: 'var(--primary)', opacity: 0.6, fontSize: 14 }}> / 7</span>
            </span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[...Array(7)].map((_, i) => (
                <div key={i} style={{ width: 14, height: 6, borderRadius: 999, background: i < 5 ? 'var(--primary)' : 'oklch(0.85 0.03 195)' }}/>
              ))}
            </div>
            <span style={{ fontSize: 11, opacity: 0.75 }}>responded</span>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 24 }}>
        <Card style={{ padding: 0, overflow: 'hidden', minWidth: 0 }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18,
            padding: '12px 20px',
            background: 'var(--bg-sunken)', borderBottom: '1px solid var(--line)',
            fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>Time slot</div>
            <div style={{ flex: '0 1 220px', minWidth: 140 }}>Availability</div>
            <div style={{ flexShrink: 0, minWidth: 120 }}></div>
          </div>
          {slots.map(s => {
            const isTop = s.avail === top;
            const pickHere = confirmed === s.id;
            return (
              <div key={s.id} style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18,
                padding: '14px 20px',
                borderTop: '1px solid var(--line)',
                background: pickHere ? 'var(--success-soft)' : (isTop ? 'oklch(0.97 0.025 155)' : 'transparent'),
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
                    {isTop && <Badge tone="success">Most available</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {s.avail} available · {s.maybe} maybe · {s.no} can&rsquo;t
                  </div>
                </div>
                <div style={{ flex: '0 1 220px', minWidth: 140 }}>
                  <Heatmap avail={s.avail} maybe={s.maybe} no={s.no} total={s.total}/>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <Button variant={pickHere ? 'secondary' : (isTop ? 'accent' : 'secondary')} size="sm" onClick={() => setConfirmed(s.id)}>
                    {pickHere ? <><I.check size={13}/> Selected</> : 'Confirm this slot'}
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <div className="t-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Confirm details</div>
            <Field label="Location">
              <input className="input" value={loc} onChange={e => setLoc(e.target.value)} placeholder="e.g. Café Lemnos"/>
            </Field>
            <div style={{ marginTop: 14 }}>
              <Button variant="primary" size="md" style={{ width: '100%' }} disabled={!confirmed}>
                {confirmed ? 'Confirm & notify members' : 'Pick a slot first'}
              </Button>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center' }}>All 7 members will receive an email.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Heatmap({ avail, maybe, no, total }) {
  const intensity = avail / total;
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[...Array(total)].map((_, i) => {
        let bg, label;
        if (i < avail) { bg = `oklch(${0.85 - intensity * 0.25} 0.10 155)`; label = 'available'; }
        else if (i < avail + maybe) { bg = 'oklch(0.86 0.07 70)'; label = 'maybe'; }
        else { bg = 'var(--bg-sunken)'; label = 'no'; }
        return <div key={i} title={label} style={{ flex: 1, height: 22, borderRadius: 3, background: bg, minWidth: 18 }}/>;
      })}
    </div>
  );
}

/* ---------- View 4: Create form ---------- */
function CreateMeetingForm() {
  const [slots, setSlots] = uS_m([
    { date: '2026-04-18', time: '19:00', dur: 60 },
    { date: '2026-04-20', time: '17:00', dur: 90 },
  ]);
  const addSlot = () => setSlots([...slots, { date: '', time: '', dur: 60 }]);
  const removeSlot = (i) => setSlots(slots.filter((_, j) => j !== i));
  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      <Card style={{ padding: 28 }}>
        <h2 className="t-display" style={{ fontSize: 22, margin: '0 0 4px', fontWeight: 600 }}>Propose a new meeting</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 24 }}>Members will pick which slots they can make. You confirm one when you have enough responses.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Title">
            <input className="input" defaultValue="Mid-book check-in"/>
          </Field>
          <Field label="Linked book" hint="Optional — limit to current selections">
            <select className="select" defaultValue="north">
              <option value="">— None —</option>
              <option value="north">North Woods · Daniel Mason</option>
              <option value="sea">Sea of Tranquility · Mandel</option>
            </select>
          </Field>
          <Field label="Description">
            <textarea className="textarea" defaultValue="Quick get-together to share first impressions before we're too deep into Part Two."/>
          </Field>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <label className="label" style={{ marginBottom: 0 }}>Time slots</label>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{slots.length} of 5 max</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slots.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 100px auto', gap: 8, alignItems: 'center' }}>
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>0{i + 1}</span>
                  <input className="input" type="date" defaultValue={s.date}/>
                  <input className="input" type="time" defaultValue={s.time}/>
                  <select className="select" defaultValue={s.dur}>
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                  </select>
                  <button onClick={() => removeSlot(i)} style={{ padding: 8, background: 'transparent', border: 0, color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 6 }}>
                    <I.x size={14}/>
                  </button>
                </div>
              ))}
              {slots.length < 5 && (
                <button onClick={addSlot} style={{
                  padding: '10px', border: '1.5px dashed var(--line-strong)', background: 'transparent',
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <I.plus size={14}/> Add another slot
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="md">Cancel</Button>
          <Button variant="primary" size="md">Send to members</Button>
        </div>
      </Card>
    </div>
  );
}

window.MeetingsArtboard = MeetingsArtboard;
