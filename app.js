const timeFormatter12 = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: true,
});

const timeFormatter24 = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

function getDefault24Hour() {
	try {
		const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
		const resolved = formatter.resolvedOptions();
		if (resolved.hour12 !== undefined) return !resolved.hour12;
		if (resolved.hourCycle) return resolved.hourCycle === "h23" || resolved.hourCycle === "h24";
	} catch {
		// ignore
	}
	return false;
}

function formatDigitalDisplay(date, use24Hour) {
	const parts = (use24Hour ? timeFormatter24 : timeFormatter12).formatToParts(date);
	const hour = parts.find((p) => p.type === "hour")?.value ?? "";
	const minute = parts.find((p) => p.type === "minute")?.value ?? "";
	const second = parts.find((p) => p.type === "second")?.value ?? "";
	const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";

	return {
		digitaltime: `${hour} : ${minute} : ${second}`,
		amorpm: use24Hour ? "" : dayPeriod,
		digitaldate: dateFormatter.format(date).replaceAll(",", ""),
	};
}

function computeHandAngles(date) {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();

	return {
		hourAngle: 30 * hours + minutes / 2,
		minuteAngle: 6 * minutes,
		secondAngle: 6 * seconds,
	};
}

function readJson(key) {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// ignore
	}
}

function getFocusableElements(rootEl) {
	const selector = [
		'a[href]:not([tabindex="-1"])',
		'button:not([disabled]):not([tabindex="-1"])',
		'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
		'select:not([disabled]):not([tabindex="-1"])',
		'textarea:not([disabled]):not([tabindex="-1"])',
		'[tabindex]:not([tabindex="-1"])',
	].join(",");
	return Array.from(rootEl.querySelectorAll(selector));
}

const PREFS_KEY = "vanillaClockPrefs";

const state = {
	nowMs: Date.now(),
	darkmode: true,
	use24Hour: false,
	settingsOpen: false,
	isFullscreen: false,
};

const prevAngles = {
	hourAngle: null,
	minuteAngle: null,
	secondAngle: null,
};

let tickTimeoutId = null;

const els = {
	app: document.getElementById("app"),
	clockcircle: document.getElementById("clockcircle"),
	numbers: document.getElementById("numbers"),
	ticks: document.getElementById("ticks"),
	date: document.getElementById("date"),
	time: document.getElementById("time"),
	amorpm: document.getElementById("amorpm"),

	fullscreenButton: document.getElementById("fullscreenButton"),
	settingsButton: document.getElementById("settingsButton"),

	settingsOverlay: document.getElementById("settingsOverlay"),
	settingsClose: document.getElementById("settingsClose"),
	darkModeToggle: document.getElementById("darkModeToggle"),
	use24HourToggle: document.getElementById("use24HourToggle"),

	hourHand: document.getElementById("hourHand"),
	minuteHand: document.getElementById("minuteHand"),
	secondHand: document.getElementById("secondHand"),
};

function buildClockFaceOnce() {
	els.numbers.innerHTML = "";
	els.ticks.innerHTML = "";

	for (let n = 1; n <= 12; n++) {
		// Place 12 at 0deg, 3 at 90deg, 6 at 180deg, 9 at 270deg
		const angle = (n % 12) * 30;
		const span = document.createElement("span");
		span.className = "number";
		span.style.setProperty("--angle", `${angle}deg`);
		span.textContent = String(n);
		els.numbers.appendChild(span);
	}

	for (let i = 0; i < 60; i++) {
		const angle = i * 6;
		const tick = document.createElement("span");
		tick.className = `tick${i % 5 === 0 ? " hourTick" : ""}`;
		tick.style.setProperty("--angle", `${angle}deg`);
		els.ticks.appendChild(tick);
	}
}

function renderTheme() {
	els.app.classList.toggle("dark", state.darkmode);
	els.app.classList.toggle("light", !state.darkmode);
	els.darkModeToggle.checked = state.darkmode;
}

function renderDigital() {
	const now = new Date(state.nowMs);
	const { digitaltime, amorpm, digitaldate } = formatDigitalDisplay(now, state.use24Hour);

	els.time.textContent = digitaltime;
	els.date.textContent = digitaldate;

	if (state.use24Hour) {
		els.amorpm.hidden = true;
		els.amorpm.textContent = "";
	} else {
		els.amorpm.hidden = false;
		els.amorpm.textContent = amorpm;
	}
}

function applyNoTransitionTemporarily(handEl) {
	handEl.classList.add("noTransition");
	requestAnimationFrame(() => {
		handEl.classList.remove("noTransition");
	});
}

function renderHands({ transitionsEnabled }) {
	const now = new Date(state.nowMs);
	const { hourAngle, minuteAngle, secondAngle } = computeHandAngles(now);

	// Wrap detection: if next < prev, the hand wrapped 360 -> 0.
	const hourWrap = prevAngles.hourAngle != null && hourAngle < prevAngles.hourAngle;
	const minuteWrap = prevAngles.minuteAngle != null && minuteAngle < prevAngles.minuteAngle;
	const secondWrap = prevAngles.secondAngle != null && secondAngle < prevAngles.secondAngle;

	if (!transitionsEnabled) {
		els.hourHand.classList.add("noTransition");
		els.minuteHand.classList.add("noTransition");
		els.secondHand.classList.add("noTransition");
	} else {
		els.hourHand.classList.remove("noTransition");
		els.minuteHand.classList.remove("noTransition");
		els.secondHand.classList.remove("noTransition");

		if (hourWrap) applyNoTransitionTemporarily(els.hourHand);
		if (minuteWrap) applyNoTransitionTemporarily(els.minuteHand);
		if (secondWrap) applyNoTransitionTemporarily(els.secondHand);
	}

	els.clockcircle.style.setProperty("--hour-angle", `${hourAngle}deg`);
	els.clockcircle.style.setProperty("--minute-angle", `${minuteAngle}deg`);
	els.clockcircle.style.setProperty("--second-angle", `${secondAngle}deg`);

	prevAngles.hourAngle = hourAngle;
	prevAngles.minuteAngle = minuteAngle;
	prevAngles.secondAngle = secondAngle;
}

function renderFullscreenButton() {
	const isFullscreen = Boolean(document.fullscreenElement);
	state.isFullscreen = isFullscreen;
	els.fullscreenButton.setAttribute(
		"aria-label",
		isFullscreen ? "Exit fullscreen" : "Enter fullscreen",
	);
	els.fullscreenButton.querySelector(".fullscreenIcon").textContent = isFullscreen ? "🗗" : "⛶";
}

let lastFocusedBeforeModal = null;

function openSettings() {
	if (state.settingsOpen) return;
	state.settingsOpen = true;
	lastFocusedBeforeModal =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	els.settingsOverlay.hidden = false;
	els.use24HourToggle.checked = state.use24Hour;
	els.darkModeToggle.checked = state.darkmode;

	// Focus first interactive control inside the modal.
	requestAnimationFrame(() => {
		els.darkModeToggle.focus();
	});
}

function closeSettings() {
	if (!state.settingsOpen) return;
	state.settingsOpen = false;
	els.settingsOverlay.hidden = true;

	if (lastFocusedBeforeModal) {
		requestAnimationFrame(() => lastFocusedBeforeModal.focus());
	}
}

function toggleDarkMode(next) {
	state.darkmode = Boolean(next);
	writeJson(PREFS_KEY, { darkmode: state.darkmode, use24Hour: state.use24Hour });
	renderTheme();
}

function toggle24Hour(next) {
	state.use24Hour = Boolean(next);
	writeJson(PREFS_KEY, { darkmode: state.darkmode, use24Hour: state.use24Hour });
	renderDigital();
}

async function toggleFullscreen() {
	try {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await document.documentElement.requestFullscreen();
		}
	} catch (error) {
		console.error("Error toggling fullscreen:", error);
	}
}

function tick() {
	state.nowMs = Date.now();
	renderDigital();
	renderHands({ transitionsEnabled: true });
}

function stopTicking() {
	if (tickTimeoutId != null) {
		clearTimeout(tickTimeoutId);
		tickTimeoutId = null;
	}
}

function scheduleNextTick() {
	const delay = 1000 - (Date.now() % 1000);
	tickTimeoutId = setTimeout(() => {
		tick();
		scheduleNextTick();
	}, delay);
}

function startTickAligned() {
	stopTicking();

	// First paint: snap without transitions, but using the correct current time.
	state.nowMs = Date.now();
	renderDigital();
	renderHands({ transitionsEnabled: false });

	// Enable transitions after first paint.
	requestAnimationFrame(() => {
		els.hourHand.classList.remove("noTransition");
		els.minuteHand.classList.remove("noTransition");
		els.secondHand.classList.remove("noTransition");
	});

	scheduleNextTick();
}

function loadPrefs() {
	const saved = readJson(PREFS_KEY);
	const defaultUse24Hour = getDefault24Hour();
	const prefersDark =
		window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

	state.use24Hour = typeof saved?.use24Hour === "boolean" ? saved.use24Hour : defaultUse24Hour;
	state.darkmode = typeof saved?.darkmode === "boolean" ? saved.darkmode : prefersDark;
}

function attachEvents() {
	els.settingsButton.addEventListener("click", openSettings);
	els.settingsClose.addEventListener("click", closeSettings);
	els.settingsOverlay.addEventListener("click", (e) => {
		if (e.target === e.currentTarget) closeSettings();
	});

	// If the page is being unloaded or bfcached, avoid leaving timers running.
	window.addEventListener("pagehide", stopTicking);

	window.addEventListener("keydown", (e) => {
		if (!state.settingsOpen) return;

		if (e.key === "Escape") {
			e.preventDefault();
			closeSettings();
			return;
		}

		if (e.key === "Tab") {
			const focusables = getFocusableElements(els.settingsOverlay);
			if (focusables.length === 0) return;

			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement;

			if (e.shiftKey) {
				if (active === first || active === els.settingsOverlay) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (active === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	});

	els.darkModeToggle.addEventListener("change", (e) => toggleDarkMode(e.target.checked));
	els.use24HourToggle.addEventListener("change", (e) => toggle24Hour(e.target.checked));

	els.fullscreenButton.addEventListener("click", toggleFullscreen);
	document.addEventListener("fullscreenchange", renderFullscreenButton);
}

function init() {
	loadPrefs();
	renderTheme();
	els.use24HourToggle.checked = state.use24Hour;
	els.darkModeToggle.checked = state.darkmode;

	buildClockFaceOnce();
	renderFullscreenButton();
	attachEvents();
	startTickAligned();
}

init();
