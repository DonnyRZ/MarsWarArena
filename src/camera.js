// src/camera.js
// DEBUG: Added logging for first-person position calculation

import * as THREE from 'three';

export class POV {
    constructor(camera) {
        this.camera = camera;
    }

    update(cameraInfo, crosshair) {
        // Destructure needed info, mode will now only be 'firstPerson' or 'thirdPerson'
        const { mode, targetPosition, modelOrientation, firstPersonEyeOffset } = cameraInfo;

        // Basic validation of input
        if (!targetPosition || !modelOrientation) {
            console.error("POV.update received invalid cameraInfo:", cameraInfo);
            return; // Avoid errors if data is missing
        }


        // --- Camera Positioning based on mode ---
        if (mode === 'firstPerson') {
            const finalCamPos = targetPosition.clone(); // Start with player visual position
            finalCamPos.y += firstPersonEyeOffset; // Add eye offset
            this.camera.position.copy(finalCamPos);

            // --- ADD LOGGING ---
            console.log(`POV Update: Mode=firstPerson, TargetPos=(${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}), EyeOffset=${firstPersonEyeOffset.toFixed(2)}, FinalCamPos=(${finalCamPos.x.toFixed(2)}, ${finalCamPos.y.toFixed(2)}, ${finalCamPos.z.toFixed(2)})`);
            // --- END LOGGING ---

            // Orientation handled by PointerLockControls
            if (crosshair) crosshair.classList.remove('hidden');

        } else { // mode === 'thirdPerson' (Default if not firstPerson)
            const offset = new THREE.Vector3(0, 0.5, -2);
            // Ensure modelOrientation is a valid Quaternion before applying
             if (modelOrientation instanceof THREE.Quaternion) {
                 offset.applyQuaternion(modelOrientation);
             } else {
                 console.warn("POV Update: Invalid modelOrientation received for thirdPerson offset calculation.");
             }
            const cameraPosition = targetPosition.clone().add(offset);
            this.camera.position.copy(cameraPosition);
            // console.log(`POV Update: Mode=thirdPerson, FinalCamPos=(${cameraPosition.x.toFixed(2)}, ${cameraPosition.y.toFixed(2)}, ${cameraPosition.z.toFixed(2)})`); // Optional log

            // Orientation handled by PointerLockControls when locked
            if (crosshair) crosshair.classList.add('hidden');
        }
        // Model visibility is handled by Player.updateModelVisibility()
    }
}