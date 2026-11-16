export type BoardState = number[][];
export const TUBE_CAPACITY = 4;

export const COLOR_MAP: Record<number, string> = {
    1: '#FF3366', 2: '#33CCFF', 3: '#33FF66', 4: '#FFCC00',
    5: '#B833FF', 6: '#FF6633', 7: '#00FFCC', 8: '#FF99CC', 9: '#8D5B3C', 10: '#64DD17'
};

export function isValidColorId(colorId: unknown): colorId is number {
    return (
        typeof colorId === 'number' &&
        Number.isInteger(colorId) &&
        colorId >= 1 &&
        colorId <= 10 &&
        Object.prototype.hasOwnProperty.call(COLOR_MAP, colorId)
    );
}

// Existing GameState interface
export interface GameState {
    board: BoardState;
    initialBoard: BoardState; // For Restart
    history: BoardState[];    // For Undo
}

// Helper to safely deep clone a board
export function cloneBoard(board: BoardState): BoardState {
    return board.map(tube => [...tube]);
}

export function initializeGame(initialBoard: BoardState): GameState {
    const safeBoard = cloneBoard(initialBoard);
    return {
        board: safeBoard,
        initialBoard: cloneBoard(safeBoard), // Keep a pristine copy for restart
        history: [] // Start with empty history
    };
}

// --- CENTRALIZED PROGRESSION & SAVE SYSTEM ---

export const PROGRESS_STORAGE_KEY = 'bs_evolution_save_v1';
export const LEGACY_LEVEL_KEY = 'bs_level';
export const LEGACY_COINS_KEY = 'bs_coins';

export const DEFAULT_COINS = 5000;
export const DEFAULT_UNDOS = 5;
export const DEFAULT_HINTS = 2;
export const LEVEL_CLEAR_REWARD = 50;
export const LOCKED_LEVEL_MESSAGE = 'Complete this level to unlock the next one';

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem?(key: string): void;
}

export interface SavedGameProgress {
    version: 1;
    currentLevel: number;
    highestUnlockedLevel: number;
    lastPlayedLevel: number;
    clearedLevels: number[];
    currentBoard: BoardState | null;
    initialBoard: BoardState | null;
    history: BoardState[];
    coins: number;
    undosLeft: number;
    hintsLeft: number;
    extraTubeAdded: boolean;
    isLevelCompleted: boolean;
    hasSavedSession: boolean;
}

export interface NavigationValidationResult {
    allowed: boolean;
    targetLevel: number;
    reason?: string;
}

export function isValidSavedBoard(board: unknown): board is BoardState {
    if (!Array.isArray(board) || board.length < 3 || board.length > 16) return false;
    const counts = new Map<number, number>();

    for (const tube of board) {
        if (!Array.isArray(tube) || tube.length > TUBE_CAPACITY) return false;
        for (const ball of tube) {
            if (!isValidColorId(ball)) return false;
            counts.set(ball, (counts.get(ball) || 0) + 1);
        }
    }

    if (counts.size === 0) return false;
    for (const count of counts.values()) {
        if (count !== TUBE_CAPACITY) return false;
    }

    return true;
}

export function createDefaultProgress(startingCoins: number = DEFAULT_COINS): SavedGameProgress {
    const safeCoins = Number.isFinite(startingCoins) && startingCoins >= 0
        ? Math.floor(startingCoins)
        : DEFAULT_COINS;

    return {
        version: 1,
        currentLevel: 1,
        highestUnlockedLevel: 1,
        lastPlayedLevel: 1,
        clearedLevels: [],
        currentBoard: null,
        initialBoard: null,
        history: [],
        coins: safeCoins,
        undosLeft: DEFAULT_UNDOS,
        hintsLeft: DEFAULT_HINTS,
        extraTubeAdded: false,
        isLevelCompleted: false,
        hasSavedSession: false,
    };
}

export function isLevelUnlocked(level: number, highestUnlockedLevel: number): boolean {
    if (!Number.isInteger(level) || level < 1) return false;
    if (!Number.isInteger(highestUnlockedLevel) || highestUnlockedLevel < 1) return false;
    return level <= highestUnlockedLevel;
}

export function unlockNextLevel(currentHighestUnlocked: number, completedLevel: number): number {
    const safeHighest = Number.isInteger(currentHighestUnlocked) && currentHighestUnlocked >= 1
        ? currentHighestUnlocked
        : 1;
    const safeCompleted = Number.isInteger(completedLevel) && completedLevel >= 1
        ? completedLevel
        : 1;
    return Math.max(safeHighest, safeCompleted + 1);
}

export function validateLevelNavigation(
    targetLevel: number,
    highestUnlockedLevel: number
): NavigationValidationResult {
    if (!Number.isInteger(targetLevel) || targetLevel < 1) {
        return {
            allowed: false,
            targetLevel,
            reason: 'Invalid level number',
        };
    }

    if (!isLevelUnlocked(targetLevel, highestUnlockedLevel)) {
        return {
            allowed: false,
            targetLevel,
            reason: LOCKED_LEVEL_MESSAGE,
        };
    }

    return {
        allowed: true,
        targetLevel,
    };
}

export function canContinueSavedGame(progress: SavedGameProgress): boolean {
    return (
        progress.hasSavedSession === true &&
        progress.currentBoard !== null &&
        progress.initialBoard !== null &&
        isValidSavedBoard(progress.currentBoard) &&
        isValidSavedBoard(progress.initialBoard) &&
        isLevelUnlocked(progress.lastPlayedLevel, progress.highestUnlockedLevel)
    );
}

function getDefaultStorage(): StorageLike | null {
    try {
        if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
            return globalThis.localStorage;
        }
    } catch {
        return null;
    }
    return null;
}

function sanitizeClearedLevels(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];
    const unique = new Set<number>();
    for (const item of raw) {
        if (typeof item === 'number' && Number.isInteger(item) && item >= 1) {
            unique.add(item);
        }
    }
    return Array.from(unique).sort((a, b) => a - b);
}

export function saveProgress(
    progress: SavedGameProgress,
    storage: StorageLike | null = getDefaultStorage()
): boolean {
    if (!storage) return false;
    try {
        const serialized = JSON.stringify(progress);
        storage.setItem(PROGRESS_STORAGE_KEY, serialized);
        storage.setItem(LEGACY_LEVEL_KEY, String(progress.currentLevel));
        storage.setItem(LEGACY_COINS_KEY, String(progress.coins));
        return true;
    } catch {
        return false;
    }
}

export function loadSavedProgress(
    storage: StorageLike | null = getDefaultStorage()
): SavedGameProgress {
    const fallback = createDefaultProgress();
    if (!storage) return fallback;

    try {
        const raw = storage.getItem(PROGRESS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.version === 1) {
                const clearedLevels = sanitizeClearedLevels(parsed.clearedLevels);
                const maxCleared = clearedLevels.length > 0 ? Math.max(...clearedLevels) : 0;

                const rawHighest = Number.isInteger(parsed.highestUnlockedLevel) && parsed.highestUnlockedLevel >= 1
                    ? parsed.highestUnlockedLevel
                    : 1;
                const highestUnlockedLevel = Math.max(1, rawHighest, maxCleared + 1);

                const rawCurrent = Number.isInteger(parsed.currentLevel) && parsed.currentLevel >= 1
                    ? parsed.currentLevel
                    : 1;
                const currentLevel = Math.min(rawCurrent, highestUnlockedLevel);

                const rawLastPlayed = Number.isInteger(parsed.lastPlayedLevel) && parsed.lastPlayedLevel >= 1
                    ? parsed.lastPlayedLevel
                    : currentLevel;
                const lastPlayedLevel = Math.min(rawLastPlayed, highestUnlockedLevel);

                const coins = typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) && parsed.coins >= 0
                    ? Math.floor(parsed.coins)
                    : DEFAULT_COINS;

                const undosLeft = typeof parsed.undosLeft === 'number' && Number.isFinite(parsed.undosLeft) && parsed.undosLeft >= 0
                    ? Math.floor(parsed.undosLeft)
                    : DEFAULT_UNDOS;

                const hintsLeft = typeof parsed.hintsLeft === 'number' && Number.isFinite(parsed.hintsLeft) && parsed.hintsLeft >= 0
                    ? Math.floor(parsed.hintsLeft)
                    : DEFAULT_HINTS;

                const extraTubeAdded = Boolean(parsed.extraTubeAdded);
                const validCurrentBoard = isValidSavedBoard(parsed.currentBoard)
                    ? cloneBoard(parsed.currentBoard)
                    : null;
                const validInitialBoard = isValidSavedBoard(parsed.initialBoard)
                    ? cloneBoard(parsed.initialBoard)
                    : null;

                const validHistory = Array.isArray(parsed.history) && parsed.history.every(isValidSavedBoard)
                    ? parsed.history.map((b: BoardState) => cloneBoard(b))
                    : [];

                const hasValidBoards = validCurrentBoard !== null && validInitialBoard !== null;

                return {
                    version: 1,
                    currentLevel: hasValidBoards ? lastPlayedLevel : currentLevel,
                    highestUnlockedLevel,
                    lastPlayedLevel: hasValidBoards ? lastPlayedLevel : currentLevel,
                    clearedLevels,
                    currentBoard: hasValidBoards ? validCurrentBoard : null,
                    initialBoard: hasValidBoards ? validInitialBoard : null,
                    history: hasValidBoards ? validHistory : [],
                    coins,
                    undosLeft: hasValidBoards ? undosLeft : DEFAULT_UNDOS,
                    hintsLeft: hasValidBoards ? hintsLeft : DEFAULT_HINTS,
                    extraTubeAdded: hasValidBoards ? extraTubeAdded : false,
                    isLevelCompleted: hasValidBoards ? Boolean(parsed.isLevelCompleted) : false,
                    hasSavedSession: Boolean(parsed.hasSavedSession) && hasValidBoards,
                };
            }
        }

        const rawLegacyLevel = storage.getItem(LEGACY_LEVEL_KEY);
        const rawLegacyCoins = storage.getItem(LEGACY_COINS_KEY);

        if (rawLegacyLevel !== null || rawLegacyCoins !== null) {
            const parsedLevel = Number(rawLegacyLevel);
            const parsedCoins = Number(rawLegacyCoins);

            const migratedLevel = Number.isFinite(parsedLevel) && parsedLevel >= 1
                ? Math.floor(parsedLevel)
                : 1;
            const migratedCoins = Number.isFinite(parsedCoins) && parsedCoins >= 0
                ? Math.floor(parsedCoins)
                : DEFAULT_COINS;

            const clearedLevels: number[] = [];
            for (let lvl = 1; lvl < migratedLevel; lvl++) {
                clearedLevels.push(lvl);
            }

            const migrated: SavedGameProgress = {
                version: 1,
                currentLevel: migratedLevel,
                highestUnlockedLevel: migratedLevel,
                lastPlayedLevel: migratedLevel,
                clearedLevels,
                currentBoard: null,
                initialBoard: null,
                history: [],
                coins: migratedCoins,
                undosLeft: DEFAULT_UNDOS,
                hintsLeft: DEFAULT_HINTS,
                extraTubeAdded: false,
                isLevelCompleted: false,
                hasSavedSession: false,
            };

            saveProgress(migrated, storage);
            return migrated;
        }
    } catch {
        return fallback;
    }

    return fallback;
}

export function startNewGameProgress(
    existingProgress: SavedGameProgress,
    levelOneBoard: BoardState,
    storage: StorageLike | null = getDefaultStorage()
): SavedGameProgress {
    const safeBoard = cloneBoard(levelOneBoard);
    const preservedCoins = Number.isFinite(existingProgress.coins) && existingProgress.coins >= 0
        ? Math.floor(existingProgress.coins)
        : DEFAULT_COINS;

    const freshProgress: SavedGameProgress = {
        version: 1,
        currentLevel: 1,
        highestUnlockedLevel: 1,
        lastPlayedLevel: 1,
        clearedLevels: [],
        currentBoard: cloneBoard(safeBoard),
        initialBoard: cloneBoard(safeBoard),
        history: [],
        coins: preservedCoins,
        undosLeft: DEFAULT_UNDOS,
        hintsLeft: DEFAULT_HINTS,
        extraTubeAdded: false,
        isLevelCompleted: false,
        hasSavedSession: true,
    };

    saveProgress(freshProgress, storage);
    return freshProgress;
}

export function continueSavedGameProgress(
    progress: SavedGameProgress
): { allowed: boolean; progress: SavedGameProgress; reason?: string } {
    if (!canContinueSavedGame(progress)) {
        return {
            allowed: false,
            progress,
            reason: 'No valid saved game session available to continue.',
        };
    }

    const restored: SavedGameProgress = {
        ...progress,
        currentLevel: progress.lastPlayedLevel,
        currentBoard: cloneBoard(progress.currentBoard!),
        initialBoard: cloneBoard(progress.initialBoard!),
        history: progress.history.map(cloneBoard),
        clearedLevels: [...progress.clearedLevels],
    };

    return {
        allowed: true,
        progress: restored,
    };
}

export function navigateToLevel(
    progress: SavedGameProgress,
    targetLevel: number,
    boardGenerator: (level: number) => BoardState,
    storage: StorageLike | null = getDefaultStorage()
): { allowed: boolean; progress: SavedGameProgress; reason?: string } {
    const validation = validateLevelNavigation(targetLevel, progress.highestUnlockedLevel);
    if (!validation.allowed) {
        return {
            allowed: false,
            progress,
            reason: validation.reason,
        };
    }

    const generatedBoard = cloneBoard(boardGenerator(targetLevel));
    const updated: SavedGameProgress = {
        ...progress,
        currentLevel: targetLevel,
        lastPlayedLevel: targetLevel,
        currentBoard: cloneBoard(generatedBoard),
        initialBoard: cloneBoard(generatedBoard),
        history: [],
        undosLeft: DEFAULT_UNDOS,
        hintsLeft: DEFAULT_HINTS,
        extraTubeAdded: false,
        isLevelCompleted: false,
        hasSavedSession: true,
    };

    saveProgress(updated, storage);
    return {
        allowed: true,
        progress: updated,
    };
}

export function recordLevelCompletion(
    progress: SavedGameProgress,
    completedLevel: number,
    solvedBoard: BoardState,
    rewardAmount: number = LEVEL_CLEAR_REWARD,
    storage: StorageLike | null = getDefaultStorage()
): { progress: SavedGameProgress; rewardGranted: boolean; rewardAmount: number } {
    const alreadyCleared = progress.clearedLevels.includes(completedLevel);
    const updatedCleared = alreadyCleared
        ? [...progress.clearedLevels]
        : [...progress.clearedLevels, completedLevel].sort((a, b) => a - b);

    const grantedCoins = alreadyCleared ? 0 : rewardAmount;
    const nextHighestUnlocked = unlockNextLevel(progress.highestUnlockedLevel, completedLevel);

    const updated: SavedGameProgress = {
        ...progress,
        currentLevel: completedLevel,
        lastPlayedLevel: completedLevel,
        highestUnlockedLevel: nextHighestUnlocked,
        clearedLevels: updatedCleared,
        currentBoard: cloneBoard(solvedBoard),
        coins: progress.coins + grantedCoins,
        isLevelCompleted: true,
        hasSavedSession: true,
    };

    saveProgress(updated, storage);
    return {
        progress: updated,
        rewardGranted: !alreadyCleared,
        rewardAmount: grantedCoins,
    };
}
