import { type BoardState } from './state';
import { isValidMove, executeMove, isGameWon } from './logic';

let selectedTubeIndex: number | null = null;

function getTappedTubeIndex(
    x: number, y: number, boardSize: number, 
    canvasWidth: number, canvasHeight: number
): number | null {
    const tubeWidth = Math.min(60, canvasWidth / (boardSize + 1.5));
    const gap = 20;
    const totalWidth = (boardSize * tubeWidth) + ((boardSize - 1) * gap);
    
    const startX = (canvasWidth - totalWidth) / 2;
    const startY = canvasHeight * 0.3;
    const tubeHeight = 4 * (tubeWidth - 8 + 4) + 20; 

    if (y < startY || y > startY + tubeHeight) return null;

    for (let i = 0; i < boardSize; i++) {
        const tubeX = startX + i * (tubeWidth + gap);
        if (x >= tubeX - 10 && x <= tubeX + tubeWidth + 10) {
            return i;
        }
    }
    return null;
}

export function handlePointerDown(
    e: PointerEvent, 
    canvas: HTMLCanvasElement, 
    gameState: { board: BoardState }, 
    onStateChange: () => void,
    onWin: () => void // NEW: Callback to trigger when the game is won
) {
    const rect = canvas.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    const tappedIndex = getTappedTubeIndex(touchX, touchY, gameState.board.length, canvas.width, canvas.height);

    if (tappedIndex === null) {
        selectedTubeIndex = null;
        onStateChange();
        return;
    }

    if (selectedTubeIndex === null) {
        if (gameState.board[tappedIndex].length > 0) {
            selectedTubeIndex = tappedIndex;
        }
    } else {
        if (isValidMove(gameState.board, selectedTubeIndex, tappedIndex)) {
            gameState.board = executeMove(gameState.board, selectedTubeIndex, tappedIndex);
            
            // NEW: Immediately check if this valid move solved the puzzle!
            if (isGameWon(gameState.board)) {
                selectedTubeIndex = null; // Clear selection
                onStateChange(); // Render the final winning move first
                
                // Add a tiny delay so the player can actually see the final ball drop 
                // before the "Next Level" logic kicks in.
                setTimeout(() => {
                    onWin();
                }, 300);
                return; // Stop processing further input for this tap
            }
        }
        selectedTubeIndex = null;
    }
    
    onStateChange();
}

export function getSelectedTubeIndex(): number | null {
    return selectedTubeIndex;
}
