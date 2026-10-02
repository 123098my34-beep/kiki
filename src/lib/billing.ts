/**
 * Paddle (merchant of record) integration — zero backend.
 *
 * Checkout and license state run entirely client-side:
 *  - Paddle.js loads from Paddle's CDN and opens an overlay checkout.
 *  - On `checkout.completed` / subscription events we flip the local Pro flag.
 *  - No accounts, no webhooks, no servers — which is the whole point of
 *    selling a product with no server cost.
 *
 * Requires (Settings → Environment):
 *  - VITE_PADDLE_PUBLIC_KEY      client-side token from Paddle → Developer Tools
 *  - VITE_PADDLE_PRICE_ID_PRO    price ID of the Pro plan
 */

const PRO_STORAGE_KEY = "murmur.pro.v1";
const LICENSE_STORAGE_KEY = "murmur.license.v1";

interface PaddleEvent {
  name?: string;
  data?: Record<string, unknown>;
}

interface PaddleGlobal {
  Initialize: (opts: {
    token?: string;
    eventCallback?: (e: PaddleEvent) => void;
  }) => void;
  Checkout: {
    open: (opts: Record<string, unknown>) => void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

export const paddleConfig = {
  publicKey: import.meta.env.VITE_PADDLE_PUBLIC_KEY,
  priceId: import.meta.env.VITE_PADDLE_PRICE_ID_PRO,
};

/**
 * Gumroad product page (marketplace checkout — no backend needed).
 *
 * The canonical listing lives in source rather than only in an env var: the
 * production pipeline rewrites environment-supplied URLs into a redirect token
 * that the static host does not resolve, which silently turned the buy button
 * into a link back to the landing page. A constant here is baked into the
 * bundle as-is.
 *
 * `VITE_GUMROAD_PRODUCT_URL` is still honoured when it is a real absolute URL,
 * so a different host can override it — anything else is ignored rather than
 * shipped as a dead link.
 */
const GUMROAD_PRODUCT_URL = "https://beepbopboop.gumroad.com/l/pro-gating-tool";

export const gumroadConfig = {
  productUrl: /^https:\/\//.test(import.meta.env.VITE_GUMROAD_PRODUCT_URL ?? "")
    ? import.meta.env.VITE_GUMROAD_PRODUCT_URL
    : GUMROAD_PRODUCT_URL,
};

export function gumroadReady(): boolean {
  return Boolean(gumroadConfig.productUrl);
}

export function paddleReady(): boolean {
  return Boolean(paddleConfig.publicKey && paddleConfig.priceId);
}

export function isPro(): boolean {
  try {
    return localStorage.getItem(PRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPro(value: boolean): void {
  try {
    if (value) localStorage.setItem(PRO_STORAGE_KEY, "1");
    else localStorage.removeItem(PRO_STORAGE_KEY);
  } catch {
    /* private mode — entitlement just won't persist */
  }
}

export interface ActivationResult {
  ok: boolean;
  message: string;
}

/**
 * Activate a purchased license key (Gumroad / marketplace receipts).
 *
 * Keys are validated for shape and stored on-device — the marketplace emailed
 * the key, we never need a server to honor it. Full online validation against
 * the Gumroad API would require a token (and therefore a backend); revisit if
 * key leakage ever becomes a problem.
 */
export function activateLicense(rawKey: string): ActivationResult {
  const key = rawKey.trim().replace(/\s+/g, "");
  if (key.length < 8) {
    return {
      ok: false,
      message: "That key looks too short — copy the full license key from your receipt.",
    };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return {
      ok: false,
      message: "Keys contain only letters, numbers and dashes — check for stray characters.",
    };
  }
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, key);
  } catch {
    /* private mode — Pro lasts for this session only */
  }
  setPro(true);
  window.dispatchEvent(new CustomEvent("murmur:pro", { detail: true }));
  return { ok: true, message: "Pro unlocked on this device. Welcome aboard!" };
}

export function getLicense(): string | null {
  try {
    return localStorage.getItem(LICENSE_STORAGE_KEY);
  } catch {
    return null;
  }
}

// restore Pro from a previously activated license (fresh device profile etc.)
try {
  if (typeof localStorage !== "undefined" && localStorage.getItem(LICENSE_STORAGE_KEY)) {
    localStorage.setItem(PRO_STORAGE_KEY, "1");
  }
} catch {
  /* noop */
}

let initPromise: Promise<boolean> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("failed to load paddle.js"));
    document.head.appendChild(el);
  });
}

export function ensurePaddle(): Promise<boolean> {
  if (!paddleReady()) return Promise.resolve(false);
  if (window.Paddle) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await loadScript("https://cdn.paddle.com/paddle/v2/paddle.js");
    if (!window.Paddle) return false;
    window.Paddle.Initialize({
      token: paddleConfig.publicKey,
      eventCallback: (e) => {
        const name = e.name ?? "";
        if (
          name === "checkout.completed" ||
          name === "subscription.created" ||
          name === "subscription.activated"
        ) {
          setPro(true);
          window.dispatchEvent(new CustomEvent("murmur:pro", { detail: true }));
        }
        if (name === "subscription.cancelled" || name === "subscription.past_due") {
          setPro(false);
          window.dispatchEvent(new CustomEvent("murmur:pro", { detail: false }));
        }
      },
    });
    return true;
  })().catch(() => {
    initPromise = null;
    return false;
  });

  return initPromise;
}

export type UpgradeOutcome = "opened" | "unconfigured" | "failed";

export async function upgradeToPro(): Promise<UpgradeOutcome> {
  const ready = await ensurePaddle();
  if (!ready || !window.Paddle || !paddleConfig.priceId) return "unconfigured";
  try {
    window.Paddle.Checkout.open({
      items: [{ priceId: paddleConfig.priceId, quantity: 1 }],
      settings: { displayMode: "overlay", theme: "dark" },
      customData: { source: "murmur-web" },
    });
    return "opened";
  } catch {
    return "failed";
  }
}
