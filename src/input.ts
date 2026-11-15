import { type GameState, cloneBoard } from './state';
import { isValidMove, executeMove, isGameWon } from './logic';

let selectedTubeIndex: number | null = null;

function getTappedTubeIndex(
    x: number, y: number, boardSize: number, 
    logicalWidth: number, logicalHeight: number // Changed to logical pixels
): number | null {
    const tubeWidth = Math.min(60, logicalWidth / (boardSize + 1.5));
    const gap = 20;
    const totalWidth = (boardSize * tubeWidth) + ((boardSize - 1) * gap);
    
    const startX = (logicalWidth - totalWidth) / 2;
    const startY = logicalHeight * 0.3;
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
    gameState: GameState, 
    onStateChange: () => void,
    onWin: () => void
) {
    const rect = canvas.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    // 🛡️ DPR FIX: Pass CSS logical dimensions (rect.width/height) instead of physical canvas.width
    const tappedIndex = getTappedTubeIndex(touchX, touchY, gameState.board.length, rect.width, rect.height);

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
            gameState.history.push(cloneBoard(gameState.board));
            
            gameState.board = executeMove(gameState.board, selectedTubeIndex, tappedIndex);
            
            if (isGameWon(gameState.board)) {
                selectedTubeIndex = null;
                onStateChange(); 
                setTimeout(() => {
                    onWin();
                }, 300);
                return;
            }
        }
        selectedTubeIndex = null;
    }
    
    onStateChange();
}

export function getSelectedTubeIndex(): number | null {
    return selectedTubeIndex;
}

// 🛡️ FIX 1: Safely clear selection from outside (used by Undo/Restart)
export function clearSelection(): void {
    selectedTubeIndex = null;
}
