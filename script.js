const ROWS = 14, COLS = 32;

let grid = [];
let startNode = null, endNode = null;

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
   * hardcoding them in CSS so they're tied to ROWS/COLS and stay in sync. */
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 36px)`;
  gridEl.style.gridTemplateRows    = `repeat(${ROWS}, 36px)`;

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
    }
  }

  // start: one row below vertical center, column 5
  // end:   three rows above vertical center, column 26
  startNode = grid[Math.floor(ROWS / 2) + 1][5];
  endNode   = grid[Math.floor(ROWS / 2) - 3][COLS - 6];

  setClass(startNode, 'start');
  setClass(endNode, 'end');
}

buildGrid();
