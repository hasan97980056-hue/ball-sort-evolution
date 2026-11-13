import { type BoardState, TUBE_CAPACITY } from './state';
import { solveBoard } from './solver';

const MAX_GENERATION_ATTEMPTS = 50; // SAFETY: Prevent infinite loops

// Returns both the board and its calculated difficulty (optimal moves)
export function generateSolvableLevel(numTubes: number = 4): { board: BoardState; optimalMoves: number } {
    // 1. Strict Input Validation
    if (numTubes < 3) {
        throw new Error("Validation Failed: A level must have at least 3 tubes.");
    }

    const numColors = numTubes - 2; // Always leave 2 tubes empty for playable space
    let attempt = 0;

    while (attempt < MAX_GENERATION_ATTEMPTS) {
        attempt++;
        
        // 2. Create and Shuffle Pool
        const pool: number[] = [];
        for (let c = 1; c <= numColors; c++) {
            for (let i = 0; i < TUBE_CAPACITY; i++) {
                pool.push(c);
            }
        }

        // Fisher-Yates Shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // 3. Distribute into Tubes
        const board: BoardState = [];
        let poolIdx = 0;
        for (let t = 0; t < numTubes; t++) {
            const tube: number[] = [];
            if (t < numColors) { 
                for (let i = 0; i < TUBE_CAPACITY; i++) {
                    tube.push(pool[poolIdx++]);
                }
            }
            board.push(tube);
        }

        // 4. Verification: Check mathematically if solvable within AI limits
        const solution = solveBoard(board);
        
        // Ensure it's solvable (not null) AND not too simple (scales with colors)
        if (solution !== null && solution.length >= Math.max(4, numColors * 2)) {
            console.log(`[Safe Generator] Verified solvable on attempt ${attempt}.`);
            return { board, optimalMoves: solution.length };
        }
    }

    // 5. Explicit Error Handling instead of hanging the device
    throw new Error(`Generator Timeout: Failed to find a solvable level after ${MAX_GENERATION_ATTEMPTS} attempts.`);
}
