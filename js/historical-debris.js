// ============================================
// HISTORICAL DEBRIS SIMULATION
// Simulates debris growth from 1980-2025
// ============================================

const HistoricalDebris = (function () {
    "use strict";

    // ==========================================
    // STATE
    // ==========================================
    let debrisParticles = [];
    let scene = null;
    let particleSystem = null;

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function init(threeScene) {
        console.log("HistoricalDebris: Initializing...");
        scene = threeScene;

        // Listen for year changes
        window.addEventListener("historicalYearChange", onYearChange);

        console.log("HistoricalDebris: Initialized");
    }

    // ==========================================
    // YEAR CHANGE HANDLER
    // ==========================================
    function onYearChange(event) {
        const { year, debrisCount } = event.detail;
        updateDebrisVisualization(year, debrisCount);
    }

    // ==========================================
    // DEBRIS VISUALIZATION
    // ==========================================
    function updateDebrisVisualization(year, targetCount) {
        if (!scene) return;

        // For performance, we'll visualize a fraction of actual debris
        const visualCount = Math.min(Math.floor(targetCount / 10), 5000);

        // If we need more particles, add them
        while (debrisParticles.length < visualCount) {
            addDebrisParticle();
        }

        // If we have too many, remove some
        while (debrisParticles.length > visualCount) {
            removeDebrisParticle();
        }

        console.log(
            `HistoricalDebris: Year ${year}, Showing ${debrisParticles.length} particles`
        );
    }

    // ==========================================
    // PARTICLE MANAGEMENT
    // ==========================================
    function addDebrisParticle() {
        if (!scene) return;

        // Create small sphere for debris
        const geometry = new THREE.SphereGeometry(0.02, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600, // Orange/red for debris
            opacity: 0.7,
            transparent: true,
        });
        const particle = new THREE.Mesh(geometry, material);

        // Random orbital position (simplified)
        const earthRadius = 6.371;
        const altitude = 6.8 + Math.random() * 2; // LEO range
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        particle.position.x = altitude * Math.sin(phi) * Math.cos(theta);
        particle.position.y = altitude * Math.cos(phi);
        particle.position.z = altitude * Math.sin(phi) * Math.sin(theta);

        // Store orbital parameters for animation
        particle.userData = {
            orbitSpeed: 0.0001 + Math.random() * 0.0002,
            orbitPhase: Math.random() * Math.PI * 2,
            altitude: altitude,
        };

        scene.add(particle);
        debrisParticles.push(particle);

        // Fade in animation
        particle.material.opacity = 0;
        fadeIn(particle);
    }

    function removeDebrisParticle() {
        if (debrisParticles.length === 0) return;

        const particle = debrisParticles.pop();
        fadeOut(particle, () => {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });
    }

    // ==========================================
    // ANIMATIONS
    // ==========================================
    function fadeIn(particle) {
        const duration = 500;
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particle.material.opacity = progress * 0.7;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        animate();
    }

    function fadeOut(particle, callback) {
        const duration = 300;
        const startTime = Date.now();
        const startOpacity = particle.material.opacity;

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particle.material.opacity = startOpacity * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                callback();
            }
        }

        animate();
    }

    // ==========================================
    // ANIMATION LOOP
    // ==========================================
    function animate() {
        // Slowly rotate debris particles to simulate orbits
        debrisParticles.forEach((particle) => {
            if (particle.userData) {
                particle.userData.orbitPhase += particle.userData.orbitSpeed;

                const altitude = particle.userData.altitude;
                const phase = particle.userData.orbitPhase;

                // Simple circular orbit animation
                particle.position.x = altitude * Math.cos(phase);
                particle.position.z = altitude * Math.sin(phase);
            }
        });
    }

    // ==========================================
    // CLEANUP
    // ==========================================
    function cleanup() {
        console.log("HistoricalDebris: Cleaning up...");

        debrisParticles.forEach((particle) => {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });

        debrisParticles = [];
        console.log("HistoricalDebris: Cleanup complete");
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        init: init,
        animate: animate,
        cleanup: cleanup,
    };
})();

window.HistoricalDebris = HistoricalDebris;
console.log("HistoricalDebris module loaded");

