/**
 * Default browser-tab icon: the first letter of the store name on the brand
 * lime square. SVG so Thai names render with the visitor's fonts. Used until
 * an admin uploads a logo in Settings.
 */
const escape = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function GET(request) {
  const name = new URL(request.url).searchParams.get("name") || "";
  const letter = escape((Array.from(name.trim())[0] || "•").toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#C8FF3D"/>
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Kanit, 'Noto Sans Thai', system-ui, sans-serif" font-size="40" font-weight="700" font-style="italic" fill="#141414">${letter}</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
  });
}
