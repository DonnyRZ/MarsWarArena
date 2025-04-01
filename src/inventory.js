import * as THREE from 'three';

// =============================================================================
// === LASER GUN CLASS =========================================================
// =============================================================================

export class LaserGun {
    constructor() {
        // --- Materials (Refined for distinct surfaces) ---
        this.materials = {
            body: new THREE.MeshStandardMaterial({
                color: 0x778899, // Slightly bluish steel gray
                roughness: 0.6,  // Moderately rough
                metalness: 0.4   // Slightly metallic
            }),
            grip: new THREE.MeshStandardMaterial({
                color: 0x4a4a4a, // Darker gray
                roughness: 0.8,  // Rougher for grip
                metalness: 0.1   // Barely metallic
            }),
            energy: new THREE.MeshStandardMaterial({
                color: 0x00ffaa, // Cyan-green energy
                emissive: 0x008866, // Glowing effect
                roughness: 0.3,  // Smoother, reflects light more sharply
                metalness: 0.0
            }),
            emitter: new THREE.MeshStandardMaterial({
                color: 0xff4444, // Intense red
                emissive: 0x990000, // Stronger glow
                roughness: 0.2,  // Relatively smooth
                metalness: 0.1
            }),
            detail: new THREE.MeshStandardMaterial({
                color: 0x333333, // Very dark gray for details/vents
                roughness: 0.7,
                metalness: 0.2
            })
        };

        // --- Gun Model Group ---
        this.mesh = new THREE.Group();

        // --- Build the Gun ---
        this.buildGun();

        // --- Set Shadows for all parts ---
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    // Helper function to create and add mesh with shadow properties
    _createPart(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.scale.set(sx, sy, sz);
        // Shadows are handled globally for the group after build
        this.mesh.add(mesh);
        return mesh;
    }

    buildGun() {
        // Reusable geometries (defined locally within build)
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16); // RadiusTop, RadiusBottom, Height, Segments

        // Use internal materials reference
        const bodyMat = this.materials.body;
        const gripMat = this.materials.grip;
        const energyMat = this.materials.energy;
        const emitterMat = this.materials.emitter;
        const detailMat = this.materials.detail;

        // --- Build the Gun Components (More detailed shapes) ---

        // Grip (More ergonomic shape using scaled/rotated boxes)
        this._createPart(boxGeometry, gripMat, 0, -2.5, -0.5, 0, 0, 0, 1.2, 2.5, 1); // Main grip block
        this._createPart(boxGeometry, gripMat, 0, -1.5, 0.1, Math.PI * 0.1, 0, 0, 1.2, 0.6, 0.6); // Angled top part
        this._createPart(boxGeometry, gripMat, 0, -3.6, -0.5, 0, 0, 0, 1.2, 0.4, 1); // Base flare

        // Energy Cell (Cylindrical, inset slightly)
        this._createPart(cylinderGeometry, energyMat, 0, -2.5, -0.5, Math.PI / 2, 0, 0, 0.8, 1.1, 0.8); // Rotated cylinder

        // Main Body (Connects grip and barrel, more structure)
        this._createPart(boxGeometry, bodyMat, 0, -0.8, 1.5, 0, 0, 0, 1.5, 1.0, 3.0); // Core body block
        this._createPart(boxGeometry, detailMat, 0, -0.4, 0.5, 0, 0, 0, 1.6, 0.2, 0.8); // Detail strip top
        this._createPart(boxGeometry, detailMat, 0, -1.2, 0.5, 0, 0, 0, 1.6, 0.2, 0.8); // Detail strip bottom

        // Barrel Assembly (Cylinder + Box elements)
        const barrelRadius = 0.4;
        const barrelLength = 4.0;
        this._createPart(cylinderGeometry, bodyMat, 0, -0.8, 3.0 + barrelLength / 2 - 0.5, Math.PI / 2, 0, 0, barrelRadius * 2, barrelLength, barrelRadius * 2); // Main Barrel
        this._createPart(boxGeometry, bodyMat, 0, -0.2, 3.0, 0, 0, 0, 0.5, 0.2, 1.5); // Top rail/detail
        this._createPart(boxGeometry, detailMat, 0, -0.8, 2.0, 0, 0, 0, 1.0, 0.5, 0.3); // Vent detail near base

        // Laser Emitter Tip
        const emitterSize = barrelRadius * 1.1;
        this._createPart(cylinderGeometry, emitterMat, 0, -0.8, 3.0 + barrelLength - 0.5, Math.PI / 2, 0, 0, emitterSize * 2, 0.6, emitterSize * 2);

        // Trigger and Trigger Guard (Thinner, more defined)
        this._createPart(boxGeometry, detailMat, 0, -1.5, 0.6, 0, 0, 0, 0.2, 0.6, 0.2); // Trigger
        this._createPart(boxGeometry, detailMat, 0, -2.0, 0.8, 0, 0, 0, 0.2, 0.2, 1.5); // Guard bottom
        this._createPart(boxGeometry, detailMat, 0.5, -1.7, 1.5, 0, 0, Math.PI * 0.1, 0.2, 0.8, 0.2); // Guard front right
        this._createPart(boxGeometry, detailMat, -0.5, -1.7, 1.5, 0, 0, -Math.PI * 0.1, 0.2, 0.8, 0.2); // Guard front left

        // Sight (Simple but distinct)
        this._createPart(boxGeometry, detailMat, 0, 0.1, 2.5, 0, 0, 0, 0.2, 0.3, 0.8); // Sight base
        this._createPart(boxGeometry, emitterMat, 0, 0.35, 2.5, 0, 0, 0, 0.1, 0.1, 0.1); // Small red dot/indicator
    }
}


// =============================================================================
// === SABER CLASS =============================================================
// =============================================================================

export class Saber {
    constructor() {
        // --- Saber Materials ---
        this.materials = {
            // Hilt (using MeshStandardMaterial for better lighting interaction)
            hiltDark: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.4 }),
            hiltLight: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5, metalness: 0.5 }),
            hiltAccentRed: new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.7, metalness: 0.2 }),
            hiltAccentGold: new THREE.MeshStandardMaterial({ color: 0xffcc33, roughness: 0.4, metalness: 0.6 }),
            hiltAccentBlack: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 }),
            shroud: new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5, metalness: 0.5 }), // Specific shroud grey

            // Blade (using MeshBasicMaterial for glow effect - won't receive shadows)
            bladeOuter: new THREE.MeshBasicMaterial({ color: 0x66ff99 }), // Bright green
            bladeInner: new THREE.MeshBasicMaterial({ color: 0xffffff })  // Pure white
        };

        // --- Saber Model Group ---
        this.mesh = new THREE.Group(); // Group all parts together

        // --- Build the Saber ---
        this.buildSaber();

        // --- Set Shadows for hilt parts ---
        // Note: Blades use MeshBasicMaterial and won't cast/receive shadows
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && !(child.material instanceof THREE.MeshBasicMaterial)) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    buildSaber() {
        // Use internal materials reference
        const hiltDarkMat = this.materials.hiltDark;
        const hiltLightMat = this.materials.hiltLight;
        const hiltAccentRedMat = this.materials.hiltAccentRed;
        const hiltAccentGoldMat = this.materials.hiltAccentGold;
        const hiltAccentBlackMat = this.materials.hiltAccentBlack;
        const shroudMat = this.materials.shroud;
        const bladeOuterMat = this.materials.bladeOuter;
        const bladeInnerMat = this.materials.bladeInner;

        // --- Hilt Dimensions ---
        const hiltBaseHeight = 1.0;
        const hiltMidHeight = 1.5;
        const hiltEmitterHeight = 0.5;
        const hiltWidth = 0.5;
        const hiltDepth = 0.5;

        // --- Hilt Base (Pommel) ---
        const baseGeo = new THREE.BoxGeometry(hiltWidth * 1.2, hiltBaseHeight, hiltDepth * 1.2); // Slightly wider base
        const hiltBase = new THREE.Mesh(baseGeo, hiltDarkMat);
        hiltBase.position.y = -(hiltMidHeight / 2 + hiltBaseHeight / 2);
        this.mesh.add(hiltBase);

        // Small protrusions at the very bottom
        const pommelDetailGeo = new THREE.BoxGeometry(hiltWidth * 0.3, hiltBaseHeight * 0.4, hiltDepth * 1.4);
        const pommelDetail1 = new THREE.Mesh(pommelDetailGeo, hiltLightMat);
        pommelDetail1.position.y = hiltBase.position.y - hiltBaseHeight * 0.3;
        pommelDetail1.position.x = hiltWidth * 0.3; // Offset slightly
        this.mesh.add(pommelDetail1);

        const pommelDetail2 = pommelDetail1.clone(); // Clone for the other side
        pommelDetail2.position.x = -hiltWidth * 0.3;
        this.mesh.add(pommelDetail2);

        // --- Hilt Middle Section ---
        const midGeo = new THREE.BoxGeometry(hiltWidth, hiltMidHeight, hiltDepth);
        const hiltMid = new THREE.Mesh(midGeo, hiltLightMat);
        // Position y = 0 (center of this part is the group's origin for simplicity)
        this.mesh.add(hiltMid);

        // Hilt Mid Details (Grips)
        const gripGeo = new THREE.BoxGeometry(hiltWidth * 1.05, hiltMidHeight * 0.15, hiltDepth * 1.05); // Thin grip bands
        const grip1 = new THREE.Mesh(gripGeo, hiltAccentBlackMat);
        grip1.position.y = hiltMidHeight * 0.35; // Position grips relative to mid section center
        this.mesh.add(grip1);

        const grip2 = grip1.clone();
        grip2.position.y = hiltMidHeight * 0.15;
        this.mesh.add(grip2);

        const grip3 = grip1.clone();
        grip3.position.y = -hiltMidHeight * 0.15;
        this.mesh.add(grip3);

        const grip4 = grip1.clone();
        grip4.position.y = -hiltMidHeight * 0.35;
        this.mesh.add(grip4);

        // Red Button
        const buttonGeo = new THREE.BoxGeometry(hiltWidth * 0.3, hiltWidth * 0.3, hiltDepth * 0.2);
        const redButton = new THREE.Mesh(buttonGeo, hiltAccentRedMat);
        redButton.position.set(hiltWidth / 2 + hiltDepth * 0.1, hiltMidHeight * 0.3, 0); // Position on the side, slightly out
        redButton.rotation.y = Math.PI / 2; // Rotate to face outwards
        this.mesh.add(redButton);

        // Gold Switch
        const switchGeo = new THREE.BoxGeometry(hiltWidth * 0.6, hiltWidth * 0.2, hiltDepth * 0.2);
        const goldSwitch = new THREE.Mesh(switchGeo, hiltAccentGoldMat);
        goldSwitch.position.set(hiltWidth / 2 + hiltDepth * 0.1, 0, 0); // Position on the side, centered vertically
        goldSwitch.rotation.y = Math.PI / 2;
        this.mesh.add(goldSwitch);

        // Small square detail
        const squareDetailGeo = new THREE.BoxGeometry(hiltWidth * 0.25, hiltWidth * 0.25, hiltDepth * 0.2);
        const squareDetail = new THREE.Mesh(squareDetailGeo, hiltAccentBlackMat);
        squareDetail.position.set(hiltWidth / 2 + hiltDepth * 0.1, -hiltMidHeight * 0.3, 0); // Position on the side, lower part
        squareDetail.rotation.y = Math.PI / 2;
        this.mesh.add(squareDetail);

        // --- Hilt Emitter ---
        const emitterGeo = new THREE.BoxGeometry(hiltWidth * 0.8, hiltEmitterHeight, hiltDepth * 0.8); // Slightly thinner
        const hiltEmitter = new THREE.Mesh(emitterGeo, hiltDarkMat);
        hiltEmitter.position.y = hiltMidHeight / 2 + hiltEmitterHeight / 2;
        this.mesh.add(hiltEmitter);

        // Emitter shroud (angled parts)
        const shroudPartGeo = new THREE.BoxGeometry(hiltWidth * 0.4, hiltEmitterHeight * 1.2, hiltDepth * 0.4);
        // Using the specific shroud material defined above
        const shroud1 = new THREE.Mesh(shroudPartGeo, shroudMat);
        shroud1.position.set(hiltWidth * 0.3, hiltEmitter.position.y, hiltDepth * 0.3);
        this.mesh.add(shroud1);

        const shroud2 = shroud1.clone();
        shroud2.position.set(-hiltWidth * 0.3, hiltEmitter.position.y, hiltDepth * 0.3);
        this.mesh.add(shroud2);

        const shroud3 = shroud1.clone();
        shroud3.position.set(hiltWidth * 0.3, hiltEmitter.position.y, -hiltDepth * 0.3);
        this.mesh.add(shroud3);

        const shroud4 = shroud1.clone();
        shroud4.position.set(-hiltWidth * 0.3, hiltEmitter.position.y, -hiltDepth * 0.3);
        this.mesh.add(shroud4);

        // --- Blade ---
        const bladeLength = 6.0;
        const bladeWidth = 0.35;
        const bladeDepth = 0.35;
        const bladeCoreWidth = 0.18; // Slightly thinner core
        const bladeCoreDepth = 0.18;

        // Outer Blade
        const bladeOuterGeo = new THREE.BoxGeometry(bladeWidth, bladeLength, bladeDepth);
        const bladeOuter = new THREE.Mesh(bladeOuterGeo, bladeOuterMat);
        // Position blade relative to emitter top
        bladeOuter.position.y = hiltEmitter.position.y + hiltEmitterHeight / 2 + bladeLength / 2;
        this.mesh.add(bladeOuter);

        // Inner Blade Core
        const bladeInnerGeo = new THREE.BoxGeometry(bladeCoreWidth, bladeLength * 1.01, bladeCoreDepth); // Slightly longer to ensure visibility at tip
        const bladeInner = new THREE.Mesh(bladeInnerGeo, bladeInnerMat);
        // Position core exactly where the outer blade is
        bladeInner.position.y = bladeOuter.position.y;
        // Render inner core *after* outer blade (usually default, but good practice)
        bladeInner.renderOrder = 1;
        this.mesh.add(bladeInner);

        // --- Initial Saber Orientation ---
        // These rotations/positions define the default pose of the saber model itself
        this.mesh.rotation.z = Math.PI / 5; // Tilt the saber ~36 degrees sideways
        this.mesh.rotation.x = Math.PI / 10; // Slight tilt forward
        this.mesh.position.y = -1; // Move the whole model down slightly relative to its group origin
    }
}