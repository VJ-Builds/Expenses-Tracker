/**
 * Wrong Way: Don't be mad - AI Bot Engine
 * Intelligent AI opponents with 3 difficulty tiers:
 * - Easy: Casual moves, modest defensive walls.
 * - Normal: 1-move lookahead, path differential optimization.
 * - Hard: Aggressive Minimax lookahead, worst-case delay scoring, disjoint path analysis.
 */

import {
  bfsPath,
  bfsTo,
  tryWall,
  getValidMoves,
  isSteelWall,
  disjointPaths,
} from './boardLogic.js';

/**
 * Returns wall candidates near the target's current shortest path.
 */
function getWallCandidates(targetPos, walls, goalRow, rows, cols, depth = 5) {
  const path = bfsPath(targetPos, walls, goalRow, rows, cols);
  if (!path) return [];

  const candidates = new Set();
  const limit = Math.min(depth, path.length);

  for (let i = 0; i < limit; i++) {
    const node = path[i];
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        const r = node.r + dr;
        const c = node.c + dc;
        if (r >= 0 && r < rows - 1 && c >= 0 && c < cols - 1) {
          candidates.add(`H-${r}-${c}`);
          candidates.add(`V-${r}-${c}`);
        }
      }
    }
  }
  return Array.from(candidates);
}

/**
 * Evaluates whether detouring to pick up a chaos crate or hammer is worth it.
 */
function shouldPickupItem(aiPos, humanPos, walls, aiPath, item, aiBarr, aiGoal, rows, cols) {
  if (!item || !aiPath) return null;

  const moves = getValidMoves(aiPos, humanPos, walls, rows, cols);
  const direct = moves.find(m => m.r === item.r && m.c === item.c);
  if (direct) return direct; // Direct step onto item

  const toItem = bfsTo(aiPos, item, walls, rows, cols);
  if (!toItem || toItem.length < 2) return null;

  const fromItem = bfsPath(item, walls, aiGoal, rows, cols);
  if (!fromItem) return null;

  const itemDist = toItem.length - 1;
  const detour = (itemDist + (fromItem.length - 1)) - (aiPath.length - 1);
  const maxDetour = aiBarr <= 2 ? 5 : aiBarr <= 4 ? 3 : 1;

  if (detour > maxDetour) return null;
  const nextStep = toItem[1];
  if (nextStep.r === humanPos.r && nextStep.c === humanPos.c) return null;
  return nextStep;
}

/**
 * Easy AI: moves towards goal, occasionally places a wall suboptimally.
 */
export function aiEasy(aiPos, humanPos, walls, aiBarr, chaosItem, aiGoal, humGoal, rows, cols) {
  const aiPath = bfsPath(aiPos, walls, aiGoal, rows, cols);
  const humPath = bfsPath(humanPos, walls, humGoal, rows, cols);
  if (!aiPath) return null;

  const aiD = aiPath.length - 1;
  const humD = humPath ? humPath.length - 1 : 999;

  // 1-step to win
  if (aiD === 1) return { type: 'move', pos: aiPath[1] };

  if (chaosItem) {
    const pick = shouldPickupItem(aiPos, humanPos, walls, aiPath, chaosItem, aiBarr, aiGoal, rows, cols);
    if (pick) return { type: 'move', pos: pick };
  }

  // 35% chance to consider wall when opponent is close
  if (aiBarr > 0 && (humD <= aiD + 2 || humD <= 4) && Math.random() < 0.35) {
    const cands = getWallCandidates(humanPos, walls, humGoal, rows, cols, 4);
    // Shuffle candidates for suboptimal play
    for (let i = cands.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cands[i], cands[j]] = [cands[j], cands[i]];
    }

    for (const key of cands) {
      const next = tryWall(key, walls, aiPos, humanPos, aiGoal, humGoal, rows, cols);
      if (!next) continue;
      const nh = bfsPath(humanPos, next, humGoal, rows, cols);
      if (nh && nh.length - 1 > humD) {
        return { type: 'barricade', key, walls: next };
      }
    }
  }

  // Advance step
  const valid = getValidMoves(aiPos, humanPos, walls, rows, cols);
  if (aiPath.length > 1) {
    const preferred = aiPath[1];
    if (valid.some(m => m.r === preferred.r && m.c === preferred.c)) {
      return { type: 'move', pos: preferred };
    }
  }

  return valid.length > 0 ? { type: 'move', pos: valid[0] } : null;
}

/**
 * Normal AI: 1-move differential analysis. Blocks when gain exceeds threshold.
 */
export function aiNormal(aiPos, humanPos, walls, aiBarr, chaosItem, aiGoal, humGoal, rows, cols) {
  const aiPath = bfsPath(aiPos, walls, aiGoal, rows, cols);
  const humPath = bfsPath(humanPos, walls, humGoal, rows, cols);
  if (!aiPath) return null;

  const aiD = aiPath.length - 1;
  const humD = humPath ? humPath.length - 1 : 999;

  // 1-step to victory
  if (aiD === 1) return { type: 'move', pos: aiPath[1] };

  if (chaosItem) {
    const pick = shouldPickupItem(aiPos, humanPos, walls, aiPath, chaosItem, aiBarr, aiGoal, rows, cols);
    if (pick) return { type: 'move', pos: pick };
  }

  let bestWall = null;
  let bestWallKey = null;
  let bestGain = 0;

  if (aiBarr > 0) {
    const cands = getWallCandidates(humanPos, walls, humGoal, rows, cols, 5);
    for (const key of cands) {
      const next = tryWall(key, walls, aiPos, humanPos, aiGoal, humGoal, rows, cols);
      if (!next) continue;

      const nh = bfsPath(humanPos, next, humGoal, rows, cols);
      const na = bfsPath(aiPos, next, aiGoal, rows, cols);
      if (!nh || !na) continue;

      const delayHum = (nh.length - 1) - humD;
      const costAi = (na.length - 1) - aiD;
      const netGain = delayHum * 2 - costAi * 1.5;

      if (delayHum > 0 && netGain > bestGain) {
        bestGain = netGain;
        bestWall = next;
        bestWallKey = key;
      }
    }
  }

  // If opponent is ahead, aggressively block
  const shouldBlock = (humD < aiD && bestGain >= 1) || bestGain >= 3;
  if (bestWall && shouldBlock) {
    return { type: 'barricade', key: bestWallKey, walls: bestWall };
  }

  // Advance
  const valid = getValidMoves(aiPos, humanPos, walls, rows, cols);
  if (aiPath.length > 1) {
    const step = aiPath[1];
    if (valid.some(m => m.r === step.r && m.c === step.c)) {
      return { type: 'move', pos: step };
    }
  }

  if (bestWall) {
    return { type: 'barricade', key: bestWallKey, walls: bestWall };
  }

  return valid.length > 0 ? { type: 'move', pos: valid[0] } : null;
}

/**
 * Hard AI: Tournament-grade decision engine.
 * Evaluates worst-case delays, disjoint paths, and opponent moves.
 */
export function aiHard(aiPos, humanPos, walls, aiBarr, humBarr, recentAi = [], chaosItem, aiGoal, humGoal, rows, cols) {
  const initMoves = getValidMoves(aiPos, humanPos, walls, rows, cols);

  // 1. Immediate Win
  for (const m of initMoves) {
    if (m.r === aiGoal) return { type: 'move', pos: m };
  }

  // 2. Direct Crate Pickup
  if (chaosItem) {
    const directCrate = initMoves.find(m => m.r === chaosItem.r && m.c === chaosItem.c);
    if (directCrate) return { type: 'move', pos: directCrate };
  }

  const aiPath = bfsPath(aiPos, walls, aiGoal, rows, cols);
  const humPath = bfsPath(humanPos, walls, humGoal, rows, cols);
  if (!aiPath) return { type: 'move', pos: initMoves[0] || aiPos };

  const aiD = aiPath.length - 1;
  const humD = humPath ? humPath.length - 1 : 999;

  // Function to advance along shortest path avoiding oscillation
  const advance = () => {
    if (aiPath.length > 1) {
      const step = aiPath[1];
      const isLooping = recentAi.slice(0, 3).some(p => p.r === step.r && p.c === step.c);
      if (!isLooping && initMoves.some(m => m.r === step.r && m.c === step.c)) {
        return { type: 'move', pos: step };
      }
      const alt = initMoves.filter(mv => !recentAi.slice(0, 3).some(p => p.r === mv.r && p.c === mv.c));
      if (alt.length > 0) return { type: 'move', pos: alt[0] };
    }
    return { type: 'move', pos: initMoves[0] || aiPath[1] };
  };

  // Find best wall with deep candidate evaluation
  let bestBlock = null;
  let bestScore = -Infinity;

  if (aiBarr > 0) {
    const cands = getWallCandidates(humanPos, walls, humGoal, rows, cols, 6);
    for (const key of cands) {
      const nw = tryWall(key, walls, aiPos, humanPos, aiGoal, humGoal, rows, cols);
      if (!nw) continue;

      const newHum = bfsPath(humanPos, nw, humGoal, rows, cols);
      const newAi = bfsPath(aiPos, nw, aiGoal, rows, cols);
      if (!newHum || !newAi) continue;

      const humDelay = (newHum.length - 1) - humD;
      const aiCost = (newAi.length - 1) - aiD;
      if (humDelay <= 0) continue;

      // Disjoint paths bonus: maintain at least 2 independent routes
      const dj = disjointPaths(aiPos, aiGoal, nw, rows, cols, 3);
      const score = humDelay * 3.5 - aiCost * 2.5 + (dj >= 2 ? 1.5 : -1);

      if (score > bestScore) {
        bestScore = score;
        bestBlock = { key, walls: nw, humDelay, aiCost };
      }
    }
  }

  // 3. Opponent is leading: aggressively block (85% priority if effective)
  if (humD < aiD && bestBlock && bestBlock.humDelay >= 1) {
    return { type: 'barricade', key: bestBlock.key, walls: bestBlock.walls };
  }

  // 4. AI is leading or tied: block if opponent can be dealt a massive delay (>= 2)
  if (bestBlock && bestBlock.humDelay >= 2 && bestBlock.aiCost <= 0) {
    return { type: 'barricade', key: bestBlock.key, walls: bestBlock.walls };
  }

  if (bestBlock && humD <= aiD + 1 && bestBlock.humDelay >= 1 && bestBlock.aiCost <= 0 && Math.random() < 0.5) {
    return { type: 'barricade', key: bestBlock.key, walls: bestBlock.walls };
  }

  return advance();
}

/**
 * Finds the optimal opponent wall to smash with a hammer.
 */
export function aiHammerBreak(aiPos, walls, goalRow, mapType, rows, cols) {
  const base = bfsPath(aiPos, walls, goalRow, rows, cols);
  if (!base) return null;
  const baseD = base.length - 1;

  let bestKey = null;
  let bestGain = 0;

  for (const key of walls) {
    if (isSteelWall(key, mapType, rows)) continue;
    const testWalls = new Set(walls);
    testWalls.delete(key);

    const np = bfsPath(aiPos, testWalls, goalRow, rows, cols);
    if (!np) continue;

    const gain = baseD - (np.length - 1);
    if (gain > bestGain) {
      bestGain = gain;
      bestKey = key;
    }
  }

  return bestGain >= 2 ? bestKey : null;
}
