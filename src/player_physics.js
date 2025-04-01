export function updatePlayer(physics, player, world, timeStep) {
    // Apply gravity if enabled
    if (player.gravityEnabled) {
        player.velocity.add(physics.gravity.clone().multiplyScalar(timeStep));
    }

    // Process player inputs (assumed to update position/velocity)
    player.applyInputs(timeStep);

    // Collision detection and resolution
    const playerAABB = physics.computeCylinderAABB(player);
    const playerCandidates = physics.getCandidateBlocks(playerAABB, world);
    const playerCollisions = physics.detectCylinderCollisions(player, playerCandidates, world);
    physics.resolveCylinderCollisions(player, playerCollisions);
}