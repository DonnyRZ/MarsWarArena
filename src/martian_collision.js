// src/martian_collision.js
// Modified file to handle Martian obstacle detection and jump response
// NEW: Reduced detectionDistance, using martian.jumpVelocity

import * as THREE from 'three';

export class MartianCollisionHandler {
    constructor(martian, world) {
        this.martian = martian;
        this.world = world;

        // Configuration
        this.detectionDistance = 1.0; // <-- REDUCED: Check closer obstacles (in world units)
        this.jumpCooldown = 0.8;      // <-- REDUCED: Allow more frequent collision-based jumps
        this.obstacleCheckHeightOffset = 0.1; // Check slightly above ground level

        // State
        this.canJump = true;
        this.jumpCooldownTimer = 0;
    }

    update(deltaTime) {
        // Update cooldown timer
        if (this.jumpCooldownTimer > 0) {
            this.jumpCooldownTimer -= deltaTime;
            if (this.jumpCooldownTimer <= 0) {
                this.canJump = true;
                this.jumpCooldownTimer = 0;
            }
        }

        // Only check for obstacles and jump if on the ground and ready
        // And only if the AI hasn't *just* made it jump
        if (this.martian.onGround && this.canJump) {
            this.checkObstacles();
        }
    }

    checkObstacles() {
        // Calculate the forward direction based on current horizontal velocity
        const forward = new THREE.Vector3(this.martian.velocity.x, 0, this.martian.velocity.z);
        const speed = forward.length();

        // Only check if moving significantly
        if (speed < 0.1) {
            return;
        }

        forward.normalize();

        // Calculate the point slightly in front of the Martian to check
        const checkOrigin = this.martian.position.clone();
        checkOrigin.y += this.obstacleCheckHeightOffset; // Check slightly above the feet

        const checkPoint = checkOrigin.clone().addScaledVector(forward, this.detectionDistance);

        // Convert world coordinates to world grid indices
        const worldCenterOffset = (this.world.params.width - 1) / 2;
        const gridX = Math.floor(checkPoint.x + worldCenterOffset);
        const gridY = Math.floor(checkPoint.y); // Check at the current height level
        const gridZ = Math.floor(checkPoint.z + worldCenterOffset);

        // Check if the block at the target grid coordinate is solid
        const block = this.world.getBlock(gridX, gridY, gridZ);
        if (block && block.id !== 'air') {
            // Obstacle detected, initiate jump
            this.initiateJump("low obstacle");
            return; // Don't check higher if low obstacle found
        }

        // Check slightly higher as well
        const gridYHigher = gridY + 1;
        const blockHigher = this.world.getBlock(gridX, gridYHigher, gridZ);
         if (blockHigher && blockHigher.id !== 'air') {
            // Obstacle detected slightly higher, initiate jump
             this.initiateJump("high obstacle");
         }
    }

    initiateJump(reason = "obstacle") {
        if (this.canJump && this.martian.onGround) {
            // console.log(`Martian collision jump (${reason})!`); // For debugging
            // Use jumpVelocity from the Martian instance
            this.martian.velocity.y = this.martian.jumpVelocity;
            this.martian.onGround = false; // Assume jump takes it off the ground immediately
            this.canJump = false;
            this.jumpCooldownTimer = this.jumpCooldown;

            // Optional: Add a small forward boost during the jump if desired
            // const forward = new THREE.Vector3(this.martian.velocity.x, 0, this.martian.velocity.z).normalize();
            // this.martian.velocity.addScaledVector(forward, 1.0); // Small boost amount
        }
    }
}