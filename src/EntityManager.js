// --- START OF FILE EntityManager.js ---

// src/EntityManager.js
import * as THREE from 'three'; // Needed for potential future THREE operations, good practice to include

export class EntityManager {
    /**
     * Manages active game entities like creatures, projectiles, effects.
     * @param {THREE.Scene} scene - The main scene object for removing meshes.
     * @param {Array} creatures - Reference to the array holding creatures (e.g., physics.creatures).
     * @param {Array} ghasts - Reference to the array holding active Ghasts.
     */
    constructor(scene, creatures, ghasts) {
        if (!scene) {
            throw new Error("EntityManager requires a scene object.");
        }
        this.scene = scene;
        // Store references to arrays managed externally (Creatures/Ghasts for now)
        this.creatures = creatures; // e.g., physics.creatures
        this.ghasts = ghasts;       // e.g., activeGhasts

        // Internal arrays for projectiles/effects
        this.fireballs = [];
        this.laserBeams = [];

        this.creatureRemovalDelay = 5.0; // <<< NEW: Delay in seconds before removing dead creatures

        console.log("EntityManager Initialized.");
    }

    // --- Methods to Add Projectiles ---
    addFireball(fireball) { if (fireball) { this.fireballs.push(fireball); } }
    addLaserBeam(beam) { if (beam && beam.mesh && beam.despawnTime) { this.laserBeams.push(beam); } }

    // --- Method to Clear Projectiles ---
    clearProjectiles() {
        console.log("EntityManager: Clearing projectiles...");
        this.fireballs.forEach(fireball => { if (fireball?.destroy) fireball.destroy(); });
        this.fireballs.length = 0;
        this.laserBeams.forEach(beam => { if (beam.mesh) { this.scene.remove(beam.mesh); if (beam.mesh.geometry) beam.mesh.geometry.dispose(); if (beam.mesh.material) beam.mesh.material.dispose(); } });
        this.laserBeams.length = 0;
        console.log("EntityManager: Projectiles cleared.");
    }

     // --- Method to Clear ALL Entities tracked by EntityManager (including projectiles) ---
     clearAllManagedEntities() {
         console.log("EntityManager: Clearing ALL internally managed entities...");
         this.clearProjectiles();
         // Note: GameStateManager handles scene removal of creatures/ghasts during world cleanup
         console.log("EntityManager: Internally managed entities cleared.");
     }


    /**
     * Updates all managed entities.
     * @param {number} deltaTime - Time elapsed since the last frame.
     * @param {Player} player - Reference to the player object (needed for AI).
     * @param {string} currentGameState - The current game state (e.g., 'MARTIAN_HUNT') to gate updates.
     */
    update(deltaTime, player, currentGameState) {

        // --- Fireball Update & Cleanup ---
        let i_fb = this.fireballs.length;
        while (i_fb--) {
            const fireball = this.fireballs[i_fb];
            if (!fireball) { this.fireballs.splice(i_fb, 1); continue; }
            fireball.update(deltaTime);
            if (fireball.toBeRemoved) { fireball.destroy(); this.fireballs.splice(i_fb, 1); }
        }

        // --- Martian Update (Visual Lerp & Cleanup) ---
        if (currentGameState === 'MARTIAN_HUNT' && this.creatures) {
            // Iterate backwards to allow safe removal
            for (let i_cr = this.creatures.length - 1; i_cr >= 0; i_cr--) {
                const creature = this.creatures[i_cr];
                 if (!creature) {
                     this.creatures.splice(i_cr, 1); // Clean up null entries
                     continue;
                 }

                if (creature.isDead) {
                    // <<< NEW: Handle dead creature removal >>>
                    creature.timeSinceDeath += deltaTime; // Increment timer
                    if (creature.timeSinceDeath > this.creatureRemovalDelay) {
                        console.log(`Removing dead creature (index ${i_cr}) after delay.`);
                        // Remove mesh from scene
                        if (creature.mesh && creature.mesh.parent) {
                            this.scene.remove(creature.mesh);
                        }
                        // Dispose geometry and material(s)
                        if (creature.mesh?.geometry) creature.mesh.geometry.dispose();
                        if (creature.mesh?.material) {
                            if (Array.isArray(creature.mesh.material)) {
                                creature.mesh.material.forEach(m => m.dispose());
                            } else {
                                creature.mesh.material.dispose();
                            }
                        }
                        // Remove from the physics/entity array
                        this.creatures.splice(i_cr, 1);
                    }
                    // <<< END NEW >>>
                } else {
                    // Perform visual lerp for alive creatures
                    if (creature.mesh && creature.visualPosition && creature.position) {
                        creature.visualPosition.lerp(creature.position, 0.15);
                        creature.mesh.position.copy(creature.visualPosition);
                    }
                    // Keep alive creature's logic update if needed (though it's called in physics step)
                    // if (typeof creature.updateLogic === 'function') {
                    //     creature.updateLogic(player, deltaTime);
                    // }
                }
            }
        }

        // --- Ghast Update (Logic & Visual Lerp & Cleanup) ---
        if (currentGameState === 'MARTIAN_HUNT' && this.ghasts) {
             // Iterate backwards for potential future cleanup logic
             for (let i_gh = this.ghasts.length - 1; i_gh >= 0; i_gh--) {
                 const ghast = this.ghasts[i_gh];
                  if (!ghast) {
                      this.ghasts.splice(i_gh, 1); // Clean up null entries
                      continue;
                  }
                 if (ghast.isDead) {
                     // Ghast.die() handles fade out. GameStateManager handles final scene removal.
                     // If we needed timed removal like Martians, logic would go here.
                 } else {
                     // Update logic (needs player and internal fireballs array)
                     ghast.updateLogic(deltaTime, player, this.fireballs); // Pass internal fireballs
                     // Perform visual lerp
                     if (ghast.mesh && ghast.visualPosition && ghast.position) {
                         ghast.mesh.position.lerp(ghast.position, 0.1); // Lerp visual position
                     }
                 }
             }
        }


        // --- Laser Beam Cleanup ---
        let i_lb = this.laserBeams.length;
        const currentTime = performance.now();
        while (i_lb--) {
            const beam = this.laserBeams[i_lb];
            if (currentTime >= beam.despawnTime) {
                if (beam.mesh) { this.scene.remove(beam.mesh); if (beam.mesh.geometry) beam.mesh.geometry.dispose(); if (beam.mesh.material) beam.mesh.material.dispose(); }
                this.laserBeams.splice(i_lb, 1);
            }
        }
    }
}
// --- END OF FILE EntityManager.js ---