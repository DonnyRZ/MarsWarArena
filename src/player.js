import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Human } from './human.js';

export class Player {
    constructor(camera, domElement, scene, activeLaserBeams, physics, world, audioManager) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        this.activeLaserBeams = activeLaserBeams;
        this.physics = physics;
        this.world = world;
        this.audioManager = audioManager; // For sound effects
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
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        this.lastSpacePressTime = 0;
        this.doublePressThreshold = 300;
        this.isFrontViewRequested = false;
        this.wasFirstPersonBeforeFrontView = false;
        this.previousCameraQuaternion = new THREE.Quaternion();
        this.coyoteTimer = 0;
        this.coyoteTimeDuration = 0.1;
        this.jumpBufferTimer = 0;
        this.jumpBufferDuration = 0.15;
        this.laserCooldownDuration = 0.01; // 200ms cooldown
        this.laserCooldownTimer = 0;
        this.canShoot = true;
        this.laserDamageAmount = 10; // Damage dealt to Martians

        this.controls = new PointerLockControls(this.camera, this.domElement);
        this.camera.position.copy(this.position);

        this.human = new Human(this.scene, this.position, this.radius, this.height);

        this.isOneTogglePressed = false;
        this.isTwoTogglePressed = false;

        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);
        document.addEventListener('mousedown', this.onMouseDown.bind(this), false);

        this.controls.addEventListener('lock', () => {
            this.isFirstPerson = true;
        });
        this.controls.addEventListener('unlock', () => {
            this.isFirstPerson = false;
        });
    }

    onMouseDown(event) {
        if (event.button === 0 && this.human.isLaserGunEquipped && this.controls.isLocked && this.canShoot) {
            this.shootLaser();
            this.canShoot = false;
            this.laserCooldownTimer = this.laserCooldownDuration;
        }
    }

    shootLaser() {
        // Play laser shooting sound
        console.log('Attempting to play laser sound');
        this.audioManager.playSound('laser');

        // Laser origin from barrel tip
        const laserOrigin = new THREE.Vector3();
        this.human.laserGun.barrelTip.updateWorldMatrix(true, false);
        this.human.laserGun.barrelTip.getWorldPosition(laserOrigin);

        // Laser direction towards crosshair
        const laserDirection = new THREE.Vector3();
        this.camera.getWorldDirection(laserDirection);

        // Set up raycaster
        const raycaster = new THREE.Raycaster(laserOrigin, laserDirection);
        const objectsToIntersect = this.scene.children.filter(child => child !== this.human.mesh);
        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

        let laserEndPoint;
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            console.log('Raycast hit an object:', hitObject);

            // Check if a Martian was hit
            let hitMartian = null;
            let current = hitObject;
            while (current) {
                if (this.physics.creatures.some(creature => creature.mesh === current)) {
                    hitMartian = this.physics.creatures.find(creature => creature.mesh === current);
                    break;
                }
                current = current.parent;
            }

            if (hitMartian) {
                console.log('Hit a Martian:', hitMartian);
                hitMartian.takeDamage(this.laserDamageAmount);
                // Play Martian impact sound
                console.log('Attempting to play impact_martian sound');
                this.audioManager.playSound('impact_martian');
            } else {
                console.log('Hit something else, not a Martian.');
            }

            laserEndPoint = intersects[0].point;
        } else {
            console.log('No hits detected.');
            const maxRange = 100;
            laserEndPoint = laserOrigin.clone().add(laserDirection.clone().multiplyScalar(maxRange));
        }

        const length = laserOrigin.distanceTo(laserEndPoint);
        const innerRadius = 0.03;
        const outerRadius = 0.1;
        const innerColor = 0xff00ff;
        const outerColor = 0x330033;
        const segments = 16;

        // Inner laser beam
        const innerGeometry = new THREE.CylinderGeometry(innerRadius, innerRadius, length, segments);
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: innerColor,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        const innerLaserBeamMesh = new THREE.Mesh(innerGeometry, innerMaterial);

        // Outer laser beam (glow)
        const outerGeometry = new THREE.CylinderGeometry(outerRadius, outerRadius, length, segments);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: outerColor,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        const outerLaserBeamMesh = new THREE.Mesh(outerGeometry, outerMaterial);

        // Orient and position the beam
        const direction = new THREE.Vector3().subVectors(laserEndPoint, laserOrigin).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        const midPoint = new THREE.Vector3().lerpVectors(laserOrigin, laserEndPoint, 0.5);

        innerLaserBeamMesh.quaternion.copy(quat);
        innerLaserBeamMesh.position.copy(midPoint);
        outerLaserBeamMesh.quaternion.copy(quat);
        outerLaserBeamMesh.position.copy(midPoint);

        // Add to scene and manage lifecycle
        this.scene.add(innerLaserBeamMesh);
        this.scene.add(outerLaserBeamMesh);
        const currentTime = performance.now();
        this.activeLaserBeams.push({ mesh: innerLaserBeamMesh, despawnTime: currentTime + 100 });
        this.activeLaserBeams.push({ mesh: outerLaserBeamMesh, despawnTime: currentTime + 100 });
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'Tab':
                event.preventDefault();
                this.isFrontViewRequested = !this.isFrontViewRequested;
                if (this.isFrontViewRequested) {
                    this.previousCameraQuaternion.copy(this.camera.quaternion);
                    this.wasFirstPersonBeforeFrontView = this.isFirstPerson;
                    this.isFirstPerson = false;
                    this.controls.unlock();
                } else {
                    this.camera.quaternion.copy(this.previousCameraQuaternion);
                    this.isFirstPerson = this.wasFirstPersonBeforeFrontView;
                    if (this.isFirstPerson) {
                        this.controls.lock();
                    }
                }
                break;
            case 'ArrowUp':
            case 'KeyS':
                this.moveForward = true;
                this.controls.lock();
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                this.controls.lock();
                break;
            case 'ArrowDown':
            case 'KeyW':
                this.moveBackward = true;
                this.controls.lock();
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                this.controls.lock();
                break;
            case 'KeyE':
                this.moveUp = true;
                this.controls.lock();
                break;
            case 'KeyQ':
                this.moveDown = true;
                this.controls.lock();
                break;
            case 'Space':
                if (this.isFirstPerson && this.gravityEnabled) {
                    if (this.onGround || this.coyoteTimer > 0) {
                        this.velocity.y = 10;
                        this.onGround = false;
                        this.coyoteTimer = 0;
                    }
                    this.jumpBufferTimer = this.jumpBufferDuration;
                }
                break;
            case 'KeyV':
                this.gravityEnabled = !this.gravityEnabled;
                break;
            case 'Digit1':
                if (!this.isOneTogglePressed) {
                    this.isOneTogglePressed = true;
                    if (this.human.isSaberEquipped) {
                        this.human.unequipSaber();
                    } else {
                        this.human.equipSaber();
                    }
                    if (this.human.isSaberEquipped || this.human.isLaserGunEquipped) {
                        this.controls.lock();
                    }
                }
                break;
            case 'Digit2':
                if (!this.isTwoTogglePressed) {
                    this.isTwoTogglePressed = true;
                    if (this.human.isLaserGunEquipped) {
                        this.human.unequipLaserGun();
                    } else {
                        this.human.equipLaserGun();
                    }
                    if (this.human.isSaberEquipped || this.human.isLaserGunEquipped) {
                        this.controls.lock();
                    }
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyS':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyW':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
            case 'KeyE':
                this.moveUp = false;
                break;
            case 'KeyQ':
                this.moveDown = false;
                break;
        }

        if (event.code === 'Digit1') {
            this.isOneTogglePressed = false;
        }
        if (event.code === 'Digit2') {
            this.isTwoTogglePressed = false;
        }
    }

    applyInputs(dt) {
        const speed = 5;

        if (this.isFrontViewRequested) {
            let dx = 0, dz = 0;
            if (this.moveLeft) dx -= -1;
            if (this.moveRight) dx += -1;
            if (this.moveBackward) dz += 1;
            if (this.moveForward) dz -= 1;

            const localVelocity = new THREE.Vector3(dx * speed, 0, dz * speed);
            const worldVelocity = localVelocity.clone().applyQuaternion(this.human.mesh.quaternion);
            this.velocity.x = worldVelocity.x;
            this.velocity.z = worldVelocity.z;
        } else {
            let dx = 0, dz = 0;
            if (this.moveLeft) dx -= 1;
            if (this.moveRight) dx += 1;
            if (this.moveForward) dz += 1;
            if (this.moveBackward) dz -= 1;

            const localVelocity = new THREE.Vector3(dx * speed, 0, dz * speed);
            const worldVelocity = localVelocity.clone().applyQuaternion(this.camera.quaternion);
            this.velocity.x = worldVelocity.x;
            this.velocity.z = worldVelocity.z;

            const cameraEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
            const yaw = cameraEuler.y;
            const pitch = cameraEuler.x;
            this.human.updateRotation(yaw, pitch, this.isFirstPerson);
        }

        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        if (!this.gravityEnabled) {
            if (this.moveUp) this.velocity.y = speed;
            else if (this.moveDown) this.velocity.y = -speed;
            else this.velocity.y = 0;
        }
        this.position.y += this.velocity.y * dt;

        // Update laser cooldown
        if (this.laserCooldownTimer > 0) {
            this.laserCooldownTimer -= dt;
            if (this.laserCooldownTimer <= 0) {
                this.canShoot = true;
            }
        }
    }
}