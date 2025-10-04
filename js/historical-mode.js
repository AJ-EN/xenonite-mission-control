// ============================================
// HISTORICAL MODE CONTROLLER
// Stage 1: The Growth of a Global Problem
// ============================================

const HistoricalMode = (function () {
    "use strict";

    // ==========================================
    // STATE
    // ==========================================
    let currentYear = 1980;
    let isPlaying = false;
    let animationInterval = null;
    let playbackSpeed = 1; // 1x, 2x, 4x
    let debrisCount = 0;

    // Elements
    let elements = {
        historicalMode: null,
        debrisNumber: null,
        yearLabel: null,
        timeSlider: null,
        playBtn: null,
        playIcon: null,
        playText: null,
        debrisCountDisplay: null,
        speedButtons: [],
    };

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function init() {
        console.log("HistoricalMode: Initializing...");

        // Cache DOM elements
        elements.historicalMode = document.getElementById("historical-mode");
        elements.debrisNumber = document.getElementById("debris-number");
        elements.yearLabel = document.getElementById("year-label");
        elements.timeSlider = document.getElementById("time-slider");
        elements.playBtn = document.getElementById("play-btn");
        elements.playIcon = elements.playBtn?.querySelector(".play-icon");
        elements.playText = elements.playBtn?.querySelector(".play-text");
        elements.debrisCountDisplay = document.querySelector(".debris-count .number");
        elements.speedButtons = document.querySelectorAll(".speed-btn");

        // Setup event listeners
        setupEventListeners();

        // Initialize UI
        updateUI();

        console.log("HistoricalMode: Initialized");
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    function setupEventListeners() {
        // Slider manual control
        if (elements.timeSlider) {
            elements.timeSlider.addEventListener("input", onSliderChange);
        }

        // Play/Pause button
        if (elements.playBtn) {
            elements.playBtn.addEventListener("click", togglePlayback);
        }

        // Speed control buttons
        elements.speedButtons.forEach((btn, index) => {
            btn.addEventListener("click", () => setPlaybackSpeed(Math.pow(2, index)));
        });
    }

    // ==========================================
    // SLIDER CONTROL
    // ==========================================
    function onSliderChange(e) {
        if (isPlaying) {
            stopPlayback();
        }
        currentYear = parseInt(e.target.value);
        updateUI();
        updateDebrisVisualization();
    }

    // ==========================================
    // PLAYBACK CONTROL
    // ==========================================
    function togglePlayback() {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    }

    function startPlayback() {
        isPlaying = true;
        elements.playBtn?.classList.add("playing");
        if (elements.playIcon) elements.playIcon.textContent = "⏸";
        if (elements.playText) elements.playText.textContent = "PAUSE";

        // Calculate interval based on speed (45 years in ~15-30 seconds)
        const baseInterval = 333; // ~3 years per second at 1x
        const interval = baseInterval / playbackSpeed;

        animationInterval = setInterval(() => {
            currentYear++;

            if (currentYear > 2025) {
                currentYear = 2025;
                stopPlayback();
                transitionToLiveMode();
                return;
            }

            updateUI();
            updateDebrisVisualization();
        }, interval);

        console.log(`HistoricalMode: Playback started at ${playbackSpeed}x speed`);
    }

    function stopPlayback() {
        isPlaying = false;
        elements.playBtn?.classList.remove("playing");
        if (elements.playIcon) elements.playIcon.textContent = "▶";
        if (elements.playText) elements.playText.textContent = "PLAY TIMELINE";

        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }

        console.log("HistoricalMode: Playback stopped");
    }

    function setPlaybackSpeed(speed) {
        playbackSpeed = speed;

        // Update UI
        elements.speedButtons.forEach((btn) => btn.classList.remove("active"));
        const activeIndex = Math.log2(speed);
        elements.speedButtons[activeIndex]?.classList.add("active");

        // Restart playback if playing
        if (isPlaying) {
            stopPlayback();
            startPlayback();
        }

        console.log(`HistoricalMode: Speed set to ${speed}x`);
    }

    // ==========================================
    // UI UPDATES
    // ==========================================
    function updateUI() {
        // Update debris count based on real NASA data
        debrisCount = calculateDebrisCount(currentYear);

        // Update center debris number display
        if (elements.debrisNumber) {
            elements.debrisNumber.textContent = debrisCount.toLocaleString();

            // Update color based on count severity
            elements.debrisNumber.classList.remove("low", "medium", "high", "critical");
            if (debrisCount < 8000) {
                elements.debrisNumber.classList.add("low");
            } else if (debrisCount < 15000) {
                elements.debrisNumber.classList.add("medium");
            } else if (debrisCount < 25000) {
                elements.debrisNumber.classList.add("high");
            } else {
                elements.debrisNumber.classList.add("critical");
            }
        }

        // Update year label
        if (elements.yearLabel) {
            elements.yearLabel.textContent = `Year: ${currentYear}`;
        }

        // Update slider
        if (elements.timeSlider) {
            elements.timeSlider.value = currentYear;
        }

        // Update bottom debris count display
        if (elements.debrisCountDisplay) {
            elements.debrisCountDisplay.textContent = debrisCount.toLocaleString();
        }
    }

    // ==========================================
    // DEBRIS CALCULATION (Based on Real NASA Data)
    // ==========================================
    function calculateDebrisCount(year) {
        // Real-world NASA data points for tracked objects
        const dataPoints = {
            1980: 5000,
            1985: 6500,
            1990: 8000,
            1995: 9200,
            2000: 10500,
            2005: 13000,
            2007: 15000, // Chinese ASAT test spike
            2009: 19000, // Iridium-Cosmos collision
            2010: 20000,
            2015: 23000,
            2020: 28000,
            2025: 36000,
        };

        // Find the two closest data points for interpolation
        const years = Object.keys(dataPoints)
            .map(Number)
            .sort((a, b) => a - b);

        // If exact match, return it
        if (dataPoints[year]) {
            return dataPoints[year];
        }

        // Find bounding years for interpolation
        let lowerYear = 1980;
        let upperYear = 2025;

        for (let i = 0; i < years.length - 1; i++) {
            if (year >= years[i] && year <= years[i + 1]) {
                lowerYear = years[i];
                upperYear = years[i + 1];
                break;
            }
        }

        // Linear interpolation between data points
        const lowerCount = dataPoints[lowerYear];
        const upperCount = dataPoints[upperYear];
        const yearRange = upperYear - lowerYear;
        const countRange = upperCount - lowerCount;
        const yearProgress = (year - lowerYear) / yearRange;

        return Math.floor(lowerCount + countRange * yearProgress);
    }

    // ==========================================
    // DEBRIS VISUALIZATION UPDATE
    // ==========================================
    function updateDebrisVisualization() {
        // This will communicate with the 3D scene manager
        // For now, we'll use a simple event-based approach
        const event = new CustomEvent("historicalYearChange", {
            detail: {
                year: currentYear,
                debrisCount: debrisCount,
            },
        });
        window.dispatchEvent(event);

        console.log(
            `HistoricalMode: Year ${currentYear}, Debris: ${debrisCount.toLocaleString()}`
        );
    }

    // ==========================================
    // TRANSITION TO LIVE MODE
    // ==========================================
    function transitionToLiveMode() {
        console.log("HistoricalMode: Transitioning to Live Mode...");

        // Stop any ongoing animation
        stopPlayback();

        // Fade out historical mode
        elements.historicalMode?.classList.add("fade-out");

        // Wait for fade animation
        setTimeout(() => {
            // Hide historical mode
            if (elements.historicalMode) {
                elements.historicalMode.style.display = "none";
            }

            // Show header
            const header = document.getElementById("mission-header");
            if (header) {
                header.classList.add("active");
            }

            // Restore overlay padding for Stage 2 (so header doesn't overlap)
            const overlay = document.getElementById("overlay");
            if (overlay) {
                overlay.style.paddingTop = "88px";
            }

            // Show TLE input section
            const tleSection = document.getElementById("tle-input-section");
            if (tleSection) {
                tleSection.classList.remove("hidden");
                tleSection.style.display = "block"; // Override inline style
                // Small delay for smooth transition
                setTimeout(() => {
                    tleSection.classList.add("active");
                }, 50);
            }

            // Clean up historical debris
            if (window.HistoricalDebris) {
                window.HistoricalDebris.cleanup();
            }

            // Trigger transition animation
            const event = new CustomEvent("transitionToLiveMode");
            window.dispatchEvent(event);

            console.log("HistoricalMode: Transition complete - TLE section visible");
        }, 1000);
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        init: init,
        startPlayback: startPlayback,
        stopPlayback: stopPlayback,
        transitionToLiveMode: transitionToLiveMode,
        getCurrentYear: () => currentYear,
        getDebrisCount: () => debrisCount,
        isPlaying: () => isPlaying,
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        HistoricalMode.init();
    });
} else {
    HistoricalMode.init();
}

// Export for use in other modules
window.HistoricalMode = HistoricalMode;
console.log("HistoricalMode module loaded");

