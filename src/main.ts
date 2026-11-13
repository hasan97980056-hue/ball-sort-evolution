import { type GameState, initializeGame, cloneBoard } from './state';
import { drawBoard } from './render';
import { handlePointerDown, getSelectedTubeIndex, clearSelection } from './input';
import { generateSolvableLevel } from './generator';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = ''; 

// 1. Setup Canvas (Game Layer)
const canvas = document.createElement('canvas');
canvas.style.touchAction = 'none'; 
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '1';
app.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// 2. Setup UI Overlay (Button Layer)
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
// Safe-area for mobile notches/bottom bars
uiContainer.style.bottom = 'max(40px, env(safe-area-inset-bottom))'; 
uiContainer.style.width = '100%';
uiContainer.style.display = 'flex';
uiContainer.style.justifyContent = 'center';
uiContainer.style.gap = '20px';
uiContainer.style.zIndex = '10'; // Keep strictly above canvas
app.appendChild(uiContainer);

const btnStyle = "padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 10px; background: rgba(255, 255, 255, 0.1); color: white; backdrop-filter: blur(5px); border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer; touch-action: manipulation; transition: opacity 0.2s;";

const undoBtn = document.createElement('button');
undoBtn.innerHTML = '↩️ Undo';
undoBtn.style.cssText = btnStyle;

const restartBtn = document.createElement('button');
restartBtn.innerHTML = '🔄 Restart';
restartBtn.style.cssText = btnStyle;

uiContainer.appendChild(undoBtn);
uiContainer.appendChild(restartBtn);

// 3. Engine State & DPR Tracking
let gameState: GameState; 
let currentLevel = 1;
let isAnimating = false; 
let logicalWidth = window.innerWidth;
let logicalHeight = window.innerHeight;

// 🛡️ FIX 2: Responsive Canvas & Safe DPR scaling
function resizeCanvas() {
    logicalWidth = window.innerWidth;
    logicalHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
    
    if (gameState) render();
}
window.addEventListener('resize', resizeCanvas);

function loadNextLevel() {
    isAnimating = true;
    try {
        const levelData = generateSolvableLevel(4); 
        gameState = initializeGame(levelData.board);
        clearSelection(); // Reset selection on new level
        isAnimating = false;
        render();
    } catch (error) {
        console.error("Generator error:", error);
        alert("Oops! Failed to generate a level. Please refresh.");
    }
}

function render() {
    if (!gameState) return;
    const dpr = window.devicePixelRatio || 1;
    
    // Reset transform to identity, then scale (Prevents stacking scale operations)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight); 
    
    // Pass logical coordinates to the render engine
    drawBoard(ctx, gameState.board, logicalWidth, logicalHeight, getSelectedTubeIndex());
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${currentLevel}`, logicalWidth / 2, logicalHeight * 0.1);

    // Update UI Button States
    const canUndo = gameState.history.length > 0;
    undoBtn.style.opacity = canUndo ? '1' : '0.4';
    undoBtn.disabled = !canUndo; // Block native click if disabled
}

function handleWin() {
    isAnimating = true; 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL CLEARED!', logicalWidth / 2, logicalHeight / 2);
    
    setTimeout(() => {
        currentLevel++;
        loadNextLevel();
    }, 1500);
}

// 4. Input Wiring with Strict Safety
undoBtn.addEventListener('click', () => {
    if (isAnimating || gameState.history.length === 0) return;
    gameState.board = gameState.history.pop()!;
    clearSelection(); // 🛡️ FIX 1: Deselect tube after undo
    render();
});

restartBtn.addEventListener('click', () => {
    if (isAnimating) return;
    gameState.board = cloneBoard(gameState.initialBoard);
    gameState.history = []; 
    clearSelection(); // 🛡️ FIX 1: Deselect tube after restart
    render();
});

canvas.addEventListener('pointerdown', (e) => {
    if (isAnimating) return; 
    handlePointerDown(e, canvas, gameState, render, handleWin);
});

// Boot the engine
resizeCanvas(); // Set initial dimensions
loadNextLevel();
