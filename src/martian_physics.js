export function updateCreature(physics, creature, player, world, timeStep) {
    // Update creature's AI logic
    if (typeof creature.updateLogic === 'function') {
        creature.updateLogic(player, timeStep);
    }

    // Apply gravity
    creature.velocity.add(physics.gravity.clone().multiplyScalar(timeStep));

    // Apply friction to horizontal velocity if on ground
    if (creature.onGround) {
        if (creature.velocity.y <= 0) {
            creature.velocity.x *= creature.friction;
            creature.velocity.z *= creature.friction;
        }
    }

    // Update position based on velocity
    creature.position.add(creature.velocity.clone().multiplyScalar(timeStep));

    // Collision detection and resolution
    const creatureAABB = physics.computeCylinderAABB(creature);
    const creatureCandidates = physics.getCandidateBlocks(creatureAABB, world);
    const creatureCollisions = physics.detectCylinderCollisions(creature, creatureCandidates, world);
    physics.resolveCylinderCollisions(creature, creatureCollisions);

    // Update visual mesh position (if not handled elsewhere)
    if (typeof creature.updatePosition === 'function') {
        creature.updatePosition(creature.position);
    }
}