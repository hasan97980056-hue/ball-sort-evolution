import { type BoardState, TUBE_CAPACITY } from './state';
import { solveBoard } from './solver';

function getLevelConfig(level: number) {
    let numColors = 3;
    if (level === 1) numColors = 3;
    else if (level <= 3) numColors = 4;
    else if (level <= 6) numColors = 5;
    else if (level <= 10) numColors = 6;
    else if (level <= 16) numColors = 7;
    else if (level <= 24) numColors = 8;
    else {
        // Wave progression for Level 25+ so levels vary between 7, 8, 9, and 10 colors
        const wave = [9, 8, 9, 10, 7, 9, 10, 8, 9, 10];
        numColors = wave[level % wave.length];
    }

    const numEmpty = 2;
    return { numColors, numTubes: numColors + numEmpty };
}

function createScrambledBoard(numColors: number, numTubes: number): BoardState {
    for (let attempt = 0; attempt < 60; attempt++) {
        const pool: number[] = [];
        for (let c = 1; c <= numColors; c++) {
            for (let i = 0; i < TUBE_CAPACITY; i++) {
                pool.push(c);
            }
        }

        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const board: BoardState = [];
        let idx = 0;
        let hasSolvedTube = false;

        for (let t = 0; t < numTubes; t++) {
            if (t < numColors) {
                const tube = pool.slice(idx, idx + TUBE_CAPACITY);
                idx += TUBE_CAPACITY;
                if (tube.every(b => b === tube[0])) {
                    hasSolvedTube = true;
                }
                board.push(tube);
            } else {
                board.push([]);
            }
        }

        if (!hasSolvedTube) {
            return board;
        }
    }

    const fallback: BoardState = [];
    for (let t = 0; t < numTubes; t++) {
        if (t < numColors) {
            const tube: number[] = [];
            for (let i = 0; i < TUBE_CAPACITY; i++) {
                tube.push(((t + i) % numColors) + 1);
            }
            fallback.push(tube);
        } else {
            fallback.push([]);
        }
    }
    return fallback;
}

export function generateSolvableLevel(level: number = 1): { board: BoardState, optimalMoves: number } {
    const { numColors, numTubes } = getLevelConfig(level);

    if (numColors <= 4) {
        for (let attempt = 0; attempt < 15; attempt++) {
            const candidate = createScrambledBoard(numColors, numTubes);
            const solution = solveBoard(candidate);
            if (solution !== null && solution.length >= 5) {
                return { board: candidate, optimalMoves: solution.length - 1 };
            }
        }
    }

    const board = createScrambledBoard(numColors, numTubes);
    return { board, optimalMoves: numColors * 4 };
}
