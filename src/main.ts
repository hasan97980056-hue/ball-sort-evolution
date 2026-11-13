import { initializeGame } from './state';
import { drawBoard } from './render';
import { handlePointerDown } from './input';
import { generateSolvableLevel } from './generator';
import './style.css';

// HASAN AI GAME STUDIO X - Engine Initialization
const app = document.querySelector<HTMLDivElement>('#app')!;

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.touchAction = 'none'; 
app.innerHTML = ''; 
app.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

let gameState: any;
let currentLevel = 1;
let isAnimating = false; // Prevents input while loading next level

function loadNextLevel() {
    isAnimating = true;
    try {
        // Safely generate a new level
        const levelData = generateSolvableLevel(4); 
        gameState = initializeGame(levelData.board);
        console.log(`Level ${currentLevel} Generated. AI Optimal moves: ${levelData.optimalMoves}`);
        isAnimating = false;
        render();
    } catch (error) {
        console.error("Generator error:", error);
        alert("Oops! Failed to generate a level. Please refresh the page.");
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear screen
    drawBoard(ctx, gameState.board, canvas.width, canvas.height);
    
    // Draw Current Level Text at the top
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${currentLevel}`, canvas.width / 2, canvas.height * 0.1);
}

function handleWin() {
    isAnimating = true; // Lock inputs
    
    // Draw "LEVEL CLEARED" Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2);
    
    // Wait 1.5 seconds, then load the next level
    setTimeout(() => {
        currentLevel++;
        loadNextLevel();
    }, 1500);
}

// Attach Touch/Click Input Listener
canvas.addEventListener('pointerdown', (e) => {
    if (isAnimating) return; // Block touches during win screen / loading
    
    // Pass the handleWin callback as the 5th argument
    handlePointerDown(e, canvas, gameState, render, handleWin);
});

// Start the Engine!
loadNextLevel();
