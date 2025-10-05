// ============================================
// LOGGER UTILITY
// Conditional logging for development/production
// ============================================

const Logger = (function () {
    'use strict';

    // Set to false for production
    const DEBUG_MODE = true;

    // Console styling
    const STYLES = {
        info: 'color: #00d4ff; font-weight: bold;',
        warn: 'color: #ffcc00; font-weight: bold;',
        error: 'color: #ff0055; font-weight: bold;',
        success: 'color: #00ff88; font-weight: bold;'
    };

    /**
     * Log info message (only in debug mode)
     */
    function info(...args) {
        if (DEBUG_MODE) {
            console.log('%c[INFO]', STYLES.info, ...args);
        }
    }

    /**
     * Log warning message (only in debug mode)
     */
    function warn(...args) {
        if (DEBUG_MODE) {
            console.warn('%c[WARN]', STYLES.warn, ...args);
        }
    }

    /**
     * Log error message (always logged, even in production)
     */
    function error(...args) {
        console.error('%c[ERROR]', STYLES.error, ...args);
    }

    /**
     * Log success message (only in debug mode)
     */
    function success(...args) {
        if (DEBUG_MODE) {
            console.log('%c[SUCCESS]', STYLES.success, ...args);
        }
    }

    /**
     * Group logs together
     */
    function group(title, callback) {
        if (DEBUG_MODE) {
            console.group(title);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Log performance timing
     */
    function time(label) {
        if (DEBUG_MODE) {
            console.time(label);
        }
    }

    function timeEnd(label) {
        if (DEBUG_MODE) {
            console.timeEnd(label);
        }
    }

    /**
     * Check if debug mode is enabled
     */
    function isDebugMode() {
        return DEBUG_MODE;
    }

    // Public API
    return {
        info,
        warn,
        error,
        success,
        group,
        time,
        timeEnd,
        isDebugMode
    };
})();

// Make available globally
window.Logger = Logger;

if (Logger.isDebugMode()) {
    console.log('%c[LOGGER] Debug mode enabled', 'color: #00d4ff; font-weight: bold;');
}

