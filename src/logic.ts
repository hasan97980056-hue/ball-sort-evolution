import { type BoardState, TUBE_CAPACITY } from './state';

// Rule 1: Check if a move is valid
export function isValidMove(board: BoardState, fromIndex: number, toIndex: number): boolean {
    // Cannot move to the same tube
    if (fromIndex === toIndex) return false;

    const fromTube = board[fromIndex];
    const toTube = board[toIndex];

    // Cannot move from an empty tube
    if (fromTube.length === 0) return false;

    // Cannot move to a full tube
    if (toTube.length >= TUBE_CAPACITY) return false;

    // Can always move to an empty tube
    if (toTube.length === 0) return true;

    // Colors must match
    const movingBall = fromTube[fromTube.length - 1];
    const topBall = toTube[toTube.length - 1];
    
    return movingBall === topBall;
}

// Rule 2: Execute the move and return a NEW board (for undo history)
export function executeMove(board: BoardState, fromIndex: number, toIndex: number): BoardState {
    if (!isValidMove(board, fromIndex, toIndex)) return board;

    // Deep copy the board to prevent mutating the history
    const newBoard = board.map(tube => [...tube]);
    
    const ball = newBoard[fromIndex].pop();
    if (ball !== undefined) {
        newBoard[toIndex].push(ball);
    }
    
    return newBoard;
}

// Rule 3: Check if the player has won the game
export function isGameWon(board: BoardState): boolean {
    for (const tube of board) {
        // A tube is valid if it's empty OR (full AND all balls are the same color)
        if (tube.length === 0) continue;
        if (tube.length !== TUBE_CAPACITY) return false;
        
        const firstColor = tube[0];
        const allSame = tube.every(ball => ball === firstColor);
        if (!allSame) return false;
    }
    return true;
}
