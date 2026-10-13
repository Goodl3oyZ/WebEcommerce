/** The one HTML layout every email uses: shop name, title, text, a button. */
export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function renderEmail({ siteName, title, message, url, cta, footer }) {
  const name = escapeHtml(siteName);
  return {
    subject: `${title} · ${siteName}`,
    text: `${title}\n\n${message}\n\n${cta}: ${url}\n\n${footer ? `${footer}\n\n` : ""}${siteName}`,
    html: `<!doctype html>
<html lang="th"><body style="margin:0;background:#f4f4f2;font-family:Helvetica,Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
        <tr><td style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#555">${name}</td></tr>
        <tr><td style="padding-top:20px;font-size:22px;font-weight:700">${escapeHtml(title)}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#333">${escapeHtml(message)}</td></tr>
        <tr><td style="padding-top:28px">
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">${escapeHtml(cta)}</a>
        </td></tr>
        <tr><td style="padding-top:20px;font-size:12px;line-height:1.6;color:#888;word-break:break-all">ถ้ากดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิด: ${escapeHtml(url)}</td></tr>${
          footer ? `\n        <tr><td style="padding-top:12px;font-size:12px;color:#888">${escapeHtml(footer)}</td></tr>` : ""
        }
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}
