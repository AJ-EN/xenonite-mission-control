// ============================================
// DATA LOADER MODULE
// Handles TLE parsing and file loading
// ============================================

const DataLoader = (function () {
    'use strict';

    // ==========================================
    // 1. PARSE TLE FUNCTION
    // ==========================================
    /**
     * Parses raw TLE text into structured satellite objects
     * @param {string} tleText - Raw TLE data (multi-line string)
     * @returns {Array} Array of {name, tle1, tle2} objects
     */
    function parseTLE(tleText) {
        if (!tleText || typeof tleText !== 'string') {
            console.warn('DataLoader: Invalid TLE text provided');
            return [];
        }

        const lines = tleText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0); // Remove empty lines

        const satellites = [];
        let i = 0;

        while (i < lines.length) {
            // Look for TLE line 1 (starts with "1 ")
            if (lines[i].startsWith('1 ')) {
                // Check if we have line 2
                if (i + 1 < lines.length && lines[i + 1].startsWith('2 ')) {
                    // Name is the line before line1, or extract from line1 if not available
                    let name = 'UNKNOWN';
                    if (i > 0 && !lines[i - 1].startsWith('1 ') && !lines[i - 1].startsWith('2 ')) {
                        name = lines[i - 1];
                    }

                    satellites.push({
                        name: name.trim(),
                        tle1: lines[i].trim(),
                        tle2: lines[i + 1].trim()
                    });

                    i += 2; // Skip past both TLE lines
                } else {
                    console.warn(`DataLoader: Malformed TLE at line ${i} - missing line 2`);
                    i++;
                }
            } else {
                i++;
            }
        }

        console.log(`DataLoader: Parsed ${satellites.length} satellites from TLE data`);
        return satellites;
    }

    // ==========================================
    // 2. LOAD TLE FILE FUNCTION
    // ==========================================
    /**
     * Loads and parses a TLE file from local path
     * @param {string} filePath - Path to TLE file (e.g., 'data/active.txt')
     * @param {Function} callback - Callback(error, satellites)
     */
    function loadTLEFile(filePath, callback) {
        console.log(`DataLoader: Loading file ${filePath}...`);

        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(tleText => {
                const satellites = parseTLE(tleText);
                console.log(`DataLoader: Successfully loaded ${satellites.length} satellites from ${filePath}`);
                callback(null, satellites);
            })
            .catch(error => {
                console.error(`DataLoader: Failed to load ${filePath}`, error);
                callback(error, null);
            });
    }

    // ==========================================
    // 3. LOAD ALL DATA FUNCTION
    // ==========================================
    /**
     * Loads all three TLE files: active, debris, critical
     * @param {Function} callback - Callback(error, dataObject)
     */
    function loadAllData(callback) {
        console.log('DataLoader: Loading all data files...');

        const dataFiles = {
            active: 'data/active.txt',
            debris: 'data/debris.txt',
            critical: 'data/cosmos-critical.txt'
        };

        const results = {
            active: [],
            debris: [],
            critical: []
        };

        let pending = Object.keys(dataFiles).length;
        let hasError = false;

        // Load each file
        Object.keys(dataFiles).forEach(key => {
            loadTLEFile(dataFiles[key], (error, satellites) => {
                if (error) {
                    console.warn(`DataLoader: Failed to load ${key}, continuing...`);
                    // Don't set hasError to true - continue with other files
                } else {
                    results[key] = satellites;
                }

                pending--;

                // All files processed?
                if (pending === 0) {
                    const totalCount = results.active.length + results.debris.length + results.critical.length;
                    console.log(`DataLoader: All files loaded. Total satellites: ${totalCount.toLocaleString()}`);
                    console.log(`  - Active: ${results.active.length.toLocaleString()}`);
                    console.log(`  - Debris: ${results.debris.length.toLocaleString()}`);
                    console.log(`  - Critical: ${results.critical.length.toLocaleString()}`);

                    callback(null, results);
                }
            });
        });
    }

    // ==========================================
    // 4. VALIDATE TLE INPUT FUNCTION
    // ==========================================
    /**
     * Validates user-pasted TLE input from textarea
     * @param {string} inputText - User input text
     * @returns {Object} {valid: boolean, satellite: object|null, error: string|null}
     */
    function validateTLEInput(inputText) {
        // Check for empty input
        if (!inputText || inputText.trim().length === 0) {
            return {
                valid: false,
                satellite: null,
                error: 'Please paste TLE data into the input field.'
            };
        }

        const lines = inputText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Need at least 2 lines (TLE1 and TLE2), name is optional
        if (lines.length < 2) {
            return {
                valid: false,
                satellite: null,
                error: 'TLE data must contain at least 2 lines (Line 1 and Line 2).'
            };
        }

        // Find line 1 (starts with "1 ")
        let line1Index = lines.findIndex(line => line.startsWith('1 '));

        if (line1Index === -1) {
            return {
                valid: false,
                satellite: null,
                error: 'TLE Line 1 not found. Line 1 must start with "1 " followed by catalog number.'
            };
        }

        // Check if line 2 follows immediately
        if (line1Index + 1 >= lines.length) {
            return {
                valid: false,
                satellite: null,
                error: 'TLE Line 2 is missing. Line 2 must follow Line 1.'
            };
        }

        const line2 = lines[line1Index + 1];
        if (!line2.startsWith('2 ')) {
            return {
                valid: false,
                satellite: null,
                error: 'TLE Line 2 is invalid. Line 2 must start with "2 " followed by catalog number.'
            };
        }

        // Extract name (line before line1, if exists)
        let name = 'USER SATELLITE';
        if (line1Index > 0) {
            name = lines[line1Index - 1];
        }

        // Validate TLE line format (basic check)
        const line1 = lines[line1Index];
        if (line1.length < 69) {
            return {
                valid: false,
                satellite: null,
                error: 'TLE Line 1 is too short. Standard TLE Line 1 should be 69 characters.'
            };
        }

        if (line2.length < 69) {
            return {
                valid: false,
                satellite: null,
                error: 'TLE Line 2 is too short. Standard TLE Line 2 should be 69 characters.'
            };
        }

        // Validation passed!
        console.log(`DataLoader: TLE validation successful for ${name}`);

        return {
            valid: true,
            satellite: {
                name: name.trim(),
                tle1: line1.trim(),
                tle2: line2.trim()
            },
            error: null
        };
    }

    // ==========================================
    // 5. PRESET SCENARIOS (for UI buttons)
    // ==========================================
    /**
     * Returns preset TLE data for demo scenarios
     * @param {string} scenarioName - 'iss', 'cosmos', 'starlink', 'debris'
     * @returns {string} TLE text for scenario
     */
    function getScenario(scenarioName) {
        const scenarios = {
            iss: `ISS (ZARYA)
      1 25544U 98067A   25276.49892031  .00013095  00000+0  23997-3 0  9998
      2 25544  51.6325 130.2428 0001007 193.4972 166.5990 15.49648180531963`,

            starlink: `STARLINK-1234
      1 44713U 19074A   25276.50000000  .00001234  00000+0  12345-3 0  9999
      2 44713  53.0540 123.4567 0001234  98.7654 261.3456 15.06491234567890`,

            hubble: `HST
      1 20580U 90037B   25276.50000000  .00001000  00000+0  50000-4 0  9999
      2 20580  28.4690 123.4560 0002500  12.3456 347.7890 15.09678910123456`,

            // cosmos and debris load from files
            cosmos: null,
            debris: null
        };

        return scenarios[scenarioName] || null;
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        parseTLE: parseTLE,
        loadTLEFile: loadTLEFile,
        loadAllData: loadAllData,
        validateTLEInput: validateTLEInput,
        getScenario: getScenario
    };
})();

// Make available globally
window.DataLoader = DataLoader;

console.log('DataLoader module initialized');