// --- START OF FILE physics.js ---
// PHASE 5: Removed activeFireballs dependency, updated handleFireballCollisions signature
// PHASE 6: Added player knockback on fireball collision

import * as THREE from 'three';
import { updateCreature } from './martian_physics.js';

// Temporary vectors
const _tempVec3_1 = new THREE.Vector3();
const _tempVec3_2 = new THREE.Vector3();
const _aabbCenter = new THREE.Vector3();
const _fireballCheckPos = new THREE.Vector3();
const _playerCheckPos = new THREE.Vector3();
const _groundCheckRayOrigin = new THREE.Vector3();
const _groundCheckDownVector = new THREE.Vector3(0, -1, 0);
const _intersectionPoint = new THREE.Vector3();

export class Physics {
    // constructor(scene, barriers, activeFireballs) { // OLD Signature
    constructor(scene, barriers) { // <<<--- NEW Signature (remove activeFireballs)
        if (!scene) {
            console.error("Physics constructor requires a scene object.");
        }
        this.scene = scene;
        this.barriers = barriers || [];
        this.gravity = new THREE.Vector3(0, -30.8, 0);
        this.timeStep = 1 / 60;
        this.accumulatedTime = 0;
        this.creatures = []; // Still holds creatures added via addCreature
        // this.activeFireballs = activeFireballs || []; // <<<--- REMOVED
        this.collisionEpsilon = 0.001;
        this.maxSubSteps = 10;

        this._groundCheckRaycaster = new THREE.Raycaster();
    }

    addCreature(creature) {
        if (creature) {
            this.creatures.push(creature);
        } else {
            console.warn("Attempted to add null/undefined creature to physics.");
        }
    }

    step(deltaTime, player, world) {
        if (!player || !world || !world.params || !world.instancedMeshes) {
            console.error("Physics.step missing player or valid world object. Skipping step.");
            return;
        }

        this.accumulatedTime += deltaTime;
        let steps = 0;

        // Prepare list of meshes to exclude (currently unused but kept)
        const meshesToExclude = [];

        while (this.accumulatedTime >= this.timeStep && steps < this.maxSubSteps) {
            this.accumulatedTime -= this.timeStep;
            steps++;

            // Player Physics Step
            if (typeof player.updatePhysicsStep === 'function') {
                player.updatePhysicsStep(this, world, this.timeStep);
            }
            this.handleCollisions(player, world);
            // Ground check is done outside the step loop in main.js

            // Creature Physics Step
            this.creatures.forEach(creature => {
                if (creature) {
                     if (typeof updateCreature === 'function') {
                         updateCreature(this, creature, player, world, this.timeStep);
                     }
                     this.handleCollisions(creature, world);
                     // Ground check is done outside the step loop in main.js
                }
            });

        } // End of while loop

        if (steps >= this.maxSubSteps) {
            console.warn(`Physics step limit (${this.maxSubSteps}) reached. Resetting accumulated time.`);
            this.accumulatedTime = 0;
        }
    }


    // --- handleCollisions method ---
    handleCollisions(entity, world) {
         if (!entity || !entity.position || !world) return;
         const entityAABB = this.computeCylinderAABB(entity);
         const candidateBlocks = this.getCandidateBlocks(entityAABB, world);
         const collisions = this.detectCollisions(entity, candidateBlocks, world);
         this.resolveCollisions(entity, collisions);
    }

    // --- computeCylinderAABB method ---
    computeCylinderAABB(entity) {
         const halfHeight = (entity.cylinderHeight || 1.0) / 2;
         const radius = entity.cylinderRadius || 0.5;
         const position = entity.position;
         const min = _tempVec3_1.set(position.x - radius, position.y - halfHeight, position.z - radius);
         const max = _tempVec3_2.set(position.x + radius, position.y + halfHeight, position.z + radius);
         return new THREE.Box3(min.clone(), max.clone());
    }

    // --- getCandidateBlocks method ---
    getCandidateBlocks(entityAABB, world) {
         const centerOffset = world.worldCenterOffset;
         const buffer = 0.1;
         const minX = entityAABB.min.x + centerOffset - buffer;
         const maxX = entityAABB.max.x + centerOffset + buffer;
         const minY = entityAABB.min.y - buffer;
         const maxY = entityAABB.max.y + buffer;
         const minZ = entityAABB.min.z + centerOffset - buffer;
         const maxZ = entityAABB.max.z + centerOffset + buffer;
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

    // --- detectCollisions method ---
    detectCollisions(entity, candidateBlocks, world) {
         const collisions = [];
         const cylinderPosition = entity.position;
         const cylinderRadius = entity.cylinderRadius || 0.5;
         const cylinderHeight = entity.cylinderHeight || 1.0;
         candidateBlocks.forEach(blockCoords => {
             const blockAABB = this.getBlockAABB(blockCoords, world);
             const collision = this.checkCylinderAABBIntersectionMTV(cylinderPosition, cylinderRadius, cylinderHeight, blockAABB);
             if (collision.intersects) {
                 collisions.push({ type: 'block', blockCoords: blockCoords, penetrationDepth: collision.penetrationDepth, normal: collision.normal, aabb: blockAABB });
             }
         });
         this.barriers.forEach(barrierAABB => {
             const collision = this.checkCylinderAABBIntersectionMTV(cylinderPosition, cylinderRadius, cylinderHeight, barrierAABB);
             if (collision.intersects) {
                 collisions.push({ type: 'barrier', penetrationDepth: collision.penetrationDepth, normal: collision.normal, aabb: barrierAABB });
             }
         });
         return collisions;
    }

    // --- checkCylinderAABBIntersectionMTV method ---
    checkCylinderAABBIntersectionMTV(cylinderPosition, cylinderRadius, cylinderHeight, aabb) {
          const halfHeight = cylinderHeight / 2;
          const cylinderBottom = cylinderPosition.y - halfHeight;
          const cylinderTop = cylinderPosition.y + halfHeight;
          if (cylinderTop <= aabb.min.y || cylinderBottom >= aabb.max.y) { return { intersects: false }; }
          const closestX = Math.max(aabb.min.x, Math.min(cylinderPosition.x, aabb.max.x));
          const closestZ = Math.max(aabb.min.z, Math.min(cylinderPosition.z, aabb.max.z));
          const dx = cylinderPosition.x - closestX;
          const dz = cylinderPosition.z - closestZ;
          const distanceSqXZ = dx * dx + dz * dz;
          if (distanceSqXZ >= cylinderRadius * cylinderRadius) {
              const centerInsideFootprint = cylinderPosition.x >= aabb.min.x && cylinderPosition.x <= aabb.max.x && cylinderPosition.z >= aabb.min.z && cylinderPosition.z <= aabb.max.z;
              if (!centerInsideFootprint) { return { intersects: false }; }
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
          if (overlapX <= this.collisionEpsilon || overlapY <= this.collisionEpsilon || overlapZ <= this.collisionEpsilon) { return { intersects: false }; }
          let minOverlap = overlapX;
          let normal = _tempVec3_1.set(Math.sign(diffX), 0, 0);
          if (overlapY < minOverlap) { minOverlap = overlapY; normal.set(0, Math.sign(diffY), 0); }
          if (overlapZ < minOverlap) { minOverlap = overlapZ; normal.set(0, 0, Math.sign(diffZ)); }
          if (normal.lengthSq() < 0.0001) { normal.set(1, 0, 0); minOverlap = overlapX; console.warn("Collision centers aligned, defaulting normal to X."); }
          return { intersects: true, penetrationDepth: minOverlap, normal: normal.clone() };
      }

    // --- resolveCollisions method ---
    resolveCollisions(entity, collisions) {
         if (collisions.length === 0) return;
         collisions.forEach(collision => {
             const { normal, penetrationDepth } = collision;
             if (penetrationDepth < this.collisionEpsilon) return;
             const adjustment = _tempVec3_2.copy(normal).multiplyScalar(penetrationDepth + this.collisionEpsilon * 0.1);
             entity.position.add(adjustment);
             const velocityAlongNormal = entity.velocity.dot(normal);
             if (velocityAlongNormal < 0) {
                 const restitution = 0.0;
                 const velocityAdjustment = normal.clone().multiplyScalar(-velocityAlongNormal * (1 + restitution));
                 entity.velocity.add(velocityAdjustment);
             }
         });
    }

    // --- getBlockAABB method ---
    getBlockAABB(blockCoords, world) {
         const centerOffset = world.worldCenterOffset;
         const blockWorldX = blockCoords.i - centerOffset;
         const blockWorldY = blockCoords.j;
         const blockWorldZ = blockCoords.k - centerOffset;
         return new THREE.Box3(
             _tempVec3_1.set(blockWorldX - 0.5, blockWorldY - 0.5, blockWorldZ - 0.5),
             _tempVec3_2.set(blockWorldX + 0.5, blockWorldY + 0.5, blockWorldZ + 0.5)
         );
    }

    // --- checkGround method ---
    checkGround(entity, world, meshesToExclude) {
         if (!entity || !entity.position || !world || !world.instancedMeshes || !entity.cylinderHeight || !entity.cylinderRadius) { if(entity) entity.onGround = false; return; }
         const halfHeight = entity.cylinderHeight / 2;
         _groundCheckRayOrigin.copy(entity.position);
         _groundCheckRayOrigin.y -= (halfHeight * 0.9);
         this._groundCheckRaycaster.set(_groundCheckRayOrigin, _groundCheckDownVector);
         const checkDistance = (halfHeight * 0.1) + 0.15;
         this._groundCheckRaycaster.far = checkDistance;
         let hitGround = false;
         let hitDistance = Infinity;
         let isWorldBlockHit = false;
         const worldIntersects = this._groundCheckRaycaster.intersectObjects(world.instancedMeshes, false);
         if (worldIntersects.length > 0) {
             for (let i = 0; i < worldIntersects.length; i++) {
                 const hit = worldIntersects[i];
                 if (hit.face && hit.face.normal.y > 0.7) {
                     if (hit.distance <= checkDistance) {
                         hitGround = true;
                         hitDistance = hit.distance;
                         isWorldBlockHit = true;
                         break;
                     }
                 }
             }
         }
         if (!isWorldBlockHit && this.barriers && this.barriers.length > 0) {
             let closestBarrierHitDist = Infinity;
             for (const barrierAABB of this.barriers) {
                 if (barrierAABB.max.y < _groundCheckRayOrigin.y - checkDistance) { continue; }
                 const intersectionResult = this._groundCheckRaycaster.ray.intersectBox(barrierAABB, _intersectionPoint);
                 if (intersectionResult) {
                     const dist = _groundCheckRayOrigin.distanceTo(_intersectionPoint);
                     if (dist <= checkDistance && dist < closestBarrierHitDist) {
                         if (Math.abs(_intersectionPoint.y - barrierAABB.max.y) < 0.01) {
                             hitGround = true;
                             closestBarrierHitDist = dist;
                         }
                     }
                 }
             }
             if (hitGround && !isWorldBlockHit) { hitDistance = closestBarrierHitDist; }
         }
         entity.onGround = hitGround;
         if (entity.onGround) {
             const hitPointY = _groundCheckRayOrigin.y + (_groundCheckDownVector.y * hitDistance);
             const cylinderBottomY = entity.position.y - halfHeight;
             const penetration = hitPointY - cylinderBottomY;
             if (penetration > this.collisionEpsilon && penetration < checkDistance) {
                entity.position.y += penetration;
             }
             if (entity.velocity.y < 0) {
                 entity.velocity.y = 0;
             }
         }
     }

     // --- handleFireballCollisions method ---
     // handleFireballCollisions(player) { // OLD Signature
     handleFireballCollisions(player, fireballs) { // <<<--- NEW Signature (accept fireballs array)
        // Use the passed 'fireballs' array instead of 'this.activeFireballs'
        if (!player || player.isDead || !fireballs || fireballs.length === 0) { // <<<--- Use passed array
            return;
        }

        const playerHalfHeight = player.cylinderHeight / 2;
        const playerBottom = player.position.y - playerHalfHeight;
        const playerTop = player.position.y + playerHalfHeight;
        _playerCheckPos.copy(player.position);

        // Iterate backwards for safe removal (though removal is now handled by EntityManager)
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const fireball = fireballs[i];
            // Ensure fireball exists and hasn't already been marked for removal this frame
            if (!fireball || fireball.toBeRemoved || !fireball.mesh) continue;

            _fireballCheckPos.copy(fireball.mesh.position);
            const fireballRadius = (fireball.mesh.geometry && fireball.mesh.geometry.parameters)
                                   ? fireball.mesh.geometry.parameters.radius || 0.5 : 0.5;

            // Simple sphere-cylinder collision check
            const fireballBottom = _fireballCheckPos.y - fireballRadius;
            const fireballTop = _fireballCheckPos.y + fireballRadius;
            const verticalOverlap = !(fireballTop < playerBottom || fireballBottom > playerTop);

            if (!verticalOverlap) continue;

            const dx = _playerCheckPos.x - _fireballCheckPos.x;
            const dz = _playerCheckPos.z - _fireballCheckPos.z;
            const distanceSqXZ = dx * dx + dz * dz;
            const combinedRadius = player.cylinderRadius + fireballRadius;
            const combinedRadiusSq = combinedRadius * combinedRadius;

            if (distanceSqXZ <= combinedRadiusSq) {
                console.log("   >>> FIREBALL COLLISION DETECTED <<<");
                player.takeDamage(fireball.damage);

                // --- Calculate Knockback ---
                const knockbackDirection = _tempVec3_1; // Reuse temporary vector
                knockbackDirection.subVectors(player.position, fireball.mesh.position);

                // Handle potential zero vector if positions are identical (highly unlikely)
                if (knockbackDirection.lengthSq() < 0.0001) {
                    knockbackDirection.set(0, 1, 0); // Default push upwards
                } else {
                    knockbackDirection.normalize();
                }

                // Add slight upward bias
                const verticalBias = 0.3; // CONFIGURABLE: Tune this value (0.2 to 0.5 is common)
                knockbackDirection.y = Math.max(knockbackDirection.y, verticalBias);
                knockbackDirection.normalize(); // Re-normalize after adjusting Y

                // Define strength
                const knockbackStrength = 15.0; // CONFIGURABLE: Tune this value

                // Calculate final velocity impulse
                const knockbackVelocity = _tempVec3_2; // Reuse another temporary vector
                knockbackVelocity.copy(knockbackDirection).multiplyScalar(knockbackStrength);

                // --- Apply the knockback ---
                player.velocity.add(knockbackVelocity);
                // --- Optional: Log the change for debugging ---
                // console.log(`Applied knockback: (${knockbackVelocity.x.toFixed(2)}, ${knockbackVelocity.y.toFixed(2)}, ${knockbackVelocity.z.toFixed(2)})`);

                fireball.toBeRemoved = true; // Mark for removal by EntityManager

                // DO NOT SPLICE the array here. Let EntityManager handle it.
            }
        }
    }

} // End of Physics class
// --- END OF FILE physics.js ---