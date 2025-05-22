// src/Fireball.js
import * as THREE from 'three';

export class Fireball {
    constructor(scene, startPosition, direction, speed, damage, lifetime, owner) {
        this.scene = scene;
        this.speed = speed;
        this.damage = damage;
        this.lifetimeTimer = lifetime;
        this.owner = owner; // Reference to the Ghast that fired it
        this.toBeRemoved = false;

        // --- Geometry & Material ---
        const radius = 0.5; // Size of the fireball
        const segments = 8;
        const geometry = new THREE.SphereGeometry(radius, segments, segments);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff4500, // Orange-red
            emissive: 0xcc2200, // Glowing effect
            emissiveIntensity: 1.5,
            roughness: 0.6,
            metalness: 0.1,
        });

        // --- Mesh ---
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
        this.mesh.castShadow = true; // Optional: Fireballs casting shadows
        this.mesh.name = "GhastFireball";
        this.scene.add(this.mesh);

        // --- Velocity ---
        this.velocity = direction.clone().normalize().multiplyScalar(this.speed);
    }

    update(deltaTime) {
        // Move the fireball
        console.log(`Fireball lifetime check: Timer=${this.lifetimeTimer.toFixed(2)}, Delta=${deltaTime.toFixed(4)}`);
        this.mesh.position.addScaledVector(this.velocity, deltaTime);

        // Update lifetime
        this.lifetimeTimer -= deltaTime;
        if (this.lifetimeTimer <= 0) {
            console.log("!!! Fireball lifetime expired!"); // See if this logs immediately
            this.toBeRemoved = true;
        }
    }

    // Call this when the fireball should be removed from the game
    destroy() {
        if (this.mesh.parent) {
            this.scene.remove(this.mesh);
        }
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            // Check if material is an array (though unlikely for simple sphere)
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else {
                this.mesh.material.dispose();
            }
        }
        // console.log("Fireball destroyed"); // Optional debug log
    }
}