// --- Global State ---
let scene, camera, renderer, composer;
let carGroup;
let cityBuildings = [];
let keys = {};
let gameStarted = false;

// Physics State
let carSpeed = 0;
let carAngle = 0;
let steeringAngle = 0;
let clock = new THREE.Clock();

// Car Configs
const CAR_STATS = {
    'gwagon': { maxSpeed: 100, accel: 30, friction: 15, turnSpeed: 1.5, driftScale: 0.9 },
    'm4': { maxSpeed: 150, accel: 45, friction: 10, turnSpeed: 2.0, driftScale: 0.95 },
    'lambo': { maxSpeed: 200, accel: 60, friction: 8, turnSpeed: 2.5, driftScale: 0.98 }
};
let activeStats;

init();

function init() {
    // 1. Setup Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.002);

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // 3. Setup Renderer & Composer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.5; // Massive neon bloom
    bloomPass.radius = 0.5;
    
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;
    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    scene.add(dirLight);

    // 5. Ground (Neon Grid)
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(2000, 100, 0xa855f7, 0x333333);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);

    // 6. Build Neon City
    buildCity();

    // 7. Inputs
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
    window.addEventListener('resize', onWindowResize);

    // Start render loop
    animate();
}

function buildCity() {
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const neonColors = [0xef4444, 0x3b82f6, 0xa855f7, 0x10b981, 0xf59e0b];
    
    // Create ~200 buildings scattered around, keeping center clear
    for(let i = 0; i < 200; i++) {
        let x = (Math.random() - 0.5) * 1800;
        let z = (Math.random() - 0.5) * 1800;
        
        // Keep center (spawn) clear
        if (Math.abs(x) < 100 && Math.abs(z) < 100) continue;
        
        let width = 10 + Math.random() * 30;
        let depth = 10 + Math.random() * 30;
        let height = 20 + Math.random() * 150;
        
        let mat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a2e,
            roughness: 0.2,
            metalness: 0.8
        });
        
        // Randomly assign neon emissive edges
        if (Math.random() > 0.5) {
            mat.emissive = new THREE.Color(neonColors[Math.floor(Math.random() * neonColors.length)]);
            mat.emissiveIntensity = 0.5;
        }

        let mesh = new THREE.Mesh(buildingGeo, mat);
        mesh.position.set(x, height/2, z);
        mesh.scale.set(width, height, depth);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { w: width, d: depth }; // Store for collision
        
        scene.add(mesh);
        cityBuildings.push(mesh);
    }
}

function buildCar(type) {
    if (carGroup) scene.remove(carGroup);
    carGroup = new THREE.Group();
    
    function createBox(w, h, d, color, yOffset, zOffset, isEmissive = false) {
        let geo = new THREE.BoxGeometry(w, h, d);
        let mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.6 });
        if (isEmissive) {
            mat.emissive = new THREE.Color(color);
            mat.emissiveIntensity = 2.0; // Glow with bloom
        }
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, yOffset, zOffset);
        mesh.castShadow = true;
        carGroup.add(mesh);
        return mesh;
    }
    
    function createGlass(w, h, d, yOffset, zOffset, slope = 0) {
        let geo = new THREE.BoxGeometry(w, h, d);
        let mat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 1.0, transparent: true, opacity: 0.7 });
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, yOffset, zOffset);
        mesh.rotation.x = slope;
        carGroup.add(mesh);
        return mesh;
    }

    function createWheel(x, y, z, radius, thick) {
        let geo = new THREE.CylinderGeometry(radius, radius, thick, 16);
        let mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        let mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        carGroup.add(mesh);
    }
    
    // Stylized Detailed Models
    if (type === 'gwagon') {
        // G-Wagon: Boxy, tall, black
        createBox(3.5, 1.5, 8, 0x222222, 2.5, 0); // Lower body
        createBox(3.5, 1.5, 5, 0x111111, 4.0, -0.5); // Cabin roof
        
        // Glass
        createGlass(3.6, 1.2, 4.8, 3.8, -0.5); // Windows
        
        // Details
        createBox(3.0, 0.5, 0.2, 0x111111, 2.8, 4.1); // Grille
        let hl1 = createBox(0.5, 0.5, 0.1, 0xffffff, 2.8, 4.1, true); // Headlight L
        hl1.position.x = 1.2;
        let hl2 = createBox(0.5, 0.5, 0.1, 0xffffff, 2.8, 4.1, true); // Headlight R
        hl2.position.x = -1.2;
        
        createBox(0.8, 0.2, 0.1, 0xff0000, 2.8, -4.1, true).position.x = 1.2; // Taillights
        createBox(0.8, 0.2, 0.1, 0xff0000, 2.8, -4.1, true).position.x = -1.2;
        createWheel(0, 3.0, -4.2, 1.0, 0.5); // Spare tire
        
        // Wheels (High suspension)
        createWheel(-2.0, 1.2, 2.5, 1.2, 0.8);
        createWheel(2.0, 1.2, 2.5, 1.2, 0.8);
        createWheel(-2.0, 1.2, -2.5, 1.2, 0.8);
        createWheel(2.0, 1.2, -2.5, 1.2, 0.8);
    } 
    else if (type === 'm4') {
        // M4: Sleek, blue
        createBox(3.8, 1.0, 8.5, 0x1d4ed8, 1.5, 0); // Lower body
        
        // Sloped Cabin
        createBox(3.5, 1.2, 4, 0x111111, 2.5, -0.5).rotation.x = -0.1;
        createGlass(3.6, 1.0, 3.8, 2.5, -0.5, -0.1);
        
        // Details
        createBox(3.5, 0.2, 1.0, 0x111111, 2.2, -4.5).rotation.x = 0.2; // Spoiler
        let hl1 = createBox(0.6, 0.3, 0.1, 0xffffff, 1.8, 4.3, true); hl1.position.x = 1.4;
        let hl2 = createBox(0.6, 0.3, 0.1, 0xffffff, 1.8, 4.3, true); hl2.position.x = -1.4;
        let tl1 = createBox(0.8, 0.2, 0.1, 0xff0000, 1.8, -4.3, true); tl1.position.x = 1.3;
        let tl2 = createBox(0.8, 0.2, 0.1, 0xff0000, 1.8, -4.3, true); tl2.position.x = -1.3;
        
        // Wheels
        createWheel(-2.0, 1.0, 2.5, 1.0, 0.6);
        createWheel(2.0, 1.0, 2.5, 1.0, 0.6);
        createWheel(-2.0, 1.0, -2.5, 1.0, 0.6);
        createWheel(2.0, 1.0, -2.5, 1.0, 0.6);
    }
    else if (type === 'lambo') {
        // Lambo: Flat, wedge, yellow
        createBox(4.0, 1.2, 9, 0xeab308, 1.2, 0).rotation.x = 0.05; // Wedge body
        createBox(3.6, 0.8, 4, 0x111111, 2.0, -0.5).rotation.x = 0.1; // Cabin
        createGlass(3.7, 0.7, 3.8, 2.0, -0.5, 0.1);
        
        // Details
        let hl1 = createBox(0.8, 0.1, 0.1, 0xffffff, 1.3, 4.5, true); hl1.position.x = 1.5; hl1.rotation.y = 0.2;
        let hl2 = createBox(0.8, 0.1, 0.1, 0xffffff, 1.3, 4.5, true); hl2.position.x = -1.5; hl2.rotation.y = -0.2;
        let tl = createBox(3.8, 0.1, 0.1, 0xff0000, 1.5, -4.5, true); // massive tail light bar
        createBox(4.2, 0.1, 1.5, 0x111111, 1.8, -4.8).rotation.x = 0.3; // Huge wing

        // Wheels
        createWheel(-2.2, 0.8, 3.0, 0.8, 0.6);
        createWheel(2.2, 0.8, 3.0, 0.8, 0.6);
        createWheel(-2.2, 0.8, -3.0, 0.8, 0.6);
        createWheel(2.2, 0.8, -3.0, 0.8, 0.6);
    }
    
    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);
}

// Global hook for Garage UI
window.selectCar = function(type) {
    document.getElementById('garage-menu').classList.add('hidden');
    activeStats = CAR_STATS[type];
    buildCar(type);
    
    // Reset Physics
    carSpeed = 0;
    carAngle = 0;
    carGroup.position.set(0,0,0);
    carGroup.rotation.set(0,0,0);
    
    gameStarted = true;
};

// Physics update
function updatePhysics(dt) {
    if (!activeStats || !carGroup) return;

    // Steering
    if (keys['a']) steeringAngle += 2 * dt;
    if (keys['d']) steeringAngle -= 2 * dt;
    if (!keys['a'] && !keys['d']) {
        steeringAngle *= 0.8; // Return to center
    }
    // Cap steering
    steeringAngle = Math.max(-1, Math.min(1, steeringAngle));

    // Acceleration & Braking
    if (keys['w']) {
        carSpeed += activeStats.accel * dt;
    } else if (keys['s']) {
        carSpeed -= activeStats.accel * dt; // Reverse / Brake
    } else if (keys[' ']) {
        // Handbrake
        carSpeed *= 0.95;
    } else {
        // Natural Friction
        if (carSpeed > 0) carSpeed -= activeStats.friction * dt;
        if (carSpeed < 0) carSpeed += activeStats.friction * dt;
    }

    // Speed Cap
    carSpeed = Math.max(-activeStats.maxSpeed/2, Math.min(activeStats.maxSpeed, carSpeed));
    if (Math.abs(carSpeed) < 0.1) carSpeed = 0;

    // Apply Steering based on speed (cant turn if stopped)
    let turnFactor = (carSpeed / activeStats.maxSpeed);
    if (turnFactor > 1) turnFactor = 1;
    if (carSpeed < 0) turnFactor = -turnFactor; // Reverse steering polarity
    
    carAngle += steeringAngle * activeStats.turnSpeed * turnFactor * dt;
    
    // Drifting Visuals
    let driftAngle = steeringAngle * turnFactor * activeStats.driftScale;
    carGroup.rotation.y = carAngle + driftAngle;

    // Velocity Vector
    let vx = Math.sin(carAngle) * carSpeed;
    let vz = Math.cos(carAngle) * carSpeed;

    // Building Collision Check
    let nextX = carGroup.position.x + vx * dt;
    let nextZ = carGroup.position.z + vz * dt;
    let collision = false;
    let carRadius = 4; // Approx car bounds
    
    for (let b of cityBuildings) {
        let bw = b.userData.w / 2;
        let bd = b.userData.d / 2;
        if (nextX > b.position.x - bw - carRadius && nextX < b.position.x + bw + carRadius &&
            nextZ > b.position.z - bd - carRadius && nextZ < b.position.z + bd + carRadius) {
            collision = true;
            break;
        }
    }
    
    if (collision) {
        carSpeed = 0; // CRASH
    } else {
        carGroup.position.x = nextX;
        carGroup.position.z = nextZ;
    }

    // Update UI (Convert to KM/H)
    let kmh = Math.abs(Math.floor(carSpeed * 1.609));
    document.getElementById('speed-val').innerText = kmh;
}

function updateCamera() {
    if (!carGroup) return;

    // Chase Camera calculations
    let camDist = 20;
    let camHeight = 8;
    
    // Position camera behind car
    let goalX = carGroup.position.x - Math.sin(carAngle) * camDist;
    let goalZ = carGroup.position.z - Math.cos(carAngle) * camDist;
    let goalY = carGroup.position.y + camHeight;
    
    // Lerp camera for smoothness
    camera.position.x += (goalX - camera.position.x) * 0.1;
    camera.position.y += (goalY - camera.position.y) * 0.1;
    camera.position.z += (goalZ - camera.position.z) * 0.1;
    
    // Look ahead of the car
    let lookAtTarget = new THREE.Vector3(
        carGroup.position.x + Math.sin(carAngle) * 10,
        carGroup.position.y + 2,
        carGroup.position.z + Math.cos(carAngle) * 10
    );
    camera.lookAt(lookAtTarget);
}

function animate() {
    requestAnimationFrame(animate);
    
    let dt = clock.getDelta();
    if (dt > 0.1) dt = 0.1; // cap
    
    if (gameStarted) {
        updatePhysics(dt);
        updateCamera();
    }
    
    composer.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
