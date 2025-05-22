// src/BaseBuildings.js
import { MARS_BLOCKS } from './blocks.js';

export class BaseBuildings {
    constructor() { }

    // --- Helper Methods (Ensure 'world' object is valid) ---

    _isValidWorld(world) {
        if (!world || typeof world.inBounds !== 'function' || typeof world.setBlockId !== 'function' || typeof world.getBlock !== 'function') {
             console.error("Invalid 'world' object passed to BaseBuildings method:", world);
             return false;
        }
        return true;
    }

    _isInFlatArea(x, z, world) {
        if (!this._isValidWorld(world)) return false; // Basic check before accessing props
        if (world.minFlatX === undefined || world.maxFlatX === undefined || world.minFlatZ === undefined || world.maxFlatZ === undefined) {
             console.error("World object is missing flat area bounds properties.");
             return false;
        }
        return x >= world.minFlatX && x <= world.maxFlatX &&
               z >= world.minFlatZ && z <= world.maxFlatZ;
    }

    setBuildingBlock(x, y, z, blockId, world) {
        if (!this._isValidWorld(world)) return;
        if (world.inBounds(x, y, z) && this._isInFlatArea(x, z, world)) {
            world.setBlockId(x, y, z, blockId);
        }
    }

    setStructureBlock(x, y, z, blockId, world) {
         if (!this._isValidWorld(world)) return;
         if (world.inBounds(x, y, z)) {
             world.setBlockId(x, y, z, blockId);
         }
     }

    // --- Main Placement Method ---

    placeAllBuildings(world) {
        if (!this._isValidWorld(world)) {
            console.error("Cannot place buildings: Invalid world object.");
            return;
        }
        console.log("Placing ENHANCED base buildings...");

        // Get flat area center (ensure world props exist)
        if (world.minFlatX === undefined || world.maxFlatX === undefined || world.minFlatZ === undefined || world.maxFlatZ === undefined) {
            console.error("Cannot calculate flat area center: bounds missing.");
            return;
        }
        const flatCenterX = Math.floor((world.minFlatX + world.maxFlatX) / 2);
        const flatCenterZ = Math.floor((world.minFlatZ + world.maxFlatZ) / 2);

        // Place buildings with refined methods
        this.placeHabitatDome_Enhanced(flatCenterX, flatCenterZ, 1, 7, world); // Radius 7 dome
        this.placeCorridor_Enhanced(flatCenterX + 8, flatCenterZ, 1, 5, 'x', world); // Connects to dome edge
        this.placeSmallOutpost_Enhanced(flatCenterX + 14, flatCenterZ - 1, 1, 5, 6, 4, world); // Place at end of corridor

        console.log("Enhanced base buildings placed.");
    }

    // --- Enhanced Building Placement Functions ---

    placeRectBuilding_Enhanced(cx, cz, baseY, width, depth, height, world) {
        if (!this._isValidWorld(world)) return;
        console.log(`Placing Enhanced RectBuilding at ${cx},${cz} (BaseY: ${baseY}), Size: ${width}x${depth}x${height}`);
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        // --- Floor ---
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            for (let dz = -halfDepth; dz <= halfDepth; dz++) {
                this.setBuildingBlock(cx + dx, baseY, cz + dz, 'base_metal_floor', world);
            }
        }

        // --- Walls & Pillars ---
        for (let dy = 1; dy < height; dy++) {
            const currentY = baseY + dy;
            // Place Walls first
            for (let dx = -halfWidth + 1; dx < halfWidth; dx++) {
                this.setBuildingBlock(cx + dx, currentY, cz - halfDepth, 'base_wall', world); // Back
                this.setBuildingBlock(cx + dx, currentY, cz + halfDepth, 'base_wall', world); // Front
            }
            for (let dz = -halfDepth + 1; dz < halfDepth; dz++) {
                this.setBuildingBlock(cx - halfWidth, currentY, cz + dz, 'base_wall', world); // Left
                this.setBuildingBlock(cx + halfWidth, currentY, cz + dz, 'base_wall', world); // Right
            }
            // Place Pillars at corners
            this.setBuildingBlock(cx - halfWidth, currentY, cz - halfDepth, 'base_pillar', world);
            this.setBuildingBlock(cx + halfWidth, currentY, cz - halfDepth, 'base_pillar', world);
            this.setBuildingBlock(cx - halfWidth, currentY, cz + halfDepth, 'base_pillar', world);
            this.setBuildingBlock(cx + halfWidth, currentY, cz + halfDepth, 'base_pillar', world);
        }

        // --- Roof ---
        const roofY = baseY + height;
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            for (let dz = -halfDepth; dz <= halfDepth; dz++) {
                 // Use new roofing block
                 this.setBuildingBlock(cx + dx, roofY, cz + dz, 'base_roofing', world);
            }
        }
         // Optional: Add a slight roof overhang or edge trim
         for (let dx = -halfWidth -1; dx <= halfWidth+1; dx++) {
             this.setBuildingBlock(cx+dx, roofY, cz-halfDepth -1, 'base_roofing', world);
             this.setBuildingBlock(cx+dx, roofY, cz+halfDepth +1, 'base_roofing', world);
         }
          for (let dz = -halfDepth; dz <= halfDepth; dz++) {
              this.setBuildingBlock(cx-halfWidth -1, roofY, cz+dz, 'base_roofing', world);
              this.setBuildingBlock(cx+halfWidth +1, roofY, cz+dz, 'base_roofing', world);
          }


        // --- Doorway (3 high on +Z) ---
        const doorY1 = baseY + 1;
        const doorY2 = baseY + 2;
        const doorY3 = baseY + 3;
        if (height >= 4) {
             this.setBuildingBlock(cx, doorY1, cz + halfDepth, 'air', world); // Clear wall
             this.setBuildingBlock(cx, doorY2, cz + halfDepth, 'air', world); // Clear wall
             this.setBuildingBlock(cx, doorY3, cz + halfDepth, 'air', world); // Clear wall
             this.setBuildingBlock(cx - 1, doorY3, cz + halfDepth, 'base_wall', world); // Lintel above door
             this.setBuildingBlock(cx + 1, doorY3, cz + halfDepth, 'base_wall', world); // Lintel above door
        } else if (height === 3) { // 2-high door for shorter building
             this.setBuildingBlock(cx, doorY1, cz + halfDepth, 'air', world);
             this.setBuildingBlock(cx, doorY2, cz + halfDepth, 'air', world);
             // Need to clear corner pillars if door is at center of odd width
             if (width % 2 !== 0 && cx === 0) {
                  this.setBuildingBlock(cx, doorY1, cz + halfDepth, 'air', world);
                  this.setBuildingBlock(cx, doorY2, cz + halfDepth, 'air', world);
             }
        }
    }

    placeHabitatDome_Enhanced(cx, cz, baseY, radius, world) {
        if (!this._isValidWorld(world)) return;
        console.log(`Placing Enhanced HabitatDome at ${cx},${cz} (BaseY: ${baseY}), Radius: ${radius}`);

        const radiusSq = radius * radius;
        const wallBaseHeight = 2; // Height of the solid base wall
        const domeVerticalRadius = radius * 0.8; // How tall the dome part is relative to horizontal radius
        const totalDomeHeight = wallBaseHeight + Math.ceil(domeVerticalRadius); // Total height from baseY

        // --- Place Floor and Solid Base Walls ---
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const distSq = dx * dx + dz * dz;
                if (distSq <= radiusSq) {
                    // Place Floor
                    this.setBuildingBlock(cx + dx, baseY, cz + dz, 'base_metal_floor', world);

                    // Check if on the circumference for base walls
                    const outerDistSq = (Math.abs(dx) + 0.5) * (Math.abs(dx) + 0.5) + (Math.abs(dz) + 0.5) * (Math.abs(dz) + 0.5);
                    if (outerDistSq > radiusSq && distSq <= radiusSq) { // If block center is in, but edge is out, it's on the circle edge
                        for (let dy = 1; dy <= wallBaseHeight; dy++) {
                            this.setBuildingBlock(cx + dx, baseY + dy, cz + dz, 'base_wall', world);
                        }
                         // Clear air above base wall before dome starts
                         for (let dy = wallBaseHeight + 1; dy <= totalDomeHeight +1 ; dy++) { // +1 buffer
                              this.setBuildingBlock(cx + dx, baseY + dy, cz + dz, 'air', world);
                         }
                    } else {
                        // Clear air inside base
                        for (let dy = 1; dy <= wallBaseHeight; dy++) {
                            this.setBuildingBlock(cx + dx, baseY + dy, cz + dz, 'air', world);
                        }
                    }
                }
            }
        }

        // --- Place Smoother Glass Dome (Sphere Approximation) ---
        for (let dy = 1; dy <= domeVerticalRadius; dy++) {
            const y = dy + wallBaseHeight; // Current Y level relative to baseY
            // Calculate the horizontal radius of the sphere slice at this height
            // Formula: r_slice = sqrt(R^2 - y_rel^2) where y_rel is height from sphere center
            const y_relative_to_dome_center = dy - domeVerticalRadius / 2;
            const sliceRadiusSq = (radius * radius) - (y_relative_to_dome_center * y_relative_to_dome_center * (radius / domeVerticalRadius)**2); // Adjust for aspect ratio if domeVerticalRadius != radius
            // const sliceRadiusSq = (radius * radius) - (dy * dy); // Simpler if dome is hemi-sphere

            if (sliceRadiusSq < 0) continue; // Slice is above the sphere top

            const sliceRadius = Math.sqrt(sliceRadiusSq);
            const floorSliceRadius = Math.floor(sliceRadius); // Integer radius for block placement

            for (let dx = -floorSliceRadius; dx <= floorSliceRadius; dx++) {
                for (let dz = -floorSliceRadius; dz <= floorSliceRadius; dz++) {
                    const distSq = dx * dx + dz * dz;
                    // Check if the block is on the edge of this slice's circle
                     const outerDistSq = (Math.abs(dx) + 0.5) * (Math.abs(dx) + 0.5) + (Math.abs(dz) + 0.5) * (Math.abs(dz) + 0.5);
                     if (outerDistSq > sliceRadiusSq && distSq <= sliceRadiusSq) {
                        // Place structural frame (pillar or wall) on the edge
                        // Maybe use pillar every few blocks? Simple approach: use wall
                         this.setBuildingBlock(cx + dx, baseY + y, cz + dz, 'base_wall', world);
                     } else if (distSq < sliceRadiusSq) {
                        // Fill inside with glass (only if not already filled by frame)
                        // Safer check: Get block first. If it's air, fill with glass.
                         if (this._isValidWorld(world)) { // Check world before getBlock
                            const existingBlock = world.getBlock(cx + dx, baseY + y, cz + dz);
                            if (existingBlock && existingBlock.id === 'air') {
                                this.setBuildingBlock(cx + dx, baseY + y, cz + dz, 'base_glass', world);
                            }
                         }
                    }
                }
            }
        }

         // --- Top Cap --- (Optional: Make it solid)
         const topY = baseY + totalDomeHeight + 1;
         this.setBuildingBlock(cx, topY, cz, 'base_roofing', world); // Place a cap block


        // --- Carve Doorway (3 blocks high on +Z edge) ---
        const doorX = cx;
        const doorZ = cz + radius; // Place door exactly on radius edge
        // Find the actual block at the radius edge for Z
        let actualDoorZ = cz + radius;
        while(actualDoorZ > cz && this._isValidWorld(world) && world.getBlock(doorX, baseY+1, actualDoorZ)?.id !== 'base_wall') {
            actualDoorZ--; // Find the wall block
        }
        if(world.getBlock(doorX, baseY+1, actualDoorZ)?.id === 'base_wall'){
            this.setBuildingBlock(doorX, baseY + 1, actualDoorZ, 'air', world);
            this.setBuildingBlock(doorX, baseY + 2, actualDoorZ, 'air', world);
            if (wallBaseHeight >= 3) {
                this.setBuildingBlock(doorX, baseY + 3, actualDoorZ, 'air', world);
            }
             // Optional: Add door frame pillars
             this.setBuildingBlock(doorX-1, baseY + 1, actualDoorZ, 'base_pillar', world);
             this.setBuildingBlock(doorX-1, baseY + 2, actualDoorZ, 'base_pillar', world);
             this.setBuildingBlock(doorX+1, baseY + 1, actualDoorZ, 'base_pillar', world);
             this.setBuildingBlock(doorX+1, baseY + 2, actualDoorZ, 'base_pillar', world);
             if (wallBaseHeight >= 3) {
                  this.setBuildingBlock(doorX-1, baseY + 3, actualDoorZ, 'base_pillar', world);
                  this.setBuildingBlock(doorX+1, baseY + 3, actualDoorZ, 'base_pillar', world);
             }
        } else {
            console.warn("Could not find dome wall to place doorway at Z edge.");
        }
     }

    placeCorridor_Enhanced(startX, startZ, baseY, length, axis, world) {
        if (!this._isValidWorld(world)) return;
        console.log(`Placing Enhanced Corridor from ${startX},${startZ} (BaseY: ${baseY}), Length: ${length}, Axis: ${axis}`);
        const corridorHeight = 3; // Total wall height (Y levels 1, 2, 3)

        for (let i = 0; i < length; i++) {
            let currentX = startX;
            let currentZ = startZ;

            if (axis === 'x') currentX += i;
            else currentZ += i;

            if (!this._isInFlatArea(currentX, currentZ, world)) break; // Stop if outside flat area

            // --- Floor ---
            this.setBuildingBlock(currentX, baseY, currentZ, 'base_metal_floor', world);
            // Optional floor detail:
             if(i % 3 === 1) this.setBuildingBlock(currentX, baseY, currentZ, 'base_roofing', world); // Different floor tile sometimes

            // --- Interior Air ---
            this.setBuildingBlock(currentX, baseY + 1, currentZ, 'air', world);
            this.setBuildingBlock(currentX, baseY + 2, currentZ, 'air', world);

            // --- Walls, Pillars, Roof Framing ---
            const roofY = baseY + corridorHeight; // Roof surface Y level
            const wallY1 = baseY + 1;
            const wallY2 = baseY + 2;

            if (axis === 'x') {
                // Side walls
                this.setBuildingBlock(currentX, wallY1, currentZ - 1, 'base_wall', world);
                this.setBuildingBlock(currentX, wallY2, currentZ - 1, 'base_wall', world);
                this.setBuildingBlock(currentX, wallY1, currentZ + 1, 'base_wall', world);
                this.setBuildingBlock(currentX, wallY2, currentZ + 1, 'base_wall', world);
                // Pillars at roof/wall junction
                this.setBuildingBlock(currentX, wallY1, currentZ - 2, 'base_pillar', world);
                this.setBuildingBlock(currentX, wallY2, currentZ - 2, 'base_pillar', world);
                this.setBuildingBlock(currentX, roofY, currentZ - 2, 'base_pillar', world);
                this.setBuildingBlock(currentX, wallY1, currentZ + 2, 'base_pillar', world);
                this.setBuildingBlock(currentX, wallY2, currentZ + 2, 'base_pillar', world);
                this.setBuildingBlock(currentX, roofY, currentZ + 2, 'base_pillar', world);
                // Roof structure
                this.setBuildingBlock(currentX, roofY, currentZ - 1, 'base_roofing', world);
                this.setBuildingBlock(currentX, roofY, currentZ + 1, 'base_roofing', world);
                this.setBuildingBlock(currentX, roofY, currentZ, 'base_glass', world); // Central glass roof

            } else { // axis === 'z'
                // Side walls
                this.setBuildingBlock(currentX - 1, wallY1, currentZ, 'base_wall', world);
                this.setBuildingBlock(currentX - 1, wallY2, currentZ, 'base_wall', world);
                this.setBuildingBlock(currentX + 1, wallY1, currentZ, 'base_wall', world);
                this.setBuildingBlock(currentX + 1, wallY2, currentZ, 'base_wall', world);
                 // Pillars at roof/wall junction
                 this.setBuildingBlock(currentX - 2, wallY1, currentZ, 'base_pillar', world);
                 this.setBuildingBlock(currentX - 2, wallY2, currentZ, 'base_pillar', world);
                 this.setBuildingBlock(currentX - 2, roofY, currentZ, 'base_pillar', world);
                 this.setBuildingBlock(currentX + 2, wallY1, currentZ, 'base_pillar', world);
                 this.setBuildingBlock(currentX + 2, wallY2, currentZ, 'base_pillar', world);
                 this.setBuildingBlock(currentX + 2, roofY, currentZ, 'base_pillar', world);
                 // Roof structure
                 this.setBuildingBlock(currentX - 1, roofY, currentZ, 'base_roofing', world);
                 this.setBuildingBlock(currentX + 1, roofY, currentZ, 'base_roofing', world);
                 this.setBuildingBlock(currentX, roofY, currentZ, 'base_glass', world); // Central glass roof
            }
        }

        // --- Carve Openings at Ends --- (Ensure height matches corridor)
         const openingY1 = baseY + 1;
         const openingY2 = baseY + 2;
         // Start
         this.setBuildingBlock(startX, openingY1, startZ, 'air', world);
         this.setBuildingBlock(startX, openingY2, startZ, 'air', world);
         // End
         let endX = startX;
         let endZ = startZ;
         if (axis === 'x') endX += length -1;
         else endZ += length - 1;
         if (this._isInFlatArea(endX, endZ, world)) { // Check end is valid
            this.setBuildingBlock(endX, openingY1, endZ, 'air', world);
            this.setBuildingBlock(endX, openingY2, endZ, 'air', world);
         }
    }

    placeSmallOutpost_Enhanced(cx, cz, baseY, width, depth, height, world) {
        if (!this._isValidWorld(world)) return;
        console.log(`Placing Enhanced SmallOutpost at ${cx},${cz} (BaseY: ${baseY}), Size: ${width}x${depth}x${height}`);

        // Use the enhanced rect building as a base
        this.placeRectBuilding_Enhanced(cx, cz, baseY, width, depth, height, world);

        // --- Outpost Specific Customizations ---
        const roofY = baseY + height;
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);

        // Add a central glass skylight (replace roofing)
        if (width > 2 && depth > 2) {
            this.setBuildingBlock(cx, roofY, cz, 'base_glass', world);
             // Maybe frame the skylight
             this.setBuildingBlock(cx+1, roofY, cz, 'base_roofing', world);
             this.setBuildingBlock(cx-1, roofY, cz, 'base_roofing', world);
             this.setBuildingBlock(cx, roofY, cz+1, 'base_roofing', world);
             this.setBuildingBlock(cx, roofY, cz-1, 'base_roofing', world);
        }

        // Modify door location: Remove default +Z door, add -X door
        const doorY1 = baseY + 1;
        const doorY2 = baseY + 2;
        const doorY3 = baseY + 3;

        if (height >= 4) { // For 3-high door
            // Clear potentially placed wall/pillar at default door location (+Z)
            this.setBuildingBlock(cx, doorY1, cz + halfDepth, 'base_wall', world); // Replace air with wall
            this.setBuildingBlock(cx, doorY2, cz + halfDepth, 'base_wall', world); // Replace air with wall
            this.setBuildingBlock(cx, doorY3, cz + halfDepth, 'base_wall', world); // Replace air with wall
             // Ensure lintel is wall too
             this.setBuildingBlock(cx - 1, doorY3, cz + halfDepth, 'base_wall', world);
             this.setBuildingBlock(cx + 1, doorY3, cz + halfDepth, 'base_wall', world);


            // Add door on -X side
            this.setBuildingBlock(cx - halfWidth, doorY1, cz, 'air', world); // Clear pillar/wall
            this.setBuildingBlock(cx - halfWidth, doorY2, cz, 'air', world); // Clear pillar/wall
            this.setBuildingBlock(cx - halfWidth, doorY3, cz, 'air', world); // Clear pillar/wall
            // Add Lintel
            this.setBuildingBlock(cx - halfWidth, doorY3, cz - 1, 'base_wall', world);
            this.setBuildingBlock(cx - halfWidth, doorY3, cz + 1, 'base_wall', world);

        } else if (height === 3) { // For 2-high door
             // Clear default +Z door location
             this.setBuildingBlock(cx, doorY1, cz + halfDepth, 'base_wall', world);
             this.setBuildingBlock(cx, doorY2, cz + halfDepth, 'base_wall', world);
             // Add door on -X side
             this.setBuildingBlock(cx - halfWidth, doorY1, cz, 'air', world);
             this.setBuildingBlock(cx - halfWidth, doorY2, cz, 'air', world);
        }
    }
}