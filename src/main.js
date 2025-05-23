// --- START OF FILE main.js ---

// src/main.js
// ... (other comments)

import * as THREE from 'three';
import { MathUtils } from 'three/src/math/MathUtils.js';
import { MarsBaseWorld } from './MarsBaseWorld.js';
import { MartianHuntWorld } from './MartianHuntWorld.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { LightingSystem } from './lighting.js';
import { Player } from './player.js';
import { Physics } from './physics.js';
import { Martian } from './martian.js';
import { Ghast } from './Ghast.js';
import { Fireball } from './Fireball.js';
import { WorldBoundary } from './world_boundary.js';
import { Menu } from './menu.js';
import { PortalMenu } from './PortalMenu.js';
import { POV } from './camera.js';
import { AudioManager } from './AudioManager.js';
import { EntityManager } from './EntityManager.js';
import { RadarDisplay } from './RadarDisplay.js';
import { RadarManager } from './RadarManager.js';
import { MobileControls } from './MobileControls.js';

// --- Global Variables ---
let scene, camera, renderer, stats, clock;
let lightingSystem, physics, player, pov, menu, crosshair, audioManager;
let portalMenu;
let gameStateManager;
let entityManager;
let timerDisplayElement, timerValueElement;
let martianCountDisplayElement, martianCountValueElement;
let radarDisplay;
let radarManager;
let playerHealthBarContainerElement, playerHealthBarFillElement, playerHealthTextElement;
let mobileControls;
let isMobile = false; // This will be set in init()
let mobileMenuButtonElement; 

let world = null;
let worldBoundary = null;
let activeGhasts = [];
let ghastTerritories = [];
const huntDuration = 300.0;

const _cameraEuler = new THREE.Euler(0,0,0, 'YXZ');

// +++ Helper Function for Mobile UI Visibility ++++++++++
function updateMobileUIVisibility() {
    if (!isMobile) return; 

    const showMobileUI = 
        !menu.isOpen() &&
        !portalMenu.isOpen() &&
        (player ? !player.isDead : true) && 
        (gameStateManager ? !gameStateManager.isTransitioning : true); 

    if (showMobileUI) {
        if (mobileControls && mobileControls.isValid) {
            mobileControls.show();
        }
        if (mobileMenuButtonElement) {
            mobileMenuButtonElement.classList.remove('hidden');
        }
    } else {
        if (mobileControls && mobileControls.isValid) {
            mobileControls.hide();
        }
        if (mobileMenuButtonElement) {
            mobileMenuButtonElement.classList.add('hidden');
        }
    }
}
// +++ End Helper Function +++++++++++++++++++++++++++++++++++++


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++ Game State Manager Definition ++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
class GameStateManager {
    constructor() {
        this.gameState = 'MARS_BASE';
        this.isTransitioning = false;
        this.huntTimerRemaining = 0;
        this.justClosedPortalMenu = false;
        console.log("GameStateManager Initialized.");
    }

    cleanupCurrentWorld() {
        console.log("Cleaning up current world (via GameStateManager)...");
        if (world && typeof world.disposeMeshes === 'function') {
            world.disposeMeshes();
        }
        if (entityManager) {
            entityManager.clearAllManagedEntities();
        }
        activeGhasts.forEach(ghast => {
             if (ghast && ghast.mesh && ghast.mesh.parent) {
                 scene.remove(ghast.mesh);
             }
        });
        activeGhasts.length = 0;
        if (physics) {
            if (physics.creatures && physics.creatures.length > 0) {
                physics.creatures.forEach(creature => {
                    if (creature && creature.mesh && creature.mesh.parent) {
                        scene.remove(creature.mesh);
                         if (creature.mesh.geometry) creature.mesh.geometry.dispose();
                         if (creature.mesh.material) { if (Array.isArray(creature.mesh.material)) creature.mesh.material.forEach(m => m.dispose()); else creature.mesh.material.dispose(); }
                    }
                });
                physics.creatures.length = 0;
            }
            physics.barriers = [];
            physics.accumulatedTime = 0;
        }
        ghastTerritories.length = 0;
        if (timerDisplayElement) timerDisplayElement.classList.add('hidden');
        if (martianCountDisplayElement) martianCountDisplayElement.classList.add('hidden');
        if (playerHealthBarContainerElement) playerHealthBarContainerElement.classList.add('hidden');
        if (radarDisplay) {
            radarDisplay.setVisibility(false);
            radarDisplay.setWorldExtents(null);
        }
        
        updateMobileUIVisibility(); 

        world = null;
        worldBoundary = null;
        console.log("World cleanup complete (via GameStateManager).");
    }

    async loadMarsBase() {
        this.isTransitioning = true;
        console.log("Starting loadMarsBase...");
        this.cleanupCurrentWorld(); 
        this.gameState = 'MARS_BASE';
        console.log("Loading Mars Base (via GameStateManager)...");
        world = new MarsBaseWorld(scene);
        await world.generate();
        worldBoundary = new WorldBoundary(world.params);

        if (radarManager && world) {
            radarManager.updateWorldExtents(world);
        }

        if (physics) {
            physics.barriers = worldBoundary.barriers;
            physics.creatures.length = 0;
        }
        if (player) {
            const spawnPos = this.getMarsBasePlayerSpawnPosition();
            player.world = world; 
            player.activeGhasts = activeGhasts; 
            player.isMobileContext = isMobile; 
            player.resetState(spawnPos); 
        }
        if (player && player.controls && player.controls.isLocked) {
             console.log("Unlocking controls during loadMarsBase");
             player.unlockIntentional = true;
             player.controls.unlock(); 
        }
        if (radarDisplay) radarDisplay.setVisibility(true);
        if (playerHealthBarContainerElement) playerHealthBarContainerElement.classList.remove('hidden');
        
        this.isTransitioning = false;
        updateMobileUIVisibility(); 
        console.log("Mars Base Loaded (via GameStateManager).");
    }

    getMarsBasePlayerSpawnPosition() {
        if (!world || world.minFlatX === undefined || world.worldCenterOffset === undefined) return new THREE.Vector3(0, 5, 0);
        const centerOffset = world.worldCenterOffset; const spawnOffset = 5; const flatCenterZGrid = Math.floor((world.minFlatZ + world.maxFlatZ) / 2);
        const spawnZ = flatCenterZGrid - centerOffset; const targetGridX = world.minFlatX - spawnOffset; const spawnX = targetGridX - centerOffset;
        let groundY = 1; let foundGround = false;
        if (world && world.params && world.params.height) { for (let y = world.params.height - 1; y >= 0; y--) { const block = world.getBlock(targetGridX, y, flatCenterZGrid); if (block && block.id !== 'air') { groundY = y + 1.0; foundGround = true; break; } } }
        if (!foundGround) console.warn(`Could not find ground at Mars Base spawn (${targetGridX}, ${flatCenterZGrid}). Using default Y=1.`);
        const spawnY = groundY + 0.1; return new THREE.Vector3(spawnX, spawnY, spawnZ);
    }

    setMarsBasePlayerPosition() {
        if (!player) return;
        const spawnPos = this.getMarsBasePlayerSpawnPosition();
        player.position.copy(spawnPos);
        player.velocity.set(0, 0, 0);
        player.visualPosition.copy(player.position);
        player.onGround = false;
        if (player.human) player.human.updatePosition(player.visualPosition);
        console.log(`Initial player position set OUTSIDE Mars Base flat area at world coords: (${spawnPos.x.toFixed(2)}, ${spawnPos.y.toFixed(2)}, ${spawnPos.z.toFixed(2)})`);
    }

    async switchToMartianHunt() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        console.log("Transitioning to Martian Hunt (via GameStateManager)...");
        this.cleanupCurrentWorld(); 
        this.gameState = 'MARTIAN_HUNT';
        world = new MartianHuntWorld(scene);
        await world.generate();
        worldBoundary = new WorldBoundary(world.params);

        if (radarManager && world) {
            radarManager.updateWorldExtents(world);
        }

        if (physics) {
            physics.barriers = worldBoundary.barriers;
            physics.creatures.length = 0;
        }
        const targetWorldX = 0; const targetWorldZ = 0; let groundY = 5;
        if (world && world.worldCenterOffset !== undefined && world.params && world.params.height) { const centerOffset = world.worldCenterOffset; const gridX = Math.floor(targetWorldX + centerOffset); const gridZ = Math.floor(targetWorldZ + centerOffset); let foundGround = false; for (let y = Math.min(world.params.height - 1, 15); y >= 0; y--) { const block = world.getBlock(gridX, y, gridZ); if (block && block.id !== 'air') { groundY = y + 1.0; foundGround = true; break; } } if (!foundGround) console.warn(`Could not find ground at player spawn (${gridX}, ${gridZ}). Using default Y.`); } else { console.error("Cannot calculate ground height for Hunt spawn: World data missing."); }
        const spawnClearance = 0.1; const huntSpawnY = groundY + spawnClearance; const huntSpawnPos = new THREE.Vector3(targetWorldX, huntSpawnY, targetWorldZ);
        player.world = world; 
        player.activeGhasts = activeGhasts; 
        player.isMobileContext = isMobile; 
        player.resetState(huntSpawnPos); 

        spawnMartians();
        spawnGhasts();
        this.huntTimerRemaining = huntDuration;
        if (timerDisplayElement && timerValueElement) { timerValueElement.textContent = this.huntTimerRemaining.toFixed(1); timerDisplayElement.classList.remove('hidden'); }
        if (martianCountDisplayElement) martianCountDisplayElement.classList.remove('hidden');
        if (playerHealthBarContainerElement) playerHealthBarContainerElement.classList.remove('hidden');
        if (radarDisplay) radarDisplay.setVisibility(true);
        
        this.isTransitioning = false;
        updateMobileUIVisibility(); 
        console.log("Martian Hunt Loaded (via GameStateManager).");

        if (player && player.controls && !menu.isOpen() && !portalMenu.isOpen()) {
            if (!isMobile) {
                setTimeout(() => {
                    if (!menu.isOpen() && !portalMenu.isOpen() && !this.isTransitioning) {
                        console.log("Attempting lock after hunt load (desktop)");
                        player.controls.lock();
                    }
                }, 100);
            }
        }
    }

    closePortalMenu() {
        console.log("Portal menu closed, returning to base (via GameStateManager).");
        portalMenu.hide();
        this.justClosedPortalMenu = true;
        
        updateMobileUIVisibility(); 

        if (player && world && world.portalCenterWorld) { try { const portalCenter = world.portalCenterWorld; const playerPos = player.position; const pushbackDistance = 4.0; const direction = new THREE.Vector3().subVectors(playerPos, portalCenter); direction.y = 0; if (direction.lengthSq() > 0.001) direction.normalize(); else direction.set(1, 0, 0); const pushbackVector = direction.multiplyScalar(pushbackDistance); const newPosition = portalCenter.clone().add(pushbackVector); newPosition.y = playerPos.y; player.position.copy(newPosition); player.visualPosition.copy(newPosition); player.velocity.set(0, 0, 0); if (player.human && typeof player.human.updatePosition === 'function') player.human.updatePosition(player.visualPosition); console.log(`Player pushed back from portal to: ${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)}`); if (player.controls && !menu.isOpen() && !isMobile) setTimeout(() => { if (!menu.isOpen() && !portalMenu.isOpen() && !this.isTransitioning) player.controls.lock(); }, 100); } catch (error) { console.error("Error during player pushback:", error); if (player && player.controls && !menu.isOpen() && !isMobile) setTimeout(() => { if (!menu.isOpen() && !portalMenu.isOpen() && !this.isTransitioning) player.controls.lock(); }, 100); } } else { console.warn("Cannot push player back: Player or World/Portal data missing."); if (player && player.controls && !menu.isOpen() && !isMobile) setTimeout(() => { if (!menu.isOpen() && !portalMenu.isOpen() && !this.isTransitioning) player.controls.lock(); }, 100); }
    }

    async update(deltaTime, player, world, portalMenu, timerValueElement, menu) {
        if (this.isTransitioning) {
            updateMobileUIVisibility(); 
            return true;
        }

        if (player.isDead && !this.isTransitioning) {
            console.log("!!! Player death condition met! Attempting transition to base...");
            this.isTransitioning = true; 
            updateMobileUIVisibility();   
            try {
                await this.loadMarsBase(); 
                console.log("...Transition to base (loadMarsBase) completed successfully.");
                return true;
            } catch (error) {
                 console.error("!!!!! Error during loadMarsBase after player death:", error);
                 this.isTransitioning = false; 
                 updateMobileUIVisibility();   
                 return true; 
            }
        }

        if (this.gameState === 'MARTIAN_HUNT') {
            if (!menu.isOpen()) {
                this.huntTimerRemaining -= deltaTime;
            }
            if (this.huntTimerRemaining <= 0) {
                this.huntTimerRemaining = 0;
                if (!this.isTransitioning) {
                    console.log("Hunt timer expired! Attempting transition to base...");
                    this.isTransitioning = true; 
                    updateMobileUIVisibility();   
                    try {
                        await this.loadMarsBase(); 
                        console.log("...Transition to base (timer expired) completed successfully.");
                        return true;
                    } catch (error) {
                        console.error("!!!!! Error during loadMarsBase after timer expired:", error);
                        this.isTransitioning = false; 
                        updateMobileUIVisibility();   
                        return true;
                    }
                }
            }
            if (timerValueElement) timerValueElement.textContent = this.huntTimerRemaining.toFixed(1);
        }

        if (this.gameState === 'MARS_BASE' && !menu.isOpen() && !portalMenu.isOpen()) {
            if (player && player.position && world.portalCenterWorld) {
                const distanceSq = player.position.distanceToSquared(world.portalCenterWorld);
                if (distanceSq < world.portalTriggerRadiusSq && !this.justClosedPortalMenu) {
                    const title = "MEAT COLLECTION: HUNTING MARS ANIMAL";
                    const description = "Prepare for the hunt!";
                    if (player.controls.isLocked) {
                        player.unlockIntentional = true;
                        player.controls.unlock(); 
                    }
                    portalMenu.show(title, description);
                    updateMobileUIVisibility(); 
                    if (player.velocity) { player.velocity.x = 0; player.velocity.z = 0; }
                }
            }
            if (this.justClosedPortalMenu) this.justClosedPortalMenu = false;
        }
        return false;
    }
}
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++ End Game State Manager Definition ++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// --- Initialization ---
async function init() {
    isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
    if (isMobile) {
        console.log("Mobile device detected.");
        document.body.classList.add('is-mobile');
    } else {
        console.log("Desktop device detected.");
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    clock = new THREE.Clock();
    stats = new Stats();
    document.body.appendChild(stats.dom);
    lightingSystem = new LightingSystem(scene);
    audioManager = new AudioManager();
    audioManager.loadSound('laser', 'public/sfx/laser.MP3');
    audioManager.loadSound('impact_martian', 'public/sfx/impact_martian.MP3');
    gameStateManager = new GameStateManager();
    
    menu = new Menu(updateMobileUIVisibility, isMobile); 
    
    portalMenu = new PortalMenu(
        async () => { 
            await gameStateManager.switchToMartianHunt.bind(gameStateManager)();
            updateMobileUIVisibility(); 
        },
        () => { 
            gameStateManager.closePortalMenu.bind(gameStateManager)();
        }
    );
    window.menu = menu; 
    window.portalMenu = portalMenu;

    timerDisplayElement = document.getElementById('timer-display');
    timerValueElement = document.getElementById('timer-value');
    if (!timerDisplayElement || !timerValueElement) { console.error("Timer display elements not found!"); }
    else { timerDisplayElement.classList.add('hidden'); }

    martianCountDisplayElement = document.getElementById('martian-count-display');
    martianCountValueElement = document.getElementById('martian-count-value');
    if (!martianCountDisplayElement || !martianCountValueElement) { console.error("Martian count display elements not found!"); }
    else { martianCountDisplayElement.classList.add('hidden'); }

    playerHealthBarContainerElement = document.getElementById('player-health-bar-container');
    playerHealthBarFillElement = document.getElementById('player-health-bar-fill');
    playerHealthTextElement = document.getElementById('player-health-text');
    if (!playerHealthBarContainerElement || !playerHealthBarFillElement || !playerHealthTextElement) { console.error("Player health bar UI elements not found!"); }
    else { playerHealthBarContainerElement.classList.add('hidden'); }

    mobileMenuButtonElement = document.getElementById('mobile-menu-button');
    if (isMobile && !mobileMenuButtonElement) {
        console.error("Mobile menu button element not found in DOM!");
    } else if (!isMobile && mobileMenuButtonElement) {
        mobileMenuButtonElement.classList.add('hidden');
    }


    radarDisplay = new RadarDisplay('radar-canvas', {
         range: 60, edgeIndicatorRange: 75, playerColor: 'cyan',
         martianColor: '#e74c3c', ghastColor: '#9b59b6', playerMarkerSize: 12,
         martianDotRadius: 3.5, ghastMarkerSize: 7, edgeMarkerSize: 5,
         showRangeRing: true, rangeRingColor: 'rgba(50, 205, 50, 0.5)',
         backgroundColor: 'rgba(10, 30, 10, 0.5)', worldEdgeColor: 'rgba(100, 100, 255, 0.3)'
    });
    if (!radarDisplay.ctx) { radarDisplay = null; console.error("Radar Display context failed to initialize."); }

    physics = new Physics(scene, []);
    await gameStateManager.loadMarsBase(); 

    player = new Player(camera, renderer.domElement, scene, physics, world, audioManager, activeGhasts, isMobile);
    entityManager = new EntityManager( scene, physics.creatures, activeGhasts );
    player.entityManager = entityManager;

    if (isMobile && player && player.inputHandler) {
        mobileControls = new MobileControls(
            player.inputHandler,
            player,
            document.body 
        );
        if (mobileControls.isValid) {
            window.mobileControls = mobileControls;
        } else {
            console.error("Failed to initialize MobileControls properly.");
            mobileControls = null;
        }
    }
    
    updateMobileUIVisibility(); 

    if (radarDisplay && player && physics && gameStateManager) {
        radarManager = new RadarManager(radarDisplay, player, physics, activeGhasts, gameStateManager);
        if (world && radarManager.isValid) {
             radarManager.updateWorldExtents(world);
        }
    } else { console.error("Could not initialize RadarManager due to missing dependencies."); }

    gameStateManager.setMarsBasePlayerPosition();
    crosshair = document.getElementById('crosshair');
    pov = new POV(camera);
    setupEventListeners();

     if (player && camera && pov && player.human && player.human.mesh) {
         const initialPlayerPos = player.visualPosition;
         const initialPlayerOrient = player.human.mesh.quaternion;
         const offset = new THREE.Vector3(0, 0.5, -2);
         offset.applyQuaternion(initialPlayerOrient);
         const cameraPosition = initialPlayerPos.clone().add(offset);
         camera.position.copy(cameraPosition);
         camera.lookAt(initialPlayerPos);
     } else { console.warn("Could not set initial camera position."); }

    renderer.setAnimationLoop(animate); // This line was present in init() in your HEAD version
    console.log("Initialization Complete. Game State:", gameStateManager.gameState);
}

// --- Creature Spawning ---
function spawnMartians() {
    if (gameStateManager.gameState !== 'MARTIAN_HUNT' || !world || !physics || !world.params) return;
    const numMartians = 10;
    console.log("Spawning Martians...");
    if (physics.creatures.length > 0) { physics.creatures.length = 0; }
    const worldWidth = world.params.width; const centerOffset = world.worldCenterOffset; const spawnMargin = 10;
    for (let i = 0; i < numMartians; i++) { const randomX = MathUtils.randFloat(-centerOffset + spawnMargin, worldWidth - 1 - centerOffset - spawnMargin); const randomZ = MathUtils.randFloat(-centerOffset + spawnMargin, worldWidth - 1 - centerOffset - spawnMargin); const gridX = Math.floor(randomX + centerOffset); const gridZ = Math.floor(randomZ + centerOffset); let groundY = 5; let foundGround = false; for (let y = world.params.height - 1; y >= 0; y--) { const block = world.getBlock(gridX, y, gridZ); if (block && block.id !== 'air') { groundY = y + 1.0; foundGround = true; break; } } const startY = groundY + 0.5; const startPosition = new THREE.Vector3(randomX, startY, randomZ); try { const martianInstance = new Martian(scene, startPosition, world); physics.addCreature(martianInstance); } catch (error) { console.error("Error creating Martian:", error); } } console.log(`Spawned ${physics.creatures.length} Martians.`);
}
function spawnGhasts() {
    if (gameStateManager.gameState !== 'MARTIAN_HUNT' || !world || !scene || world.worldCenterOffset === undefined || !world.params || !entityManager) return;
    const numGhasts = 3;
    console.log("Spawning Ghasts and defining territories...");
    if (activeGhasts.length > 0) { activeGhasts.length = 0; }
    ghastTerritories = [];
    const worldWidth = world.params.width; const centerOffset = world.worldCenterOffset; const worldMinCoord = -centerOffset; const worldMaxCoord = worldWidth - 1 - centerOffset; const spawnMargin = 5; const territoryMargin = 0.5; const totalPlayableWidth = worldMaxCoord - worldMinCoord; if (totalPlayableWidth <= 0 || numGhasts <= 0) return; const territoryWidth = Math.max(1, (totalPlayableWidth - (numGhasts - 1) * territoryMargin) / numGhasts);
    for (let i = 0; i < numGhasts; i++) { const minX = worldMinCoord + i * (territoryWidth + territoryMargin); const maxX = minX + territoryWidth; const territory = { minX, maxX, minZ: worldMinCoord, maxZ: worldMaxCoord }; ghastTerritories.push(territory); }
    for (let i = 0; i < numGhasts; i++) {
        const territory = ghastTerritories[i];
        const randomX = MathUtils.randFloat(territory.minX + spawnMargin, territory.maxX - spawnMargin);
        const randomZ = MathUtils.randFloat(territory.minZ + spawnMargin, territory.maxZ - spawnMargin);
        const gridX = Math.floor(randomX + centerOffset); const gridZ = Math.floor(randomZ + centerOffset); let groundY = 5; let foundGround = false; for (let y = Math.min(world.params.height - 1, 20); y >= 0; y--) { const block = world.getBlock(gridX, y, gridZ); if (block && block.id !== 'air') { groundY = y + 1.0; foundGround = true; break; } } const altitudeMin = 5; const altitudeMax = 20; const preferredMidY = groundY + (8 + 15) / 2; const startY = MathUtils.clamp(preferredMidY, groundY + altitudeMin, groundY + altitudeMax); const startPosition = new THREE.Vector3(randomX, startY, randomZ);
        try {
            const ghastInstance = new Ghast(scene, startPosition, world, territory, entityManager);
            activeGhasts.push(ghastInstance);
        } catch (error) { console.error("Error creating Ghast:", error); }
    }
    console.log(`Spawned ${activeGhasts.length} Ghasts.`);
}

// --- Event Listeners Setup ---
function setupEventListeners() {
     window.addEventListener('resize', () => {
         if (camera && renderer) {
             camera.aspect = window.innerWidth / window.innerHeight;
             camera.updateProjectionMatrix();
             renderer.setSize(window.innerWidth, window.innerHeight);
         }
         if (radarDisplay && radarDisplay.canvas) {
             const style = window.getComputedStyle(radarDisplay.canvas);
             const newWidth = parseInt(style.width, 10);
             const newHeight = parseInt(style.height, 10);
             if (radarDisplay.canvas.width !== newWidth || radarDisplay.canvas.height !== newHeight) {
                 radarDisplay.canvas.width = newWidth;
                 radarDisplay.canvas.height = newHeight;
                 radarDisplay.width = radarDisplay.canvas.width;
                 radarDisplay.height = radarDisplay.canvas.height;
                 radarDisplay.centerX = radarDisplay.width / 2;
                 radarDisplay.centerY = radarDisplay.height / 2;
                 if (radarDisplay.range > 0) {
                    radarDisplay.radarCircleRadius = Math.min(radarDisplay.centerX, radarDisplay.centerY) * 0.95;
                    radarDisplay.scale = radarDisplay.radarCircleRadius / radarDisplay.range;
                 }
             }
         }
         updateMobileUIVisibility(); 
     });

    if (player && player.inputHandler && !isMobile) {
        player.inputHandler.addKeyboardMouseListeners();
    }

    if (isMobile && mobileMenuButtonElement) {
        mobileMenuButtonElement.addEventListener('touchstart', (event) => {
            event.preventDefault(); 
            event.stopPropagation(); 
            if (menu) { 
                menu.toggle(); 
            }
        }, { passive: false });
    }

     window.addEventListener('keydown', (event) => {
         if (event.key === 'm' || event.key === 'M') {
             if (portalMenu && !portalMenu.isOpen()) { 
                 menu.toggle(); 
                 
                 if (menu.isOpen()) {
                     if (player && player.controls && player.controls.isLocked) {
                         player.unlockIntentional = true;
                         player.controls.unlock(); 
                     }
                 } else { 
                     if (!isMobile && player && player.controls && !player.controls.isLocked && !portalMenu.isOpen() && !gameStateManager.isTransitioning) {
                          setTimeout(() => {
                              if (!menu.isOpen() && !portalMenu.isOpen() && !gameStateManager.isTransitioning) {
                                 player.controls.lock();
                              }
                          }, 100);
                     }
                 }
             }
         }
     });

     document.addEventListener('click', () => {
         if (!isMobile && !menu.isOpen() && !portalMenu.isOpen() && player && player.controls && !player.controls.isLocked) {
             if (audioManager.context.state === 'suspended') {
                 audioManager.context.resume().then(() => {
                     player.controls.lock();
                 }).catch(e => {
                     console.error("Error resuming AudioContext:", e);
                     player.controls.lock();
                 });
             } else {
                 player.controls.lock();
             }
         }
     });

     if (player && player.controls) {
         player.controls.addEventListener('lock', () => {
             if (audioManager.context.state === 'suspended') audioManager.context.resume();
             player.unlockIntentional = false;
             if(menu) menu.hide(); 
             if(portalMenu) portalMenu.hide(); 
             if (crosshair && !isMobile) crosshair.classList.remove('hidden');
             updateMobileUIVisibility(); 
         });

         player.controls.addEventListener('unlock', () => {
             if (crosshair) crosshair.classList.add('hidden');
             if (player.unlockIntentional) {
                 player.unlockIntentional = false;
             } else {
                 if (!isMobile) { 
                     setTimeout(() => { 
                         if (!menu.isOpen() && !portalMenu.isOpen() && !gameStateManager.isTransitioning) {
                              menu.show();
                         }
                         updateMobileUIVisibility(); 
                     }, 0);
                 }
             }
             updateMobileUIVisibility(); 
         });
     } else {
         console.warn("Player or controls not initialized when setting up event listeners.");
     }
}


// --- Animation Loop ---
async function animate() {
     if (!clock || !renderer || !scene || !camera || !stats || !physics || !player || !menu || !portalMenu || !timerDisplayElement || !timerValueElement || !gameStateManager || !entityManager || !martianCountDisplayElement || !martianCountValueElement || !playerHealthBarContainerElement || !playerHealthBarFillElement || !playerHealthTextElement ) {
        console.error("Essential component missing in animate loop. Aborting.");
        return;
     }

    if (!world) {
         if (stats) stats.update();
         if (renderer && scene && camera) renderer.render(scene, camera);
         return;
    }

    let deltaTime = clock.getDelta();
    deltaTime = Math.min(deltaTime, 0.1);

    if (isMobile && mobileControls && mobileControls.isValid && mobileControls.isVisible) {
        mobileControls.update();
    }

    const didTransition = await gameStateManager.update(deltaTime, player, world, portalMenu, timerValueElement, menu);
    if (didTransition || gameStateManager.isTransitioning) {
        if (stats) stats.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
        return;
    }
    
    if (menu.isOpen() || portalMenu.isOpen() || (player && player.isDead)) {
        if (player && player.velocity) {
             player.velocity.x = 0; player.velocity.z = 0;
             if (!player.gravityEnabled || player.onGround) { player.velocity.y = 0; }
         }
         if (player) { player.isLaserBeamActive = false; player.laserBeamDurationTimer = 0; }
    } else {
        if (player) player.handleActionInputs();
        const wasOnGround = player.onGround;
        physics.step(deltaTime, player, world);
        if (entityManager) physics.handleFireballCollisions(player, entityManager.fireballs);
        if (lightingSystem) lightingSystem.update(deltaTime);
        if (player) player.updateVisuals(0.2);

        const meshesToExclude = [];
        if (player?.human?.mesh) { meshesToExclude.push(player.human.mesh); }
        physics.creatures.forEach(c => { if (c?.mesh) meshesToExclude.push(c.mesh); });
        activeGhasts.forEach(g => { if (g?.mesh) meshesToExclude.push(g.mesh); });
        if (player) { if (player.velocity.y <= 0.1 || wasOnGround) { physics.checkGround(player, world, meshesToExclude); } else { player.onGround = false; } }
        physics.creatures.forEach(creature => { if (creature) { if (creature.velocity.y <= 0.1) { physics.checkGround(creature, world, meshesToExclude); } else { creature.onGround = false; } } });

        if (entityManager) {
            entityManager.update(deltaTime, player, gameStateManager.gameState);
        }

        if (player) {
            player.applyPostPhysicsUpdates(wasOnGround);
            player.updateLaserBeam(deltaTime);
        }

        if (isMobile && mobileControls && mobileControls.isVisible && player.inputHandler && camera && player.human) {
            if (player.inputHandler.lookDeltaX !== 0 || player.inputHandler.lookDeltaY !== 0) {
                _cameraEuler.setFromQuaternion(camera.quaternion);
                _cameraEuler.y -= player.inputHandler.lookDeltaX;
                _cameraEuler.x -= player.inputHandler.lookDeltaY;
                const minPolarAngle = 0.05;
                const maxPolarAngle = Math.PI - 0.05;
                _cameraEuler.x = Math.max(Math.PI / 2 - maxPolarAngle, Math.min(Math.PI / 2 - minPolarAngle, _cameraEuler.x));
                camera.quaternion.setFromEuler(_cameraEuler);
                player.updateModelRotation();
            }
            const camInfo = player.getCameraInfo(true);
            player.updateModelVisibility(camInfo.mode);
            pov.update(camInfo, null);

        } else if (player && pov && player.controls && player.controls.isLocked) {
            const camInfo = player.getCameraInfo();
            player.updateModelVisibility(camInfo.mode);
            pov.update(camInfo, crosshair);
        } else if (player && pov) { 
            const camInfo = player.getCameraInfo();
            player.updateModelVisibility(camInfo.mode);
            pov.update(camInfo, crosshair);
        }


        if (player && player.inputHandler) {
            player.inputHandler.resetFrameState();
        }

        if (gameStateManager.gameState === 'MARTIAN_HUNT') {
            if (martianCountValueElement && physics && physics.creatures) {
                let aliveMartians = 0;
                for (const creature of physics.creatures) {
                    if (creature instanceof Martian && !creature.isDead) {
                        aliveMartians++;
                    }
                }
                martianCountValueElement.textContent = aliveMartians;
            }
        }

        if (playerHealthBarFillElement && player && player.maxHealth > 0) {
            const healthPercentage = Math.max(0, (player.health / player.maxHealth) * 100);
            playerHealthBarFillElement.style.width = healthPercentage + '%';
            if (playerHealthTextElement) { playerHealthTextElement.textContent = `${Math.round(healthPercentage)}%`; }
            if (healthPercentage < 30) playerHealthBarFillElement.style.backgroundColor = '#d9534f';
            else if (healthPercentage < 60) playerHealthBarFillElement.style.backgroundColor = '#f0ad4e';
            else playerHealthBarFillElement.style.backgroundColor = '#5cb85c';
        }

        if (radarManager && radarManager.isValid) {
            radarManager.update();
        }
    }


    if (stats) stats.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

// --- Start the Application ---
init().catch(error => {
    console.error("Initialization failed:", error);
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif; text-align: center;"><h2>Initialization Failed</h2><p>Could not start the application. Please check the browser console (F12) for more details.</p><pre style="text-align: left; background: #333; color: #eee; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${error.stack || error}</pre></div>`;
});

// --- END OF FILE main.js ---