import { solvePuzzleDetailed } from './solver';
import { type BoardState } from './state';
import { executeMove, isGameWon } from './logic';

console.log("=== RUNNING DIJKSTRA SOLVER TESTS ===");

let total = 0;
let passed = 0;
let failed = 0;

function runTest(name: string, testFn: () => void) {
    total++;
    try {
        testFn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (error: any) {
        console.error(`[FAIL] ${name} -> ${error.message}`);
        failed++;
    }
}

function solveBFSLength(initialBoard: BoardState): number {
    const queue = [{ board: initialBoard, depth: 1 }];
    const visited = new Set<string>();
    visited.add(JSON.stringify(initialBoard));

    while (queue.length > 0) {
        const { board, depth } = queue.shift()!;
        if (isGameWon(board)) return depth;

        for (let from = 0; from < board.length; from++) {
            for (let to = 0; to < board.length; to++) {
                if (from === to) continue;
                const nextBoard = executeMove(board, from, to);
                if (nextBoard !== board) {
                    const key = JSON.stringify(nextBoard);
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ board: nextBoard, depth: depth + 1 });
                    }
                }
            }
        }
    }
    return -1;
}

function verifySolutionReplay(solution: BoardState[], initialBoard: BoardState): boolean {
    if (solution.length === 0) return false;
    if (!isGameWon(solution[solution.length - 1])) return false;
    if (JSON.stringify(solution[0]) !== JSON.stringify(initialBoard)) return false;

    for (let i = 0; i < solution.length - 1; i++) {
        const current = solution[i];
        const next = solution[i + 1];
        let foundValidTransition = false;

        for (let from = 0; from < current.length; from++) {
            for (let to = 0; to < current.length; to++) {
                if (from === to) continue;
                const testNext = executeMove(current, from, to);
                if (testNext !== current) {
                    if (JSON.stringify(testNext) === JSON.stringify(next)) {
                        foundValidTransition = true;
                        break;
                    }
                }
            }
            if (foundValidTransition) break;
        }
        if (!foundValidTransition) return false;
    }
    return true;
}

runTest('Already solved board', () => {
    const board: BoardState = [ [1, 1, 1, 1], [2, 2, 2, 2], [], [] ];
    const res = solvePuzzleDetailed(board);
    if (res.status !== 'SOLVED' || res.solution?.length !== 1) throw new Error("Expected SOLVED with length 1");
});

runTest('Valid solvable board & Solution Replay', () => {
    const board: BoardState = [ [1, 2, 1, 2], [2, 1, 2, 1], [], [] ];
    const res = solvePuzzleDetailed(board);
    if (res.status !== 'SOLVED') throw new Error("Failed to solve");
    if (!verifySolutionReplay(res.solution!, board)) throw new Error("Solution replay verification failed");
});

runTest('Initial board preservation (Value Check)', () => {
    const board: BoardState = [ [1, 2, 1, 2], [2, 1, 2, 1], [], [] ];
    const res = solvePuzzleDetailed(board);
    if (res.status !== 'SOLVED') throw new Error("Failed to solve");
    if (JSON.stringify(res.solution![0]) !== JSON.stringify(board)) throw new Error("Root board mismatch");
});

runTest('Invalid board validation (Wrong Color Count)', () => {
    const board: BoardState = [ [1, 1, 1, 1], [1, 2, 2, 2], [], [] ]; 
    const res = solvePuzzleDetailed(board);
    if (res.status !== 'INVALID_INPUT') throw new Error(`Expected INVALID_INPUT, got ${res.status}`);
});

runTest('Invalid board validation (Capacity Exceeded)', () => {
    const board: BoardState = [ [1, 1, 1, 1, 1], [], [] ]; 
    const res = solvePuzzleDetailed(board);
    if (res.status !== 'INVALID_INPUT') throw new Error(`Expected INVALID_INPUT, got ${res.status}`);
});

runTest('Invalid limits validation', () => {
    const board: BoardState = [ [1, 2, 1, 2], [2, 1, 2, 1], [], [] ]; 
    const res = solvePuzzleDetailed(board, -5, 10, 100, 15000); 
    if (res.status !== 'INVALID_INPUT') throw new Error(`Expected INVALID_INPUT, got ${res.status}`);
});

runTest('Exact node limit trigger', () => {
    const board: BoardState = [ [1, 2, 3, 4], [4, 3, 2, 1], [1, 3, 2, 4], [2, 1, 4, 3], [], [] ];
    const res = solvePuzzleDetailed(board, 5); 
    if (res.status !== 'NODE_LIMIT') throw new Error(`Expected NODE_LIMIT, got ${res.status}`);
    if (res.nodesExpanded > 5) throw new Error(`nodesExpanded exceeded limit: ${res.nodesExpanded}`);
});

runTest('Exact transition limit trigger', () => {
    const board: BoardState = [ [1, 2, 3, 4], [4, 3, 2, 1], [1, 3, 2, 4], [2, 1, 4, 3], [], [] ];
    const res = solvePuzzleDetailed(board, 5000, 10); 
    if (res.status !== 'TRANSITION_LIMIT') throw new Error(`Expected TRANSITION_LIMIT, got ${res.status}`);
    if (res.transitionsGenerated > 10) throw new Error(`transitionsGenerated exceeded limit: ${res.transitionsGenerated}`);
});

runTest('Memory limit trigger (Unique states)', () => {
    const board: BoardState = [ [1, 2, 3, 4], [4, 3, 2, 1], [1, 3, 2, 4], [2, 1, 4, 3], [], [] ];
    const res = solvePuzzleDetailed(board, 5000, 20000, 5000, 15); 
    if (res.status !== 'MEMORY_LIMIT') throw new Error(`Expected MEMORY_LIMIT, got ${res.status}`);
});

runTest('BFS shortest-path comparison', () => {
    const board: BoardState = [ [1, 2, 1, 2], [2, 1, 2, 1], [], [] ];
    const res = solvePuzzleDetailed(board);
    
    if (res.status !== 'SOLVED') throw new Error(`Expected SOLVED, got ${res.status}`);
    
    const bfsLength = solveBFSLength(board);
    if (bfsLength === -1) throw new Error("BFS failed to find a path");
    
    if (res.solution?.length !== bfsLength) {
        throw new Error(`Dijkstra length ${res.solution?.length} != BFS length ${bfsLength}`);
    }
});

console.log(`\n=== RESULTS: ${total} Total | ${passed} Passed | ${failed} Failed ===`);

if (failed > 0) {
    throw new Error(`${failed} tests failed! Process terminating.`);
}
