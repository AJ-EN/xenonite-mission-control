// ============================================
// ORBITAL PROPAGATOR MODULE
// Handles SGP4 orbital mechanics and coordinate transformations
// ============================================

const OrbitalPropagator = (function () {
    'use strict';

    // ==========================================
    // MODULE STATE
    // ==========================================

    // Satellite record storage
    let activeSatellites = [];    // Array of {name, satrec}
    let debrisSatellites = [];    // Array of {name, satrec}
    let criticalSatellites = [];  // Array of {name, satrec}
    let playerSatellite = null;   // Single {name, satrec}
    // Constants
    const EARTH_RADIUS_KM = 6371.0;  // Earth radius in kilometers
    const SCALE_FACTOR = 1000.0;     // 1 scene unit = 1000 km
    const MAX_ACTIVE_RENDER = 500;   // Performance limit for active satellites

    // ==========================================
    // 1. INIT SATELLITES FUNCTION
    // ==========================================
    /**
     * Initializes satellite records from TLE data
     * @param {Object} tleData - Object with {active, debris, critical} arrays
     * @returns {Object} Counts of initialized satellites
     */
    function initSatellites(tleData) {
        console.log('OrbitalPropagator: Initializing satellites from TLE data...');

        // Reset storage
        activeSatellites = [];
        debrisSatellites = [];
        criticalSatellites = [];

        // Process active satellites
        if (tleData.active && Array.isArray(tleData.active)) {
            tleData.active.forEach(tle => {
                const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);

                if (satrec.error === 0) {
                    activeSatellites.push({
                        name: tle.name,
                        satrec: satrec
                    });
                } else {
                    console.warn(`OrbitalPropagator: Invalid TLE for ${tle.name}, error code ${satrec.error}`);
                }
            });
        }

        // Process debris
        if (tleData.debris && Array.isArray(tleData.debris)) {
            tleData.debris.forEach(tle => {
                const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);

                if (satrec.error === 0) {
                    debrisSatellites.push({
                        name: tle.name,
                        satrec: satrec
                    });
                } else {
                    console.warn(`OrbitalPropagator: Invalid debris TLE for ${tle.name}, error code ${satrec.error}`);
                }
            });
        }

        // Process critical debris
        if (tleData.critical && Array.isArray(tleData.critical)) {
            tleData.critical.forEach(tle => {
                const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);

                if (satrec.error === 0) {
                    criticalSatellites.push({
                        name: tle.name,
                        satrec: satrec
                    });
                } else {
                    console.warn(`OrbitalPropagator: Invalid critical TLE for ${tle.name}, error code ${satrec.error}`);
                }
            });
        }

        const counts = {
            active: activeSatellites.length,
            debris: debrisSatellites.length,
            critical: criticalSatellites.length
        };

        console.log('OrbitalPropagator: Initialization complete');
        console.log(`  - Active satellites: ${counts.active}`);
        console.log(`  - Debris objects: ${counts.debris}`);
        console.log(`  - Critical debris: ${counts.critical}`);

        return counts;
    }

    // ==========================================
    // 2. INIT PLAYER SATELLITE FUNCTION
    // ==========================================
    /**
     * Initializes player's satellite from single TLE
     * @param {Object} tle - TLE object with {name, tle1, tle2}
     * @returns {boolean} Success/failure
     */
    function initPlayerSatellite(tle) {
        console.log(`OrbitalPropagator: Initializing player satellite "${tle.name}"...`);

        try {
            const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);

            if (satrec.error === 0) {
                playerSatellite = {
                    name: tle.name,
                    satrec: satrec
                };

                console.log(`OrbitalPropagator: Player satellite "${tle.name}" initialized successfully`);
                return true;
            } else {
                console.error(`OrbitalPropagator: Failed to initialize player satellite, error code ${satrec.error}`);
                return false;
            }
        } catch (error) {
            console.error('OrbitalPropagator: Exception during player satellite initialization', error);
            return false;
        }
    }

    // ==========================================
    // 3. PROPAGATE FUNCTION
    // ==========================================
    /**
     * Propagates a satellite to a specific date using SGP4
     * @param {Object} satrec - Satellite record from twoline2satrec
     * @param {Date} date - JavaScript Date object
     * @returns {Object|null} {position, velocity} in ECI coordinates (km, km/s) or null on error
     */
    function propagate(satrec, date) {
        try {
            const positionAndVelocity = satellite.propagate(satrec, date);

            // Check for propagation errors
            if (positionAndVelocity.position === false || positionAndVelocity.position === satellite.error) {
                return null;
            }

            return {
                position: positionAndVelocity.position,  // ECI position {x, y, z} in km
                velocity: positionAndVelocity.velocity   // ECI velocity {x, y, z} in km/s
            };
        } catch (error) {
            console.warn('OrbitalPropagator: Propagation failed', error);
            return null;
        }
    }

    // ==========================================
    // 4. ECI TO SCENE POSITION FUNCTION
    // ==========================================
    /**
     * Converts ECI coordinates (km) to Three.js scene coordinates
     * @param {Object} eciPosition - ECI position {x, y, z} in kilometers
     * @returns {THREE.Vector3|null} Position in scene coordinates or null if invalid
     */
    function eciToScenePosition(eciPosition) {
        // Validate input exists
        if (!eciPosition) {
            console.warn('OrbitalPropagator: No ECI position provided');
            return null;
        }

        // Validate input types
        if (typeof eciPosition.x !== 'number' ||
            typeof eciPosition.y !== 'number' ||
            typeof eciPosition.z !== 'number') {
            console.warn('OrbitalPropagator: Invalid ECI position - non-numeric values', eciPosition);
            return null;
        }

        // Check for NaN values
        if (isNaN(eciPosition.x) || isNaN(eciPosition.y) || isNaN(eciPosition.z)) {
            console.warn('OrbitalPropagator: NaN in ECI position', eciPosition);
            return null;
        }

        // Check for infinite values
        if (!isFinite(eciPosition.x) || !isFinite(eciPosition.y) || !isFinite(eciPosition.z)) {
            console.warn('OrbitalPropagator: Infinite value in ECI position', eciPosition);
            return null;
        }

        // Check if THREE is available
        if (typeof THREE === 'undefined') {
            console.error('OrbitalPropagator: THREE.js not loaded');
            return null;
        }

        try {
            // ECI uses Z-up, X-right, Y-forward (inertial frame)
            // Three.js uses Y-up, X-right, Z-forward
            // Scale: 1 scene unit = 1000 km

            // Convert km to scene units and swap axes
            const x = eciPosition.x / SCALE_FACTOR;
            const y = eciPosition.z / SCALE_FACTOR;  // ECI Z becomes Three.js Y
            const z = -eciPosition.y / SCALE_FACTOR; // ECI Y becomes Three.js -Z

            // Validate converted values
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                console.warn('OrbitalPropagator: NaN after coordinate conversion');
                return null;
            }

            return new THREE.Vector3(x, y, z);

        } catch (error) {
            console.error('OrbitalPropagator: Error converting ECI to scene position', error);
            return null;
        }
    }

    // ==========================================
    // 5. GET PLAYER POSITION FUNCTION
    // ==========================================
    /**
     * Gets player satellite position at current time
     * @param {Date} date - Current time
     * @returns {THREE.Vector3|null} Scene position or null if not initialized
     */
    function getPlayerPosition(date) {
        if (!playerSatellite) {
            return null;
        }

        const pv = propagate(playerSatellite.satrec, date);
        if (!pv) {
            return null;
        }

        return eciToScenePosition(pv.position);
    }

    // ==========================================
    // 6. GET PLAYER ORBITAL PARAMS FUNCTION
    // ==========================================
    /**
     * Calculates orbital parameters for player satellite
     * @param {Date} date - Current time
     * @returns {Object|null} {altitude, velocity, inclination} as formatted strings
     */
    function getPlayerOrbitalParams(date) {
        if (!playerSatellite) {
            return null;
        }

        const pv = propagate(playerSatellite.satrec, date);
        if (!pv) {
            return null;
        }

        // Calculate altitude (distance from Earth center minus Earth radius)
        const pos = pv.position;
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        const altitude = distanceFromCenter - EARTH_RADIUS_KM;

        // Calculate velocity magnitude
        const vel = pv.velocity;
        const velocityMagnitude = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

        // Extract inclination from satrec (stored in radians)
        const inclinationRad = playerSatellite.satrec.inclo;
        const inclinationDeg = inclinationRad * (180 / Math.PI);

        return {
            altitude: altitude.toFixed(2),           // km
            velocity: velocityMagnitude.toFixed(2),  // km/s
            inclination: inclinationDeg.toFixed(2)   // degrees
        };
    }

    // ==========================================
    // 7. GET ACTIVE SATELLITE POSITIONS FUNCTION
    // ==========================================
    /**
     * Gets positions of all active satellites
     * @param {Date} date - Current time
     * @returns {Array} Array of THREE.Vector3 positions (limited to MAX_ACTIVE_RENDER)
     */
    function getActiveSatellitePositions(date) {
        const positions = [];
        const limit = Math.min(activeSatellites.length, MAX_ACTIVE_RENDER);

        for (let i = 0; i < limit; i++) {
            const sat = activeSatellites[i];
            const pv = propagate(sat.satrec, date);

            if (pv) {
                const scenePos = eciToScenePosition(pv.position);
                positions.push(scenePos);
            }
        }

        return positions;
    }

    // ==========================================
    // 8. GET DEBRIS POSITIONS FUNCTION
    // ==========================================
    /**
     * Gets positions of all debris objects
     * @param {Date} date - Current time
     * @returns {Array} Array of THREE.Vector3 positions
     */
    function getDebrisPositions(date) {
        const positions = [];

        debrisSatellites.forEach(debris => {
            const pv = propagate(debris.satrec, date);

            if (pv) {
                const scenePos = eciToScenePosition(pv.position);
                positions.push(scenePos);
            }
        });

        return positions;
    }

    // ==========================================
    // 9. GET CRITICAL DEBRIS POSITIONS FUNCTION
    // ==========================================
    /**
     * Gets positions of critical debris objects
     * @param {Date} date - Current time
     * @returns {Array} Array of THREE.Vector3 positions
     */
    function getCriticalDebrisPositions(date) {
        const positions = [];

        criticalSatellites.forEach(critical => {
            const pv = propagate(critical.satrec, date);

            if (pv) {
                const scenePos = eciToScenePosition(pv.position);
                positions.push(scenePos);
            }
        });

        return positions;
    }

    // ==========================================
    // 10. CALCULATE DISTANCE FUNCTION (Bonus)
    // ==========================================
    /**
     * Calculates distance between two satellites
     * @param {THREE.Vector3} pos1 - First position in scene coordinates
     * @param {THREE.Vector3} pos2 - Second position in scene coordinates
     * @returns {number} Distance in kilometers
     */
    function calculateDistance(pos1, pos2) {
        const dx = (pos1.x - pos2.x) * SCALE_FACTOR;
        const dy = (pos1.y - pos2.y) * SCALE_FACTOR;
        const dz = (pos1.z - pos2.z) * SCALE_FACTOR;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // ==========================================
    // 11. GET ALL DEBRIS WITH DISTANCES (Bonus)
    // ==========================================
    /**
     * Gets all debris with distances from player satellite
     * @param {Date} date - Current time
     * @returns {Array} Array of {position, distance, name} sorted by distance
     */
    function getDebrisWithDistances(date) {
        if (!playerSatellite) {
            return [];
        }

        const playerPos = getPlayerPosition(date);
        if (!playerPos) {
            return [];
        }

        const debrisData = [];

        debrisSatellites.forEach(debris => {
            const pv = propagate(debris.satrec, date);

            if (pv) {
                const scenePos = eciToScenePosition(pv.position);
                const distance = calculateDistance(playerPos, scenePos);

                debrisData.push({
                    name: debris.name,
                    position: scenePos,
                    distance: distance
                });
            }
        });

        // Sort by distance (closest first)
        debrisData.sort((a, b) => a.distance - b.distance);

        return debrisData;
    }

    // ==========================================
    // 12. GET GEODETIC COORDINATES (Bonus)
    // ==========================================
    /**
     * Converts ECI position to geodetic coordinates (lat, lon, alt)
     * @param {Object} eciPosition - ECI position {x, y, z} in km
     * @param {Date} date - Current time
     * @returns {Object} {latitude, longitude, altitude} in degrees and km
     */
    function eciToGeodetic(eciPosition, date) {
        const gmst = satellite.gstime(date);
        const gdPosition = satellite.eciToGeodetic(eciPosition, gmst);

        return {
            latitude: gdPosition.latitude * (180 / Math.PI),   // Convert to degrees
            longitude: gdPosition.longitude * (180 / Math.PI), // Convert to degrees
            altitude: gdPosition.height                         // Already in km
        };
    }

    // ==========================================
    // 13. GET PLAYER GEODETIC (Bonus)
    // ==========================================
    /**
     * Gets player satellite geodetic coordinates
     * @param {Date} date - Current time
     * @returns {Object|null} {latitude, longitude, altitude}
     */
    function getPlayerGeodetic(date) {
        if (!playerSatellite) {
            return null;
        }

        const pv = propagate(playerSatellite.satrec, date);
        if (!pv) {
            return null;
        }

        return eciToGeodetic(pv.position, date);
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        // Initialization
        initSatellites: initSatellites,
        initPlayerSatellite: initPlayerSatellite,

        // Core propagation
        propagate: propagate,
        eciToScenePosition: eciToScenePosition,

        // Player satellite functions
        getPlayerPosition: getPlayerPosition,
        getPlayerOrbitalParams: getPlayerOrbitalParams,
        getPlayerGeodetic: getPlayerGeodetic,

        // Satellite collection functions
        getActiveSatellitePositions: getActiveSatellitePositions,
        getDebrisPositions: getDebrisPositions,
        getCriticalDebrisPositions: getCriticalDebrisPositions,

        // Utility functions
        calculateDistance: calculateDistance,
        getDebrisWithDistances: getDebrisWithDistances,
        eciToGeodetic: eciToGeodetic,

        // Getters for other modules
        getPlayerSatellite: function () { return playerSatellite; },
        getActiveSatellites: function () { return activeSatellites; },
        getDebrisSatellites: function () { return debrisSatellites; },
        getCriticalSatellites: function () { return criticalSatellites; }
    };
})();

// Make available globally
window.OrbitalPropagator = OrbitalPropagator;

console.log('OrbitalPropagator module initialized');