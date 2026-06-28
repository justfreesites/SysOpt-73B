# SysOpt-73B — Kiko Match Madness Tracker

> A passive visual aide Chrome Extension for **Kiko Match Madness** (also known as **Kiko Match III**), the timed memory-matching game on [Neopets](https://www.neopets.com).

---

## What it does

Kiko Match Madness asks you to match pairs of hidden Kiko cards before the timer runs out. SysOpt-73B watches your clicks and takes an invisible screenshot each time you flip a card, then crops and displays that card in a **companion side panel** — giving you a persistent visual reference of everything you've revealed so far.

The extension **never injects anything into the game page** and does not automate any clicks. It is read-only: it only observes and displays.

---

## Features

- 📸 **Auto-capture** — screenshots are taken silently after each card click
- 🧩 **Companion grid** — revealed cards appear in a matching grid layout beside the game
- ⚙️ **Collapsible settings** — grid size, capture delay, and card-grid calibration
- 📐 **Per-grid calibration** — precise centre-to-centre geometry for all four grid sizes (16 / 20 / 30 / 36 tiles)
- 🔒 **Privacy-safe** — no data leaves your machine; no external requests

---

## Installation

> The extension is not on the Chrome Web Store. Install it as an unpacked extension in Developer Mode.

1. **Download or clone** this repository to your computer.
2. Open Chrome and go to **`chrome://extensions`**.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder you downloaded.
5. The SysOpt-73B icon will appear in your Chrome toolbar.

---

## User Guide

### 1 — Open the side panel

Click the **SysOpt-73B** icon in the Chrome toolbar. The companion panel opens to the right of the browser window.

### 2 — Navigate to Kiko Match Madness

Go to **Kiko Match Madness** (or Kiko Match III) on Neopets and wait for the game to fully load (the Unity canvas must be present on the page).

### 3 — Select your grid size

Click **⚙ Settings** in the panel to expand the settings drawer.  
Set **Grid Layout** to match the grid you selected in-game:

| In-game option | Setting |
|---|---|
| 4 × 4 | 16 tiles |
| 4 × 5 | 20 tiles |
| 5 × 6 | 30 tiles |
| 6 × 6 | 36 tiles |

### 4 — Calibrate the card grid

This is a **one-time step per grid size**. It tells the extension exactly where the cards are on screen.

1. Click **◎ Calibrate Card Grid** in the settings drawer.
2. The status bar will prompt you to click the **centre of the top-left card** in the game grid. Click it.
3. The status bar will then prompt you to click the **centre of the bottom-right card**. Click it.
4. Calibration is saved automatically — you won't need to redo this unless you resize the browser window.

### 5 — Start tracking

Click **▶ Start Tracking** in the panel. The button turns green when active.

### 6 — Play the game

Click cards normally in Kiko Pop. Each time you flip a card, SysOpt-73B will:

1. Wait for the card-flip animation to finish (configurable delay, default 500 ms).
2. Take a screenshot of the tab.
3. Crop out the card you clicked.
4. Display it in the companion grid at the correct position.

You can now use the panel as a visual memory aid while the game is running.

### 7 — Clear the board

When a new round starts, click **⟳ Clear Board** to reset the companion grid.

---

## Settings

| Setting | Description | Default |
|---|---|---|
| **Grid Layout** | Number of tiles matching the in-game grid | 16 |
| **Capture Delay** | Milliseconds to wait after a click before screenshotting (allows card flip to complete) | 500 ms |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Cards not appearing in the panel | Make sure **▶ Start Tracking** is active and calibration has been completed |
| Wrong card shown / offset crop | Redo calibration — click centres carefully. Re-calibrate if you resize the browser |
| `Extension context invalidated` in console | Reload the Neopets tab after reloading the extension |
| Quota / rate-limit error | Clicks are already queued; if it persists, increase the Capture Delay slightly |
| Panel not opening | Click the SysOpt-73B icon in the toolbar; make sure the extension is enabled |

---

## Files

```
SysOpt-73B/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker — capture queue, screenshot relay
├── observer.js        # Content script — canvas click detection
├── sidepanel.html     # Side panel UI
└── sidepanel.js       # Side panel logic — grid, calibration, crop & display
```

---

## Permissions used

| Permission | Why |
|---|---|
| `sidePanel` | Display the companion panel |
| `activeTab` | Take a screenshot of the current tab |
| `scripting` | Inject the canvas observer script |
| `storage` | Persist settings and calibration data |

---

## Disclaimer

This extension is a **passive visual aide only**. It does not automate gameplay, modify the game, or interact with Neopets servers in any way. Use it responsibly and at your own discretion in accordance with the [Neopets Terms of Service](https://www.neopets.com/terms.phtml).

---

## Licence

MIT — free to use, modify, and distribute.
