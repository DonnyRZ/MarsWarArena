import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Human } from './human.js';

export class Player {
    constructor(camera, domElement, scene) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        this.position = new THREE.Vector3(0, 20, 0);
        this.visualPosition = this.position.clone();
        this.velocity = new THREE.Vector3();
        this.height = 1.75;
        this.radius = 0.5;
        this.cylinderRadius = 0.475;
        this.cylinderHeight = 2.35;
        this.gravityEnabled = false;
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

        this.controls = new PointerLockControls(this.camera, this.domElement);
        this.camera.position.copy(this.position);

        this.human = new Human(this.scene, this.position, this.radius, this.height);

        this.isOneTogglePressed = false;
        this.isTwoTogglePressed = false;

        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);

        this.controls.addEventListener('lock', () => {
            this.isFirstPerson = true;
        });
        this.controls.addEventListener('unlock', () => {
            this.isFirstPerson = false;
        });
    }

    onKeyDown(event) {
        switch (event.code) {
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
                if (this.isFirstPerson && this.gravityEnabled && this.onGround) {
                    this.velocity.y = 10;
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
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(direction, new THREE.Vector3(0, 1, 0));

        let dx = 0, dz = 0;
        if (this.moveForward) dz += 1;
        if (this.moveBackward) dz -= 1;
        if (this.moveLeft) dx -= 1;
        if (this.moveRight) dx += 1;

        this.velocity.x = dx * speed;
        this.velocity.z = dz * speed;

        const horizontalVelocity = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
        horizontalVelocity.applyQuaternion(this.camera.quaternion);
        this.position.addScaledVector(horizontalVelocity, dt);

        if (!this.gravityEnabled) {
            if (this.moveUp) this.velocity.y = speed;
            else if (this.moveDown) this.velocity.y = -speed;
            else this.velocity.y = 0;
        }
        this.position.y += this.velocity.y * dt;

        const cameraEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        const yaw = cameraEuler.y;
        this.human.updateRotation(yaw);
    }
}