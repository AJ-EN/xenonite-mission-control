// ============================================
// COLLISION THREAT SCORING (CTS) ENGINE
// Core business logic for LEO commercialization
// ============================================

const CTSEngine = (function () {
    'use strict';

    // ==========================================
    // CONFIGURATION CONSTANTS
    // ==========================================

    // Threat zones (in kilometers)
    const DANGER_RADIUS = 100;    // Outer warning zone (100 km)
    const CRITICAL_RADIUS = 10;   // Immediate threat zone (10 km)
    const EXTREME_RADIUS = 5;     // Extreme danger zone (5 km)

    // Scoring weights
    const DANGER_WEIGHT = 0.5;    // Weight for danger zone threats
    const CRITICAL_BONUS = 50;    // Large bonus for critical proximity
    const EXTREME_BONUS = 80;     // Massive bonus for extreme proximity

    // History tracking
    const MAX_HISTORY = 120;      // 2 minutes at 1 update/second
    let historicalScores = [];    // Stores recent scores for sparkline

    // Demo override
    let forceScore = null;        // Override score for demo purposes

    // Threat details
    let lastThreats = [];         // Array of closest threats

    // ==========================================
    // 1. CALCULATE SCORE FUNCTION
    // ==========================================
    /**
     * Calculates collision threat score based on debris proximity
     * @param {THREE.Vector3} playerPosition - Player satellite position
     * @param {Array} debrisPositions - Array of debris Vector3 positions
     * @returns {number} Threat score (0-100)
     */
    function calculateScore(playerPosition, debrisPositions) {
        if (forceScore !== null) {
            console.log(`CTSEngine: Force score active: ${forceScore}`);
            // ADD THIS: Update history even in force mode
            historicalScores.push(forceScore);
            if (historicalScores.length > MAX_HISTORY) {
                historicalScores.shift();
            }
            return forceScore;
        }

        // Validate inputs
        if (!playerPosition || !debrisPositions || debrisPositions.length === 0) {
            // PUSH 0 TO HISTORY
            historicalScores.push(0);
            if (historicalScores.length > MAX_HISTORY) {
                historicalScores.shift();
            }
            return 0;
        }

        let threatScore = 0;
        let threats = [];

        // Analyze each debris object
        debrisPositions.forEach((debrisPos, index) => {
            // Calculate distance (THREE.js Vector3.distanceTo returns scene units)
            const distance = playerPosition.distanceTo(debrisPos);

            // Convert to kilometers (distance is in scene units, 1 unit = 1000 km)
            const distanceKm = distance * 1000;  // FIXED: Was missing multiplication

            // CHECK IF VALID
            if (!isFinite(distanceKm) || isNaN(distanceKm)) {
                return; // Skip this debris
            }

            // Check if within danger radius
            if (distanceKm < DANGER_RADIUS) {
                // Base threat score (closer = higher)
                const proximityThreat = (DANGER_RADIUS - distanceKm) * DANGER_WEIGHT;
                threatScore += proximityThreat;

                // Track this threat
                threats.push({
                    index: index,
                    distance: distanceKm,
                    threat: proximityThreat
                });

                // Critical proximity bonus
                if (distanceKm < CRITICAL_RADIUS) {
                    threatScore += CRITICAL_BONUS;

                    // Extreme proximity bonus
                    if (distanceKm < EXTREME_RADIUS) {
                        threatScore += EXTREME_BONUS;
                    }
                }
            }
        });

        // Cap score at 100
        threatScore = Math.min(Math.round(threatScore), 100);

        // Store in history
        historicalScores.push(threatScore);
        if (historicalScores.length > MAX_HISTORY) {
            historicalScores.shift();
        }

        // Sort threats by distance (closest first)
        threats.sort((a, b) => a.distance - b.distance);
        lastThreats = threats.slice(0, 5);

        // Log significant events
        if (threatScore > 70) {
            console.warn(`CTSEngine: HIGH THREAT SCORE: ${threatScore} (${threats.length} objects in danger zone)`);
        }

        return threatScore;
    }

    // ==========================================
    // 2. GET SCORE STATUS FUNCTION
    // ==========================================
    /**
     * Converts numeric score to status string
     * @param {number} score - Threat score (0-100)
     * @returns {string} Status text
     */
    function getScoreStatus(score) {
        if (score >= 86) {
            return 'CRITICAL';
        } else if (score >= 61) {
            return 'WARNING';
        } else if (score >= 31) {
            return 'ELEVATED';
        } else {
            return 'NOMINAL';
        }
    }

    // ==========================================
    // 3. GET SCORE COLOR FUNCTION
    // ==========================================
    /**
     * Maps score to CSS class name for color coding
     * @param {number} score - Threat score (0-100)
     * @returns {string} CSS class name
     */
    function getScoreColor(score) {
        const status = getScoreStatus(score);

        switch (status) {
            case 'CRITICAL':
                return 'critical';
            case 'WARNING':
                return 'warning';
            case 'ELEVATED':
                return 'elevated';
            case 'NOMINAL':
            default:
                return 'nominal';
        }
    }

    // ==========================================
    // 4. DRAW SPARKLINE FUNCTION
    // ==========================================
    /**
     * Draws sparkline visualization of score history
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Array} scores - Array of historical scores (optional, uses internal if not provided)
     */
    function drawSparkline(canvas, scores) {
        if (!canvas) {
            console.warn('CTSEngine: No canvas provided for sparkline');
            return;
        }

        try {
            // Get 2D context with null check
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.warn('CTSEngine: Cannot get 2D context from canvas');
                return;
            }

            const width = canvas.width;
            const height = canvas.height;

            // Validate dimensions
            if (width <= 0 || height <= 0) {
                console.warn('CTSEngine: Invalid canvas dimensions');
                return;
            }

            // Use provided scores or internal history
            const data = scores || historicalScores;

            if (!data || data.length === 0) {
                // Draw empty state
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = '#606060';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('No data', width / 2, height / 2);
                return;
            }

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Calculate dimensions
            const padding = 5;
            const graphWidth = width - padding * 2;
            const graphHeight = height - padding * 2;

            // Determine point spacing
            const maxPoints = Math.min(data.length, 120);
            const pointSpacing = graphWidth / (maxPoints - 1 || 1);

            // Draw background zones (optional visual guide)
            drawZones(ctx, padding, graphHeight, width, height);

            // Draw line
            ctx.beginPath();
            ctx.lineWidth = 2;

            for (let i = 0; i < maxPoints; i++) {
                const score = data[data.length - maxPoints + i];

                // Validate score
                if (typeof score !== 'number' || isNaN(score)) {
                    continue;
                }

                const x = padding + i * pointSpacing;
                const y = height - padding - (score / 100) * graphHeight;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Color based on current score
            const currentScore = data[data.length - 1];
            ctx.strokeStyle = getSparklineColor(currentScore);
            ctx.stroke();

            // Draw current value indicator (dot at end)
            const lastX = padding + (maxPoints - 1) * pointSpacing;
            const lastY = height - padding - (currentScore / 100) * graphHeight;

            ctx.beginPath();
            ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
            ctx.fillStyle = getSparklineColor(currentScore);
            ctx.fill();

        } catch (error) {
            console.error('CTSEngine: Error drawing sparkline', error);
        }
    }

    /**
     * Helper: Draw background zones
     */
    function drawZones(ctx, padding, graphHeight, width, height) {
        try {
            // Critical zone (86-100)
            ctx.fillStyle = 'rgba(255, 0, 85, 0.1)';
            ctx.fillRect(padding, padding, width - padding * 2, graphHeight * 0.14);

            // Warning zone (61-85)
            ctx.fillStyle = 'rgba(255, 136, 0, 0.05)';
            ctx.fillRect(padding, padding + graphHeight * 0.14, width - padding * 2, graphHeight * 0.25);

            // Elevated zone (31-60)
            ctx.fillStyle = 'rgba(255, 204, 0, 0.05)';
            ctx.fillRect(padding, padding + graphHeight * 0.39, width - padding * 2, graphHeight * 0.30);
        } catch (error) {
            console.warn('CTSEngine: Error drawing zones', error);
        }
    }

    /**
     * Helper: Get color for sparkline based on score
     */
    function getSparklineColor(score) {
        if (score >= 86) {
            return '#ff0055'; // Critical red
        } else if (score >= 61) {
            return '#ff8800'; // Warning orange
        } else if (score >= 31) {
            return '#ffcc00'; // Elevated yellow
        } else {
            return '#00ff88'; // Nominal green
        }
    }

    // ==========================================
    // 5. GET CLOSEST THREATS FUNCTION
    // ==========================================
    /**
     * Returns details of closest threats
     * @returns {Array} Array of threat objects {index, distance, threat}
     */
    function getClosestThreats() {
        return lastThreats;
    }

    // ==========================================
    // 6. SET FORCE SCORE FUNCTION (Demo Override)
    // ==========================================
    /**
     * Sets a forced score for demo purposes
     * @param {number|null} score - Score to force (0-100) or null to disable
     */
    function setForceScore(score) {
        if (score === null) {
            forceScore = null;
            console.log('CTSEngine: Force score disabled');
        } else {
            forceScore = Math.min(Math.max(Math.round(score), 0), 100);
            console.log(`CTSEngine: Force score set to ${forceScore}`);
        }
    }

    // ==========================================
    // 7. RESET HISTORY FUNCTION
    // ==========================================
    /**
     * Clears historical score data
     */
    function resetHistory() {
        historicalScores = [];
        lastThreats = [];
        console.log('CTSEngine: History reset');
    }

    // ==========================================
    // 8. GET THREAT DESCRIPTION FUNCTION
    // ==========================================
    /**
     * Generates human-readable threat description
     * @returns {string} Description of current threat
     */
    function getThreatDescription() {
        if (lastThreats.length === 0) {
            return 'No immediate threats detected.';
        }

        const closest = lastThreats[0];
        const distanceKm = closest.distance.toFixed(1);
        const count = lastThreats.length;

        if (closest.distance < EXTREME_RADIUS) {
            return `EXTREME DANGER: Debris at <strong>${distanceKm} km</strong>. Immediate action required!`;
        } else if (closest.distance < CRITICAL_RADIUS) {
            return `CRITICAL: Debris fragment at <strong>${distanceKm} km</strong> proximity. Collision risk imminent.`;
        } else if (closest.distance < 50) {
            return `WARNING: ${count} object(s) within 50 km. Closest at <strong>${distanceKm} km</strong>.`;
        } else {
            return `ELEVATED: ${count} object(s) within danger zone. Closest at <strong>${distanceKm} km</strong>.`;
        }
    }

    // ==========================================
    // 9. GET STATISTICS FUNCTION
    // ==========================================
    /**
     * Returns current statistics
     * @returns {Object} Statistics object
     */
    function getStatistics() {
        const currentScore = historicalScores[historicalScores.length - 1] || 0;
        const avgScore = historicalScores.length > 0
            ? historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length
            : 0;
        const maxScore = historicalScores.length > 0
            ? Math.max(...historicalScores)
            : 0;

        return {
            current: currentScore,
            average: avgScore.toFixed(1),
            maximum: maxScore,
            threatsInRange: lastThreats.length,
            historyLength: historicalScores.length
        };
    }

    // ==========================================
    // 10. CALCULATE COLLISION TIME ESTIMATE
    // ==========================================
    /**
     * Estimates time to potential collision (simplified)
     * @param {number} distance - Distance in km
     * @param {number} relativeVelocity - Relative velocity in km/s (default 1 km/s)
     * @returns {string} Time estimate string
     */
    function estimateCollisionTime(distance, relativeVelocity = 1.0) {
        if (distance > DANGER_RADIUS) {
            return 'N/A';
        }

        const timeSeconds = distance / relativeVelocity;

        if (timeSeconds < 60) {
            return `${Math.round(timeSeconds)} seconds`;
        } else if (timeSeconds < 3600) {
            return `${Math.round(timeSeconds / 60)} minutes`;
        } else {
            return `${(timeSeconds / 3600).toFixed(1)} hours`;
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        // Core functions
        calculateScore: calculateScore,
        getScoreStatus: getScoreStatus,
        getScoreColor: getScoreColor,
        drawSparkline: drawSparkline,

        // Threat analysis
        getClosestThreats: getClosestThreats,
        getThreatDescription: getThreatDescription,
        estimateCollisionTime: estimateCollisionTime,

        // Statistics
        getStatistics: getStatistics,

        // Demo controls
        setForceScore: setForceScore,
        resetHistory: resetHistory,

        // Configuration getters
        getConfig: function () {
            return {
                dangerRadius: DANGER_RADIUS,
                criticalRadius: CRITICAL_RADIUS,
                extremeRadius: EXTREME_RADIUS,
                maxHistory: MAX_HISTORY
            };
        },

        // History getter
        getHistory: function () {
            return historicalScores.slice(); // Return copy
        }
    };
})();

// Make available globally
window.CTSEngine = CTSEngine;

console.log('CTSEngine module initialized');