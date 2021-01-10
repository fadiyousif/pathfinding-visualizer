const tableContainer = document.getElementById('tableContainer');
const dijkstraButton = document.getElementById('dijkstraButton');
const aStarButton = document.getElementById('aStarButton');
const clearButton = document.getElementById('clearButton');
const result = document.getElementById('result');
const resultIcon = document.getElementById('resultIcon');
const message = document.getElementById('message');

const totalRows = 17;
const totalCols = 38;

let startCell = [12, 4];
let targetCell = [4, 33];
let cellsToAnimate = [];
let inProgress = false;
let justFinished = false;
let creatingWalls = false;
let movingStart = false;
let movingTarget = false;

const createGrid = () => {
    const table = document.createElement('table');
    tableContainer.appendChild(table);

    for (let r = 0; r < totalRows; r++) {
        const row = document.createElement('tr');
        table.appendChild(row);

        for (let c = 0; c < totalCols; c++) {
            const column = document.createElement('td');
            row.appendChild(column);
        }
    }
}

createGrid();
const cells = Array.from(document.querySelectorAll('td'));

class MinHeap {
    constructor() {
        this.heap = [];
    }

    getMin() {
        if (this.heap.length === 0) return null;

        const min = this.heap[0];
        this.heap[0] = this.heap[this.heap.length - 1];
        this.heap[this.heap.length - 1] = min;
        this.heap.pop();

        if (this.heap.length !== 0) {
            this.siftDown(0);
        }
        return min;
    }

    parent(index) {
        return index === 0 ? null : Math.floor((index - 1) / 2);
    }

    children(index) {
        return [index * 2 + 1, index * 2 + 2];
    }

    siftUp(index) {
        const parent = this.parent(index);
        if (parent !== null && this.heap[index][0] < this.heap[parent][0]) {
            const val = this.heap[index];
            this.heap[index] = this.heap[parent];
            this.heap[parent] = val;
            this.siftUp(parent);
        }
    }

    siftDown(index) {
        const children = this.children(index);
        const leftChildValid = children[0] <= (this.heap.length - 1);
        const rightChildValid = children[1] <= (this.heap.length - 1);
        let newIndex = index;

        if (leftChildValid && this.heap[newIndex][0] > this.heap[children[0]][0]) {
            newIndex = children[0];
        }

        if (rightChildValid && this.heap[newIndex][0] > this.heap[children[1]][0]) {
            newIndex = children[1];
        }
        
        if (newIndex === index) { return; }
        const val = this.heap[index];
        this.heap[index] = this.heap[newIndex];
        this.heap[newIndex] = val;
        this.siftDown(newIndex);
    }
}

// MOUSE EVENT HANDLERS
cells.forEach(cell => cell.addEventListener('click', event => {
    if (inProgress) return;
    const clickedIndex = cells.indexOf(event.target);
    const startCellIndex = startCell[0] * totalCols + startCell[1];
    const targetCellIndex = targetCell[0] * totalCols + targetCell[1];

    if (clickedIndex !== startCellIndex && clickedIndex !== targetCellIndex) {
        if (justFinished) {
            clearGrid(keepWalls = true);
            justFinished = false;
        }
        event.target.classList.toggle('wall');
    }   
}))

cells.forEach(cell => cell.addEventListener('mousedown', event => {
    if (inProgress) return;
    event.preventDefault();

    const pressedIndex = cells.indexOf(event.target);
    const startCellIndex = startCell[0] * totalCols + startCell[1];
    const targetCellIndex = targetCell[0] * totalCols + targetCell[1];

    if (pressedIndex === startCellIndex) {
        movingStart = true;
    }

    if (pressedIndex === targetCellIndex) {
        movingTarget = true;
    }

    else {
        creatingWalls = true;
    }
}))

cells.forEach(cell => cell.addEventListener('mouseup', () => {
    creatingWalls = false;
    movingStart = false;
    movingTarget = false;
}))

cells.forEach(cell => cell.addEventListener('mouseenter', event => {
    if (!creatingWalls && !movingStart && !movingTarget) return;

    const hoveredIndex = cells.indexOf(event.target);
    const startCellIndex = startCell[0] * totalCols + startCell[1];
    const targetCellIndex = targetCell[0] * totalCols + targetCell[1];

    if (justFinished) {
        clearGrid(keepWalls = true);
        justFinished = false;
    }

    if (movingStart && hoveredIndex !== targetCellIndex) {
        moveStartOrEnd(startCellIndex, hoveredIndex, 'start');
    }

    if (movingTarget && hoveredIndex !== startCellIndex) {
        moveStartOrEnd(targetCellIndex, hoveredIndex, 'target');
    }

    if (hoveredIndex !== startCellIndex && hoveredIndex !== targetCellIndex) {
        event.target.classList.toggle('wall');
    }
}))

const moveStartOrEnd = (prevIndex, newIndex, startOrEnd) => {
    const newCellCol = newIndex % totalCols;
    const newCellRow = Math.floor((newIndex - newCellCol) / totalCols);
    
    if (startOrEnd === 'start') {
        startCell = [newCellRow, newCellCol];
    }
    else {
        targetCell = [newCellRow, newCellCol];
    }
    clearGrid(keepWalls = true)
}

document.querySelectorAll('#mazes .dropdown-item').forEach(item => {
    item.addEventListener('click', event => {
        if (inProgress) { updateMessage(); return; }
        const maze = event.target.innerText;
        if (maze === "Random") { randomMaze(); }
        else if (maze === "Recursive Division") { recursiveDivMaze(null); }
        else if (maze === "Recursive Division (Vertical Skew)") { recursiveDivMaze('vertical'); }
        else if (maze === "Recursive Division (Horizontal Skew)") { recursiveDivMaze('horizontal'); }
        else if (maze === "Spiral") { spiralMaze(); }
    })
})

// BUTTONS
dijkstraButton.addEventListener('click', () => {
    updateMessage();
    if (inProgress) return;
    traverseGrid('Dijkstra');
})

aStarButton.addEventListener('click', () => {
    updateMessage();
    if (inProgress) return;
    traverseGrid('aStar');
})

clearButton.addEventListener('click', () => {
    if (inProgress) return;
    clearGrid();
})

// FUNCTIONS
const createPrev = () => {
    const prev = [];

    for (let i = 0; i < totalRows; i++) {
        const row = [];
        prev.push(row);
        for (let j = 0; j < totalCols; j++) {
            row.push(null);
        }
    }
    return prev;
}

const createDistances = () => {
    const distances = [];

    for (let i = 0; i < totalRows; i++) {
        const row = [];
        distances.push(row);
        for (let j = 0; j < totalCols; j++) {
            row.push(Infinity);
        }
    }
    return distances;
}

const createVisited = () => {
    const visited = [];
    
    for (let i = 0; i < totalRows; i++) {
        const row = [];
        visited.push(row);
        for (let j = 0; j < totalCols; j++) {
            cellIsAWall(i, j, cells) ? row.push(true) : row.push(false);
        }
    }
    return visited;
}

const cellIsAWall = (i, j, cells) => {
    const cellNum = totalCols * i + j;
    return cells[cellNum].className === 'wall';
}

const makeWalls = () => {
    const walls = [];
    for (let i = 0; i < totalRows; i++) {
        const row = [];
        walls.push(row);
        for (let i = 0; i < totalCols; i++) {
            row.push(true);
        }
    }
    return walls;
}

// ALGORITHMS
const dijkstra = () => {
    let pathFound = false;
    const heapObj = new MinHeap(); //object containing an empty 'heap' array
    const prev = createPrev();
    const visited = createVisited();
    const distances = createDistances();
    
    distances[startCell[0]][startCell[1]] = 0; //sets the start-node's distance to 0

    heapObj.heap.push([0, startCell]); //pushes the cell's distance & location into the heap
    heapObj.siftUp(heapObj.heap.length - 1);
    cellsToAnimate.push([startCell, 'searching']);

    while (heapObj.heap.length > 0) {
        const cell = heapObj.getMin(); // [distance, location]
        const r = cell[1][0];
        const c = cell[1][1];
        if (visited[r][c]) continue;
        visited[r][c] = true;
        cellsToAnimate.push([[r, c], 'visited']);
        if (r === targetCell[0] && c === targetCell[1]) {
            pathFound = true;
            break;
        }

        const neighbors = getNeighbors(r, c); // [top, left, bottom, right]
        for (let i = 0; i < neighbors.length; i++) {
            const nr = neighbors[i][0];
            const nc = neighbors[i][1];
            if (visited[nr][nc]) continue;
            const newDistance = distances[r][c] + 1;
            if (newDistance < distances[nr][nc]) {
                distances[nr][nc] = newDistance;
                prev[nr][nc] = [r, c];
                heapObj.heap.push([newDistance, [nr, nc]]);
                heapObj.siftUp(heapObj.heap.length - 1);
                cellsToAnimate.push([[nr, nc], 'searching']);
            }
        }
    }

    if (pathFound) {
        let r = targetCell[0];
        let c = targetCell[1];
        cellsToAnimate.push([targetCell, 'success']);
        while (prev[r][c] !== null) {
            const prevCell = prev[r][c];
            r = prevCell[0];
            c = prevCell[1];
            cellsToAnimate.push([ [r, c], 'success']);
        }
    }
    return pathFound;
}

const aStar = () => {
    let pathFound = false;
    const heapObj = new MinHeap();
    const prev = createPrev();
    const distances = createDistances();
    const costs = createDistances();
    const visited = createVisited();

    distances[startCell[0]][startCell[1]] = 0;
    costs[startCell[0]][startCell[1]] = 0;
    heapObj.heap.push([0, startCell]);
    cellsToAnimate.push([startCell, 'searching']);

    while (heapObj.heap.length > 0) {
        const cell = heapObj.getMin(); // [distance, location]
        const r = cell[1][0];
        const c = cell[1][1];
        if (visited[r][c]) continue;
        visited[r][c] = true;
        cellsToAnimate.push([[r, c], 'visited']);
        if (r === targetCell[0] && c === targetCell[1]) {
            pathFound = true;
            break;
        }

        const neighbors = getNeighbors(r, c); // [top, left, bottom, right]
        for (let i = 0; i < neighbors.length; i++) {
            const nr = neighbors[i][0];
            const nc = neighbors[i][1];
            if (visited[nr][nc]) continue;
            const newDistance = distances[r][c] + 1;
            if (newDistance < distances[nr][nc]) {
                distances[nr][nc] = newDistance;
                prev[nr][nc] = [r, c];
                cellsToAnimate.push([[nr, nc], 'searching']);
            }
            // f(n) = g(n) + h(n)
            const newCost = distances[nr][nc] + Math.abs(targetCell[0] - nr) + Math.abs(targetCell[1] - nc);
            if (newCost < costs[nr][nc]) {
                costs[nr][nc] = newCost;
                heapObj.heap.push([newCost, [nr, nc]]);
            }
        }
    }

    if (pathFound) {
        let r = targetCell[0];
        let c = targetCell[1];
        cellsToAnimate.push([targetCell, 'success']);
        while (prev[r][c] !== null) {
            const prevCell = prev[r][c];
            r = prevCell[0];
            c = prevCell[1];
            cellsToAnimate.push([[r, c], 'success']);
        }
    }
    return pathFound;
}

const getNeighbors = (r, c) => {
    const neighbors = [];
    if (r > 0) { neighbors.push([r - 1, c]); }
    if (c > 0) { neighbors.push([r, c - 1]); }
    if (r < totalRows - 1) { neighbors.push([r + 1, c]); }
    if (c < totalCols - 1) { neighbors.push([r, c + 1]); }
    return neighbors;
}

// MAZES
const randomMaze = async () => {
    inProgress = true;
    clearGrid();
    const visited = createVisited();
    const walls = makeWalls();
    const cells = [startCell, targetCell];
    walls[startCell[0]][startCell[1]] = false;
    walls[targetCell[0]][targetCell[1]] = false;
    visited[startCell[0]][startCell[1]] = true;
    visited[targetCell[0]][targetCell[1]] = true;

    while (cells.length > 0){
        const random = Math.floor(Math.random() * cells.length);
        const randomCell = cells[random];
        cells[random] = cells[cells.length - 1];
        cells.pop();
        const neighbors = getNeighbors(randomCell[0], randomCell[1]);
        if (neighborsThatAreWalls(neighbors, walls) < 2){ continue; }
        walls[ randomCell[0]][randomCell[1]] = false;
        for (let i = 0; i < neighbors.length; i++){
            const r = neighbors[i][0];
            const c = neighbors[i][1];
            if (visited[r][c]){ continue; }
            visited[r][c] = true;
            cells.push([r, c]);
        }
    }

    for (let r = 0; r < totalRows; r++){
        for (let c = 0; c < totalCols; c++){
            if (r == 0 || r == (totalRows - 1) || c == 0 || c == (totalCols - 1) || walls[r][c]){ 
                cellsToAnimate.push([ [r, c], "wall"]); 
            }
        }
    }

    await animateCells(15);
    inProgress = false;
}

const neighborsThatAreWalls = (neighbors, walls) => {
    let neighboringWalls = 0;
    for (let i = 0; i < neighbors.length; i++) {
        const r = neighbors[i][0];
        const c = neighbors[i][1];
        if (walls[r][c]) { neighboringWalls++; }
    }
    return neighboringWalls;
}

const spiralMaze = async () => {
    inProgress = true;
    clearGrid();

    let length = 1;
    const direction = {
        "0": [-1, 1],  //northeast
        "1": [1, 1],   //southeast
        "2": [1, -1],  //southwest
        "3": [-1, -1], //northwest
    };
    const cell = [Math.floor(totalRows / 2), Math.floor(totalCols / 2)];
    while (inBounds(cell)){
        const rIncrement = direction[length % 4][0];
        const cIncrement = direction[length % 4][1];
        for (let count = 0; count < length; count++){
            const r = cell[0];
            const c = cell[1];
            cellsToAnimate.push([[r, c], "wall"]);
            cell[0] += rIncrement;
            cell[1] += cIncrement;
            if (!inBounds(cell)){ break; }
        }
        length += 1;
    }
    await animateCells(40);
    inProgress = false;
}

const inBounds = cell => cell[0] >= 0 && cell[1] >= 0 && cell[0] < totalRows && cell[1] < totalCols;

const recursiveDivMaze = async bias => {
    inProgress = true;
    clearGrid();

    for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
            if (r === 0 || c === 0 || r === (totalRows - 1) || c === (totalCols - 1)) {
                cellsToAnimate.push([[r, c], 'wall']);
            }
        }
    }

    const walls = createVisited();
    const passages = createVisited();
    recursiveDivMazeHelper(1, (totalRows - 2), 1, (totalCols - 2), 2, (totalRows - 3), 2, (totalCols - 3), walls, passages, bias);
    await animateCells(15);
    inProgress = false;
}

const recursiveDivMazeHelper = (iStart, iEnd, jStart, jEnd, horzStart, horzEnd, vertStart, vertEnd, walls, passages, bias) => {
    var height = iEnd - iStart + 1;
    var width = jEnd - jStart + 1;
    var canMakeVertWall = (vertEnd - vertStart) >= 0;
    var canMakeHorzWall = (horzEnd - horzStart) >= 0;
    if (height < 3 || width < 3 || !canMakeVertWall | !canMakeHorzWall) { 
        return; 
    }
    // Choose line orientation
    var x = Math.floor(Math.random() * 10);
    if (bias == "vertical"){
        var lineOrientation = x < 8 ? "vertical" : "horizontal"; // weighting: 90/10 (V/H)
    }
    if (bias == "horizontal"){
        var lineOrientation = x < 1 ? "vertical" : "horizontal"; // weighting: 10/90 (V/H)
    } 
    else { 
        var lineOrientation = x < 5 ? "vertical" : "horizontal"; // weighting: 50/50 (V/H)
    }

    // Draw line and create random passage
    if (lineOrientation === "vertical"){
        var vertWidth = vertEnd - vertStart + 1;
        var randCol = Math.floor(Math.random() * vertWidth) + vertStart;
        if (passages[iStart][randCol]){
            var randRow = iStart;
        }
        if (passages[iEnd][randCol]){
            var randRow = iEnd;
        } 
        else {
            var randRow = (Math.floor(Math.random() * 2) == 0) ? iStart: iEnd; // random end assignment
        }

        for (var i = iStart; i <= iEnd; i++){
            if ( passages[i][randCol] ){ continue; }
            if (i == randRow){
                // Make passages
                for (var j = randCol - 1; j <= randCol + 1; j++){
                    passages[i][j] = true;
                }
            } 
            else { 
                walls[i][randCol] = true;
                cellsToAnimate.push([ [i, randCol], "wall"]); 
            }
        }

        recursiveDivMazeHelper(iStart, iEnd, jStart, (randCol - 1), horzStart, horzEnd, vertStart, (randCol - 2), walls, passages); //left
        recursiveDivMazeHelper(iStart, iEnd, (randCol + 1), jEnd, horzStart, horzEnd, (randCol + 2), vertEnd, walls, passages); //right
    }

    else {
        var horzHeight = horzEnd - horzStart + 1;
        var randRow = Math.floor(Math.random() * horzHeight) + horzStart;
        if (passages[randRow][jStart]){
            var randCol = jStart;
        }
        if (passages[randRow][jEnd]){
            var randCol = jEnd;
        }
        else {
            var randCol = (Math.floor(Math.random() * 2) == 0) ? jStart: jEnd; // random end assignment
        }

        for (var j = jStart; j <= jEnd; j++){
            if ( passages[randRow][j] ){ continue; }
            if (j == randCol){
                // Make passages
                for (var i = randRow - 1; i <= randRow + 1; i++){
                    passages[i][j] = true;
                }
            } else { 
                walls[randRow][j] = true; 
                cellsToAnimate.push([ [randRow, j], "wall"]); 
            }
        }

        recursiveDivMazeHelper(iStart, (randRow - 1), jStart, jEnd, horzStart, (randRow - 2), vertStart, vertEnd, walls, passages); //up
        recursiveDivMazeHelper((randRow + 1), iEnd, jStart, jEnd, (randRow + 2), horzEnd, vertStart, vertEnd, walls, passages); //down
    }
}
 
const traverseGrid = async algorithm => {
    inProgress = true;
    clearGrid(keepWalls = true);
    const pathFound = algorithm === 'Dijkstra' ? dijkstra() : aStar();
    await animateCells();
    pathFound ? updateResult(true, countLength()) : updateResult(false, countLength());
    inProgress = false;
    justFinished = true;
}

const animateCells = async delay => {
    const startCellIndex = startCell[0] * totalCols + startCell[1];
    const targetCellIndex = targetCell[0] * totalCols + targetCell[1];

    for (let i = 0; i < cellsToAnimate.length; i++) {
        const cellCoordinates = cellsToAnimate[i][0];
        const x = cellCoordinates[0];
        const y = cellCoordinates[1];
        const num = x * totalCols + y;
        if (num === startCellIndex || num === targetCellIndex) continue;
        const cell = cells[num];
        const colorClass = cellsToAnimate[i][1];

        await new Promise(resolve => setTimeout(resolve, delay));

        cell.classList.remove(...cell.classList);
        cell.classList.add(colorClass);
    }

    cellsToAnimate = [];
    return new Promise(resolve => resolve(true));
}

const updateResult = (pathFound, length) => {
    result.classList.add('magictime', 'swashOut');

    setTimeout(() => {
        resultIcon.classList.remove(...resultIcon.classList);

        if (pathFound) {
            result.style.backgroundColor = '#28A745';
            result.style.transition = 'background-color 0.5s linear';
            resultIcon.classList.add('fas', 'fa-check');
            message.style.fontSize = '16px';
            message.innerText = `Path Length: ${length}`;
        }
        else {
            result.style.backgroundColor = '#ff6961';
            resultIcon.classList.add('fas', 'fa-times');
            message.innerText = "Couldn't find a path to the target node.";
        }
        
        result.classList.remove('swashOut');
        result.classList.add('swashIn');
    }, 1000)
}

const updateMessage = () => {
    result.style.backgroundColor = '#FFC107';
    resultIcon.classList.remove(...resultIcon.classList);
    resultIcon.classList.add('fas', 'fa-exclamation');
    message.style.fontSize = '12px';
    message.innerText = 'Please wait for the algorithm to finish running.';
}

// COUNTS LENGTH OF THE SHORTEST PATH
const countLength = () => cells.reduce((a, c) => c.className === 'success' ? a + 1 : a, 0);

const clearGrid = keepWalls => {
    const startCellIndex = (startCell[0] * (totalCols)) + startCell[1];
    const targetCellIndex = (targetCell[0] * (totalCols)) + targetCell[1];

    for (let i = 0; i < cells.length; i++){

        const isWall = cells[i].className === 'wall';
        cells[i].classList.remove(...cells[i].classList);
        
        if (i === startCellIndex) {
            cells[i].classList.add('start'); 
        }
        
        if (i === targetCellIndex) {
            cells[i].classList.add('target');
        }

        if (keepWalls && isWall) { 
            cells[i].classList.add('wall');
        }
    }
}

clearGrid();

$(window).on('load', function() {
    $('#exampleModalLong').modal('show');
})