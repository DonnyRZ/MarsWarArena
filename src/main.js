import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import World from './world.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { LightingSystem } from './lighting.js';
import { Player } from './player.js';
import { Physics } from './physics.js';
import { Martian } from './martian.js';
import { WorldBoundary } from './world_boundary.js';

// **Initialize Three.js Components**
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0); // Light blue sky color
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// **Setup Stats**
const stats = new Stats();
document.body.appendChild(stats.dom);

// **Setup OrbitControls**
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true; // Smooth camera movement
orbitControls.dampingFactor = 0.05;
orbitControls.minDistance = 2; // Prevent zooming too close
orbitControls.maxDistance = 100; // Limit zoom out

// **Setup Lighting**
const lightingSystem = new LightingSystem(scene);

// **Create World Instance**
const world = new World(scene);

// **Create World Boundary**
const worldBoundary = new WorldBoundary(world.params);

// **Create Physics Instance with Barriers**
const physics = new Physics(scene, worldBoundary.barriers);

// **Create Player Instance**
const player = new Player(camera, renderer.domElement, scene);

// **Create Martian Instances**
const numMartians = 10;
const worldWidth = world.params.width;
const centerOffset = (worldWidth - 1) / 2;
const spawnMargin = 5; // Keep Martians away from edges initially
for (let i = 0; i < numMartians; i++) {
    const randomX = (Math.random() * (worldWidth - spawnMargin * 2)) - (centerOffset - spawnMargin);
    const randomZ = (Math.random() * (worldWidth - spawnMargin * 2)) - (centerOffset - spawnMargin);
    const startY = 25; // Start high enough to fall onto terrain
    const startPosition = new THREE.Vector3(randomX, startY, randomZ);
    const martianInstance = new Martian(scene, startPosition, world);
    physics.addCreature(martianInstance);
}

// **Add UI**
import createUI from './ui.js';
createUI(world, lightingSystem); // Pass necessary instances to UI creation function

// **Position Camera Initially**
camera.position.set(0, 20, 10); // Good starting overview position
orbitControls.target.copy(player.visualPosition); // Focus on player's visual position initially

// **Event Listeners**
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// **Animation Loop**
const clock = new THREE.Clock();
let previousIsFirstPerson = false;
let previousWeaponEquipped = false;

// Get reference to the crosshair element (assuming it exists in HTML)
const crosshair = document.getElementById('crosshair');
if (!crosshair) {
    console.warn("Crosshair element with ID 'crosshair' not found in HTML.");
}

function animate() {
    let deltaTime = clock.getDelta();
    if (deltaTime > 0.1) deltaTime = 0.1; // Cap delta time to prevent large jumps

    // **Update Game Systems**
    lightingSystem.update(deltaTime);
    physics.update(deltaTime, player, world); // Physics needs player and world info

    // Smooth player visual position towards physics position
    const alpha = 0.2; // Lerp factor for smoothing
    player.visualPosition.lerp(player.position, alpha);
    player.human.updatePosition(player.visualPosition); // Update human model's position

    // **Determine Weapon Equipped State**
    const weaponEquipped = player.human.isSaberEquipped || player.human.isLaserGunEquipped;

    // **Handle View Switching (Visibility Logic)**
    if (player.isFirstPerson && weaponEquipped) {
        // First-person with weapon logic
        if (!previousIsFirstPerson || !previousWeaponEquipped) {
            // Hide main body parts
            player.human.head.visible = false;
            player.human.visor.visible = false;
            player.human.body.visible = false;
            player.human.leftSeam.visible = false;
            player.human.rightSeam.visible = false;
            player.human.oxygenTank.visible = false;
            player.human.upperLeftLeg.visible = false;
            player.human.leftFoot.visible = false;
            player.human.upperRightLeg.visible = false;
            player.human.rightFoot.visible = false;

            // Show crosshair if exists
            if (crosshair) crosshair.classList.remove('hidden');
        }
    } else {
        // Third-person or first-person without weapon
        if (previousIsFirstPerson && previousWeaponEquipped) {
            // Restore visibility of main body parts
            player.human.head.visible = true;
            player.human.visor.visible = true;
            player.human.body.visible = true;
            player.human.leftSeam.visible = true;
            player.human.rightSeam.visible = true;
            player.human.oxygenTank.visible = true;
            player.human.upperLeftLeg.visible = true;
            player.human.leftFoot.visible = true;
            player.human.upperRightLeg.visible = true;
            player.human.rightFoot.visible = true;

            // Hide crosshair if exists
            if (crosshair) crosshair.classList.add('hidden');
        }
    }

    // Update previous states
    previousIsFirstPerson = player.isFirstPerson;
    previousWeaponEquipped = weaponEquipped;

    // **Camera Control Logic**
    if (player.isFirstPerson) {
        orbitControls.enabled = false;
        if (weaponEquipped) {
            // First-person with weapon: eye level
            camera.position.copy(player.visualPosition);
            camera.position.y += player.height * 0.45;
        } else {
            // Player View Updated: Behind-the-player view
            const offset = new THREE.Vector3(0, 0.5, -2); // 5 units up, 10 units back
            const playerQuaternion = player.human.mesh.quaternion;
            const cameraPosition = player.visualPosition.clone().add(offset.applyQuaternion(playerQuaternion));
            camera.position.copy(cameraPosition);
            // Rotation is handled by PointerLockControls in player.js
        }
    } else {
        // Orbital view (third-person)
        orbitControls.enabled = true;
        orbitControls.target.copy(player.visualPosition);
        orbitControls.update();
    }

    // **Update Performance Stats**
    stats.update();

    // **Render the Scene**
    renderer.render(scene, camera);
}

// **Start the Animation Loop**
renderer.setAnimationLoop(animate);