// dogear-notes.jsx — Discussions ("Margin notes"): spoiler filter, list, detail, compose
const { useState, useMemo } = React;

/* ---------- spoiler filter bar ---------- */
function SpoilerBar({ myChapter, hiddenCount, showAll, setShowAll }) {
  return (
    <div className="dg-card" style={{ padding: '12px 14px', marginBottom: 14, background: 'var(--terracotta-tint)', border: '1px solid rgba(199,91,57,.14)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>🔖</span>
        <span className="dg-display" style={{ fontSize: 13.5, color: 'var(--terracotta-deep)', flex: 1 }}>
          You&rsquo;re on chapter {myChapter} — later notes stay tucked away
        </span>
      </div>
      {hiddenCount > 0 && !showAll && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span className="dg-serif" style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink-soft)' }}>
            {hiddenCount} note{hiddenCount === 1 ? '' : 's'} waiting past your bookmark
          </span>
          <button onClick={() => setShowAll(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5, color: 'var(--terracotta)', textDecoration: 'underline',
          }}>Show all anyway</button>
        </div>
      )}
      {showAll && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowAll(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5, color: 'var(--terracotta)', textDecoration: 'underline',
          }}>Hide spoilers again</button>
        </div>
      )}
    </div>
  );
}

/* ---------- a margin note card ---------- */
function NoteCard({ t, i, onOpen, spoiler }) {
  const rot = t.pinned ? 0 : (i % 2 === 0 ? -0.6 : 0.5);
  return (
    <div onClick={onOpen} className="dg-card" style={{
      padding: '13px 15px', cursor: 'pointer', transform: `rotate(${rot}deg)`,
      background: t.pinned ? 'var(--amber-tint)' : 'var(--paper-card)',
      border: t.pinned ? '1px solid rgba(185,123,31,.22)' : '1px solid rgba(96,64,32,.05)',
      opacity: spoiler ? .65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DgChapterChip n={t.ch} />
        {t.pinned && <DgBadge tone="accent">Pinned</DgBadge>}
        {spoiler && <DgBadge tone="neutral">Past your bookmark</DgBadge>}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--terracotta)', background: 'var(--terracotta-tint)', borderRadius: 999, padding: '3px 9px' }}>{t.replies}</span>
      </div>
      <div className="dg-display" style={{ fontSize: 15.5, margin: '8px 0 3px', lineHeight: 1.2 }}>{t.title}</div>
      <p className="dg-serif" style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--ink-soft)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {spoiler ? 'Tucked away until you get there.' : t.text}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
        <DgAvatar name={t.author} size="xs" />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11.5, color: 'var(--ink-faint)' }}>{t.author} · {t.when} ago</span>
      </div>
    </div>
  );
}

/* ---------- thread detail ---------- */
function ThreadDetail({ t, onBack }) {
  const [reply, setReply] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '4px 16px 90px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', minHeight: 44,
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--terracotta)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>← All notes</button>
        <div className="dg-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DgChapterChip n={t.ch} />
            {t.pinned && <DgBadge tone="accent">Pinned</DgBadge>}
          </div>
          <h2 className="dg-display" style={{ fontSize: 20, margin: '10px 0 6px' }}>{t.title}</h2>
          <p className="dg-serif" style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'var(--ink)' }}>{t.text}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12 }}>
            <DgAvatar name={t.author} size="sm" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: 'var(--ink-faint)' }}>{t.author} · {t.when} ago</span>
          </div>
        </div>

        <DgSectionTitle>{t.replies} replies</DgSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(t.comments || []).map((c, i) => (
            <div key={i} className="dg-card" style={{
              padding: '12px 14px',
              marginLeft: c.reply ? 22 : 0,
              borderLeft: c.reply ? '3px solid var(--terracotta-tint)' : '1px solid rgba(96,64,32,.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DgAvatar name={c.author} size="xs" />
                <span className="dg-display" style={{ fontSize: 13 }}>{c.author}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, color: 'var(--ink-faint)' }}>· {c.when} ago</span>
              </div>
              <p className="dg-serif" style={{ margin: '7px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink)' }}>{c.text}</p>
            </div>
          ))}
          {!t.comments && (
            <p className="dg-serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-faint)', textAlign: 'center', margin: '8px 0' }}>
              Replies live in the built app — this design shows the panther thread in full.
            </p>
          )}
        </div>
      </div>
      {/* sticky composer */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 84, padding: '10px 16px 8px',
        background: 'linear-gradient(180deg, transparent, var(--paper) 30%)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="dg-input" placeholder="Add a margin note…" value={reply} onChange={(e) => setReply(e.target.value)}
            style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }} />
          <DgButton variant="primary" size="md" disabled={!reply.trim()}>Post</DgButton>
        </div>
        <p style={{ margin: '6px 2px 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10.5, color: 'var(--ink-faint)', textAlign: 'center' }}>
          Markdown supported · be kind to readers behind you
        </p>
      </div>
    </div>
  );
}

/* ---------- compose sheet with spoiler mismatch detection ---------- */
function ComposeSheet({ open, myChapter, onClose, onPost }) {
  const [body, setBody] = useState('');
  const [tag, setTag] = useState(myChapter || 1);
  if (!open) return null;
  const m = body.match(/chapter\s+(\d+)/i);
  const mentioned = m ? parseInt(m[1], 10) : null;
  const mismatch = mentioned !== null && mentioned > tag;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(61,47,36,.42)', animation: 'dg-fade-in calc(.2s * var(--dur)) ease both' }}></div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--paper)', borderRadius: '26px 26px 0 0', boxShadow: 'var(--shadow-sheet)',
        padding: '14px 20px 24px', animation: 'dg-slide-up calc(.32s * var(--dur)) var(--ease-out) both',
      }}>
        <div style={{ width: 40, height: 4.5, borderRadius: 999, background: 'var(--paper-edge)', margin: '0 auto 14px' }}></div>
        <h3 className="dg-display" style={{ fontSize: 21, margin: '0 0 12px' }}>Leave a margin note</h3>
        <textarea className="dg-input" rows="4" placeholder="What did the book do to you?"
          value={body} onChange={(e) => setBody(e.target.value)} autoFocus
          style={{ resize: 'none', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 15.5 }}></textarea>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <label className="dg-display" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Chapter tag</label>
          <input className="dg-input" type="number" min="1" value={tag}
            onChange={(e) => setTag(parseInt(e.target.value || '1', 10))}
            style={{ width: 70, fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
          <DgChapterChip n={tag} />
        </div>
        <div style={{
          marginTop: 12, borderRadius: 12, padding: '10px 12px',
          background: mismatch ? 'var(--danger-tint)' : 'var(--success-tint)',
        }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, lineHeight: 1.45, color: mismatch ? 'var(--danger)' : 'var(--success)' }}>
            {mismatch
              ? `Your note mentions chapter ${mentioned} but is tagged ch. ${tag} — readers behind you would see it. Raise the tag or soften the note.`
              : `Spoiler-safe by default — only members past chapter ${tag} will see this.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <DgButton variant="ghost" size="md" onClick={onClose}>Cancel</DgButton>
          <div style={{ flex: 1 }}>
            <DgButton variant={mismatch ? 'danger' : 'primary'} size="md" full disabled={!body.trim() || mismatch}
              onClick={() => { onPost(); setBody(''); }}>
              {mismatch ? 'Resolve spoiler warning' : 'Post note'}
            </DgButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- the screen ---------- */
function NotesScreen({ data, me, toast }) {
  const [sort, setSort] = useState('recent');
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [compose, setCompose] = useState(false);
  const myChapter = me.chapter || 0;

  const threads = useMemo(() => {
    let t = [...data.allThreads];
    if (sort === 'comments') t.sort((a, b) => b.replies - a.replies);
    const pinned = t.filter(x => x.pinned);
    return [...pinned, ...t.filter(x => !x.pinned)];
  }, [sort, data]);

  const hidden = threads.filter(t => t.ch > myChapter);
  const visible = showAll ? threads : threads.filter(t => t.ch <= myChapter);

  const open = threads.find(t => t.id === openId);
  if (open) return <ThreadDetail t={open} onBack={() => setOpenId(null)} />;

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 2px 14px' }}>
        <div>
          <h1 className="dg-display" style={{ fontSize: 26, margin: 0, color: 'var(--terracotta)' }}>Margin notes</h1>
          <p className="dg-serif" style={{ margin: '2px 0 0', fontSize: 14.5, fontStyle: 'italic', color: 'var(--ink-soft)' }}>{data.book.title}</p>
        </div>
        <DgButton variant="primary" size="sm" onClick={() => setCompose(true)}>+ New note</DgButton>
      </div>

      <SpoilerBar myChapter={myChapter} hiddenCount={hidden.length} showAll={showAll} setShowAll={setShowAll} />

      {/* sort toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['recent', 'Recent'], ['comments', 'Most replies']].map(([k, label]) => (
          <button key={k} onClick={() => setSort(k)} style={{
            border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 14px', minHeight: 32,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5,
            background: sort === k ? 'var(--ink)' : 'var(--paper-card)',
            color: sort === k ? 'var(--paper)' : 'var(--ink-soft)',
            boxShadow: 'var(--shadow-card)',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((t, i) => (
          <NoteCard key={t.id} t={t} i={i} spoiler={showAll && t.ch > myChapter} onOpen={() => setOpenId(t.id)} />
        ))}
      </div>

      <ComposeSheet open={compose} myChapter={myChapter} onClose={() => setCompose(false)}
        onPost={() => { setCompose(false); toast('Note posted · tagged ch. ' + myChapter, false); }} />
    </div>
  );
}

Object.assign(window, { NotesScreen });
