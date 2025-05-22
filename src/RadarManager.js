// --- START OF FILE RadarManager.js ---

import { Martian } from './martian.js'; // For instanceof check
import { Ghast } from './Ghast.js';   // For instanceof check
// Note: No THREE import needed here if RadarDisplay handles all THREE.Vector math internally

export class RadarManager {
    /**
     * Manages the update cycle and data provision for the RadarDisplay.
     * @param {RadarDisplay} radarDisplayInstance - The instance of the RadarDisplay class.
     * @param {Player} playerInstance - The player object.
     * @param {Physics} physicsInstance - The physics system instance (for creatures array).
     * @param {Array} activeGhastsArrayRef - A reference to the array holding active Ghasts.
     * @param {GameStateManager} gameStateManagerInstance - The game state manager instance.
     */
    constructor(radarDisplayInstance, playerInstance, physicsInstance, activeGhastsArrayRef, gameStateManagerInstance) {
        this.radarDisplay = radarDisplayInstance;
        this.player = playerInstance;
        this.physics = physicsInstance;
        this.activeGhasts = activeGhastsArrayRef; // This is a reference to the array in main.js
        this.gameStateManager = gameStateManagerInstance;

        this.isValid = false;
        if (this.radarDisplay && this.radarDisplay.ctx && this.player && this.physics && this.activeGhasts && this.gameStateManager) {
            this.isValid = true;
            console.log("RadarManager initialized successfully.");
        } else {
            console.warn("RadarManager: Initialization failed due to missing dependencies. Radar updates will be skipped.");
            if (!this.radarDisplay || !this.radarDisplay.ctx) console.warn("RadarManager: radarDisplay not properly initialized.");
            if (!this.player) console.warn("RadarManager: playerInstance missing.");
            if (!this.physics) console.warn("RadarManager: physicsInstance missing.");
            if (!this.activeGhasts) console.warn("RadarManager: activeGhastsArrayRef missing.");
            if (!this.gameStateManager) console.warn("RadarManager: gameStateManagerInstance missing.");
        }
    }

    /**
     * Updates the world boundary extents that the radar should be aware of.
     * @param {BaseWorld | MarsBaseWorld | MartianHuntWorld} world - The current world object.
     */
    updateWorldExtents(world) {
        if (!this.isValid || !this.radarDisplay) {
            // console.warn("RadarManager: Cannot update world extents. Manager or RadarDisplay not valid.");
            if (this.radarDisplay) this.radarDisplay.setWorldExtents(null); // Still try to clear
            return;
        }
        if (!world || !world.params || world.params.width === undefined) {
            // console.warn("RadarManager: Invalid world object passed to updateWorldExtents.");
            this.radarDisplay.setWorldExtents(null); // Clear extents if world is invalid
            return;
        }

        const centerOffset = (world.params.width - 1) / 2;
        this.radarDisplay.setWorldExtents({
            minX: -centerOffset,
            maxX: world.params.width - 1 - centerOffset,
            minZ: -centerOffset,
            maxZ: world.params.width - 1 - centerOffset
        });
        // console.log("RadarManager: World extents updated for radar.");
    }

    /**
     * Called each frame to gather data and update the radar display.
     */
    update() {
        if (!this.isValid || !this.player.human?.mesh) { // Check player.human.mesh for yaw
            return;
        }

        let entitiesToDraw = [];
        if (this.gameStateManager.gameState === 'MARTIAN_HUNT') {
            const aliveMartians = this.physics.creatures?.filter(c => c instanceof Martian && !c.isDead) || [];
            const aliveGhasts = this.activeGhasts?.filter(g => g && !g.isDead) || [];
            entitiesToDraw = [...aliveMartians, ...aliveGhasts];
        } else if (this.gameStateManager.gameState === 'MARS_BASE') {
            // For Mars Base, we currently only show the player implicitly.
            // If you wanted to show other static markers (like portal or buildings),
            // you would gather them here.
            entitiesToDraw = [];
        }
        // For other game states, entitiesToDraw remains empty unless specified.

        const playerYaw = this.player.human.mesh.rotation.y;
        this.radarDisplay.update(this.player, entitiesToDraw, playerYaw);
    }
}
// --- END OF FILE RadarManager.js ---