import { TUBE_CAPACITY, type BoardState } from './state';

// Colors for the balls (1 = Red, 2 = Blue)
const COLOR_MAP: Record<number, string> = {
    1: '#FF3B30', // Premium iOS Red
    2: '#007AFF', // Premium iOS Blue
};

// Main function to draw the entire board
export function drawBoard(ctx: CanvasRenderingContext2D, board: BoardState, width: number, height: number) {
    // 1. Clear Screen
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // 2. Dynamically calculate sizes based on mobile screen width
    const tubeWidth = Math.min(60, width / (board.length + 1.5)); 
    const gap = 20; // Space between tubes
    const totalWidth = (board.length * tubeWidth) + ((board.length - 1) * gap);
    
    // Center the board on the screen
    const startX = (width - totalWidth) / 2;
    const startY = height * 0.3; // Start 30% down from the top

    // Calculate ball radius and tube height
    const ballRadius = tubeWidth / 2 - 4; // 4px padding inside tube
    const tubeHeight = TUBE_CAPACITY * (ballRadius * 2 + 4) + 20; // Fit 4 balls + top padding

    // 3. Draw Each Tube and its Balls
    board.forEach((tube, tIndex) => {
        const x = startX + tIndex * (tubeWidth + gap);
        const y = startY;

        // --- Draw Tube Border (U-shape) ---
        ctx.strokeStyle = '#555555'; // Gray glass color
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y); // Top Left
        ctx.lineTo(x, y + tubeHeight); // Bottom Left
        ctx.lineTo(x + tubeWidth, y + tubeHeight); // Bottom Right
        ctx.lineTo(x + tubeWidth, y); // Top Right
        ctx.stroke();

        // --- Draw Balls inside the tube ---
        tube.forEach((colorId, bIndex) => {
            const ballX = x + tubeWidth / 2;
            // Calculate Y from bottom to top
            const ballY = y + tubeHeight - 10 - ballRadius - (bIndex * (ballRadius * 2 + 4));

            ctx.fillStyle = COLOR_MAP[colorId] || '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    });
}
