// sidepanel.js — Side Panel Logic
// Handles settings persistence, dynamic grid generation, and screenshot
// cropping. Matching / hint features have been removed; this file now only
// captures and displays card images in the companion grid.

'use strict';

// ─── Grid configuration map ──────────────────────────────────────────────────
const GRID_CONFIG = {
  16: { cols: 4, rows: 4 },
  20: { cols: 4, rows: 5 },
  30: { cols: 5, rows: 6 },
  36: { cols: 6, rows: 6 },
};

// ─── State ───────────────────────────────────────────────────────────────────
let tileState = []; // { dataUrl: string | null } indexed by tile position

/**
 * Per-grid-size calibration data, derived from two centre-clicks.
 * Shape: { gridLeft, gridTop, cellW, cellH }  (canvas-relative CSS px)
 *
 * Centre-to-centre calibration:
 *   cellW = (cx2 - cx1) / (cols - 1)
 *   cellH = (cy2 - cy1) / (rows - 1)
 *   gridLeft = cx1 - cellW / 2
 *   gridTop  = cy1 - cellH / 2
 */
let calibData = null;

// ─── DOM refs ────────────────────────────────────────────────────────────────
const gridContainer     = document.getElementById('grid-container');
const gridSelect        = document.getElementById('grid-select');
const delayInput        = document.getElementById('delay-input');
const btnClear          = document.getElementById('btn-clear');
const btnTrack          = document.getElementById('btn-track');
const btnCalib          = document.getElementById('btn-calib');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const settingsPanel     = document.getElementById('settings-panel');
const statusDot         = document.getElementById('status-dot');
const statusText        = document.getElementById('status-text');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(msg, active = false) {
  statusText.textContent = msg;
  statusDot.classList.toggle('active', active);
}

function getCurrentTotal() {
  return parseInt(gridSelect.value, 10);
}

function calibKey(total) {
  return `calib_${total}`;
}

// ─── Grid setup ──────────────────────────────────────────────────────────────

function setupGrid(totalTiles) {
  const config = GRID_CONFIG[totalTiles];
  if (!config) return;
  const { cols } = config;

  tileState = Array.from({ length: totalTiles }, () => ({ dataUrl: null }));
  gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridContainer.innerHTML = '';

  for (let i = 0; i < totalTiles; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile', 'empty');
    tile.dataset.index = i;
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', `Tile ${i + 1}`);

    const badge = document.createElement('span');
    badge.classList.add('tile-badge');
    badge.textContent = i + 1;
    tile.appendChild(badge);

    gridContainer.appendChild(tile);
  }

  setStatus(`Grid ready — ${totalTiles} tiles (${cols} cols)`);
}

// ─── Settings persistence ────────────────────────────────────────────────────

function loadSettings() {
  chrome.storage.local.get(
    { gridSize: 16, captureDelay: 500, tracking: false, calibState: null },
    ({ gridSize, captureDelay, tracking, calibState }) => {
      gridSelect.value = gridSize;
      delayInput.value = captureDelay;
      setTrackingUI(tracking);
      setupGrid(gridSize);
      loadCalibForSize(gridSize, calibState);
    }
  );
}

function loadCalibForSize(total, calibState) {
  const key = calibKey(total);
  chrome.storage.local.get({ [key]: null }, (result) => {
    calibData = result[key];
    if (calibState === 'waiting_tl') {
      setCalibUI('waiting_tl');
    } else if (calibState === 'waiting_br') {
      setCalibUI('waiting_br');
    } else if (calibData) {
      setCalibUI('done');
    } else {
      setCalibUI('idle');
    }
  });
}

// ─── Tracking toggle ──────────────────────────────────────────────────────────

function setTrackingUI(isTracking) {
  if (isTracking) {
    btnTrack.textContent = '⏸ Pause Tracking';
    btnTrack.classList.add('tracking');
  } else {
    btnTrack.textContent = '▶ Start Tracking';
    btnTrack.classList.remove('tracking');
  }
}

btnTrack.addEventListener('click', () => {
  chrome.storage.local.get({ tracking: false }, ({ tracking }) => {
    const next = !tracking;
    chrome.storage.local.set({ tracking: next });
    setTrackingUI(next);
    setStatus(next ? 'Tracking enabled — click a card!' : 'Tracking paused.');
  });
});

// ─── Calibration ─────────────────────────────────────────────────────────────

function setCalibUI(state) {
  btnCalib.classList.remove('calib-active', 'calib-done');
  const total = getCurrentTotal();

  switch (state) {
    case 'waiting_tl':
      btnCalib.textContent = '◎ Click CENTRE of top-left card…';
      btnCalib.classList.add('calib-active');
      setStatus('📍 Click the CENTRE of the TOP-LEFT card in the grid.');
      break;
    case 'waiting_br':
      btnCalib.textContent = '◎ Click CENTRE of bottom-right card…';
      btnCalib.classList.add('calib-active');
      setStatus('📍 Now click the CENTRE of the BOTTOM-RIGHT card in the grid.');
      break;
    case 'done':
      btnCalib.textContent = `✓ ${total} tiles calibrated — Recalibrate?`;
      btnCalib.classList.add('calib-done');
      if (calibData) {
        setStatus(
          `Calibrated for ${total} tiles. Cell: ${Math.round(calibData.cellW)}×${Math.round(calibData.cellH)} px`
        );
      }
      break;
    default:
      btnCalib.textContent = '◎ Calibrate Card Grid';
  }
}

btnCalib.addEventListener('click', () => {
  calibData = null;
  chrome.storage.local.set({
    calibState: 'waiting_tl',
    calibX1: null, calibY1: null,
    calibX2: null, calibY2: null,
  });
  setCalibUI('waiting_tl');
});

// ─── Settings event listeners ─────────────────────────────────────────────────

gridSelect.addEventListener('change', () => {
  const total = getCurrentTotal();
  chrome.storage.local.set({ gridSize: total });
  setupGrid(total);
  loadCalibForSize(total, null);
});

delayInput.addEventListener('input', () => {
  const delay = parseInt(delayInput.value, 10);
  if (!isNaN(delay) && delay >= 0) {
    chrome.storage.local.set({ captureDelay: delay });
  }
});

btnClear.addEventListener('click', () => {
  setupGrid(getCurrentTotal());
  setStatus('Board cleared.');
});

// ─── Settings drawer toggle ───────────────────────────────────────────────────

btnSettingsToggle.addEventListener('click', () => {
  const isOpen = settingsPanel.classList.toggle('open');
  btnSettingsToggle.classList.toggle('open', isOpen);
  btnSettingsToggle.setAttribute('aria-expanded', String(isOpen));
});

// ─── Screenshot processing ────────────────────────────────────────────────────

/**
 * Crops the card that was clicked from the full-tab screenshot and places it
 * in the correct grid tile.
 *
 * calibData = { gridLeft, gridTop, cellW, cellH }  (canvas-relative CSS px)
 * DPR       = img.naturalWidth / viewportWidth
 */
function cropAndLogCard({
  imageUri, clickX, clickY,
  canvasLeft, canvasTop,
  viewportWidth,
}) {
  const total  = getCurrentTotal();
  const config = GRID_CONFIG[total];
  if (!config) return;

  if (!calibData) {
    setStatus('⚠️ Calibrate the card grid first (◎ button).', false);
    return;
  }

  const { cols, rows }                      = config;
  const { gridLeft, gridTop, cellW, cellH } = calibData;

  // Which cell was clicked?
  const col = Math.floor((clickX - gridLeft) / cellW);
  const row = Math.floor((clickY - gridTop)  / cellH);

  if (col < 0 || col >= cols || row < 0 || row >= rows) {
    setStatus('Click landed outside the calibrated card area.', false);
    return;
  }

  const tileIndex = row * cols + col;
  setStatus(`Processing tile ${tileIndex + 1}…`, true);

  const img = new Image();
  img.onload = () => {
    // Derive exact DPR from viewport width sent by the content script
    const dpr = img.naturalWidth / (viewportWidth || window.screen.width);

    const physGridLeft = (canvasLeft + gridLeft) * dpr;
    const physGridTop  = (canvasTop  + gridTop)  * dpr;
    const physCellW    = cellW * dpr;
    const physCellH    = cellH * dpr;

    const srcX = physGridLeft + col * physCellW;
    const srcY = physGridTop  + row * physCellH;

    // Crop
    const offscreen    = document.createElement('canvas');
    offscreen.width    = Math.round(physCellW);
    offscreen.height   = Math.round(physCellH);
    const ctx          = offscreen.getContext('2d');
    ctx.drawImage(
      img,
      Math.round(srcX),    Math.round(srcY),
      Math.round(physCellW), Math.round(physCellH),
      0, 0, offscreen.width, offscreen.height
    );

    const croppedUrl = offscreen.toDataURL('image/png');
    tileState[tileIndex] = { dataUrl: croppedUrl };

    // Display in grid
    const tileEl = gridContainer.querySelector(`.tile[data-index="${tileIndex}"]`);
    if (tileEl) {
      tileEl.innerHTML = '';
      tileEl.classList.remove('empty');

      const badge = document.createElement('span');
      badge.classList.add('tile-badge');
      badge.textContent = tileIndex + 1;
      tileEl.appendChild(badge);

      const imgEl = document.createElement('img');
      imgEl.src = croppedUrl;
      imgEl.alt = `Tile ${tileIndex + 1}`;
      tileEl.appendChild(imgEl);
    }

    const filled = tileState.filter((t) => t.dataUrl).length;
    setStatus(`Tile ${tileIndex + 1} captured — ${filled}/${total} revealed`);
  };

  img.onerror = () => setStatus('Failed to load screenshot.', false);
  img.src = imageUri;
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {

  // Calibration point
  if (message.type === 'CALIB_POINT') {
    const { step } = message;

    if (step === 'tl') {
      setCalibUI('waiting_br');
      return;
    }

    if (step === 'br') {
      const { x1, y1, x2, y2 } = message;
      const total  = getCurrentTotal();
      const config = GRID_CONFIG[total];
      if (!config) return;

      const { cols, rows } = config;
      const cellW    = (x2 - x1) / (cols - 1);
      const cellH    = (y2 - y1) / (rows - 1);
      const gridLeft = x1 - cellW / 2;
      const gridTop  = y1 - cellH / 2;

      calibData = { gridLeft, gridTop, cellW, cellH };
      chrome.storage.local.set({ [calibKey(total)]: calibData });
      setCalibUI('done');
      return;
    }
  }

  // Screenshot
  if (message.type !== 'PROCESS_SCREENSHOT') return;

  const {
    imageUri, clickX, clickY,
    canvasWidth, canvasHeight,
    canvasLeft, canvasTop,
    viewportWidth,
  } = message;

  cropAndLogCard({ imageUri, clickX, clickY, canvasWidth, canvasHeight, canvasLeft, canvasTop, viewportWidth });
});

// ─── Initialise ───────────────────────────────────────────────────────────────

loadSettings();
