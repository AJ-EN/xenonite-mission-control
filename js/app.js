const App = (function () {
    'use strict';

    // ==========================================
    // GLOBAL STATE
    // ==========================================

    // Data storage
    let tleData = null;               // Loaded TLE data {active, debris, critical}
    let isRunning = false;            // Animation loop control
    let isInitialized = false;        // System initialization flag

    // Time management
    let currentDate = new Date();     // Simulation time
    let lastUpdateTime = Date.now();  // For delta calculations
    let timeMultiplier = 1.0;         // Time acceleration (1.0 = real-time)

    // Update throttling counters
    let frameCount = 0;
    let lastDebrisUpdate = 0;
    let lastActiveSatUpdate = 0;
    let lastCTSUpdate = 0;
    let lastUIUpdate = 0;

    // Throttle intervals (milliseconds)
    const DEBRIS_UPDATE_INTERVAL = 100;    // 10 FPS
    const ACTIVE_SAT_INTERVAL = 500;       // 2 FPS
    const CTS_UPDATE_INTERVAL = 100;       // 10 FPS
    const UI_UPDATE_INTERVAL = 100;        // 10 FPS

    // ==========================================
    // UTILITY: DEBOUNCE FUNCTION
    // ==========================================
    /**
     * Debounces a function call
     * @param {Function} func - Function to debounce2
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ==========================================
    // 1. INIT FUNCTION (ENTRY POINT)
    // ==========================================
    /**
     * Initializes the application
     * @returns {boolean} Success/failure
     */
    function init() {
        console.log('═══════════════════════════════════════');
        console.log('   XENONITE MISSION CONTROL');
        console.log('   NASA Space Apps Challenge 2025');
        console.log('═══════════════════════════════════════');
        console.log('App: Initializing system...');

        try {
            // Show loading overlay
            if (window.UIController && UIController.showLoading) {
                UIController.showLoading('Initializing systems...');
            }

            // Step 1: Initialize Scene Manager
            console.log('App: [1/5] Initializing 3D scene...');
            const sceneInit = SceneManager.init();

            if (!sceneInit) {
                console.error('App: Failed to initialize scene');
                if (window.UIController) {
                    UIController.hideLoading();
                    UIController.showError('Failed to initialize 3D scene. Check console for details.');
                }
                return false;
            }

            SceneManager.addLights();
            SceneManager.addEarth();
            SceneManager.addSkybox();
            SceneManager.addCameraControls();

            // Initialize historical debris system
            if (window.HistoricalDebris) {
                const scene = SceneManager.getScene();
                HistoricalDebris.init(scene);
                console.log('App: Historical debris system initialized');
            }

            console.log('App: [2/5] Loading satellite data...');

            // Step 2: Load TLE data
            DataLoader.loadAllData((error, data) => {
                try {
                    if (error) {
                        console.error('App: Failed to load TLE data', error);
                        if (window.UIController) {
                            UIController.hideLoading();
                            UIController.showError('Failed to load satellite database');
                            UIController.showToast('Network error - Could not load satellite data', 'error', 5000);
                        }
                        return;
                    }

                    tleData = data;
                    console.log('App: [3/5] TLE data loaded successfully');

                    // Step 3: Initialize Orbital Propagator
                    console.log('App: [4/5] Initializing orbital mechanics...');
                    const counts = OrbitalPropagator.initSatellites(tleData);

                    // Step 4: Initialize UI Controller
                    console.log('App: [5/5] Initializing UI controller...');
                    UIController.init();

                    // Step 5: Initial scene population (background satellites)
                    populateBackgroundSatellites();

                    // Step 6: Start animation loop
                    isInitialized = true;
                    startAnimationLoop();

                    // Hide loading overlay
                    if (window.UIController && UIController.hideLoading) {
                        UIController.hideLoading();
                    }

                    console.log('═══════════════════════════════════════');
                    console.log('   SYSTEM READY');
                    console.log('   Tracking: ' + counts.active.toLocaleString() + ' active satellites');
                    console.log('   Monitoring: ' + counts.debris.toLocaleString() + ' debris objects');
                    console.log('   Critical: ' + counts.critical.toLocaleString() + ' critical objects');
                    console.log('═══════════════════════════════════════');

                    if (UIController.addLogEntry) {
                        UIController.addLogEntry('System initialized - Ready for mission');
                    }

                } catch (innerError) {
                    console.error('App: Error during initialization callback', innerError);
                    if (window.UIController) {
                        UIController.hideLoading();
                        UIController.showError('Initialization error: ' + innerError.message);
                    }
                }
            });

            // Window resize handler (debounced for performance)
            window.addEventListener('resize', debounce(() => {
                try {
                    SceneManager.onWindowResize();
                } catch (error) {
                    console.error('App: Error handling window resize', error);
                }
            }, 250));

            return true;

        } catch (error) {
            console.error('App: Critical error during initialization', error);
            if (window.UIController) {
                UIController.hideLoading();
                UIController.showError('Critical initialization error. Please refresh the page.');
            }
            return false;
        }
    }

    // ==========================================
    // 2. POPULATE BACKGROUND SATELLITES
    // ==========================================
    /**
     * Populates scene with background satellites (visual context)
     */
    function populateBackgroundSatellites() {
        try {
            console.log('App: Populating background satellites...');

            const positions = OrbitalPropagator.getActiveSatellitePositions(currentDate);

            if (positions && positions.length > 0) {
                SceneManager.updateActiveSatellites(positions);
                console.log(`App: Added ${positions.length} active satellites to scene`);
            }
        } catch (error) {
            console.error('App: Error populating background satellites', error);
            // Continue anyway - this is not critical
        }
    }

    // ==========================================
    // 3. INITIALIZE PLAYER SATELLITE
    // ==========================================
    /**
     * Initializes player's satellite from validated TLE
     * @param {Object} tle - Validated TLE object {name, tle1, tle2}
     * @returns {boolean} Success/failure
     */
    function initializePlayerSatellite(tle) {
        try {
            console.log(`App: Initializing player satellite: ${tle.name}`);

            // Initialize in orbital propagator
            const success = OrbitalPropagator.initPlayerSatellite(tle);

            if (!success) {
                console.error('App: Failed to initialize player satellite');
                UIController.showError('Failed to initialize satellite tracking');
                UIController.showToast('Invalid satellite TLE data', 'error');
                return false;
            }

            // Get initial position
            const position = OrbitalPropagator.getPlayerPosition(currentDate);

            if (position) {
                SceneManager.updatePlayerSatellite(position);
                console.log('App: Player satellite positioned in scene');
            } else {
                console.warn('App: Could not get initial player position');
            }

            // Get orbital parameters
            const params = OrbitalPropagator.getPlayerOrbitalParams(currentDate);

            if (params) {
                UIController.updateAssetInfo(tle.name, params);
                console.log('App: Asset info updated');
            }

            // *** SHOW BUSINESS MODEL PANEL ***
            // This displays the Circular Economy Model when satellite is initialized
            if (UIController.showBusinessPanel) {
                UIController.showBusinessPanel();
                console.log('App: Business model panel displayed');
            }

            // Load and display debris
            const debrisPositions = OrbitalPropagator.getDebrisPositions(currentDate);
            if (debrisPositions && debrisPositions.length > 0) {
                SceneManager.updateDebris(debrisPositions);
                console.log(`App: Loaded ${debrisPositions.length} debris objects`);
            }

            // Start real-time updates
            isRunning = true;

            if (params) {
                UIController.addLogEntry(`Tracking ${tle.name} - Altitude: ${params.altitude} km`);
                UIController.showToast(`Now tracking ${tle.name}`, 'success');
            }

            return true;

        } catch (error) {
            console.error('App: Error initializing player satellite', error);
            UIController.showError('Error initializing satellite: ' + error.message);
            return false;
        }
    }

    // ==========================================
    // 4. START ANIMATION LOOP
    // ==========================================
    /**
     * Starts the main animation loop
     */
    function startAnimationLoop() {
        console.log('App: Starting animation loop');
        lastUpdateTime = Date.now();
        animate();
    }

    // ==========================================
    // 5. ANIMATE FUNCTION (MAIN LOOP)
    // ==========================================
    /**
     * Main animation loop - runs at 60 FPS
     */
    function animate() {
        // Request next frame
        requestAnimationFrame(animate);

        try {
            // Calculate time delta
            const now = Date.now();
            const deltaTime = (now - lastUpdateTime) / 1000; // Convert to seconds
            lastUpdateTime = now;

            // Update simulation time
            currentDate = new Date(currentDate.getTime() + deltaTime * 1000 * timeMultiplier);

            frameCount++;

            // ===== PLAYER UPDATES (Every Frame) =====
            if (isRunning) {
                updatePlayer();
            }

            // ===== DEBRIS UPDATES (Throttled) =====
            if (isRunning && now - lastDebrisUpdate > DEBRIS_UPDATE_INTERVAL) {
                updateDebris();
                lastDebrisUpdate = now;
            }

            // ===== ACTIVE SATELLITES UPDATES (Throttled) =====
            if (now - lastActiveSatUpdate > ACTIVE_SAT_INTERVAL) {
                updateActiveSatellites();
                lastActiveSatUpdate = now;
            }

            // ===== CTS CALCULATION (Throttled) =====
            if (isRunning && now - lastCTSUpdate > CTS_UPDATE_INTERVAL) {
                updateCTSScore();
                lastCTSUpdate = now;
            }

            // ===== UI UPDATES (Throttled) =====
            if (isRunning && now - lastUIUpdate > UI_UPDATE_INTERVAL) {
                updateUI();
                lastUIUpdate = now;
            }

            // ===== ANIMATE HISTORICAL DEBRIS (If active) =====
            if (window.HistoricalDebris) {
                HistoricalDebris.animate();
            }

            // ===== RENDER SCENE (Every Frame) =====
            SceneManager.render();

        } catch (error) {
            // Don't log every frame to avoid console spam
            if (frameCount % 60 === 0) {
                console.error('App: Error in animation loop', error);
            }
        }
    }

    // ==========================================
    // 6. UPDATE PLAYER FUNCTION
    // ==========================================
    /**
     * Updates player satellite position (every frame for smooth movement)
     */
    function updatePlayer() {
        try {
            const position = OrbitalPropagator.getPlayerPosition(currentDate);

            // Validate position before updating
            if (position && typeof position.x === 'number' && !isNaN(position.x)) {
                SceneManager.updatePlayerSatellite(position);
            }
        } catch (error) {
            // Silently fail - not critical for each frame
        }
    }

    // ==========================================
    // 7. UPDATE DEBRIS FUNCTION
    // ==========================================
    /**
     * Updates debris positions (throttled to 10 FPS)
     */
    function updateDebris() {
        try {
            const debrisPositions = OrbitalPropagator.getDebrisPositions(currentDate);

            if (debrisPositions && debrisPositions.length > 0) {
                SceneManager.updateDebris(debrisPositions);
            }
        } catch (error) {
            console.warn('App: Error updating debris', error);
        }
    }

    // ==========================================
    // 8. UPDATE ACTIVE SATELLITES FUNCTION
    // ==========================================
    /**
     * Updates active satellite positions (throttled to 2 FPS)
     */
    function updateActiveSatellites() {
        try {
            const positions = OrbitalPropagator.getActiveSatellitePositions(currentDate);

            if (positions && positions.length > 0) {
                SceneManager.updateActiveSatellites(positions);
            }
        } catch (error) {
            console.warn('App: Error updating active satellites', error);
        }
    }

    // ==========================================
    // 9. UPDATE CTS SCORE FUNCTION
    // ==========================================
    /**
     * Calculates and updates collision threat score (throttled to 10 FPS)
     */
    function updateCTSScore() {
        try {
            const playerPosition = OrbitalPropagator.getPlayerPosition(currentDate);
            const debrisPositions = OrbitalPropagator.getDebrisPositions(currentDate);

            if (playerPosition && debrisPositions && debrisPositions.length > 0) {
                CTSEngine.calculateScore(playerPosition, debrisPositions);
            }
        } catch (error) {
            console.warn('App: Error calculating CTS score', error);
        }
    }

    // ==========================================
    // 10. UPDATE UI FUNCTION
    // ==========================================
    /**
     * Updates UI elements (throttled to 10 FPS)
     */
    function updateUI() {
        try {
            // Get current CTS score from history
            const stats = CTSEngine.getStatistics();
            if (stats && typeof stats.current === 'number') {
                UIController.updateCTSDisplay(stats.current);
            }

            // Update orbital parameters
            const params = OrbitalPropagator.getPlayerOrbitalParams(currentDate);
            const playerSat = OrbitalPropagator.getPlayerSatellite();
            if (params && playerSat) {
                UIController.updateAssetInfo(playerSat.name, params);
            }

            // Relationships: connect player to nearest threats (focus on relationships)
            const playerPos = OrbitalPropagator.getPlayerPosition(currentDate);
            if (playerPos) {
                const debrisData = OrbitalPropagator.getDebrisWithDistances(currentDate);
                // Emphasize only nearby objects (<= 100 km)
                const targets = debrisData
                    .filter(d => d.distance <= 100)
                    .slice(0, 3)
                    .map(d => d.position);
                SceneManager.updateRelationships(playerPos, targets);
            }
        } catch (error) {
            console.warn('App: Error updating UI', error);
        }
    }

    // ==========================================
    // 11. SWITCH TO CRITICAL DEBRIS (DEMO)
    // ==========================================
    /**
     * Switches to critical debris scenario for demo
     */
    function switchToCriticalDebris() {
        try {
            console.log('App: Switching to CRITICAL DEBRIS scenario');

            // Get critical debris positions
            const criticalPositions = OrbitalPropagator.getCriticalDebrisPositions(currentDate);

            if (criticalPositions && criticalPositions.length > 0) {
                // Update scene with only critical debris
                SceneManager.updateDebris(criticalPositions);

                // Highlight all critical debris
                const indices = criticalPositions.map((_, i) => i);
                SceneManager.highlightCriticalDebris(indices);

                UIController.addLogEntry(
                    `⚠ CRITICAL DEBRIS FIELD DETECTED - ${criticalPositions.length} high-threat objects`,
                    'critical'
                );

                console.log(`App: Switched to ${criticalPositions.length} critical debris objects`);
            } else {
                console.warn('App: No critical debris available');
                UIController.addLogEntry('Warning: No critical debris data available', 'warning');
            }
        } catch (error) {
            console.error('App: Error switching to critical debris', error);
            UIController.showToast('Error loading critical debris scenario', 'error');
        }
    }

    // ==========================================
    // 12. RESET TO NOMINAL FUNCTION
    // ==========================================
    /**
     * Resets system to nominal state
     */
    function resetToNominal() {
        try {
            console.log('App: Resetting to nominal state');

            // Clear CTS force score
            CTSEngine.setForceScore(null);

            // Reload full debris dataset
            const debrisPositions = OrbitalPropagator.getDebrisPositions(currentDate);
            if (debrisPositions) {
                SceneManager.updateDebris(debrisPositions);
            }

            // Reset UI
            UIController.hideActionPanel();
            UIController.addLogEntry('System reset to nominal operations');
            UIController.showToast('System reset to nominal', 'success');

            console.log('App: Reset complete');
        } catch (error) {
            console.error('App: Error resetting to nominal', error);
        }
    }

    // ==========================================
    // 13. SET TIME MULTIPLIER FUNCTION
    // ==========================================
    /**
     * Sets time acceleration multiplier
     * @param {number} multiplier - Time multiplier (1.0 = real-time, 10.0 = 10x speed)
     */
    function setTimeMultiplier(multiplier) {
        try {
            timeMultiplier = Math.max(0.1, Math.min(multiplier, 100.0));
            console.log(`App: Time multiplier set to ${timeMultiplier}x`);
            UIController.addLogEntry(`Time acceleration: ${timeMultiplier}x`);
            UIController.showToast(`Time: ${timeMultiplier}x speed`, 'info', 2000);
        } catch (error) {
            console.error('App: Error setting time multiplier', error);
        }
    }

    // ==========================================
    // 14. PAUSE/RESUME FUNCTIONS
    // ==========================================
    /**
     * Pauses simulation updates
     */
    function pause() {
        isRunning = false;
        UIController.addLogEntry('Simulation paused');
        UIController.showToast('Simulation paused', 'info', 2000);
        console.log('App: Simulation paused');
    }

    /**
     * Resumes simulation updates
     */
    function resume() {
        isRunning = true;
        UIController.addLogEntry('Simulation resumed');
        UIController.showToast('Simulation resumed', 'success', 2000);
        console.log('App: Simulation resumed');
    }

    // ==========================================
    // 15. GET STATISTICS FUNCTION
    // ==========================================
    /**
     * Returns current application statistics
     * @returns {Object} Statistics object
     */
    function getStatistics() {
        try {
            return {
                isRunning: isRunning,
                isInitialized: isInitialized,
                currentDate: currentDate.toISOString(),
                frameCount: frameCount,
                timeMultiplier: timeMultiplier,
                activeSatellites: OrbitalPropagator.getActiveSatellites().length,
                debrisObjects: OrbitalPropagator.getDebrisSatellites().length,
                criticalObjects: OrbitalPropagator.getCriticalSatellites().length,
                ctsStats: CTSEngine.getStatistics()
            };
        } catch (error) {
            console.error('App: Error getting statistics', error);
            return {
                isRunning: isRunning,
                isInitialized: isInitialized,
                error: error.message
            };
        }
    }

    // ==========================================
    // 16. ERROR HANDLER
    // ==========================================
    /**
     * Handles application errors
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     */
    function handleError(error, context) {
        console.error(`App: Error in ${context}`, error);
        if (UIController && UIController.addLogEntry) {
            UIController.addLogEntry(`Error in ${context}: ${error.message}`, 'critical');
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        // Initialization
        init: init,

        // Player satellite
        initializePlayerSatellite: initializePlayerSatellite,

        // Demo triggers
        switchToCriticalDebris: switchToCriticalDebris,
        resetToNominal: resetToNominal,

        // Simulation controls
        pause: pause,
        resume: resume,
        setTimeMultiplier: setTimeMultiplier,

        // Statistics
        getStatistics: getStatistics,

        // Error handling
        handleError: handleError,

        // State getters
        isRunning: function () { return isRunning; },
        isInitialized: function () { return isInitialized; },
        getCurrentDate: function () { return currentDate; },
        getFrameCount: function () { return frameCount; }
    };
})();

// ==========================================
// GLOBAL ERROR HANDLERS
// ==========================================

// Handle uncaught errors
window.addEventListener('error', function (event) {
    console.error('Global error caught:', event.error);

    if (window.UIController && UIController.showToast) {
        UIController.showToast('An error occurred. Check console for details.', 'error', 5000);
    }

    // Don't prevent default - let browser handle it
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);

    if (window.UIController && UIController.showToast) {
        UIController.showToast('Network or async error occurred.', 'error', 5000);
    }

    // Prevent default to avoid console spam
    event.preventDefault();
});

// ==========================================
// AUTO-INITIALIZE ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded - Starting application...');

    // Small delay to ensure all modules are loaded
    setTimeout(() => {
        try {
            App.init();
        } catch (error) {
            console.error('Critical error starting application:', error);
            alert('Failed to start application. Please refresh the page and check console for errors.');
        }
    }, 100);
});

// Make available globally
window.App = App;

console.log('App module loaded - Waiting for DOM ready...');