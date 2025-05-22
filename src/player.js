// --- START OF FILE player.js ---

// src/player.js
// ... (other comments)
// MOBILE FIX: Ensure movement logic considers active mobile joystick input
// FIX: Defined _cameraEuler locally for updateModelRotation

import * as THREE from 'three'; // Make sure THREE is imported
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Human } from './human.js';
import { PlayerInputHandler } from './PlayerInputHandler.js';
import { calculatePlayerPhysicsUpdate } from './PlayerPhysicsProcessor.js';

// --- Module-scoped temporary variables for Player.js ---
const _cameraEuler = new THREE.Euler(0,0,0, 'YXZ'); // <<< FIX: Define _cameraEuler here
const _tempVec3_RaycastOrigin = new THREE.Vector3();
const _tempVec3_BarrelOrigin = new THREE.Vector3();
const _tempVec3_Direction = new THREE.Vector3();
const _tempVec3_SegmentStart = new THREE.Vector3();
const _tempVec3_SegmentEnd = new THREE.Vector3();
const _tempVec3_Midpoint = new THREE.Vector3();
const _tempQuat_Segment = new THREE.Quaternion();
// --- End temporary variables ---


export class Player {
    constructor(camera, domElement, scene, physics, world, audioManager, activeGhasts, isMobileContext = false) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        this.physics = physics;
        this.world = world;
        this.audioManager = audioManager;
        this.activeGhasts = activeGhasts;
        this.entityManager = null;

        this.isMobileContext = isMobileContext;

        // ... (rest of constructor properties are the same) ...
        this.position = new THREE.Vector3(0, 20, 0);
        this.visualPosition = this.position.clone();
        this.velocity = new THREE.Vector3();
        this.height = 1.75;
        this.radius = 0.5;
        this.cylinderRadius = 0.475;
        this.cylinderHeight = 2.35;
        this.gravityEnabled = true;
        this.onGround = false;
        this.isFirstPerson = false;

        this.maxHealth = 12000;
        this.health = this.maxHealth;
        this.isDead = false;

        this.jumpSpeed = 10.0;
        this.coyoteTimer = 0;
        this.coyoteTimeDuration = 0.1;
        this.jumpBufferTimer = 0;
        this.jumpBufferDuration = 0.15;

        this.laserCooldownDuration = 0.15;
        this.laserCooldownTimer = 0;
        this.canShoot = true;
        this.laserDamageAmount = 10;

        this.isLaserBeamActive = false;
        this.laserTargetPoint = new THREE.Vector3();
        this.laserBeamDurationTimer = 0;
        this.laserBeamTotalDuration = 0.15;
        this.laserTravelTimer = 0;
        this.laserMaxTravelTime = 0.1;
        this.laserSegmentLength = 0.8;
        this.laserSegmentLifespan = 70;

        this.controls = new PointerLockControls(this.camera, this.domElement);
        this.camera.position.copy(this.position);
        this.unlockIntentional = false;

        this.human = new Human(this.scene, this.position, this.radius, this.height);
        this.inputHandler = new PlayerInputHandler();

        this.controls.addEventListener('lock', () => {
            this.isFirstPerson = true;
            this.unlockIntentional = false;
        });
        this.controls.addEventListener('unlock', () => {
            this.isFirstPerson = false;
        });
    }

    updatePhysicsStep(physics, world, timeStep) {
        const effectivelyLockedForMovement = this.controls.isLocked ||
                                           (this.isMobileContext &&
                                            (this.inputHandler.forward || this.inputHandler.backward ||
                                             this.inputHandler.left || this.inputHandler.right));

        const deltaVelocity = calculatePlayerPhysicsUpdate(
            this.velocity,
            this.inputHandler,
            this.camera.quaternion,
            effectivelyLockedForMovement,
            this.human.mesh.quaternion,
            this.gravityEnabled,
            physics.gravity,
            timeStep
        );
        this.velocity.add(deltaVelocity);
        this.position.addScaledVector(this.velocity, timeStep);
        
        this.updateModelRotation(); // Call it here to ensure model rotation is attempted

        if (this.laserCooldownTimer > 0) {
            this.laserCooldownTimer -= timeStep;
            if (this.laserCooldownTimer <= 0) { this.canShoot = true; this.laserCooldownTimer = 0; }
        }
        if (this.coyoteTimer > 0) { this.coyoteTimer -= timeStep; if (this.coyoteTimer < 0) this.coyoteTimer = 0; }
        if (this.jumpBufferTimer > 0) { this.jumpBufferTimer -= timeStep; if (this.jumpBufferTimer < 0) this.jumpBufferTimer = 0; }
    }

    handleActionInputs() {
        if (this.inputHandler.jumpRequested) {
            this.jumpBufferTimer = this.jumpBufferDuration;
        }
        const canAttemptShoot = this.controls.isLocked || this.isMobileContext;
        if (this.inputHandler.shootRequested && this.canShoot && this.human.isLaserGunEquipped && canAttemptShoot && !this.isLaserBeamActive) {
            this.initiateLaserShot();
            this.canShoot = false;
            this.laserCooldownTimer = this.laserCooldownDuration;
        }
        if (this.inputHandler.switchWeapon1Requested) {
            if (this.human.isSaberEquipped) this.human.unequipSaber();
            else { this.human.equipSaber(); this._attemptLockControlsPostAction(); }
        }
        if (this.inputHandler.switchWeapon2Requested) {
             if (this.human.isLaserGunEquipped) this.human.unequipLaserGun();
             else { this.human.equipLaserGun(); this._attemptLockControlsPostAction(); }
        }
        if (this.inputHandler.toggleGravityRequested) {
            this.gravityEnabled = !this.gravityEnabled;
            console.log("Gravity Enabled:", this.gravityEnabled);
            if (!this.gravityEnabled) this.velocity.y = 0;
        }
    }

    updateModelRotation() {
        const shouldAlignWithCamera = this.controls.isLocked || this.isMobileContext;

        if (this.human && shouldAlignWithCamera && this.camera) {
            // _cameraEuler is now defined at the top of this file
            _cameraEuler.setFromQuaternion(this.camera.quaternion, 'YXZ');
            const yaw = _cameraEuler.y;
            const pitch = _cameraEuler.x;
            const applyPitchToArm = (this.human.isSaberEquipped || this.human.isLaserGunEquipped);
            this.human.updateRotation(yaw, pitch, applyPitchToArm);
        }
    }

    _attemptLockControlsPostAction() {
        if (this.isMobileContext) return;
        const isMenuOpen = typeof window.menu !== 'undefined' && window.menu && typeof window.menu.isOpen === 'function' && window.menu.isOpen();
        const isPortalMenuOpen = typeof window.portalMenu !== 'undefined' && window.portalMenu && typeof window.portalMenu.isOpen === 'function' && window.portalMenu.isOpen();
        if (this.human.isSaberEquipped || this.human.isLaserGunEquipped) {
            if (!this.controls.isLocked) {
                if (!isMenuOpen && !isPortalMenuOpen) { this.controls.lock(); }
            }
        }
    }

    getCameraInfo(isMobileActive = false) {
        if (!this.controls || !this.human || !this.human.mesh || !this.visualPosition) {
            return { mode: 'thirdPerson', targetPosition: this.visualPosition || new THREE.Vector3(), modelOrientation: this.human?.mesh?.quaternion || new THREE.Quaternion(), firstPersonEyeOffset: this.height * 0.45 || 0.8 };
        }
        let mode = 'thirdPerson';
        if (this.controls.isLocked) {
            if (this.human && (this.human.isSaberEquipped || this.human.isLaserGunEquipped)) mode = 'firstPerson';
            else mode = 'thirdPerson';
        } else if (isMobileActive) {
            if (this.human && (this.human.isSaberEquipped || this.human.isLaserGunEquipped)) mode = 'firstPerson';
            else mode = 'thirdPerson';
        }
        const eyeOffset = this.height * 0.45;
        return { mode: mode, targetPosition: this.visualPosition, modelOrientation: this.human.mesh.quaternion, firstPersonEyeOffset: eyeOffset };
    }

    updateModelVisibility(mode) {
        const isBodyVisible = (mode === 'thirdPerson');
        if (this.human) {
            this.human.head.visible = isBodyVisible; this.human.visor.visible = isBodyVisible;
            this.human.body.visible = isBodyVisible; this.human.leftSeam.visible = isBodyVisible;
            this.human.rightSeam.visible = isBodyVisible; this.human.oxygenTank.visible = isBodyVisible;
            this.human.upperLeftLeg.visible = isBodyVisible; this.human.leftFoot.visible = isBodyVisible;
            this.human.upperRightLeg.visible = isBodyVisible; this.human.rightFoot.visible = isBodyVisible;
            this.human.leftArmGroup.visible = true; this.human.rightArmGroup.visible = true;
            if (this.human.saber?.mesh) this.human.saber.mesh.visible = this.human.isSaberEquipped;
            if (this.human.laserGun?.mesh) this.human.laserGun.mesh.visible = this.human.isLaserGunEquipped;
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.health -= amount;
        console.log(`Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0) {
            this.health = 0; this.isDead = true; console.log("Player has died!");
            if (this.isMobileContext && typeof window.mobileControls !== 'undefined' && window.mobileControls) {
                window.mobileControls.hide();
            }
        }
    }

    resetState(spawnPosition) {
        console.log("Resetting player state...");
        this.health = this.maxHealth; this.isDead = false;
        this.position.copy(spawnPosition); this.visualPosition.copy(spawnPosition);
        this.velocity.set(0, 0, 0); this.onGround = false;
        this.coyoteTimer = 0; this.jumpBufferTimer = 0;
        this.laserCooldownTimer = 0; this.canShoot = true;
        this.unlockIntentional = false;
        this.isLaserBeamActive = false; this.laserBeamDurationTimer = 0; this.laserTravelTimer = 0;
        this.laserTargetPoint.set(0,0,0);
        if(this.inputHandler) this.inputHandler.resetFrameState();
        this.isFirstPerson = false;
        if (this.human) {
            this.human.updatePosition(this.visualPosition);
            this.human.mesh.rotation.set(0, Math.PI, 0);
            this.human.leftArmGroup.rotation.set(0, 0, 0); this.human.rightArmGroup.rotation.set(0, 0, 0);
            this.human.unequipSaber(); this.human.unequipLaserGun();
            this.updateModelVisibility('thirdPerson');
        }
        if (this.controls.isLocked) { this.unlockIntentional = true; this.controls.unlock(); }
        if (this.isMobileContext && typeof window.mobileControls !== 'undefined' && window.mobileControls && (!window.menu || !window.menu.isOpen()) && (!window.portalMenu || !window.portalMenu.isOpen()) ) {
            window.mobileControls.show();
        }
    }

    initiateLaserShot() {
        if (!this.entityManager || !this.world || !this.world.instancedMeshes || !this.human?.laserGun?.barrelTip) {
            console.error("Cannot initiate laser shot: Missing dependencies."); return;
        }
        this.audioManager.playSound('laser');
        this.camera.getWorldDirection(_tempVec3_Direction);
        this.camera.getWorldPosition(_tempVec3_RaycastOrigin);
        const cameraRaycaster = new THREE.Raycaster(_tempVec3_RaycastOrigin, _tempVec3_Direction);
        const objectsToIntersect = [...this.world.instancedMeshes];
        const creatureMeshes = this.physics?.creatures?.map(c => c?.mesh).filter(mesh => mesh) || [];
        const ghastMeshes = this.activeGhasts?.map(g => g?.mesh).filter(mesh => mesh) || [];
        objectsToIntersect.push(...creatureMeshes, ...ghastMeshes);
        const intersects = cameraRaycaster.intersectObjects(objectsToIntersect, true);
        let targetPoint; let hitTarget = null; let targetType = null; const maxRange = 100;
        if (intersects.length > 0) {
            targetPoint = intersects[0].point;
            const hitObjectRoot = intersects[0].object.userData.rootMesh || intersects[0].object;
            let current = hitObjectRoot;
            while(current && current !== this.scene) {
                const pM = this.physics.creatures.find(c => c && c.mesh === current);
                if (pM && !pM.isDead) { hitTarget = pM; targetType = 'martian'; break; }
                const pG = this.activeGhasts.find(g => g && g.mesh === current);
                if (pG && !pG.isDead) { hitTarget = pG; targetType = 'ghast'; break; }
                current = current.parent;
            }
             if (hitTarget && targetType) {
                  console.log(`Hit a live ${targetType}!`);
                  hitTarget.takeDamage(this.laserDamageAmount);
                  this.audioManager.playSound('impact_martian');
             }
        } else {
            targetPoint = _tempVec3_RaycastOrigin.clone().add(_tempVec3_Direction.multiplyScalar(maxRange));
        }
        this.isLaserBeamActive = true;
        this.laserTargetPoint.copy(targetPoint);
        this.laserBeamDurationTimer = this.laserBeamTotalDuration;
        this.laserTravelTimer = 0;
    }

    updateLaserBeam(deltaTime) {
        if (!this.isLaserBeamActive || !this.entityManager || !this.human?.laserGun?.barrelTip) return;
        this.laserBeamDurationTimer -= deltaTime;
        if (this.laserBeamDurationTimer <= 0) { this.isLaserBeamActive = false; return; }
        this.laserTravelTimer += deltaTime;
        const travelRatio = Math.min(1.0, this.laserTravelTimer / this.laserMaxTravelTime);
        this.human.laserGun.barrelTip.getWorldPosition(_tempVec3_BarrelOrigin);
        _tempVec3_SegmentEnd.copy(_tempVec3_BarrelOrigin).lerp(this.laserTargetPoint, travelRatio);
        _tempVec3_Direction.subVectors(this.laserTargetPoint, _tempVec3_BarrelOrigin);
        const totalDistance = _tempVec3_Direction.length();
        if (totalDistance > 0.01) _tempVec3_Direction.divideScalar(totalDistance);
        else _tempVec3_Direction.set(0,0,-1).applyQuaternion(this.camera.quaternion);
        _tempVec3_SegmentStart.copy(_tempVec3_SegmentEnd).addScaledVector(_tempVec3_Direction, -this.laserSegmentLength);
        if (_tempVec3_BarrelOrigin.distanceToSquared(_tempVec3_SegmentStart) > _tempVec3_BarrelOrigin.distanceToSquared(_tempVec3_SegmentEnd) && travelRatio < 1.0) {
             _tempVec3_SegmentStart.copy(_tempVec3_BarrelOrigin);
        }
        const currentSegmentLength = _tempVec3_SegmentStart.distanceTo(_tempVec3_SegmentEnd);
        if (currentSegmentLength < 0.01) return;
        const innerR=0.03, outerR=0.1, iC=0xff00ff, oC=0x880088, segs=8;
        const iG = new THREE.CylinderGeometry(innerR, innerR, currentSegmentLength, segs);
        const iM = new THREE.MeshBasicMaterial({ color: iC, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false });
        const iMesh = new THREE.Mesh(iG, iM);
        const oG = new THREE.CylinderGeometry(outerR, outerR, currentSegmentLength, segs);
        const oM = new THREE.MeshBasicMaterial({ color: oC, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.4, depthWrite: false });
        const oMesh = new THREE.Mesh(oG, oM);
        _tempVec3_Direction.subVectors(_tempVec3_SegmentEnd, _tempVec3_SegmentStart).normalize();
        _tempQuat_Segment.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _tempVec3_Direction);
        _tempVec3_Midpoint.lerpVectors(_tempVec3_SegmentStart, _tempVec3_SegmentEnd, 0.5);
        iMesh.quaternion.copy(_tempQuat_Segment); iMesh.position.copy(_tempVec3_Midpoint);
        oMesh.quaternion.copy(_tempQuat_Segment); oMesh.position.copy(_tempVec3_Midpoint);
        this.scene.add(iMesh); this.scene.add(oMesh);
        const cT = performance.now();
        this.entityManager.addLaserBeam({ mesh: iMesh, despawnTime: cT + this.laserSegmentLifespan });
        this.entityManager.addLaserBeam({ mesh: oMesh, despawnTime: cT + this.laserSegmentLifespan });
    }

    applyPostPhysicsUpdates(wasOnGround) {
        if (wasOnGround && !this.onGround) this.coyoteTimer = this.coyoteTimeDuration;
        if (this.jumpBufferTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
            this.velocity.y = this.jumpSpeed; this.onGround = false;
            this.jumpBufferTimer = 0; this.coyoteTimer = 0;
        }
    }

    updateVisuals(lerpFactor) {
        if (this.visualPosition && this.position && this.human) {
            this.visualPosition.lerp(this.position, lerpFactor);
            this.human.updatePosition(this.visualPosition);
        }
    }
}
// --- END OF FILE player.js ---