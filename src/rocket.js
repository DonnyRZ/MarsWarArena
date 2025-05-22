// src/rocket.js
import { MARS_BLOCKS } from './blocks.js';

export class RocketBuilder {
    constructor() { }

    // --- Helper Methods (Ensure 'world' object is valid) ---

    _isValidWorld(world) {
        // Add check for params existence as well
        if (!world || typeof world.inBounds !== 'function' || typeof world.setBlockId !== 'function' || typeof world.getBlock !== 'function' || !world.params) {
             console.error("Invalid 'world' object passed to RocketBuilder method (or missing params):", world);
             return false;
        }
        return true;
    }

    // Use setStructureBlock - only checks world bounds
    setStructureBlock(x, y, z, blockId, world) {
         if (!this._isValidWorld(world)) return;
         if (world.inBounds(x, y, z)) {
             world.setBlockId(x, y, z, blockId);
         }
     }

    // --- Main Rocket Placement Function ---

    placeRocket(cx, cz, baseY, world) {
        if (!this._isValidWorld(world)) {
            console.error("Cannot place rocket: Invalid world object.");
            return;
        }
        console.log(`Placing ENHANCED Rocket at ${cx},${cz} (BaseY: ${baseY})`);

        const baseRadius = 4.5; // Slightly wider base radius for better proportion
        const mainHeight = 35;
        const noseHeight = 12; // Slightly taller nose for smoother taper
        const totalHeight = mainHeight + noseHeight;

        // Check height limit
        if (baseY + totalHeight >= world.params.height) {
            console.warn(`Rocket height (${totalHeight}) exceeds world height limit (${world.params.height - baseY}). Rocket will be truncated.`);
            // Adjust totalHeight if necessary, although truncation will happen naturally
            // totalHeight = world.params.height - baseY -1;
        }

        // --- 1. Build Main Hull (Smoother Cylinder & Tiles) ---
        console.log("...Building main hull (enhanced)");
        const tileSideStartZ = 0; // Tiles on the -Z side up to center Z
        const tileSideEndX = Math.floor(baseRadius * 0.7); // Tiles wrap around slightly on X

        for (let y = 0; y < mainHeight; y++) {
            const currentY = baseY + y;
            const floorRadius = Math.floor(baseRadius); // Use integer radius for looping

            for (let dx = -floorRadius; dx <= floorRadius; dx++) {
                for (let dz = -floorRadius; dz <= floorRadius; dz++) {
                    const distSq = dx * dx + dz * dz;

                    // Check if block is on the circumference edge using float radius
                    if (distSq <= baseRadius * baseRadius) {
                        // Check if the *next* block outwards would be outside the radius
                        const outerXDistSq = (Math.abs(dx) + 1) ** 2 + dz ** 2;
                        const outerZDistSq = dx ** 2 + (Math.abs(dz) + 1) ** 2;
                        const isEdge = outerXDistSq > baseRadius * baseRadius || outerZDistSq > baseRadius * baseRadius;

                        if (isEdge) {
                            let blockId = 'rocket_hull';
                            // Apply tiles to designated area (-Z side, wrapping slightly)
                            if (dz <= tileSideStartZ && Math.abs(dx) <= tileSideEndX && y < mainHeight * 0.95) {
                                blockId = 'rocket_tile';
                            }
                            this.setStructureBlock(cx + dx, currentY, cz + dz, blockId, world);
                        } else {
                            // Ensure inside is air
                             this.setStructureBlock(cx + dx, currentY, cz + dz, 'air', world);
                        }
                    }
                }
            }
        }

        // --- 2. Build Nose Cone (Smoother Taper) ---
        console.log("...Building nose cone (enhanced)");
        for (let y = 0; y < noseHeight; y++) {
            const currentY = baseY + mainHeight + y;
            // Calculate radius using cosine taper for smoother curve
            const t = y / (noseHeight -1); // Goes from 0 to 1
            const currentRadius = baseRadius * Math.cos(t * Math.PI / 2); // Cosine curve from baseRadius to 0
            const floorRadius = Math.max(0, Math.floor(currentRadius)); // Ensure radius doesn't go negative

            // Place blocks for this layer's shell
             for (let dx = -floorRadius; dx <= floorRadius; dx++) {
                 for (let dz = -floorRadius; dz <= floorRadius; dz++) {
                     const distSq = dx * dx + dz * dz;

                     if (distSq <= currentRadius * currentRadius) {
                         const outerXDistSq = (Math.abs(dx) + 1) ** 2 + dz ** 2;
                         const outerZDistSq = dx ** 2 + (Math.abs(dz) + 1) ** 2;
                         const isEdge = outerXDistSq > currentRadius * currentRadius || outerZDistSq > currentRadius * currentRadius;

                         if (isEdge) {
                             let blockId = 'rocket_nose';
                             // Apply tiles to nose section too
                              if (dz <= tileSideStartZ && Math.abs(dx) <= Math.floor(currentRadius * 0.7)) {
                                blockId = 'rocket_tile';
                              }
                             this.setStructureBlock(cx + dx, currentY, cz + dz, blockId, world);
                         } else {
                              this.setStructureBlock(cx + dx, currentY, cz + dz, 'air', world);
                         }
                     }
                 }
             }
        }
        // Final tip
        this.setStructureBlock(cx, baseY + totalHeight, cz, 'rocket_nose', world);


        // --- 3. Build Enhanced Fins ---
        this.placeBottomFins_Enhanced(cx, cz, baseY, baseRadius, mainHeight, world);
        this.placeTopCanards_Enhanced(cx, cz, baseY, baseRadius, mainHeight, world);

        console.log("Enhanced Rocket placement finished.");
    }

    // --- Enhanced Fin Placement Logic ---

    placeBottomFins_Enhanced(cx, cz, baseY, radius, mainHeight, world) {
         if (!this._isValidWorld(world)) return;
         console.log("...Placing enhanced bottom fins");
         const finBlockId = 'rocket_fin'; // Use the dedicated fin block

         const finHeight = 10; // Taller fins
         const finStartLength = 8; // Start wider at base
         const finEndLength = 2;   // Taper towards top
         const finThickness = 1; // 1 block thick (0 means total 1 wide, 1 means total 3 wide)
         const finBaseY = baseY + 1; // Start just above ground

         // Fin positions (using directions for easier calculation)
         const finDirections = [
             { x: 1, z: 0 }, // +X
             { x: -1, z: 0}, // -X
             { x: 0, z: 1 }, // +Z
             { x: 0, z: -1 }  // -Z (Tile side)
         ];

         finDirections.forEach(dir => {
            // Calculate attachment point offset (integer radius)
            const attachX = cx + Math.round(dir.x * (radius -1)); // Attach slightly inside the float radius
            const attachZ = cz + Math.round(dir.z * (radius -1));

            for (let y = 0; y < finHeight; y++) {
                const currentY = finBaseY + y;
                // Linear taper for length
                const t = y / (finHeight - 1);
                const currentLength = Math.round(finStartLength * (1 - t) + finEndLength * t);

                for (let l = 0; l < currentLength; l++) {
                     // Calculate base point of fin segment along its direction
                     const finX = attachX + dir.x * l;
                     const finZ = attachZ + dir.z * l;

                     // Place center block of fin segment
                     this.setStructureBlock(finX, currentY, finZ, finBlockId, world);

                     // Add thickness perpendicular to fin direction
                     for (let w = 1; w <= finThickness; w++) {
                         // If fin is along X (dir.x != 0), thickness is along Z (dir.z == 0)
                         // If fin is along Z (dir.z != 0), thickness is along X (dir.x == 0)
                         this.setStructureBlock(finX + dir.z * w, currentY, finZ + dir.x * w, finBlockId, world);
                         this.setStructureBlock(finX - dir.z * w, currentY, finZ - dir.x * w, finBlockId, world);
                     }
                }
            }
         });
    }

     placeTopCanards_Enhanced(cx, cz, baseY, radius, mainHeight, world) {
         if (!this._isValidWorld(world)) return;
         console.log("...Placing enhanced top canards");
         const finBlockId = 'rocket_fin';

         const finHeight = 6; // Shorter than bottom fins
         const finStartLength = 5;
         const finEndLength = 1;
         const finThickness = 0; // Keep canards thin (1 block total width)
         const finBaseY = baseY + mainHeight - finHeight - 5; // Place higher up, below nose start

         // Only two canards, typically on X axis
         const finDirections = [
             { x: 1, z: 0 }, // +X
             { x: -1, z: 0}, // -X
         ];

         finDirections.forEach(dir => {
            const attachX = cx + Math.round(dir.x * (radius - 1));
            const attachZ = cz + Math.round(dir.z * (radius - 1));

            for (let y = 0; y < finHeight; y++) {
                const currentY = finBaseY + y;
                const t = y / (finHeight - 1);
                const currentLength = Math.round(finStartLength * (1 - t) + finEndLength * t);

                for (let l = 0; l < currentLength; l++) {
                     const finX = attachX + dir.x * l;
                     const finZ = attachZ + dir.z * l;

                     this.setStructureBlock(finX, currentY, finZ, finBlockId, world);

                     // Add thickness if finThickness > 0 (currently 0)
                     // for (let w = 1; w <= finThickness; w++) {
                     //     this.setStructureBlock(finX + dir.z * w, currentY, finZ + dir.x * w, finBlockId, world);
                     //     this.setStructureBlock(finX - dir.z * w, currentY, finZ - dir.x * w, finBlockId, world);
                     // }
                }
            }
         });
    }
}