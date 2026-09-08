"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameSession, createRng, type GameState } from "@ur/engine";
import {
  ALL_PAID_SKUS,
  CATALOG,
  DEFAULT_LOADOUT,
  FREE_GRANTS,
  UNLOCK_ALL_PRICE_USD,
  attrNameForCategory,
  fetchEntitlements,
  grantDevSku,
  loadCosmetics,
  resolveLoadout,
  saveCosmetics,
  skuToAttrValue,
  type CosmeticCategory,
  type CosmeticLoadout,
  type CosmeticSku,
  type SkuId,
} from "@/lib/cosmetics";
import { ensureSession, getSupabaseClient } from "@/lib/multiplayer/supabaseClient";
import { signInWithEmail, signUpWithEmail } from "@/lib/multiplayer/auth";
import { trackSkinClick } from "@/lib/analytics";
import { Modal } from "./ui/Modal";
import { Board } from "./Board";
import { DieGradients } from "./DiceTray";
import { Flair } from "./Flair";

/** Category -> the CosmeticLoadout key it equips into (mirrors resolveLoadout's own mapping). */
const LOADOUT_KEY_FOR_CATEGORY: Record<CosmeticCategory, keyof CosmeticLoadout> = {
  board: "board",
  dice: "dice",
  piece: "pieces",
  flair: "flair",
};

const CATEGORIES: readonly CosmeticCategory[] = ["board", "dice", "piece", "flair"];

const TABS: readonly { id: CosmeticCategory; label: string }[] = [
  { id: "board", label: "Boards" },
  { id: "dice", label: "Dice" },
  { id: "piece", label: "Pieces" },
  { id: "flair", label: "Flair" },
];

/**
 * Swatch chips per SKU, transcribed from the per-token hex suggestions in
 * `docs/COSMETICS_CATALOG.md` (frame/tile/tile-edge/rosette-ink for boards,
 * die-face/edge/pip for dice, light/dark piece + edge for pieces). Kept local
 * to this file per the task brief — the domain module carries no color data.
 */
const SWATCHES: Partial<Record<SkuId, readonly string[]>> = {
  "board.classic_museum": ["#1a1610", "#e3d6ba", "#b3a37e", "#c9a24b"],
  "board.cedar_bitumen": ["#3a2418", "#e8d2a8", "#6b5230", "#cf9a45"],
  "board.night_lapis": ["#12172c", "#d7dceb", "#35407a", "#d4af5a"],
  "board.floodplain_parchment": ["#4a3520", "#ede2c2", "#b8a374", "#c1893f"],
  "board.venus_tablet": ["#0d0f1c", "#e6e2d6", "#454b6e", "#cbd0e6"],
  "board.field_journal": ["#4b3a26", "#ddcca8", "#8a765a", "#5b5346"],

  "dice.bone_classic": ["#e3d6ba", "#8a6f3a", "#1a1610"],
  "dice.gold_inlaid_bone": ["#ecdfc0", "#b58a3e", "#9c7530"],
  "dice.volcanic_obsidian": ["#17140f", "#3a352c", "#efe6cf"],
  "dice.carnelian_gold": ["#7a2f22", "#c9974a", "#e8c37a"],

  "piece.alabaster_obsidian": ["#f3ead3", "#6b5b38", "#2e2a26", "#c9a24b"],
  "piece.ivory_basalt": ["#f0e6cd", "#5c4c30", "#3a3632", "#b8923f"],
  "piece.lapis_eyes": ["#f2ecdd", "#3f5cae", "#241f1c", "#3f5cae"],
  "piece.electrum_filigree": ["#f5ecd8", "#d3b56a", "#2c2620", "#d3b56a"],
};

/** Flair has no CSS token surface (contract) — a motif glyph stands in for a swatch. */
const FLAIR_GLYPH: Partial<Record<SkuId, string>> = {
  "flair.none": "◌",
  "flair.lapis_cartouche": "⬭",
  "flair.rosette_seal": "❁",
  "flair.scribes_colophon": "𒀭",
  "flair.morning_star": "✦",
  "flair.first_dig": "⛏",
};

function priceLabel(sku: CosmeticSku): string {
  // Individual SKUs aren't sold separately — one $1.99 purchase unlocks all.
  return sku.priceUsd != null ? "Unlock All" : "Earned";
}

/* ── Live preview strip ──────────────────────────────────────────────────
 * Skins are :root token overrides, so a real Board rendered here reflects
 * exactly what the player would see in-game — including previews, which
 * stamp the same data-attrs temporarily. One seeded mid-game tableau,
 * simulated once per page load (same trick as MenuVignette's opening). */
let previewStateCache: GameState | null = null;
function getPreviewState(): GameState {
  if (previewStateCache) return previewStateCache;
  const session = new GameSession({ seed: 0xa7e11e });
  const rng = createRng(97);
  for (let i = 0; i < 26 && session.state.winner === null; i++) {
    if (session.phase === "awaiting-roll") session.roll();
    else {
      const moves = session.legalMoves();
      if (moves.length > 0) session.move(moves[Math.floor(rng.next() * moves.length)]!);
    }
  }
  previewStateCache = session.state;
  return previewStateCache;
}

function PreviewDie({ value }: { value: 0 | 1 }) {
  return (
    <svg viewBox="0 0 40 40" className="die h-7 w-7" aria-hidden>
      <polygon
        points="20,4 6,36 20,36"
        fill="var(--die-face, url(#dieFaceLight))"
        stroke="var(--die-edge)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <polygon
        points="20,4 34,36 20,36"
        fill="var(--die-face, url(#dieFaceDark))"
        stroke="var(--die-edge)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {value === 1 ? <circle cx="20" cy="26" r="2.8" fill="var(--die-pip)" /> : null}
    </svg>
  );
}

function LivePreview({ flair }: { flair: SkuId }) {
  const state = getPreviewState();
  return (
    <div className="card flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5">
      <DieGradients />
      <div className="pointer-events-none mx-auto aspect-[8/3] h-20 select-none sm:h-24 [container-type:size]">
        <Board state={state} legal={[]} canAct={false} onMove={() => undefined} orientation="horizontal" />
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <PreviewDie value={1} />
          <PreviewDie value={0} />
          <PreviewDie value={1} />
        </span>
        <span className="text-xs text-[var(--ink-dim)]">
          Your name <Flair flair={flair} />
        </span>
      </div>
      <div className="text-center text-[10px] leading-snug text-[var(--ink-dim)]">
        Live preview — equips and previews apply here and across the whole game.
      </div>
    </div>
  );
}

function SkuCard({
  sku,
  owned,
  equipped,
  previewing,
  onEquip,
  onPreview,
  onBuyAll,
}: {
  sku: CosmeticSku;
  owned: boolean;
  equipped: boolean;
  previewing: boolean;
  onEquip(): void;
  onPreview(): void;
  onBuyAll(): void;
}) {
  return (
    <div
      className={[
        "card flex flex-col gap-2 rounded-xl p-2.5",
        equipped ? "ring-1 ring-[var(--gold)]" : "",
        previewing ? "ring-1 ring-[var(--gold-soft)]" : "",
        !owned && !previewing ? "opacity-70" : "",
      ].join(" ")}
    >
      {sku.category === "flair" ? (
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--frame-edge)] bg-black/20 text-base leading-none text-[var(--gold)]"
        >
          {FLAIR_GLYPH[sku.id] ?? "✦"}
        </span>
      ) : (
        <span className="flex gap-1" aria-hidden>
          {(SWATCHES[sku.id] ?? []).map((hex, i) => (
            <span key={i} className="h-4 w-4 shrink-0 rounded-md border border-black/25" style={{ background: hex }} />
          ))}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug text-[var(--ink)]">{sku.name}</div>
        <div className="truncate text-[10px] text-[var(--ink-dim)]">
          {sku.collection} · {sku.rarity}
        </div>
      </div>
      <div className="flex gap-1">
        {equipped ? (
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-[var(--gold-soft)] bg-[var(--gold-faint)] px-2 py-0.5 text-[10px] font-medium text-[var(--gold)]">
            Equipped
          </span>
        ) : owned ? (
          <button className="btn flex-1 rounded-lg py-1 text-xs" onClick={onEquip}>
            Equip
          </button>
        ) : sku.priceUsd != null ? (
          <button
            className="btn flex-1 rounded-lg py-1 text-xs"
            title={`Unlock everything for $${UNLOCK_ALL_PRICE_USD.toFixed(2)}`}
            onClick={onBuyAll}
          >
            🔒 {priceLabel(sku)}
          </button>
        ) : (
          <button className="btn flex-1 rounded-lg py-1 text-xs" disabled title="Earned through play — coming with achievements">
            🔒 {priceLabel(sku)}
          </button>
        )}
        {!equipped ? (
          <button
            className={["btn rounded-lg px-2 py-1 text-xs", previewing ? "ring-1 ring-[var(--gold)] text-[var(--gold)]" : ""].join(" ")}
            title={previewing ? "Stop previewing" : "Try this look without equipping"}
            aria-pressed={previewing}
            onClick={onPreview}
          >
            👁
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Wardrobe: browse the catalog, preview any skin live (owned or locked),
 * equip owned skins, see locked ones priced. */
export function AtelierPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const [tab, setTab] = useState<CosmeticCategory>("board");
  const [loadout, setLoadout] = useState<CosmeticLoadout>(() => loadCosmetics().loadout);
  const [devGrants, setDevGrants] = useState<readonly SkuId[]>(() => loadCosmetics().devGrants);
  const [previews, setPreviews] = useState<Partial<Record<CosmeticCategory, SkuId>>>({});
  const [unlocking, setUnlocking] = useState(false);
  const [serverOwned, setServerOwned] = useState<readonly SkuId[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  // Account gate: shown at purchase intent for guests ("purchase") or as a
  // post-purchase "secure your unlocks" step ("secure").
  const [accountStep, setAccountStep] = useState<null | "purchase" | "secure">(null);
  const [acctMode, setAcctMode] = useState<"signup" | "signin">("signup");
  const [acctEmail, setAcctEmail] = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctError, setAcctError] = useState<string | null>(null);
  const hadPreviews = useRef(false);

  // Purchased unlocks live server-side; refresh on open and when the tab
  // regains focus (covers "came back from Dodo checkout in another tab").
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const refresh = () => void fetchEntitlements().then((skus) => !disposed && setServerOwned(skus));
    refresh();
    // Purchases bind to the profile — warn guests theirs lives in this browser.
    void getSupabaseClient()
      ?.auth.getUser()
      .then(({ data }) => {
        if (!disposed) setIsGuest(Boolean(data.user && (data.user.is_anonymous || !data.user.email)));
      });
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refresh);
    };
  }, [open]);

  // Storage is the single source of truth; resync whenever anyone (this panel
  // included) writes a change, per the same event lib/settings.ts uses.
  useEffect(() => {
    const resync = () => {
      const state = loadCosmetics();
      setLoadout(state.loadout);
      setDevGrants(state.devGrants);
    };
    window.addEventListener("ur:cosmetics-changed", resync);
    return () => window.removeEventListener("ur:cosmetics-changed", resync);
  }, []);

  const owned = useMemo(() => new Set<SkuId>([...FREE_GRANTS, ...devGrants, ...serverOwned]), [devGrants, serverOwned]);
  // Fail-closed per category, same as any other consumer of the stored loadout.
  const resolved = useMemo(() => resolveLoadout(loadout, owned), [loadout, owned]);

  /* Preview = stamp the same data-attrs CosmeticsEffect owns, on top of the
   * resolved truth, while the panel is open. CosmeticsEffect re-asserts truth
   * on every `ur:cosmetics-changed`; this effect then re-runs (deps include
   * `resolved`) and re-layers active previews, so the two never fight. */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    for (const category of CATEGORIES) {
      const key = LOADOUT_KEY_FOR_CATEGORY[category];
      const sku = previews[category] ?? resolved[key];
      const attr = attrNameForCategory(category);
      if (sku === DEFAULT_LOADOUT[key]) root.removeAttribute(attr);
      else root.setAttribute(attr, skuToAttrValue(sku));
    }
  }, [open, previews, resolved]);

  // Leaving the panel (or unmounting) drops all previews and hands the
  // attributes back to CosmeticsEffect via the canonical change event.
  useEffect(() => {
    hadPreviews.current = Object.keys(previews).length > 0;
  }, [previews]);
  useEffect(() => {
    const restore = () => {
      if (!hadPreviews.current) return;
      hadPreviews.current = false;
      setPreviews({});
      window.dispatchEvent(new CustomEvent("ur:cosmetics-changed"));
    };
    if (!open) restore();
    return restore;
  }, [open]);

  const equip = (sku: CosmeticSku) => {
    const key = LOADOUT_KEY_FOR_CATEGORY[sku.category];
    const current = loadCosmetics();
    saveCosmetics({ loadout: { ...current.loadout, [key]: sku.id }, devGrants: current.devGrants });
    // Equipping supersedes a preview in that slot.
    setPreviews((prev) => {
      if (prev[sku.category] === undefined) return prev;
      const next = { ...prev };
      delete next[sku.category];
      return next;
    });
  };

  const togglePreview = (sku: CosmeticSku) => {
    setPreviews((prev) => {
      const next = { ...prev };
      if (next[sku.category] === sku.id) delete next[sku.category];
      else next[sku.category] = sku.id;
      return next;
    });
  };

  const allUnlocked = useMemo(() => ALL_PAID_SKUS.every((id) => owned.has(id)), [owned]);

  const startCheckout = () => {
    if (buying) return;
    setBuying(true);
    setBuyError(null);
    void (async () => {
      try {
        const token = await ensureSession();
        const res = await fetch("/api/cosmetics/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "checkout failed");
        window.location.href = data.url;
      } catch (e) {
        setBuyError(e instanceof Error ? e.message : "checkout failed");
        setBuying(false);
      }
    })();
  };

  /** Purchase intent: emailed players go straight to payment; guests first
   * get the account step — create (keeps the same uid, so nothing is lost),
   * sign in, or knowingly continue browser-bound. */
  /**
   * @param skinId Which card the intent came from — the sellable SKU the
   * player clicked, or `unlock_all` for the banner. Catalog ids only; never
   * anything the player typed.
   */
  const buyAll = (skinId: string) => {
    // Purchase *intent*, not checkout: guests go through the account step
    // below first, and every paid SKU shares this one unlock-all product.
    trackSkinClick(skinId, UNLOCK_ALL_PRICE_USD);
    if (buying) return;
    setBuyError(null);
    if (isGuest) {
      setAcctError(null);
      setAcctMode("signup");
      setAccountStep("purchase");
      return;
    }
    startCheckout();
  };

  const submitAccount = () => {
    if (acctBusy) return;
    setAcctBusy(true);
    setAcctError(null);
    void (async () => {
      try {
        const snap =
          acctMode === "signup"
            ? await signUpWithEmail(acctEmail, acctPassword)
            : await signInWithEmail(acctEmail, acctPassword);
        if (!snap.user) throw new Error("could not establish the account");
        setIsGuest(Boolean(snap.user.isAnonymous));
        setAcctPassword("");
        const wasPurchase = accountStep === "purchase";
        setAccountStep(null);
        // Signing in can switch identity — re-pull what that profile owns.
        void fetchEntitlements().then(setServerOwned);
        if (wasPurchase) startCheckout();
      } catch (e) {
        const message = e instanceof Error ? e.message : "something went wrong";
        setAcctError(
          acctMode === "signup" && /registered|already|exists/i.test(message)
            ? `${message} — try “Sign in instead” below.`
            : message,
        );
      } finally {
        setAcctBusy(false);
      }
    })();
  };

  // Dev-only bulk unlock: routes through the same hard-gated API as single
  // grants (404s outside development), so this button can ship harmlessly.
  const devMode = process.env.NODE_ENV === "development";
  const lockedSkus = useMemo(() => CATALOG.filter((s) => !owned.has(s.id)), [owned]);
  const unlockAll = async () => {
    setUnlocking(true);
    try {
      for (const sku of lockedSkus) await grantDevSku(sku.id);
    } finally {
      setUnlocking(false);
    }
  };
  const resetUnlocks = () => {
    const current = loadCosmetics();
    saveCosmetics({ loadout: current.loadout, devGrants: [] });
  };

  const previewCount = Object.keys(previews).length;
  const items = useMemo(() => CATALOG.filter((entry) => entry.category === tab), [tab]);
  const previewFlair = previews.flair ?? resolved.flair;

  return (
    <Modal
      open={open}
      title="Store"
      onClose={onClose}
      actions={
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      {open ? <LivePreview flair={previewFlair} /> : null}

      {!allUnlocked && accountStep === null ? (
        <div className="card card--gilded mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
          <div className="min-w-0">
            <div className="font-display text-sm text-[var(--gold)]">Unlock everything — ${UNLOCK_ALL_PRICE_USD.toFixed(2)}</div>
            <div className="text-[11px] leading-snug text-[var(--ink-dim)]">
              Every board, dice set, piece set &amp; flair. One purchase, yours forever. Never pay-to-win.
            </div>
          </div>
          <button
            className="btn btn-primary shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
            disabled={buying}
            onClick={() => buyAll("unlock_all")}
          >
            {buying ? "Opening…" : "Unlock all"}
          </button>
        </div>
      ) : null}

      {allUnlocked && isGuest && accountStep === null ? (
        <div className="card card--gilded mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
          <div className="min-w-0">
            <div className="font-display text-sm text-[var(--gold)]">Secure your unlocks</div>
            <div className="text-[11px] leading-snug text-[var(--ink-dim)]">
              They&apos;re tied to this browser right now — add an email to keep them on every device.
            </div>
          </div>
          <button
            className="btn btn-primary shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
            onClick={() => {
              setAcctError(null);
              setAcctMode("signup");
              setAccountStep("secure");
            }}
          >
            Add email
          </button>
        </div>
      ) : null}

      {accountStep !== null ? (
        <form
          className="card card--gilded mt-3 flex flex-col gap-2 rounded-xl px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            submitAccount();
          }}
        >
          <div className="font-display text-sm text-[var(--gold)]">
            {accountStep === "purchase" ? "Keep your unlocks forever" : "Secure your unlocks"}
          </div>
          <div className="text-[11px] leading-snug text-[var(--ink-dim)]">
            {acctMode === "signup"
              ? "One step before payment: an email makes your purchase yours on every device — your games and rating carry over too."
              : "Sign in and the purchase binds to your existing account."}
          </div>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            className="btn rounded-lg px-3 py-2 text-sm"
            value={acctEmail}
            onChange={(e) => setAcctEmail(e.target.value)}
            required
          />
          <input
            type="password"
            autoComplete={acctMode === "signup" ? "new-password" : "current-password"}
            placeholder="Password (6+ characters)"
            className="btn rounded-lg px-3 py-2 text-sm"
            value={acctPassword}
            onChange={(e) => setAcctPassword(e.target.value)}
            minLength={6}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1 rounded-lg px-3 py-2 text-xs font-medium" disabled={acctBusy}>
              {acctBusy
                ? "…"
                : accountStep === "purchase"
                  ? acctMode === "signup"
                    ? "Create account & continue"
                    : "Sign in & continue"
                  : acctMode === "signup"
                    ? "Create account"
                    : "Sign in"}
            </button>
            <button type="button" className="btn rounded-lg px-3 py-2 text-xs" onClick={() => setAccountStep(null)}>
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-[11px] text-[var(--ink-dim)] underline decoration-dotted underline-offset-2"
              onClick={() => {
                setAcctError(null);
                setAcctMode(acctMode === "signup" ? "signin" : "signup");
              }}
            >
              {acctMode === "signup" ? "Already have an account? Sign in instead" : "New here? Create an account"}
            </button>
            {accountStep === "purchase" ? (
              <button
                type="button"
                className="text-[11px] text-[var(--ink-dim)] underline decoration-dotted underline-offset-2"
                title="Unlocks will only exist in this browser until you add an email"
                onClick={() => {
                  setAccountStep(null);
                  startCheckout();
                }}
              >
                Skip — continue as guest (this browser only)
              </button>
            ) : null}
          </div>
          {acctError ? <p className="text-xs text-[var(--danger)]">{acctError}</p> : null}
        </form>
      ) : null}
      {buyError ? <p className="mt-2 text-xs text-[var(--danger)]">{buyError}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <div role="tablist" aria-label="Cosmetic category" className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`atelier-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`atelier-panel-${t.id}`}
              className={[
                "btn rounded-lg px-3 py-1 text-xs",
                tab === t.id ? "ring-1 ring-[var(--gold)] text-[var(--gold)]" : "",
              ].join(" ")}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {devMode ? (
          <span className="ml-auto flex gap-1.5">
            {lockedSkus.length > 0 ? (
              <button className="btn rounded-lg px-2.5 py-1 text-[10px]" disabled={unlocking} onClick={() => void unlockAll()}>
                {unlocking ? "Unlocking…" : "Unlock all (dev)"}
              </button>
            ) : (
              <button className="btn rounded-lg px-2.5 py-1 text-[10px]" onClick={resetUnlocks}>
                Reset unlocks (dev)
              </button>
            )}
          </span>
        ) : null}
      </div>

      {previewCount > 0 ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--gold-soft)] bg-[var(--gold-faint)] px-2.5 py-1.5 text-[11px] text-[var(--gold)]">
          <span>
            Previewing {previewCount} item{previewCount === 1 ? "" : "s"} — not equipped yet.
          </span>
          <button
            className="shrink-0 underline decoration-dotted underline-offset-2"
            onClick={() => {
              setPreviews({});
              window.dispatchEvent(new CustomEvent("ur:cosmetics-changed"));
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`atelier-panel-${tab}`}
        aria-labelledby={`atelier-tab-${tab}`}
        className="mt-3 max-h-[38vh] overflow-y-auto pr-0.5"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((sku) => {
            const loadoutKey = LOADOUT_KEY_FOR_CATEGORY[sku.category];
            return (
              <SkuCard
                key={sku.id}
                sku={sku}
                owned={owned.has(sku.id)}
                equipped={resolved[loadoutKey] === sku.id}
                previewing={previews[sku.category] === sku.id}
                onEquip={() => equip(sku)}
                onPreview={() => togglePreview(sku)}
                onBuyAll={() => buyAll(sku.id)}
              />
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
