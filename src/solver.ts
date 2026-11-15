import { type BoardState, TUBE_CAPACITY, isValidColorId } from './state';
import { isValidMove, executeMove, isGameWon } from './logic';

export type SolverStatus = 
    | 'SOLVED' 
    | 'UNSOLVABLE' 
    | 'TIMEOUT' 
    | 'NODE_LIMIT' 
    | 'TRANSITION_LIMIT' 
    | 'MEMORY_LIMIT' 
    | 'INVALID_INPUT'
    | 'INTERNAL_ERROR';

export interface SolverResult {
    status: SolverStatus;
    solution: BoardState[] | null;
    nodesExpanded: number;
    transitionsGenerated: number;
    executionTimeMs: number;
}

interface SearchNode {
    board: BoardState;
    cost: number;
    parentKey: string | null;
}

function getRawBoardKey(board: BoardState): string {
    return JSON.stringify(board);
}

function areBoardsEqual(a: BoardState, b: BoardState): boolean {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const tubeA = a[i];
        const tubeB = b[i];
        if (!Array.isArray(tubeA) || !Array.isArray(tubeB) || tubeA.length !== tubeB.length) return false;
        for (let j = 0; j < tubeA.length; j++) {
            if (tubeA[j] !== tubeB[j]) return false;
        }
    }
    return true;
}

function validateLimits(maxNodes: number, maxTransitions: number, maxTimeMs: number, maxMemory: number): boolean {
    if (!Number.isInteger(maxNodes) || maxNodes <= 0) return false;
    if (!Number.isInteger(maxTransitions) || maxTransitions <= 0) return false;
    if (typeof maxTimeMs !== 'number' || !Number.isFinite(maxTimeMs) || maxTimeMs <= 0) return false;
    if (!Number.isInteger(maxMemory) || maxMemory <= 0) return false;
    return true;
}

function validateBoardInput(board: BoardState): boolean {
    if (!board || !Array.isArray(board) || board.length === 0) return false;
    
    let totalBalls = 0;
    const colorCounts = new Map<number, number>();

    for (const tube of board) {
        if (!Array.isArray(tube)) return false;
        if (tube.length > TUBE_CAPACITY) return false;
        
        for (const ball of tube) {
            if (!isValidColorId(ball)) return false;
            totalBalls++;
            colorCounts.set(ball, (colorCounts.get(ball) || 0) + 1);
        }
    }

    if (totalBalls === 0) return false;

    for (const count of colorCounts.values()) {
        if (count !== TUBE_CAPACITY) return false;
    }

    return true;
}

interface PQEntry {
    key: string;
    cost: number;
}

class MinPriorityQueue {
    private heap: PQEntry[] = [];

    push(entry: PQEntry) {
        this.heap.push(entry);
        this.upHeap(this.heap.length - 1);
    }

    pop(): PQEntry | undefined {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const bottom = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this.downHeap(0);
        }
        return top;
    }

    size(): number {
        return this.heap.length;
    }

    private upHeap(i: number) {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[i].cost < this.heap[p].cost) {
                [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
                i = p;
            } else {
                break;
            }
        }
    }

    private downHeap(i: number) {
        const len = this.heap.length;
        while ((i * 2) + 1 < len) {
            let left = (i * 2) + 1;
            let right = left + 1;
            let smallest = i;

            if (this.heap[left].cost < this.heap[smallest].cost) smallest = left;
            if (right < len && this.heap[right].cost < this.heap[smallest].cost) smallest = right;

            if (smallest !== i) {
                [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
                i = smallest;
            } else {
                break;
            }
        }
    }
}

export function verifySolutionPath(initialBoard: BoardState, solution: BoardState[]): boolean {
    if (!Array.isArray(solution) || solution.length === 0) return false;
    if (!validateBoardInput(initialBoard)) return false;
    if (!areBoardsEqual(solution[0], initialBoard)) return false;

    for (const state of solution) {
        if (!validateBoardInput(state)) return false;
    }

    if (!isGameWon(solution[solution.length - 1])) return false;

    for (let i = 0; i < solution.length - 1; i++) {
        const current = solution[i];
        const nextState = solution[i + 1];
        let validTransitionFound = false;

        for (let from = 0; from < current.length; from++) {
            for (let to = 0; to < current.length; to++) {
                if (!isValidMove(current, from, to)) continue;
                const candidateNext = executeMove(current, from, to);
                if (areBoardsEqual(candidateNext, nextState)) {
                    validTransitionFound = true;
                    break;
                }
            }
            if (validTransitionFound) break;
        }

        if (!validTransitionFound) return false;
    }

    return true;
}

function reconstructPath(goalKey: string, exploredNodes: Map<string, SearchNode>, initialBoard: BoardState): BoardState[] | null {
    const path: BoardState[] = [];
    let currentKey: string | null = goalKey;
    const visitedKeys = new Set<string>();

    while (currentKey !== null) {
        if (visitedKeys.has(currentKey)) return null; 
        visitedKeys.add(currentKey);

        const node = exploredNodes.get(currentKey);
        if (!node) return null; 

        path.unshift(node.board);
        currentKey = node.parentKey;
    }

    if (!verifySolutionPath(initialBoard, path)) return null;

    return path;
}

export function solvePuzzleDetailed(
    initialBoard: BoardState,
    maxExpandedNodes: number = 5000,
    maxGeneratedTransitions: number = 20000,
    maxTimeMs: number = 100,
    maxMemoryStates: number = 15000 
): SolverResult {
    const startTime = performance.now();

    if (!validateLimits(maxExpandedNodes, maxGeneratedTransitions, maxTimeMs, maxMemoryStates)) {
        return { status: 'INVALID_INPUT', solution: null, nodesExpanded: 0, transitionsGenerated: 0, executionTimeMs: 0 };
    }

    if (!validateBoardInput(initialBoard)) {
        return { status: 'INVALID_INPUT', solution: null, nodesExpanded: 0, transitionsGenerated: 0, executionTimeMs: 0 };
    }

    if (isGameWon(initialBoard)) {
        return { status: 'SOLVED', solution: [initialBoard], nodesExpanded: 0, transitionsGenerated: 0, executionTimeMs: performance.now() - startTime };
    }

    const pq = new MinPriorityQueue();
    const exploredNodes = new Map<string, SearchNode>();
    
    let nodesExpanded = 0;
    let transitionsGenerated = 0;

    const initialKey = getRawBoardKey(initialBoard);
    
    exploredNodes.set(initialKey, { board: initialBoard, cost: 0, parentKey: null });
    pq.push({ key: initialKey, cost: 0 });

    while (pq.size() > 0) {
        const executionTime = performance.now() - startTime;
        if (executionTime > maxTimeMs) {
            return { status: 'TIMEOUT', solution: null, nodesExpanded, transitionsGenerated, executionTimeMs: executionTime };
        }

        const currentEntry = pq.pop()!;
        const currentRecord = exploredNodes.get(currentEntry.key);
        
        if (!currentRecord || currentEntry.cost > currentRecord.cost) continue;

        if (nodesExpanded >= maxExpandedNodes) {
            return { status: 'NODE_LIMIT', solution: null, nodesExpanded, transitionsGenerated, executionTimeMs: performance.now() - startTime };
        }
        nodesExpanded++;

        if (isGameWon(currentRecord.board)) {
            const solution = reconstructPath(currentEntry.key, exploredNodes, initialBoard);
            if (!solution) return { status: 'INTERNAL_ERROR', solution: null, nodesExpanded, transitionsGenerated, executionTimeMs: performance.now() - startTime };
            return { status: 'SOLVED', solution, nodesExpanded, transitionsGenerated, executionTimeMs: performance.now() - startTime };
        }

        const currentBoard = currentRecord.board;
        const numTubes = currentBoard.length;
        
        for (let from = 0; from < numTubes; from++) {
            for (let to = 0; to < numTubes; to++) {
                if (from === to) continue;

                const nextBoard = executeMove(currentBoard, from, to);
                if (nextBoard === currentBoard) continue; 

                if (transitionsGenerated >= maxGeneratedTransitions) {
                    return { status: 'TRANSITION_LIMIT', solution: null, nodesExpanded, transitionsGenerated, executionTimeMs: performance.now() - startTime };
                }
                transitionsGenerated++;

                const nextKey = getRawBoardKey(nextBoard);
                const newCost = currentRecord.cost + 1;

                const existingRecord = exploredNodes.get(nextKey);
                
                if (!existingRecord || newCost < existingRecord.cost) {
                    
                    if (!existingRecord && exploredNodes.size >= maxMemoryStates) {
                         return { status: 'MEMORY_LIMIT', solution: null, nodesExpanded, transitionsGenerated, executionTimeMs: performance.now() - startTime };
                    }

                    exploredNodes.set(nextKey, { board: nextBoard, cost: newCost, parentKey: currentEntry.key });
                    pq.push({ key: nextKey, cost: newCost });
                }
            }
        }
    }

    return { status: 'UNSOLVABLE', solution: null, nodesExpanded, transitionsGenerated, executionTimeMs: performance.now() - startTime };
}

export function solveBoard(board: BoardState): BoardState[] | null {
    const result = solvePuzzleDetailed(board);
    if (result.status === 'SOLVED') {
        return result.solution;
    }
    return null; 
}
