# AGENTS.md - Project Overview for LLM Coding Agents

## Project: Digital / Analog Clock (CRA + React)

### What this app is

A single-page React app that renders:

-   An **analog clock** (hands rotate via DOM style updates)
-   A **digital time** readout (12h/24h toggle; AM/PM hidden in 24h)
-   A **date** readout
-   A **Settings modal** (gear) with toggles (Dark Mode, 24-hour time)
-   A **Fullscreen toggle** button

### Tech stack

-   **React 18** + **Create React App** (`react-scripts`)
-   **CSS**: single stylesheet in `src/index.css` (theme variables + layout + clock styling)
-   **Icons**: `react-icons`

### Key commands

-   `npm install` - Install dependencies
-   `npm start` - Start dev server (**binds to `0.0.0.0`**). Open `http://localhost:3000` locally, or `http://<your-ip>:3000` from another device on the LAN.
-   `npm test` - Run Jest/React Testing Library tests
-   `npm run build` - Create production build

### Project layout (where to look first)

-   `src/index.js`: React entrypoint; renders `<App />`.
-   `src/App.js`: **Main app logic**: clock math, interval loop, refs/DOM writes, settings modal, fullscreen.
-   `src/index.css`: Single stylesheet (global base + theme + clock styling).

### How the clock works (important for modifications)

#### Clock face (numbers + ticks)

Dial numbers and tick marks are created imperatively in `addNumbers()`:

-   Clears containers with `innerHTML = ''`
-   Appends 12 number `<span>`s + 60 tick `<span>`s
-   Positions them using trig (`cos/sin`)
-   **Radii are derived from the rendered clock size** (via a ref to `.clockcircle`)

The face is regenerated when the clock element resizes (via **`ResizeObserver`**) and when theme changes (dark/light), so it stays correct as the clock scales.

#### Hands (analog)

Hands are updated by `updateClock()` once per second (via `setInterval` in a `useEffect` with cleanup):

-   Hour angle: `30 * hours + minutes / 2`
-   Minute angle: `6 * minutes`
-   Second angle: `6 * seconds`
-   Updates DOM via `ref.current.style.transform = ...`

**Animation/transition notes**:

-   First paint disables transitions so hands render immediately at the correct position (no “sweep on load”).
-   Wraparound handling avoids “backspin” at 0 for the second hand.

#### Digital time (12h/24h)

-   Default is derived from browser locale (`Intl.DateTimeFormat().resolvedOptions()`).
-   In 24h mode, AM/PM is hidden.
-   Digital digits use `font-variant-numeric: tabular-nums` to avoid width jitter.

### UI controls

-   **Settings modal**: opened by the gear button; includes toggles for Dark Mode and 24-hour time.
-   **Fullscreen toggle**: uses the Fullscreen API; state is synced via `fullscreenchange` so ESC/browser UI exits are reflected.

### Styling architecture

The app’s look is driven by CSS variables under `.light` and `.dark`:

-   `--bg`, `--surface`, `--surface2`, `--text`, `--mutedText`, `--border`, `--accent`

Responsiveness is primarily done via CSS `clamp(...)`, `vmin`, and flexible layout rather than fixed pixel sizes.

### Testing notes

-   `src/App.test.js` is the CRA starter test and likely fails (it expects “learn react”).
-   If you add CI or rely on tests, update/remove that test to match the current UI.

### Common pitfalls for agents

-   **Intervals**: keep only one clock interval; always clean up in `useEffect`.
-   **Imperative DOM**: `addNumbers()` mutates DOM. If you refactor, keep a single owner for those nodes.
-   **Resize/regen**: face regeneration uses `ResizeObserver`; changing markup/refs can break responsiveness.
-   **Fullscreen**: can only be triggered by a user gesture; handle promise rejections.

### Code structure summary

```
src/
├── index.js          # Entry point, renders App
├── App.js            # Main component (clock + UI controls)
├── App.test.js       # Stale test (needs update)
└── index.css         # Single stylesheet (global + theme + layout + clock styling)
```

### Key functions/sections in `App.js`

-   `addNumbers(tag)` - Generate numbers/ticks around the clock face (imperative DOM)
-   `updateClock()` - Update hand transforms + digital time state
-   Settings modal handlers - open/close, overlay click, Escape key
-   Fullscreen handlers - `toggleFullscreen()` + `fullscreenchange` listener

### Safe refactoring boundaries

If you split components, keep these concerns isolated to avoid regressions:

-   **ClockFace**: clock circle + refs + `addNumbers()` + hands
-   **DigitalDisplay**: time/date/AMPM UI (pure render)
-   **Settings**: modal UI + toggles (dark mode + 24h)
-   **FullscreenControl**: button + Fullscreen API wiring
