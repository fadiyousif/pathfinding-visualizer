const ROWS = 14, COLS = 32;

let grid = [];
let startNode = null, endNode = null;
let isRunning = false;
let mouseMode = null;
let isMouseDown = false;

const gridEl       = document.getElementById('grid');
const runBtn       = document.getElementById('run-btn');
const clearBtn     = document.getElementById('clear-btn');
const clearPathBtn = document.getElementById('clear-path-btn');
const mazeBtn      = document.getElementById('maze-btn');
const statusEl     = document.getElementById('status');
const speedSlider  = document.getElementById('speed');

// maps slider value 1–5 to a delay in ms (slower → higher delay)
function getDelay() {
  return [60, 30, 15, 5, 1][parseInt(speedSlider.value) - 1];
}

/* each cell in the grid is represented as a node object.
 * r/c = row/column position in the grid.
 * el = the corresponding DOM element.
 * prev = backpointer set during search, used to reconstruct the path.
 * g and f are only used by A* (cost from start, and estimated total cost). */
function makeNode(r, c) {
  return {
    r, c,
    isWall: false,
    el: null,
    visited: false,
    prev: null,
    g: Infinity,
    f: Infinity,
  };
}

/* cls = the CSS class to apply: 'start', 'end', 'wall', 'visited', 'path',
 * or '' to reset back to a plain cell. replaces the entire className so
 * we don't have to track and remove old classes manually. */
function setClass(node, cls) {
  node.el.className = 'cell' + (cls ? ' ' + cls : '');
  // clear wave-delay so it doesn't linger when the cell gets reused
  node.el.style.removeProperty('--wave-delay');
}

/* returns what class a node should have based on its current state.
 * used when we need to restore a node's appearance (e.g. after clearing a search). */
function baseClass(node) {
  if (node === startNode) return 'start';
  if (node === endNode)   return 'end';
  if (node.isWall)        return 'wall';
  return '';
}

function buildGrid() {
  grid = [];
  gridEl.innerHTML = '';

  /* CSS Grid needs explicit column/row sizes — we set them here rather than
   * hardcoding them in CSS so they're tied to ROWS/COLS and stay in sync.
   * reading --cell-size from the stylesheet keeps JS and CSS in sync if the
   * value ever changes — no need to update it in two places. */
  const cellSize = getComputedStyle(document.documentElement).getPropertyValue('--cell-size').trim();
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cellSize})`;
  gridEl.style.gridTemplateRows    = `repeat(${ROWS}, ${cellSize})`;

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];

    for (let c = 0; c < COLS; c++) {
      const node = makeNode(r, c);

      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;

      node.el = el;
      grid[r][c] = node;
      gridEl.appendChild(el);

      el.addEventListener('mousedown', e => onCellMouseDown(e, node));
      el.addEventListener('mouseenter', () => onCellMouseEnter(node));
    }
  }

  // start: one row below vertical center, column 5
  // end:   three rows above vertical center, column 26
  startNode = grid[Math.floor(ROWS / 2) + 1][5];
  endNode   = grid[Math.floor(ROWS / 2) - 3][COLS - 6];

  setClass(startNode, 'start');
  setClass(endNode, 'end');
}

/* we track mousedown/mouseup on the document rather than individual cells
 * so that dragging outside the grid and releasing still clears the mode. */
document.addEventListener('mousedown', () => { isMouseDown = true; });
document.addEventListener('mouseup',   () => { isMouseDown = false; mouseMode = null; });

function onCellMouseDown(e, node) {
  if (isRunning) return;
  e.preventDefault(); // prevent text selection while dragging

  if (node === startNode) { mouseMode = 'move-start'; return; }
  if (node === endNode)   { mouseMode = 'move-end';   return; }

  // toggle wall on click; mouseMode determines what happens on subsequent drag
  if (node.isWall) {
    node.isWall = false;
    setClass(node, '');
    mouseMode = 'erase';
  } else {
    node.isWall = true;
    setClass(node, 'wall');
    mouseMode = 'wall';
  }
}

function onCellMouseEnter(node) {
  if (!isMouseDown || isRunning) return;

  if (mouseMode === 'move-start' && node !== endNode && !node.isWall) {
    setClass(startNode, '');
    startNode = node;
    setClass(node, 'start');
    return;
  }

  if (mouseMode === 'move-end' && node !== startNode && !node.isWall) {
    setClass(endNode, '');
    endNode = node;
    setClass(node, 'end');
    return;
  }

  if (mouseMode === 'wall' && node !== startNode && node !== endNode) {
    node.isWall = true;
    setClass(node, 'wall');
  }

  if (mouseMode === 'erase' && node !== startNode && node !== endNode) {
    node.isWall = false;
    setClass(node, '');
  }
}

/* returns the up to 4 non-wall neighbors of a node.
 * optional chaining (?.) handles edge cells gracefully — out-of-bounds
 * lookups return undefined, which the filter then removes. */
function getNeighbors(node) {
  const { r, c } = node;
  return [[-1,0],[1,0],[0,-1],[0,1]]
    .map(([dr, dc]) => grid[r + dr]?.[c + dc])
    .filter(n => n && !n.isWall);
}

/* type = 'update' | 'success' | 'failure'
 * voiding offsetWidth forces a reflow so the animation restarts even if
 * the same class was already on the element. */
function setStatus(text, type = 'update') {
  statusEl.textContent = text;
  statusEl.className = '';
  void statusEl.offsetWidth;
  statusEl.className = type;
}

// clears visited/path state without touching walls or node positions
function resetSearch() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      node.visited = false;
      node.prev = null;
      node.g = Infinity;
      node.f = Infinity;

      if (node !== startNode && node !== endNode && !node.isWall) {
        setClass(node, '');
      }
    }
  }
}

/* the browser renders frames between JS tasks, not during them. If we colored
 * every cell synchronously the whole grid would appear at once with no animation.
 * sleep() pauses execution by returning a Promise that resolves after a timeout,
 * giving the browser a chance to render the updated cell before moving on.
 * Functions that call await must be declared async — they implicitly return a
 * Promise themselves, which is why their callers also need to await them. */
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function animateVisited(node) {
  if (node === startNode || node === endNode) return;
  node.el.classList.add('visited');
  await sleep(getDelay());
}

async function animatePath(node) {
  if (node === startNode || node === endNode) return;
  node.el.classList.remove('visited');
  node.el.classList.add('path');
  await sleep(30);
}

/* walks back through prev pointers from endNode to reconstruct the path,
 * then animates it forward. If path[0] isn't startNode, the search never
 * reached the start — meaning the two nodes aren't connected. */
async function tracePath() {
  const path = [];
  let cur = endNode;

  // follow prev pointers back to the start, then reverse with unshift
  while (cur) { path.unshift(cur); cur = cur.prev; }

  if (path[0] !== startNode) {
    setStatus('no path found', 'failure');
    return;
  }

  for (const n of path) await animatePath(n);

  // stagger a wave ripple across each path cell after the path is drawn
  path.forEach((n, i) => {
    if (n === startNode || n === endNode) return;
    n.el.style.setProperty('--wave-delay', `${i * 20}ms`);
    n.el.classList.add('wave');
  });

  const steps = path.length - 1;
  setStatus(`path found — ${steps} ${steps === 1 ? 'step' : 'steps'}`, 'success');
}

/*
 * Dijkstra's: always processes the unvisited node with the smallest known
 * distance first. Guarantees the shortest path but explores in all directions,
 * which can be slow on open grids.
 *
 * note: using a sorted array as a priority queue. A real min-heap would be
 * faster (O log n vs O n log n per op) but the grid is small enough that
 * the simpler approach is fine here.
 */
async function dijkstra() {
  const dist = new Map();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) dist.set(grid[r][c], Infinity);

  dist.set(startNode, 0);
  startNode.g = 0;

  const pq = [{ node: startNode, d: 0 }];

  while (pq.length) {
    pq.sort((a, b) => a.d - b.d);
    const { node, d } = pq.shift();

    // skip if we already found a shorter path to this node
    if (node.visited) continue;
    node.visited = true;
    await animateVisited(node);

    if (node === endNode) { await tracePath(); return; }

    for (const nb of getNeighbors(node)) {
      if (!nb.visited && d + 1 < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, d + 1);
        nb.prev = node;
        pq.push({ node: nb, d: d + 1 });
      }
    }
  }

  setStatus('no path found', 'failure');
}

/*
 * A*: like Dijkstra's but adds a heuristic estimate of the remaining distance
 * to the goal. nodes are prioritized by f = g + h, where g is the known cost
 * from the start and h is the heuristic (Manhattan distance here).
 * this focuses the search toward the goal and is much faster in practice,
 * while still guaranteeing the shortest path as long as h never overestimates.
 */
function heuristic(a, b) {
  // Manhattan distance — counts grid steps ignoring diagonals
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

async function astar() {
  startNode.g = 0;
  startNode.f = heuristic(startNode, endNode);

  const open = [startNode];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();

    if (cur.visited) continue;
    cur.visited = true;
    await animateVisited(cur);

    if (cur === endNode) { await tracePath(); return; }

    for (const nb of getNeighbors(cur)) {
      if (nb.visited) continue;
      const tentG = cur.g + 1;

      if (tentG < nb.g) {
        nb.prev = cur;
        nb.g = tentG;
        nb.f = nb.g + heuristic(nb, endNode);
        open.push(nb);
      }
    }
  }

  setStatus('no path found', 'failure');
}

/*
 * DFS: explores as deep as possible before backtracking, using a stack.
 * fast to find *a* path but it won't be the shortest one — DFS has no
 * concept of distance, it just keeps going until it hits a dead end.
 */
async function dfs() {
  const stack = [startNode];

  while (stack.length) {
    const cur = stack.pop();

    if (cur.visited) continue;
    cur.visited = true;
    await animateVisited(cur);

    if (cur === endNode) { await tracePath(); return; }

    for (const nb of getNeighbors(cur)) {
      if (!nb.visited) {
        nb.prev = cur;
        stack.push(nb);
      }
    }
  }

  setStatus('no path found', 'failure');
}

async function run() {
  if (isRunning) return;
  isRunning = true;
  [runBtn, clearBtn, clearPathBtn, mazeBtn].forEach(b => b.disabled = true);
  setStatus('running…');
  resetSearch();

  const algoMap = { dijkstra, astar, dfs };
  await algoMap[document.getElementById('algo-select').value]();

  isRunning = false;
  [runBtn, clearBtn, clearPathBtn, mazeBtn].forEach(b => b.disabled = false);
}

function clearPath() {
  if (isRunning) return;
  resetSearch();
  setStatus('path cleared');
}

function clearAll() {
  if (isRunning) return;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      node.isWall = false;
      node.visited = false;
      node.prev = null;
      node.g = Infinity;
      node.f = Infinity;
      setClass(node, baseClass(node));
    }
  }

  setStatus('grid cleared');
}

/*
 * recursive division maze: repeatedly picks a random wall line within a
 * region and cuts a single passage through it, then recurses on each sub-region.
 * alternates between horizontal and vertical cuts to produce a balanced maze.
 */
function generateMaze() {
  if (isRunning) return;
  clearAll();

  const walls = [];

  function divide(rStart, rEnd, cStart, cEnd, dir) {
    if (rEnd - rStart < 2 || cEnd - cStart < 2) return;

    if (dir === 'H') {
      const wallR = rStart + 1 + 2 * Math.floor(Math.random() * Math.floor((rEnd - rStart - 1) / 2));
      const passC = cStart + 2 * Math.floor(Math.random() * Math.ceil((cEnd - cStart + 1) / 2));

      for (let c = cStart; c <= cEnd; c++)
        if (c !== passC) walls.push(grid[wallR][c]);

      divide(rStart, wallR - 1, cStart, cEnd, 'V');
      divide(wallR + 1, rEnd,   cStart, cEnd, 'V');
    } else {
      const wallC = cStart + 1 + 2 * Math.floor(Math.random() * Math.floor((cEnd - cStart - 1) / 2));
      const passR = rStart + 2 * Math.floor(Math.random() * Math.ceil((rEnd - rStart + 1) / 2));

      for (let r = rStart; r <= rEnd; r++)
        if (r !== passR) walls.push(grid[r][wallC]);

      divide(rStart, rEnd, cStart, wallC - 1, 'H');
      divide(rStart, rEnd, wallC + 1, cEnd,   'H');
    }
  }

  divide(0, ROWS - 1, 0, COLS - 1, 'H');

  for (const node of walls) {
    if (node !== startNode && node !== endNode) {
      node.isWall = true;
      setClass(node, 'wall');
    }
  }

  setStatus('maze generated');
}

runBtn.addEventListener('click', run);
clearPathBtn.addEventListener('click', clearPath);
clearBtn.addEventListener('click', clearAll);
mazeBtn.addEventListener('click', generateMaze);

buildGrid();
