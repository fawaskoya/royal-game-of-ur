/**
 * Public Dodo Payments tip link (short). Safe to expose in the client.
 * Override anytime with NEXT_PUBLIC_DONATE_URL (e.g. full checkout URL).
 */
export const DEFAULT_DONATE_URL = "https://dodo.pe/support-ur";

/** Full payment link with return to the site after checkout (for docs / fallback). */
export const DEFAULT_DONATE_URL_FULL =
  "https://checkout.dodopayments.com/buy/pdt_0NiwDp1XRBfPhen9b4102?quantity=1&redirect_url=https%3A%2F%2Froyalgameofur.app%2F%3Fdonated%3D1";

/** Resolved public donate URL used by the menu and Donate panel. */
export function getDonateUrl(): string {
  return process.env.NEXT_PUBLIC_DONATE_URL?.trim() || DEFAULT_DONATE_URL;
}

/** Donate UI is on when a public link exists (always true with DEFAULT_DONATE_URL). */
export function isDonateEnabled(): boolean {
  return Boolean(getDonateUrl() || process.env.NEXT_PUBLIC_DONATIONS_ENABLED);
}
