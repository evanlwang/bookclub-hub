// dogear-meetings.jsx — Meetings ("RSVP postcards"): list, respond, admin confirm
const { useState } = React;

/* ---------- date stamp block ---------- */
function DateStamp({ dow, day, mon, muted }) {
  const c = muted ? 'var(--ink-faint)' : 'var(--terracotta-deep)';
  const b = muted ? 'var(--ink-faint)' : 'var(--terracotta)';
  return (
    <div style={{
      width: 56, textAlign: 'center', border: `2px solid ${b}`, borderRadius: 12,
      padding: '6px 0 7px', color: c, transform: 'rotate(-2deg)', flexShrink: 0, opacity: muted ? .6 : 1,
    }}>
      <div className="dg-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em' }}>{dow}</div>
      <div className="dg-display" style={{ fontSize: 22, lineHeight: 1 }}>{day}</div>
      <div className="dg-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em' }}>{mon}</div>
    </div>
  );
}

/* ---------- list rows ---------- */
function ProposedRow({ m, onRespond }) {
  const pctDone = (m.responded / m.of) * 100;
  return (
    <div className="dg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="dg-display" style={{ fontSize: 16, flex: 1 }}>{m.title}</span>
        <DgBadge tone="primary" dot>Awaiting responses</DgBadge>
      </div>
      <p className="dg-serif" style={{ margin: '6px 0 0', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-soft)' }}>{m.slots.length} time slots proposed</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="dg-bar" style={{ height: 8 }}>
            <div className="dg-bar__fill" style={{ width: `${pctDone}%`, background: pctDone === 100 ? 'var(--success)' : 'var(--amber)' }}></div>
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--ink-faint)' }}>{m.responded} of {m.of} responded</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <DgButton variant="primary" size="sm" full onClick={onRespond}>Respond</DgButton>
      </div>
    </div>
  );
}

function ConfirmedRow({ m, past }) {
  return (
    <div className="dg-card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', opacity: past ? .75 : 1, position: 'relative' }}>
      <DateStamp dow={m.dow} day={m.day} mon={m.mon} muted={past} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="dg-display" style={{ fontSize: 15.5 }}>{m.title}</span>
          {!past && <DgBadge tone="success">Confirmed</DgBadge>}
        </div>
        <div className="dg-serif" style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 2 }}>{m.time} · {m.place}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <DgAvatarStack names={m.attendees} max={4} size="xs" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--ink-faint)' }}>{m.going} going{m.maybe ? ` · ${m.maybe} maybe` : ''}</span>
        </div>
      </div>
      {past && (
        <div className="dg-mono" style={{
          position: 'absolute', top: 10, right: 12, transform: 'rotate(6deg)',
          border: '2px solid var(--ink-faint)', color: 'var(--ink-faint)', borderRadius: 5,
          fontSize: 9.5, fontWeight: 700, padding: '2px 7px', letterSpacing: '.14em', opacity: .8,
        }}>PAST</div>
      )}
    </div>
  );
}

/* ---------- respond view: the RSVP postcard ---------- */
const RSVP_STATES = [
  { k: 'yes', label: 'Available', mark: '✓', color: 'var(--success)', tint: 'var(--success-tint)' },
  { k: 'maybe', label: 'Maybe', mark: '?', color: 'var(--amber-deep)', tint: 'var(--amber-tint)' },
  { k: 'no', label: 'Can\u2019t', mark: '✗', color: 'var(--danger)', tint: 'var(--danger-tint)' },
];

function SlotCard({ slot, value, onChange }) {
  return (
    <div className="dg-card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="dg-display" style={{ fontSize: 14.5 }}>{slot.label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5, color: 'var(--ink-faint)' }}>
          {slot.tally.yes}✓ · {slot.tally.maybe}? · {slot.tally.no}✗
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {RSVP_STATES.map(s => {
          const active = value === s.k;
          return (
            <button key={s.k} onClick={() => onChange(s.k)} style={{
              flex: 1, cursor: 'pointer', borderRadius: 12, padding: '9px 4px', minHeight: 44,
              border: active ? `2px solid ${s.color}` : '2px dashed var(--paper-edge)',
              background: active ? s.tint : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .15s var(--spring)',
              transform: active ? 'scale(1.03)' : 'scale(1)',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5, border: `2px solid ${active ? s.color : 'var(--ink-faint)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12,
                color: s.color, background: 'var(--paper-card)',
              }}>{active ? s.mark : ''}</span>
              <span className="dg-display" style={{ fontSize: 12, color: active ? s.color : 'var(--ink-soft)' }}>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RespondView({ m, onBack, toast }) {
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState(false);
  const allAnswered = m.slots.every((_, i) => answers[i]);
  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', minHeight: 44,
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--terracotta)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>← Meetings</button>
      <h1 className="dg-display" style={{ fontSize: 23, margin: '0 0 4px', color: 'var(--terracotta)' }}>{m.title}</h1>
      <p className="dg-serif" style={{ margin: '0 0 14px', fontSize: 15, fontStyle: 'italic', color: 'var(--ink-soft)' }}>&ldquo;{m.desc}&rdquo;</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {m.slots.map((s, i) => (
          <SlotCard key={i} slot={s} value={answers[i]}
            onChange={(v) => { setAnswers(a => ({ ...a, [i]: v })); setSaved(false); }} />
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <DgButton variant="primary" size="lg" full disabled={!allAnswered || saved}
          onClick={() => { setSaved(true); toast('Responses mailed back ✓', false); }}>
          {saved ? '✓ Saved' : 'Save responses'}
        </DgButton>
      </div>
      <p style={{ margin: '10px 0 0', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ink-faint)' }}>
        Still waiting on {m.waiting.join(', ')}
      </p>
    </div>
  );
}

/* ---------- admin confirm view: availability heatmap ---------- */
const HEAT_COLORS = { 0: 'var(--paper-edge)', 1: 'var(--danger-tint)', 2: 'var(--amber-tint)', 3: 'var(--success-tint)' };
const HEAT_MARKS = { 0: '', 1: '✗', 2: '?', 3: '✓' };
const HEAT_INK = { 0: 'transparent', 1: 'var(--danger)', 2: 'var(--amber-deep)', 3: 'var(--success)' };

function AdminConfirm({ data, m, toast }) {
  const [confirmed, setConfirmed] = useState(false);
  const best = 0; // slot index with most "available"
  return (
    <div className="dg-card" style={{ marginTop: 16, padding: 14 }}>
      <div className="dg-display" style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>ADMIN · CONFIRM A SLOT</div>
      <div style={{
        borderRadius: 12, padding: '9px 12px', background: 'var(--success-tint)',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: 'var(--success)', marginBottom: 10,
      }}>Thu Jul 9, 7 PM works for the most members</div>
      {/* heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(3, 1fr)', gap: 4, alignItems: 'center' }}>
        <span></span>
        {m.slots.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div className="dg-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: '.06em' }}>{s.label.split(' · ')[0].toUpperCase()}</div>
            {i === best && <DgBadge tone="accent">Most ✓</DgBadge>}
          </div>
        ))}
        {data.heatmap.members.map((name, r) => (
          <React.Fragment key={name}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            {data.heatmap.rows[r].map((v, c) => (
              <div key={c} style={{
                height: 26, borderRadius: 7, background: HEAT_COLORS[v],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12, color: HEAT_INK[v],
              }}>{HEAT_MARKS[v]}</div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <input className="dg-input" placeholder="Location (e.g. Linnea\u2019s place)" style={{ marginTop: 12 }} />
      <div style={{ marginTop: 10 }}>
        <DgButton variant="primary" size="md" full disabled={confirmed}
          onClick={() => { setConfirmed(true); toast('Date stamped — members notified', false); }}>
          {confirmed ? '✓ Stamped' : 'Confirm & notify members'}
        </DgButton>
      </div>
    </div>
  );
}

/* ---------- the screen ---------- */
function MeetingsScreen({ data, admin, toast }) {
  const [filter, setFilter] = useState('all');
  const [responding, setResponding] = useState(null);
  const ms = data.meetings;
  const counts = { all: ms.length, proposed: ms.filter(m => m.kind === 'proposed').length, confirmed: ms.filter(m => m.kind === 'confirmed').length, past: ms.filter(m => m.kind === 'past').length };
  const shown = filter === 'all' ? ms : ms.filter(m => m.kind === filter);
  const proposed = ms.find(m => m.kind === 'proposed');

  if (responding) return <RespondView m={responding} onBack={() => setResponding(null)} toast={toast} />;

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <div style={{ margin: '10px 2px 14px' }}>
        <h1 className="dg-display" style={{ fontSize: 26, margin: 0, color: 'var(--terracotta)' }}>RSVP postcards</h1>
        <p className="dg-serif" style={{ margin: '2px 0 0', fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)' }}>When are we meeting?</p>
      </div>

      <div className="dg-scroll-x" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['all', 'All'], ['proposed', 'Proposed'], ['confirmed', 'Confirmed'], ['past', 'Past']].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 14px', minHeight: 32, flexShrink: 0,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5,
            background: filter === k ? 'var(--ink)' : 'var(--paper-card)',
            color: filter === k ? 'var(--paper)' : 'var(--ink-soft)',
            boxShadow: 'var(--shadow-card)',
          }}>{label} · {counts[k]}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map(m => m.kind === 'proposed'
          ? <ProposedRow key={m.id} m={m} onRespond={() => setResponding(m)} />
          : <ConfirmedRow key={m.id} m={m} past={m.kind === 'past'} />)}
      </div>

      {admin && proposed && <AdminConfirm data={data} m={proposed} toast={toast} />}
    </div>
  );
}

Object.assign(window, { MeetingsScreen });
