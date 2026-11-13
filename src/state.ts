// HASAN AI GAME STUDIO X
// Core Game State - Ball Sort Evolution

// Colors will be represented by numbers (1 = Red, 2 = Blue, etc.)
export type ColorId = number;

// A Tube is a LIFO (Last-In-First-Out) stack of colors
export type Tube = ColorId[];

// The Board is a collection of Tubes
export type BoardState = Tube[];

// Strict game rules
export const TUBE_CAPACITY = 4;

// The complete state of the game at any moment
export interface GameState {
    board: BoardState;
    moves: number;
    history: BoardState[]; // Stores previous boards for infinite undo
}

// Function to start a new game
export function initializeGame(initialBoard: BoardState): GameState {
    return {
        board: initialBoard,
        moves: 0,
        history: [] // History starts empty
    };
}
