export type BoardState = number[][];
export const TUBE_CAPACITY = 4;

export const COLOR_MAP: Record<number, string> = {
    1: '#FF3366', 2: '#33CCFF', 3: '#33FF66', 4: '#FFCC00',
    5: '#B833FF', 6: '#FF6633', 7: '#00FFCC', 8: '#FF99CC'
};

// NEW: Extended GameState interface
export interface GameState {
    board: BoardState;
    initialBoard: BoardState; // For Restart
    history: BoardState[];    // For Undo
}

// Helper to safely deep clone a board
export function cloneBoard(board: BoardState): BoardState {
    return board.map(tube => [...tube]);
}

export function initializeGame(initialBoard: BoardState): GameState {
    const safeBoard = cloneBoard(initialBoard);
    return {
        board: safeBoard,
        initialBoard: cloneBoard(safeBoard), // Keep a pristine copy for restart
        history: [] // Start with empty history
    };
}
