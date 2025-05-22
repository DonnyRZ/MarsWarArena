// src/MartianHuntWorld.js
// Renamed from world.js and adapted to use BaseWorld

import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RNG } from './rng.js';
import { MARS_BLOCKS, MarsHelpers, BLOCK_TEXTURES } from './blocks.js';
import { BaseWorld } from './BaseWorld.js'; // Import the base class

// This class generates the noisy terrain for the hunting mission
export class MartianHuntWorld extends BaseWorld {
    constructor(scene) {
        super(scene); // Call BaseWorld constructor

        // --- Define parameters specific to the Martian Hunt mission ---
        this.params = {
            width: 90, // Original larger width
            height: 5, // Increased height for more verticality
            terrain: {
                seed: 1337, // Or make configurable
                scale: 25,
                magnitude: 0.5,
                offset: 0.2,
                octaves: 3,
                persistence: 0.3296
            }
        };

        // RNG specific to this world's terrain generation
        this.rng = new RNG(this.params.terrain.seed);
        this.simplex = new SimplexNoise({ random: () => this.rng.random() });
         console.log("Martian Hunt World Initialized.");
    }

    // --- Override generateTerrain for noisy landscape ---
    generateTerrain() {
        console.log("Generating noisy terrain for Martian Hunt...");
        const { width, height, terrain } = this.params;

        for (let x = 0; x < width; x++) {
            for (let z = 0; z < width; z++) {
                let noiseValue = 0;
                let amplitude = 1;
                let frequency = 1;

                // Calculate noise using SimplexNoise
                for (let o = 0; o < terrain.octaves; o++) {
                    const nx = (x / terrain.scale) * frequency;
                    const nz = (z / terrain.scale) * frequency;
                    noiseValue += this.simplex.noise(nx, nz) * amplitude;
                    amplitude *= terrain.persistence;
                    frequency *= 2;
                }

                // Scale noise to determine terrain height
                const scaledNoise = terrain.offset + noiseValue * terrain.magnitude;
                let yHeight = Math.floor(height * scaledNoise);
                yHeight = THREE.MathUtils.clamp(yHeight, 0, height - 1); // Clamp within world height bounds

                // Place blocks up to the calculated height
                for (let y = 0; y < yHeight; y++) {
                    this.setBlockId(x, y, z, 'deep_soil'); // Use deep_soil for lower layers
                }
                 if (yHeight >= 0) { // Ensure we don't try to set block at y=-1 if height is 0
                    this.setBlockId(x, yHeight, z, 'surface'); // Place surface block on top
                 }

                 // Fill everything above with air (already done by initializeData, but explicit clear is ok too)
                 // for (let y = yHeight + 1; y < height; y++) {
                 //    this.setBlockId(x, y, z, 'air');
                 // }
            }
        }
    }

     // --- No specific structures needed for this world type (yet) ---
     // placeStructures() { /* Optional override if needed later */ }


    // --- Override the main generate function to pass the correct blocks enum ---
    async generate() {
        // Call the BaseWorld's generate method, passing the MARS_BLOCKS enum
        await super.generate(MARS_BLOCKS);
    }
}

// Export default for compatibility if needed elsewhere, but named export is clearer
export default MartianHuntWorld;