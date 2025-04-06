// --- START OF FILE physics.js ---
import * as THREE from 'three';
import { updatePlayer } from './player_physics.js';
import { updateCreature } from './martian_physics.js';

// Temporary vectors to avoid allocations in loops (existing optimization)
const _tempVec3_1 = new THREE.Vector3();
const _tempVec3_2 = new THREE.Vector3();
const _aabbCenter = new THREE.Vector3();
const _cylinderPositionProjected = new THREE.Vector3(); // For clamping

export class Physics {
    constructor(scene, barriers) {
        this.scene = scene;
        this.barriers = barriers; // Store the barrier AABBs
        this.gravity = new THREE.Vector3(0, -30.8, 0);
        this.timeStep = 1 / 60; // Using a reasonably high frequency fixed step
        this.accumulatedTime = 0;
        this.creatures = [];
        this.collisionEpsilon = 0.001; // Small value to prevent floating point issues and jitter
        this.maxSubSteps = 10; // Limit physics steps per frame to prevent spiral of death
        
        // Reusable objects for ground checking (Step 4: Reuse Objects)
        this._groundCheckRaycaster = new THREE.Raycaster();
        this._groundCheckRayOrigin = new THREE.Vector3();
        this._groundCheckDownVector = new THREE.Vector3(0, -1, 0);
    }

    addCreature(creature) {
        this.creatures.push(creature);
    }

    update(deltaTime, player, world) {
        this.accumulatedTime += deltaTime;
        let steps = 0;
        const wasOnGround = player.onGround; // Store initial onGround state for Coyote Time

        // Fixed timestep loop
        while (this.accumulatedTime >= this.timeStep && steps < this.maxSubSteps) {
            this.accumulatedTime -= this.timeStep;
            steps++;

            // Decrement Coyote Time and Jump Buffer timers
            if (player.coyoteTimer > 0) {
                player.coyoteTimer -= this.timeStep;
                if (player.coyoteTimer < 0) player.coyoteTimer = 0;
            }
            if (player.jumpBufferTimer > 0) {
                player.jumpBufferTimer -= this.timeStep;
                if (player.jumpBufferTimer < 0) player.jumpBufferTimer = 0;
            }

            // Update player and creatures (applies forces/velocity, moves position)
            updatePlayer(this, player, world, this.timeStep);
            this.creatures.forEach(creature => {
                updateCreature(this, creature, player, world, this.timeStep);
            });

            // Collision Detection and Resolution Phase
            this.handleCollisions(player, world);
            this.creatures.forEach(creature => {
                this.handleCollisions(creature, world);
            });
        }

        // Warning if physics can't keep up
        if (steps >= this.maxSubSteps) {
            console.warn(`Physics step limit (${this.maxSubSteps}) reached. Resetting accumulated time.`);
            this.accumulatedTime = 0; // Prevent spiral
        }

        // Final ground check after all physics updates with optimizations (Step 1: Reduce Ray Frequency)
        const meshesToExclude = [player.human.mesh, ...this.creatures.map(c => c.mesh)];
        
        // Only check ground if entity might be near it (velocity.y <= 0.1)
        if (player.velocity.y <= 0.1) {
            this.checkGround(player, world, meshesToExclude);
        } else {
            player.onGround = false; // Entity is moving upwards, assume not on ground
        }

        this.creatures.forEach(creature => {
            if (creature.velocity.y <= 0.1) {
                this.checkGround(creature, world, meshesToExclude);
            } else {
                creature.onGround = false; // Entity is moving upwards, assume not on ground
            }
        });

        // Manage Coyote Time: Start timer if player just left the ground
        if (wasOnGround && !player.onGround) {
            player.coyoteTimer = player.coyoteTimeDuration;
        }

        // Check Jump Buffer: Execute jump if buffered and now on ground
        if (player.jumpBufferTimer > 0 && player.onGround) {
            player.velocity.y = 10;
            player.onGround = false;
            player.jumpBufferTimer = 0;
        }
    }

    // New function to encapsulate collision handling per entity
    handleCollisions(entity, world) {
        const entityAABB = this.computeCylinderAABB(entity); // Broadphase AABB for candidate selection
        const candidateBlocks = this.getCandidateBlocks(entityAABB, world);
        const collisions = this.detectCollisions(entity, candidateBlocks, world);
        this.resolveCollisions(entity, collisions);
    }

    computeCylinderAABB(entity) {
        // Computes an AABB that completely encloses the physics cylinder
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

        // Make sure min/max are correct if entity somehow has negative dimensions
        return new THREE.Box3(
            new THREE.Vector3(Math.min(min.x, max.x), Math.min(min.y, max.y), Math.min(min.z, max.z)),
            new THREE.Vector3(Math.max(min.x, max.x), Math.max(min.y, max.y), Math.max(min.z, max.z))
        );
    }

    getCandidateBlocks(entityAABB, world) {
        // Find world grid cells overlapping the entity's AABB
        const center = (world.params.width - 1) / 2;
        const buffer = 0.1;
        const minX = entityAABB.min.x + center - 0.5 - buffer;
        const maxX = entityAABB.max.x + center - 0.5 + buffer;
        const minY = entityAABB.min.y - 0.5 - buffer;
        const maxY = entityAABB.max.y - 0.5 + buffer;
        const minZ = entityAABB.min.z + center - 0.5 - buffer;
        const maxZ = entityAABB.max.z + center - 0.5 + buffer;

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

    detectCollisions(entity, candidateBlocks, world) {
        const collisions = [];
        const cylinderPosition = entity.position;
        const cylinderRadius = entity.cylinderRadius;
        const cylinderHeight = entity.cylinderHeight;

        candidateBlocks.forEach(blockCoords => {
            const blockAABB = this.getBlockAABB(blockCoords, world);
            const collision = this.checkCylinderAABBIntersectionMTV(
                cylinderPosition,
                cylinderRadius,
                cylinderHeight,
                blockAABB
            );
            if (collision.intersects) {
                collisions.push({
                    type: 'block',
                    blockCoords: blockCoords,
                    penetrationDepth: collision.penetrationDepth,
                    normal: collision.normal,
                    aabb: blockAABB
                });
            }
        });

        this.barriers.forEach(barrierAABB => {
            const collision = this.checkCylinderAABBIntersectionMTV(
                cylinderPosition,
                cylinderRadius,
                cylinderHeight,
                barrierAABB
            );
            if (collision.intersects) {
                collisions.push({
                    type: 'barrier',
                    penetrationDepth: collision.penetrationDepth,
                    normal: collision.normal,
                    aabb: barrierAABB
                });
            }
        });

        return collisions;
    }

    checkCylinderAABBIntersectionMTV(cylinderPosition, cylinderRadius, cylinderHeight, aabb) {
        const halfHeight = cylinderHeight / 2;
        const cylinderBottom = cylinderPosition.y - halfHeight;
        const cylinderTop = cylinderPosition.y + halfHeight;

        if (cylinderTop <= aabb.min.y || cylinderBottom >= aabb.max.y) {
            return { intersects: false };
        }

        const closestX = Math.max(aabb.min.x, Math.min(cylinderPosition.x, aabb.max.x));
        const closestZ = Math.max(aabb.min.z, Math.min(cylinderPosition.z, aabb.max.z));

        const dx = cylinderPosition.x - closestX;
        const dz = cylinderPosition.z - closestZ;
        const distanceSqXZ = dx * dx + dz * dz;

        if (distanceSqXZ >= cylinderRadius * cylinderRadius) {
            if (cylinderPosition.x > aabb.min.x && cylinderPosition.x < aabb.max.x &&
                cylinderPosition.z > aabb.min.z && cylinderPosition.z < aabb.max.z) {
                // Center inside AABB footprint, proceed to overlap check
            } else {
                return { intersects: false };
            }
        }

        aabb.getCenter(_aabbCenter);
        const aabbHalfWidth = (aabb.max.x - aabb.min.x) / 2;
        const aabbHalfHeight = (aabb.max.y - aabb.min.y) / 2;
        const aabbHalfDepth = (aabb.max.z - aabb.min.z) / 2;

        const diffX = cylinderPosition.x - _aabbCenter.x;
        const diffY = cylinderPosition.y - _aabbCenter.y;
        const diffZ = cylinderPosition.z - _aabbCenter.z;

        const overlapX = (cylinderRadius + aabbHalfWidth) - Math.abs(diffX);
        const overlapY = (halfHeight + aabbHalfHeight) - Math.abs(diffY);
        const overlapZ = (cylinderRadius + aabbHalfDepth) - Math.abs(diffZ);

        if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
            if (overlapX <= this.collisionEpsilon && overlapY <= this.collisionEpsilon && overlapZ <= this.collisionEpsilon) {
                return { intersects: false };
            }
        }

        let minOverlap = Infinity;
        let normal = _tempVec3_1.set(0, 0, 0);

        if (overlapX > 0) {
            minOverlap = overlapX;
            normal.set(Math.sign(diffX), 0, 0);
        }

        if (overlapY > 0 && overlapY < minOverlap) {
            minOverlap = overlapY;
            normal.set(0, Math.sign(diffY), 0);
        }
        if (overlapZ > 0 && overlapZ < minOverlap) {
            minOverlap = overlapZ;
            normal.set(0, 0, Math.sign(diffZ));
        }

        if (minOverlap === Infinity) {
            if (distanceSqXZ < cylinderRadius * cylinderRadius) {
                _tempVec3_2.set(dx, 0, dz).normalize();
                normal.set(-_tempVec3_2.x, 0, -_tempVec3_2.z);
                minOverlap = cylinderRadius - Math.sqrt(distanceSqXZ);
            } else {
                return { intersects: false };
            }
        }

        if (normal.lengthSq() < 0.0001) {
            normal.set(1, 0, 0);
            minOverlap = overlapX > 0 ? overlapX : this.collisionEpsilon;
        }

        return {
            intersects: true,
            penetrationDepth: minOverlap,
            normal: normal.clone()
        };
    }

    resolveCollisions(entity, collisions) {
        if (collisions.length === 0) {
            return;
        }

        collisions.sort((a, b) => b.penetrationDepth - a.penetrationDepth);

        collisions.forEach(collision => {
            const { normal, penetrationDepth } = collision;

            if (penetrationDepth < (this.collisionEpsilon / 10)) {
                return;
            }

            const adjustment = _tempVec3_2.copy(normal).multiplyScalar(penetrationDepth + this.collisionEpsilon);
            entity.position.add(adjustment);

            if (entity.human && typeof entity.human.updatePosition === 'function') {
                entity.human.updatePosition(entity.position);
            }

            const velocityAlongNormal = entity.velocity.dot(normal);
            if (velocityAlongNormal < 0) {
                const restitution = 0.0;
                const velocityAdjustment = normal.clone().multiplyScalar(velocityAlongNormal * (1 + restitution));
                entity.velocity.sub(velocityAdjustment);

                if (normal.y > 0.9 && entity.velocity.y >= 0) {
                    entity.onGround = true;
                }
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

    checkGround(entity, world, meshesToExclude) {
        const halfHeight = entity.cylinderHeight / 2;
        
        // Step 2: Optimize Ray Targets - Only check against world.instancedMeshes
        const collidableObjects = world.instancedMeshes; // Assumes this is an array of ground meshes

        // Step 3: Reduce Ray Count - Use only the central ray
        // Step 4: Reuse Objects - Use pre-allocated Raycaster and Vector3 objects
        this._groundCheckRayOrigin.copy(entity.position);
        this._groundCheckRayOrigin.y = entity.position.y - halfHeight;
        this._groundCheckRaycaster.set(this._groundCheckRayOrigin, this._groundCheckDownVector);
        
        // Step 5: Tune Ray Parameters - Increase far distance for reliability
        this._groundCheckRaycaster.far = 0.25;
        
        const intersects = this._groundCheckRaycaster.intersectObjects(collidableObjects, false); // Non-recursive check

        // Check if the ray hits the ground within tolerance
        if (intersects.length > 0 && intersects[0].distance <= 0.05) {
            entity.onGround = true;
        } else {
            entity.onGround = false;
        }

        // Reset vertical velocity if on ground and falling
        if (entity.onGround && entity.velocity.y < 0) {
            entity.velocity.y = 0;
        }
    }
}
// --- END OF FILE physics.js ---