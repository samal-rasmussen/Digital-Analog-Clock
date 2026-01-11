import React, { useEffect, useRef, useState, useCallback } from "react";
import { MdSettings, MdFullscreen, MdFullscreenExit } from "react-icons/md";

const monthObj = {
	1: "Jan",
	2: "Feb",
	3: "Mar",
	4: "Apr",
	5: "May",
	6: "June",
	7: "July",
	8: "Aug",
	9: "Sept",
	10: "Oct",
	11: "Nov",
	12: "Dec",
};

function App() {
	const numbref = useRef();
	const tickref = useRef();
	const hourref = useRef();
	const mintref = useRef();
	const secdref = useRef();
	const clockcircleref = useRef();
	const addnumberref = useRef(addNumbers);
	const isFirstPaintRef = useRef(true);

	const [digitaltime, setDigitalTime] = useState("00 : 00 : 00");
	const [amorpm, setAmOrPm] = useState("--");
	const [digitaldate, setDigitalDate] = useState("DD-MM-YYYY");
	const [darkmode, setDarkMode] = useState(true);
	const [windowWidth, setWindowWidth] = useState(window.innerWidth);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

	// Detect browser locale default for 24h format
	const getDefault24Hour = () => {
		try {
			const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
			const resolved = formatter.resolvedOptions();
			if (resolved.hour12 !== undefined) {
				return !resolved.hour12;
			}
			if (resolved.hourCycle) {
				return resolved.hourCycle === "h23" || resolved.hourCycle === "h24";
			}
		} catch (e) {
			// Fallback to 12h if detection fails
		}
		return false;
	};

	const [use24Hour, setUse24Hour] = useState(() => getDefault24Hour());

	const formatTimeComponent = (component) => (component > 9 ? component : `0${component}`);

	const handleResize = () => {
		setWindowWidth(window.innerWidth);
	};

	function addNumbers() {
		const numbersContainer = numbref.current;
		const tickcontainer = tickref.current;
		const clockCircle = clockcircleref.current;

		if (!numbersContainer || !tickcontainer || !clockCircle) return;

		// Compute radii from actual clock circle size
		const clockSize = clockCircle.clientWidth;
		const clockRadius = clockSize / 2;
		const numberRadius = clockRadius * 0.74; // Numbers at 74% of radius
		const tickRadius = clockRadius * 0.89; // Ticks at 89% of radius

		// Calculate shifts based on clock size
		const horshift = -clockSize * 0.03; // ~3% of clock size
		const vershift = -clockSize * 0.02; // ~2% of clock size

		numbersContainer.innerHTML = "";
		tickcontainer.innerHTML = "";

		for (let i = 1; i <= 12; i++) {
			const angle = i * 30 * (Math.PI / 180);
			const x = Math.round(numberRadius * Math.cos(angle));
			const y = Math.round(numberRadius * Math.sin(angle));

			const number = document.createElement("span");
			number.className = "number";
			number.style.left = `${x + horshift}px`;
			number.style.top = `${y + vershift}px`;
			number.textContent = i;

			numbersContainer.appendChild(number);
		}

		for (let i = 1; i <= 60; i++) {
			const isHourTick = i % 5 === 0;
			const angle = i * 6 * (Math.PI / 180);
			const x = tickRadius * Math.cos(angle);
			const y = tickRadius * Math.sin(angle);

			const tick = document.createElement("span");
			tick.className = `tick${isHourTick ? " hourTick" : ""}`;
			tick.style.left = `${x}px`;
			tick.style.top = `${y}px`;
			tick.style.setProperty("--tick-rotation", `${i * 6}deg`);
			tickcontainer.appendChild(tick);
		}
	}

	const updateClock = useCallback(() => {
		const date = new Date();
		const hourstick = hourref.current;
		const minutstick = mintref.current;
		const secondstick = secdref.current;

		if (!hourstick || !minutstick || !secondstick) return;

		const hours = date.getHours();
		const minutes = date.getMinutes();
		const seconds = date.getSeconds();
		const rotatehourhand = 30 * hours + minutes / 2;
		const rotateminutehand = 6 * minutes;
		const rotatesecondhand = 6 * seconds;

		// On first paint, disable all transitions to jump directly to correct position
		if (isFirstPaintRef.current) {
			hourstick.style.transition = "none";
			minutstick.style.transition = "none";
			secondstick.style.transition = "none";
			isFirstPaintRef.current = false;

			// Re-enable transitions after the first paint
			requestAnimationFrame(() => {
				if (hourstick && minutstick && secondstick) {
					hourstick.style.transition = "";
					minutstick.style.transition = "";
					secondstick.style.transition = "";
				}
			});
		} else {
			// Handle wraparound for hour and minute hands
			if (rotatehourhand === 0) {
				hourstick.style.transition = "none";
			} else {
				hourstick.style.transition = "transform 1s ease";
			}

			if (rotateminutehand === 0) {
				minutstick.style.transition = "none";
			} else {
				minutstick.style.transition = "transform 1s ease";
			}

			// Handle wraparound for second hand
			if (rotatesecondhand === 0) {
				secondstick.style.transition = "none";
			} else {
				secondstick.style.transition = "transform 0.3s ease";
			}
		}

		hourstick.style.transform = `translateY(-50%) rotate(${rotatehourhand}deg)`;
		minutstick.style.transform = `${windowWidth > 540 ? "translateY(-50%)" : "translate(-4%,-50%)"} rotate(${rotateminutehand}deg)`;
		secondstick.style.transform = `translateY(-50%) rotate(${rotatesecondhand}deg)`;

		// Format hours based on 24h/12h setting
		const formattedHours = use24Hour
			? formatTimeComponent(hours)
			: formatTimeComponent(hours % 12 === 0 ? 12 : hours % 12);
		const formattedMinutes = formatTimeComponent(minutes);
		const formattedSeconds = formatTimeComponent(seconds);

		setDigitalTime(`${formattedHours} : ${formattedMinutes} : ${formattedSeconds}`);

		// Only set AM/PM in 12h mode
		if (use24Hour) {
			setAmOrPm("");
		} else {
			setAmOrPm(hours >= 12 ? "PM" : "AM");
		}
	}, [use24Hour, windowWidth]);

	// Initialize date on mount
	useEffect(() => {
		const getdate = new Date();
		const d = getdate.getDate();
		const m = getdate.getMonth();
		const y = getdate.getFullYear();
		setDigitalDate(`${d}-${monthObj[m + 1]}-${y}`);
		addnumberref.current();
	}, []);

	// Clock update interval - reacts to use24Hour changes
	useEffect(() => {
		updateClock(); // Initial update
		const intervalId = setInterval(updateClock, 1000);

		return () => {
			clearInterval(intervalId);
		};
	}, [updateClock]);

	// Window resize handler
	useEffect(() => {
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	// Regenerate numbers/ticks when clock size changes or theme changes
	useEffect(() => {
		if (!clockcircleref.current) return;

		const regenerateNumbers = () => {
			addnumberref.current();
		};

		// Initial generation
		regenerateNumbers();

		// Use ResizeObserver to watch clock circle size changes
		const resizeObserver = new ResizeObserver(() => {
			regenerateNumbers();
		});

		resizeObserver.observe(clockcircleref.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [darkmode]);

	const handleDarkModeToggle = () => {
		const newDarkMode = !darkmode;
		setDarkMode(newDarkMode);
		addNumbers();
	};

	const handle24HourToggle = () => {
		setUse24Hour(!use24Hour);
	};

	const handleCloseSettings = () => {
		setSettingsOpen(false);
	};

	const handleOverlayClick = (e) => {
		if (e.target === e.currentTarget) {
			handleCloseSettings();
		}
	};

	const toggleFullscreen = async () => {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			} else {
				await document.documentElement.requestFullscreen();
			}
		} catch (error) {
			console.error("Error toggling fullscreen:", error);
		}
	};

	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === "Escape" && settingsOpen) {
				handleCloseSettings();
			}
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [settingsOpen]);

	// Sync fullscreen state with browser
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
		document.addEventListener("mozfullscreenchange", handleFullscreenChange);
		document.addEventListener("MSFullscreenChange", handleFullscreenChange);

		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
			document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
			document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
		};
	}, []);

	return (
		<div className={`${darkmode ? "dark" : "light"}`}>
			<div className="main">
				<button
					onClick={toggleFullscreen}
					className="fullscreenButton"
					aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
				>
					{isFullscreen ? (
						<MdFullscreenExit className="fullscreenIcon" />
					) : (
						<MdFullscreen className="fullscreenIcon" />
					)}
				</button>
				<button
					onClick={() => setSettingsOpen(true)}
					className="settingsButton"
					aria-label="Settings"
				>
					<MdSettings className="settingsIcon" />
				</button>

				{settingsOpen && (
					<div
						className="settingsOverlay"
						onClick={handleOverlayClick}
						role="dialog"
						aria-modal="true"
						aria-labelledby="settings-title"
					>
						<div className="settingsModal">
							<div className="settingsHeader">
								<h2 id="settings-title" className="settingsTitle">
									Settings
								</h2>
								<button
									onClick={handleCloseSettings}
									className="settingsClose"
									aria-label="Close settings"
								>
									×
								</button>
							</div>
							<div className="settingsContent">
								<div className="settingsRow">
									<label className="settingsLabel">
										<span>Dark Mode</span>
										<input
											type="checkbox"
											checked={darkmode}
											onChange={handleDarkModeToggle}
											className="settingsToggle"
										/>
									</label>
								</div>
								<div className="settingsRow">
									<label className="settingsLabel">
										<span>24-Hour Time</span>
										<input
											type="checkbox"
											checked={use24Hour}
											onChange={handle24HourToggle}
											className="settingsToggle"
										/>
									</label>
								</div>
							</div>
						</div>
					</div>
				)}
				<div className="clockcontainer">
					<div ref={clockcircleref} className="clockcircle">
						<div ref={numbref} className="numbers"></div>
						<div ref={tickref} className="ticks"></div>
						<div ref={hourref} className="hour"></div>
						<div ref={mintref} className="minute"></div>
						<span ref={secdref} className="second"></span>
					</div>
				</div>
				<div className="clockmanager">
					<div className="datecontainer">
						<span className="date">{digitaldate}</span>
					</div>
					<div className="">
						<span className="timecontainer">{digitaltime}</span>
						{!use24Hour && <span className="amorpm">{amorpm}</span>}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
