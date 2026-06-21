const ROWS = 14, COLS = 32;

let grid = [];
let startNode = null, endNode = null;
let mouseMode = null;
let isMouseDown = false;

const gridEl = document.getElementById('grid');

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
  if (!isMouseDown) return;

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

buildGrid();
