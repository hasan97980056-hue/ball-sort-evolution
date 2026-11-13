import { solveBoard } from './solver';
import { type BoardState } from './state';

function runTest(testName: string, board: BoardState) {
    console.log(`\n================================`);
    console.log(`🧪 TEST: ${testName}`);
    
    const startTime = Date.now();
    const result = solveBoard(board);
    const timeTaken = Date.now() - startTime;
    
    if (result === null) {
        console.log(`❌ RESULT: NULL (Unsolvable or Hit 5000 Iteration Limit)`);
    } else {
        console.log(`✅ RESULT: SOLVED in ${result.length} moves.`);
        if (result.length <= 3) {
            console.log(`📝 PATH: ${JSON.stringify(result)}`);
        }
    }
    console.log(`⏱️ TIME TAKEN: ${timeTaken}ms`);
}

// 1. Already Solved
runTest("Already Solved Board", [
    [1, 1, 1, 1], [2, 2, 2, 2], [], []
]);

// 2. One-Move Solution (Tests Tube Index Preservation)
// Red ball is at tube 2, needs to go to tube 0.
runTest("One-Move Solution", [
    [1, 1, 1], [2, 2, 2, 2], [1], []
]);

// 3. Multiple-Move Solution (Tests Canonical Equivalent States)
runTest("Multiple-Move Solution", [
    [1, 1, 2, 2], [2, 2, 1, 1], [], []
]);

// 4. Unsolvable Board (No empty tubes, no valid moves)
runTest("Unsolvable Board", [
    [1, 2, 1, 2], [2, 1, 2, 1], [1, 2, 1, 2], [2, 1, 2, 1]
]);

// 5. Search Limit Reached (Complex 6-tube board to force timeout limit)
runTest("Search Limit Reached (Complex Board)", [
    [1, 2, 3, 4], [4, 3, 2, 1], [2, 1, 4, 3], [3, 4, 1, 2], [], []
]);

console.log(`\n🎉 ALL DETERMINISTIC TESTS COMPLETED!\n`);
