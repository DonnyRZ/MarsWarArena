// src/GhastMovement.js
import * as THREE from 'three';
import { MathUtils } from 'three/src/math/MathUtils.js'; // For random number generation

export class GhastMovement {
    constructor(ghast, world, territory) {
        if (!ghast || !world || !territory || territory.minX === undefined) {
            console.error("GhastMovement constructor missing required arguments or invalid territory:", { ghast, world, territory });
            throw new Error("GhastMovement requires ghast, world, and valid territory objects.");
        }
        this.ghast = ghast;
        this.world = world;
        this.territory = territory; // { minX, maxX, minZ, maxZ } in world coordinates

        // --- Movement Parameters ---
        this.speed = 3.5; // Average world units per second
        this.turnSpeed = 0.8; // Radians per second for smooth turning
        this.targetReachedThresholdSq = 1.5 * 1.5; // Squared distance to consider target reached
        this.newTargetIntervalMin = 4.0; // Seconds minimum before picking new target (when idle)
        this.newTargetIntervalMax = 9.0; // Seconds maximum (when idle)
        this.altitudeMin = 5; // <<<--- INCREASED Min blocks above ground
        this.altitudeMax = 20; // Max blocks above ground
        this.preferredAltitudeMin = 8; // <<<--- INCREASED Preferred range
        this.preferredAltitudeMax = 15;
        this.preferredAltitudeProbability = 0.8; // 80% chance (when idle)

        // --- Attack Movement Parameters --- <<< NEW
        this.minAttackDistance = 15.0; // Try to stay further than this
        this.maxAttackDistance = 25.0; // Try to stay closer than this
        this.hoverSpeedMultiplier = 0.5; // Slower speed when hovering/adjusting distance

        // --- State Variables ---
        this.currentTargetPosition = null;
        this.timeSinceTarget = Math.random() * this.newTargetIntervalMax; // Start with random time

        // --- Reusable Objects for Calculation ---
        this._tempTargetVec = new THREE.Vector3();
        this._tempDirectionVec = new THREE.Vector3();
        this._currentQuat = new THREE.Quaternion();
        this._targetQuat = new THREE.Quaternion();
        this._upVec = new THREE.Vector3(0, 1, 0);
        this._lookHelper = new THREE.Object3D();
        this._tempPlayerDirection = new THREE.Vector3(); // For attack movement
    }

    // <<<--- MODIFIED: Added player parameter --- >>>
    update(deltaTime, player) {
        this.timeSinceTarget += deltaTime;

        // --- Decide Movement Mode: Idle/Wander vs Attack/Maintain Distance ---
        let isAttacking = this.ghast.isAttackingOrCoolingDown && player && !player.isDead;
        let currentSpeed = this.speed;

        if (isAttacking) {
            // --- Attack Movement Logic ---
            this._calculateAttackTargetPosition(player);
            currentSpeed *= this.hoverSpeedMultiplier; // Move slower when attacking/hovering
            this.timeSinceTarget = 0; // Prevent idle target switching while attacking

        } else {
            // --- Idle/Wander Movement Logic ---
            let needsNewTarget = false;
            if (!this.currentTargetPosition) {
                needsNewTarget = true;
            } else {
                const distanceSq = this.ghast.position.distanceToSquared(this.currentTargetPosition);
                if (distanceSq < this.targetReachedThresholdSq) {
                    needsNewTarget = true;
                } else if (this.timeSinceTarget > this.newTargetIntervalMax) {
                    needsNewTarget = true;
                } else if (this.timeSinceTarget > this.newTargetIntervalMin && Math.random() < 0.1 * deltaTime) {
                    needsNewTarget = true; // Small chance to switch target early
                }
            }

            if (needsNewTarget) {
                this._calculateNewWanderTargetPosition();
                this.timeSinceTarget = 0; // Reset timer
            }
        }


        // --- Move Towards Current Target (Applies to both modes) ---
        if (this.currentTargetPosition) {
            // Calculate direction (normalized)
            this._tempDirectionVec.subVectors(this.currentTargetPosition, this.ghast.position);
            const distanceToTarget = this._tempDirectionVec.length();

            // --- Smooth Rotation (Revised) ---
            if (distanceToTarget > 0.1) { // Only rotate if actually moving
                // Normalize the direction vector
                this._tempDirectionVec.normalize();

                // Use helper object to look along the direction
                this._lookHelper.position.set(0,0,0); // Reset helper position
                this._lookHelper.lookAt(this._tempDirectionVec); // Make helper look along the direction
                this._targetQuat.copy(this._lookHelper.quaternion); // Get the target orientation

                // Get current mesh quaternion
                this._currentQuat.copy(this.ghast.mesh.quaternion);

                // Interpolate using Slerp
                this._currentQuat.slerp(this._targetQuat, this.turnSpeed * deltaTime);

                // Apply the interpolated rotation
                this.ghast.mesh.quaternion.copy(this._currentQuat);

            } // End rotation logic


            // Calculate move distance for this frame AFTER rotation logic
            let moveDistance = currentSpeed * deltaTime; // Use potentially modified speed
            moveDistance = Math.min(moveDistance, distanceToTarget); // Don't overshoot

            // Calculate potential next position using the CURRENT direction (before normalization above)
            this._tempDirectionVec.subVectors(this.currentTargetPosition, this.ghast.position); // Re-calculate (or store before normalize)
            this._tempTargetVec.copy(this.ghast.position).addScaledVector(this._tempDirectionVec.normalize(), moveDistance);


            // --- Boundary Enforcement ---
            // Clamp X and Z to territory
            this._tempTargetVec.x = MathUtils.clamp(this._tempTargetVec.x, this.territory.minX, this.territory.maxX);
            this._tempTargetVec.z = MathUtils.clamp(this._tempTargetVec.z, this.territory.minZ, this.territory.maxZ);

            // Clamp Y based on ground height *at the potential new XZ*
            const groundY = this._getGroundHeight(this._tempTargetVec.x, this._tempTargetVec.z);
            const minY = groundY + this.altitudeMin; // Use updated min altitude
            const maxY = groundY + this.altitudeMax;
            this._tempTargetVec.y = MathUtils.clamp(this._tempTargetVec.y, minY, maxY);

            // --- Apply Position Update ---
            this.ghast.position.copy(this._tempTargetVec);

        }
    }

    // --- NEW: Calculate target position when attacking/maintaining distance ---
    _calculateAttackTargetPosition(player) {
        if (!player) return; // Should not happen if called correctly

        const ghastPos = this.ghast.position;
        const playerPos = player.position;
        const idealDistance = (this.minAttackDistance + this.maxAttackDistance) / 2;

        // Direction from Ghast to Player
        this._tempPlayerDirection.subVectors(playerPos, ghastPos);
        const currentDistance = this._tempPlayerDirection.length();
        this._tempPlayerDirection.normalize(); // Normalize AFTER getting length

        let targetX, targetZ;
        const hoverOffset = 2.0; // Small distance for hover adjustment

        if (currentDistance < this.minAttackDistance) {
            // Too close, move away from player
            targetX = ghastPos.x - this._tempPlayerDirection.x * hoverOffset;
            targetZ = ghastPos.z - this._tempPlayerDirection.z * hoverOffset;
        } else if (currentDistance > this.maxAttackDistance) {
            // Too far, move towards player
            targetX = ghastPos.x + this._tempPlayerDirection.x * hoverOffset;
            targetZ = ghastPos.z + this._tempPlayerDirection.z * hoverOffset;
        } else {
            // Within ideal range, hover slightly (optional: add slight random strafe)
            targetX = ghastPos.x + (Math.random() - 0.5) * 0.5; // Small random jitter
            targetZ = ghastPos.z + (Math.random() - 0.5) * 0.5;
        }

        // Determine target altitude (maintain preferred altitude)
        const groundY = this._getGroundHeight(targetX, targetZ);
        let targetAltitude = MathUtils.randFloat(this.preferredAltitudeMin, this.preferredAltitudeMax);
        let targetY = groundY + targetAltitude;
        targetY = MathUtils.clamp(targetY, groundY + this.altitudeMin, groundY + this.altitudeMax);

        // Set the target position
        if (!this.currentTargetPosition) {
            this.currentTargetPosition = new THREE.Vector3();
        }
        this.currentTargetPosition.set(targetX, targetY, targetZ);
    }


    // --- Renamed: Calculate target position when wandering ---
    _calculateNewWanderTargetPosition() {
        // Random X/Z within territory
        const targetX = MathUtils.randFloat(this.territory.minX, this.territory.maxX);
        const targetZ = MathUtils.randFloat(this.territory.minZ, this.territory.maxZ);

        // Find ground height below target X/Z
        const groundY = this._getGroundHeight(targetX, targetZ);

        // Determine target altitude based on probability
        let targetAltitude;
        if (Math.random() < this.preferredAltitudeProbability) {
            targetAltitude = MathUtils.randFloat(this.preferredAltitudeMin, this.preferredAltitudeMax);
        } else {
            // Choose randomly from the remaining lower or upper ranges
            if (Math.random() < 0.5) { // Lower range
                targetAltitude = MathUtils.randFloat(this.altitudeMin, this.preferredAltitudeMin);
            } else { // Upper range
                targetAltitude = MathUtils.randFloat(this.preferredAltitudeMax, this.altitudeMax);
            }
        }

        // Calculate final target Y and clamp
        let targetY = groundY + targetAltitude;
        targetY = MathUtils.clamp(targetY, groundY + this.altitudeMin, groundY + this.altitudeMax);

        // Set the target position
        if (!this.currentTargetPosition) {
            this.currentTargetPosition = new THREE.Vector3();
        }
        this.currentTargetPosition.set(targetX, targetY, targetZ);
    }

    _getGroundHeight(worldX, worldZ) {
        if (!this.world || !this.world.getBlock || this.world.worldCenterOffset === undefined || !this.world.params) {
            // console.warn("GhastMovement: World object invalid for ground check.");
            return 5; // Fallback height
        }
        const gridX = Math.floor(worldX + this.world.worldCenterOffset);
        const gridZ = Math.floor(worldZ + this.world.worldCenterOffset);
        const worldHeight = this.world.params.height;

        // Scan down from a reasonable height (current altitude + buffer)
        const startScanY = Math.min(worldHeight - 1, Math.floor(this.ghast.position.y + 5));
        for (let y = startScanY; y >= 0; y--) {
            const block = this.world.getBlock(gridX, y, gridZ);
            // Check if block is not null/undefined AND is not 'air'
            if (block && block.id !== 'air') {
                return y + 1.0; // Return the Y level *above* the ground block
            }
        }
        return 0; // If no ground found (e.g., outside world vertical bounds somehow), return 0
    }
}