// --- START OF FILE player_physics.js ---

export function updatePlayer(physics, player, world, timeStep) {
    // Apply gravity if enabled
    if (player.gravityEnabled) {
        // Use the gravity vector from the physics instance
        player.velocity.add(physics.gravity.clone().multiplyScalar(timeStep));
    } else {
        // If gravity is disabled, inputs might still control vertical velocity (E/Q keys)
        // player.applyInputs handles this case already.
    }

    // Process player inputs (which calculates velocity changes)
    // AND applies final position update based on velocity for this substep
    player.applyInputs(timeStep);

    // --- COLLISION DETECTION & RESOLUTION REMOVED ---
    // The main physics.update loop now calls physics.handleCollisions(player, world)
    // AFTER this function returns, operating on the position updated by applyInputs.
    // -----------------------------------------------
}

// --- END OF FILE player_physics.js ---