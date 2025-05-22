// src/MarsBaseWorld.js
import * as THREE from 'three';
import { BaseWorld } from './BaseWorld.js';
import { MARS_BLOCKS } from './blocks.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RNG } from './rng.js';
import { BaseBuildings } from './BaseBuildings.js';
import { RocketBuilder } from './rocket.js'; // <<<--- IMPORT RocketBuilder

export class MarsBaseWorld extends BaseWorld {
    constructor(scene) {
        super(scene);

        this.params = {
            width: 256,
            height: 60, // <<<--- INCREASED WORLD HEIGHT SIGNIFICANTLY for rocket
            terrain: {
                seed: 42,
                scale: 25,
                magnitude: 0.2, // Keep outer terrain low
                offset: 0.2,
                octaves: 3,
                persistence: 0.3296
            }
        };

        this.rng = new RNG(this.params.terrain.seed);
        this.simplex = new SimplexNoise({ random: () => this.rng.random() });

        // Flat area remains the same size
        this.flatAreaSize = 90;
        this.minFlatX = Math.floor((this.params.width - this.flatAreaSize) / 2); // 103
        this.maxFlatX = this.minFlatX + this.flatAreaSize - 1; // 152
        this.minFlatZ = Math.floor((this.params.width - this.flatAreaSize) / 2); // 103
        this.maxFlatZ = this.minFlatZ + this.flatAreaSize - 1; // 152

        console.log(`World Size: ${this.params.width}x${this.params.width}, Height: ${this.params.height}`);
        console.log(`Flat Area Bounds (Grid): X[${this.minFlatX}-${this.maxFlatX}], Z[${this.minFlatZ}-${this.maxFlatZ}]`);

        // Portal location (near edge)
        this.portalCenterGrid = {
            x: this.minFlatX + 5, // ~108
            y: 1,
            z: Math.floor(this.params.width / 2) // ~127
        };

        const centerOffset = (this.params.width - 1) / 2;
        this.portalCenterWorld = new THREE.Vector3(
            this.portalCenterGrid.x - centerOffset,
            this.portalCenterGrid.y,
            this.portalCenterGrid.z - centerOffset
        );
        this.portalTriggerRadiusSq = 3 * 3;

        // Instantiate builders
        this.baseBuildings = new BaseBuildings();
        this.rocketBuilder = new RocketBuilder(); // <<<--- Instantiate RocketBuilder

        console.log("Mars Base World Initialized.");
    }

    // generateTerrain remains the same as previous version

    generateTerrain() {
        console.log(`Generating hybrid terrain for Mars Base (${this.params.width}x${this.params.width})...`);
        const { width, height, terrain } = this.params;
        const groundLevel = 0;

        for (let x = 0; x < width; x++) {
            for (let z = 0; z < width; z++) {
                if (x >= this.minFlatX && x <= this.maxFlatX && z >= this.minFlatZ && z <= this.maxFlatZ) {
                    this.setBlockId(x, groundLevel, z, 'mars_regolith');
                    // Ensure air above foundation INITIALLY up to new height
                    for (let y = groundLevel + 1; y < height; y++) {
                        this.setBlockId(x, y, z, 'air');
                    }
                } else {
                    // Outer noisy terrain (keep it relatively low despite world height increase)
                    let noiseValue = 0;
                    let amplitude = 1;
                    let frequency = 1;
                    for (let o = 0; o < terrain.octaves; o++) {
                        const nx = (x / terrain.scale) * frequency;
                        const nz = (z / terrain.scale) * frequency;
                        noiseValue += this.simplex.noise(nx, nz) * amplitude;
                        amplitude *= terrain.persistence;
                        frequency *= 2;
                    }
                    const scaledNoise = terrain.offset + noiseValue * terrain.magnitude;
                    let yHeight = Math.floor((height * 0.15) * scaledNoise); // Keep outer terrain low relative to new height
                    yHeight = THREE.MathUtils.clamp(yHeight, 0, height - 1);

                    for (let y = 0; y < yHeight; y++) {
                        this.setBlockId(x, y, z, 'deep_soil');
                    }
                     if (yHeight >= 0) {
                         this.setBlockId(x, yHeight, z, 'surface');
                     }
                    // Ensure air above outer terrain up to new height
                    for (let y = yHeight + 1; y < height; y++) {
                        this.setBlockId(x, y, z, 'air');
                    }
                }
            }
        }
        console.log("Terrain generation complete.");
    }


    placeStructures() {
        console.log("Placing structures (Portal, Buildings, Rocket)...");

        // --- 1. Place Portal ---
        this.placePortal(); // Uses baseBuildings.setStructureBlock internally

        // --- 2. Place Base Buildings ---
        // Buildings are placed around flatCenterX (~127), flatCenterZ (~127)
        this.baseBuildings.placeAllBuildings(this);

        // --- 3. Place Rocket ---
        // Choose coordinates carefully. Flat area X: 103-152, Z: 103-152
        // Portal is near X=108, Z=127
        // Buildings cluster around X=127 to X=138, Z=127
        // Place rocket near the far edge of the flat area, away from buildings/portal
        const rocketCX = this.maxFlatX - 5; // ~147 (Near +X edge of flat area)
        const rocketCZ = this.minFlatZ + 10; // ~113 (Offset from center Z, near -Z edge)
        const rocketBaseY = 1; // Start rocket platform at Y=1

        console.log(`Selected rocket coordinates: CX=${rocketCX}, CZ=${rocketCZ}`);
        this.rocketBuilder.placeRocket(rocketCX, rocketCZ, rocketBaseY, this);

        console.log("Structure placement complete.");
    }

    // placePortal remains the same as previous version

    placePortal() {
        console.log("Placing portal structure...");
        const buildingManager = this.baseBuildings; // Use this to access setStructureBlock
        const { x: pcx, y: pcy_trigger, z: pcz } = this.portalCenterGrid;
        const basePlatformY = 1;
        const portalFrameBaseY = basePlatformY + 1;
        const portalInnerWidth = 3;
        const portalInnerHeight = 5;
        const frameThickness = 1;
        const zOffsetInner = Math.floor(portalInnerWidth / 2);
        const zOffsetOuter = zOffsetInner + frameThickness;
        const clearHeight = portalInnerHeight + 2 * frameThickness + 5;
        const clearZOffset = zOffsetOuter + 1;

        // Clear Area
        for (let dx = -frameThickness -1; dx <= frameThickness + 1; dx++) {
             for (let dy = 0; dy < clearHeight; dy++) {
                 for (let dz = -clearZOffset; dz <= clearZOffset; dz++) {
                      buildingManager.setStructureBlock(pcx + dx, basePlatformY + dy, pcz + dz, 'air', this);
                 }
             }
         }
        // Build Base Platform
        for (let dx = -frameThickness; dx <= frameThickness; dx++) {
            for (let dz = -zOffsetOuter; dz <= zOffsetOuter; dz++) {
                buildingManager.setStructureBlock(pcx + dx, basePlatformY, pcz + dz, 'portal_frame', this);
            }
        }
        // Build Frame Sides
        for (let dx = -frameThickness; dx <= frameThickness; dx++) {
            for (let dy = 0; dy < portalInnerHeight; dy++) {
                const currentY = portalFrameBaseY + dy;
                buildingManager.setStructureBlock(pcx + dx, currentY, pcz - zOffsetOuter, 'portal_frame', this);
                buildingManager.setStructureBlock(pcx + dx, currentY, pcz + zOffsetOuter, 'portal_frame', this);
            }
        }
        // Build Frame Top
        const topY = portalFrameBaseY + portalInnerHeight -1;
        for (let dx = -frameThickness; dx <= frameThickness; dx++) {
            for (let dz = -zOffsetOuter; dz <= zOffsetOuter; dz++) {
                 buildingManager.setStructureBlock(pcx + dx, topY, pcz + dz, 'portal_frame', this);
            }
        }
        // Fill Portal Interior
        for (let dy = 0; dy < portalInnerHeight; dy++) {
            const currentY = portalFrameBaseY + dy;
            for (let dz = -zOffsetInner; dz <= zOffsetInner; dz++) {
                 buildingManager.setStructureBlock(pcx, currentY, pcz + dz, 'portal_effect', this);
            }
        }
        this.portalCenterWorld.y = basePlatformY;
        console.log("Portal placement finished.");
    }

    // generate remains the same
    async generate() {
        await super.generate(MARS_BLOCKS);
    }
}