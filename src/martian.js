// src/martian.js
// Modified file - Enhanced realism via geometric detail and PBR materials (No Textures)
// FIX: Added Math.PI to updateRotation to correct backward fleeing.
// NEW: Added jumpVelocity property

import * as THREE from 'three';
import { MartianAI } from './martian_ai.js'; // Existing AI logic
import { MartianCollisionHandler } from './martian_collision.js'; // Import the new collision handler

export class Martian {
    constructor(scene, position, world) {
        if (!scene || !position || !world) {
            console.error("Martian constructor missing required arguments:", { scene, position, world });
            throw new Error("Martian constructor requires scene, position, and world.");
        }
        this.scene = scene;
        this.world = world;
        this.position = position.clone();
        this.scale = 1.8 / 16; // Overall scale factor applied to dimensions

        // --- Physics Properties ---
        const torsoWidthScaled = 8.5 * this.scale;
        const headHeightScaled = 8 * this.scale;
        const torsoHeightScaled = 9.5 * this.scale;
        const legHeightApprox = (6.5 + 6.5 + 2.5) * this.scale;
        this.cylinderRadius = torsoWidthScaled * 0.6;
        this.cylinderHeight = (torsoHeightScaled + headHeightScaled + legHeightApprox) * 0.5;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.mass = 80;
        this.friction = 0.8;
        this.onGround = false;
        this.jumpVelocity = 7; // <--- ADDED: Upward velocity for jumps

        // --- AI and Collision ---
        // Pass jump velocity and maybe other params if AI needs them directly
        this.ai = new MartianAI();
        this.collisionHandler = new MartianCollisionHandler(this, this.world);

        // --- Define Colors (More Nuance) ---
        const tanBase = 0x91705E;
        const tanLight = 0xA1806E;
        const tanDark = 0x81604E;
        const grayBase = 0x555555;
        const grayLight = 0x656565;
        const grayDark = 0x404040;
        const clawColor = 0x2A2A2A;
        const mouthColor = 0x701C1C;
        const eyeColor = 0x101010;

        // --- Materials (Using MeshStandardMaterial for PBR) ---
        this.materials = {
            body: new THREE.MeshStandardMaterial({ color: tanBase, roughness: 0.8, metalness: 0.1 }),
            bodyLight: new THREE.MeshStandardMaterial({ color: tanLight, roughness: 0.85, metalness: 0.1 }),
            bodyDark: new THREE.MeshStandardMaterial({ color: tanDark, roughness: 0.75, metalness: 0.1 }),
            limb: new THREE.MeshStandardMaterial({ color: grayBase, roughness: 0.7, metalness: 0.15 }),
            limbLight: new THREE.MeshStandardMaterial({ color: grayLight, roughness: 0.75, metalness: 0.1 }),
            limbDark: new THREE.MeshStandardMaterial({ color: grayDark, roughness: 0.65, metalness: 0.2 }),
            claw: new THREE.MeshStandardMaterial({ color: clawColor, roughness: 0.5, metalness: 0.4 }),
            mouth: new THREE.MeshStandardMaterial({ color: mouthColor, roughness: 0.9, metalness: 0.05 }),
            eye: new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.95, metalness: 0.0 }),
        };

        // --- Build Creature ---
        this.mesh = new THREE.Group();
        this.buildCreature();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    // Helper function to create scaled and positioned boxes
    createBox(width, height, depth, position, material, rotation = [0, 0, 0]) {
        if (!material) {
            console.error("createBox called with undefined material!", {width, height, depth, position});
            material = new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.5 }); // Pink error material
        }
        const geometry = new THREE.BoxGeometry(width * this.scale, height * this.scale, depth * this.scale);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position[0] * this.scale, position[1] * this.scale, position[2] * this.scale);
        mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        return mesh;
    }

    // --- buildCreature method (Adding Geometric Detail) ---
    buildCreature() {
        // ... (buildCreature code remains the same - no changes needed here)
        if (!this.materials || !this.materials.body) {
             console.error("buildCreature started but this.materials or this.materials.body is missing!");
             return;
        }

        // Material shortcuts for readability
        const bodyMat = this.materials.body;
        const bodyLightMat = this.materials.bodyLight;
        const bodyDarkMat = this.materials.bodyDark;
        const limbMat = this.materials.limb;
        const limbLightMat = this.materials.limbLight;
        const limbDarkMat = this.materials.limbDark; // For joints
        const clawMat = this.materials.claw;
        const mouthMat = this.materials.mouth;
        const eyeMat = this.materials.eye;

        const SURFACE_OFFSET = 0.05; // Small offset to prevent z-fighting between surfaces

        // **Torso** (Bulkier, with plating detail)
        const torsoWidth = 8.5;
        const torsoHeight = 9.5;
        const torsoDepth = 6.5;
        const torsoY = 0.25; // Base Y position for the torso center
        const torso = this.createBox(torsoWidth, torsoHeight, torsoDepth, [0, torsoY, 0], bodyMat);
        this.mesh.add(torso);

        // Torso Plating/Detail (Adding visual complexity)
        const plateDepth = 0.6; // How much plates stick out/in
        // Front plate (darker) - positioned slightly in front (-Z)
        this.mesh.add(this.createBox(torsoWidth * 0.7, torsoHeight * 0.6, plateDepth, [0, torsoY + 0.5, -torsoDepth / 2 - plateDepth / 2 + SURFACE_OFFSET], bodyDarkMat));
        // Side plates (lighter) - positioned slightly to the sides (+/-X)
        this.mesh.add(this.createBox(plateDepth, torsoHeight * 0.5, torsoDepth * 0.6, [-torsoWidth / 2 - plateDepth / 2 + SURFACE_OFFSET, torsoY, 0], bodyLightMat));
        this.mesh.add(this.createBox(plateDepth, torsoHeight * 0.5, torsoDepth * 0.6, [torsoWidth / 2 + plateDepth / 2 - SURFACE_OFFSET, torsoY, 0], bodyLightMat));
         // Underside (lighter) - positioned slightly below (-Y)
         this.mesh.add(this.createBox(torsoWidth * 0.8, plateDepth, torsoDepth * 0.7, [0, torsoY - torsoHeight/2 - plateDepth/2 + SURFACE_OFFSET, 0], bodyLightMat));


        // **Head Area** (Adding brow ridge, slightly reshaped)
        const headYBase = torsoY + torsoHeight / 2 + 1.0; // Position relative to torso top
        const headZOffset = -1.0; // Overall Z position relative to torso center (negative Z is forward)

        // Main Head Block
        const headWidth = 9;
        const headHeight = 8;
        const headDepth = 6;
        const headBlock = this.createBox(headWidth, headHeight, headDepth, [0, headYBase, headZOffset], bodyMat);
        this.mesh.add(headBlock);
        const headFrontZ = headZOffset - headDepth / 2; // Z coordinate of the front face of the head block

        // Brow Ridge (Darker) - positioned above and in front of head block
        const browHeight = 1.5;
        const browDepth = 1.5;
        this.mesh.add(this.createBox(headWidth * 0.8, browHeight, browDepth, [0, headYBase + headHeight / 2 - browHeight / 2, headFrontZ - browDepth / 2 - SURFACE_OFFSET], bodyDarkMat));

        // Snout - positioned below and in front of head block
        const snoutWidth = 7;
        const snoutHeight = 5.5; // Slightly taller snout
        const snoutDepth = 7;
        const snoutY = headYBase - 1.0;
        const snoutZ = headFrontZ - snoutDepth / 2 + 0.5; // Position relative to head front
        const snout = this.createBox(snoutWidth, snoutHeight, snoutDepth, [0, snoutY, snoutZ], bodyMat);
        this.mesh.add(snout);
        const snoutFrontZ = snoutZ - snoutDepth / 2; // Z coordinate of the front face of the snout
        const snoutBottomY = snoutY - snoutHeight / 2; // Y coordinate of the bottom face of the snout

        // Lower Jaw - positioned below the snout
        const jawWidth = 8;
        const jawHeight = 3.0; // Slightly thicker jaw
        const jawDepth = 6.5;
        const jawGap = 0.8; // Smaller gap between snout and jaw
        const jawY = snoutBottomY - jawGap - jawHeight / 2;
        const jawZ = snoutZ + 0.8; // Slightly more forward jaw
        const lowerJaw = this.createBox(jawWidth, jawHeight, jawDepth, [0, jawY, jawZ], bodyMat);
        this.mesh.add(lowerJaw);
        const jawFrontZ = jawZ - jawDepth / 2; // Z coordinate of the front face of the jaw
        const jawTopY = jawY + jawHeight / 2; // Y coordinate of the top face of the jaw

        // Mouth Interior (Dark red) - recessed inside the snout/jaw gap
        const mouthInsideWidth = snoutWidth * 0.7;
        const mouthInsideHeight = jawGap + 0.2; // Slightly fill gap
        const mouthInsideDepth = snoutDepth * 0.6;
        const mouthInsideY = snoutBottomY - jawGap / 2 - 0.1;
        const mouthInsideZ = snoutZ - 1.5; // Recessed further back
        const mouthInside = this.createBox(mouthInsideWidth, mouthInsideHeight, mouthInsideDepth, [0, mouthInsideY, mouthInsideZ], mouthMat);
        this.mesh.add(mouthInside);

        // Eyes (Slightly inset feel with dark surrounding)
        const eyeSize = 1.5;
        const eyeY = headYBase + 1.8; // Slightly higher on the head
        const eyeX = 3.0; // Horizontal offset from center
        const eyeZ = headFrontZ - (eyeSize * 0.7) - SURFACE_OFFSET; // Place slightly forward of head front face
         // Optional: Darker patch around eye for definition
        this.mesh.add(this.createBox(eyeSize*1.8, eyeSize*1.8, 0.5, [-eyeX, eyeY, eyeZ+0.2], bodyDarkMat));
        this.mesh.add(this.createBox(eyeSize*1.8, eyeSize*1.8, 0.5, [eyeX, eyeY, eyeZ+0.2], bodyDarkMat));
        // Actual Eye (Black)
        this.mesh.add(this.createBox(eyeSize, eyeSize, eyeSize, [-eyeX, eyeY, eyeZ], eyeMat));
        this.mesh.add(this.createBox(eyeSize, eyeSize, eyeSize, [eyeX, eyeY, eyeZ], eyeMat));


        // Teeth (Using clawMat, positioning adjusted for new jaw/snout)
        const toothWidth = 0.7;
        const toothHeight = 1.9; // Slightly taller teeth
        const toothDepth = 0.7;
        const toothRotX = Math.PI / 11; // Slight downward angle for upper, upward for lower

        // Upper Teeth - attached below the snout
        const upperToothY = snoutBottomY + toothHeight / 2 - SURFACE_OFFSET * 2; // Position clearly below snout bottom
        const upperToothZ = snoutFrontZ - toothDepth / 2 - SURFACE_OFFSET * 2; // Position clearly in front of snout front
        for (let i = -2; i <= 2; i++) {
            const toothX = i * 1.3; // Spacing
            this.mesh.add(this.createBox(toothWidth, toothHeight, toothDepth, [toothX, upperToothY, upperToothZ], clawMat, [toothRotX, 0, 0]));
        }
        // Upper Fangs (Larger)
        const fangHeightUpper = 2.8;
        this.mesh.add(this.createBox(1, fangHeightUpper, 1, [-3.0, upperToothY - 0.3, upperToothZ ], clawMat, [toothRotX*1.5, 0, Math.PI / 32])); // Slightly angled out
        this.mesh.add(this.createBox(1, fangHeightUpper, 1, [ 3.0, upperToothY - 0.3, upperToothZ ], clawMat, [toothRotX*1.5, 0, -Math.PI / 32])); // Slightly angled out

        // Lower Teeth - attached above the jaw
        const lowerToothY = jawTopY - toothHeight / 2 + SURFACE_OFFSET * 2; // Position clearly above jaw top
        const lowerToothZ = jawFrontZ - toothDepth / 2 - SURFACE_OFFSET * 2; // Position clearly in front of jaw front
        for (let i = -2; i <= 2; i++) {
            const toothX = i * 1.3; // Spacing
            this.mesh.add(this.createBox(toothWidth, toothHeight * 0.9, toothDepth, [toothX, lowerToothY, lowerToothZ], clawMat, [-toothRotX, 0, 0])); // Angled up
        }
        // Lower Fangs (Larger)
        const fangHeightLower = 2.5;
        this.mesh.add(this.createBox(1, fangHeightLower, 1, [-2.8, lowerToothY + 0.3, lowerToothZ ], clawMat, [-toothRotX*1.5, 0, Math.PI / 32])); // Slightly angled out
        this.mesh.add(this.createBox(1, fangHeightLower, 1, [ 2.8, lowerToothY + 0.3, lowerToothZ ], clawMat, [-toothRotX*1.5, 0, -Math.PI / 32])); // Slightly angled out


        // **Legs** (Adding joint details)
        const legXOffset = 4.0; // Slightly wider stance
        const thighY = torsoY - torsoHeight / 2 - 2.5; // Position relative to torso bottom
        const shinY = thighY - 7.0; // Further down
        const footY = shinY - 5.0; // Further down

        // Joint block dimensions
        const jointSize = 3.5;
        const jointDepth = 0.8; // How much the joint piece sticks out

        // Left Leg (Viewer's Right)
        const thighL = this.createBox(4, 6.5, 4, [-legXOffset, thighY, 0], limbMat); // Thicker thigh
        this.mesh.add(thighL);
        const shinL = this.createBox(3, 6.5, 3, [-legXOffset, shinY, -1], limbMat, [Math.PI / 7, 0, 0]); // Thicker shin, angled slightly forward
        this.mesh.add(shinL);
        // Knee Joint (Darker) - positioned at the junction, slightly forward
        this.mesh.add(this.createBox(jointSize, jointSize * 0.8, jointDepth, [-legXOffset, thighY - 3.0, -1 - jointDepth/2 + SURFACE_OFFSET], limbDarkMat, [Math.PI / 7, 0, 0]));
        const leftFoot = this.createBox(4.5, 2.5, 5.5, [-legXOffset, footY, 1.5], limbMat); // Larger foot, positioned forward
        this.mesh.add(leftFoot);
        // Ankle Joint (Darker) - positioned at the junction
        this.mesh.add(this.createBox(jointSize * 0.8, jointSize * 0.6, jointDepth, [-legXOffset, shinY - 3.25, 0 - jointDepth/2 + SURFACE_OFFSET], limbDarkMat, [Math.PI / 7, 0, 0]));

        // Left Claws (Larger) - attached to the front of the foot
        const clawFootZOffset = 1.5 + (5.5 / 2); // Z center of the foot + half depth = front Z relative to foot center
        this.mesh.add(this.createBox(1.8, 1.8, 4.0, [-legXOffset - 1.2, footY - 0.8, clawFootZOffset], clawMat, [-Math.PI / 4, -Math.PI / 16, 0])); // Angled down and slightly sideways
        this.mesh.add(this.createBox(1.8, 1.8, 4.2, [-legXOffset,       footY - 0.8, clawFootZOffset + 0.3], clawMat, [-Math.PI / 4, 0, 0])); // Center claw longer, slightly more forward
        this.mesh.add(this.createBox(1.8, 1.8, 4.0, [-legXOffset + 1.2, footY - 0.8, clawFootZOffset], clawMat, [-Math.PI / 4, Math.PI / 16, 0])); // Angled down and slightly sideways


        // Right Leg (Viewer's Left - Mirroring left, including joints)
        const thighR = this.createBox(4, 6.5, 4, [legXOffset, thighY, 0], limbMat);
        this.mesh.add(thighR);
        const shinR = this.createBox(3, 6.5, 3, [legXOffset, shinY, -1], limbMat, [Math.PI / 7, 0, 0]);
        this.mesh.add(shinR);
        this.mesh.add(this.createBox(jointSize, jointSize * 0.8, jointDepth, [legXOffset, thighY - 3.0, -1 - jointDepth/2 + SURFACE_OFFSET], limbDarkMat, [Math.PI / 7, 0, 0])); // Knee
        const rightFoot = this.createBox(4.5, 2.5, 5.5, [legXOffset, footY, 1.5], limbMat);
        this.mesh.add(rightFoot);
        this.mesh.add(this.createBox(jointSize * 0.8, jointSize * 0.6, jointDepth, [legXOffset, shinY - 3.25, 0 - jointDepth/2 + SURFACE_OFFSET], limbDarkMat, [Math.PI / 7, 0, 0])); // Ankle

        // Right Claws
        this.mesh.add(this.createBox(1.8, 1.8, 4.0, [legXOffset - 1.2, footY - 0.8, clawFootZOffset], clawMat, [-Math.PI / 4, -Math.PI / 16, 0]));
        this.mesh.add(this.createBox(1.8, 1.8, 4.2, [legXOffset,       footY - 0.8, clawFootZOffset + 0.3], clawMat, [-Math.PI / 4, 0, 0]));
        this.mesh.add(this.createBox(1.8, 1.8, 4.0, [legXOffset + 1.2, footY - 0.8, clawFootZOffset], clawMat, [-Math.PI / 4, Math.PI / 16, 0]));

        // **Arms** (Adding shoulder/elbow details)
        const armXOffset = torsoWidth / 2 + 1.5; // Attach further out for broader shoulders
        const upperArmY = torsoY + 1.0; // Higher shoulder joint relative to torso center
        const lowerArmY = upperArmY - 6.0; // Lower elbow
        const handY = lowerArmY - 4.5; // Lower hand

        const shoulderSize = 4.5;
        const elbowSize = 3.5;

        // Left Arm (Viewer's Right)
        // Shoulder Pauldron (Darker) - positioned above and outside the torso
        this.mesh.add(this.createBox(shoulderSize, shoulderSize, shoulderSize, [-armXOffset + 0.5, upperArmY + 0.5, 0], limbDarkMat));
        const upperArmL = this.createBox(3.5, 5.5, 3.5, [-armXOffset, upperArmY, 0], limbMat); // Upper Arm
        this.mesh.add(upperArmL);
        const lowerArmL = this.createBox(3, 5.5, 3, [-armXOffset, lowerArmY, 0], limbMat); // Lower Arm
        this.mesh.add(lowerArmL);
         // Elbow Joint (Darker) - positioned at the junction
         this.mesh.add(this.createBox(elbowSize, elbowSize * 0.7, jointDepth, [-armXOffset, upperArmY - 2.75, 0 - jointDepth/2 + SURFACE_OFFSET ], limbDarkMat)); // Adjusted Z offset
        const leftHand = this.createBox(4, 2.5, 4, [-armXOffset, handY, 0], bodyDarkMat); // Darker hand base
        this.mesh.add(leftHand);
         // Left Hand Claws (Slightly larger) - positioned in front of hand
        const handFrontZOffset = 0 - (4/2); // Z center of hand is 0, front is negative Z
        this.mesh.add(this.createBox(1.6, 4.0, 1.6, [-armXOffset-1.0, handY-1.8, handFrontZOffset - 0.8], clawMat, [Math.PI / 3.2, 0, -Math.PI / 16])); // Angled down and slightly sideways
        this.mesh.add(this.createBox(1.6, 4.5, 1.6, [-armXOffset,     handY-2.1, handFrontZOffset - 1.0], clawMat, [Math.PI / 3.2, 0, 0])); // Center longer, angled down
        this.mesh.add(this.createBox(1.6, 4.0, 1.6, [-armXOffset+1.0, handY-1.8, handFrontZOffset - 0.8], clawMat, [Math.PI / 3.2, 0, Math.PI / 16])); // Angled down and slightly sideways

        // Right Arm (Viewer's Left - Mirroring)
        this.mesh.add(this.createBox(shoulderSize, shoulderSize, shoulderSize, [armXOffset - 0.5, upperArmY + 0.5, 0], limbDarkMat)); // Shoulder
        const upperArmR = this.createBox(3.5, 5.5, 3.5, [armXOffset, upperArmY, 0], limbMat);
        this.mesh.add(upperArmR);
        const lowerArmR = this.createBox(3, 5.5, 3, [armXOffset, lowerArmY, 0], limbMat);
        this.mesh.add(lowerArmR);
         this.mesh.add(this.createBox(elbowSize, elbowSize * 0.7, jointDepth, [armXOffset, upperArmY - 2.75, 0 - jointDepth/2 + SURFACE_OFFSET], limbDarkMat)); // Elbow - Adjusted Z offset
        const rightHand = this.createBox(4, 2.5, 4, [armXOffset, handY, 0], bodyDarkMat);
        this.mesh.add(rightHand);
        // Right Hand Claws
        this.mesh.add(this.createBox(1.6, 4.0, 1.6, [armXOffset-1.0, handY-1.8, handFrontZOffset - 0.8], clawMat, [Math.PI / 3.2, 0, -Math.PI / 16]));
        this.mesh.add(this.createBox(1.6, 4.5, 1.6, [armXOffset,     handY-2.1, handFrontZOffset - 1.0], clawMat, [Math.PI / 3.2, 0, 0]));
        this.mesh.add(this.createBox(1.6, 4.0, 1.6, [armXOffset+1.0, handY-1.8, handFrontZOffset - 0.8], clawMat, [Math.PI / 3.2, 0, Math.PI / 16]));

        // **Tail** (Alternating segment colors/materials, extending backward: +Z)
        let segmentWidth = 3.2;
        let segmentHeight = 3.2;
        let segmentDepth = 3.2;
        let currentPos = new THREE.Vector3(0, torsoY - torsoHeight / 2 + 1.0, torsoDepth / 2);
        let currentRot = new THREE.Vector3(Math.PI / 10, 0, 0);
        let lastSegmentMesh = null;

        for (let i = 0; i < 8; i++) {
            const segmentMat = (i % 2 === 0) ? limbMat : limbLightMat;
            const segment = this.createBox(segmentWidth, segmentHeight, segmentDepth,
                [currentPos.x, currentPos.y, currentPos.z],
                segmentMat,
                [currentRot.x, currentRot.y, currentRot.z]);
            this.mesh.add(segment);

            if (lastSegmentMesh) {
                const jointConnectorSize = segmentWidth * 0.8;
                const jointPos = new THREE.Vector3().lerpVectors(segment.position, lastSegmentMesh.position, 0.5);
                const jointConnector = this.createBox(jointConnectorSize, jointConnectorSize, jointConnectorSize*0.5,
                     [jointPos.x / this.scale, jointPos.y / this.scale, jointPos.z / this.scale],
                     limbDarkMat,
                     [currentRot.x, currentRot.y, currentRot.z]);
                this.mesh.add(jointConnector);
            }
            lastSegmentMesh = segment;

            const segmentOffsetUnscaled = segmentDepth * 0.75; // Use unscaled depth for offset calculation
            const offsetVec = new THREE.Vector3(0, 0, segmentOffsetUnscaled); // Offset along segment's local Z before rotation

            // Apply rotation to the offset vector correctly
            const rotationQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(currentRot.x, currentRot.y, currentRot.z));
            offsetVec.applyQuaternion(rotationQuat);

            // Update position for the *next* segment's center (relative to group origin, in unscaled units for createBox)
            currentPos.x += offsetVec.x;
            currentPos.y += offsetVec.y;
            currentPos.z += offsetVec.z;

            currentRot.x += Math.PI / 45;
            segmentWidth *= 0.92;
            segmentHeight *= 0.92;
            segmentDepth *= 0.92;
        }

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    // updateLogic method - Called by physics update
    updateLogic(player, deltaTime) {
        if (this.ai && typeof this.ai.update === 'function') {
            this.ai.update(this, player, deltaTime);
        }
        if (this.collisionHandler && typeof this.collisionHandler.update === 'function') {
            // Collision handler might trigger jumps based on obstacles
            this.collisionHandler.update(deltaTime);
        }
    }

    // updatePosition method - Called by physics to update mesh position
    updatePosition(newPosition) {
        this.position.copy(newPosition);
        this.mesh.position.copy(newPosition);
    }

    // updateRotation method - Called by AI to update mesh rotation (yaw)
    updateRotation(yaw) {
        this.mesh.rotation.y = yaw + Math.PI; // Apply 180 deg offset for model orientation
    }
}