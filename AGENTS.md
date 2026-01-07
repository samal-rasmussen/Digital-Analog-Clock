# AGENTS.md - Project Overview for LLM Coding Agents

## Project: Digital / Analog Clock (CRA + React)

### What this app is

A single-page React app that renders:

-   An **analog clock** (hands rotate via DOM style updates)
-   A **digital time + AM/PM** readout
-   A **date** readout
-   Optional **tick sound** (attempts to play every second)
-   A **dark mode toggle** (implemented using Tailwind-style `dark:` utilities)

### Tech stack

-   **React 18** + **Create React App** (`react-scripts`)
-   **CSS**: custom styles in `src/styles/clock.css`
-   **Tailwind**: `tailwind.config.js` exists and Tailwind directives/utilities are referenced, but Tailwind may not be fully wired (see "Styling gotchas" below).
-   **Icons**: `react-icons`

### Key commands

-   `npm install` - Install dependencies
-   `npm start` - Start development server (typically runs on http://localhost:3000)
-   `npm test` - Run Jest/React Testing Library tests
-   `npm run build` - Create production build

### Project layout (where to look first)

-   `src/index.js`: React entrypoint; renders `<App />`.
-   `src/App.js`: **Main (and basically only) app logic**: clock math, DOM refs, audio, dark mode.
-   `src/styles/clock.css`: Main styles for clock layout and hands.
-   `src/sound/tick.mp3`: Tick audio asset.
-   `tailwind.config.js`: Tailwind config (dark mode is `class`).

### How the clock works (important for modifications)

-   **Dial numbers + tick marks** are created imperatively in `addNumbers()`:
    -   Clears containers with `innerHTML = ''`
    -   Appends 12 number `<span>`s + 60 tick `<span>`s
    -   Positions them using trig (`cos/sin`) around a radius
-   **Hands** are updated in `start()` using a `setInterval(..., 1000)`:
    -   Hour hand angle: `30 * hours + minutes / 2`
    -   Minute hand angle: `6 * minutes`
    -   Second hand angle: `6 * seconds`
    -   Updates DOM via `ref.current.style.transform = ...`
-   **Digital time/date** are React state updated once per second.

### Audio behavior

-   `playSound()` creates a fresh `new Audio()` and plays `tick.mp3`.
-   Browsers often block autoplay; the app tries to trigger playback using a hidden button click.
-   If you change audio behavior, keep in mind `NotAllowedError` is expected without user interaction.

### Styling gotchas (Tailwind)

This repo references Tailwind in two ways:

-   `src/styles/clock.css` contains `@tailwind base/components/utilities`
-   JSX uses Tailwind utility classes like `dark:bg-[#071b24]`

However, Tailwind does **not** appear fully wired for CRA in this repo (no `postcss.config.js`, and Tailwind directives are not in `src/index.css`). If Tailwind utilities aren't applying:

-   Either properly install/wire Tailwind for CRA (PostCSS + `tailwindcss` plugin), or
-   Replace Tailwind utility usage with regular CSS.

### Testing notes

-   `src/App.test.js` is the CRA starter test and likely fails (it expects "learn react").
-   If you add CI or rely on tests, update/remove that test to match the current UI.

### Common pitfalls for agents

-   **Intervals/timeouts**: `start()` creates an interval but there is no cleanup. Don't add more intervals without cleaning up in `useEffect`.
-   **Imperative DOM**: `addNumbers()` manipulates DOM directly; avoid mixing React rendering with those same nodes unless you refactor intentionally.
-   **Resize behavior**: window width is stored in state, but the dial/ticks are only generated on mount; if you want true responsiveness you'll need to regenerate on resize.
-   **Audio**: playing a new `Audio()` every second is expensive; refactor carefully and test in a real browser.

### When making changes

-   **Clock math/behavior**: start in `src/App.js`.
-   **Layout/appearance**: start in `src/styles/clock.css`.
-   **Assets**: `src/sound/`.
-   If you split components, keep the DOM refs + clock update loop isolated so you don't accidentally cause extra intervals or reflows.

### Architecture details

#### State management

All state is managed in `App.js` using React hooks:

-   `digitaltime`, `digitaldate`, `amorpm` - Digital clock display
-   `darkmode` - Theme toggle state
-   `windowWidth` - Responsive sizing
-   `muted` - Audio mute state

#### Refs used

Multiple refs are used for direct DOM manipulation:

-   `numbref` - Container for clock numbers (1-12)
-   `tickref` - Container for tick marks (60 marks)
-   `hourref`, `mintref`, `secdref` - Clock hands
-   `hidbref` - Hidden button for audio autoplay workaround
-   `audiref` - Audio popup overlay
-   `waitref`, `addnumberref` - Function refs for initialization

#### Responsive design

-   Desktop (>540px): Clock radius 210px, tick radius 235px
-   Mobile (≤540px): Clock radius 140px, tick radius 163px
-   Layout switches from side-by-side to stacked at ≤1024px

#### Dark mode implementation

-   Uses Tailwind `dark:` utility classes
-   Toggle button switches between light/dark themes
-   `addNumbers()` function regenerates tick marks with appropriate class names (`tick` vs `darktick`)

### Troubleshooting guide

#### Tailwind styles not applying

If Tailwind utility classes aren't working:

1. Check if `postcss.config.js` exists (it doesn't currently)
2. Verify Tailwind is properly installed: `npm list tailwindcss`
3. Ensure PostCSS is configured for CRA (may require ejecting or using CRACO)
4. Alternative: Replace Tailwind utilities with regular CSS classes

#### Audio not playing

-   Browser autoplay policies block audio without user interaction
-   The app attempts to work around this with a hidden button click
-   If audio still doesn't work, check browser console for `NotAllowedError`
-   Consider adding a visible "Enable Sound" button instead

#### Tests failing

-   Default test in `src/App.test.js` expects "learn react" text that doesn't exist
-   Update test to match actual rendered content (clock elements, time display, etc.)
-   Or remove the test if not needed

#### Clock not updating

-   Check if `start()` function is being called (should be called via `waitref.current()` in `useEffect`)
-   Verify `setInterval` is running (check browser console)
-   Ensure refs are properly attached to DOM elements

### Code structure summary

```
src/
├── index.js          # Entry point, renders App
├── App.js            # Main component (all logic here)
├── App.css           # Unused (CRA default)
├── App.test.js       # Stale test (needs update)
├── index.css         # Global styles
├── styles/
│   └── clock.css     # Clock-specific styles
└── sound/
    ├── tick.mp3      # Used audio file
    ├── tick2.mp3     # Unused
    └── tick3.mp3     # Unused
```

### Key functions in App.js

-   `addNumbers(tag)` - Generates clock numbers and tick marks imperatively
-   `start()` - Sets up interval to update clock hands and digital display
-   `playSound()` - Creates and plays tick audio
-   `waitFunction()` - Delays clock start by 2 seconds (for audio popup)
-   `handleResize()` - Updates window width state
-   `formatTimeComponent()` - Formats time values with leading zeros

### Safe refactoring boundaries

If you need to split this into multiple components:

-   **ClockFace component**: Analog clock circle, numbers, ticks, hands (keep refs together)
-   **DigitalDisplay component**: Time, date, AM/PM (pure React state)
-   **ThemeToggle component**: Dark mode button (simple state toggle)
-   **AudioManager component**: Sound playback logic (isolate from clock updates)

Keep the `setInterval` logic in the parent or a dedicated hook to avoid multiple intervals.
