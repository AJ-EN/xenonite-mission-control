// ============================================
// SCENE MANAGER MODULE
// Handles Three.js 3D visualization
// ============================================

const SceneManager = (function () {
    'use strict';

    // ==========================================
    // MODULE STATE
    // ==========================================
    let scene = null;
    let camera = null;
    let renderer = null;
    let canvas = null;

    // Scene objects
    let earthMesh = null;
    let atmosphereMesh = null;
    let skyboxMesh = null;
    let playerSatelliteMesh = null;

    // Collections
    let activeSatelliteMeshes = [];
    let debrisMeshes = [];

    // Relationship lines
    let relationshipGroup = null;

    // Orbital trajectory
    let orbitLineMesh = null;
    let orbitPointsMesh = null;

    // Camera control state
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraDistance = 20;
    let cameraTheta = Math.PI / 4;
    let cameraPhi = Math.PI / 3;
    let autoFollowSatellite = false;  // Auto-follow player satellite

    // Constants
    const EARTH_RADIUS = 6.371; // Earth radius in scene units (1 unit = 1000km)
    const SCENE_SCALE = 0.001;  // 1 scene unit = 1000 km

    // Icon textures (inline SVG → data URI)
    const SATELLITE_SVG = 'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <g fill="#00ffff">
            <rect x="28" y="26" width="8" height="12" rx="1"/>
            <rect x="18" y="22" width="8" height="8" rx="1"/>
            <rect x="38" y="34" width="8" height="8" rx="1"/>
            <rect x="8" y="24" width="10" height="4"/>
            <rect x="46" y="38" width="10" height="4"/>
          </g>
        </svg>`
        );

    const DEBRIS_SVG = 'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <polygon points="14,50 26,10 54,34" fill="#ff4400"/>
          <circle cx="18" cy="48" r="3" fill="#ff0055"/>
        </svg>`
        );

    let textures = { satellite: null, debris: null };

    // ==========================================
    // 1. INIT FUNCTION
    // ==========================================
    function init() {
        console.log('SceneManager: Initializing 3D scene...');

        try {
            // Get canvas element
            canvas = document.getElementById('scene-canvas');
            if (!canvas) {
                console.error('SceneManager: Canvas element not found');
                return false;
            }

            // Create scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000);

            // Create camera
            const aspect = window.innerWidth / window.innerHeight;
            camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
            updateCameraPosition();
            camera.lookAt(0, 0, 0);

            // Create renderer
            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: false
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Relationship group
            relationshipGroup = new THREE.Group();
            scene.add(relationshipGroup);

            // Preload icon textures
            const loader = new THREE.TextureLoader();
            textures.satellite = loader.load(SATELLITE_SVG);
            textures.debris = loader.load(DEBRIS_SVG);

            console.log('SceneManager: Three.js initialized successfully');
            return true;

        } catch (error) {
            console.error('SceneManager: Initialization failed', error);
            return false;
        }
    }

    // ==========================================
    // 2. ADD LIGHTS FUNCTION
    // ==========================================
    function addLights() {
        console.log('SceneManager: Adding lights...');

        // Ambient light (base illumination)
        const ambientLight = new THREE.AmbientLight(0x222222, 0.9);
        scene.add(ambientLight);

        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(100, 50, 50);
        scene.add(sunLight);

        console.log('SceneManager: Lights added');
    }

    // ==========================================
    // 3. ADD EARTH FUNCTION
    // ==========================================
    function addEarth() {
        console.log('SceneManager: Loading Earth...');

        const textureLoader = new THREE.TextureLoader();

        textureLoader.load(
            'assets/earth/earth-blue-marble-2k.jpg',
            function (texture) {
                const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.7,
                    metalness: 0.05
                });

                earthMesh = new THREE.Mesh(geometry, material);
                scene.add(earthMesh);

                // Enhanced multi-layer atmosphere
                // Layer 1: Inner atmosphere (thin, bright)
                const atmoGeom1 = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 64);
                const atmoMat1 = new THREE.MeshBasicMaterial({
                    color: 0x4db8ff,
                    transparent: true,
                    opacity: 0.15,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.BackSide
                });
                const atmoLayer1 = new THREE.Mesh(atmoGeom1, atmoMat1);
                scene.add(atmoLayer1);

                // Layer 2: Middle atmosphere (medium glow)
                const atmoGeom2 = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 64, 64);
                const atmoMat2 = new THREE.MeshBasicMaterial({
                    color: 0x2e96ff,
                    transparent: true,
                    opacity: 0.1,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.BackSide
                });
                atmosphereMesh = new THREE.Mesh(atmoGeom2, atmoMat2);
                scene.add(atmosphereMesh);

                // Layer 3: Outer atmosphere (soft, diffuse)
                const atmoGeom3 = new THREE.SphereGeometry(EARTH_RADIUS * 1.04, 64, 64);
                const atmoMat3 = new THREE.MeshBasicMaterial({
                    color: 0x1a5caa,
                    transparent: true,
                    opacity: 0.05,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.BackSide
                });
                const atmoLayer3 = new THREE.Mesh(atmoGeom3, atmoMat3);
                scene.add(atmoLayer3);

                console.log('SceneManager: Earth + enhanced multi-layer atmosphere loaded');
            },
            undefined,
            function (error) {
                console.warn('SceneManager: Failed to load Earth texture, using fallback', error);

                // Fallback: plain blue sphere
                const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x2233ff,
                    roughness: 0.7,
                    metalness: 0.1
                });

                earthMesh = new THREE.Mesh(geometry, material);
                scene.add(earthMesh);
            }
        );
    }

    // ==========================================
    // 4. ADD SKYBOX FUNCTION
    // ==========================================
    function addSkybox() {
        console.log('SceneManager: Loading skybox...');

        const textureLoader = new THREE.TextureLoader();

        textureLoader.load(
            'assets/skybox/stars-milkyway.jpg',
            function (texture) {
                const geometry = new THREE.SphereGeometry(1000, 64, 64);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide
                });

                skyboxMesh = new THREE.Mesh(geometry, material);
                scene.add(skyboxMesh);

                console.log('SceneManager: Skybox loaded successfully');
            },
            undefined,
            function (error) {
                console.warn('SceneManager: Failed to load skybox texture', error);
            }
        );
    }

    // ==========================================
    // 5. ADD CAMERA CONTROLS FUNCTION
    // ==========================================
    function addCameraControls() {
        console.log('SceneManager: Setting up camera controls...');

        // Mouse down
        canvas.addEventListener('mousedown', function (e) {
            isDragging = true;
            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        // Mouse move
        canvas.addEventListener('mousemove', function (e) {
            if (!isDragging) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            // Update spherical coordinates
            cameraTheta -= deltaX * 0.005;
            cameraPhi -= deltaY * 0.005;

            // Clamp phi to prevent flipping
            cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi));

            updateCameraPosition();

            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        // Mouse up
        canvas.addEventListener('mouseup', function () {
            isDragging = false;
        });

        // Mouse leave
        canvas.addEventListener('mouseleave', function () {
            isDragging = false;
        });

        // Mouse wheel zoom
        canvas.addEventListener(
            'wheel',
            function (e) {
                e.preventDefault();

                cameraDistance += e.deltaY * 0.01;
                cameraDistance = Math.max(10, Math.min(100, cameraDistance));

                updateCameraPosition();
            },
            { passive: false }
        );

        console.log('SceneManager: Camera controls ready');
    }

    function updateCameraPosition() {
        if (!camera) return;

        const x = cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
        const y = cameraDistance * Math.cos(cameraPhi);
        const z = cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);

        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
    }

    // ==========================================
    // ICON HELPERS (Sprites)
    // ==========================================
    function createIconSprite(texture, size) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(size, size, 1);
        return sprite;
    }

    // ==========================================
    // 6. UPDATE PLAYER SATELLITE FUNCTION (ENHANCED)
    // ==========================================
    function updatePlayerSatellite(position) {
        if (!playerSatelliteMesh) {
            // Create main satellite sprite - MUCH LARGER
            const sprite = createIconSprite(textures.satellite, 1.2); // Was 0.55, now 1.2
            sprite.position.copy(position);
            scene.add(sprite);

            // Add multiple glow layers for better visibility
            // Layer 1: Inner bright glow
            const innerGlowGeom = new THREE.CircleGeometry(0.8, 32);
            const innerGlowMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const innerGlow = new THREE.Mesh(innerGlowGeom, innerGlowMat);
            innerGlow.rotation.x = -Math.PI / 2;
            sprite.add(innerGlow);

            // Layer 2: Outer pulsing glow
            const outerGlowGeom = new THREE.CircleGeometry(1.5, 32);
            const outerGlowMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.25,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const outerGlow = new THREE.Mesh(outerGlowGeom, outerGlowMat);
            outerGlow.rotation.x = -Math.PI / 2;
            sprite.add(outerGlow);

            // Store references for animation
            sprite.userData.innerGlow = innerGlow;
            sprite.userData.outerGlow = outerGlow;
            sprite.userData.pulsePhase = 0;

            playerSatelliteMesh = sprite;

            // Enable auto-follow when satellite is created
            autoFollowSatellite = true;

            console.log('SceneManager: Enhanced player satellite created (LARGE & GLOWING)');
        } else {
            playerSatelliteMesh.position.copy(position);
        }

        // Auto-follow camera to satellite if enabled
        if (autoFollowSatellite && playerSatelliteMesh) {
            smoothFollowSatellite(position);
        }
    }

    // ==========================================
    // 7. UPDATE ACTIVE SATELLITES FUNCTION
    // ==========================================
    function updateActiveSatellites(positions) {
        // Keep these minimal spheres for performance (background context)
        activeSatelliteMeshes.forEach(mesh => {
            scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        activeSatelliteMeshes = [];

        const limit = Math.min(positions.length, 400);

        for (let i = 0; i < limit; i++) {
            const geometry = new THREE.SphereGeometry(0.04, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0x3a5cff, opacity: 0.85, transparent: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(positions[i]);
            scene.add(mesh);
            activeSatelliteMeshes.push(mesh);
        }

        console.log(`SceneManager: Updated ${limit} active satellites`);
    }

    // ==========================================
    // 8. UPDATE DEBRIS FUNCTION (ENHANCED with varied sizes & glow)
    // ==========================================
    function updateDebris(positions) {
        debrisMeshes.forEach(mesh => {
            scene.remove(mesh);
            if (mesh.material && mesh.material.map) mesh.material.map.dispose();
            if (mesh.material) mesh.material.dispose();
            if (mesh.geometry) mesh.geometry.dispose();
        });
        debrisMeshes = [];

        const limit = Math.min(positions.length, 220);

        for (let i = 0; i < limit; i++) {
            // Varied debris sizes for realism (0.25 to 0.45)
            const size = 0.25 + Math.random() * 0.2;
            const sprite = createIconSprite(textures.debris, size);
            sprite.position.copy(positions[i]);

            // Add subtle glow to make debris more visible
            const glowGeom = new THREE.CircleGeometry(size * 1.5, 16);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xff4400,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const glow = new THREE.Mesh(glowGeom, glowMat);
            glow.rotation.x = -Math.PI / 2;
            sprite.add(glow);

            // Store for animation
            sprite.userData.glowPhase = Math.random() * Math.PI * 2;
            sprite.userData.glow = glow;

            scene.add(sprite);
            debrisMeshes.push(sprite);
        }

        console.log(`SceneManager: Updated ${limit} enhanced debris objects`);
    }

    // ==========================================
    // 9. HIGHLIGHT CRITICAL DEBRIS FUNCTION
    // ==========================================
    function highlightCriticalDebris(indices) {
        indices.forEach(index => {
            if (index < debrisMeshes.length) {
                const sprite = debrisMeshes[index];
                // Emphasize by scale + tint
                if (sprite && sprite.material) {
                    sprite.scale.set(0.36, 0.36, 1);
                    sprite.material.color.set(0xff0055);
                }
            }
        });

        console.log(`SceneManager: Highlighted ${indices.length} critical debris`);
    }

    // ==========================================
    // 10. RELATIONSHIP LINES (Player ↔ Threats)
    // ==========================================
    function updateRelationships(playerPosition, targetPositions = []) {
        if (!relationshipGroup) return;

        // Clear previous
        while (relationshipGroup.children.length) {
            const child = relationshipGroup.children.pop();
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        if (!playerPosition || !Array.isArray(targetPositions) || targetPositions.length === 0) {
            return;
        }

        const lineMat = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.65,
            linewidth: 1
        });

        targetPositions.slice(0, 3).forEach(pos => {
            const geom = new THREE.BufferGeometry().setFromPoints([playerPosition, pos]);
            const line = new THREE.Line(geom, lineMat.clone());
            relationshipGroup.add(line);

            // Endpoint dot
            const dotGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({
                color: 0xff0055,
                transparent: true,
                opacity: 0.9
            });
            const dot = new THREE.Mesh(dotGeom, dotMat);
            dot.position.copy(pos);
            relationshipGroup.add(dot);
        });
    }

    // ==========================================
    // 11. WINDOW RESIZE HANDLER
    // ==========================================
    function onWindowResize() {
        if (!camera || !renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

        console.log(`SceneManager: Resized to ${width}x${height}`);
    }

    // ==========================================
    // 12. RENDER FUNCTION AND ANIMATE EARTH + EFFECTS
    // ==========================================
    function animate() {
        // Rotate Earth
        if (earthMesh) earthMesh.rotation.y += 0.0008;
        if (atmosphereMesh) atmosphereMesh.rotation.y += 0.0008;

        // Animate player satellite glow (pulsing effect)
        if (playerSatelliteMesh && playerSatelliteMesh.userData.outerGlow) {
            playerSatelliteMesh.userData.pulsePhase += 0.03;
            const pulse = Math.sin(playerSatelliteMesh.userData.pulsePhase) * 0.15 + 0.25;
            playerSatelliteMesh.userData.outerGlow.material.opacity = pulse;

            // Scale pulse
            const scale = 1.0 + Math.sin(playerSatelliteMesh.userData.pulsePhase) * 0.1;
            playerSatelliteMesh.userData.outerGlow.scale.set(scale, scale, 1);
        }

        // Animate debris glow (subtle pulsing)
        debrisMeshes.forEach(debris => {
            if (debris.userData.glow) {
                debris.userData.glowPhase += 0.02;
                const glowPulse = Math.sin(debris.userData.glowPhase) * 0.08 + 0.15;
                debris.userData.glow.material.opacity = glowPulse;
            }
        });
    }
    function render() {
        if (!renderer || !scene || !camera) return;
        animate();
        renderer.render(scene, camera);
    }

    // ==========================================
    // 13. SMOOTH CAMERA FOLLOW (NEW - FIXED)
    // ==========================================
    function smoothFollowSatellite(satellitePosition) {
        if (!satellitePosition || isDragging) return;

        // Smooth interpolation (lerp) for camera movement
        const lerpFactor = 0.03; // Smooth factor (lower = smoother)

        // Calculate target angles to look at satellite (don't change distance!)
        const targetTheta = Math.atan2(satellitePosition.x, satellitePosition.z);
        const targetPhi = Math.acos(satellitePosition.y / satellitePosition.length());

        // Smooth transition for ANGLES ONLY (preserve user's zoom level)
        cameraTheta += (targetTheta - cameraTheta) * lerpFactor;
        cameraPhi += (targetPhi - cameraPhi) * lerpFactor;

        // Keep phi in valid range
        cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi));

        updateCameraPosition();
    }

    // ==========================================
    // 14. DRAW ORBITAL TRAJECTORY (NEW)
    // ==========================================
    function drawOrbitTrajectory(orbitalParams) {
        // Remove existing orbit line
        if (orbitLineMesh) {
            scene.remove(orbitLineMesh);
            if (orbitLineMesh.geometry) orbitLineMesh.geometry.dispose();
            if (orbitLineMesh.material) orbitLineMesh.material.dispose();
        }
        if (orbitPointsMesh) {
            scene.remove(orbitPointsMesh);
            if (orbitPointsMesh.geometry) orbitPointsMesh.geometry.dispose();
            if (orbitPointsMesh.material) orbitPointsMesh.material.dispose();
        }

        if (!orbitalParams) return;

        try {
            const { altitude, inclination } = orbitalParams;
            const orbitRadius = EARTH_RADIUS + parseFloat(altitude) * SCENE_SCALE;
            const inclinationRad = parseFloat(inclination) * (Math.PI / 180);

            // Generate orbit points (simplified circular orbit)
            const segments = 128;
            const orbitPoints = [];

            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;

                // Calculate position on inclined orbit
                const x = orbitRadius * Math.cos(theta);
                const y = orbitRadius * Math.sin(theta) * Math.sin(inclinationRad);
                const z = orbitRadius * Math.sin(theta) * Math.cos(inclinationRad);

                orbitPoints.push(new THREE.Vector3(x, y, z));
            }

            // Create the orbit line
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.4,
                linewidth: 2
            });
            orbitLineMesh = new THREE.Line(orbitGeometry, orbitMaterial);
            scene.add(orbitLineMesh);

            // Add distance markers along the orbit (every 90 degrees)
            const markerPositions = [0, 32, 64, 96]; // 0°, 90°, 180°, 270°
            const markerGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.7
            });

            const markerGroup = new THREE.Group();
            markerPositions.forEach(index => {
                const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
                marker.position.copy(orbitPoints[index]);
                markerGroup.add(marker);

                // Add glow to markers
                const glowGeom = new THREE.SphereGeometry(0.25, 16, 16);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: 0x00d4ff,
                    transparent: true,
                    opacity: 0.3,
                    blending: THREE.AdditiveBlending
                });
                const glow = new THREE.Mesh(glowGeom, glowMat);
                marker.add(glow);
            });

            orbitPointsMesh = markerGroup;
            scene.add(orbitPointsMesh);

            console.log('SceneManager: Orbital trajectory drawn successfully');
        } catch (error) {
            console.warn('SceneManager: Error drawing orbit trajectory', error);
        }
    }

    // ==========================================
    // 15. TOGGLE AUTO-FOLLOW (NEW)
    // ==========================================
    function toggleAutoFollow() {
        autoFollowSatellite = !autoFollowSatellite;
        console.log(`SceneManager: Auto-follow ${autoFollowSatellite ? 'ENABLED' : 'DISABLED'}`);
        return autoFollowSatellite;
    }

    // ==========================================
    // 16. UTILITY: CONVERT LAT/LON/ALT TO VECTOR3
    // ==========================================
    function geodeticToVector3(lat, lon, alt) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const radius = (EARTH_RADIUS + alt * SCENE_SCALE);
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        return new THREE.Vector3(x, y, z);
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    return {
        init: init,
        addLights: addLights,
        addEarth: addEarth,
        addSkybox: addSkybox,
        addCameraControls: addCameraControls,
        updatePlayerSatellite: updatePlayerSatellite,
        updateActiveSatellites: updateActiveSatellites,
        updateDebris: updateDebris,
        highlightCriticalDebris: highlightCriticalDebris,
        onWindowResize: onWindowResize,
        render: render,
        geodeticToVector3: geodeticToVector3,

        updateRelationships: updateRelationships,

        // NEW: Orbital trajectory and camera control
        drawOrbitTrajectory: drawOrbitTrajectory,
        toggleAutoFollow: toggleAutoFollow,

        // Getters for other modules
        getScene: function () { return scene; },
        getCamera: function () { return camera; }
    };
})();

window.SceneManager = SceneManager;
console.log('SceneManager module initialized');