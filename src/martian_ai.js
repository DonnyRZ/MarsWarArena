// src/martian_ai.js
// NEW: Added wandering behavior when player is not detected.
//      Martians will patrol slowly and randomly.
//      Existing flee behavior remains when player is close.
// NEW: Added simple stuck detection for wandering state.

import * as THREE from 'three';

export class MartianAI {
    constructor(
        detectionRadius = 15,
        fleeSpeed = 20,
        fleeJumpIntervalMin = 0.3,
        fleeJumpIntervalMax = 0.7,
        stuckTimeThreshold = 0.8, // Used for flee stuck
        stuckVelocityThreshold = 0.1
    ) {
        this.detectionRadius = detectionRadius;
        this.fleeSpeed = fleeSpeed;
        this.fleeVector = new THREE.Vector3();
        this.isFleeing = false;

        this.fleeJumpIntervalMin = fleeJumpIntervalMin;
        this.fleeJumpIntervalMax = fleeJumpIntervalMax;
        this.fleeJumpTimer = 0;

        // Stuck detection for fleeing
        this.fleeStuckTimeThreshold = stuckTimeThreshold; // Keep original for flee
        this.fleeStuckVelocityThresholdSq = stuckVelocityThreshold * stuckVelocityThreshold;
        this.fleeStuckTimer = 0;

        // --- NEW WANDERING PROPERTIES ---
        this.wanderSpeed = 2.0; // CONFIGURABLE: Adjust speed for wandering
        this.wanderDirectionChangeIntervalMin = 3.0; // seconds
        this.wanderDirectionChangeIntervalMax = 7.0; // seconds
        this.currentWanderDirection = new THREE.Vector3(Math.random() * 2 - 1, 0, Math.random() * 2 - 1).normalize();
        if (this.currentWanderDirection.lengthSq() < 0.001) { // Ensure not a zero vector
            this.currentWanderDirection.set(1,0,0);
        }
        this.timeToNextWanderDirectionChange = THREE.MathUtils.randFloat(
            this.wanderDirectionChangeIntervalMin,
            this.wanderDirectionChangeIntervalMax
        );
        this.isWandering = true;

        // --- NEW WANDERING STUCK PROPERTIES ---
        this.wanderStuckTimeThreshold = 1.5; // CONFIGURABLE: Longer time to be considered stuck while wandering
        this.wanderStuckVelocityThresholdSq = (stuckVelocityThreshold * 0.5) * (stuckVelocityThreshold * 0.5); // Slower threshold
        this.wanderStuckTimer = 0;
    }

    update(martian, player, deltaTime) {
        if (!martian || !player || !martian.jumpVelocity) {
            return;
        }

        const distanceToPlayer = martian.position.distanceTo(player.position);

        if (distanceToPlayer < this.detectionRadius) {
            // --- Player Detected: Fleeing State ---
            this.isFleeing = true;
            this.isWandering = false;
            this.wanderStuckTimer = 0; // Reset wander stuck timer if we start fleeing

            this.fleeVector.subVectors(martian.position, player.position).normalize();

            const horizontalSpeedSq = martian.velocity.x * martian.velocity.x + martian.velocity.z * martian.velocity.z;
            if (martian.onGround && horizontalSpeedSq < this.fleeStuckVelocityThresholdSq) {
                this.fleeStuckTimer += deltaTime;
                if (this.fleeStuckTimer > this.fleeStuckTimeThreshold) {
                    martian.velocity.y = martian.jumpVelocity;
                    martian.onGround = false;
                    const randomTurnAngle = (Math.random() - 0.5) * Math.PI;
                    this.fleeVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomTurnAngle);
                    this.fleeStuckTimer = 0;
                    this.fleeJumpTimer = THREE.MathUtils.randFloat(this.fleeJumpIntervalMin, this.fleeJumpIntervalMax);
                }
            } else {
                this.fleeStuckTimer = 0;
            }

            this.fleeJumpTimer -= deltaTime;
            if (this.fleeJumpTimer <= 0 && martian.onGround) {
                 martian.velocity.y = martian.jumpVelocity;
                 martian.onGround = false;
                 this.fleeJumpTimer = THREE.MathUtils.randFloat(this.fleeJumpIntervalMin, this.fleeJumpIntervalMax);
                 this.fleeStuckTimer = 0;
            }

            if (martian.velocity.y < martian.jumpVelocity * 0.5) {
                 martian.velocity.x = this.fleeVector.x * this.fleeSpeed;
                 martian.velocity.z = this.fleeVector.z * this.fleeSpeed;
            } else {
                const airControlFactor = 0.3;
                martian.velocity.x += this.fleeVector.x * this.fleeSpeed * airControlFactor * deltaTime;
                martian.velocity.z += this.fleeVector.z * this.fleeSpeed * airControlFactor * deltaTime;
            }

            const targetRotation = Math.atan2(this.fleeVector.x, this.fleeVector.z);
            martian.updateRotation(targetRotation);

        } else {
            // --- Player Out of Range OR Not Detected: Wandering State ---
            if (this.isFleeing) {
                this.isFleeing = false;
                this.fleeStuckTimer = 0;
                this.fleeJumpTimer = 0;

                this.currentWanderDirection.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
                if (this.currentWanderDirection.lengthSq() < 0.001) { this.currentWanderDirection.set(1,0,0); }
                this.currentWanderDirection.normalize();
                this.timeToNextWanderDirectionChange = THREE.MathUtils.randFloat(
                    this.wanderDirectionChangeIntervalMin,
                    this.wanderDirectionChangeIntervalMax
                );
            }

            this.isWandering = true;

            // --- Stuck Check for Wandering ---
            const horizontalSpeedSqWander = martian.velocity.x * martian.velocity.x + martian.velocity.z * martian.velocity.z;
            if (martian.onGround && horizontalSpeedSqWander < this.wanderStuckVelocityThresholdSq) {
                this.wanderStuckTimer += deltaTime;
                if (this.wanderStuckTimer > this.wanderStuckTimeThreshold) {
                    // console.log("Martian stuck (wandering)! Picking new direction.");
                    this.timeToNextWanderDirectionChange = 0; // Force new direction next update cycle
                    this.wanderStuckTimer = 0; // Reset this timer
                }
            } else {
                this.wanderStuckTimer = 0; // Reset if moving
            }

            // --- Wander Direction Timer ---
            this.timeToNextWanderDirectionChange -= deltaTime;
            if (this.timeToNextWanderDirectionChange <= 0) {
                this.currentWanderDirection.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
                if (this.currentWanderDirection.lengthSq() < 0.001) { this.currentWanderDirection.set(1,0,0); }
                this.currentWanderDirection.normalize();
                this.timeToNextWanderDirectionChange = THREE.MathUtils.randFloat(
                    this.wanderDirectionChangeIntervalMin,
                    this.wanderDirectionChangeIntervalMax
                );
                this.wanderStuckTimer = 0; // Reset stuck timer when direction changes naturally
            }

            // --- Apply Wandering Velocity (Horizontal) ---
            if (martian.onGround || martian.velocity.y < martian.jumpVelocity * 0.5) {
                martian.velocity.x = this.currentWanderDirection.x * this.wanderSpeed;
                martian.velocity.z = this.currentWanderDirection.z * this.wanderSpeed;
            }

            // --- Update Rotation (during wander) ---
            const targetRotation = Math.atan2(this.currentWanderDirection.x, this.currentWanderDirection.z);
            martian.updateRotation(targetRotation);
        }
    }
}