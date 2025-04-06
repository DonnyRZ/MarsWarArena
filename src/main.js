import * as THREE from 'three';
import World from './world.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { LightingSystem } from './lighting.js';
import { Player } from './player.js';
import { Physics } from './physics.js';
import { Martian } from './martian.js';
import { WorldBoundary } from './world_boundary.js';
import { Menu } from './menu.js';
import { POV } from './camera.js';
import { AudioManager } from './AudioManager.js';

// Initialize Three.js Components
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const activeLaserBeams = [];

const stats = new Stats();
document.body.appendChild(stats.dom);

const lightingSystem = new LightingSystem(scene);
const world = new World(scene);
const worldBoundary = new WorldBoundary(world.params);
const physics = new Physics(scene, worldBoundary.barriers);

// Initialize AudioManager and load sounds
const audioManager = new AudioManager();
// Updated paths to match the exact case of the file names
audioManager.loadSound('laser', 'sfx/laser.MP3');
audioManager.loadSound('impact_martian', 'sfx/impact_martian.MP3');

// Create Player with audioManager
const player = new Player(camera, renderer.domElement, scene, activeLaserBeams, physics, world, audioManager);

const numMartians = 20;
const worldWidth = world.params.width;
const centerOffset = (worldWidth - 1) / 2;
const spawnMargin = 5;
for (let i = 0; i < numMartians; i++) {
    const randomX = (Math.random() * (worldWidth - spawnMargin * 2)) - (centerOffset - spawnMargin);
    const randomZ = (Math.random() * (worldWidth - spawnMargin * 2)) - (centerOffset - spawnMargin);
    const startY = 25;
    const startPosition = new THREE.Vector3(randomX, startY, randomZ);
    const martianInstance = new Martian(scene, startPosition, world);
    physics.addCreature(martianInstance);
}

const menu = new Menu();
const crosshair = document.getElementById('crosshair');
if (!crosshair) {
    console.warn("Crosshair element with ID 'crosshair' not found in HTML.");
}

const pov = new POV(camera, player, crosshair);

// Event Listeners
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'm' || event.key === 'M') {
        menu.toggle();
    } else if (event.key === 't') { // Test laser sound
        audioManager.playSound('laser');
    } else if (event.key === 'y') { // Test impact sound
        audioManager.playSound('impact_martian');
    }
});

document.addEventListener('click', () => {
    if (!menu.isOpen() && !player.isFrontViewRequested) {
        player.controls.lock();
    }
});

// Resume audio context on controls lock
player.controls.addEventListener('lock', () => {
    player.isFirstPerson = true;
    if (player.audioManager.context.state === 'suspended') {
        player.audioManager.context.resume();
    }
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    let deltaTime = clock.getDelta();
    if (deltaTime > 0.1) deltaTime = 0.1;

    if (!menu.isOpen()) {
        physics.update(deltaTime, player, world);

        // Remove dead Martians
        physics.creatures = physics.creatures.filter(creature => {
            if (creature.isDead) {
                scene.remove(creature.mesh);
                return false;
            }
            return true;
        });

        lightingSystem.update(deltaTime);

        const alpha = 0.2;
        player.visualPosition.lerp(player.position, alpha);
        player.human.updatePosition(player.visualPosition);

        physics.creatures.forEach(creature => {
            if (creature.mesh) {
                creature.visualPosition.lerp(creature.position, alpha);
                creature.mesh.position.copy(creature.visualPosition);
            }
        });

        pov.update();

        const currentTime = performance.now();
        for (let i = activeLaserBeams.length - 1; i >= 0; i--) {
            const beam = activeLaserBeams[i];
            if (currentTime >= beam.despawnTime) {
                scene.remove(beam.mesh);
                beam.mesh.geometry.dispose();
                beam.mesh.material.dispose();
                activeLaserBeams.splice(i, 1);
            }
        }
    }

    stats.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
