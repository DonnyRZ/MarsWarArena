import * as THREE from 'three';

export class WorldBoundary {
    constructor(worldParams) {
        // Store world dimensions (still useful for X/Z extents)
        this.width = worldParams.width;
        // this.height = worldParams.height; // We won't use this directly for barrier height anymore

        // Calculate world extents in world coordinates based on width
        const center = (this.width - 1) / 2;
        const minX = -center;                // e.g., for width=64, center=31.5, minX = -31.5
        const maxX = this.width - 1 - center + 1; // e.g., for width=64, maxX = 63 - 31.5 + 1 = 32.5
        const minZ = -center;
        const maxZ = this.width - 1 - center + 1;

        // Define wall thickness (small value for collision detection)
        const thickness = 0.1;

        // Define a very large height for the barriers, effectively infinite for gameplay
        const BARRIER_CEILING_HEIGHT = 1000; // Adjust if needed, but should be much higher than any jump

        // Define the base height for the barriers (can be 0 or slightly below ground)
        const BARRIER_FLOOR_HEIGHT = 0; // Assuming ground level is at or above Y=0

        // Create four AABB walls just outside the world extents
        this.barriers = [
            // Positive X wall (right side)
            new THREE.Box3(
                new THREE.Vector3(maxX, BARRIER_FLOOR_HEIGHT, minZ), // min corner (Y starts at floor)
                new THREE.Vector3(maxX + thickness, BARRIER_CEILING_HEIGHT, maxZ) // max corner (Y goes up to ceiling)
            ),
            // Negative X wall (left side)
            new THREE.Box3(
                new THREE.Vector3(minX - thickness, BARRIER_FLOOR_HEIGHT, minZ),
                new THREE.Vector3(minX, BARRIER_CEILING_HEIGHT, maxZ) // max corner (Y goes up to ceiling)
            ),
            // Positive Z wall (front side)
            new THREE.Box3(
                new THREE.Vector3(minX, BARRIER_FLOOR_HEIGHT, maxZ),
                new THREE.Vector3(maxX, BARRIER_CEILING_HEIGHT, maxZ + thickness) // max corner (Y goes up to ceiling)
            ),
            // Negative Z wall (back side)
            new THREE.Box3(
                new THREE.Vector3(minX, BARRIER_FLOOR_HEIGHT, minZ - thickness),
                new THREE.Vector3(maxX, BARRIER_CEILING_HEIGHT, minZ) // max corner (Y goes up to ceiling)
            )
        ];

        // Optional: Add a floor barrier if needed (if entities could somehow fall through blocks)
        /*
        const FLOOR_THICKNESS = 1.0;
        this.barriers.push(
            new THREE.Box3(
                new THREE.Vector3(minX, BARRIER_FLOOR_HEIGHT - FLOOR_THICKNESS, minZ),
                new THREE.Vector3(maxX, BARRIER_FLOOR_HEIGHT, maxZ)
            )
        );
        */

         // Optional: Add a ceiling barrier if needed (less common unless flying is enabled)
         /*
         const CEILING_THICKNESS = 1.0;
         this.barriers.push(
             new THREE.Box3(
                 new THREE.Vector3(minX, BARRIER_CEILING_HEIGHT, minZ),
                 new THREE.Vector3(maxX, BARRIER_CEILING_HEIGHT + CEILING_THICKNESS, maxZ)
             )
         );
         */
    }
}