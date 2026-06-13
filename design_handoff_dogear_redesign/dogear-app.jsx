// dogear-app.jsx — shell: tabs, toast, tweaks, state
const { useState, useEffect, useRef, useMemo } = React;

const DG_ACCENTS = {
  '#C75B39': { deep: '#A84A2C', tint: '#F4DFD4' },
  '#B8502E': { deep: '#984023', tint: '#F2DBCF' },
  '#D96B3B': { deep: '#B8552B', tint: '#F6E2D3' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C75B39",
  "headlineFont": "Nunito",
  "motion": "full",
  "adminView": false,
  "votePhase": "voting",
  "mode": "app"
}/*EDITMODE-END*/;

/* ---------- tab bar ---------- */
const DG_TABS = [
  { id: 'nook', label: 'Nook' },
  { id: 'voting', label: 'Voting', live: true },
  { id: 'meetings', label: 'Meetings' },
  { id: 'notes', label: 'Notes', unread: 3 },
  { id: 'progress', label: 'Progress' },
];

function TabIcon({ id, active }) {
  const c = active ? 'var(--terracotta)' : 'var(--ink-faint)';
  const s = { width: 22, height: 22 };
  switch (id) {
    case 'nook': // a closed book, spine left
      return <svg {...s} viewBox="0 0 22 22"><rect x="4" y="3" width="14" height="16" rx="2.5" fill="none" stroke={c} strokeWidth="2" /><line x1="8" y1="3.5" x2="8" y2="18.5" stroke={c} strokeWidth="2" /></svg>;
    case 'voting': // check in circle
      return <svg {...s} viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="none" stroke={c} strokeWidth="2" /><path d="M7.5 11.2l2.4 2.4 4.6-4.8" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'meetings': // calendar
      return <svg {...s} viewBox="0 0 22 22"><rect x="3.5" y="5" width="15" height="13" rx="2.5" fill="none" stroke={c} strokeWidth="2" /><line x1="3.5" y1="9.5" x2="18.5" y2="9.5" stroke={c} strokeWidth="2" /><line x1="7.5" y1="3" x2="7.5" y2="6.5" stroke={c} strokeWidth="2" strokeLinecap="round" /><line x1="14.5" y1="3" x2="14.5" y2="6.5" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg>;
    case 'notes': // speech bubble
      return <svg {...s} viewBox="0 0 22 22"><path d="M4 5.5h14a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H10l-4 3.5v-3.5H4A1.5 1.5 0 012.5 14V7A1.5 1.5 0 014 5.5z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>;
    case 'progress': // bookmark ribbon
      return <svg {...s} viewBox="0 0 22 22"><path d="M6 3.5h10v15l-5-3.5-5 3.5v-15z" fill={active ? c : 'none'} stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>;
    default: return null;
  }
}

function TabBar({ tab, setTab }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--paper-card)', borderTop: '1px solid var(--paper-edge)',
      padding: '8px 6px 26px', position: 'relative', zIndex: 30,
      boxShadow: '0 -4px 18px rgba(96,64,32,.06)',
    }}>
      {DG_TABS.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '5px 0', minHeight: 48, position: 'relative',
          }}>
            <div style={{ position: 'relative' }}>
              <TabIcon id={t.id} active={active} />
              {t.live && (
                <span style={{
                  position: 'absolute', top: -5, right: -16, background: 'var(--terracotta)', color: '#FFF6EC',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 7.5, letterSpacing: '.08em',
                  borderRadius: 999, padding: '2px 5px',
                }}>LIVE</span>
              )}
              {t.unread && (
                <span style={{
                  position: 'absolute', top: -4, right: -9, background: 'var(--amber)', color: '#4A3413',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 9.5,
                  borderRadius: 999, minWidth: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{t.unread}</span>
              )}
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: active ? 800 : 700, fontSize: 10,
              color: active ? 'var(--terracotta)' : 'var(--ink-faint)',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- toast ---------- */
function DgToast({ toast, onUndo }) {
  if (!toast) return null;
  return (
    <div key={toast.id} style={{
      position: 'absolute', left: 16, right: 16, bottom: 110, zIndex: 70,
      background: 'var(--ink)', color: 'var(--paper)', borderRadius: 16, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-lift)',
      animation: 'dg-toast-in calc(.3s * var(--dur)) var(--spring) both',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, flex: 1 }}>{toast.msg}</span>
      {toast.undo && (
        <button onClick={onUndo} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5, color: 'var(--amber)',
          padding: '4px 6px',
        }}>Undo</button>
      )}
    </div>
  );
}

/* ---------- the app ---------- */
function DogearApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('progress');
  const [data, setData] = useState(() => JSON.parse(JSON.stringify(window.DG_DATA)));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [earTrigger, setEarTrigger] = useState(0);
  const [toast, setToast] = useState(null);
  const undoRef = useRef(null);
  const toastTimer = useRef(null);

  const accent = DG_ACCENTS[t.accent] ? t.accent : '#C75B39';
  const acc = DG_ACCENTS[accent];

  const showToast = (msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const recompute = (members) => {
    const reading = members.filter(m => m.status === 'reading').map(m => m.pct).sort((a, b) => a - b);
    return reading.length ? reading[Math.floor(reading.length / 2)] : 0;
  };

  const saveProgress = ({ status, page, chapter, pct }) => {
    undoRef.current = JSON.parse(JSON.stringify(data));
    const next = JSON.parse(JSON.stringify(data));
    const me = next.progress.find(m => m.you);
    Object.assign(me, { status: status, page, chapter, pct, updated: 'just now' });
    next.progress.sort((a, b) => b.pct - a.pct);
    next.median = recompute(next.progress);
    setData(next);
    setSheetOpen(false);
    setEarTrigger(e => e + 1);
    showToast(`Progress saved · page ${page}`, true);
  };

  const undo = () => {
    if (undoRef.current) { setData(undoRef.current); undoRef.current = null; }
    setToast(null);
    showToast('Restored your last bookmark', false);
  };

  const me = data.progress.find(m => m.you);

  const screens = {
    nook: <DashboardScreen data={data} admin={t.adminView} earTrigger={earTrigger}
      onGoVote={() => setTab('voting')} onGoProgress={() => setTab('progress')} />,
    progress: <ProgressScreen data={data} earTrigger={earTrigger} onOpenUpdate={() => setSheetOpen(true)} />,
    voting: <VotingScreen data={data} admin={t.adminView} phase={t.votePhase} toast={showToast} />,
    meetings: <MeetingsScreen data={data} admin={t.adminView} toast={showToast} />,
    notes: <NotesScreen data={data} me={me} toast={showToast} />,
  };

  return (
    <div data-motion={t.motion} style={{
      '--terracotta': accent, '--terracotta-deep': acc.deep, '--terracotta-tint': acc.tint,
      '--font-display': `'${t.headlineFont}', system-ui, sans-serif`,
      height: '100%', position: 'relative', background: 'var(--paper)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* scrollable screen area; top padding clears the status bar */}
      {t.mode === 'entry' ? (
        <EntryFlow onEnterApp={() => { setTweak('mode', 'app'); setTab('nook'); }} />
      ) : (
        <React.Fragment>
          <div className="dg-screen-scroll" data-screen-label={tab} style={{ flex: 1, overflowY: 'auto', paddingTop: 62 }}>
            {screens[tab]}
          </div>
          <TabBar tab={tab} setTab={setTab} />
        </React.Fragment>
      )}
      <DgToast toast={toast} onUndo={undo} />
      <UpdateSheet open={sheetOpen} me={me} pages={data.book.pages}
        onClose={() => setSheetOpen(false)} onSave={saveProgress} />

      <TweaksPanel>
        <TweakSection label="Color & type" />
        <TweakColor label="Terracotta" value={accent} options={Object.keys(DG_ACCENTS)}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSelect label="Headline font" value={t.headlineFont} options={['Nunito', 'Baloo 2', 'Fredoka']}
          onChange={(v) => setTweak('headlineFont', v)} />
        <TweakSection label="Feel" />
        <TweakRadio label="Motion" value={t.motion} options={['full', 'subtle', 'off']}
          onChange={(v) => setTweak('motion', v)} />
        <TweakToggle label="Admin view" value={t.adminView}
          onChange={(v) => setTweak('adminView', v)} />
        <TweakSection label="States" />
        <TweakRadio label="Surface" value={t.mode} options={['app', 'entry']}
          onChange={(v) => setTweak('mode', v)} />
        <TweakRadio label="Vote phase" value={t.votePhase} options={['nominating', 'voting', 'decided']}
          onChange={(v) => setTweak('votePhase', v)} />
      </TweaksPanel>
    </div>
  );
}

window.DogearApp = DogearApp;
