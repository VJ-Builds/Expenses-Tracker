/**
 * Wrong Way: Don't be mad - Core Board Logic & Pathfinding Engine
 * BFS traversal, Quoridor jumping mechanics, wall geometry & connectivity validation,
 * steel wall rules, chaos crate placement, random wall selection, and hammer logic.
 */

import { MAP_TYPES } from '../constants/wrongWayConstants.js';

export const ck = (r, c) => `${r},${c}`;

/**
 * Checks if moving between (r, c) and (nr, nc) is blocked by a horizontal or vertical wall.
 */
export function edgeBlocked(r, c, nr, nc, walls) {
  const dr = nr - r;
  const dc = nc - c;

  if (dr === 1) {
    // Moving DOWN: blocked by H-r-c or H-r-(c-1)
    return walls.has(`H-${r}-${c}`) || (c > 0 && walls.has(`H-${r}-${c - 1}`));
  }
  if (dr === -1) {
    // Moving UP: blocked by H-nr-c or H-nr-(c-1)
    return walls.has(`H-${nr}-${c}`) || (c > 0 && walls.has(`H-${nr}-${c - 1}`));
  }
  if (dc === 1) {
    // Moving RIGHT: blocked by V-r-c or V-(r-1)-c
    return walls.has(`V-${r}-${c}`) || (r > 0 && walls.has(`V-${r - 1}-${c}`));
  }
  if (dc === -1) {
    // Moving LEFT: blocked by V-r-nc or V-(r-1)-nc
    return walls.has(`V-${r}-${nc}`) || (r > 0 && walls.has(`V-${r - 1}-${nc}`));
  }
  return false;
}

/**
 * Fast BFS check: returns true if pos can reach goalRow.
 */
export function hasPath(pos, walls, goalRow = 0, rows = 9, cols = 9) {
  if (pos.r === goalRow) return true;
  const vis = new Set();
  const q = [pos];
  vis.add(ck(pos.r, pos.c));

  while (q.length > 0) {
    const cur = q.shift();
    if (cur.r === goalRow) return true;

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const k = ck(nr, nc);
        if (!vis.has(k) && !edgeBlocked(cur.r, cur.c, nr, nc, walls)) {
          vis.add(k);
          q.push({ r: nr, c: nc });
        }
      }
    }
  }
  return false;
}

/**
 * BFS returning the exact shortest path array [{r, c}, ...] from pos to goalRow.
 */
export function bfsPath(pos, walls, goalRow = 0, rows = 9, cols = 9) {
  const vis = new Map();
  const q = [pos];
  vis.set(ck(pos.r, pos.c), null);

  while (q.length > 0) {
    const cur = q.shift();
    if (cur.r === goalRow) {
      const path = [];
      let k = ck(cur.r, cur.c);
      while (k !== null) {
        const [r, c] = k.split(',').map(Number);
        path.unshift({ r, c });
        k = vis.get(k);
      }
      return path;
    }

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const k = ck(nr, nc);
        if (!vis.has(k) && !edgeBlocked(cur.r, cur.c, nr, nc, walls)) {
          vis.set(k, ck(cur.r, cur.c));
          q.push({ r: nr, c: nc });
        }
      }
    }
  }
  return null;
}

/**
 * BFS shortest path from one point to a target point.
 */
export function bfsTo(from, target, walls, rows = 9, cols = 9) {
  if (from.r === target.r && from.c === target.c) return [{ r: from.r, c: from.c }];
  const vis = new Map();
  const q = [from];
  vis.set(ck(from.r, from.c), null);

  while (q.length > 0) {
    const cur = q.shift();
    if (cur.r === target.r && cur.c === target.c) {
      const path = [];
      let k = ck(cur.r, cur.c);
      while (k !== null) {
        const [r, c] = k.split(',').map(Number);
        path.unshift({ r, c });
        k = vis.get(k);
      }
      return path;
    }

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const k = ck(nr, nc);
        if (!vis.has(k) && !edgeBlocked(cur.r, cur.c, nr, nc, walls)) {
          vis.set(k, ck(cur.r, cur.c));
          q.push({ r: nr, c: nc });
        }
      }
    }
  }
  return null;
}

/**
 * Calculates a map of distances to all reachable cells via BFS.
 */
export function bfsDistMap(from, walls, rows = 9, cols = 9) {
  const dist = new Map();
  const q = [from];
  dist.set(ck(from.r, from.c), 0);

  while (q.length > 0) {
    const cur = q.shift();
    const d = dist.get(ck(cur.r, cur.c));
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const k = ck(nr, nc);
      if (dist.has(k)) continue;
      if (edgeBlocked(cur.r, cur.c, nr, nc, walls)) continue;
      dist.set(k, d + 1);
      q.push({ r: nr, c: nc });
    }
  }
  return dist;
}

/**
 * Calculates edge-disjoint paths from start to goalRow via Edmonds-Karp max-flow.
 */
export function disjointPaths(start, goalRow, walls, rows = 9, cols = 9, cap = 3) {
  const SINK = rows * cols;
  const cp = new Map();
  const add = (u, v, c) => {
    cp.set(u + '>' + v, (cp.get(u + '>' + v) || 0) + c);
    if (!cp.has(v + '>' + u)) cp.set(v + '>' + u, 0);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = r * cols + c;
      for (const [dr, dc] of [[1, 0], [0, 1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < rows && nc < cols && !edgeBlocked(r, c, nr, nc, walls)) {
          const v = nr * cols + nc;
          add(u, v, 1);
          add(v, u, 1);
        }
      }
      if (r === goalRow) add(u, SINK, 1);
    }
  }

  const S = start.r * cols + start.c;
  let flow = 0;
  while (flow < cap) {
    const prev = new Map();
    prev.set(S, -1);
    const q = [S];
    let found = false;

    while (q.length > 0) {
      const u = q.shift();
      if (u === SINK) {
        found = true;
        break;
      }
      for (let v = 0; v <= SINK; v++) {
        const cc = cp.get(u + '>' + v);
        if (cc && cc > 0 && !prev.has(v)) {
          prev.set(v, u);
          q.push(v);
        }
      }
    }

    if (!found) break;
    let v = SINK;
    while (prev.get(v) !== -1) {
      const u = prev.get(v);
      cp.set(u + '>' + v, cp.get(u + '>' + v) - 1);
      cp.set(v + '>' + u, (cp.get(v + '>' + u) || 0) + 1);
      v = u;
    }
    flow++;
  }
  return flow;
}

/**
 * Returns valid orthogonal moves and Quoridor jumping rules.
 * Supports single opponent (pos, oppPos) or multiple opponents (occupied array).
 */
export function getValidMoves(pos, opponents, walls, rows = 9, cols = 9) {
  const occList = Array.isArray(opponents)
    ? opponents
    : (opponents ? [opponents] : []);
  
  const isOccupied = (r, c) => occList.some(o => o && o.r === r && o.c === c);

  const moves = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (edgeBlocked(pos.r, pos.c, nr, nc, walls)) continue;

    if (isOccupied(nr, nc)) {
      // Opponent is right there! Try straight jump first
      const jr = nr + dr;
      const jc = nc + dc;
      const straightAllowed =
        jr >= 0 && jr < rows &&
        jc >= 0 && jc < cols &&
        !edgeBlocked(nr, nc, jr, jc, walls) &&
        !isOccupied(jr, jc);

      if (straightAllowed) {
        moves.push({ r: jr, c: jc });
      } else {
        // Straight jump blocked by wall or board edge: diagonal jumps allowed
        for (const [d2r, d2c] of [[dc, dr], [-dc, -dr]]) {
          const sr = nr + d2r;
          const sc = nc + d2c;
          if (
            sr >= 0 && sr < rows &&
            sc >= 0 && sc < cols &&
            !edgeBlocked(nr, nc, sr, sc, walls) &&
            !isOccupied(sr, sc)
          ) {
            moves.push({ r: sr, c: sc });
          }
        }
      }
    } else {
      moves.push({ r: nr, c: nc });
    }
  }
  return moves;
}

export function toWallKey(wall) {
  if (!wall) return '';
  if (typeof wall === 'string') return wall;
  const o = wall.o || wall.orientation || 'H';
  return `${o}-${wall.r}-${wall.c}`;
}

/**
 * Checks geometric overlap legality:
 * A 2-cell wall cannot overlap or intersect perpendicularly with another wall.
 */
export function wallGeomOk(rawKey, walls, rows = 9, cols = 9) {
  const key = toWallKey(rawKey);
  if (!key || walls.has(key)) return false;
  const [type, rs, cs] = key.split('-');
  const r = parseInt(rs, 10);
  const c = parseInt(cs, 10);

  if (r < 0 || r >= rows - 1 || c < 0 || c >= cols - 1) return false;

  if (type === 'H') {
    if (walls.has(`H-${r}-${c - 1}`) || walls.has(`H-${r}-${c + 1}`)) return false;
    if (walls.has(`V-${r}-${c}`)) return false; // perpendicular cross
  } else {
    if (walls.has(`V-${r - 1}-${c}`) || walls.has(`V-${r + 1}-${c}`)) return false;
    if (walls.has(`H-${r}-${c}`)) return false; // perpendicular cross
  }
  return true;
}

/**
 * Validates whether a wall candidate can be legally placed:
 * 1. Geometric overlap check.
 * 2. Pathfinding guarantee: Both players (and any items) must retain at least one open path.
 */
export function tryWall(rawKey, walls, pA, pB, goalA = 0, goalB = 0, rows = 9, cols = 9, hamCtx = null) {
  const key = toWallKey(rawKey);
  if (!wallGeomOk(key, walls, rows, cols)) return null;

  const nextWalls = new Set(walls);
  nextWalls.add(key);

  if (!hasPath(pA, nextWalls, goalA, rows, cols)) return null;
  if (!hasPath(pB, nextWalls, goalB, rows, cols)) return null;

  // If hammer context exists, hammers must still be reachable
  if (hamCtx && hamCtx.seekers && hamCtx.seekers.length && hamCtx.hammers && hamCtx.hammers.length) {
    const ok = hamCtx.hammers.every(h => hamCtx.seekers.some(s => !!bfsTo(s, h, nextWalls, rows, cols)));
    if (!ok) return null;
  }

  return nextWalls;
}

/**
 * 2v2 Wall verification: checks that all 4 pawns have at least 1 path to their goal.
 */
export function tryWall2v2(rawKey, walls, tokens, goals, rows = 9, cols = 9) {
  const key = toWallKey(rawKey);
  if (!wallGeomOk(key, walls, rows, cols)) return null;

  const nextWalls = new Set(walls);
  nextWalls.add(key);

  for (const id of ['A1', 'A2', 'B1', 'B2']) {
    if (!tokens[id]) continue;
    if (!hasPath(tokens[id], nextWalls, goals[id], rows, cols)) return null;
  }

  return nextWalls;
}

/**
 * Snaps touch/drag coordinates (x, y) to closest legal wall key (H-r-c or V-r-c).
 */
export function snapWall(x, y, orient, cellSize, rows = 9, cols = 9) {
  if (orient === 'H') {
    const r = Math.min(Math.max(Math.round(y / cellSize - 0.5), 0), rows - 2);
    const c = Math.min(Math.max(Math.floor(x / cellSize), 0), cols - 2);
    return `H-${r}-${c}`;
  }
  const c = Math.min(Math.max(Math.round(x / cellSize - 0.5), 0), cols - 2);
  const r = Math.min(Math.max(Math.floor(y / cellSize), 0), rows - 2);
  return `V-${r}-${c}`;
}

/**
 * Steel wall rule:
 * Horizontal walls directly guarding the final goal row are indestructible by hammers.
 */
export function isSteelWall(key, mapType = MAP_TYPES.DUEL, rows = 9) {
  const parts = key.split('-');
  if (parts[0] !== 'H') return false;
  const r = parts[1];
  if (r === '0') return true; // row 0 goal guard
  if (mapType === MAP_TYPES.DUEL && r === String(rows - 2)) return true; // bottom goal guard in duel
  return false;
}

/**
 * Spawns 3 hammers horizontally across the middle board row.
 */
export function makeHammers(rows = 9, cols = 9) {
  const r = Math.floor(rows / 2);
  return [
    { r, c: 1, id: 'hm0' },
    { r, c: Math.floor(cols / 2), id: 'hm1' },
    { r, c: cols - 2, id: 'hm2' },
  ];
}

/**
 * Finds a strategically fair grid position for the Chaos Crate drop (+2 Barricades).
 */
export function pickChaosPos(pA, pB, walls, goalA = 0, goalB = 0, rows = 9, cols = 9) {
  const pa = bfsPath(pA, walls, goalA, rows, cols);
  const pb = bfsPath(pB, walls, goalB, rows, cols);
  if (!pa || !pb) return null;

  const lenA = pa.length - 1;
  const lenB = pb.length - 1;

  const loR = Math.min(pA.r, pB.r);
  const hiR = Math.max(pA.r, pB.r);
  const minR = Math.max(1, loR);
  const maxR = Math.min(rows - 2, hiR);
  if (maxR < minR) return null;

  const inZone = p => {
    if (p.r < minR || p.r > maxR) return false;
    if (p.r === pA.r && p.c === pA.c) return false;
    if (p.r === pB.r && p.c === pB.c) return false;
    return true;
  };

  // If one player is trailing, spawn closer along their path to provide a catchup boost
  if (Math.abs(lenA - lenB) > 1) {
    const trailingPath = lenA > lenB ? pa : pb;
    for (let k = 2; k <= Math.min(4, trailingPath.length - 1); k++) {
      if (inZone(trailingPath[k])) return { r: trailingPath[k].r, c: trailingPath[k].c };
    }
  }

  // Equal match: pick cell with balanced distance to both
  const dmA = bfsDistMap(pA, walls, rows, cols);
  const dmB = bfsDistMap(pB, walls, rows, cols);
  let best = null;
  let bestScore = Infinity;

  for (let r = minR; r <= maxR; r++) {
    for (let c = 0; c < cols; c++) {
      if (!inZone({ r, c })) continue;
      const dA = dmA.get(ck(r, c));
      const dB = dmB.get(ck(r, c));
      if (dA === undefined || dB === undefined) continue;
      const score = dA + dB + Math.abs(dA - dB) * 3;
      if (score < bestScore) {
        bestScore = score;
        best = { r, c };
      }
    }
  }
  return best;
}

/**
 * Selects a fair automatic wall for the Random Walls drop modifier.
 */
export function pickFairDropWall(pA, pB, walls, goalA = 0, goalB = 0, rows = 9, cols = 9) {
  const pa = bfsPath(pA, walls, goalA, rows, cols);
  const pb = bfsPath(pB, walls, goalB, rows, cols);
  if (!pa || !pb) return null;

  const lenA = pa.length - 1;
  const lenB = pb.length - 1;
  const leaderIsA = lenA <= lenB;
  const leaderPos = leaderIsA ? pA : pB;
  const trailerPos = leaderIsA ? pB : pA;
  const leaderGoal = leaderIsA ? goalA : goalB;
  const trailerGoal = leaderIsA ? goalB : goalA;
  const lenLeader = leaderIsA ? lenA : lenB;
  const lenTrailer = leaderIsA ? lenB : lenA;

  // Candidates near leader's path
  const path = bfsPath(leaderPos, walls, leaderGoal, rows, cols) || [];
  const cands = new Set();
  const limit = Math.min(5, path.length);

  for (let i = 0; i < limit; i++) {
    const node = path[i];
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        const r = node.r + dr;
        const c = node.c + dc;
        if (r >= 0 && r < rows - 1 && c >= 0 && c < cols - 1) {
          cands.add(`H-${r}-${c}`);
          cands.add(`V-${r}-${c}`);
        }
      }
    }
  }

  const scored = [];
  for (const key of cands) {
    const next = tryWall(key, walls, pA, pB, goalA, goalB, rows, cols);
    if (!next) continue;

    const npL = bfsPath(leaderPos, next, leaderGoal, rows, cols);
    const npT = bfsPath(trailerPos, next, trailerGoal, rows, cols);
    if (!npL || !npT) continue;

    const dLeader = (npL.length - 1) - lenLeader;
    const dTrailer = (npT.length - 1) - lenTrailer;
    if (dTrailer > dLeader) continue; // Never hinder trailer more than leader

    const score = dLeader - 2.5 * Math.max(0, dTrailer) + Math.random() * 1.5;
    scored.push({ key, score });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(5, scored.length));
  return top[Math.floor(Math.random() * top.length)].key;
}

/**
 * Fast 32-bit deterministic Mulberry32 pseudorandom generator.
 * Produces identical sequence of pseudorandom numbers for any integer seed.
 */
export function createSeededRandom(seed) {
  let s = Math.abs(Math.floor(seed)) || 1;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a balanced, non-blocking initial wall preset from a seed number (1 to 5000).
 * Checks path reachability and fairness so both players always have a clean route to their goal.
 */
export function generatePresetWalls(seed = 1, rows = 9, cols = 9, pA = null, pB = null, goalA = 0, goalB = null, targetCount = 6) {
  const normSeed = Math.max(1, Math.min(5000, Math.floor(Number(seed) || 1)));
  const rng = createSeededRandom(normSeed);

  const startA = pA || { r: rows - 1, c: Math.floor(cols / 2) };
  const startB = pB || { r: 0, c: Math.floor(cols / 2) };
  const gA = goalA !== null ? goalA : 0;
  const gB = goalB !== null ? goalB : rows - 1;

  // Candidates in middle rows to leave starting row and immediate goal row clear
  const cands = [];
  const minR = Math.max(1, Math.floor(rows * 0.15));
  const maxR = Math.min(rows - 2, Math.floor(rows * 0.85));

  for (let r = minR; r < maxR; r++) {
    for (let c = 0; c < cols - 1; c++) {
      cands.push(`H-${r}-${c}`);
      cands.push(`V-${r}-${c}`);
    }
  }

  // Fisher-Yates shuffle with seeded RNG
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cands[i];
    cands[i] = cands[j];
    cands[j] = tmp;
  }

  const walls = new Set();
  for (const key of cands) {
    if (walls.size >= targetCount) break;
    const next = tryWall(key, walls, startA, startB, gA, gB, rows, cols);
    if (next) {
      // Ensure path length difference is not extreme (<= 3 steps difference)
      const pathA = bfsPath(startA, next, gA, rows, cols);
      const pathB = bfsPath(startB, next, gB, rows, cols);
      if (pathA && pathB && Math.abs(pathA.length - pathB.length) <= 3) {
        walls.add(key);
      }
    }
  }

  return Array.from(walls);
}
