import * as THREE from 'three';
import { updatePlayer } from './player_physics.js';
import { updateCreature } from './martian_physics.js';

export class Physics {
    constructor(scene, barriers) {
        this.scene = scene;
        this.barriers = barriers; // Store the barrier AABBs
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.timeStep = 1 / 120;
        this.accumulatedTime = 0;
        this.creatures = [];
    }

    addCreature(creature) {
        this.creatures.push(creature);
    }

    update(deltaTime, player, world) {
        this.accumulatedTime += deltaTime;
        let steps = 0;

        while (this.accumulatedTime >= this.timeStep && steps < 10) {
            this.accumulatedTime -= this.timeStep;
            steps++;

            updatePlayer(this, player, world, this.timeStep);
            this.creatures.forEach(creature => {
                updateCreature(this, creature, player, world, this.timeStep);
            });
        }

        if (steps >= 10) {
            console.warn("Physics step limit reached. Resetting accumulated time.");
            this.accumulatedTime = 0;
        }

        const meshesToExclude = [player.human.mesh, ...this.creatures.map(c => c.mesh)];
        this.checkGround(player, meshesToExclude);
        this.creatures.forEach(creature => {
            this.checkGround(creature, meshesToExclude);
        });
    }

    computeCylinderAABB(entity) {
        const halfHeight = entity.cylinderHeight / 2;
        const radius = entity.cylinderRadius;
        const position = entity.position;

        const min = new THREE.Vector3(
            position.x - radius,
            position.y - halfHeight,
            position.z - radius
        );
        const max = new THREE.Vector3(
            position.x + radius,
            position.y + halfHeight,
            position.z + radius
        );

        return new THREE.Box3(min, max);
    }

    getCandidateBlocks(entityAABB, world) {
        const center = (world.params.width - 1) / 2;
        const minX = entityAABB.min.x + center - 0.5;
        const maxX = entityAABB.max.x + center - 0.5;
        const minY = entityAABB.min.y - 0.5;
        const maxY = entityAABB.max.y - 0.5;
        const minZ = entityAABB.min.z + center - 0.5;
        const maxZ = entityAABB.max.z + center - 0.5;

        const i_min = Math.max(0, Math.floor(minX));
        const i_max = Math.min(world.params.width - 1, Math.floor(maxX));
        const j_min = Math.max(0, Math.floor(minY));
        const j_max = Math.min(world.params.height - 1, Math.floor(maxY));
        const k_min = Math.max(0, Math.floor(minZ));
        const k_max = Math.min(world.params.width - 1, Math.floor(maxZ));

        const candidates = [];
        for (let i = i_min; i <= i_max; i++) {
            for (let j = j_min; j <= j_max; j++) {
                for (let k = k_min; k <= k_max; k++) {
                    const block = world.getBlock(i, j, k);
                    if (block && block.id !== 'air') {
                        candidates.push({ i, j, k });
                    }
                }
            }
        }
        return candidates;
    }

    detectCylinderCollisions(entity, candidateBlocks, world) {
        const collisions = [];
        const cylinderPosition = entity.position;
        const cylinderRadius = entity.cylinderRadius;
        const cylinderHeight = entity.cylinderHeight;

        // Check collisions with world blocks
        candidateBlocks.forEach(blockCoords => {
            const blockAABB = this.getBlockAABB(blockCoords, world);
            const collision = this.checkCylinderAABBIntersection(
                cylinderPosition,
                cylinderRadius,
                cylinderHeight,
                blockAABB
            );
            if (collision.intersects) {
                collisions.push({
                    block: blockCoords,
                    penetrationDepth: collision.penetrationDepth,
                    normal: collision.normal,
                    aabb: blockAABB // Renamed to 'aabb' for consistency
                });
            }
        });

        // Check collisions with world boundaries
        this.barriers.forEach(barrierAABB => {
            const collision = this.checkCylinderAABBIntersection(
                cylinderPosition,
                cylinderRadius,
                cylinderHeight,
                barrierAABB
            );
            if (collision.intersects) {
                collisions.push({
                    penetrationDepth: collision.penetrationDepth,
                    normal: collision.normal,
                    aabb: barrierAABB
                });
            }
        });

        return collisions;
    }

    checkCylinderAABBIntersection(cylinderPosition, cylinderRadius, cylinderHeight, aabb) {
        const halfHeight = cylinderHeight / 2;
        const cylinderBottom = cylinderPosition.y - halfHeight;
        const cylinderTop = cylinderPosition.y + halfHeight;

        const closestX = THREE.MathUtils.clamp(cylinderPosition.x, aabb.min.x, aabb.max.x);
        const closestZ = THREE.MathUtils.clamp(cylinderPosition.z, aabb.min.z, aabb.max.z);

        const dx = closestX - cylinderPosition.x;
        const dz = closestZ - cylinderPosition.z;
        const distanceSqXZ = dx * dx + dz * dz;

        if (distanceSqXZ < cylinderRadius * cylinderRadius) {
            const closestY = THREE.MathUtils.clamp(cylinderPosition.y, aabb.min.y, aabb.max.y);

            if (cylinderTop > aabb.min.y && cylinderBottom < aabb.max.y) {
                const penetrationX = cylinderRadius - Math.abs(dx);
                const penetrationZ = cylinderRadius - Math.abs(dz);
                const penetrationY = Math.min(cylinderTop - aabb.min.y, aabb.max.y - cylinderBottom);

                let normal, penetrationDepth;

                const overlapX = cylinderRadius - Math.sqrt(distanceSqXZ);
                const overlapY = Math.min(cylinderTop - aabb.min.y, aabb.max.y - cylinderBottom);

                if (overlapY < overlapX) {
                    normal = new THREE.Vector3(0, Math.sign(cylinderPosition.y - closestY), 0);
                    penetrationDepth = overlapY;
                    if (normal.y === 0) normal.y = (cylinderTop > aabb.max.y) ? 1 : -1;
                } else {
                    const horizontalNormal = new THREE.Vector3(dx, 0, dz).normalize();
                    normal = horizontalNormal.multiplyScalar(-1);
                    penetrationDepth = overlapX;
                    if (normal.lengthSq() === 0) {
                        normal.set(Math.sign(cylinderPosition.x - (aabb.min.x + aabb.max.x) / 2) || 1, 0, 0);
                    }
                }

                return {
                    intersects: true,
                    penetrationDepth: penetrationDepth,
                    normal: normal
                };
            }
        }

        return { intersects: false };
    }

    resolveCylinderCollisions(entity, collisions) {
        collisions.sort((a, b) => b.penetrationDepth - a.penetrationDepth);

        collisions.forEach(collision => {
            const { normal, penetrationDepth, aabb } = collision; // Updated to 'aabb'

            if (penetrationDepth < 0.001) return;

            const recheckCollision = this.checkCylinderAABBIntersection(
                entity.position,
                entity.cylinderRadius,
                entity.cylinderHeight,
                aabb
            );

            if (!recheckCollision.intersects || recheckCollision.penetrationDepth < 0.001) {
                return;
            }

            const currentNormal = recheckCollision.normal;
            const currentDepth = recheckCollision.penetrationDepth;

            const adjustment = currentNormal.clone().multiplyScalar(currentDepth);
            entity.position.add(adjustment);

            if (entity.human && typeof entity.human.updatePosition === 'function') {
                entity.human.updatePosition(entity.position);
            }

            const velocityAlongNormal = entity.velocity.dot(currentNormal);
            if (velocityAlongNormal < 0) {
                const restitution = 0.0;
                entity.velocity.sub(currentNormal.clone().multiplyScalar(velocityAlongNormal * (1 + restitution)));
            }
        });
    }

    getBlockAABB(blockCoords, world) {
        const center = (world.params.width - 1) / 2;
        const x = blockCoords.i - center + 0.5;
        const y = blockCoords.j + 0.5;
        const z = blockCoords.k - center + 0.5;

        return new THREE.Box3(
            new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5),
            new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5)
        );
    }

    checkGround(entity, meshesToExclude) {
        const raycaster = new THREE.Raycaster();
        const groundCheckPos = entity.position.clone();
        raycaster.set(groundCheckPos, new THREE.Vector3(0, -1, 0));

        const filter = (child) => !meshesToExclude.includes(child);
        const intersects = raycaster.intersectObjects(this.scene.children.filter(filter), true);

        if (intersects.length > 0) {
            const distance = intersects[0].distance;
            const halfHeight = entity.cylinderHeight / 2;
            entity.onGround = distance <= halfHeight + 0.01;
            if (entity.onGround && entity.velocity.y < 0) {
                entity.velocity.y = 0;
            }
        } else {
            entity.onGround = false;
        }
    }
}