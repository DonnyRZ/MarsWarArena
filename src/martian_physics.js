// --- START OF FILE martian_physics.js ---

export function updateCreature(physics, creature, player, world, timeStep) {
    // 1. Update creature's AI logic (may modify velocity, state, target rotation)
    if (typeof creature.updateLogic === 'function') {
        creature.updateLogic(player, timeStep);
    }

    // 2. Apply gravity
    // Use the gravity vector from the physics instance
    creature.velocity.add(physics.gravity.clone().multiplyScalar(timeStep));

    // 3. Apply friction to horizontal velocity if on ground
    if (creature.onGround) {
        // Check velocity condition carefully - friction should slow down movement
        const horizontalSpeedSq = creature.velocity.x * creature.velocity.x + creature.velocity.z * creature.velocity.z;
        // Apply only if moving horizontally and friction is relevant
        if (horizontalSpeedSq > 0.001 && creature.friction < 1.0) {
             // Apply friction based on timestep for smoother deceleration
             // Using Math.pow ensures consistent slowdown regardless of framerate slightly better
             const frictionMultiplier = Math.pow(creature.friction, timeStep * 10); // Adjust the '10' factor to tune friction feel
             creature.velocity.x *= frictionMultiplier;
             creature.velocity.z *= frictionMultiplier;
        } else if (horizontalSpeedSq <= 0.001) {
            // Ensure velocity is exactly zero if very slow and on ground
             creature.velocity.x = 0;
             creature.velocity.z = 0;
        }
    }

    // 4. Update position based on final velocity for this substep
    creature.position.add(creature.velocity.clone().multiplyScalar(timeStep));

    // 5. Update visual rotation based on AI state (e.g., looking direction)
    // This is okay here as it doesn't affect physics position/velocity directly.
    // Assumes creature.updateRotation syncs mesh rotation with physics state/AI intent.
    if (typeof creature.updateRotation === 'function' && creature.mesh) {
        const targetYaw = Math.atan2(creature.velocity.x, creature.velocity.z); // Example: Face movement direction
        creature.updateRotation(targetYaw); // Let the martian object handle the +PI offset if needed
    }

    // --- COLLISION DETECTION & RESOLUTION REMOVED ---
    // The main physics.update loop now calls physics.handleCollisions(creature, world)
    // AFTER this function returns, operating on the position updated above.
    // -----------------------------------------------

    // --- VISUAL MESH POSITION UPDATE REMOVED ---
    // The creature's visual mesh (creature.mesh.position) should ideally be updated
    // *after* collision resolution is complete in the main loop, or interpolated smoothly.
    // For now, remove direct update here to avoid syncing to pre-resolution state.
    // The Martian class's updatePosition method might still exist but isn't called here.
    // if (typeof creature.updatePosition === 'function') {
    //    creature.updatePosition(creature.position);
    // }
    // -------------------------------------------
}

// --- END OF FILE martian_physics.js ---