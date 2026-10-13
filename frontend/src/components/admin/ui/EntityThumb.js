/**
 * Square image for a brand or category; without one, a lettermark from the
 * name, so every row looks the same whether or not an image was uploaded.
 */
export default function EntityThumb({ src, name = "", size = 48, className = "" }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  const style = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploaded images come from the storage host
      <img src={src} alt="" style={style} className={`shrink-0 rounded-xl border border-border bg-surface object-contain p-1 ${className}`} />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-xl bg-fg/[0.06] font-display font-bold text-fg-muted ${className}`}
    >
      {letter}
    </span>
  );
}
