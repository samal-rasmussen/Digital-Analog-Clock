# AGENTS.md — Project Guide (Digital / Analog Clock)

## Goal / intent

This project is a **single-page clock UI** that combines:

-   **Analog clock** (3 hands)
-   **Digital time** (12h/24h toggle; AM/PM only shown in 12h)
-   **Date readout**
-   **Settings modal** (Dark Mode + 24-hour time)
-   **Fullscreen toggle**

The intent is a **clean, responsive clock** with minimal jitter (tabular digits) and a clock face that stays correct as the clock resizes.

## Current implementation (as-is)

### Tech stack

-   **React 18** + **Create React App** (`react-scripts`)
-   **CSS**: everything in **`src/index.css`**
-   **Icons**: `react-icons` for gear/fullscreen; modal close is a Unicode glyph (`✕`)

### Key commands

-   `npm install` — install deps
-   `npm start` — dev server (CRA; binds to `0.0.0.0`)
-   `npm run build` — production build

### Code map (where to look)

-   `src/index.js` — mounts the app and imports `src/index.css`
-   `src/App.js` — _all_ UI + logic (clock math, timers, modal, fullscreen)
-   `src/index.css` — theme variables + layout + clock styling

```
src/
├── index.js    # Entry point
├── App.js      # Main component (logic + markup)
└── index.css   # Single stylesheet
```

## UI/DOM architecture

### DOM “contract” (elements the logic expects)

`App.js` uses imperative DOM updates via refs. The clock face and hands depend on these elements existing:

-   `.clockcircle` — the clock circle container (also used for sizing via `clientWidth`)
-   `.numbers` — container populated with 12 `<span class="number">…</span>`
-   `.ticks` — container populated with 60 `<span class="tick …">`
-   `.hour`, `.minute`, `.second` — the 3 hands (transforms are set directly)

### State model (what drives what)

In `App.js`, the main state values are:

-   `nowMs` — single “time source” (`Date.now()` as a number) updated every second; **digital time/date are derived from this during render**
-   `darkmode` — toggles root wrapper class `"dark"` vs `"light"` (controls CSS variables)
-   `use24Hour` — controls digital formatting and whether AM/PM is rendered
-   `settingsOpen` — controls whether the settings modal is rendered
-   `isFullscreen` — reflects `document.fullscreenElement`

### Event / lifecycle wiring (important implementation details)

The app registers and cleans up these behaviors:

-   **Pre-paint hand sync**: calls `updateHands(new Date())` in a `useLayoutEffect` so hands are correct on the first paint (avoids initial “pointing at 12” flash)
-   **1s clock interval**: calls `tick()` every second, which updates `nowMs` and updates the 3 hand transforms using the same `Date`
-   **ResizeObserver on `.clockcircle`**: regenerates numbers/ticks when the clock resizes
-   **Escape key handler**: closes settings modal when open
-   **Fullscreen change listeners**: keeps `isFullscreen` in sync even when exiting via ESC / browser UI

## Clock behavior details

### Hand angles (analog)

`updateHands(date)` computes angles:

-   Hour: `30 * hours + minutes / 2`
-   Minute: `6 * minutes`
-   Second: `6 * seconds`

and sets transforms directly on the hand elements.

**First paint** disables transitions so hands “snap” to the correct time without sweeping on load. Wraparound handling avoids backwards animation at 0 for some hands.

### Digital formatting (12h / 24h)

-   24h default is derived once from `Intl.DateTimeFormat(...).resolvedOptions()`
-   Digital time/date/AMPM are **derived during render** from `nowMs` and `use24Hour` using `Intl.DateTimeFormat(...).formatToParts()` / `.format()`
-   The time is rendered in the visual format `HH : MM : SS`
-   24h mode hides the AM/PM element; 12h mode displays the locale-provided `dayPeriod` string
-   Date uses locale formatting (month short + day + year) and strips commas for presentation
-   Digital digits use `font-variant-numeric: tabular-nums` to reduce width jitter

### Clock face generation (numbers + ticks)

`regenerateClockFace()` rebuilds the face imperatively:

-   Clears `.numbers` and `.ticks` with `innerHTML = ""`
-   Adds:
    -   **12 numbers**: `<span class="number">…</span>`
    -   **60 ticks**: `<span class="tick">` with every 5th tick also having `.hourTick`

Sizing is derived from the rendered clock size:

-   `clockRadius = clockCircle.clientWidth / 2`
-   `numberRadius = clockRadius * 0.74`
-   `tickRadius = clockRadius * 0.89`

**Important**: the current implementation also applies a **label/position shift**:

-   `shiftedI = (i + 3) % 12 || 12` (used as the text label)
-   `shiftedHShift` tweaks horizontal offset for 1-digit vs 2-digit labels

If you change how the `.numbers` container is rotated (or not rotated) in CSS, you will likely need to revisit this shift logic.

## Styling system (CSS “API”)

### Theme variables

Theme is controlled by a top-level wrapper class of `.dark` or `.light`. These define CSS variables used everywhere:

-   `--bg`, `--surface`, `--surface2`, `--text`, `--mutedText`, `--border`, `--accent`

### Key classes / conventions

-   **Icon buttons**:
    -   `.iconButton` — shared visual behavior (hover background, rounded)
    -   `.floatingIconButton` — positioning-only styles for top-right controls
    -   Modal close button also uses `.iconButton` but uses `.settingsClose` for size/hover override
-   **Ticks**:
    -   `.tick` base tick styles use CSS variables (`--tick-width`, `--tick-height`, `--tick-rotation`)
    -   `.hourTick` overrides width/height to make hour marks longer/thicker
    -   Tick “outer-edge alignment” is done via `--tick-inset` math; the divisor is intentionally tweakable for visual alignment
-   **Hands**: `.hour`, `.minute`, `.second` are styled in CSS; JS only updates transforms/transitions

## Fullscreen behavior notes

The fullscreen button toggles between `document.documentElement.requestFullscreen()` and `document.exitFullscreen()`.

-   Fullscreen calls must be triggered by a user gesture; promise rejections are logged.
-   `isFullscreen` is derived from `document.fullscreenElement` and synced via `fullscreenchange`.

## Known pitfalls / guardrails

-   Keep **one** clock interval and always clean it up.
-   `regenerateClockFace()` is imperative and clears/rebuilds nodes; avoid mixing with a declarative render of those same nodes.
-   `ResizeObserver` drives face regeneration; if you change `.clockcircle` structure, keep the observer target correct.
-   If you adjust CSS rotations on `.numbers`/`.ticks`, revisit the “shifted number label” logic in `addNumbers()`.
-   `nowMs` updates every second; if you stop updating it, digital time/date will stop updating (and the date can go stale across midnight).

## Porting notes (framework-agnostic starting point)

If you ever port this UI to another framework, the key is to preserve these contracts:

-   **State**: the values listed in “State model” and what UI they drive
-   **Lifecycle**:
    -   start/stop a 1s timer for `tick()`
    -   attach/detach resize, keydown, fullscreenchange listeners
    -   attach/detach a ResizeObserver on the clock circle
-   **DOM refs**: you will still need direct handles to the 3 hands (or an equivalent rendering strategy) and containers for numbers/ticks (unless you fully re-implement face generation declaratively)
-   **CSS variables + classes**: `.dark/.light` and the theme variables are the styling backbone; preserve them or map them cleanly
