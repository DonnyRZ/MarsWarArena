import * as THREE from 'three';

export class POV {
    constructor(camera, player, crosshair) {
        this.camera = camera;
        this.player = player;
        this.crosshair = crosshair;
        this.previousWeaponEquipped = false;
    }

    update() {
        const weaponEquipped = this.player.human.isSaberEquipped || this.player.human.isLaserGunEquipped;

        if (this.player.isFrontViewRequested) {
            // Front view
            const offset = new THREE.Vector3(0, 0.5, 2); // Position in front of player
            const playerQuaternion = this.player.human.mesh.quaternion;
            const cameraPosition = this.player.visualPosition.clone().add(offset.applyQuaternion(playerQuaternion));
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(this.player.visualPosition); // Look at player

            // Make player model visible
            this.player.human.head.visible = true;
            this.player.human.visor.visible = true;
            this.player.human.body.visible = true;
            this.player.human.leftSeam.visible = true;
            this.player.human.rightSeam.visible = true;
            this.player.human.oxygenTank.visible = true;
            this.player.human.upperLeftLeg.visible = true;
            this.player.human.leftFoot.visible = true;
            this.player.human.upperRightLeg.visible = true;
            this.player.human.rightFoot.visible = true;

            // Hide crosshair
            if (this.crosshair) this.crosshair.classList.add('hidden');
        } else {
            // Existing logic for first-person or third-person view
            if (weaponEquipped) {
                if (!this.previousWeaponEquipped) {
                    this.player.human.head.visible = false;
                    this.player.human.visor.visible = false;
                    this.player.human.body.visible = false;
                    this.player.human.leftSeam.visible = false;
                    this.player.human.rightSeam.visible = false;
                    this.player.human.oxygenTank.visible = false;
                    this.player.human.upperLeftLeg.visible = false;
                    this.player.human.leftFoot.visible = false;
                    this.player.human.upperRightLeg.visible = false;
                    this.player.human.rightFoot.visible = false;
                    if (this.crosshair) this.crosshair.classList.remove('hidden');
                }
                // Eye-Level View (First-Person)
                this.camera.position.copy(this.player.visualPosition);
                this.camera.position.y += this.player.height * 0.45;
            } else {
                if (this.previousWeaponEquipped) {
                    this.player.human.head.visible = true;
                    this.player.human.visor.visible = true;
                    this.player.human.body.visible = true;
                    this.player.human.leftSeam.visible = true;
                    this.player.human.rightSeam.visible = true;
                    this.player.human.oxygenTank.visible = true;
                    this.player.human.upperLeftLeg.visible = true;
                    this.player.human.leftFoot.visible = true;
                    this.player.human.upperRightLeg.visible = true;
                    this.player.human.rightFoot.visible = true;
                    if (this.crosshair) this.crosshair.classList.add('hidden');
                }
                // Behind-Player View (Third-Person)
                const offset = new THREE.Vector3(0, 0.5, -2);
                const playerQuaternion = this.player.human.mesh.quaternion;
                const cameraPosition = this.player.visualPosition.clone().add(offset.applyQuaternion(playerQuaternion));
                this.camera.position.copy(cameraPosition);
            }
            this.previousWeaponEquipped = weaponEquipped;
        }
    }
}