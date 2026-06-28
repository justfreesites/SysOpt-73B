// background.js — Service Worker
// Manages side-panel behaviour, receives canvas-click events, captures a
// screenshot after a configurable delay, then forwards the data to the panel.
//
// Capture queue: Chrome limits captureVisibleTab to 2 calls/second. To avoid
// hitting that quota, all capture requests are serialised through a queue so
// only one is ever in-flight at a time, with a minimum gap between calls.

'use strict';

// ─── Side-panel setup ────────────────────────────────────────────────────────

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[SysOpt-73B] setPanelBehavior error:', err));

// ─── Capture queue ───────────────────────────────────────────────────────────

// Minimum ms between successive captureVisibleTab calls (Chrome allows 2/s).
const MIN_CAPTURE_GAP_MS = 600;

const captureQueue = [];
let captureInFlight = false;

/**
 * Add a capture job to the queue and start processing if idle.
 * @param {{ delay, windowId, clickX, clickY, canvasWidth, canvasHeight, canvasLeft, canvasTop, viewportWidth }} job
 */
function enqueueCapture(job) {
  captureQueue.push(job);
  if (!captureInFlight) processQueue();
}

/**
 * Process the next job in the queue. Waits for the caller's captureDelay,
 * fires captureVisibleTab, forwards the result to the side panel, then waits
 * MIN_CAPTURE_GAP_MS before pulling the next job (rate-limit protection).
 */
function processQueue() {
  if (captureQueue.length === 0) {
    captureInFlight = false;
    return;
  }

  captureInFlight = true;
  const {
    delay, windowId,
    clickX, clickY,
    canvasWidth, canvasHeight,
    canvasLeft, canvasTop,
    viewportWidth,
  } = captureQueue.shift();

  // Wait the user-configured delay (card flip animation), then capture.
  setTimeout(() => {
    chrome.tabs.captureVisibleTab(
      windowId,
      { format: 'png' },
      (imageUri) => {
        if (chrome.runtime.lastError) {
          console.error(
            '[SysOpt-73B] captureVisibleTab error:',
            chrome.runtime.lastError.message
          );
          // Still wait before the next attempt so we don't hammer the API.
          setTimeout(processQueue, MIN_CAPTURE_GAP_MS);
          return;
        }

        chrome.runtime.sendMessage({
          type:          'PROCESS_SCREENSHOT',
          imageUri:      imageUri,
          clickX:        clickX,
          clickY:        clickY,
          canvasWidth:   canvasWidth,
          canvasHeight:  canvasHeight,
          canvasLeft:    canvasLeft,
          canvasTop:     canvasTop,
          viewportWidth: viewportWidth,
        }).catch(() => {});

        // Enforce minimum gap before the next capture.
        setTimeout(processQueue, MIN_CAPTURE_GAP_MS);
      }
    );
  }, delay);
}

// ─── Message handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== 'CANVAS_CLICKED') return;

  const {
    clickX, clickY,
    canvasWidth, canvasHeight,
    canvasLeft, canvasTop,
    viewportWidth,
  } = message;

  chrome.storage.local.get(
    { tracking: false, captureDelay: 500, calibState: null },
    ({ tracking, captureDelay, calibState }) => {

      // ── Calibration mode (takes priority over normal tracking) ────────────
      if (calibState === 'waiting_tl') {
        chrome.storage.local.set({ calibState: 'waiting_br', calibX1: clickX, calibY1: clickY });
        chrome.runtime.sendMessage({ type: 'CALIB_POINT', step: 'tl', clickX, clickY }).catch(() => {});
        return;
      }

      if (calibState === 'waiting_br') {
        chrome.storage.local.get({ calibX1: 0, calibY1: 0 }, ({ calibX1, calibY1 }) => {
          chrome.storage.local.set({ calibState: null, calibX2: clickX, calibY2: clickY });
          chrome.runtime.sendMessage({
            type: 'CALIB_POINT',
            step: 'br',
            x1: calibX1, y1: calibY1,
            x2: clickX,  y2: clickY,
          }).catch(() => {});
        });
        return;
      }

      // ── Normal tracking ───────────────────────────────────────────────────
      if (!tracking) return;

      enqueueCapture({
        delay:        Number(captureDelay) || 500,
        windowId:     sender.tab.windowId,
        clickX, clickY,
        canvasWidth, canvasHeight,
        canvasLeft, canvasTop,
        viewportWidth,
      });
    }
  );
});
