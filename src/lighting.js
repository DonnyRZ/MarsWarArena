import * as THREE from 'three';

export class LightingSystem {
    constructor(scene) {
        this.scene = scene;
        this.timeOfDay = 0; // Ranges from 0 to 1 (full day)
        this.autoProgress = true; // Toggle for automatic time progression
        this.dayDuration = 6000; // 20 minutes in seconds

        // Define key frames for lighting phases
        this.keyFrames = [
            // Morning: Cool, fresh sunlight with slight yellow tone
            { time: 0.0, color: 0xfff8e1, intensity: 1.0, position: new THREE.Vector3(10, 5, 0), ambientIntensity: 0.4 },
            // Noon: Bright white light, high intensity
            { time: 0.25, color: 0xffffff, intensity: 1.5, position: new THREE.Vector3(0, 20, 0), ambientIntensity: 0.5 },
            // Sunset: Warm, golden-orange light, brief phase
            { time: 0.5, color: 0xffd699, intensity: 1.2, position: new THREE.Vector3(-10, 5, 0), ambientIntensity: 0.3 },
            // Night: Cool, dim moonlight with bluish tone
            { time: 0.525, color: 0xb0c4de, intensity: 0.3, position: new THREE.Vector3(0, 5, 0), ambientIntensity: 0.1 },
            // Morning (cycle end): Same as time 0.0
            { time: 1.0, color: 0xfff8e1, intensity: 1.0, position: new THREE.Vector3(10, 5, 0), ambientIntensity: 0.4 }
        ];

        this.setupLights();
        this.setupFog();
        this.setupSkybox();
        this.update(0); // Initialize with starting properties
    }

    setupLights() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(this.ambientLight);

        // Directional light (sun/moon)
        this.directionalLight = new THREE.DirectionalLight(0xfff8e1, 1.0); // Initial color set to morning
        this.directionalLight.position.set(10, 5, 0); // Initial position (morning)
        this.directionalLight.castShadow = true;

        // Configure shadow camera
        this.directionalLight.shadow.camera.left = -50;
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 100;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;

        this.scene.add(this.directionalLight);
    }

    setupFog() {
        this.scene.fog = new THREE.FogExp2(0xffccaa, 0.01);
    }

    setupSkybox() {
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0xffccaa,
            side: THREE.BackSide
        });
        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);
    }

    interpolateProperties(timeOfDay) {
        for (let i = 0; i < this.keyFrames.length - 1; i++) {
            const kf0 = this.keyFrames[i];
            const kf1 = this.keyFrames[i + 1];
            if (timeOfDay >= kf0.time && timeOfDay <= kf1.time) {
                const t = (timeOfDay - kf0.time) / (kf1.time - kf0.time);
                const color = new THREE.Color().lerpColors(new THREE.Color(kf0.color), new THREE.Color(kf1.color), t);
                const intensity = THREE.MathUtils.lerp(kf0.intensity, kf1.intensity, t);
                const position = new THREE.Vector3().lerpVectors(kf0.position, kf1.position, t);
                const ambientIntensity = THREE.MathUtils.lerp(kf0.ambientIntensity, kf1.ambientIntensity, t);
                return { color, intensity, position, ambientIntensity };
            }
        }
        // Handle edge case (timeOfDay = 1.0)
        return {
            color: new THREE.Color(this.keyFrames[0].color),
            intensity: this.keyFrames[0].intensity,
            position: this.keyFrames[0].position.clone(),
            ambientIntensity: this.keyFrames[0].ambientIntensity
        };
    }

    update(deltaTime) {
        if (this.autoProgress) {
            this.timeOfDay = (this.timeOfDay + deltaTime / this.dayDuration) % 1;
        }
        const props = this.interpolateProperties(this.timeOfDay);
        this.directionalLight.color.set(props.color);
        this.directionalLight.intensity = props.intensity;
        this.directionalLight.position.copy(props.position);
        this.ambientLight.intensity = props.ambientIntensity;
        this.skybox.material.color.set(props.color);
        this.scene.fog.color.set(props.color);
    }
}