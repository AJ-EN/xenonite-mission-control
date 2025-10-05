// ============================================
// UI CONTROLLER MODULE
// Handles DOM manipulation and user interaction
// ============================================

const UIController = (function () {
    'use strict';

    // ==========================================
    // DOM ELEMENT CACHE
    // ==========================================
    let elements = {};
    let assetState = {
        fuel: 100,
        life: 100,
        status: 'Nominal',
        mitigationPending: false,
        salvageListed: false
    };

    // Configuration
    const MAX_LOG_ENTRIES = 50;
    let lastSparklineUpdate = 0;
    const SPARKLINE_THROTTLE = 100; // ms between sparkline updates

    // ==========================================
    // 1. INIT FUNCTION
    // ==========================================
    /**
     * Initializes UI Controller and caches DOM elements
     * @returns {boolean} Success/failure
     */
    function init() {
        console.log('UIController: Initializing...');

        try {
            // Cache all DOM elements
            cacheElements();

            // Attach event listeners
            attachEventListeners();

            // Set initial UI state
            setInitialState();

            console.log('UIController: Initialization complete');
            return true;

        } catch (error) {
            console.error('UIController: Initialization failed', error);
            return false;
        }
    }

    // ==========================================
    // 2. CACHE ELEMENTS FUNCTION
    // ==========================================
    /**
     * Caches references to all DOM elements
     */
    function cacheElements() {
        console.log('UIController: Caching DOM elements...');

        // Asset extra fields
        elements.satFuel = document.getElementById('sat-fuel');
        elements.satLife = document.getElementById('sat-life');
        elements.satStatus = document.getElementById('sat-status');
        elements.changeAssetBtn = document.getElementById('change-asset-btn');
        elements.toggleFollowBtn = document.getElementById('toggle-follow-btn');

        // TLE Input Section
        elements.tleInputSection = document.getElementById('tle-input-section');
        elements.tleInput = document.getElementById('tle-input');
        elements.initBtn = document.getElementById('init-btn');
        elements.loadingAnimation = document.getElementById('loading-animation');

        // Scenario buttons
        elements.scenarioBtns = document.querySelectorAll('.scenario-btn');

        // Dashboard
        elements.dashboard = document.getElementById('dashboard');

        // CTS Panel
        elements.ctsScore = document.getElementById('cts-score');
        elements.ctsStatus = document.getElementById('cts-status');
        elements.ctsSparkline = document.getElementById('cts-sparkline');

        // Asset Panel
        elements.satName = document.getElementById('sat-name');
        elements.satAltitude = document.getElementById('sat-altitude');
        elements.satVelocity = document.getElementById('sat-velocity');
        elements.satInclination = document.getElementById('sat-inclination');

        // Action Panel
        elements.actionPanel = document.getElementById('action-panel');
        elements.threatDescription = document.getElementById('threat-description');
        elements.actionButtons = document.querySelectorAll('.action-btn');

        // Threat Log
        elements.logEntries = document.getElementById('log-entries');

        // Business Panel
        elements.businessPanel = document.getElementById('business-panel');

        console.log('UIController: DOM elements cached');
    }

    // ==========================================
    // 3. ATTACH EVENT LISTENERS FUNCTION
    // ==========================================
    /**
     * Attaches event listeners to UI elements
     */
    function attachEventListeners() {
        console.log('UIController: Attaching event listeners...');

        // Initialize button
        if (elements.initBtn) {
            elements.initBtn.addEventListener('click', validateAndStart);
        }

        // Scenario buttons
        elements.scenarioBtns.forEach(btn => {
            btn.addEventListener('click', handleScenarioClick);
        });

        // Action buttons
        elements.actionButtons.forEach(btn => {
            btn.addEventListener('click', handleActionChoice);
        });

        // Header: Change Asset (return to setup)
        if (elements.changeAssetBtn) {
            elements.changeAssetBtn.addEventListener('click', returnToSetup);
        }

        // Header: Toggle camera follow
        if (elements.toggleFollowBtn) {
            elements.toggleFollowBtn.addEventListener('click', toggleCameraFollow);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);

        console.log('UIController: Event listeners attached');
    }

    // ==========================================
    // 4. SET INITIAL STATE FUNCTION
    // ==========================================
    /**
     * Sets initial UI state
     */
    function setInitialState() {
        // TLE input section visible
        if (elements.tleInputSection) {
            elements.tleInputSection.classList.add('active');
            elements.tleInputSection.classList.remove('hidden');
        }

        // Dashboard hidden
        if (elements.dashboard) {
            elements.dashboard.classList.add('hidden');
        }

        // Business panel hidden
        if (elements.businessPanel) {
            elements.businessPanel.classList.add('hidden');
        }

        // Action panel hidden
        if (elements.actionPanel) {
            elements.actionPanel.classList.add('hidden');
        }

        // Loading animation hidden
        if (elements.loadingAnimation) {
            elements.loadingAnimation.classList.add('hidden');
        }
        // Hide Change Asset while on setup
        if (elements.changeAssetBtn) {
            elements.changeAssetBtn.classList.add('hidden');
        }

        // Initialize asset fields
        updateAssetState();

        console.log('UIController: Initial state set');
    }

    // ==========================================
    // 5. HANDLE SCENARIO CLICK FUNCTION
    // ==========================================
    /**
     * Handles scenario button clicks
     */
    function handleScenarioClick(event) {
        const btn = event.currentTarget;
        const scenario = btn.dataset.scenario;

        console.log(`UIController: Scenario selected: ${scenario}`);

        // Remove previous selection
        elements.scenarioBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Get scenario TLE
        const tleText = DataLoader.getScenario(scenario);

        if (tleText) {
            elements.tleInput.value = tleText;
        } else {
            // Handle file-based scenarios
            if (scenario === 'cosmos') {
                // Load first critical debris
                DataLoader.loadTLEFile('data/cosmos-critical.txt', (error, satellites) => {
                    if (!error && satellites.length > 0) {
                        const tle = satellites[0];
                        elements.tleInput.value = `${tle.name}\n${tle.tle1}\n${tle.tle2}`;
                    } else {
                        showError('Failed to load Cosmos scenario');
                    }
                });
            } else if (scenario === 'debris') {
                // Load first debris object
                DataLoader.loadTLEFile('data/debris.txt', (error, satellites) => {
                    if (!error && satellites.length > 0) {
                        const tle = satellites[0];
                        elements.tleInput.value = `${tle.name}\n${tle.tle1}\n${tle.tle2}`;
                    } else {
                        showError('Failed to load debris scenario');
                    }
                });
            }
        }
    }

    // ==========================================
    // 6. VALIDATE AND START FUNCTION
    // ==========================================
    /**
     * Validates TLE input and starts analysis
     */
    function validateAndStart() {
        console.log('UIController: Validating TLE input...');

        // CHECK IF APP IS INITIALIZED
        if (!window.App || !App.isInitialized()) {
            showError('System still loading, please wait...');
            return;
        }

        const inputText = elements.tleInput.value;

        // Validate TLE
        const validation = DataLoader.validateTLEInput(inputText);

        if (!validation.valid) {
            // Show error
            showError(validation.error);
            console.warn('UIController: TLE validation failed:', validation.error);
            return;
        }

        console.log('UIController: TLE validation successful');

        // Show loading animation
        elements.loadingAnimation.classList.remove('hidden');
        elements.initBtn.disabled = true;

        // Hide error if present
        hideError();

        // Simulate analysis delay (2 seconds)
        setTimeout(() => {
            // Hide TLE input section
            elements.tleInputSection.classList.add('hidden');
            elements.tleInputSection.classList.remove('active');

            // Show dashboard
            showDashboard();

            // Initialize player satellite (call to app.js)
            if (window.App && window.App.initializePlayerSatellite) {
                window.App.initializePlayerSatellite(validation.satellite);
            }

            // Add log entry
            addLogEntry(`Tracking initialized: ${validation.satellite.name}`);

        }, 2000);
    }

    // ==========================================
    // 7. SHOW/HIDE ERROR FUNCTIONS
    // ==========================================
    /**
     * Shows error message
     */
    function showError(message) {
        // Check if error element exists, create if not
        let errorEl = document.getElementById('tle-error');

        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'tle-error';
            errorEl.style.cssText = `
          color: #ff0055;
          font-size: 12px;
          margin-top: 8px;
          padding: 8px;
          background: rgba(255, 0, 85, 0.1);
          border: 1px solid #ff0055;
          border-radius: 4px;
        `;
            elements.tleInput.parentNode.insertBefore(errorEl, elements.tleInput.nextSibling);
        }

        errorEl.textContent = `⚠ ${message}`;
        errorEl.style.display = 'block';
    }

    /**
     * Hides error message
     */
    function hideError() {
        const errorEl = document.getElementById('tle-error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    // ==========================================
    // 8. SHOW DASHBOARD FUNCTION
    // ==========================================
    /**
     * Shows the dashboard
     */
    function showDashboard() {
        elements.dashboard.classList.remove('hidden');
        elements.businessPanel.classList.remove('hidden');
        // Show header actions when dashboard is visible
        if (elements.changeAssetBtn) {
            elements.changeAssetBtn.classList.remove('hidden');
        }
        if (elements.toggleFollowBtn) {
            elements.toggleFollowBtn.classList.remove('hidden');
        }

        addLogEntry('Mission control dashboard activated');
        console.log('UIController: Dashboard shown');
    }

    // ==========================================
    // 9. UPDATE CTS DISPLAY FUNCTION
    // ==========================================
    /**
     * Updates CTS panel display
     * @param {number} score - Threat score (0-100)
     */
    function updateCTSDisplay(score) {
        if (!elements.ctsScore) return;

        // If asset is listed for salvage, disengage CTS and hide panel
        if (assetState.salvageListed) {
            elements.ctsScore.textContent = '0';
            if (elements.ctsStatus) {
                elements.ctsStatus.textContent = 'STATUS: DISENGAGED';
            }
            elements.ctsScore.className = 'nominal';
            hideActionPanel();
            return;
        }

        // Update score number
        elements.ctsScore.textContent = Math.round(score);

        // Get status and color
        const status = CTSEngine.getScoreStatus(score);
        const colorClass = CTSEngine.getScoreColor(score);

        // Update status text
        if (elements.ctsStatus) {
            elements.ctsStatus.textContent = `STATUS: ${status}`;
        }

        // Update color classes
        elements.ctsScore.className = colorClass;

        // Update sparkline (throttled)
        const now = Date.now();
        if (now - lastSparklineUpdate > SPARKLINE_THROTTLE) {
            drawSparkline();
            lastSparklineUpdate = now;
        }

        // Show/hide action panel based on score
        if (score >= 70) {
            showActionPanel(score);
        } else {
            hideActionPanel();
        }
    }

    // ==========================================
    // 10. DRAW SPARKLINE FUNCTION
    // ==========================================
    /**
     * Draws CTS sparkline
     */
    function drawSparkline() {
        if (!elements.ctsSparkline) return;

        const history = CTSEngine.getHistory();
        CTSEngine.drawSparkline(elements.ctsSparkline, history);
    }

    // ==========================================
    // 11. UPDATE ASSET INFO FUNCTION
    // ==========================================
    /**
     * Updates asset information panel
     * @param {string} name - Satellite name
     * @param {Object} params - Orbital parameters {altitude, velocity, inclination}
     */
    function updateAssetInfo(name, params) {
        if (elements.satName) {
            elements.satName.textContent = name;
        }

        if (params) {
            if (elements.satAltitude) {
                elements.satAltitude.textContent = params.altitude;
            }

            if (elements.satVelocity) {
                elements.satVelocity.textContent = params.velocity;
            }

            if (elements.satInclination) {
                elements.satInclination.textContent = params.inclination;
            }
        }
    }

    // ==========================================
    // UPDATE ASSET STATE (Fuel/Life/Status)
    // ==========================================
    function updateAssetState(changes = {}) {
        assetState = { ...assetState, ...changes };

        if (elements.satFuel && typeof assetState.fuel === 'number') {
            elements.satFuel.textContent = `${Math.max(0, Math.round(assetState.fuel))}%`;
        }
        if (elements.satLife && typeof assetState.life === 'number') {
            elements.satLife.textContent = `${Math.max(0, Math.round(assetState.life))}%`;
        }
        if (elements.satStatus && assetState.status) {
            elements.satStatus.textContent = assetState.status;
        }
    }

    // ==========================================
    // 12. SHOW ACTION PANEL FUNCTION
    // ==========================================
    /**
     * Shows action panel for critical threats
     * @param {number} score - Current threat score
     */
    function showActionPanel(score) {
        if (!elements.actionPanel) return;

        // If asset is listed for salvage, don't show actions
        if (assetState.salvageListed) {
            hideActionPanel();
            return;
        }

        // Only show if currently hidden
        if (elements.actionPanel.classList.contains('hidden')) {
            elements.actionPanel.classList.remove('hidden');

            // Add log entry
            addLogEntry('⚠ CRITICAL THREAT DETECTED - Action required', 'critical');

            console.log('UIController: Action panel shown');
        }

        // Update threat description
        const description = CTSEngine.getThreatDescription();
        if (elements.threatDescription) {
            elements.threatDescription.innerHTML = description;
        }
    }

    // ==========================================
    // 13. HIDE ACTION PANEL FUNCTION
    // ==========================================
    /**
     * Hides action panel
     */
    function hideActionPanel() {
        if (!elements.actionPanel) return;

        if (!elements.actionPanel.classList.contains('hidden')) {
            elements.actionPanel.classList.add('hidden');
            console.log('UIController: Action panel hidden');
        }
    }

    // ==========================================
    // 14. HANDLE ACTION CHOICE FUNCTION
    // ==========================================
    /**
     * Handles action button clicks
     */
    function handleActionChoice(event) {
        const btn = event.currentTarget;
        const action = btn.dataset.action;

        console.log(`UIController: Action selected: ${action}`);

        // Visual feedback
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);

        switch (action) {
            case 'maneuver':
                executeEvasiveManeuver();
                break;
            case 'mitigate':
                contractDebrisMitigation();
                break;
            case 'monetize':
                monetizeAsset();
                break;
        }
    }

    // ==========================================
    // 15. ADD LOG ENTRY FUNCTION
    // ==========================================
    /**
     * Adds entry to threat log
     * @param {string} message - Log message
     * @param {string} type - Entry type (info, warning, critical, action)
     */
    function addLogEntry(message, type = 'info') {
        if (!elements.logEntries) return;

        // Create new list item
        const li = document.createElement('li');

        // Add timestamp
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        li.innerHTML = `<span style="color: #606060;">[${timestamp}]</span> ${message}`;

        // Add type-specific styling
        switch (type) {
            case 'critical':
                li.style.color = '#ff0055';
                li.style.fontWeight = '600';
                break;
            case 'warning':
                li.style.color = '#ff8800';
                break;
            case 'action':
                li.style.color = '#00d4ff';
                li.style.fontWeight = '600';
                break;
            default:
                li.style.color = '#a0a0a0';
        }

        // Prepend (newest first)
        elements.logEntries.insertBefore(li, elements.logEntries.firstChild);

        // Limit to MAX_LOG_ENTRIES
        while (elements.logEntries.children.length > MAX_LOG_ENTRIES) {
            elements.logEntries.removeChild(elements.logEntries.lastChild);
        }
    }

    // ==========================================
    // 16. HANDLE KEYBOARD SHORTCUTS FUNCTION (UPDATED)
    // ==========================================
    function handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + Shift + D: Trigger critical event
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
            event.preventDefault();
            triggerCriticalEvent();
        }

        // Ctrl/Cmd + Shift + R: Reset to nominal
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
            event.preventDefault();
            if (window.App) {
                App.resetToNominal();
                resetToNominal();
            }
        }

        // Escape: Close action panel
        if (event.key === 'Escape') {
            event.preventDefault();
            hideActionPanel();
        }

        // Space: Pause/resume
        if (event.key === ' ' && !event.target.matches('textarea, input')) {
            event.preventDefault();
            if (window.App) {
                const stats = App.getStatistics();
                if (stats.isRunning) {
                    App.pause();
                } else {
                    App.resume();
                }
            }
        }

        // T: Time acceleration (10x)
        if (event.key === 't' || event.key === 'T') {
            if (!event.ctrlKey && !event.metaKey && !event.target.matches('textarea, input')) {
                event.preventDefault();
                if (window.App) {
                    App.setTimeMultiplier(10.0);
                }
            }
        }

        // N: Normal time (1x)
        if (event.key === 'n' || event.key === 'N') {
            if (!event.ctrlKey && !event.metaKey && !event.target.matches('textarea, input')) {
                event.preventDefault();
                if (window.App) {
                    App.setTimeMultiplier(1.0);
                }
            }
        }

        // H: Show help
        if (event.key === 'h' || event.key === 'H') {
            if (!event.ctrlKey && !event.metaKey && !event.target.matches('textarea, input')) {
                event.preventDefault();
                showKeyboardHelp();
            }
        }

        // F: Toggle camera follow
        if (event.key === 'f' || event.key === 'F') {
            if (!event.ctrlKey && !event.metaKey && !event.target.matches('textarea, input')) {
                event.preventDefault();
                toggleCameraFollow();
            }
        }
    }

    // ==========================================
    // 17. TRIGGER CRITICAL EVENT FUNCTION (DEMO)
    // ==========================================
    /**
     * Triggers critical threat scenario for demo
     */
    function triggerCriticalEvent() {
        console.log('UIController: Triggering critical event (DEMO)');

        // Force high threat score
        CTSEngine.setForceScore(95);

        // Update display
        updateCTSDisplay(95);

        // Add dramatic log entry
        addLogEntry('🚨 CRITICAL COLLISION THREAT DETECTED', 'critical');
        addLogEntry('Multiple debris fragments detected at <10km proximity', 'critical');

        // Call app to switch to critical debris if available
        if (window.App && window.App.switchToCriticalDebris) {
            window.App.switchToCriticalDebris();
        }

        console.log('UIController: Critical event triggered');
    }

    // ==========================================
    // 18. RESET TO NOMINAL FUNCTION (DEMO)
    // ==========================================
    /**
     * Resets to nominal state
     */
    function resetToNominal() {
        console.log('UIController: Resetting to nominal');

        // Clear force score
        CTSEngine.setForceScore(null);

        // Hide action panel
        hideActionPanel();

        // Add log entry
        addLogEntry('System reset to nominal operations', 'info');
    }

    // ==========================================
    // 19. SHOW KEYBOARD HELP FUNCTION
    // ==========================================
    /**
     * Toggle camera follow mode
     */
    function toggleCameraFollow() {
        if (window.SceneManager && SceneManager.toggleAutoFollow) {
            const isFollowing = SceneManager.toggleAutoFollow();

            // Update button text
            if (elements.toggleFollowBtn) {
                const followText = elements.toggleFollowBtn.querySelector('.follow-text');
                if (followText) {
                    followText.textContent = isFollowing ? 'Follow: ON' : 'Follow: OFF';
                }

                // Visual feedback
                elements.toggleFollowBtn.style.borderColor = isFollowing ? '#00ff88' : '#ff8800';
            }

            // Show toast
            showToast(
                isFollowing ? 'Camera following satellite' : 'Camera follow disabled',
                isFollowing ? 'success' : 'info',
                2000
            );

            addLogEntry(
                isFollowing ? 'Camera auto-follow ENABLED' : 'Camera auto-follow DISABLED',
                'info'
            );
        }
    }

    /**
     * Shows keyboard shortcut help
     */
    function showKeyboardHelp() {
        const helpText = `
      ╔══════════════════════════════════════╗
      ║    KEYBOARD SHORTCUTS                ║
      ╠══════════════════════════════════════╣
      ║ Ctrl+Shift+D  Trigger critical event ║
      ║ Ctrl+Shift+R  Reset to nominal       ║
      ║ Space         Pause/Resume           ║
      ║ Escape        Close action panel     ║
      ║ F             Toggle camera follow   ║
      ║ T             Time acceleration 10x  ║
      ║ N             Normal time 1x         ║
      ║ H             Show this help         ║
      ╚══════════════════════════════════════╝
        `;

        addLogEntry(helpText.trim(), 'info');
    }

    // ==========================================
    // SHOW TOAST NOTIFICATION
    // ==========================================
    /**
     * Shows toast notification
     * @param {string} message - Message text
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in ms (default 3000)
     */
    function showToast(message, type = 'info', duration = 3000) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        // Add to body
        document.body.appendChild(toast);

        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'toast-appear 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // ==========================================
    // MODAL + ACTION FLOWS (Options A/B/C)
    // ==========================================
    function showModal({ title, html, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, oneButton = false }) {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.innerHTML = `
                <div class="modal" role="dialog" aria-modal="true">
                    <div class="modal-header">
                        <h4>${title}</h4>
                    </div>
                    <div class="modal-body">
                        ${html}
                    </div>
                    <div class="modal-actions">
                        ${oneButton ? '' : `<button class="btn btn-ghost" data-action="cancel">${cancelText}</button>`}
                        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);

            const cleanup = (result) => {
                if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
                resolve(result);
            };

            const actions = backdrop.querySelector('.modal-actions');
            if (actions) {
                actions.addEventListener('click', (e) => {
                    const a = e.target.getAttribute('data-action');
                    if (a === 'confirm') cleanup(true);
                    if (a === 'cancel') cleanup(false);
                });
            }

            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) cleanup(false);
            });

            function escHandler(ev) {
                if (ev.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    cleanup(false);
                }
            }
            document.addEventListener('keydown', escHandler, { once: true });
        });
    }

    function rampForceScore(from, to, durationMs = 1500, stepMs = 150) {
        const steps = Math.max(1, Math.round(durationMs / stepMs));
        let i = 0;
        const timer = setInterval(() => {
            i++;
            const t = i / steps;
            const value = Math.round(from + (to - from) * t);
            CTSEngine.setForceScore(value);
            if (i >= steps) {
                clearInterval(timer);
            }
        }, stepMs);
    }

    async function returnToSetup() {
        const ok = await showModal({
            title: 'Return to Setup',
            html: `
                <p>Stop current tracking and return to the TLE input screen?</p>
                <p class="chip" style="margin-top:10px;">Session will pause and CTS will reset.</p>
            `,
            confirmText: 'Return',
            cancelText: 'Stay'
        });
        if (!ok) return;

        try { if (window.App && App.pause) App.pause(); } catch (_) { }

        // Reset CTS + UI
        if (CTSEngine.resetHistory) CTSEngine.resetHistory();
        CTSEngine.setForceScore(null);
        hideActionPanel();

        // Show setup, hide dashboard
        if (elements.dashboard) elements.dashboard.classList.add('hidden');
        if (elements.businessPanel) elements.businessPanel.classList.add('hidden');
        if (elements.tleInputSection) {
            elements.tleInputSection.classList.remove('hidden');
            elements.tleInputSection.classList.add('active');
        }
        if (elements.initBtn) elements.initBtn.disabled = false;

        // Clear log
        if (elements.logEntries) elements.logEntries.innerHTML = '';

        // Reset asset data display
        if (elements.satName) elements.satName.textContent = '—';
        if (elements.satAltitude) elements.satAltitude.textContent = '—';
        if (elements.satVelocity) elements.satVelocity.textContent = '—';
        if (elements.satInclination) elements.satInclination.textContent = '—';

        // Reset asset state
        assetState = { fuel: 100, life: 100, status: 'Nominal', mitigationPending: false, salvageListed: false };
        updateAssetState();

        showToast('Returned to setup', 'info', 2000);
    }

    // Option A: Execute Evasive Maneuver
    async function executeEvasiveManeuver() {
        const ok = await showModal({
            title: 'Execute Evasive Maneuver',
            html: `
                <p>You are commanding the satellite to fire its thrusters to dodge the oncoming debris.</p>
                <ul style="margin-top:12px; padding-left:18px;">
                    <li>Consumes onboard fuel</li>
                    <li>Slightly shortens operational lifespan</li>
                    <li>Immediate reduction of collision risk</li>
                </ul>
            `,
            confirmText: 'Execute Maneuver',
            cancelText: 'Cancel'
        });
        if (!ok) return;

        addLogEntry('🛰️ Evasive maneuver initiated - Thrusters firing...', 'action');
        showToast('Maneuver simulated. CTS returning to nominal', 'success', 2500);

        // Resource impact
        updateAssetState({
            fuel: assetState.fuel - 8,
            life: assetState.life - 4,
            status: 'Maneuvering'
        });

        // Smoothly bring CTS down to nominal
        const stats = CTSEngine.getStatistics();
        const current = typeof stats.current === 'number' ? stats.current : 90;
        rampForceScore(current, 20, 1200, 120);
        setTimeout(() => {
            rampForceScore(20, 0, 800, 100);
        }, 1300);

        setTimeout(() => {
            hideActionPanel();
            CTSEngine.setForceScore(null); // resume natural scoring
            updateAssetState({ status: 'Nominal' });
            addLogEntry('Maneuver complete - CTS nominal', 'info');
        }, 2400);
    }

    // Option B: Contract Debris Mitigation
    async function contractDebrisMitigation() {
        const ok = await showModal({
            title: 'Contract Debris Mitigation',
            html: `
                <p>We will dispatch your request to our vetted in-orbit servicing partners.</p>
                <p class="chip" style="margin-top:10px;">Astroscale • ClearSpace • OrbitGuard</p>
                <p style="margin-top:12px;">This preserves fuel but incurs service costs and a short delay.</p>
            `,
            confirmText: 'Send Request',
            cancelText: 'Cancel'
        });
        if (!ok) return;

        addLogEntry('🤝 Request sent to in-orbit servicing network (mitigation pending)', 'action');
        showToast('Request sent to our network. A representative will contact you.', 'success', 3500);
        updateAssetState({ status: 'Mitigation Pending', mitigationPending: true });

        // Simulated partner acceptance and debris removal timeline
        const nowScore = CTSEngine.getStatistics().current || 90;

        // Slight reassurance immediately (score eases a bit)
        rampForceScore(nowScore, Math.max(60, nowScore - 25), 1200, 120);

        // Partner acceptance
        setTimeout(() => {
            addLogEntry('📨 Partner accepted request - task scheduled (ETA ~hours)', 'info');
            showToast('Partner accepted. Scheduling pass...', 'info', 2500);
            rampForceScore(60, 35, 1400, 140);
        }, 1800);

        // Debris removed
        setTimeout(() => {
            addLogEntry('✅ Debris removed by servicing partner', 'action');
            showToast('Mitigation complete. Threat removed.', 'success', 2500);
            rampForceScore(35, 0, 900, 100);
        }, 3800);

        setTimeout(() => {
            hideActionPanel();
            CTSEngine.setForceScore(null);
            updateAssetState({ status: 'Nominal', mitigationPending: false });
        }, 5000);
    }

    // Option C: Monetize the Asset
    async function monetizeAsset() {
        const ok = await showModal({
            title: 'List Asset for Salvage',
            html: `
                <p>This will list the entire satellite on Xenonite's In-Orbit Asset Exchange for salvage and recycling.</p>
                <ul style="margin-top:12px; padding-left:18px;">
                    <li>Irreversible decision</li>
                    <li>Begins process of de-orbiting or transfer to a salvage partner</li>
                    <li>Proactively removes a future debris source</li>
                </ul>
                <p style="margin-top:12px; color:#ff0055;">This action cannot be undone.</p>
            `,
            confirmText: 'List for Salvage',
            cancelText: 'Cancel',
            danger: true
        });
        if (!ok) return;

        addLogEntry('💰 Asset listed for salvage and recycling - initiating transfer', 'action');
        showToast('Asset listed. Salvage partner will coordinate transfer.', 'success', 3500);

        // Freeze ops and disengage CTS
        if (window.App && App.pause) {
            App.pause();
        }
        CTSEngine.setForceScore(0);
        updateAssetState({ status: 'Listed for Salvage', salvageListed: true });
        hideActionPanel();
    }

    /**
     * Show the Business Model Panel
     */
    function showBusinessPanel() {
        if (elements.businessPanel) {
            elements.businessPanel.classList.remove('hidden');
            console.log('UIController: Business model panel shown');
        }
    }

    /**
     * Show loading overlay
     */
    function showLoading(message = 'Loading...') {
        let overlay = document.getElementById('loading-overlay');

        if (!overlay) {
            // Create loading overlay if it doesn't exist
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <div id="loading-message" class="loading-text">${message}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.textContent = message;
            }
            overlay.style.display = 'flex';
        }

        console.log('UIController: Loading overlay shown');
    }

    /**
     * Hide loading overlay
     */
    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            console.log('UIController: Loading overlay hidden');
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        // Initialization
        init: init,

        // Dashboard updates
        updateCTSDisplay: updateCTSDisplay,
        updateAssetInfo: updateAssetInfo,

        // Panel controls
        showActionPanel: showActionPanel,
        hideActionPanel: hideActionPanel,
        showDashboard: showDashboard,
        showBusinessPanel: showBusinessPanel,

        // Logging
        addLogEntry: addLogEntry,

        // Demo triggers
        triggerCriticalEvent: triggerCriticalEvent,
        resetToNominal: resetToNominal,

        // Utilities
        showError: showError,
        hideError: hideError,

        showToast: showToast,

        // Loading states
        showLoading: showLoading,
        hideLoading: hideLoading
    };
})();

// Make available globally
window.UIController = UIController;

console.log('UIController module initialized');