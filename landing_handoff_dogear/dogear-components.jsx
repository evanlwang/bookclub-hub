// dogear-components.jsx — shared primitives for the Dogear redesign
const { useState, useEffect, useRef } = React;

/* ---------- Button ---------- */
function DgButton({ variant = 'primary', size = 'md', loading = false, full = false, children, ...rest }) {
  return (
    <button
      className={`dg-btn dg-btn--${variant} dg-btn--${size}`}
      style={full ? { width: '100%' } : undefined}
      {...rest}
    >
      {loading && <span style={{
        width: 14, height: 14, borderRadius: '50%',
        border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: 'currentColor',
        animation: 'dg-spin .7s linear infinite', display: 'inline-block',
      }}></span>}
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */
function DgBadge({ tone = 'neutral', dot = false, children }) {
  return (
    <span className={`dg-badge dg-badge--${tone}`}>
      {dot && <span className="dg-badge__dot"></span>}
      {children}
    </span>
  );
}

/* ---------- Avatar (deterministic warm palette) ---------- */
const DG_AVATAR_PALETTE = [
  ['#C75B39', '#FFF2E8'], // terracotta
  ['#DD9A33', '#4A3413'], // amber
  ['#7C8C4F', '#F4F6E8'], // olive
  ['#A8442F', '#FBE9E2'], // rust
  ['#B97D5C', '#FFF4EA'], // clay
  ['#8A6A35', '#F8EFDB'], // bronze
];
function dgHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
const DG_AVATAR_SIZES = { xs: 22, sm: 28, md: 36, lg: 48 };
function DgAvatar({ name, size = 'md', ring = false }) {
  const px = DG_AVATAR_SIZES[size] || size;
  const [bg, fg] = DG_AVATAR_PALETTE[dgHash(name) % DG_AVATAR_PALETTE.length];
  const initials = name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: px, height: px, borderRadius: '50%', background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 800, flexShrink: 0,
      fontSize: px * 0.38, letterSpacing: '.01em',
      boxShadow: ring ? '0 0 0 2px var(--paper-card)' : 'none',
    }}>{initials}</div>
  );
}

function DgAvatarStack({ names, max = 4, size = 'sm' }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const px = DG_AVATAR_SIZES[size] || size;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((n, i) => (
        <div key={n} style={{ marginLeft: i === 0 ? 0 : -px * 0.3, zIndex: i }}>
          <DgAvatar name={n} size={size} ring={true} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          width: px, height: px, borderRadius: '50%', marginLeft: -px * 0.3, zIndex: 99,
          background: 'var(--paper-edge)', color: 'var(--ink-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: px * 0.36,
          boxShadow: '0 0 0 2px var(--paper-card)',
        }}>+{extra}</div>
      )}
    </div>
  );
}

/* ---------- BookCover: real cover with clothbound fallback ---------- */
const DG_CLOTH_VARIANTS = [
  { cloth: '#A8442F', band: '#E8D9B8' },
  { cloth: '#7C8C4F', band: '#F3ECD8' },
  { cloth: '#C75B39', band: '#F6E3C2' },
  { cloth: '#8A6A35', band: '#F2E6CC' },
  { cloth: '#B97D5C', band: '#FBEEDA' },
  { cloth: '#9C5240', band: '#EFE0C4' },
];
function DgBookCover({ title, author, src, width = 84, variantSeed }) {
  const [failed, setFailed] = useState(false);
  const h = Math.round(width * 1.5);
  const frame = {
    width, height: h, borderRadius: Math.max(4, width * 0.06), overflow: 'hidden', flexShrink: 0,
    boxShadow: '0 1px 2px rgba(96,64,32,.18), 0 6px 14px rgba(96,64,32,.22), inset 2px 0 0 rgba(255,255,255,.14)',
    position: 'relative',
  };
  if (src && !failed) {
    return (
      <div style={frame}>
        <img src={src} alt={title} onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  const v = DG_CLOTH_VARIANTS[dgHash(variantSeed || title) % DG_CLOTH_VARIANTS.length];
  return (
    <div style={{ ...frame, background: v.cloth, display: 'flex', flexDirection: 'column' }}>
      {/* spine ridge */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: width * 0.085, width: 2, background: 'rgba(0,0,0,.16)' }}></div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: width * 0.085 + 2, width: 1, background: 'rgba(255,255,255,.18)' }}></div>
      {/* title band */}
      <div style={{
        background: v.band, margin: `${h * 0.16}px ${width * 0.13}px 0 ${width * 0.2}px`,
        borderRadius: 3, padding: `${width * 0.07}px ${width * 0.08}px`, textAlign: 'center',
      }}>
        <div className="dg-serif" style={{ fontWeight: 600, fontSize: Math.max(8, width * 0.115), lineHeight: 1.25, color: '#3D2F24' }}>{title}</div>
      </div>
      <div className="dg-serif" style={{
        marginTop: 'auto', marginBottom: h * 0.09, textAlign: 'center', paddingLeft: width * 0.12,
        fontSize: Math.max(7, width * 0.085), fontStyle: 'italic', color: 'rgba(255,248,236,.85)',
      }}>{author}</div>
    </div>
  );
}

/* ---------- ChapterChip ---------- */
function DgChapterChip({ n }) {
  return <span className={`dg-chip dg-chip--${n % 5}`}>CH. {n}</span>;
}

/* ---------- ProgressBar ---------- */
function DgBar({ value, tone = '', height = 8 }) {
  return (
    <div className="dg-bar" style={{ height }}>
      <div className={`dg-bar__fill ${tone ? 'dg-bar__fill--' + tone : ''}`} style={{ width: `${value}%` }}></div>
    </div>
  );
}

/* ---------- Section heading ---------- */
function DgSectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 2px 10px' }}>
      <h2 className="dg-display" style={{ fontSize: 19, margin: 0 }}>{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Dog-ear glyph (tiny folded corner, used in pick counters) ---------- */
function DgEarGlyph({ filled, size = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 3, position: 'relative', overflow: 'hidden',
      background: filled ? 'var(--terracotta-tint)' : 'var(--paper-edge)',
      transition: 'background .2s ease',
    }}>
      {filled && <div style={{
        position: 'absolute', top: 0, right: 0, width: 0, height: 0,
        borderTop: `${size * 0.55}px solid var(--terracotta)`,
        borderLeft: `${size * 0.55}px solid transparent`,
      }}></div>}
    </div>
  );
}

Object.assign(window, {
  DgButton, DgBadge, DgAvatar, DgAvatarStack, DgBookCover,
  DgChapterChip, DgBar, DgSectionTitle, DgEarGlyph, dgHash,
});
