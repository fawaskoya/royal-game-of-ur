# App Structure & Settings

## Shell

Single-page app (`app/page.tsx` → `GameApp`):

```
Menu (GameApp)
├─ Continue game        (only when a valid save exists — persistence)
├─ Play the machine     (difficulty select: 6 tiers + seat)
├─ Two players          (pass and play)
├─ Watch AI vs AI       (engine pairing)
├─ Stats                (StatsPanel modal — local results summary)
├─ Settings             (SettingsPanel modal)
└─ Begin                (confirms if it would replace a save)
     └─ GameView        (board, panels, dice, hint, history, win overlay)
```

`GameView` returns to the menu via ‹ Menu; a live game keeps its auto-save, so the Continue
card reappears. Tutorial (How to play) joins the menu in Phase 5.

## Settings (`lib/settings.ts`)

Versioned under `ur:settings` (v1); corrupt/unknown → defaults; storage failure → in-memory.
`useSettings()` keeps all consumers in sync via a window event; changes apply live.

| Setting | Values | Effect |
|---|---|---|
| `orientation` | `auto` \| `vertical` \| `horizontal` | Auto: touch follows OS rotation, desktop uses the header toggle. Pinned: forces the layout everywhere (the desktop toggle pins; Settings can un-pin back to Auto). |
| `hints` | on/off | Shows/hides the Hint button and H shortcut. |
| `confirmNew` | on/off | Skip or show the New-Game confirmation modals. |
| `motion` | `system` \| `reduced` | `system` = respect `prefers-reduced-motion`; `reduced` = always reduce (MotionConfig `always`). |

Precedence for layout: `?layout=` test override → pinned setting → auto (touch rotation /
desktop toggle default vertical).

## Storage keys

| Key | Contents | Owner |
|---|---|---|
| `ur:save` | Active game (versioned; engine `ur-session@1` inside) | `lib/persistence/*` |
| `ur:results` | Match results, capped at 200 (v1) | `lib/stats/matchResults.ts` |
| `ur:settings` | Settings v1 | `lib/settings.ts` |
| `ur:tutorial` | Tutorial progress (Phase 5) | tutorial module |

All stores: versioned, validated on read, fail-closed, never throw.
