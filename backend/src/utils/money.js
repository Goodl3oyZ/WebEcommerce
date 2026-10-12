/**
 * Money is calculated in integer satang (1/100 THB) so totals never drift by
 * floating-point error; decimal columns are written as "123.45" strings.
 */
export const toSatang = (amount) => Math.round(Number(amount ?? 0) * 100);

export const fromSatang = (satang) => (Math.round(satang) / 100).toFixed(2);

/** Percentage of an amount in satang, rounded half up. */
export const percentOf = (satang, percent) => Math.round((satang * Number(percent)) / 100);
