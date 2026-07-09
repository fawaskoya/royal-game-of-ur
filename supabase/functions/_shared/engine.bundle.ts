// packages/engine/src/constants.ts
var ENGINE_VERSION = "0.1.0";
var STATE_FORMAT = "ur-state@1";
var REPLAY_FORMAT = "ur-replay@1";
var PLAYERS = [0, 1];
var START_INDEX = 0;
var DICE_PROBABILITIES = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
function otherPlayer(p) {
  return p === 0 ? 1 : 0;
}

// packages/engine/src/errors.ts
var UrEngineError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "UrEngineError";
  }
};

// packages/engine/src/board.ts
function cellKey(cell) {
  return `${cell.row},${cell.col}`;
}
var FINKEL_TRACK_LIGHT = [
  { row: 2, col: 3 },
  { row: 2, col: 2 },
  { row: 2, col: 1 },
  { row: 2, col: 0 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 1, col: 4 },
  { row: 1, col: 5 },
  { row: 1, col: 6 },
  { row: 1, col: 7 },
  { row: 2, col: 7 },
  { row: 2, col: 6 }
];
var FINKEL_ROSETTES = /* @__PURE__ */ new Set(["0,0", "2,0", "1,3", "0,6", "2,6"]);
function mirrorForDark(cell) {
  if (cell.row === 1) return cell;
  return { row: cell.row === 0 ? 2 : 0, col: cell.col };
}
function buildFinkelLayout() {
  const tracks = [
    FINKEL_TRACK_LIGHT,
    FINKEL_TRACK_LIGHT.map(mirrorForDark)
  ];
  const pathLength = FINKEL_TRACK_LIGHT.length;
  const startIndex = 0;
  const finishIndex = pathLength + 1;
  const cellAt = (player, index) => {
    if (index < 1 || index > pathLength) return null;
    return tracks[player][index - 1] ?? null;
  };
  const keyAt = (player, index) => {
    const cell = cellAt(player, index);
    return cell === null ? null : cellKey(cell);
  };
  const isRosette = (player, index) => {
    const key = keyAt(player, index);
    return key !== null && FINKEL_ROSETTES.has(key);
  };
  const isShared = (index) => {
    const a = keyAt(0, index);
    return a !== null && a === keyAt(1, index);
  };
  const byKey = /* @__PURE__ */ new Map();
  for (const player of [0, 1]) {
    for (let index = 1; index <= pathLength; index++) {
      const cell = cellAt(player, index);
      const key = cellKey(cell);
      const entry = byKey.get(key) ?? { cell, pathIndex: [null, null] };
      entry.pathIndex[player] = index;
      byKey.set(key, entry);
    }
  }
  const cells = [...byKey.values()].map(({ cell, pathIndex }) => ({
    cell,
    key: cellKey(cell),
    rosette: FINKEL_ROSETTES.has(cellKey(cell)),
    shared: pathIndex[0] !== null && pathIndex[1] !== null,
    pathIndex
  })).sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col);
  const sharedRosetteIndices = [];
  for (let index = 1; index <= pathLength; index++) {
    if (isShared(index) && isRosette(0, index)) sharedRosetteIndices.push(index);
  }
  return {
    pathId: "finkel",
    pathLength,
    startIndex,
    finishIndex,
    rows: 3,
    cols: 8,
    cells,
    cellAt,
    keyAt,
    isRosette,
    isShared,
    sharedRosetteIndices
  };
}
var LAYOUTS = {
  finkel: buildFinkelLayout()
};
function getLayout(ruleset) {
  const pathId = typeof ruleset === "string" ? ruleset : ruleset.pathId;
  return LAYOUTS[pathId];
}

// packages/engine/src/ruleset.ts
var FINKEL_RULESET = Object.freeze({
  id: "finkel",
  name: "Classic \u2014 Irving Finkel / British Museum",
  piecesPerPlayer: 7,
  diceCount: 4,
  pathId: "finkel",
  rosettesGrantExtraTurn: true,
  safeRosettes: true,
  exactBearOff: true
});
var TOURNAMENT_RULESET = Object.freeze({
  ...FINKEL_RULESET,
  id: "tournament",
  name: "Tournament"
});
var RULESET_PRESETS = Object.freeze({
  finkel: FINKEL_RULESET,
  tournament: TOURNAMENT_RULESET
});
function validateRuleset(ruleset) {
  const fail = (message) => {
    throw new UrEngineError("INVALID_RULESET", message);
  };
  if (!ruleset.id) fail("ruleset.id is required");
  if (!Number.isInteger(ruleset.piecesPerPlayer) || ruleset.piecesPerPlayer < 1 || ruleset.piecesPerPlayer > 10) {
    fail(`piecesPerPlayer must be an integer in 1..10, got ${ruleset.piecesPerPlayer}`);
  }
  if (!Number.isInteger(ruleset.diceCount) || ruleset.diceCount < 1 || ruleset.diceCount > 8) {
    fail(`diceCount must be an integer in 1..8, got ${ruleset.diceCount}`);
  }
  if (ruleset.pathId !== "finkel") {
    fail(`unknown pathId "${String(ruleset.pathId)}" (available: finkel)`);
  }
}
function createRuleset(overrides) {
  const ruleset = Object.freeze({ ...FINKEL_RULESET, ...overrides });
  validateRuleset(ruleset);
  return ruleset;
}

// packages/engine/src/dice.ts
function createRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },
    getState: () => a >>> 0,
    setState(state) {
      a = state >>> 0;
    }
  };
}
function rollDice(rng, diceCount = 4) {
  const values = [];
  for (let i = 0; i < diceCount; i++) values.push(rng.next() < 0.5 ? 0 : 1);
  return { values, total: values.reduce((sum, v) => sum + v, 0) };
}
function makeRoll(total, diceCount = 4) {
  if (!Number.isInteger(total) || total < 0 || total > diceCount) {
    throw new UrEngineError("INVALID_ROLL", `roll total must be an integer in 0..${diceCount}, got ${total}`);
  }
  const values = [];
  for (let i = 0; i < diceCount; i++) values.push(i < total ? 1 : 0);
  return { values, total };
}
function validateDiceRoll(roll, diceCount) {
  if (!roll || !Array.isArray(roll.values) || roll.values.length !== diceCount) {
    throw new UrEngineError("INVALID_ROLL", `expected ${diceCount} die values`);
  }
  let sum = 0;
  for (const v of roll.values) {
    if (v !== 0 && v !== 1) throw new UrEngineError("INVALID_ROLL", `die values must be 0 or 1, got ${String(v)}`);
    sum += v;
  }
  if (roll.total !== sum) {
    throw new UrEngineError("INVALID_ROLL", `roll total ${roll.total} does not match values (sum ${sum})`);
  }
}
function rollDistribution(diceCount = 4) {
  const dist = [];
  let c = 1;
  for (let k = 0; k <= diceCount; k++) {
    dist.push(c / 2 ** diceCount);
    c = c * (diceCount - k) / (k + 1);
  }
  return dist;
}

// packages/engine/src/state.ts
function createGame(ruleset = FINKEL_RULESET) {
  validateRuleset(ruleset);
  const start = () => Array.from({ length: ruleset.piecesPerPlayer }, () => 0);
  return {
    ruleset,
    positions: [start(), start()],
    current: 0,
    dice: null,
    winner: null,
    rollCount: 0,
    history: []
  };
}
function phaseOf(state) {
  if (state.winner !== null) return "game-over";
  return state.dice === null ? "awaiting-roll" : "awaiting-move";
}
function occupancy(state) {
  const layout = getLayout(state.ruleset);
  const map = /* @__PURE__ */ new Map();
  for (const player of PLAYERS) {
    state.positions[player].forEach((index, piece) => {
      const key = layout.keyAt(player, index);
      if (key !== null) map.set(key, { player, piece });
    });
  }
  return map;
}
function finishedCount(state, player) {
  const finish = getLayout(state.ruleset).finishIndex;
  return state.positions[player].filter((index) => index === finish).length;
}
function startCount(state, player) {
  return state.positions[player].filter((index) => index === 0).length;
}
function serializeState(state) {
  const payload = {
    format: STATE_FORMAT,
    engine: ENGINE_VERSION,
    ruleset: state.ruleset,
    positions: state.positions,
    current: state.current,
    dice: state.dice,
    winner: state.winner,
    rollCount: state.rollCount,
    history: state.history
  };
  return JSON.stringify(payload);
}
function deserializeState(json) {
  const fail = (message) => {
    throw new UrEngineError("INVALID_STATE", message);
  };
  let raw;
  try {
    raw = JSON.parse(json);
  } catch {
    return fail("state payload is not valid JSON");
  }
  const p = raw;
  if (p.format !== STATE_FORMAT) return fail(`unknown state format ${String(p.format)}`);
  if (!p.ruleset) return fail("missing ruleset");
  validateRuleset(p.ruleset);
  const layout = getLayout(p.ruleset);
  if (!Array.isArray(p.positions) || p.positions.length !== 2) return fail("positions must have two sides");
  for (const side of p.positions) {
    if (!Array.isArray(side) || side.length !== p.ruleset.piecesPerPlayer) {
      return fail(`each side must have ${p.ruleset.piecesPerPlayer} pieces`);
    }
    for (const index of side) {
      if (!Number.isInteger(index) || index < 0 || index > layout.finishIndex) {
        return fail(`piece index ${String(index)} out of range 0..${layout.finishIndex}`);
      }
    }
  }
  if (p.current !== 0 && p.current !== 1) return fail("current player must be 0 or 1");
  if (p.winner !== null && p.winner !== 0 && p.winner !== 1) return fail("winner must be null, 0, or 1");
  if (!Number.isInteger(p.rollCount) || p.rollCount < 0) return fail("rollCount must be a non-negative integer");
  if (!Array.isArray(p.history)) return fail("history must be an array");
  if (p.dice !== null && p.dice !== void 0) validateDiceRoll(p.dice, p.ruleset.diceCount);
  const state = {
    ruleset: p.ruleset,
    positions: [[...p.positions[0]], [...p.positions[1]]],
    current: p.current,
    dice: p.dice ?? null,
    winner: p.winner ?? null,
    rollCount: p.rollCount,
    history: [...p.history]
  };
  const seen = /* @__PURE__ */ new Set();
  for (const player of PLAYERS) {
    for (const index of state.positions[player]) {
      const key = layout.keyAt(player, index);
      if (key === null) continue;
      if (seen.has(key)) return fail(`two pieces occupy square ${key}`);
      seen.add(key);
    }
  }
  return state;
}

// packages/engine/src/rules.ts
function legalMoves(state) {
  if (phaseOf(state) !== "awaiting-move") return [];
  const roll = state.dice.total;
  if (roll === 0) return [];
  const layout = getLayout(state.ruleset);
  const occ = occupancy(state);
  const player = state.current;
  const moves = [];
  let entryListed = false;
  state.positions[player].forEach((from, piece) => {
    if (from === layout.finishIndex) return;
    if (from === layout.startIndex) {
      if (entryListed) return;
      entryListed = true;
    }
    const rawTo = from + roll;
    if (rawTo > layout.finishIndex && state.ruleset.exactBearOff) return;
    const to = Math.min(rawTo, layout.finishIndex);
    if (to !== layout.finishIndex) {
      const occupant = occ.get(layout.keyAt(player, to));
      if (occupant) {
        if (occupant.player === player) return;
        if (state.ruleset.safeRosettes && layout.isRosette(player, to)) return;
      }
    }
    moves.push({ player, piece, from, to });
  });
  return moves;
}
function validateMove(state, move) {
  const reject = (code, message) => ({ ok: false, code, message });
  if (state.winner !== null) return reject("GAME_OVER", "The game is over.");
  if (state.dice === null) return reject("DICE_NOT_ROLLED", "Roll the dice before moving.");
  if (move.player !== state.current) return reject("NOT_YOUR_TURN", `It is player ${state.current}'s turn.`);
  const layout = getLayout(state.ruleset);
  if (!Number.isInteger(move.piece) || move.piece < 0 || move.piece >= state.ruleset.piecesPerPlayer) {
    return reject("INVALID_PIECE", `Piece must be in 0..${state.ruleset.piecesPerPlayer - 1}.`);
  }
  const actualFrom = state.positions[move.player][move.piece];
  if (actualFrom !== move.from) {
    return reject("STALE_MOVE", `Piece ${move.piece} is at ${actualFrom}, not ${move.from}.`);
  }
  if (actualFrom === layout.finishIndex) return reject("PIECE_FINISHED", "That piece has already been borne off.");
  const roll = state.dice.total;
  if (roll === 0) return reject("ZERO_ROLL", "A roll of zero cannot move.");
  const rawTo = actualFrom + roll;
  if (rawTo > layout.finishIndex && state.ruleset.exactBearOff) {
    return reject("EXACT_ROLL_REQUIRED", "Bearing off requires the exact throw.");
  }
  const to = Math.min(rawTo, layout.finishIndex);
  if (to !== move.to) return reject("BAD_TARGET", `A roll of ${roll} moves this piece to ${to}, not ${move.to}.`);
  if (to !== layout.finishIndex) {
    const occupant = occupancy(state).get(layout.keyAt(move.player, to));
    if (occupant) {
      if (occupant.player === move.player) {
        return reject("BLOCKED_BY_OWN_PIECE", "One of your own pieces is on that square.");
      }
      if (state.ruleset.safeRosettes && layout.isRosette(move.player, to)) {
        return reject("SQUARE_PROTECTED", "A piece on that rosette cannot be captured.");
      }
    }
  }
  return { ok: true, move: { player: move.player, piece: move.piece, from: actualFrom, to } };
}
function withRoll(state, roll) {
  if (state.winner !== null) throw new UrEngineError("GAME_OVER", "cannot roll: the game is over");
  if (state.dice !== null) throw new UrEngineError("NOT_AWAITING_ROLL", "cannot roll: a move is pending");
  validateDiceRoll(roll, state.ruleset.diceCount);
  return {
    ...state,
    dice: roll,
    rollCount: state.rollCount + 1,
    history: [...state.history, { type: "roll", player: state.current, values: roll.values, total: roll.total }]
  };
}
function withPass(state, reason) {
  if (state.dice === null) throw new UrEngineError("NOT_AWAITING_ROLL", "cannot pass: no roll is pending");
  return {
    ...state,
    dice: null,
    current: otherPlayer(state.current),
    history: [...state.history, { type: "pass", player: state.current, reason }]
  };
}
function withMove(state, move) {
  const layout = getLayout(state.ruleset);
  const player = move.player;
  const opponent = otherPlayer(player);
  const positions = [[...state.positions[0]], [...state.positions[1]]];
  positions[player][move.piece] = move.to;
  let capture = null;
  if (move.to !== layout.finishIndex) {
    const key = layout.keyAt(player, move.to);
    const capturedPiece = state.positions[opponent].findIndex(
      (index) => layout.keyAt(opponent, index) === key
    );
    if (capturedPiece !== -1) {
      positions[opponent][capturedPiece] = layout.startIndex;
      capture = { player: opponent, piece: capturedPiece };
    }
  }
  const rosette = move.to !== layout.finishIndex && layout.isRosette(player, move.to);
  const finished = move.to === layout.finishIndex;
  const winner = positions[player].every((index) => index === layout.finishIndex) ? player : null;
  const extraTurn = winner === null && rosette && state.ruleset.rosettesGrantExtraTurn;
  const event = {
    type: "move",
    player,
    piece: move.piece,
    from: move.from,
    to: move.to,
    capture,
    rosette,
    extraTurn,
    finished
  };
  return {
    ...state,
    positions,
    dice: null,
    current: winner !== null || extraTurn ? player : opponent,
    winner,
    history: [...state.history, event]
  };
}
function applyRoll(state, roll) {
  let next = withRoll(state, roll);
  if (legalMoves(next).length === 0) {
    next = withPass(next, roll.total === 0 ? "rolled-zero" : "no-legal-moves");
  }
  return next;
}
function applyMove(state, move) {
  const validation = validateMove(state, move);
  if (!validation.ok) {
    throw new UrEngineError("ILLEGAL_MOVE", `${validation.message} [${validation.code}]`);
  }
  return withMove(state, validation.move);
}
function movablePieces(state) {
  return legalMoves(state);
}
function winnerOf(state) {
  return state.winner;
}

// packages/engine/src/replay.ts
function buildStateFromEvents(ruleset, events) {
  const mismatch = (index, message) => {
    throw new UrEngineError("REPLAY_MISMATCH", `event ${index}: ${message}`);
  };
  let state = createGame(ruleset);
  events.forEach((event, index) => {
    switch (event.type) {
      case "roll": {
        if (event.player !== state.current) {
          mismatch(index, `roll recorded for player ${event.player} but it is player ${state.current}'s turn`);
        }
        state = withRoll(state, { values: event.values, total: event.total });
        break;
      }
      case "pass": {
        if (event.player !== state.current) {
          mismatch(index, `pass recorded for player ${event.player} but it is player ${state.current}'s turn`);
        }
        if (state.dice === null) mismatch(index, "pass recorded with no pending roll");
        if (legalMoves(state).length > 0) mismatch(index, "pass recorded but legal moves existed");
        const expectedReason = state.dice.total === 0 ? "rolled-zero" : "no-legal-moves";
        if (event.reason !== expectedReason) {
          mismatch(index, `pass reason "${event.reason}" but expected "${expectedReason}"`);
        }
        state = withPass(state, event.reason);
        break;
      }
      case "move": {
        const validation = validateMove(state, {
          player: event.player,
          piece: event.piece,
          from: event.from,
          to: event.to
        });
        if (!validation.ok) {
          throw new UrEngineError(
            "REPLAY_MISMATCH",
            `event ${index}: illegal move: ${validation.message} [${validation.code}]`
          );
        }
        state = withMove(state, validation.move);
        const applied = state.history[state.history.length - 1];
        if (applied.type !== "move") mismatch(index, "internal: applied event is not a move");
        const recorded = event;
        const actual = applied;
        const captureMatches = actual.capture === null || recorded.capture === null ? actual.capture === recorded.capture : actual.capture.player === recorded.capture.player && actual.capture.piece === recorded.capture.piece;
        if (actual.rosette !== recorded.rosette || actual.extraTurn !== recorded.extraTurn || actual.finished !== recorded.finished || !captureMatches) {
          mismatch(index, "recorded move outcome differs from the rules engine's outcome");
        }
        break;
      }
      default:
        mismatch(index, `unknown event type ${String(event.type)}`);
    }
  });
  return state;
}
function undoLastRoll(state) {
  const lastRoll = state.history.map((e) => e.type).lastIndexOf("roll");
  if (lastRoll === -1) return createGame(state.ruleset);
  return buildStateFromEvents(state.ruleset, state.history.slice(0, lastRoll));
}
function exportReplay(state, meta = {}) {
  return {
    format: REPLAY_FORMAT,
    engine: ENGINE_VERSION,
    ruleset: state.ruleset,
    events: state.history,
    meta: { createdAt: (/* @__PURE__ */ new Date()).toISOString(), ...meta }
  };
}
function serializeReplay(state, meta = {}) {
  return JSON.stringify(exportReplay(state, meta));
}
function importReplay(payload) {
  const fail = (message) => {
    throw new UrEngineError("INVALID_REPLAY", message);
  };
  let raw = payload;
  if (typeof payload === "string") {
    try {
      raw = JSON.parse(payload);
    } catch {
      return fail("replay payload is not valid JSON");
    }
  }
  const replay = raw;
  if (replay.format !== REPLAY_FORMAT) return fail(`unknown replay format ${String(replay.format)}`);
  if (!replay.ruleset) return fail("missing ruleset");
  validateRuleset(replay.ruleset);
  if (!Array.isArray(replay.events)) return fail("events must be an array");
  return {
    format: REPLAY_FORMAT,
    engine: typeof replay.engine === "string" ? replay.engine : "unknown",
    ruleset: replay.ruleset,
    events: replay.events,
    meta: replay.meta ?? {}
  };
}
function replayStateAt(replay, eventCount) {
  const events = eventCount === void 0 ? replay.events : replay.events.slice(0, eventCount);
  return buildStateFromEvents(replay.ruleset, events);
}

// packages/engine/src/session.ts
var GameSession = class _GameSession {
  seed;
  #rng;
  #state;
  constructor(options = {}) {
    this.seed = options.seed ?? Math.floor(Math.random() * 2147483647);
    this.#rng = createRng(this.seed);
    this.#state = createGame(options.ruleset ?? FINKEL_RULESET);
  }
  get state() {
    return this.#state;
  }
  get phase() {
    return phaseOf(this.#state);
  }
  legalMoves() {
    return legalMoves(this.#state);
  }
  /** Roll with the session RNG. May auto-pass; inspect the new state's history tail. */
  roll() {
    this.#state = applyRoll(this.#state, rollDice(this.#rng, this.#state.ruleset.diceCount));
    return this.#state;
  }
  move(move) {
    this.#state = applyMove(this.#state, move);
    return this.#state;
  }
  /** Rewind to just before the most recent roll. */
  undo() {
    this.#state = undoLastRoll(this.#state);
    return this.#state;
  }
  /**
   * Rewind until the given player is about to roll — "take back my turn"
   * for a human playing an AI. Rewinds at least one roll.
   */
  undoToPlayerRoll(player, maxSteps = 64) {
    let steps = 0;
    do {
      if (this.#state.history.length === 0) break;
      if (++steps > maxSteps) throw new UrEngineError("INVALID_STATE", "undo exceeded maxSteps");
      this.#state = undoLastRoll(this.#state);
    } while (!(this.phase === "awaiting-roll" && this.#state.current === player) && this.#state.history.length > 0);
    return this.#state;
  }
  /** Exact save: state plus RNG position, so resumed sessions roll the same future dice. */
  serialize() {
    const snapshot = {
      format: "ur-session@1",
      seed: this.seed,
      rngState: this.#rng.getState(),
      state: serializeState(this.#state)
    };
    return JSON.stringify(snapshot);
  }
  static deserialize(json) {
    let snapshot;
    try {
      snapshot = JSON.parse(json);
    } catch {
      throw new UrEngineError("INVALID_STATE", "session payload is not valid JSON");
    }
    if (snapshot.format !== "ur-session@1") {
      throw new UrEngineError("INVALID_STATE", `unknown session format ${String(snapshot.format)}`);
    }
    const state = deserializeState(snapshot.state);
    const session = new _GameSession({ ruleset: state.ruleset, seed: snapshot.seed });
    session.#state = state;
    session.#rng.setState(snapshot.rngState);
    return session;
  }
};
export {
  DICE_PROBABILITIES,
  ENGINE_VERSION,
  FINKEL_RULESET,
  GameSession,
  PLAYERS,
  REPLAY_FORMAT,
  RULESET_PRESETS,
  START_INDEX,
  STATE_FORMAT,
  TOURNAMENT_RULESET,
  UrEngineError,
  applyMove,
  applyRoll,
  buildStateFromEvents,
  cellKey,
  createGame,
  createRng,
  createRuleset,
  deserializeState,
  exportReplay,
  finishedCount,
  getLayout,
  importReplay,
  legalMoves,
  makeRoll,
  movablePieces,
  occupancy,
  otherPlayer,
  phaseOf,
  replayStateAt,
  rollDice,
  rollDistribution,
  serializeReplay,
  serializeState,
  startCount,
  undoLastRoll,
  validateDiceRoll,
  validateMove,
  validateRuleset,
  winnerOf
};
