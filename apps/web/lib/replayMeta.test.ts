import { describe, expect, it } from "vitest";
import { replayControllers } from "./replayMeta";

describe("replayControllers", () => {
  it("labels the machine's seat in a game against the AI", () => {
    expect(replayControllers({ mode: { kind: "ai", human: 0, difficulty: "hard" } })).toEqual(["human", "hard"]);
    expect(replayControllers({ mode: { kind: "ai", human: 1, difficulty: "easy" } })).toEqual(["easy", "human"]);
  });

  it("labels both engines in AI-vs-AI games", () => {
    expect(replayControllers({ mode: { kind: "watch", light: "expert", dark: "medium" } })).toEqual(["expert", "medium"]);
  });

  it("falls back to human seats for pvp, online, shared links and malformed meta", () => {
    expect(replayControllers({ mode: { kind: "pvp" } })).toEqual(["human", "human"]);
    expect(replayControllers({ mode: { kind: "online", mySeat: 0, opponent: "x" } })).toEqual(["human", "human"]);
    expect(replayControllers({ shared: true })).toEqual(["human", "human"]);
    expect(replayControllers(undefined)).toEqual(["human", "human"]);
    expect(replayControllers({ mode: { kind: "ai", human: 0, difficulty: "godlike" } })).toEqual(["human", "human"]);
    expect(replayControllers({ mode: { kind: "ai", human: 2, difficulty: "hard" } })).toEqual(["human", "human"]);
    expect(replayControllers({ mode: "ai" })).toEqual(["human", "human"]);
  });
});
