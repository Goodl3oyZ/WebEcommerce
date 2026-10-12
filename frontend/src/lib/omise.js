/**
 * Tokenize a card in the browser with Omise.js (loaded in app/layout.js).
 * Card numbers never reach our server; only the token does.
 */
export function createCardToken({ name, number, expiry, cvc }) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.Omise) {
      reject(new Error("Omise.js not loaded"));
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
    if (!publicKey) {
      reject(new Error("ยังไม่ได้ตั้งค่าการชำระเงินด้วยบัตร (NEXT_PUBLIC_OMISE_PUBLIC_KEY)"));
      return;
    }
    const [month, year = ""] = String(expiry).split("/");
    window.Omise.setPublicKey(publicKey);
    window.Omise.createToken(
      "card",
      {
        name,
        number: String(number).replace(/\s/g, ""),
        expiration_month: month,
        expiration_year: year.length === 2 ? `20${year}` : year,
        security_code: cvc,
      },
      (statusCode, response) =>
        statusCode === 200 ? resolve(response.id) : reject(new Error(response.message))
    );
  });
}
