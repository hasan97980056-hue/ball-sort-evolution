import { type BoardState, TUBE_CAPACITY } from './state';
import { isGameWon, isValidMove, executeMove } from './logic';

export function canonicalizeState(board: BoardState): string {
    const serializedTubes = board.map(tube => tube.join(','));
    serializedTubes.sort();
    return serializedTubes.join('|');
}

export function calculateHeuristic(board: BoardState): number {
    let misalignedCount = 0;
    for (const tube of board) {
        if (tube.length === 0) continue;
        const firstColor = tube[0];
        const isUniform = tube.every(ball => ball === firstColor);
        if (!isUniform) {
            misalignedCount += tube.length;
        } else if (tube.length < TUBE_CAPACITY) {
            misalignedCount += (TUBE_CAPACITY - tube.length);
        }
    }
    return misalignedCount;
}

// OPTIMIZED NODE STRUCTURE (Fixed Memory Bloat)
export interface SearchNode {
    board: BoardState;
    parent: SearchNode | null; // Pointer to parent instead of cloning arrays
    lastMove: { from: number; to: number } | null;
    g: number;
    h: number;
    f: number;
}

// Helper to backtrace the optimal path from the winning node
function reconstructPath(node: SearchNode): { from: number; to: number }[] {
    const path: { from: number; to: number }[] = [];
    let current: SearchNode | null = node;
    while (current && current.lastMove) {
        path.unshift(current.lastMove);
        current = current.parent;
    }
    return path;
}

export function solveBoard(initialBoard: BoardState): { from: number; to: number }[] | null {
    const openList: SearchNode[] = [];
    const closedSet = new Set<string>();

    const startNode: SearchNode = {
        board: initialBoard,
        parent: null,
        lastMove: null,
        g: 0,
        h: calculateHeuristic(initialBoard),
        f: 0
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);
    
    let iterations = 0;
    const MAX_ITERATIONS = 5000;

    while (openList.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // OPTIMIZED RETRIEVAL (Fixed sort & shift bottleneck)
        let bestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[bestIndex].f) {
                bestIndex = i;
            }
        }
        
        // Fast removal: Swap with last element and pop (O(1) removal instead of O(N) shift)
        const currentNode = openList[bestIndex];
        openList[bestIndex] = openList[openList.length - 1];
        openList.pop();
        
        const hash = canonicalizeState(currentNode.board);
        if (closedSet.has(hash)) continue; 
        closedSet.add(hash);

        if (isGameWon(currentNode.board)) {
            return reconstructPath(currentNode);
        }

        for (let from = 0; from < currentNode.board.length; from++) {
            for (let to = 0; to < currentNode.board.length; to++) {
                if (isValidMove(currentNode.board, from, to)) {
                    const newBoard = executeMove(currentNode.board, from, to);
                    const newHash = canonicalizeState(newBoard);
                    
                    if (!closedSet.has(newHash)) {
                        const g = currentNode.g + 1;
                        const h = calculateHeuristic(newBoard);
                        openList.push({
                            board: newBoard,
                            parent: currentNode,
                            lastMove: { from, to },
                            g: g,
                            h: h,
                            f: g + h
                        });
                    }
                }
            }
        }
    }
    return null; 
}
