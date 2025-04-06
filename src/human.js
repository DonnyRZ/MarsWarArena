import * as THREE from 'three';
import { Saber, LaserGun } from './inventory.js';

export class Human {
    constructor(scene, position, radius, height) {
        this.scene = scene;
        this.radius = radius;
        this.height = height;

        const headWidth = this.radius * 0.8;
        const headHeight = this.radius * 0.8;
        const headDepth = this.radius * 0.8;
        const bodyWidth = this.radius * 1.2;
        const bodyHeight = this.height * 0.4;
        const bodyDepth = this.radius * 0.8;
        const armWidth = this.radius * 0.3;
        const armHeight = this.height * 0.4;
        const armDepth = this.radius * 0.3;
        const legWidth = this.radius * 0.4;
        const legHeight = this.height * 0.4;
        const legDepth = this.radius * 0.4;
        const handHeight = armHeight * 0.2;
        const footHeight = legHeight * 0.2;
        const tankWidth = bodyWidth * 0.3;
        const tankHeight = bodyHeight * 0.4;
        const tankDepth = bodyDepth * 0.5;

        const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const subtleGrayMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const visorMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            transparent: true,
            opacity: 0.5
        });

        this.head = new THREE.Mesh(new THREE.BoxGeometry(headWidth, headHeight, headDepth), whiteMaterial);
        this.head.position.set(0, bodyHeight / 2 + headHeight / 2, 0);

        this.visor = new THREE.Mesh(
            new THREE.BoxGeometry(headWidth * 0.8, headHeight * 0.6, 0.1),
            visorMaterial
        );
        this.visor.position.set(0, bodyHeight / 2 + headHeight / 2, headDepth / 2 + 0.05);

        this.body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth), whiteMaterial);
        this.body.position.set(0, 0, 0);

        this.leftSeam = new THREE.Mesh(new THREE.BoxGeometry(0.05, bodyHeight, 0.05), subtleGrayMaterial);
        this.leftSeam.position.set(-bodyWidth / 2, 0, 0);
        this.rightSeam = new THREE.Mesh(new THREE.BoxGeometry(0.05, bodyHeight, 0.05), subtleGrayMaterial);
        this.rightSeam.position.set(bodyWidth / 2, 0, 0);

        this.oxygenTank = new THREE.Mesh(
            new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth),
            whiteMaterial
        );
        this.oxygenTank.position.set(0, bodyHeight / 4, -bodyDepth / 2 - tankDepth / 2);

        this.upperLeftArm = new THREE.Mesh(
            new THREE.BoxGeometry(armWidth, armHeight - handHeight, armDepth),
            whiteMaterial
        );
        this.leftHand = new THREE.Mesh(
            new THREE.BoxGeometry(armWidth, handHeight, armDepth),
            blackMaterial
        );

        const upperArmHeight = armHeight - handHeight;
        this.leftArmGroup = new THREE.Group();
        this.leftArmGroup.position.set(-bodyWidth / 2, bodyHeight / 2, 0);
        this.upperLeftArm.position.set(-armWidth / 2, -upperArmHeight / 2, 0);
        this.leftHand.position.set(-armWidth / 2, -upperArmHeight - handHeight / 2, 0);
        this.leftArmGroup.add(this.upperLeftArm, this.leftHand);

        this.upperRightArm = new THREE.Mesh(
            new THREE.BoxGeometry(armWidth, armHeight - handHeight, armDepth),
            whiteMaterial
        );
        this.rightHand = new THREE.Mesh(
            new THREE.BoxGeometry(armWidth, handHeight, armDepth),
            blackMaterial
        );

        this.rightArmGroup = new THREE.Group();
        this.rightArmGroup.position.set(bodyWidth / 2, bodyHeight / 2, 0);
        this.upperRightArm.position.set(armWidth / 2, -upperArmHeight / 2, 0);
        this.rightHand.position.set(armWidth / 2, -upperArmHeight - handHeight / 2, 0);
        this.rightArmGroup.add(this.upperRightArm, this.rightHand);

        this.upperLeftLeg = new THREE.Mesh(
            new THREE.BoxGeometry(legWidth, legHeight - footHeight, legDepth),
            whiteMaterial
        );
        this.upperLeftLeg.position.set(-bodyWidth / 4, -bodyHeight / 2 - (legHeight - footHeight) / 2, 0);
        this.leftFoot = new THREE.Mesh(
            new THREE.BoxGeometry(legWidth, footHeight, legDepth),
            blackMaterial
        );
        this.leftFoot.position.set(-bodyWidth / 4, -bodyHeight / 2 - (legHeight - footHeight) - footHeight / 2, 0);

        this.upperRightLeg = new THREE.Mesh(
            new THREE.BoxGeometry(legWidth, legHeight - footHeight, legDepth),
            whiteMaterial
        );
        this.upperRightLeg.position.set(bodyWidth / 4, -bodyHeight / 2 - (legHeight - footHeight) / 2, 0);
        this.rightFoot = new THREE.Mesh(
            new THREE.BoxGeometry(legWidth, footHeight, legDepth),
            blackMaterial
        );
        this.rightFoot.position.set(bodyWidth / 4, -bodyHeight / 2 - (legHeight - footHeight) - footHeight / 2, 0);

        this.saber = new Saber();
        this.saber.mesh.position.set(0, -0.1, 0.2);
        this.saber.mesh.rotation.set(-Math.PI, 0, 0);
        this.saber.mesh.scale.set(0.25, 0.25, 0.25);
        this.isSaberEquipped = false;

        this.laserGun = new LaserGun();
        this.laserGun.mesh.position.set(0, -0.1, 0.2);
        this.laserGun.mesh.rotation.set(Math.PI / 2, 0, 0);
        this.laserGun.mesh.scale.set(0.1, 0.1, 0.1);
        this.isLaserGunEquipped = false;

        this.mesh = new THREE.Group();
        this.mesh.add(
            this.head, this.visor,
            this.body, this.leftSeam, this.rightSeam,
            this.oxygenTank,
            this.leftArmGroup,
            this.rightArmGroup,
            this.upperLeftLeg, this.leftFoot,
            this.upperRightLeg, this.rightFoot
        );
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
    }

    equipSaber() {
        if (!this.isSaberEquipped) {
            // Unequip laser gun if equipped
            if (this.isLaserGunEquipped) {
                this.unequipLaserGun();
            }
            // Add saber to left hand
            this.leftHand.add(this.saber.mesh);
            this.isSaberEquipped = true;
        }
    }

    unequipSaber() {
        if (this.isSaberEquipped) {
            // Remove saber from left hand
            this.leftHand.remove(this.saber.mesh);
            this.isSaberEquipped = false;
        }
    }

    equipLaserGun() {
        if (!this.isLaserGunEquipped) {
            // Unequip saber if equipped
            if (this.isSaberEquipped) {
                this.unequipSaber();
            }
            // Add laser gun to left hand
            this.leftHand.add(this.laserGun.mesh);
            this.isLaserGunEquipped = true;
        }
    }

    unequipLaserGun() {
        if (this.isLaserGunEquipped) {
            // Remove laser gun from left hand
            this.leftHand.remove(this.laserGun.mesh);
            this.isLaserGunEquipped = false;
        }
    }

    updatePosition(newPosition) {
        this.mesh.position.copy(newPosition);
    }

    updateRotation(yaw, pitch, applyPitch) {
        // Rotate the entire player model based on yaw
        this.mesh.rotation.set(0, yaw + Math.PI, 0);
        // Adjust the left arm rotation based on pitch only if a weapon is equipped and in first-person view
        if (this.isSaberEquipped || this.isLaserGunEquipped) {
            if (applyPitch) {
                this.leftArmGroup.rotation.x = -Math.PI / 2 - pitch;
            } else {
                this.leftArmGroup.rotation.x = -Math.PI / 2;
            }
        } else {
            this.leftArmGroup.rotation.x = 0;
        }
    }
}