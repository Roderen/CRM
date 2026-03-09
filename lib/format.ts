/** Formats a number as USD currency with no decimal places (e.g. deal amounts, budgets). */
export function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Formats a number as USD currency with two decimal places (e.g. invoice amounts). */
export function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}
