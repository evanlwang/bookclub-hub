/* global React, Avatar, Button, Badge, Card, ChapterChip, Field, Tabs, I */
const { useState: uS_d } = React;

function DiscussionsArtboard() {
  const [view, setView] = uS_d('list');
  const [openThread, setOpenThread] = uS_d(null);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
          Oakwood Library Society <span style={{ margin: '0 6px' }}>›</span> North Woods <span style={{ margin: '0 6px' }}>›</span> Discussions
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="t-display" style={{ fontSize: 30, margin: 0, letterSpacing: '-0.02em' }}>
            Discussions <span style={{ color: 'var(--ink-3)', fontSize: 18, fontWeight: 400, fontFamily: 'var(--font-ui)' }}>· North Woods</span>
          </h1>
          <Tabs value={view} onChange={setView} options={[
            { value: 'list', label: 'Thread list' },
            { value: 'detail', label: 'Thread detail' },
            { value: 'compose', label: 'Compose' },
          ]}/>
        </div>
      </div>

      <div style={{ padding: '24px 32px 40px' }}>
        {view === 'list' && <ThreadListView onOpen={() => setView('detail')}/>}
        {view === 'detail' && <ThreadDetailView/>}
        {view === 'compose' && <ComposeThreadView/>}
      </div>
    </div>
  );
}

/* ---------- View 1: Thread list with spoiler filter ---------- */
function ThreadListView({ onOpen }) {
  const [chapter, setChapter] = uS_d(8);
  const [showAll, setShowAll] = uS_d(false);
  const [sort, setSort] = uS_d('recent');

  const allThreads = [
    { id: '1', title: 'Heads up: spoilers for the audiobook prologue', body: 'The audiobook includes a foreword by the author that gives away the framing device...', tag: null, ch: null, author: 'Theo Park', cnt: 2, t: '2 days ago', pinned: true },
    { id: '2', title: 'Vincent\u2019s diary entries reminded me of —', body: 'There\u2019s a slim volume by Penelope Fitzgerald that this section reminded me of, particularly...', tag: 'Ch. 1–3', ch: 2, author: 'Jules Brennan', cnt: 7, t: '1 day ago' },
    { id: '3', title: 'The dinner scene — was that earned?', body: 'I have feelings about the third course. Mostly that it shouldn\u2019t have happened that way.', tag: 'Ch. 5–8', ch: 7, author: 'Marisol Ortega', cnt: 4, t: '4 hours ago' },
    { id: '4', title: 'Anyone else laughing at the apple metaphor?', body: 'I cackled. I genuinely cackled at the part with the orchard and the —', tag: 'Ch. 4', ch: 4, author: 'Naomi Kell', cnt: 3, t: '6 hours ago' },
    { id: '5', title: 'Predictions for Part Three', body: 'I\u2019m calling it now: the painter shows up again. Mark this thread.', tag: 'Ch. 9', ch: 9, author: 'Riya Patel', cnt: 1, t: '20 minutes ago' },
    { id: '6', title: 'A passage I keep going back to', body: '"The yellow house, by then, had grown into the hill." Something about this sentence.', tag: 'Ch. 11', ch: 11, author: 'Theo Park', cnt: 5, t: '1 hour ago' },
  ];

  // Spoiler filter: hide threads tagged with chapter > current, unless showAll
  const visible = showAll ? allThreads : allThreads.filter(t => t.ch == null || t.ch <= chapter);
  const hidden = allThreads.length - visible.length;
  const sorted = [...visible].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === 'comments') return b.cnt - a.cnt;
    return 0;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 24 }}>
      <div style={{ minWidth: 0 }}>
        {/* Spoiler filter bar */}
        <Card style={{
          padding: '14px 18px', marginBottom: 16,
          background: 'oklch(0.97 0.025 195)', borderColor: 'oklch(0.85 0.04 195)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary-ink)' }}>
              <I.filter size={15}/>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Spoiler protection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--primary-ink)' }}>I&rsquo;m on chapter</span>
              <input
                type="number" value={chapter} min={0} max={20}
                onChange={e => { setChapter(parseInt(e.target.value) || 0); setShowAll(false); }}
                className="input" style={{ width: 64, textAlign: 'center', fontFamily: 'var(--font-mono)', height: 32, padding: '4px 8px' }}
              />
              <span style={{ fontSize: 13, color: 'var(--primary-ink)' }}>— hide threads tagged later</span>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary-ink)' }}>
              {hidden > 0 ? (
                <>
                  <strong>{hidden} thread{hidden === 1 ? '' : 's'} hidden</strong>
                  <a onClick={() => setShowAll(true)} style={{ marginLeft: 10, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Show all anyway
                  </a>
                </>
              ) : <span>All threads visible</span>}
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{sorted.length} thread{sorted.length === 1 ? '' : 's'}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tabs value={sort} onChange={setSort} options={[
              { value: 'recent', label: 'Recent' },
              { value: 'comments', label: 'Most comments' },
            ]}/>
            <Button variant="primary" size="sm" icon={<I.plus size={13}/>}>New thread</Button>
          </div>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {sorted.map((t, i) => (
            <div key={t.id} onClick={onOpen}
              style={{
                padding: '16px 18px', borderTop: i ? '1px solid var(--line)' : 0,
                cursor: 'pointer', transition: 'background 0.12s',
                background: t.pinned ? 'oklch(0.97 0.02 75)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = t.pinned ? 'oklch(0.96 0.025 75)' : 'var(--bg-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = t.pinned ? 'oklch(0.97 0.02 75)' : 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                {t.pinned && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-ink)', fontSize: 11, fontWeight: 600 }}>
                  <I.pin size={11}/> PINNED
                </span>}
                {t.tag && <ChapterChip tag={t.tag} chapter={t.ch}/>}
                {!t.tag && <Badge tone="neutral">No tag</Badge>}
              </div>
              <div className="t-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }}>{t.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t.body}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                <Avatar name={t.author} size="sm"/>
                <span><strong style={{ color: 'var(--ink-2)' }}>{t.author.split(' ')[0]}</strong> · {t.t}</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <I.chat size={12}/> {t.cnt}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88, alignSelf: 'start' }}>
        <Card style={{ padding: 18 }}>
          <div className="t-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Your reading</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
            You said you&rsquo;re on <strong style={{ color: 'var(--ink)' }}>chapter {chapter}</strong>.
          </div>
          <div className="progress-track" style={{ height: 8, marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: `${(chapter / 20) * 100}%` }}/>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{chapter} of ~20 chapters</div>
          <Button variant="secondary" size="sm" style={{ width: '100%', marginTop: 14 }}>Update progress</Button>
        </Card>
        <Card style={{ padding: 18, background: 'var(--bg-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📖</span>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              <strong>Tagging tip:</strong> Use the latest chapter your post mentions. Untagged threads are visible to everyone.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- View 2: Thread detail ---------- */
function ThreadDetailView() {
  const [replyTo, setReplyTo] = uS_d(null);
  const [replyText, setReplyText] = uS_d('');

  const comments = [
    { id: 'c1', author: 'Naomi Kell', time: '3h ago', body: 'Strong agree on the third course. It felt like the writer wanted to land an emotional beat that the chapter hadn\u2019t earned yet — like the table was set for a different scene.', replies: [
      { id: 'r1', author: 'Marisol Ortega', time: '2h ago', body: 'Yes! That\u2019s exactly the word: unearned. Glad I\u2019m not alone.' },
      { id: 'r2', author: 'Theo Park', time: '2h ago', body: '[deleted]', deleted: true },
    ]},
    { id: 'c2', author: 'Jules Brennan', time: '1h ago', body: 'Counterpoint: I think the unearned-ness is the point. The whole novel is about characters trying on emotions that don\u2019t fit them yet. Of course the dinner felt off.', replies: [
      { id: 'r3', author: 'Marisol Ortega', time: '40m ago', body: 'Hm. That\u2019s a generous reading. I\u2019m not sure I buy it but I want to.' },
    ]},
    { id: 'c3', author: 'Riya Patel', time: '20m ago', body: 'Did anyone else notice the apples coming back at the end of the chapter? I think Mason is doing something with fruit as a memory device — they keep showing up at the wrong time of year.', replies: [] },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 280px)', gap: 24, maxWidth: 1100 }}>
      <div style={{ minWidth: 0 }}>
        <Card style={{ padding: 28, marginBottom: 16 }}>
          {/* OP header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ChapterChip tag="Ch. 5–8" chapter={7}/>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· 4 replies</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button title="Edit" style={iconBtn}><I.edit size={14}/></button>
              <button title="Delete" style={iconBtn}><I.trash size={14}/></button>
            </div>
          </div>
          <h2 className="t-display" style={{ fontSize: 28, margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            The dinner scene — was that earned?
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Avatar name="Marisol Ortega" size="md"/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Marisol Ortega</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>4 hours ago · edited</div>
            </div>
          </div>
          <div className="t-serif" style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--ink)' }}>
            <p style={{ margin: '0 0 12px' }}>
              I have feelings about the third course of the dinner in chapter seven, and they are mostly that it shouldn&rsquo;t have happened that way. The build-up was beautiful — five pages of place-setting, weather, candlelight — and then the conversation turns on a dime in a way that felt imported from a different novel.
            </p>
            <p style={{ margin: 0 }}>
              Did anyone else feel the seams? Or was I just reading too quickly?
            </p>
          </div>
        </Card>

        {/* Comments */}
        <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>
          {comments.length} comment{comments.length === 1 ? '' : 's'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map(c => (
            <CommentBlock key={c.id} c={c} replyTo={replyTo} setReplyTo={setReplyTo} replyText={replyText} setReplyText={setReplyText}/>
          ))}
        </div>

        {/* Sticky comment composer */}
        <div style={{ position: 'sticky', bottom: 0, marginTop: 24, paddingTop: 12, paddingBottom: 12,
          background: 'linear-gradient(to bottom, transparent, var(--bg) 24px)' }}>
          <Card style={{ padding: 14, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Avatar name="Marisol Ortega" size="md"/>
              <div style={{ flex: 1 }}>
                <textarea className="textarea" placeholder="Add to the discussion…" style={{ minHeight: 56 }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Markdown supported · be kind to readers behind you</span>
                  <Button variant="primary" size="sm">Post comment</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>About this thread</div>
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-3)' }}>Chapter</span><span>Ch. 5–8</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-3)' }}>Replies</span><span>4 from 3 readers</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-3)' }}>Started</span><span>4 hours ago</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const iconBtn = {
  padding: 6, background: 'transparent', border: 0, cursor: 'pointer',
  color: 'var(--ink-3)', borderRadius: 6,
};

function CommentBlock({ c, replyTo, setReplyTo, replyText, setReplyText }) {
  const isReplying = replyTo === c.id;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Avatar name={c.author} size="md"/>
      <div style={{ flex: 1 }}>
        <Card className="comment-card" style={{ padding: 14 }} tabIndex={0}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.author}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {c.time}</span>
          </div>
          <div className="t-serif" style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)' }}>{c.body}</div>
          <div className="reply-action" style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button onClick={() => setReplyTo(isReplying ? null : c.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', borderRadius: 6, fontSize: 12,
              background: 'transparent', border: 0, cursor: 'pointer',
              color: 'var(--ink-3)', fontFamily: 'inherit',
            }}>
              <I.reply size={12}/> Reply
            </button>
          </div>
        </Card>

        {/* Replies */}
        {c.replies.length > 0 && (
          <div style={{ marginTop: 8, marginLeft: 8, paddingLeft: 16, borderLeft: '2px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {c.replies.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {r.deleted ? (
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-sunken)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                    [deleted]
                  </div>
                ) : (
                  <>
                    <Avatar name={r.author} size="sm"/>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{r.author}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {r.time}</span>
                      </div>
                      <div className="t-serif" style={{ fontSize: 14, lineHeight: 1.55 }}>{r.body}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {isReplying && (
          <div style={{ marginTop: 10, marginLeft: 8, paddingLeft: 16, borderLeft: '2px solid var(--primary)', animation: 'fadeIn 0.15s' }}>
            <textarea className="textarea" placeholder={`Reply to ${c.author}…`} value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus style={{ minHeight: 60 }}/>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Button variant="primary" size="sm">Post reply</Button>
              <Button variant="ghost" size="sm" onClick={() => { setReplyTo(null); setReplyText(''); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- View 3: Compose ---------- */
function ComposeThreadView() {
  const [tag, setTag] = uS_d('Ch. 7');
  const [body, setBody] = uS_d('');
  const tagCh = parseInt((tag || '').replace(/\D/g, '')) || null;
  // Detect chapter references in body that exceed the tagged chapter
  const chapterMentions = [...body.matchAll(/\b(?:ch(?:apter|\.?)\s*|part\s+)(\d+)/gi)].map(m => parseInt(m[1])).filter(n => !isNaN(n));
  const beyondTag = tagCh ? chapterMentions.filter(n => n > tagCh) : [];
  const hasMismatch = beyondTag.length > 0;
  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      <Card style={{ padding: 28 }}>
        <h2 className="t-display" style={{ fontSize: 24, margin: '0 0 6px', fontWeight: 600 }}>Start a new thread</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 24 }}>
          Tag with the latest chapter your post mentions — readers behind that chapter won&rsquo;t see it by default.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Title">
            <input className="input" placeholder="What do you want to talk about?" autoFocus/>
          </Field>

          <Field label="Chapter tag" hint="Optional. Try: Ch. 5, Part Two, Epilogue">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input t-mono" value={tag} onChange={e => setTag(e.target.value)} style={{ maxWidth: 180 }}/>
              {tag && <ChapterChip tag={tag} chapter={tagCh || 1}/>}
            </div>
          </Field>

          <Field label="Body">
            <textarea className="textarea" placeholder="Paragraph breaks become paragraphs. **bold** and *italic* are supported. Try mentioning &quot;chapter 12&quot; to see a spoiler check."
              value={body} onChange={e => setBody(e.target.value)}
              style={{ minHeight: 180, borderColor: hasMismatch ? 'oklch(0.7 0.12 50)' : undefined }}/>
          </Field>

          {hasMismatch ? (
            <div style={{
              padding: '12px 14px',
              background: 'oklch(0.97 0.04 70)',
              borderRadius: 10,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              border: '1px solid oklch(0.82 0.10 70)',
            }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>⚠</span>
              <div style={{ fontSize: 12, color: 'oklch(0.32 0.08 50)', lineHeight: 1.55 }}>
                <strong>Possible spoiler.</strong> Your post mentions chapter {Math.max(...beyondTag)} but is tagged {tag}. Bump the tag to <em>Ch. {Math.max(...beyondTag)}</em> or rephrase before posting.
              </div>
            </div>
          ) : (
            <div style={{
              padding: 14, background: 'var(--bg-soft)', borderRadius: 10,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              border: '1px solid var(--line)',
            }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>💡</span>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                <strong>Spoiler-safe by default.</strong> {tag ? `This will only appear for members past chapter ${tagCh || 1}.` : 'Without a chapter tag, this will be visible to all members.'}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <Button variant="ghost" size="md">Cancel</Button>
          <Button variant="primary" size="md" disabled={hasMismatch}>{hasMismatch ? 'Resolve spoiler warning' : 'Post thread'}</Button>
        </div>
      </Card>
    </div>
  );
}

window.DiscussionsArtboard = DiscussionsArtboard;
