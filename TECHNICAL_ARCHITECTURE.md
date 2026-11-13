# HASAN AI GAME STUDIO X - TECHNICAL ARCHITECTURE

## 1. Engine Core
* **Framework:** Vanilla TypeScript bundled via Vite. No heavy engines (Phaser/PixiJS).
* **Render Loop:** `requestAnimationFrame` strictly controlling the HTML5 Canvas 2D context.
* **State Management:** Deterministic 1D Arrays (LIFO Stacks) completely decoupled from the rendering layer.

## 2. Input Management
* **API:** Pointer Events (`pointerdown`, `pointermove`).
* **CSS Restriction:** `touch-action: none` applied to the canvas to disable native browser zooming and swiping.

## 3. Performance & Memory Rules
* **Garbage Collection:** Strict object pooling required. Instantiating new objects/arrays inside the render loop is FORBIDDEN.
* **Device Pixel Ratio (DPR):** Capped at 1.5 - 2.0 to prevent thermal throttling on high-res mobile displays.

## 4. Algorithmic Solver
* **Isolation:** A* Search heuristic solver must run isolated inside a Web Worker.
* **Optimization:** State canonicalization (sorting tubes) required before hashing to prevent memory overflow.
