// --- START OF FILE martian.js ---

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { MartianAI } from './martian_ai.js';
import { MartianCollisionHandler } from './martian_collision.js';

export class Martian {
    constructor(scene, position, world) {
        if (!scene || !position || !world) {
            console.error("Martian constructor missing required arguments:", { scene, position, world });
            throw new Error("Martian constructor requires scene, position, and world.");
        }
        this.scene = scene;
        this.world = world;
        this.position = position.clone();
        this.visualPosition = this.position.clone();
        this.scale = 0.7 / 16;

        this.minY = Infinity;
        this.maxY = -Infinity;
        this.maxRadiusSq = 0;

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.mass = 80;
        this.friction = 0.8;
        this.onGround = false;
        this.jumpVelocity = 7;

        this.ai = new MartianAI();
        this.collisionHandler = new MartianCollisionHandler(this, this.world);

        this.health = 100;
        this.isDead = false;
        this.timeSinceDeath = 0; // <<< NEW: Timer for removal delay

        const tanBase = 0x91705E; const tanLight = 0xA1806E; const tanDark = 0x81604E; const grayBase = 0x555555; const grayLight = 0x656565; const grayDark = 0x404040; const clawColor = 0x2A2A2A; const mouthColor = 0x701C1C; const eyeColor = 0x101010;
        this.materials = { /* ... materials definition ... */
            body: new THREE.MeshStandardMaterial({ color: tanBase, roughness: 0.8, metalness: 0.1, name: 'martian_body' }),
            bodyLight: new THREE.MeshStandardMaterial({ color: tanLight, roughness: 0.85, metalness: 0.1, name: 'martian_bodyLight' }),
            bodyDark: new THREE.MeshStandardMaterial({ color: tanDark, roughness: 0.75, metalness: 0.1, name: 'martian_bodyDark' }),
            limb: new THREE.MeshStandardMaterial({ color: grayBase, roughness: 0.7, metalness: 0.15, name: 'martian_limb' }),
            limbLight: new THREE.MeshStandardMaterial({ color: grayLight, roughness: 0.75, metalness: 0.1, name: 'martian_limbLight' }),
            limbDark: new THREE.MeshStandardMaterial({ color: grayDark, roughness: 0.65, metalness: 0.2, name: 'martian_limbDark' }),
            claw: new THREE.MeshStandardMaterial({ color: clawColor, roughness: 0.5, metalness: 0.4, name: 'martian_claw' }),
            mouth: new THREE.MeshStandardMaterial({ color: mouthColor, roughness: 0.9, metalness: 0.05, name: 'martian_mouth' }),
            eye: new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.95, metalness: 0.0, name: 'martian_eye' }),
        };

        this.mesh = new THREE.Group();
        this.buildCreature();

        if (this.minY === Infinity || this.maxY === -Infinity || this.maxRadiusSq === 0) {
            console.warn("Martian extents not calculated correctly during build. Using defaults.");
            this.cylinderHeight = (9.5 + 8 + 6.5) * this.scale;
            this.cylinderRadius = (8.5 / 2 + 4) * this.scale;
        } else {
            const padding = 0.05;
            this.cylinderHeight = (this.maxY - this.minY) + padding * 2;
            this.mesh.position.y -= (this.minY - padding);
            this.cylinderRadius = Math.sqrt(this.maxRadiusSq) + padding;
        }

        this.mesh.position.add(this.position);
        this.scene.add(this.mesh);
    }

    buildCreature() {
        // ... (buildCreature logic remains exactly the same) ...
        const geometries = { body: [], bodyLight: [], bodyDark: [], limb: [], limbLight: [], limbDark: [], claw: [], mouth: [], eye: [], };
        this.minY = Infinity; this.maxY = -Infinity; this.maxRadiusSq = 0;
        const addTransformedGeometry = (width, height, depth, position, materialKey, rotation = [0, 0, 0]) => {
            if (!this.materials[materialKey] || !geometries[materialKey]) { console.error(`Invalid material or geometry key: "${materialKey}"`); return; }
            const geometry = new THREE.BoxGeometry(width, height, depth);
            geometry.scale(this.scale, this.scale, this.scale); geometry.rotateX(rotation[0]); geometry.rotateY(rotation[1]); geometry.rotateZ(rotation[2]); geometry.translate(position[0] * this.scale, position[1] * this.scale, position[2] * this.scale);
            geometry.computeBoundingBox(); const box = geometry.boundingBox;
            if (box) {
                this.minY = Math.min(this.minY, box.min.y); this.maxY = Math.max(this.maxY, box.max.y);
                const cornersXZ = [ box.min.x*box.min.x + box.min.z*box.min.z, box.max.x*box.max.x + box.min.z*box.min.z, box.min.x*box.min.x + box.max.z*box.max.z, box.max.x*box.max.x + box.max.z*box.max.z, ];
                this.maxRadiusSq = Math.max(this.maxRadiusSq, ...cornersXZ);
            } else { console.warn("Bounding box calculation failed for a geometry part."); }
            geometries[materialKey].push(geometry);
        };
        const SURFACE_OFFSET = 0.05 / this.scale;
        // Torso
        const torsoWidth = 8.5; const torsoHeight = 9.5; const torsoDepth = 6.5; const torsoY = 0.25;
        addTransformedGeometry(torsoWidth, torsoHeight, torsoDepth, [0, torsoY, 0], 'body');
        const plateDepth = 0.6;
        addTransformedGeometry(torsoWidth * 0.7, torsoHeight * 0.6, plateDepth, [0, torsoY + 0.5, -torsoDepth / 2 - plateDepth / 2 + SURFACE_OFFSET], 'bodyDark');
        addTransformedGeometry(plateDepth, torsoHeight * 0.5, torsoDepth * 0.6, [-torsoWidth / 2 - plateDepth / 2 + SURFACE_OFFSET, torsoY, 0], 'bodyLight');
        addTransformedGeometry(plateDepth, torsoHeight * 0.5, torsoDepth * 0.6, [torsoWidth / 2 + plateDepth / 2 - SURFACE_OFFSET, torsoY, 0], 'bodyLight');
        addTransformedGeometry(torsoWidth * 0.8, plateDepth, torsoDepth * 0.7, [0, torsoY - torsoHeight / 2 - plateDepth / 2 + SURFACE_OFFSET, 0], 'bodyLight');
        // Head Area
        const headYBase = torsoY + torsoHeight / 2 + 1.0; const headZOffset = -1.0; const headWidth = 9; const headHeight = 8; const headDepth = 6;
        addTransformedGeometry(headWidth, headHeight, headDepth, [0, headYBase, headZOffset], 'body');
        const headFrontZ = headZOffset - headDepth / 2; const browHeight = 1.5; const browDepth = 1.5;
        addTransformedGeometry(headWidth * 0.8, browHeight, browDepth, [0, headYBase + headHeight / 2 - browHeight / 2, headFrontZ - browDepth / 2 - SURFACE_OFFSET], 'bodyDark');
        const snoutWidth = 7; const snoutHeight = 5.5; const snoutDepth = 7; const snoutY = headYBase - 1.0; const snoutZ = headFrontZ - snoutDepth / 2 + 0.5;
        addTransformedGeometry(snoutWidth, snoutHeight, snoutDepth, [0, snoutY, snoutZ], 'body');
        const snoutFrontZ = snoutZ - snoutDepth / 2; const snoutBottomY = snoutY - snoutHeight / 2; const jawWidth = 8; const jawHeight = 3.0; const jawDepth = 6.5; const jawGap = 0.8; const jawY = snoutBottomY - jawGap - jawHeight / 2; const jawZ = snoutZ + 0.8;
        addTransformedGeometry(jawWidth, jawHeight, jawDepth, [0, jawY, jawZ], 'body');
        const jawFrontZ = jawZ - jawDepth / 2; const jawTopY = jawY + jawHeight / 2; const mouthInsideWidth = snoutWidth * 0.7; const mouthInsideHeight = jawGap + 0.2; const mouthInsideDepth = snoutDepth * 0.6; const mouthInsideY = snoutBottomY - jawGap / 2 - 0.1; const mouthInsideZ = snoutZ - 1.5;
        addTransformedGeometry(mouthInsideWidth, mouthInsideHeight, mouthInsideDepth, [0, mouthInsideY, mouthInsideZ], 'mouth');
        const eyeSize = 1.5; const eyeY = headYBase + 1.8; const eyeX = 3.0; const eyeZ = headFrontZ - (eyeSize * 0.7) - SURFACE_OFFSET;
        addTransformedGeometry(eyeSize * 1.8, eyeSize * 1.8, 0.5, [-eyeX, eyeY, eyeZ + 0.2], 'bodyDark'); addTransformedGeometry(eyeSize * 1.8, eyeSize * 1.8, 0.5, [eyeX, eyeY, eyeZ + 0.2], 'bodyDark');
        addTransformedGeometry(eyeSize, eyeSize, eyeSize, [-eyeX, eyeY, eyeZ], 'eye'); addTransformedGeometry(eyeSize, eyeSize, eyeSize, [eyeX, eyeY, eyeZ], 'eye');
        // Teeth
        const toothWidth = 0.7; const toothHeight = 1.9; const toothDepth = 0.7; const toothRotX = Math.PI / 11; const upperToothY = snoutBottomY + toothHeight / 2 - SURFACE_OFFSET * 2; const upperToothZ = snoutFrontZ - toothDepth / 2 - SURFACE_OFFSET * 2;
        for (let i = -2; i <= 2; i++) { addTransformedGeometry(toothWidth, toothHeight, toothDepth, [i * 1.3, upperToothY, upperToothZ], 'claw', [toothRotX, 0, 0]); }
        const fangHeightUpper = 2.8; addTransformedGeometry(1, fangHeightUpper, 1, [-3.0, upperToothY - 0.3, upperToothZ], 'claw', [toothRotX * 1.5, 0, Math.PI / 32]); addTransformedGeometry(1, fangHeightUpper, 1, [3.0, upperToothY - 0.3, upperToothZ], 'claw', [toothRotX * 1.5, 0, -Math.PI / 32]);
        const lowerToothY = jawTopY - toothHeight / 2 + SURFACE_OFFSET * 2; const lowerToothZ = jawFrontZ - toothDepth / 2 - SURFACE_OFFSET * 2;
        for (let i = -2; i <= 2; i++) { addTransformedGeometry(toothWidth, toothHeight * 0.9, toothDepth, [i * 1.3, lowerToothY, lowerToothZ], 'claw', [-toothRotX, 0, 0]); }
        const fangHeightLower = 2.5; addTransformedGeometry(1, fangHeightLower, 1, [-2.8, lowerToothY + 0.3, lowerToothZ], 'claw', [-toothRotX * 1.5, 0, Math.PI / 32]); addTransformedGeometry(1, fangHeightLower, 1, [2.8, lowerToothY + 0.3, lowerToothZ], 'claw', [-toothRotX * 1.5, 0, -Math.PI / 32]);
        // Legs
        const legXOffset = 4.0; const thighY = torsoY - torsoHeight / 2 - 2.5; const shinY = thighY - 7.0; const footY = shinY - 5.0; const jointSize = 3.5; const jointDepth = 0.8; const legRotX = Math.PI / 7; const clawFootZOffset = 1.5 + (5.5 / 2); const clawFootRotX = -Math.PI / 4;
        addTransformedGeometry(4, 6.5, 4, [-legXOffset, thighY, 0], 'limb'); addTransformedGeometry(3, 6.5, 3, [-legXOffset, shinY, -1], 'limb', [legRotX, 0, 0]); addTransformedGeometry(jointSize, jointSize * 0.8, jointDepth, [-legXOffset, thighY - 3.0, -1 - jointDepth / 2 + SURFACE_OFFSET], 'limbDark', [legRotX, 0, 0]); addTransformedGeometry(4.5, 2.5, 5.5, [-legXOffset, footY, 1.5], 'limb'); addTransformedGeometry(jointSize * 0.8, jointSize * 0.6, jointDepth, [-legXOffset, shinY - 3.25, 0 - jointDepth / 2 + SURFACE_OFFSET], 'limbDark', [legRotX, 0, 0]); addTransformedGeometry(1.8, 1.8, 4.0, [-legXOffset - 1.2, footY - 0.8, clawFootZOffset], 'claw', [clawFootRotX, -Math.PI / 16, 0]); addTransformedGeometry(1.8, 1.8, 4.2, [-legXOffset, footY - 0.8, clawFootZOffset + 0.3], 'claw', [clawFootRotX, 0, 0]); addTransformedGeometry(1.8, 1.8, 4.0, [-legXOffset + 1.2, footY - 0.8, clawFootZOffset], 'claw', [clawFootRotX, Math.PI / 16, 0]);
        addTransformedGeometry(4, 6.5, 4, [legXOffset, thighY, 0], 'limb'); addTransformedGeometry(3, 6.5, 3, [legXOffset, shinY, -1], 'limb', [legRotX, 0, 0]); addTransformedGeometry(jointSize, jointSize * 0.8, jointDepth, [legXOffset, thighY - 3.0, -1 - jointDepth / 2 + SURFACE_OFFSET], 'limbDark', [legRotX, 0, 0]); addTransformedGeometry(4.5, 2.5, 5.5, [legXOffset, footY, 1.5], 'limb'); addTransformedGeometry(jointSize * 0.8, jointSize * 0.6, jointDepth, [legXOffset, shinY - 3.25, 0 - jointDepth / 2 + SURFACE_OFFSET], 'limbDark', [legRotX, 0, 0]); addTransformedGeometry(1.8, 1.8, 4.0, [legXOffset - 1.2, footY - 0.8, clawFootZOffset], 'claw', [clawFootRotX, -Math.PI / 16, 0]); addTransformedGeometry(1.8, 1.8, 4.2, [legXOffset, footY - 0.8, clawFootZOffset + 0.3], 'claw', [clawFootRotX, 0, 0]); addTransformedGeometry(1.8, 1.8, 4.0, [legXOffset + 1.2, footY - 0.8, clawFootZOffset], 'claw', [clawFootRotX, Math.PI / 16, 0]);
        // Arms
        const armXOffset = torsoWidth / 2 + 1.5; const upperArmY = torsoY + 1.0; const lowerArmY = upperArmY - 6.0; const handY = lowerArmY - 4.5; const shoulderSize = 4.5; const elbowSize = 3.5; const handClawRotX = Math.PI / 3.2; const handFrontZOffset = 0 - (4 / 2);
        addTransformedGeometry(shoulderSize, shoulderSize, shoulderSize, [-armXOffset + 0.5, upperArmY + 0.5, 0], 'limbDark'); addTransformedGeometry(3.5, 5.5, 3.5, [-armXOffset, upperArmY, 0], 'limb'); addTransformedGeometry(3, 5.5, 3, [-armXOffset, lowerArmY, 0], 'limb'); addTransformedGeometry(elbowSize, elbowSize * 0.7, jointDepth, [-armXOffset, upperArmY - 2.75, 0 - jointDepth / 2 + SURFACE_OFFSET], 'limbDark'); addTransformedGeometry(4, 2.5, 4, [-armXOffset, handY, 0], 'bodyDark'); addTransformedGeometry(1.6, 4.0, 1.6, [-armXOffset - 1.0, handY - 1.8, handFrontZOffset - 0.8], 'claw', [handClawRotX, 0, -Math.PI / 16]); addTransformedGeometry(1.6, 4.5, 1.6, [-armXOffset, handY - 2.1, handFrontZOffset - 1.0], 'claw', [handClawRotX, 0, 0]); addTransformedGeometry(1.6, 4.0, 1.6, [-armXOffset + 1.0, handY - 1.8, handFrontZOffset - 0.8], 'claw', [handClawRotX, 0, Math.PI / 16]);
        addTransformedGeometry(shoulderSize, shoulderSize, shoulderSize, [armXOffset - 0.5, upperArmY + 0.5, 0], 'limbDark'); addTransformedGeometry(3.5, 5.5, 3.5, [armXOffset, upperArmY, 0], 'limb'); addTransformedGeometry(3, 5.5, 3, [armXOffset, lowerArmY, 0], 'limb'); addTransformedGeometry(elbowSize, elbowSize * 0.7, jointDepth, [armXOffset, upperArmY - 2.75, 0 - jointDepth / 2 + SURFACE_OFFSET], 'limbDark'); addTransformedGeometry(4, 2.5, 4, [armXOffset, handY, 0], 'bodyDark'); addTransformedGeometry(1.6, 4.0, 1.6, [armXOffset - 1.0, handY - 1.8, handFrontZOffset - 0.8], 'claw', [handClawRotX, 0, -Math.PI / 16]); addTransformedGeometry(1.6, 4.5, 1.6, [armXOffset, handY - 2.1, handFrontZOffset - 1.0], 'claw', [handClawRotX, 0, 0]); addTransformedGeometry(1.6, 4.0, 1.6, [armXOffset + 1.0, handY - 1.8, handFrontZOffset - 0.8], 'claw', [handClawRotX, 0, Math.PI / 16]);
        // Tail
        let segmentWidth = 3.2; let segmentHeight = 3.2; let segmentDepth = 3.2; let currentPos = new THREE.Vector3(0, torsoY - torsoHeight / 2 + 1.0, torsoDepth / 2); let currentRot = new THREE.Vector3(Math.PI / 10, 0, 0); let lastSegmentPos = new THREE.Vector3();
        for (let i = 0; i < 8; i++) {
            const segmentMatKey = (i % 2 === 0) ? 'limb' : 'limbLight'; addTransformedGeometry(segmentWidth, segmentHeight, segmentDepth, [currentPos.x, currentPos.y, currentPos.z], segmentMatKey, [currentRot.x, currentRot.y, currentRot.z]);
            const segmentCenter = new THREE.Vector3(currentPos.x * this.scale, currentPos.y * this.scale, currentPos.z * this.scale); if (i > 0) { const jointPos = new THREE.Vector3().lerpVectors(segmentCenter, lastSegmentPos, 0.5); const jointConnectorSize = segmentWidth * 0.8; addTransformedGeometry(jointConnectorSize, jointConnectorSize, jointConnectorSize * 0.5, [jointPos.x / this.scale, jointPos.y / this.scale, jointPos.z / this.scale], 'limbDark', [currentRot.x, currentRot.y, currentRot.z]); } lastSegmentPos.copy(segmentCenter);
            const segmentOffsetUnscaled = segmentDepth * 0.75; const offsetVec = new THREE.Vector3(0, 0, segmentOffsetUnscaled); const rotationQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(currentRot.x, currentRot.y, currentRot.z, 'XYZ')); offsetVec.applyQuaternion(rotationQuat); currentPos.add(offsetVec); currentRot.x += Math.PI / 45; segmentWidth *= 0.92; segmentHeight *= 0.92; segmentDepth *= 0.92;
        }
        // Merge geometries
        for (const materialKey in geometries) {
            const collectedGeometries = geometries[materialKey];
            if (collectedGeometries.length > 0) {
                const mergedGeometry = BufferGeometryUtils.mergeGeometries(collectedGeometries, false);
                if (mergedGeometry) { mergedGeometry.computeBoundingSphere(); const finalMesh = new THREE.Mesh(mergedGeometry, this.materials[materialKey]); finalMesh.castShadow = false; finalMesh.receiveShadow = true; this.mesh.add(finalMesh); }
                else { console.warn(`Failed to merge geometries for material: ${materialKey}`); }
            }
        }
    } // End of buildCreature

    takeDamage(amount) {
        if (this.isDead) return;
        this.health -= amount;
        console.log(`Martian took ${amount} damage, health: ${this.health}`);
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;

        console.log("Martian died!");
        this.isDead = true;
        this.health = 0;
        this.timeSinceDeath = 0; // Initialize timer (it will be incremented in EntityManager)

        // 1. Stop AI and Movement
        this.ai = null; // Disable AI updates
        this.velocity.set(0, 0, 0); // Stop current movement

        // 2. Apply "Laying Down" Rotation to the Mesh
        if (this.mesh) {
            // Rotate 90 degrees around the X-axis. Adjust if needed.
            this.mesh.rotation.set(Math.PI / 2, this.mesh.rotation.y, this.mesh.rotation.z); // Keep current Y/Z rotation
            // Or try Z-axis rotation if X doesn't look right:
            // this.mesh.rotation.set(this.mesh.rotation.x, this.mesh.rotation.y, Math.PI / 2);
        }
        // 3. Physics remains active, gravity will pull it down.
        // 4. Cleanup will be handled by EntityManager after a delay.
    }

    updateLogic(player, deltaTime) {
        if (this.isDead) return; // <<< Stop logic if dead

        if (this.ai && typeof this.ai.update === 'function') {
            this.ai.update(this, player, deltaTime);
        }
        if (this.collisionHandler && typeof this.collisionHandler.update === 'function') {
            this.collisionHandler.update(deltaTime);
        }
    }

    updateRotation(yaw) {
        if (this.mesh && !this.isDead) { // <<< Stop rotation updates if dead
            this.mesh.rotation.set(0, yaw + Math.PI, 0);
        }
    }
} // End of Martian class

// --- END OF FILE martian.js ---