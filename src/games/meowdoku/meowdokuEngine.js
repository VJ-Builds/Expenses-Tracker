/**
 * Meowdoku Engine - Exact Colors, Level 43 Replica & Procedural Unique Puzzle Generator
 * Implements the 3 core rules:
 * 1. 1 Cat per color region
 * 2. 1 Cat per column and row
 * 3. Cats cannot touch (not even diagonally)
 */

export const MEOWDOKU_PALETTE = [
  { id: 0, name: 'Gold', hex: '#DDB840' },
  { id: 1, name: 'Light Green', hex: '#9BD382' },
  { id: 2, name: 'Teal', hex: '#42AFAC' },
  { id: 3, name: 'Sky Blue', hex: '#A3BED8' },
  { id: 4, name: 'Cobalt Blue', hex: '#4F6DB3' },
  { id: 5, name: 'Purple', hex: '#9171D1' },
  { id: 6, name: 'Hot Pink', hex: '#E683B5' },
  { id: 7, name: 'Soft Pink', hex: '#F4B8D1' },
  { id: 8, name: 'Cocoa Brown', hex: '#A96E44' },
  { id: 9, name: 'Peach Orange', hex: '#F7A868' },
];

export const CELL_STATE = {
  EMPTY: 0,
  CROSS: 1,
  CAT: 2,
};

export const LEVEL_43_PRESET = {
  level: 43,
  size: 10,
  grid: [
    [8, 7, 4, 9, 9, 9, 9, 9, 5, 5],
    [8, 4, 4, 9, 9, 9, 9, 9, 9, 5],
    [8, 4, 4, 4, 4, 4, 4, 9, 5, 5],
    [8, 4, 4, 9, 4, 9, 9, 9, 9, 5],
    [8, 4, 4, 9, 9, 9, 2, 2, 2, 5],
    [8, 3, 4, 4, 4, 6, 6, 2, 5, 5],
    [8, 3, 3, 3, 4, 4, 6, 2, 2, 5],
    [8, 3, 3, 3, 6, 6, 6, 2, 2, 0],
    [8, 8, 8, 3, 3, 6, 0, 0, 0, 0],
    [1, 1, 8, 8, 8, 6, 0, 0, 0, 0],
  ],
  solutionCols: [1, 6, 8, 4, 7, 5, 3, 9, 2, 0],
  screenshotPlacedRows: [0, 6, 7, 8, 9],
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateValidQueens(N, rng) {
  const cols = new Array(N).fill(-1);
  const usedCols = new Array(N).fill(false);

  function backtrack(r) {
    if (r === N) return true;
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    for (let idx = 0; idx < order.length; idx++) {
      const c = order[idx];
      if (usedCols[c]) continue;
      if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
      cols[r] = c;
      usedCols[c] = true;
      if (backtrack(r + 1)) return true;
      usedCols[c] = false;
      cols[r] = -1;
    }
    return false;
  }

  backtrack(0);
  return cols;
}

export function findSolutions(N, grid, limit = 2) {
  const regionCells = Array.from({ length: N }, () => []);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      regionCells[grid[r][c]].push([r, c]);
    }
  }
  const regOrder = Array.from({ length: N }, (_, i) => i).sort(
    (a, b) => regionCells[a].length - regionCells[b].length
  );
  const usedRows = new Array(N).fill(false);
  const usedCols = new Array(N).fill(false);
  const placed = [];
  const solutions = [];

  function solve(idx) {
    if (solutions.length >= limit) return;
    if (idx === N) {
      const sol = new Array(N);
      for (let i = 0; i < placed.length; i++) {
        sol[placed[i][0]] = placed[i][1];
      }
      solutions.push(sol);
      return;
    }
    const reg = regOrder[idx];
    const cells = regionCells[reg];
    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      if (usedRows[r] || usedCols[c]) continue;
      let touches = false;
      for (let j = 0; j < placed.length; j++) {
        const [pr, pc] = placed[j];
        if (Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1) {
          touches = true;
          break;
        }
      }
      if (touches) continue;
      usedRows[r] = true;
      usedCols[c] = true;
      placed.push([r, c]);
      solve(idx + 1);
      placed.pop();
      usedRows[r] = false;
      usedCols[c] = false;
    }
  }

  solve(0);
  return solutions;
}

function isRegionConnected(N, grid, reg, skipR, skipC) {
  let start = null;
  let total = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (r === skipR && c === skipC) continue;
      if (grid[r][c] === reg) {
        total++;
        if (!start) start = [r, c];
      }
    }
  }
  if (total === 0) return false;
  const visited = Array.from({ length: N }, () => new Array(N).fill(false));
  const q = [start];
  visited[start[0]][start[1]] = true;
  let count = 0;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  while (q.length > 0) {
    const [r, c] = q.shift();
    count++;
    for (let i = 0; i < dirs.length; i++) {
      const nr = r + dirs[i][0];
      const nc = c + dirs[i][1];
      if (
        nr >= 0 &&
        nr < N &&
        nc >= 0 &&
        nc < N &&
        !visited[nr][nc] &&
        !(nr === skipR && nc === skipC) &&
        grid[nr][nc] === reg
      ) {
        visited[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
  }
  return count === total;
}

export function getGridSizeForLevel(levelNum) {
  if (levelNum === 43) return 10;
  if (levelNum <= 3) return 6;
  if (levelNum <= 10) return 7;
  if (levelNum <= 22) return 8;
  if (levelNum <= 35) return 9;
  return 10;
}

export function generateMeowdokuLevel(levelNum = 43) {
  if (levelNum === 43) {
    return {
      level: 43,
      size: 10,
      grid: LEVEL_43_PRESET.grid.map(row => [...row]),
      solutionCols: [...LEVEL_43_PRESET.solutionCols],
    };
  }

  const N = getGridSizeForLevel(levelNum);
  const rng = mulberry32(levelNum * 2654435761 + 99991);
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let attempt = 0; attempt < 50; attempt++) {
    const solCols = generateValidQueens(N, rng);
    const grid = Array.from({ length: N }, () => new Array(N).fill(-1));
    const frontier = [];

    for (let r = 0; r < N; r++) {
      const c = solCols[r];
      grid[r][c] = r;
      frontier.push([r, c, r]);
    }

    let unassigned = N * N - N;
    while (unassigned > 0 && frontier.length > 0) {
      const idx = Math.floor(rng() * frontier.length);
      const [r, c, reg] = frontier[idx];
      const validDirs = [];
      for (let d = 0; d < dirs.length; d++) {
        const nr = r + dirs[d][0];
        const nc = c + dirs[d][1];
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc] === -1) {
          validDirs.push([nr, nc]);
        }
      }
      if (validDirs.length === 0) {
        frontier.splice(idx, 1);
      } else {
        const [nr, nc] = validDirs[Math.floor(rng() * validDirs.length)];
        grid[nr][nc] = reg;
        frontier.push([nr, nc, reg]);
        unassigned--;
      }
    }

    for (let step = 0; step < 80; step++) {
      const sols = findSolutions(N, grid, 2);
      if (sols.length === 1) {
        return {
          level: levelNum,
          size: N,
          grid,
          solutionCols: solCols,
        };
      }
      const alt = sols.find(s => s.some((c, r) => c !== solCols[r]));
      if (!alt) break;

      const diffs = [];
      for (let r = 0; r < N; r++) {
        if (alt[r] !== solCols[r]) diffs.push([r, alt[r]]);
      }
      for (let i = diffs.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = diffs[i];
        diffs[i] = diffs[j];
        diffs[j] = tmp;
      }

      let changed = false;
      for (let i = 0; i < diffs.length; i++) {
        const [r, c] = diffs[i];
        const oldReg = grid[r][c];
        if (!isRegionConnected(N, grid, oldReg, r, c)) continue;
        const adjRegs = [];
        for (let d = 0; d < dirs.length; d++) {
          const nr = r + dirs[d][0];
          const nc = c + dirs[d][1];
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc] !== oldReg) {
            adjRegs.push(grid[nr][nc]);
          }
        }
        if (adjRegs.length > 0) {
          grid[r][c] = adjRegs[Math.floor(rng() * adjRegs.length)];
          changed = true;
          break;
        }
      }
      if (!changed) break;
    }
  }

  return {
    level: levelNum,
    size: 10,
    grid: LEVEL_43_PRESET.grid.map(row => [...row]),
    solutionCols: [...LEVEL_43_PRESET.solutionCols],
  };
}

export function propagateCrossesForCat(boardState, regionGrid, catR, catC) {
  const N = boardState.length;
  const targetRegion = regionGrid[catR][catC];
  const next = boardState.map(row => [...row]);

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (r === catR && c === catC) continue;
      const sameRow = r === catR;
      const sameCol = c === catC;
      const sameRegion = regionGrid[r][c] === targetRegion;
      const isNeighbor = Math.abs(r - catR) <= 1 && Math.abs(c - catC) <= 1;

      if ((sameRow || sameCol || sameRegion || isNeighbor) && next[r][c] === CELL_STATE.EMPTY) {
        next[r][c] = CELL_STATE.CROSS;
      }
    }
  }
  return next;
}
