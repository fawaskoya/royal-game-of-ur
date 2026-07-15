# Cosmetics Sprint — Task Board

Statuses: `todo | doing | done | blocked`. Orchestrator updates between waves; agents update
their own row on completion (keep one line per task).

## Wave 0 — Bootstrap (orchestrator)
| Task | Status |
| --- | --- |
| CONTRACT.md locked | done |
| TASK_BOARD.md + WAVE_LOG.md created | done |
| 9 cosmetics agent definitions | done |
| Loops 20-30 written | done |

## Wave 1 — Decide + Create (parallel)
| Task | Loop | Agent | Status |
| --- | --- | --- | --- |
| Commerce route decision -> COSMETICS_AND_COMMERCE.md | 20 | cosmetics-commerce-agent | done |
| Creative catalog -> COSMETICS_CATALOG.md | 21 | cosmetics-creative-agent | done |

## Wave 2 — Domain foundation (serial)
| Task | Loop | Agent | Status |
| --- | --- | --- | --- |
| lib/cosmetics module + unit tests | 22 | cosmetics-domain-agent | done |

## Wave 3 — Presentation (parallel)
| Task | Loop | Agent | Status |
| --- | --- | --- | --- |
| Skin token packs + indirection tokens | 23 | cosmetics-visual-agent | done |
| AtelierPanel + menu entry | 24 | cosmetics-atelier-ui-agent | done |

## Wave 4 — Backend ownership (parallel)
| Task | Loop | Agent | Status |
| --- | --- | --- | --- |
| Entitlements migration 0007 (draft only) + client read | 25 | orchestrator (inline; agents died to session limits) | done |
| Test checkout + dev grants | 26 | orchestrator (inline) | done |
| Flair on identity surfaces | 27 | orchestrator (inline) | done |

## Wave 5 — Integrate + harden
| Task | Loop | Agent | Status |
| --- | --- | --- | --- |
| CosmeticsEffect end-to-end pipeline | 28 | orchestrator (inline) | done |
| Tests + safety attestation | 29 | orchestrator (inline) | done |
| Docs + changelog | 30 | orchestrator (inline) | done |

## Wave 6 — Orchestrator stop
| Task | Status |
| --- | --- |
| Final human report (no push, no prod) | done |

## Blocked / needs human
| Item | Why |
| --- | --- |
| Dodo dashboard: business verification + PWYW/product creation | account actions are human-only |
| Production anything | requires exact unlock phrase per mega-prompt |
