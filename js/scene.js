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

    // Camera control state
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraDistance = 20;
    let cameraTheta = Math.PI / 4;
    let cameraPhi = Math.PI / 3;

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

                // Subtle atmosphere glow
                const atmoGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 64, 64);
                const atmoMat = new THREE.MeshBasicMaterial({
                    color: 0x2e96ff,
                    transparent: true,
                    opacity: 0.06,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                atmosphereMesh = new THREE.Mesh(atmoGeom, atmoMat);
                scene.add(atmosphereMesh);

                console.log('SceneManager: Earth + atmosphere loaded successfully');
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
    // 6. UPDATE PLAYER SATELLITE FUNCTION
    // ==========================================
    function updatePlayerSatellite(position) {
        if (!playerSatelliteMesh) {
            // Satellite sprite
            const sprite = createIconSprite(textures.satellite, 0.55);
            sprite.position.copy(position);
            scene.add(sprite);

            // Subtle glow ring (billboard too)
            const glowGeometry = new THREE.CircleGeometry(0.42, 32);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.18,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.rotation.x = -Math.PI / 2;
            sprite.add(glow);

            playerSatelliteMesh = sprite;

            console.log('SceneManager: Player satellite sprite created');
        } else {
            playerSatelliteMesh.position.copy(position);
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
    // 8. UPDATE DEBRIS FUNCTION (Sprites)
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
            const sprite = createIconSprite(textures.debris, 0.22);
            sprite.position.copy(positions[i]);
            scene.add(sprite);
            debrisMeshes.push(sprite);
        }

        console.log(`SceneManager: Updated ${limit} debris objects (sprites)`);
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
    // 12. RENDER FUNCTION AND ANIMATE EARTH
    // ==========================================
    function animate() {
        if (earthMesh) earthMesh.rotation.y += 0.0008;
        if (atmosphereMesh) atmosphereMesh.rotation.y += 0.0008;
    }
    function render() {
        if (!renderer || !scene || !camera) return;
        animate();
        renderer.render(scene, camera);
    }

    // ==========================================
    // 13. UTILITY: CONVERT LAT/LON/ALT TO VECTOR3
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

        // Getters for other modules
        getScene: function () { return scene; },
        getCamera: function () { return camera; }
    };
})();

window.SceneManager = SceneManager;
console.log('SceneManager module initialized');