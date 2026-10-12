/** Emails captured by the sendEmail mock (see setupAfterEnv.js). */
export const emailsTo = (to) => (globalThis.sentEmails ?? []).filter((m) => m.to === to);

/** Pull the `token=` query value out of an email's link. */
export function tokenFromEmail(message) {
  const body = message.html ?? message.text ?? "";
  const match = body.match(/token=([^"\s&<]+)/);
  if (!match) throw new Error(`No token link in email: ${body}`);
  return decodeURIComponent(match[1]);
}
