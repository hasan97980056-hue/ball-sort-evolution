import {
    type BoardState,
    type StorageLike,
    DEFAULT_COINS,
    DEFAULT_UNDOS,
    DEFAULT_HINTS,
    LEVEL_CLEAR_REWARD,
    LOCKED_LEVEL_MESSAGE,
    cloneBoard,
    loadSavedProgress,
    saveProgress,
    canContinueSavedGame,
    continueSavedGameProgress,
    startNewGameProgress,
    validateLevelNavigation,
    navigateToLevel,
    recordLevelCompletion,
} from './state';
import { executeMove, isGameWon } from './logic';

console.log('=== RUNNING PROGRESSION & START MENU TESTS ===');

let total = 0;
let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
    total++;
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err: any) {
        console.error(`[FAIL] ${name} -> ${err.message}`);
        failed++;
    }
}

class MemoryStorage implements StorageLike {
    private store = new Map<string, string>();

    getItem(key: string): string | null {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, String(value));
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }
}

const SAMPLE_LEVEL_1_BOARD: BoardState = [
    [1, 1, 1, 2],
    [2, 2, 2, 1],
    [3, 3, 3, 3],
    [],
    [],
];

const SAMPLE_LEVEL_2_BOARD: BoardState = [
    [1, 2, 1, 2],
    [2, 1, 2, 1],
    [3, 4, 3, 4],
    [4, 3, 4, 3],
    [],
    [],
];

function mockGenerator(level: number): BoardState {
    return level === 1 ? cloneBoard(SAMPLE_LEVEL_1_BOARD) : cloneBoard(SAMPLE_LEVEL_2_BOARD);
}

runTest('1 & 2. First-time player has no saved session and Continue is unavailable', () => {
    const storage = new MemoryStorage();
    const progress = loadSavedProgress(storage);

    if (progress.currentLevel !== 1 || progress.highestUnlockedLevel !== 1) {
        throw new Error('Expected Level 1 unlocked by default');
    }
    if (progress.hasSavedSession || canContinueSavedGame(progress)) {
        throw new Error('Expected Continue to be unavailable on fresh storage');
    }
    const cont = continueSavedGameProgress(progress);
    if (cont.allowed) {
        throw new Error('continueSavedGameProgress should fail when no save exists');
    }
});

runTest('3. New Game starts Level 1 and saves initial session', () => {
    const storage = new MemoryStorage();
    const initial = loadSavedProgress(storage);
    const started = startNewGameProgress(initial, SAMPLE_LEVEL_1_BOARD, storage);

    if (started.currentLevel !== 1 || started.highestUnlockedLevel !== 1) {
        throw new Error('New Game did not start at Level 1');
    }
    if (!canContinueSavedGame(started)) {
        throw new Error('Expected valid saved session after New Game starts');
    }
    if (JSON.stringify(started.currentBoard) !== JSON.stringify(SAMPLE_LEVEL_1_BOARD)) {
        throw new Error('Level 1 board mismatch');
    }
});

runTest('4. Completing Level 1 unlocks Level 2 and grants +50 coins', () => {
    const storage = new MemoryStorage();
    let progress = startNewGameProgress(loadSavedProgress(storage), SAMPLE_LEVEL_1_BOARD, storage);

    let board = cloneBoard(progress.currentBoard!);
    board = executeMove(board, 0, 3);
    board = executeMove(board, 1, 0);
    board = executeMove(board, 3, 1);

    if (!isGameWon(board)) {
        throw new Error('Expected board to be won');
    }

    const res = recordLevelCompletion(progress, 1, board, LEVEL_CLEAR_REWARD, storage);
    progress = res.progress;

    if (!res.rewardGranted || res.rewardAmount !== 50) {
        throw new Error('Expected first-time +50 reward on Level 1');
    }
    if (progress.coins !== DEFAULT_COINS + 50) {
        throw new Error(`Expected ${DEFAULT_COINS + 50} coins, got ${progress.coins}`);
    }
    if (progress.highestUnlockedLevel !== 2) {
        throw new Error(`Expected highestUnlockedLevel = 2, got ${progress.highestUnlockedLevel}`);
    }
    if (!progress.clearedLevels.includes(1)) {
        throw new Error('Level 1 was not recorded in clearedLevels');
    }
});

runTest('5 & 6. Locked Level 3 is blocked and Right Arrow cannot bypass uncleared Level 2', () => {
    const storage = new MemoryStorage();
    let progress = startNewGameProgress(loadSavedProgress(storage), SAMPLE_LEVEL_1_BOARD, storage);

    const trySkipLevel1 = navigateToLevel(progress, 2, mockGenerator, storage);
    if (trySkipLevel1.allowed || trySkipLevel1.reason !== LOCKED_LEVEL_MESSAGE) {
        throw new Error('Right arrow was allowed to skip uncleared Level 1');
    }

    const solvedBoard: BoardState = [[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3], [], []];
    progress = recordLevelCompletion(progress, 1, solvedBoard, LEVEL_CLEAR_REWARD, storage).progress;

    const moveLvl2 = navigateToLevel(progress, 2, mockGenerator, storage);
    if (!moveLvl2.allowed) {
        throw new Error('Expected Level 2 to be accessible after clearing Level 1');
    }
    progress = moveLvl2.progress;

    const tryLevel3 = navigateToLevel(progress, 3, mockGenerator, storage);
    if (tryLevel3.allowed || tryLevel3.reason !== LOCKED_LEVEL_MESSAGE) {
        throw new Error('Level 3 was not blocked while only Level 1 was cleared');
    }
    if (progress.currentLevel !== 2) {
        throw new Error('Blocked navigation mutated currentLevel');
    }
});

runTest('7 & 8. Left arrow navigates to unlocked Level 1 and preserves highestUnlockedLevel', () => {
    const storage = new MemoryStorage();
    let progress = startNewGameProgress(loadSavedProgress(storage), SAMPLE_LEVEL_1_BOARD, storage);
    const solvedBoard: BoardState = [[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3], [], []];
    progress = recordLevelCompletion(progress, 1, solvedBoard, LEVEL_CLEAR_REWARD, storage).progress;
    progress = navigateToLevel(progress, 2, mockGenerator, storage).progress;

    const leftTo1 = navigateToLevel(progress, 1, mockGenerator, storage);
    if (!leftTo1.allowed || leftTo1.progress.currentLevel !== 1) {
        throw new Error('Left arrow failed to navigate back to unlocked Level 1');
    }
    if (leftTo1.progress.highestUnlockedLevel !== 2) {
        throw new Error('Replaying Level 1 reduced highestUnlockedLevel');
    }

    const leftTo0 = validateLevelNavigation(0, leftTo1.progress.highestUnlockedLevel);
    if (leftTo0.allowed) {
        throw new Error('Left arrow allowed invalid Level 0');
    }
});

runTest('9 & 14. Continue and browser refresh restore exact mid-game board and undo history', () => {
    const storage = new MemoryStorage();
    let progress = startNewGameProgress(loadSavedProgress(storage), SAMPLE_LEVEL_1_BOARD, storage);

    const beforeMove = cloneBoard(progress.currentBoard!);
    const afterMove = executeMove(beforeMove, 0, 3);

    progress = {
        ...progress,
        currentBoard: afterMove,
        history: [beforeMove],
        undosLeft: 4,
        hintsLeft: 1,
        extraTubeAdded: true,
    };
    saveProgress(progress, storage);

    const reloaded = loadSavedProgress(storage);
    const continued = continueSavedGameProgress(reloaded);

    if (!continued.allowed) {
        throw new Error('Continue failed after simulated browser refresh');
    }
    if (JSON.stringify(continued.progress.currentBoard) !== JSON.stringify(afterMove)) {
        throw new Error('Continue did not restore exact mid-game currentBoard');
    }
    if (JSON.stringify(continued.progress.initialBoard) !== JSON.stringify(SAMPLE_LEVEL_1_BOARD)) {
        throw new Error('Continue did not preserve exact initialBoard for Restart');
    }
    if (continued.progress.history.length !== 1 || JSON.stringify(continued.progress.history[0]) !== JSON.stringify(beforeMove)) {
        throw new Error('Continue did not restore exact Undo history');
    }
    if (continued.progress.undosLeft !== 4 || continued.progress.hintsLeft !== 1 || !continued.progress.extraTubeAdded) {
        throw new Error('Continue did not restore exact booster states');
    }
});

runTest('10, 11 & 13. Cancel preserves progress; Confirm resets progression to Level 1 while retaining coins', () => {
    const storage = new MemoryStorage();
    let progress = startNewGameProgress(loadSavedProgress(storage), SAMPLE_LEVEL_1_BOARD, storage);
    const solvedBoard: BoardState = [[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3], [], []];
    progress = recordLevelCompletion(progress, 1, solvedBoard, LEVEL_CLEAR_REWARD, storage).progress;
    progress = navigateToLevel(progress, 2, mockGenerator, storage).progress;

    const afterCancel = loadSavedProgress(storage);
    if (afterCancel.currentLevel !== 2 || afterCancel.highestUnlockedLevel !== 2 || afterCancel.clearedLevels.length !== 1) {
        throw new Error('Canceling New Game altered saved progression');
    }

    const coinsBeforeReset = afterCancel.coins;
    const afterConfirm = startNewGameProgress(afterCancel, SAMPLE_LEVEL_1_BOARD, storage);

    if (afterConfirm.currentLevel !== 1 || afterConfirm.highestUnlockedLevel !== 1 || afterConfirm.clearedLevels.length !== 0) {
        throw new Error('Confirmed New Game did not reset progression to Level 1');
    }
    if (afterConfirm.coins !== coinsBeforeReset) {
        throw new Error(`Confirmed New Game lost player coins: expected ${coinsBeforeReset}, got ${afterConfirm.coins}`);
    }
    if (afterConfirm.undosLeft !== DEFAULT_UNDOS || afterConfirm.hintsLeft !== DEFAULT_HINTS || afterConfirm.extraTubeAdded !== false) {
        throw new Error('Confirmed New Game did not refresh per-level booster allowances');
    }
});

runTest('12. Replaying an already-cleared level does not award duplicate +50 coins', () => {
    const storage = new MemoryStorage();
    let progress = startNewGameProgress(loadSavedProgress(storage), SAMPLE_LEVEL_1_BOARD, storage);
    const solvedBoard: BoardState = [[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3], [], []];

    const firstClear = recordLevelCompletion(progress, 1, solvedBoard, LEVEL_CLEAR_REWARD, storage);
    const coinsAfterFirst = firstClear.progress.coins;

    const replayLvl1 = navigateToLevel(firstClear.progress, 1, mockGenerator, storage).progress;
    const secondClear = recordLevelCompletion(replayLvl1, 1, solvedBoard, LEVEL_CLEAR_REWARD, storage);

    if (secondClear.rewardGranted || secondClear.rewardAmount !== 0) {
        throw new Error('Duplicate completion reward was granted on level replay');
    }
    if (secondClear.progress.coins !== coinsAfterFirst) {
        throw new Error('Coins increased on duplicate level completion');
    }
    if (secondClear.progress.highestUnlockedLevel !== 2) {
        throw new Error('Replaying Level 1 altered highestUnlockedLevel');
    }
});

runTest('Bonus: Legacy bs_level and bs_coins migrate safely and corrupted JSON recovers gracefully', () => {
    const legacyStorage = new MemoryStorage();
    legacyStorage.setItem('bs_level', '3');
    legacyStorage.setItem('bs_coins', '6925');

    const migrated = loadSavedProgress(legacyStorage);
    if (migrated.highestUnlockedLevel !== 3 || migrated.currentLevel !== 3 || migrated.coins !== 6925) {
        throw new Error('Legacy bs_level and bs_coins failed to migrate accurately');
    }

    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem('bs_evolution_save_v1', '{bad_json');
    const recovered = loadSavedProgress(corruptStorage);
    if (recovered.currentLevel !== 1 || recovered.coins !== DEFAULT_COINS) {
        throw new Error('Corrupted storage did not fall back safely');
    }
});

console.log(`\n=== PROGRESSION RESULTS: ${total} Total | ${passed} Passed | ${failed} Failed ===`);

if (failed > 0) {
    throw new Error(`${failed} progression tests failed!`);
}
