// src/PlayerPhysicsProcessor.js
import * as THREE from 'three';

/**
 * Calculates the change in player velocity based on gravity and input for a single timestep.
 * This is a pure function - it does not modify the player state directly.
 *
 * @param {THREE.Vector3} currentVelocity - The player's velocity *before* this step.
 * @param {object} inputState - The state from PlayerInputHandler (forward, backward, etc.).
 * @param {THREE.Quaternion} cameraQuaternion - Current camera orientation for direction calculation.
 * @param {boolean} controlsLocked - Whether PointerLockControls are active.
 * @param {THREE.Quaternion} modelQuaternion - Player model's orientation (no longer used here).
 * @param {boolean} gravityEnabled - Whether gravity should be applied.
 * @param {THREE.Vector3} gravityVector - The scene's gravity vector.
 * @param {number} timeStep - The duration of the physics substep.
 * @returns {THREE.Vector3} - The calculated *change* in velocity (deltaVelocity) for this timestep.
 */
export function calculatePlayerPhysicsUpdate(
    currentVelocity,
    inputState,
    cameraQuaternion,
    controlsLocked,
    // isFrontView, // <<<--- REMOVED Parameter
    modelQuaternion, // Keep parameter for signature consistency, but not used
    gravityEnabled,
    gravityVector,
    timeStep
) {
    const speed = 5.0;
    const movementDirection = new THREE.Vector3();
    const deltaVelocity = new THREE.Vector3();

    // --- Calculate Movement Influence ---
    // Simplified: Only calculate direction if controls are locked
    if (controlsLocked) { // Removed front view check
        movementDirection.set(0, 0, 0);
        if (inputState.forward) movementDirection.z = -1;
        if (inputState.backward) movementDirection.z = 1;
        if (inputState.left) movementDirection.x = -1;
        if (inputState.right) movementDirection.x = 1;
        movementDirection.normalize();
        movementDirection.applyQuaternion(cameraQuaternion);
    // } else if (isFrontView) { // <<<--- REMOVED Block
    //      movementDirection.set(0, 0, 0);
    //      if (inputState.forward) movementDirection.z = -1;
    //      if (inputState.backward) movementDirection.z = 1;
    //      if (inputState.left) movementDirection.x = -1;
    //      if (inputState.right) movementDirection.x = 1;
    //      movementDirection.normalize();
    //      if (modelQuaternion) {
    //         movementDirection.applyQuaternion(modelQuaternion);
    //      }
    } else {
        movementDirection.set(0, 0, 0); // No movement if controls not locked
    }

    // Calculate the *target* horizontal velocity based on input
    const targetVelocityX = movementDirection.x * speed;
    const targetVelocityZ = movementDirection.z * speed;

    // Calculate the *change* needed to reach the target velocity
    deltaVelocity.x = targetVelocityX - currentVelocity.x;
    deltaVelocity.z = targetVelocityZ - currentVelocity.z;

    // --- Calculate Gravity Influence ---
    if (gravityEnabled) {
        deltaVelocity.addScaledVector(gravityVector, timeStep);
    } else {
        // Handle vertical movement for no-gravity mode
        let targetVelocityY = 0;
        if (inputState.up) targetVelocityY = speed;
        else if (inputState.down) targetVelocityY = -speed;
        deltaVelocity.y = targetVelocityY - currentVelocity.y;
    }

    return deltaVelocity;
}