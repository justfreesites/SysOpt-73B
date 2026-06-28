// observer.js — Content Script
// Runs on neopets.com pages. Detects clicks on the Unity canvas and relays
// precise coordinates + canvas dimensions to the background service worker.

(function () {
  'use strict';

  // Wait for the canvas to appear in the DOM before attaching the listener.
  function attachListener() {
    const canvas = document.getElementById('unity-canvas');
    if (!canvas) {
      // Retry every 500 ms until the canvas is found (game may load late).
      setTimeout(attachListener, 500);
      return;
    }

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();

      // Pixel coordinates of the click relative to the canvas top-left corner.
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Actual rendered dimensions of the canvas element.
      const canvasWidth  = rect.width;
      const canvasHeight = rect.height;

      try {
        chrome.runtime.sendMessage({
          type:          'CANVAS_CLICKED',
          clickX:        clickX,
          clickY:        clickY,
          canvasWidth:   canvasWidth,
          canvasHeight:  canvasHeight,
          canvasLeft:    rect.left,    // viewport-relative canvas origin X
          canvasTop:     rect.top,     // viewport-relative canvas origin Y
          viewportWidth: window.innerWidth,  // CSS px — used to derive DPR
        });
      } catch (err) {
        // The extension was reloaded while this tab was open. The old content
        // script context is now invalid. Warn once and stop listening so clicks
        // don't keep throwing. Refreshing the page re-injects a fresh script.
        console.warn(
          '[SysOpt-73B] Extension context invalidated — refresh this tab to reconnect.',
          err
        );
        canvas.removeEventListener('click', arguments.callee);
      }
    });

    console.log('[SysOpt-73B] Canvas listener attached.');
  }

  attachListener();
})();
