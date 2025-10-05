// ============================================
// WINDOWS PERFORMANCE OPTIMIZER
// Maintains full quality while optimizing for Windows laptops
// ============================================

const WindowsPerformanceOptimizer = (function () {
    'use strict';

    // ==========================================
    // STATE
    // ==========================================
    let isWindows = false;
    let isLowEndWindows = false;
    let frameRate = 60;
    let lastFrameTime = 0;
    let frameCount = 0;
    let fpsCounter = 0;
    let animationFrameId = null;

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function init() {
        console.log('WindowsPerformanceOptimizer: Initializing...');

        detectWindowsEnvironment();
        optimizeForWindows();
        startPerformanceMonitoring();

        console.log(`WindowsPerformanceOptimizer: Initialized for ${isLowEndWindows ? 'low-end' : 'standard'} Windows`);
    }

    // ==========================================
    // WINDOWS DETECTION
    // ==========================================
    function detectWindowsEnvironment() {
        const userAgent = navigator.userAgent.toLowerCase();
        isWindows = /windows/i.test(userAgent);

        if (!isWindows) return;

        // Check for low-end Windows indicators
        const isLowRAM = navigator.deviceMemory && navigator.deviceMemory < 6; // Less than 6GB RAM
        const isSlowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 6; // Less than 6 cores

        // Check for integrated graphics (common performance bottleneck on Windows laptops)
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        let renderer = 'unknown';

        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }

        const isIntegratedGraphics = /intel.*hd|intel.*uhd|amd.*radeon.*vega|integrated/i.test(renderer);

        // Determine if low-end Windows device
        isLowEndWindows = isLowRAM || isSlowCPU || isIntegratedGraphics;

        console.log(`WindowsPerformanceOptimizer: Windows detected - Low RAM: ${isLowRAM}, Slow CPU: ${isSlowCPU}, Integrated Graphics: ${isIntegratedGraphics}`);
        console.log(`WindowsPerformanceOptimizer: Renderer: ${renderer}`);
    }

    // ==========================================
    // WINDOWS-SPECIFIC OPTIMIZATIONS
    // ==========================================
    function optimizeForWindows() {
        if (!isWindows) return;

        // Apply CSS optimizations that maintain quality but improve performance
        const style = document.createElement('style');
        style.id = 'windows-performance-optimizations';

        if (isLowEndWindows) {
            // Subtle optimizations for low-end Windows devices
            style.textContent = `
                /* Optimize animations for Windows */
                * {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
                
                /* Optimize backdrop filters for Windows */
                .timeline-controls {
                    backdrop-filter: blur(15px) !important;
                    -webkit-backdrop-filter: blur(15px) !important;
                }
                
                /* Optimize text rendering for Windows */
                .debris-number, h1, h2, h3 {
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: optimizeSpeed;
                }
                
                /* Optimize transitions for Windows */
                .play-btn, .skip-intro-btn, .speed-btn {
                    transition-duration: 0.2s !important;
                }
                
                /* Optimize shadows for Windows */
                .timeline-controls {
                    box-shadow: 0 15px 45px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 212, 255, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 60px rgba(0, 212, 255, 0.12) !important;
                }
            `;
        } else {
            // Standard Windows optimizations
            style.textContent = `
                /* Standard Windows optimizations */
                * {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                }
                
                /* Optimize text rendering for Windows */
                .debris-number, h1, h2, h3 {
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
            `;
        }

        document.head.appendChild(style);

        // Optimize Three.js renderer for Windows
        optimizeThreeJSForWindows();
    }

    // ==========================================
    // THREE.JS OPTIMIZATIONS FOR WINDOWS
    // ==========================================
    function optimizeThreeJSForWindows() {
        // Wait for Three.js to be available
        const checkThreeJS = setInterval(() => {
            if (window.THREE && window.SceneManager) {
                clearInterval(checkThreeJS);
                applyThreeJSOptimizations();
            }
        }, 100);
    }

    function applyThreeJSOptimizations() {
        // Override the renderer creation to add Windows-specific optimizations
        const originalInit = SceneManager.init;

        SceneManager.init = function () {
            const result = originalInit.call(this);

            if (result && window.renderer) {
                // Apply Windows-specific renderer optimizations
                if (isLowEndWindows) {
                    // Subtle optimizations for low-end Windows
                    window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                    window.renderer.shadowMap.enabled = false; // Disable shadows for better performance
                } else {
                    // Standard Windows optimizations
                    window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                }

                // Enable hardware acceleration for Windows
                window.renderer.outputEncoding = THREE.sRGBEncoding;
                window.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                window.renderer.toneMappingExposure = 1.0;

                console.log('WindowsPerformanceOptimizer: Three.js renderer optimized for Windows');
            }

            return result;
        };
    }

    // ==========================================
    // PERFORMANCE MONITORING
    // ==========================================
    function startPerformanceMonitoring() {
        if (!isWindows) return;

        let lastTime = performance.now();

        function monitorPerformance(currentTime) {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            frameCount++;
            fpsCounter = 1000 / deltaTime;

            // Adjust optimizations based on actual FPS
            if (frameCount % 120 === 0) { // Check every 2 seconds
                if (fpsCounter < 45 && !isLowEndWindows) {
                    console.log('WindowsPerformanceOptimizer: Low FPS detected, applying additional optimizations');
                    applyAdditionalOptimizations();
                }
            }

            animationFrameId = requestAnimationFrame(monitorPerformance);
        }

        animationFrameId = requestAnimationFrame(monitorPerformance);
    }

    function applyAdditionalOptimizations() {
        // Apply additional optimizations if FPS is low
        const style = document.getElementById('windows-performance-optimizations');
        if (style) {
            style.textContent += `
                /* Additional optimizations for low FPS */
                .debris-number {
                    animation-duration: 2.5s !important;
                }
                
                .play-btn::before {
                    animation-duration: 0.8s !important;
                }
                
                .timeline-controls {
                    backdrop-filter: blur(8px) !important;
                    -webkit-backdrop-filter: blur(8px) !important;
                }
            `;
        }
    }

    // ==========================================
    // ANIMATION OPTIMIZATIONS
    // ==========================================
    function optimizeAnimations() {
        if (!isWindows) return;

        // Optimize historical mode animations for Windows
        if (window.HistoricalMode) {
            const originalStartPlayback = HistoricalMode.startPlayback;

            HistoricalMode.startPlayback = function () {
                // Use requestAnimationFrame for smoother animations on Windows
                if (isLowEndWindows) {
                    // Slightly slower animations for low-end Windows
                    this.playbackSpeed = Math.max(this.playbackSpeed * 0.8, 0.5);
                }

                return originalStartPlayback.call(this);
            };
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        init: init,
        isWindows: () => isWindows,
        isLowEndWindows: () => isLowEndWindows,
        getFPS: () => fpsCounter,

        // Optimize specific elements for Windows
        optimizeElement: (element) => {
            if (!isWindows) return;

            // Add Windows-specific optimizations to any element
            element.style.transform = 'translateZ(0)';
            element.style.webkitTransform = 'translateZ(0)';

            if (isLowEndWindows) {
                element.style.willChange = 'auto';
            }
        },

        // Get optimal animation duration for Windows
        getOptimalDuration: (baseDuration) => {
            if (!isWindows) return baseDuration;

            if (isLowEndWindows) {
                return baseDuration * 1.2; // Slightly slower for smoothness
            }

            return baseDuration;
        },

        // Cleanup
        destroy: () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            const style = document.getElementById('windows-performance-optimizations');
            if (style) {
                style.remove();
            }
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WindowsPerformanceOptimizer.init);
} else {
    WindowsPerformanceOptimizer.init();
}
