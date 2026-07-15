/**
 * Barrel for the cosmetics domain module. Named exports only — consumers
 * (Atelier UI, visual skins, integration effect) should import from
 * `@/lib/cosmetics` rather than reaching into individual files.
 */
export * from "./types";
export * from "./catalog";
export * from "./freeGrants";
export * from "./resolveLoadout";
export * from "./storage";
export * from "./tokens";
export * from "./entitlementsClient";
export * from "./devGrants";
