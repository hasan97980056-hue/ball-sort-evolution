import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { DEFAULT_COINS } from './state';
import {
    type BoardState,
    type SavedGameProgress,
    TUBE_CAPACITY,
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
    recordLevelCompletion,
} from './state';
import { generateSolvableLevel } from './generator';
import { executeMove, isGameWon } from './logic';
import { solveBoard } from './solver';

const BALL_PALETTE: Record<number, { light: string; main: string; dark: string; glow: string }> = {
    1: { light: '#FFAB73', main: '#FF6B00', dark: '#A83800', glow: '#FF7B1A' }, // Orange
    2: { light: '#FF85D0', main: '#FF1E96', dark: '#9E0054', glow: '#FF38A8' }, // Pink
    3: { light: '#FFF380', main: '#FFD000', dark: '#B27D00', glow: '#FFE033' }, // Yellow
    4: { light: '#6EB5FF', main: '#0066FF', dark: '#002B80', glow: '#3388FF' }, // Blue
    5: { light: '#D88CFF', main: '#9B1FE8', dark: '#4A0082', glow: '#B84DFF' }, // Purple
    6: { light: '#7DFF8B', main: '#00C82B', dark: '#006411', glow: '#26E64C' }, // Green
    7: { light: '#8CFFFF', main: '#00D2E6', dark: '#006B7A', glow: '#33ECFF' }, // Cyan
    8: { light: '#FF8080', main: '#FF1726', dark: '#990009', glow: '#FF404C' }, // Red
    9: { light: '#C8A98E', main: '#8D5B3C', dark: '#4A2A18', glow: '#A87454' }, // Brown
    10: { light: '#B2FF59', main: '#64DD17', dark: '#2E7D32', glow: '#76FF03' }, // Lime
};

interface TubeRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface FlyingBall {
    colorId: number;
    x: number;
    y: number;
    targetTube: number;
}

// Completely disable double-tap zoom and page scrolling
document.documentElement.style.cssText = 'margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#090418; touch-action:none;';
document.body.style.cssText = 'margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#090418; font-family:system-ui,-apple-system,sans-serif; user-select:none; -webkit-user-select:none; touch-action:none;';

// Prevent double-tap zoom gesture in mobile browsers
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';
app.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100dvh;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background: radial-gradient(circle at 50% 35%, #231557 0%, #10072e 60%, #070217 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
    overflow: hidden;
    touch-action: none;
`;

// 1. TOP HUD BAR
const topBar = document.createElement('div');
topBar.style.cssText = `
    width: 100%;
    box-sizing: border-box;
    padding: 38px 14px 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    z-index: 10;
`;

const leftHudGroup = document.createElement('div');
leftHudGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';

const menuHudBtn = document.createElement('button');
menuHudBtn.innerText = '☰';
menuHudBtn.title = 'Start Menu';
menuHudBtn.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #7c56e0;
    background: linear-gradient(180deg, #5c38b8 0%, #381d80 100%);
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.45);
    touch-action: manipulation;
    padding: 0;
`;

const coinBadge = document.createElement('div');
coinBadge.style.cssText = `
    background: linear-gradient(180deg, #5c38b8 0%, #381d80 100%);
    border: 2px solid #7c56e0;
    border-radius: 999px;
    padding: 4px 12px 4px 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #fff;
    font-weight: 800;
    font-size: 16px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.45);
`;

leftHudGroup.append(menuHudBtn, coinBadge);

const levelContainer = document.createElement('div');
levelContainer.style.cssText = `
    background: rgba(8, 4, 24, 0.85);
    border: 1.5px solid rgba(255,255,255,0.18);
    border-radius: 999px;
    padding: 4px 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ffffff;
    font-weight: 800;
    font-size: 18px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.5);
`;

const prevLvlBtn = document.createElement('button');
prevLvlBtn.innerText = '◀';
prevLvlBtn.style.cssText = 'background:none;border:none;color:#b29aff;font-size:15px;cursor:pointer;padding:4px 8px;touch-action:manipulation;';

const levelTitle = document.createElement('span');
levelTitle.style.cssText = 'min-width: 82px; text-align: center;';
levelTitle.innerText = 'Level 1';

const nextLvlBtn = document.createElement('button');
nextLvlBtn.innerText = '▶';
nextLvlBtn.style.cssText = 'background:none;border:none;color:#b29aff;font-size:15px;cursor:pointer;padding:4px 8px;touch-action:manipulation;';

levelContainer.append(prevLvlBtn, levelTitle, nextLvlBtn);
topBar.append(leftHudGroup, levelContainer);
app.appendChild(topBar);

// TOAST NOTIFICATION FOR LOCKED LEVELS
const toastBanner = document.createElement('div');
toastBanner.style.cssText = `
    position: absolute;
    top: 62px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(24, 11, 66, 0.96);
    border: 1.5px solid #ff9f43;
    color: #ffeaa7;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 6px 20px rgba(0,0,0,0.65);
    z-index: 40;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    max-width: 90vw;
    overflow: hidden;
    text-overflow: ellipsis;
`;
app.appendChild(toastBanner);

let toastTimeoutId: number | null = null;
function showToastMessage(message: string) {
    toastBanner.innerText = `🔒 ${message}`;
    toastBanner.style.opacity = '1';
    if (toastTimeoutId !== null) {
        window.clearTimeout(toastTimeoutId);
    }
    toastTimeoutId = window.setTimeout(() => {
        toastBanner.style.opacity = '0';
        toastTimeoutId = null;
    }, 2200);
}

// 2. MIDDLE CANVAS WRAPPER
const canvasWrapper = document.createElement('div');
canvasWrapper.style.cssText = `
    flex: 1;
    width: 100%;
    min-height: 0;
    position: relative;
    overflow: hidden;
`;

const canvas = document.createElement('canvas');
canvas.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    display: block;
`;
canvasWrapper.appendChild(canvas);
app.appendChild(canvasWrapper);
const ctx = canvas.getContext('2d')!;

// 3. BOTTOM ACTION BAR
const bottomBar = document.createElement('div');
bottomBar.style.cssText = `
    width: 100%;
    box-sizing: border-box;
    padding: 6px 18px calc(78px + env(safe-area-inset-bottom, 16px));
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    z-index: 10;
`;

const rightControlsGroup = document.createElement('div');
rightControlsGroup.style.cssText = 'display: flex; gap: 16px; align-items: center;';

function createActionButton(label: string, badgeText?: string, costText?: string) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center;';

    const btn = document.createElement('button');
    btn.innerHTML = label;
    btn.style.cssText = `
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 2px solid #a688ff;
        background: radial-gradient(circle at 35% 28%, #9b78ff 0%, #6038d1 62%, #401f9c 100%);
        color: white;
        font-size: 22px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 12px rgba(0,0,0,0.55), inset 0 2px 4px rgba(255,255,255,0.45);
        cursor: pointer;
        padding: 0;
        touch-action: manipulation;
    `;

    let badgeEl: HTMLSpanElement | null = null;
    if (badgeText) {
        badgeEl = document.createElement('span');
        badgeEl.innerText = badgeText;
        badgeEl.style.cssText = `
            position: absolute;
            top: -4px;
            right: -4px;
            background: linear-gradient(180deg, #2ee856 0%, #14a834 100%);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #160c38;
        `;
        wrapper.appendChild(badgeEl);
    }

    wrapper.appendChild(btn);

    if (costText) {
        const costBadge = document.createElement('span');
        costBadge.innerText = `🪙 ${costText}`;
        costBadge.style.cssText = `
            margin-top: -8px;
            background: linear-gradient(180deg, #ffcf33 0%, #e08600 100%);
            color: #2b1400;
            font-size: 10px;
            font-weight: 900;
            padding: 1px 7px;
            border-radius: 999px;
            border: 1.5px solid #fff3c4;
            z-index: 2;
        `;
        wrapper.appendChild(costBadge);
    }

    return { wrapper, btn, badgeEl };
}

const restartCtrl = createActionButton('↻');
const undoCtrl = createActionButton('↩', '5');
const shuffleCtrl = createActionButton('🔀', '2');
const addTubeCtrl = createActionButton('+🧪', undefined, '900');

rightControlsGroup.append(undoCtrl.wrapper, shuffleCtrl.wrapper, addTubeCtrl.wrapper);
bottomBar.append(restartCtrl.wrapper, rightControlsGroup);
app.appendChild(bottomBar);

// 4. WIN MODAL OVERLAY
const winModal = document.createElement('div');
winModal.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(6, 2, 20, 0.84);
    backdrop-filter: blur(6px);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 50;
    color: white;
`;
winModal.innerHTML = `
    <div style="background: linear-gradient(180deg, #321b7a 0%, #180b42 100%); border: 2px solid #7c56e0; border-radius: 24px; padding: 26px 32px; text-align: center; box-shadow: 0 12px 35px rgba(0,0,0,0.75); max-width: 82vw;">
        <div style="font-size: 46px; margin-bottom: 8px;">🏆</div>
        <h2 id="winTitle" style="margin: 0 0 8px; font-size: 25px; color: #ffd700;">LEVEL COMPLETE!</h2>
        <p id="winRewardText" style="margin: 0 0 18px; color: #d0c2ff; font-size: 15px; font-weight: 600;">+50 Coins Reward 🪙</p>
        <button id="nextLevelModalBtn" style="background: linear-gradient(180deg, #2ae852 0%, #129c30 100%); border: 2px solid #98ffad; color: white; font-size: 18px; font-weight: 800; padding: 11px 30px; border-radius: 999px; cursor: pointer; box-shadow: 0 6px 16px rgba(18,156,48,0.5);">NEXT LEVEL ▶</button>
    </div>
`;
app.appendChild(winModal);

// 5. START MENU OVERLAY
const startMenuOverlay = document.createElement('div');
startMenuOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 28%, rgba(46, 24, 110, 0.96) 0%, rgba(13, 6, 38, 0.98) 65%, rgba(6, 2, 20, 0.99) 100%);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 80;
    padding: 24px;
    box-sizing: border-box;
    color: #fff;
`;

const menuCard = document.createElement('div');
menuCard.style.cssText = `
    width: 100%;
    max-width: 340px;
    background: linear-gradient(180deg, rgba(54, 30, 128, 0.92) 0%, rgba(22, 10, 58, 0.96) 100%);
    border: 2px solid #8c66ff;
    border-radius: 28px;
    padding: 28px 24px;
    text-align: center;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), inset 0 2px 6px rgba(255, 255, 255, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
`;

const menuIcon = document.createElement('div');
menuIcon.innerText = '🧪';
menuIcon.style.cssText = 'font-size: 48px; line-height: 1; filter: drop-shadow(0 4px 10px rgba(155,120,255,0.6));';

const menuTitle = document.createElement('h1');
menuTitle.innerText = 'Ball Sort Evolution';
menuTitle.style.cssText = `
    margin: 0;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #ffd700;
    text-shadow: 0 3px 12px rgba(255, 215, 0, 0.35);
`;

const menuSubtitle = document.createElement('p');
menuSubtitle.innerText = '3D Color Sorting Puzzle';
menuSubtitle.style.cssText = 'margin: -6px 0 4px; font-size: 14px; font-weight: 600; color: #c5b3ff;';

const menuProgressBadge = document.createElement('div');
menuProgressBadge.style.cssText = `
    background: rgba(10, 4, 30, 0.75);
    border: 1.5px solid rgba(166, 136, 255, 0.4);
    border-radius: 14px;
    padding: 8px 14px;
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
    font-weight: 700;
    color: #e2d9ff;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const continueMenuBtn = document.createElement('button');
continueMenuBtn.style.cssText = `
    width: 100%;
    padding: 14px 20px;
    border-radius: 999px;
    border: 2px solid #98ffad;
    background: linear-gradient(180deg, #2ae852 0%, #129c30 100%);
    color: #ffffff;
    font-size: 17px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(18, 156, 48, 0.5);
    touch-action: manipulation;
`;

const newGameMenuBtn = document.createElement('button');
newGameMenuBtn.innerText = 'NEW GAME';
newGameMenuBtn.style.cssText = `
    width: 100%;
    padding: 14px 20px;
    border-radius: 999px;
    border: 2px solid #c4afff;
    background: linear-gradient(180deg, #8b63ff 0%, #5229c7 100%);
    color: #ffffff;
    font-size: 17px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(82, 41, 199, 0.5);
    touch-action: manipulation;
`;

menuCard.append(menuIcon, menuTitle, menuSubtitle, menuProgressBadge, continueMenuBtn, newGameMenuBtn);
startMenuOverlay.appendChild(menuCard);
app.appendChild(startMenuOverlay);

// 6. NEW GAME CONFIRMATION MODAL
const confirmResetModal = document.createElement('div');
confirmResetModal.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(6, 2, 20, 0.88);
    backdrop-filter: blur(6px);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 95;
    padding: 24px;
    box-sizing: border-box;
    color: #fff;
`;
confirmResetModal.innerHTML = `
    <div style="background: linear-gradient(180deg, #321b7a 0%, #180b42 100%); border: 2px solid #ff7675; border-radius: 24px; padding: 24px 24px; text-align: center; box-shadow: 0 14px 38px rgba(0,0,0,0.85); max-width: 320px; width: 100%;">
        <div style="font-size: 40px; margin-bottom: 6px;">⚠️</div>
        <h3 style="margin: 0 0 10px; font-size: 21px; color: #ffd700;">Start a New Game?</h3>
        <p style="margin: 0 0 20px; color: #dcd0ff; font-size: 14px; font-weight: 500; line-height: 1.45;">
            This will reset your level progression, unlocked levels, and current board back to <b>Level 1</b>.<br><br>
            Your coin balance (<span id="confirmCoinsAmount" style="color:#ffd700;font-weight:800;"></span> 🪙) will be kept, and level boosters will refresh to default (5 Undos, 2 Hints).
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="cancelNewGameBtn" style="flex: 1; background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.3); color: white; font-size: 15px; font-weight: 700; padding: 11px 14px; border-radius: 999px; cursor: pointer;">Cancel</button>
            <button id="confirmNewGameBtn" style="flex: 1; background: linear-gradient(180deg, #ff4d4d 0%, #c91818 100%); border: 2px solid #ff9999; color: white; font-size: 15px; font-weight: 800; padding: 11px 14px; border-radius: 999px; cursor: pointer;">Start Level 1</button>
        </div>
    </div>
`;
app.appendChild(confirmResetModal);

// GAME STATE INITIALIZATION FROM CENTRALIZED STORAGE
let savedProgress: SavedGameProgress = loadSavedProgress();

let currentLevel = savedProgress.currentLevel;
let highestUnlockedLevel = savedProgress.highestUnlockedLevel;
let clearedLevels: number[] = [...savedProgress.clearedLevels];
let coins = savedProgress.coins;
let board: BoardState = [];
let initialBoard: BoardState = [];
let history: BoardState[] = [];
let selectedTube: number | null = null;
let flyingBall: FlyingBall | null = null;
let undosLeft = savedProgress.undosLeft;
let hintsLeft = savedProgress.hintsLeft;
let extraTubeAdded = savedProgress.extraTubeAdded;
let isLevelCompleted = savedProgress.isLevelCompleted;
let cssWidth = window.innerWidth;
let cssHeight = 420;

function persistActiveGameState() {
    if (board.length === 0 || initialBoard.length === 0) return;

    savedProgress = {
        version: 1,
        currentLevel,
        highestUnlockedLevel,
        lastPlayedLevel: currentLevel,
        clearedLevels: [...clearedLevels],
        currentBoard: cloneBoard(board),
        initialBoard: cloneBoard(initialBoard),
        history: history.map(cloneBoard),
        coins,
        undosLeft,
        hintsLeft,
        extraTubeAdded,
        isLevelCompleted,
        hasSavedSession: true,
    };

    saveProgress(savedProgress);
}

function updateNavigationButtonsUI() {
    const canGoPrev = currentLevel > 1;
    const canGoNext = validateLevelNavigation(currentLevel + 1, highestUnlockedLevel).allowed;

    prevLvlBtn.style.opacity = canGoPrev ? '1' : '0.35';
    prevLvlBtn.style.cursor = canGoPrev ? 'pointer' : 'not-allowed';

    nextLvlBtn.style.opacity = canGoNext ? '1' : '0.35';
    nextLvlBtn.style.cursor = canGoNext ? 'pointer' : 'not-allowed';
}

function updateHUD() {
    coinBadge.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:linear-gradient(180deg,#ffe066,#e69500);color:#593300;font-size:12px;font-weight:900;border:1.5px solid #fff6cc;">$</span><span>${coins}</span>`;
    levelTitle.innerText = `Level ${currentLevel}`;
    if (undoCtrl.badgeEl) undoCtrl.badgeEl.innerText = String(undosLeft);
    if (shuffleCtrl.badgeEl) shuffleCtrl.badgeEl.innerText = String(hintsLeft);
    updateNavigationButtonsUI();
}

function syncViewportBox() {
    const vv = window.visualViewport;
    if (vv) {
        app.style.width = `${vv.width}px`;
        app.style.height = `${vv.height}px`;
        app.style.left = `${vv.offsetLeft}px`;
        app.style.top = `${vv.offsetTop}px`;
    } else {
        app.style.width = `${window.innerWidth}px`;
        app.style.height = `${window.innerHeight}px`;
        app.style.left = '0px';
        app.style.top = '0px';
    }
    const rect = canvasWrapper.getBoundingClientRect();
    cssWidth = Math.max(260, rect.width || window.innerWidth);
    cssHeight = Math.max(240, rect.height || (window.innerHeight - 225));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
}

window.addEventListener('resize', syncViewportBox);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewportBox);
    window.visualViewport.addEventListener('scroll', syncViewportBox);
}

function applyProgressToRuntime(progress: SavedGameProgress) {
    savedProgress = progress;
    currentLevel = progress.currentLevel;
    highestUnlockedLevel = progress.highestUnlockedLevel;
    clearedLevels = [...progress.clearedLevels];
    coins = 5000; progress.coins = 5000;
    undosLeft = progress.undosLeft;
    hintsLeft = progress.hintsLeft;
    extraTubeAdded = progress.extraTubeAdded;
    isLevelCompleted = progress.isLevelCompleted;
    board = progress.currentBoard ? cloneBoard(progress.currentBoard) : [];
    initialBoard = progress.initialBoard ? cloneBoard(progress.initialBoard) : [];
    history = progress.history.map(cloneBoard);
    selectedTube = null;
    flyingBall = null;
}

function showWinModalOverlay(rewardGranted: boolean, rewardAmount: number) {
    const winTitle = document.getElementById('winTitle');
    const winRewardText = document.getElementById('winRewardText');
    if (winTitle) {
        winTitle.innerText = `LEVEL ${currentLevel} COMPLETE!`;
    }
    if (winRewardText) {
        winRewardText.innerText = rewardGranted
            ? `+${rewardAmount} Coins Reward 🪙`
            : 'Already Cleared (+0 Coins) ✅';
    }
    winModal.style.display = 'flex';
    (window as any).triggerWinAd?.();
}

function handleLevelWon() {
    if (isLevelCompleted) return;
    selectedTube = null;

    const completion = recordLevelCompletion(
        savedProgress,
        currentLevel,
        board,
        LEVEL_CLEAR_REWARD
    );

    applyProgressToRuntime(completion.progress);
    updateHUD();
    render();

    window.setTimeout(() => {
        showWinModalOverlay(completion.rewardGranted, completion.rewardAmount);
    }, 200);
}

function startLevel(lvl: number): boolean {
    const navCheck = validateLevelNavigation(lvl, highestUnlockedLevel);
    if (!navCheck.allowed) {
        showToastMessage(navCheck.reason || LOCKED_LEVEL_MESSAGE);
        updateNavigationButtonsUI();
        return false;
    }

    currentLevel = lvl;
    const generated = generateSolvableLevel(currentLevel);
    board = cloneBoard(generated.board);
    initialBoard = cloneBoard(board);
    history = [];
    selectedTube = null;
    flyingBall = null;
    undosLeft = DEFAULT_UNDOS;
    hintsLeft = DEFAULT_HINTS;
    extraTubeAdded = false;
    isLevelCompleted = false;
    winModal.style.display = 'none';

    updateHUD();
    persistActiveGameState();
    syncViewportBox();
    return true;
}

function openStartMenu() {
    savedProgress = loadSavedProgress();
    highestUnlockedLevel = savedProgress.highestUnlockedLevel;
    clearedLevels = [...savedProgress.clearedLevels];
    coins = savedProgress.coins;

    const hasContinue = canContinueSavedGame(savedProgress);

    menuProgressBadge.innerHTML = `
        <span>🔓 Highest Level: <b>${highestUnlockedLevel}</b></span>
        <span>⭐ Cleared: <b>${clearedLevels.length}</b></span>
    `;

    if (hasContinue) {
        continueMenuBtn.style.display = 'block';
        continueMenuBtn.disabled = false;
        continueMenuBtn.innerText = `CONTINUE (Level ${savedProgress.lastPlayedLevel})`;
        continueMenuBtn.style.opacity = '1';
        continueMenuBtn.style.cursor = 'pointer';
    } else {
        continueMenuBtn.style.display = 'none';
        continueMenuBtn.disabled = true;
    }

    startMenuOverlay.style.display = 'flex';
}

function getTubeRects(): TubeRect[] {
    const numTubes = board.length;
    if (numTubes === 0) return [];

    const rows = numTubes > 5 ? 2 : 1;
    const topCount = rows === 2 ? Math.ceil(numTubes / 2) : numTubes;
    const bottomCount = rows === 2 ? numTubes - topCount : 0;
    const maxCols = Math.max(topCount, bottomCount);

    const sidePadding = 16;
    const gapX = maxCols >= 6 ? 10 : 14;
    const availableW = cssWidth - sidePadding * 2 - (maxCols - 1) * gapX;
    const maxWByCols = Math.floor(availableW / maxCols);

    const topLiftSpace = 30;
    const bottomPadding = 10;
    const gapY = rows === 2 ? 34 : 0;
    const availableH = cssHeight - topLiftSpace - bottomPadding - (rows - 1) * gapY;
    const maxTubeH = Math.floor(availableH / rows);

    const ratio = 3.55;
    const maxWByHeight = Math.floor(maxTubeH / ratio);
    const idealMaxW = rows === 2 ? 50 : 58;
    const tubeWidth = Math.max(32, Math.min(idealMaxW, maxWByCols, maxWByHeight));
    const tubeHeight = Math.floor(tubeWidth * ratio);

    const totalGridH = rows * tubeHeight + (rows - 1) * gapY;
    const startY = topLiftSpace + Math.max(0, Math.floor((availableH - totalGridH + (rows - 1) * gapY) / 2));

    const rects: TubeRect[] = [];
    for (let i = 0; i < numTubes; i++) {
        const isBottom = rows === 2 && i >= topCount;
        const rowIdx = isBottom ? 1 : 0;
        const colIdx = isBottom ? i - topCount : i;
        const colsInRow = isBottom ? bottomCount : topCount;

        const rowW = colsInRow * tubeWidth + (colsInRow - 1) * gapX;
        const startX = Math.floor((cssWidth - rowW) / 2);

        rects.push({
            x: startX + colIdx * (tubeWidth + gapX),
            y: startY + rowIdx * (tubeHeight + gapY),
            width: tubeWidth,
            height: tubeHeight,
        });
    }
    return rects;
}

function getBallPosition(rect: TubeRect, ballIdx: number, isLifted: boolean) {
    const ballRadius = rect.width * 0.425;
    const bottomRadius = rect.width / 2;
    const cx = rect.x + rect.width / 2;
    if (isLifted) {
        return { cx, cy: rect.y - ballRadius - 9, ballRadius };
    }
    const bottomBallCy = rect.y + rect.height - bottomRadius + (bottomRadius - ballRadius - 3);
    const stepY = ballRadius * 1.98;
    return { cx, cy: bottomBallCy - ballIdx * stepY, ballRadius };
}

function draw3DBall(cx: number, cy: number, radius: number, colorId: number) {
    const palette = BALL_PALETTE[colorId] || BALL_PALETTE[1];
    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const grad = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.35,
        radius * 0.08,
        cx,
        cy,
        radius
    );
    grad.addColorStop(0, palette.light);
    grad.addColorStop(0.55, palette.main);
    grad.addColorStop(1, palette.dark);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.save();
    ctx.translate(cx - radius * 0.34, cy - radius * 0.36);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.32, radius * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx - radius * 0.12, cy - radius * 0.56, radius * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    ctx.restore();
}

function drawTubeAndBalls(rect: TubeRect, tube: number[], isSelected: boolean) {
    const { x, y, width, height } = rect;
    const rimRy = Math.max(4.2, width * 0.12);
    const bottomRadius = width / 2;

    const isCompleted = tube.length === TUBE_CAPACITY && tube.every(b => b === tube[0]);
    const completedColor = isCompleted ? (BALL_PALETTE[tube[0]]?.glow || '#5AC8FA') : null;
    const strokeColor = completedColor || (isSelected ? '#66E0FF' : 'rgba(225, 232, 255, 0.76)');

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y, width / 2, rimRy, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 215, 255, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height - bottomRadius);
    ctx.arc(x + bottomRadius, y + height - bottomRadius, bottomRadius, Math.PI, 0, true);
    ctx.lineTo(x + width, y);

    const glassGrad = ctx.createLinearGradient(x, y, x + width, y);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    glassGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.04)');
    glassGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.02)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.restore();

    tube.forEach((colorId, idx) => {
        const isTopSelectedBall = isSelected && idx === tube.length - 1;
        const pos = getBallPosition(rect, idx, isTopSelectedBall);
        draw3DBall(pos.cx, pos.cy, pos.ballRadius, colorId);
    });

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + width * 0.15, y + rimRy + 6);
    ctx.lineTo(x + width * 0.15, y + height - bottomRadius - 4);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    if (completedColor || isSelected) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isCompleted ? 14 : 10;
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isCompleted || isSelected ? 2.8 : 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height - bottomRadius);
    ctx.arc(x + bottomRadius, y + height - bottomRadius, bottomRadius, Math.PI, 0, true);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x + width / 2, y, width / 2, rimRy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function render() {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    const rects = getTubeRects();
    board.forEach((tube, idx) => {
        if (rects[idx]) {
            drawTubeAndBalls(rects[idx], tube, selectedTube === idx);
        }
    });
    if (flyingBall && rects.length > 0) {
        const radius = rects[0].width * 0.425;
        draw3DBall(flyingBall.x, flyingBall.y, radius, flyingBall.colorId);
    }
}

function animateMove(fromIdx: number, toIdx: number, nextBoard: BoardState) {
    const rects = getTubeRects();
    const fromRect = rects[fromIdx];
    const toRect = rects[toIdx];
    const movingColor = board[fromIdx][board[fromIdx].length - 1];

    const startPos = getBallPosition(fromRect, board[fromIdx].length - 1, true);
    const endBallIdx = board[toIdx].length;
    const endPos = getBallPosition(toRect, endBallIdx, false);

    history.push(cloneBoard(board));
    board[fromIdx].pop();
    selectedTube = null;

    const startTime = performance.now();
    const duration = 160;

    function step(now: number) {
        const t = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        const arcPeak = Math.min(startPos.cy, toRect.y - startPos.ballRadius - 14) - 18;

        const currX = startPos.cx + (endPos.cx - startPos.cx) * ease;
        const currY = (1 - ease) * (1 - ease) * startPos.cy + 2 * (1 - ease) * ease * arcPeak + ease * ease * endPos.cy;

        flyingBall = { colorId: movingColor, x: currX, y: currY, targetTube: toIdx };
        render();

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            flyingBall = null;
            board = nextBoard;
            persistActiveGameState();
            render();

            if (isGameWon(board)) {
                handleLevelWon();
            }
        }
    }

    requestAnimationFrame(step);
}

// TOUCH / POINTER INTERACTION
canvas.addEventListener('pointerdown', (e) => {
    if (flyingBall || isLevelCompleted) return;
    const canvasRect = canvas.getBoundingClientRect();
    const px = e.clientX - canvasRect.left;
    const py = e.clientY - canvasRect.top;

    const rects = getTubeRects();
    let clicked = -1;
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (px >= r.x - 6 && px <= r.x + r.width + 6 && py >= r.y - 32 && py <= r.y + r.height + 8) {
            clicked = i;
            break;
        }
    }

    if (clicked === -1) return;

    if (selectedTube === null) {
        if (board[clicked].length > 0) {
            selectedTube = clicked;
            render();
        }
    } else if (selectedTube === clicked) {
        selectedTube = null;
        render();
    } else {
        const nextBoard = executeMove(board, selectedTube, clicked);
        if (nextBoard !== board) {
            animateMove(selectedTube, clicked, nextBoard);
        } else {
            selectedTube = board[clicked].length > 0 ? clicked : null;
            render();
        }
    }
});

// IN-GAME BUTTON ACTIONS
menuHudBtn.addEventListener('click', () => {
    if (flyingBall) return;
    persistActiveGameState();
    openStartMenu();
});

restartCtrl.btn.addEventListener('click', () => {
    if (flyingBall || isLevelCompleted || initialBoard.length === 0) return;
    board = cloneBoard(initialBoard);
    if (extraTubeAdded && board.length === initialBoard.length) {
        board.push([]);
    }
    history = [];
    selectedTube = null;
    persistActiveGameState();
    render();
});

undoCtrl.btn.addEventListener('click', () => {
    if (flyingBall || isLevelCompleted) return;
        if (undosLeft <= 0) {
            (window as any).triggerRewardAd?.('undo');
            return;
        }
        if (history.length === 0) return;
    board = history.pop()!;
    undosLeft--;
    selectedTube = null;
    updateHUD();
    persistActiveGameState();
    render();
});

shuffleCtrl.btn.addEventListener('click', () => {
    if (flyingBall || isLevelCompleted) return;
        if (hintsLeft <= 0) {
            (window as any).triggerRewardAd?.("hint");
            return;
        }
    const sol = solveBoard(board);
    if (sol && sol.length > 1) {
        history.push(cloneBoard(board));
        board = cloneBoard(sol[1]);
        hintsLeft--;
        selectedTube = null;
        updateHUD();
        persistActiveGameState();
        render();
        if (isGameWon(board)) {
            handleLevelWon();
        }
        return;
    }

    for (let from = 0; from < board.length; from++) {
        for (let to = 0; to < board.length; to++) {
            if (from === to) continue;
            if (board[to].length === 0 && new Set(board[from]).size === 1) continue;
            const next = executeMove(board, from, to);
            if (next !== board) {
                hintsLeft--;
                updateHUD();
                animateMove(from, to, next);
                return;
            }
        }
    }
});

addTubeCtrl.btn.addEventListener('click', () => {
    if (flyingBall || isLevelCompleted || extraTubeAdded) return;
        if (coins < 900) {
            (window as any).triggerRewardAd?.('tube');
            return;
        }
    coins -= 900;
    extraTubeAdded = true;
    board = [...board.map(t => [...t]), []];
    selectedTube = null;
    updateHUD();
    persistActiveGameState();
    render();
});

// LEVEL NAVIGATION ARROWS (ENFORCES UNLOCK VALIDATION)
prevLvlBtn.addEventListener('click', () => {
    if (flyingBall) return;
    if (currentLevel <= 1) return;
    startLevel(currentLevel - 1);
});

nextLvlBtn.addEventListener('click', () => {
    if (flyingBall) return;
    startLevel(currentLevel + 1);
});

document.getElementById('nextLevelModalBtn')?.addEventListener('click', () => {
    winModal.style.display = 'none';
    startLevel(currentLevel + 1);
});

// START MENU & CONFIRMATION MODAL ACTIONS
continueMenuBtn.addEventListener('click', () => {
    const result = continueSavedGameProgress(loadSavedProgress());
    if (!result.allowed) return;

    applyProgressToRuntime(result.progress);
    startMenuOverlay.style.display = 'none';
    updateHUD();
    syncViewportBox();

    if (isLevelCompleted) {
        showWinModalOverlay(false, 0);
    }
});

newGameMenuBtn.addEventListener('click', () => {
    const latest = loadSavedProgress();
    if (latest.highestUnlockedLevel === 1 && latest.clearedLevels.length === 0) {
        startMenuOverlay.style.display = 'none';
        winModal.style.display = 'none';
        const generated = generateSolvableLevel(1);
        const freshProgress = startNewGameProgress(latest, generated.board);
        freshProgress.coins = DEFAULT_COINS;
        applyProgressToRuntime(freshProgress);
        updateHUD();
        syncViewportBox();
    } else {
        const confirmCoinsEl = document.getElementById('confirmCoinsAmount');
        if (confirmCoinsEl) {
            confirmCoinsEl.innerText = String(DEFAULT_COINS);
        }
        confirmResetModal.style.display = 'flex';
    }
});

document.getElementById('cancelNewGameBtn')?.addEventListener('click', () => {
    confirmResetModal.style.display = 'none';
});

document.getElementById('confirmNewGameBtn')?.addEventListener('click', () => {
    confirmResetModal.style.display = 'none';
    startMenuOverlay.style.display = 'none';
    winModal.style.display = 'none';

    const latest = loadSavedProgress();
    const generated = generateSolvableLevel(1);
    const freshProgress = startNewGameProgress(latest, generated.board);
    freshProgress.coins = DEFAULT_COINS;

    applyProgressToRuntime(freshProgress);
    updateHUD();
    syncViewportBox();
});

// INITIALIZATION: Restore saved board behind the Start Menu without overwriting it
requestAnimationFrame(() => {
    const initialLoad = loadSavedProgress();
    if (canContinueSavedGame(initialLoad)) {
        applyProgressToRuntime(initialLoad);
    }
    updateHUD();
    syncViewportBox();
    openStartMenu();
});

// --- Safe Non-Blocking AdMob Integration ---
let levelsClearedForAd = Number(localStorage.getItem('bse_ad_win_count') || '0');
let isRewardAdBusy = false;

function showAdToast(msg: string) {
    let toast = document.getElementById('bse-ad-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'bse-ad-toast';
        toast.style.cssText = 'position:fixed;top:75px;left:50%;transform:translateX(-50%);background:rgba(20,14,54,0.95);color:#ffd700;padding:10px 20px;border-radius:999px;font-weight:800;font-size:14px;z-index:99999;border:1px solid rgba(255,215,0,0.4);box-shadow:0 8px 24px rgba(0,0,0,0.5);pointer-events:none;transition:opacity 0.25s;';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => {
        if (toast) toast.style.opacity = '0';
    }, 2200);
}

(window as any).triggerRewardAd = async (rewardType: 'undo' | 'hint' | 'tube') => {
    if (isRewardAdBusy) return;
    isRewardAdBusy = true;
    showAdToast('🎬 Loading Free Reward Ad...');
    try {
        await (AdMob as any).prepareRewardVideoAd({
            adId: 'ca-app-pub-3940256099942544/5224354917',
            isTesting: true,
        });
        await (AdMob as any).showRewardVideoAd();

        // Grant reward smoothly once player returns to game screen
        setTimeout(() => {
            if (rewardType === 'tube') {
                coins += 900;
                addTubeCtrl.btn.click();
                showAdToast('🎁 Free Extra Tube Unlocked!');
            } else if (rewardType === 'undo') {
                undosLeft = DEFAULT_UNDOS;
                if (undoCtrl.badgeEl) undoCtrl.badgeEl.innerText = String(undosLeft);
                if (history.length > 0) {
                    undoCtrl.btn.click();
                }
                showAdToast('🎁 +5 Free Undos Unlocked!');
            } else if (rewardType === 'hint') {
                hintsLeft = 2;
                if (shuffleCtrl.badgeEl) shuffleCtrl.badgeEl.innerText = String(hintsLeft);
                shuffleCtrl.btn.click();
                showAdToast('🎁 Free Best Move Unlocked!');
            }
        }, 350);
    } catch (e) {
        console.error('Rewarded Ad error:', e);
        showAdToast('⚠️ Ad not ready right now, try again in a moment');
    } finally {
        isRewardAdBusy = false;
    }
};

(window as any).triggerWinAd = async () => {
    try {
        levelsClearedForAd++;
        localStorage.setItem('bse_ad_win_count', String(levelsClearedForAd));

        // Sirf har 3 level clear hone par ad dikhao (3, 6, 9, 12...)
        if (levelsClearedForAd % 3 !== 0) {
            return;
        }

        await (AdMob as any).prepareInterstitial({
            adId: 'ca-app-pub-3940256099942544/1033173712',
            isTesting: true,
        });
        await (AdMob as any).showInterstitial();
    } catch (e) {
        console.error('Interstitial error:', e);
    }
};

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            await (AdMob as any).initialize({});
            await (AdMob as any).showBanner({
                adId: 'ca-app-pub-3940256099942544/6300978111',
                position: BannerAdPosition.BOTTOM_CENTER,
                size: BannerAdSize.BANNER,
                margin: 0,
                isTesting: true,
            });
            window.dispatchEvent(new Event('resize'));
        } catch (e) {
            console.error('AdMob init error:', e);
        }
    }, 1200);
});
