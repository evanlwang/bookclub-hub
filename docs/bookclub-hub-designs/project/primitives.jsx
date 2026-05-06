/* global React */
const { useState, useMemo, useEffect, useRef, useCallback } = React;

/* ---------- Icons (lucide-style, 1.6px stroke) ---------- */
const Icon = ({ d, size = 16, fill = 'none', stroke = 'currentColor', sw = 1.6, viewBox = '0 0 24 24' }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const I = {
  book:    (p) => <Icon size={p?.size} d={<><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></>}/>,
  vote:    (p) => <Icon size={p?.size} d={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>}/>,
  calendar:(p) => <Icon size={p?.size} d={<><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></>}/>,
  chat:    (p) => <Icon size={p?.size} d={<><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></>}/>,
  trend:   (p) => <Icon size={p?.size} d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>}/>,
  search:  (p) => <Icon size={p?.size} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}/>,
  plus:    (p) => <Icon size={p?.size} d={<><path d="M12 5v14M5 12h14"/></>}/>,
  check:   (p) => <Icon size={p?.size} d={<path d="M5 12.5l4.5 4.5L19 7"/>}/>,
  x:       (p) => <Icon size={p?.size} d={<path d="M6 6l12 12M18 6L6 18"/>}/>,
  user:    (p) => <Icon size={p?.size} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>}/>,
  users:   (p) => <Icon size={p?.size} d={<><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-5-6.7"/></>}/>,
  pin:     (p) => <Icon size={p?.size} d={<><path d="M12 17v5"/><path d="M9 11V4h6v7l3 3v2H6v-2l3-3z"/></>}/>,
  clock:   (p) => <Icon size={p?.size} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  pin2:    (p) => <Icon size={p?.size} d={<><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></>}/>,
  edit:    (p) => <Icon size={p?.size} d={<><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M14 6l4 4"/></>}/>,
  trash:   (p) => <Icon size={p?.size} d={<><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4h6v3"/></>}/>,
  reply:   (p) => <Icon size={p?.size} d={<><path d="M9 17l-5-5 5-5"/><path d="M4 12h10a6 6 0 0 1 6 6v2"/></>}/>,
  chev:    (p) => <Icon size={p?.size} d={<path d="M9 6l6 6-6 6"/>}/>,
  chevDown:(p) => <Icon size={p?.size} d={<path d="M6 9l6 6 6-6"/>}/>,
  filter:  (p) => <Icon size={p?.size} d={<path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/>}/>,
  bell:    (p) => <Icon size={p?.size} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 0 0 4 0"/></>}/>,
  spark:   (p) => <Icon size={p?.size} d={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>}/>,
  menu:    (p) => <Icon size={p?.size} d={<><path d="M4 7h16M4 12h16M4 17h16"/></>}/>,
  copy:    (p) => <Icon size={p?.size} d={<><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>}/>,
  logo:    (p) => (
    <Icon size={p?.size || 22} viewBox="0 0 28 28" sw={1.8} d={<>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H22v20H7.5A2.5 2.5 0 0 0 5 25.5V5.5z" fill="oklch(0.42 0.06 195)" stroke="oklch(0.32 0.06 195)"/>
      <path d="M5 22A2.5 2.5 0 0 1 7.5 19.5H22" stroke="oklch(0.985 0.006 80)"/>
      <path d="M11 8l3 4 3-4" stroke="oklch(0.78 0.13 75)" sw={2}/>
    </>}/>
  ),
};

/* ---------- Avatar ---------- */
function Avatar({ name = '', size = 'md', tone, src }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
  const palette = ['p', 'a', 's', 'm', 'r'];
  const idx = Math.abs(hashStr(name)) % palette.length;
  const t = tone || palette[idx];
  const bg = { p: 'oklch(0.92 0.04 195)', a: 'oklch(0.93 0.05 75)', s: 'oklch(0.92 0.045 145)', m: 'oklch(0.92 0.045 320)', r: 'oklch(0.92 0.05 30)' }[t];
  const ink = { p: 'oklch(0.36 0.06 195)', a: 'oklch(0.45 0.10 75)', s: 'oklch(0.40 0.07 145)', m: 'oklch(0.42 0.08 320)', r: 'oklch(0.45 0.10 30)' }[t];
  return (
    <div className={`avatar avatar-${size}`} style={{ background: bg, color: ink }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', borderRadius: '999px', objectFit: 'cover' }}/> : initials}
    </div>
  );
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

/* ---------- Button ---------- */
function Button({ variant = 'secondary', size = 'md', children, icon, iconRight, ...rest }) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

/* ---------- Badge ---------- */
function Badge({ tone = 'neutral', children, dot }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot"/>}
      {children}
    </span>
  );
}

/* ---------- Book cover ---------- */
function BookCover({ title, author, variant = 'teal', size = 'md' }) {
  const dims = {
    sm: { w: 48, h: 70, t: 9, a: 7 },
    md: { w: 80, h: 116, t: 13, a: 9 },
    lg: { w: 132, h: 192, t: 18, a: 11 },
    xl: { w: 180, h: 260, t: 22, a: 13 },
  }[size];
  return (
    <div className={`book-cover cv-${variant}`} style={{ width: dims.w, height: dims.h, flexShrink: 0 }}>
      <div className="book-cover-content">
        <div style={{ fontSize: dims.t, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: dims.a, opacity: 0.78, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{author}</div>
      </div>
    </div>
  );
}

/* ---------- Card ---------- */
function Card({ children, style, ...rest }) {
  return <div className="card" style={style} {...rest}>{children}</div>;
}

/* ---------- Chapter chip (color-coded) ---------- */
function ChapterChip({ tag, chapter }) {
  // Hash to chip palette
  const idx = chapter != null ? ((chapter - 1) % 5) : Math.abs(hashStr(tag || '')) % 5;
  const bg = `var(--chip-${idx + 1})`;
  const ink = `var(--chip-${idx + 1}-ink)`;
  return (
    <span className="badge" style={{ background: bg, color: ink, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>
      {tag}
    </span>
  );
}

/* ---------- Field ---------- */
function Field({ label, hint, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/* ---------- Tabs ---------- */
function Tabs({ value, onChange, options }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: 3,
      background: 'var(--bg-sunken)', borderRadius: 10,
      border: '1px solid var(--line)'
    }}>
      {options.map(opt => (
        <button key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 14px', fontSize: 13, fontWeight: 500,
            background: value === opt.value ? 'var(--bg)' : 'transparent',
            color: value === opt.value ? 'var(--ink)' : 'var(--ink-3)',
            border: 0, borderRadius: 7, cursor: 'pointer',
            boxShadow: value === opt.value ? 'var(--shadow-sm)' : 'none',
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          {opt.label}
          {opt.count != null && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Artboard frame helper ---------- */
// Used inside DCArtboard — gives us a phone or browser-ish chrome optionally
function Frame({ children, kind = 'plain', style }) {
  if (kind === 'plain') {
    return <div style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}>{children}</div>;
  }
  return <div style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}>{children}</div>;
}

/* ---------- Section header inside artboard ---------- */
function ArtboardNote({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)',
      padding: '6px 10px', background: 'var(--bg-sunken)',
      borderBottom: '1px solid var(--line)',
    }}>{children}</div>
  );
}

Object.assign(window, {
  I, Icon, Avatar, Button, Badge, BookCover, Card, ChapterChip, Field, Tabs, Frame, ArtboardNote, hashStr,
});
