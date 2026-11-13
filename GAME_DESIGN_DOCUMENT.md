# HASAN AI GAME STUDIO X - GAME DESIGN DOCUMENT

## 1. Core Mechanics (Ball Sort Evolution)
* **Objective:** Sort colored balls so each tube contains only one color.
* **Movement Rule 1:** A ball can only be moved to an empty tube or a tube where the top ball matches its color.
* **Movement Rule 2:** A tube has a strict maximum capacity (e.g., 4 balls).
* **Game State:** Infinite undo must be mathematically supported.

## 2. Visual Design & UI
* **Orientation:** Portrait-first mobile layout.
* **Style:** Minimalist, premium flat design. Vector graphics (SVG/Canvas) only.
* **Accessibility:** Color-blind safe palettes with optional distinct patterns on balls.
* **Feedback:** Snappy, high-quality touch response animations.

## 3. Difficulty & Progression
* **Procedural Approach:** Levels are NOT hardcoded. They are dynamically generated via a backward-shuffle algorithm starting from a solved state.
* **Difficulty Metric:** Measured by the minimum solution depth (calculated by A* solver) and the number of meaningful decision branches.
* **Scaling:** Gradual increase in the number of tubes and colors based on player performance.

## 4. MVP (Minimum Viable Product) Goals
* Functional tube and ball rendering.
* Correct validation of all movement rules.
* Working undo button.
* Procedural generation of valid, solvable levels.
