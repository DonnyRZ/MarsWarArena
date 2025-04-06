// src/martian_ai.js
// NEW: Added frequent jumping during flee, unstuck logic

import * as THREE from 'three';

export class MartianAI {
    constructor(
        detectionRadius = 25, // Slightly increased detection range
        fleeSpeed = 20,       // Slightly reduced base speed as jumping adds momentum
        fleeJumpIntervalMin = 0.3, // Min seconds between AI-triggered jumps when fleeing
        fleeJumpIntervalMax = 0.7, // Max seconds between AI-triggered jumps when fleeing
        stuckTimeThreshold = 0.8, // Seconds of low velocity before considered stuck
        stuckVelocityThreshold = 0.1 // Speed below which the Martian is considered potentially stuck
    ) {
        this.detectionRadius = detectionRadius;
        this.fleeSpeed = fleeSpeed;
        this.fleeVector = new THREE.Vector3();
        this.isFleeing = false; // Track fleeing state

        // Jump control
        this.fleeJumpIntervalMin = fleeJumpIntervalMin;
        this.fleeJumpIntervalMax = fleeJumpIntervalMax;
        this.fleeJumpTimer = 0; // Timer for the next AI-driven jump

        // Stuck detection
        this.stuckTimeThreshold = stuckTimeThreshold;
        this.stuckVelocityThresholdSq = stuckVelocityThreshold * stuckVelocityThreshold; // Compare squared velocity
        this.stuckTimer = 0; // How long the Martian has been considered stuck
    }

    update(martian, player, deltaTime) {
        if (!martian || !player || !martian.jumpVelocity) { // Ensure martian has jumpVelocity
            return;
        }

        const distanceToPlayer = martian.position.distanceTo(player.position);

        if (distanceToPlayer < this.detectionRadius) {
            // --- Player Detected: Fleeing State ---
            this.isFleeing = true;

            // Calculate flee vector (away from player)
            this.fleeVector.subVectors(martian.position, player.position).normalize();

            // --- Stuck Check ---
            const horizontalSpeedSq = martian.velocity.x * martian.velocity.x + martian.velocity.z * martian.velocity.z;
            if (martian.onGround && horizontalSpeedSq < this.stuckVelocityThresholdSq) {
                this.stuckTimer += deltaTime;
                if (this.stuckTimer > this.stuckTimeThreshold) {
                    console.log("Martian stuck! Jumping and turning."); // Debug log
                    // Force a jump
                    martian.velocity.y = martian.jumpVelocity;
                    martian.onGround = false;

                    // Turn slightly randomly (e.g., -90 to +90 degrees from current flee direction)
                    const randomTurnAngle = (Math.random() - 0.5) * Math.PI; // Angle in radians
                    this.fleeVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomTurnAngle);

                    // Reset timers immediately
                    this.stuckTimer = 0;
                    this.fleeJumpTimer = THREE.MathUtils.randFloat(this.fleeJumpIntervalMin, this.fleeJumpIntervalMax); // Reset jump timer too
                }
            } else {
                // If moving sufficiently, reset stuck timer
                this.stuckTimer = 0;
            }

            // --- Periodic Jumping ---
            this.fleeJumpTimer -= deltaTime;
            if (this.fleeJumpTimer <= 0 && martian.onGround) {
                 // console.log("Martian AI jump!"); // Debug log
                 martian.velocity.y = martian.jumpVelocity;
                 martian.onGround = false; // Crucial: update state immediately
                 // Reset timer for the next jump
                 this.fleeJumpTimer = THREE.MathUtils.randFloat(this.fleeJumpIntervalMin, this.fleeJumpIntervalMax);
                 // Reset stuck timer on jump to give it a chance to move
                 this.stuckTimer = 0;
            }

            // --- Apply Flee Velocity (Horizontal) ---
            // Only apply horizontal speed if not significantly moving upwards from a jump
            // This prevents overriding the jump velocity immediately
            if(martian.velocity.y < martian.jumpVelocity * 0.5) { // Avoid applying horizontal speed at peak jump
                 martian.velocity.x = this.fleeVector.x * this.fleeSpeed;
                 martian.velocity.z = this.fleeVector.z * this.fleeSpeed;
            } else {
                // Maintain some air control, but less forceful than ground flee speed
                const airControlFactor = 0.3;
                martian.velocity.x += this.fleeVector.x * this.fleeSpeed * airControlFactor * deltaTime;
                martian.velocity.z += this.fleeVector.z * this.fleeSpeed * airControlFactor * deltaTime;
            }


            // --- Update Rotation ---
            // Make the Martian look where it's going (away from the player / in fleeVector direction)
            const targetRotation = Math.atan2(this.fleeVector.x, this.fleeVector.z);
            martian.updateRotation(targetRotation); // Let martian.js handle the +PI offset

        } else {
            // --- Player Out of Range ---
            if (this.isFleeing) {
                // Player just went out of range, reset state
                this.isFleeing = false;
                this.stuckTimer = 0;
                this.fleeJumpTimer = 0; // Stop scheduled jumps
                // Let physics friction handle slowdown. Uncomment below for immediate stop:
                // martian.velocity.x = 0;
                // martian.velocity.z = 0;
            }
            // Optional: Add idle behavior here (e.g., random wandering) if desired
        }
    }
}