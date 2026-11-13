import { type BoardState, TUBE_CAPACITY, COLOR_MAP } from './state';

export function drawBoard(
    ctx: CanvasRenderingContext2D, 
    board: BoardState, 
    width: number, 
    height: number,
    selectedTubeIndex: number | null // NEW: Required parameter to force UI update
) {
    const tubeWidth = Math.min(60, width / (board.length + 1.5));
    const gap = 20;
    const totalWidth = (board.length * tubeWidth) + ((board.length - 1) * gap);
    
    const startX = (width - totalWidth) / 2;
    const startY = height * 0.3;
    const ballRadius = tubeWidth / 2 - 4;
    const tubeHeight = TUBE_CAPACITY * (ballRadius * 2 + 4) + 20;

    board.forEach((tube, tIndex) => {
        const x = startX + tIndex * (tubeWidth + gap);
        const y = startY;

        // Draw Tube Border
        ctx.shadowBlur = 0; // Reset shadow for tube
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + tubeHeight);
        ctx.lineTo(x + tubeWidth, y + tubeHeight);
        ctx.lineTo(x + tubeWidth, y);
        ctx.stroke();

        // Draw Balls
        tube.forEach((colorId, bIndex) => {
            const ballX = x + tubeWidth / 2;
            let ballY = y + tubeHeight - 10 - ballRadius - (bIndex * (ballRadius * 2 + 4));

            const isSelectedTube = tIndex === selectedTubeIndex;
            const isTopBall = bIndex === tube.length - 1;

            // ✨ THE MAGIC: Lift the top ball if this tube is selected!
            if (isSelectedTube && isTopBall) {
                ballY -= (ballRadius * 1.5); // Lift it up
                ctx.shadowColor = COLOR_MAP[colorId] || '#FFFFFF';
                ctx.shadowBlur = 15; // Add neon glow effect
            } else {
                ctx.shadowBlur = 0; // No glow for unselected balls
            }

            ctx.fillStyle = COLOR_MAP[colorId] || '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    ctx.shadowBlur = 0; // Safety reset
}
