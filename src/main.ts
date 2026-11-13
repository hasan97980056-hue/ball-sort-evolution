import { initializeGame } from './state';
import { drawBoard } from './render';
import { handlePointerDown, getSelectedTubeIndex } from './input';
import { generateSolvableLevel } from './generator';
import './style.css';

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
let isAnimating = false; 

function loadNextLevel() {
    isAnimating = true;
    try {
        const levelData = generateSolvableLevel(4); // Hardcoded 4 tubes for now
        gameState = initializeGame(levelData.board);
        isAnimating = false;
        render();
    } catch (error) {
        console.error("Generator error:", error);
        alert("Oops! Failed to generate a level. Please refresh.");
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    // ✨ FIX: Pass the getSelectedTubeIndex() to the render engine!
    drawBoard(ctx, gameState.board, canvas.width, canvas.height, getSelectedTubeIndex());
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${currentLevel}`, canvas.width / 2, canvas.height * 0.1);
}

function handleWin() {
    isAnimating = true; 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2);
    
    setTimeout(() => {
        currentLevel++;
        loadNextLevel();
    }, 1500);
}

canvas.addEventListener('pointerdown', (e) => {
    if (isAnimating) return; 
    handlePointerDown(e, canvas, gameState, render, handleWin);
});

loadNextLevel();
