# Pathfinding Visualizer

An interactive, browser-based pathfinding visualizer. Place walls, drag start and end nodes, or generate a maze. Then pick an algorithm and watch it explore the grid in real time.

## Algorithms

| Algorithm | Shortest path? |
|-----------|---------------|
| Dijkstra's | Yes |
| A* (Manhattan heuristic) | Yes |
| DFS | No |

## Features

- Click or drag to place and erase walls
- Drag start and end nodes to reposition them
- Recursive division maze generator
- Speed slider with 5 levels
- Live status bar showing result, step count, and elapsed search time
- CSS-driven animations for visited cells and the final path
- Procedural sound effects via the Web Audio API

## Usage

No build step required. Open `index.html` in a browser.
