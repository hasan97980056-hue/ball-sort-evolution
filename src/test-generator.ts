import { generateSolvableLevel } from './generator';

console.log("\n🛡️ Running SAFE Generator Test...");
try {
    const startTime = Date.now();
    const levelData = generateSolvableLevel(4);
    const timeTaken = Date.now() - startTime;

    console.log(`\n✅ Generated Board Array: ${JSON.stringify(levelData.board)}`);
    console.log(`🧠 AI Verified Difficulty: ${levelData.optimalMoves} optimal moves`);
    console.log(`⏱️ Total Execution Time: ${timeTaken}ms\n`);
} catch (error: any) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
}
