import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export default function createUI(world, lightingSystem) {
    const gui = new GUI();

    // World Dimensions
    const worldFolder = gui.addFolder('World Dimensions');
    worldFolder.add(world.params, 'width', 8, 256, 1)
        .name('Width').onChange(() => world.generate());
    worldFolder.add(world.params, 'height', 8, 64, 1)
        .name('Height').onChange(() => world.generate());
    worldFolder.open();

    // Terrain Settings
    const terrainFolder = gui.addFolder('Terrain Generation');
    terrainFolder.add(world.params.terrain, 'seed', 0, 10000, 1)
        .name('Seed').onChange(() => world.generate());
    terrainFolder.add({
        randomSeed: () => {
            world.params.terrain.seed = Math.floor(Math.random() * 10000);
            world.generate();
        }
    }, 'randomSeed').name('🎲 Random Seed');
    terrainFolder.add(world.params.terrain, 'scale', 1, 100)
        .name('Scale').onChange(() => world.generate());
    terrainFolder.add(world.params.terrain, 'magnitude', 0, 1)
        .name('Magnitude').onChange(() => world.generate());
    terrainFolder.add(world.params.terrain, 'offset', 0, 1)
        .name('Base Height').onChange(() => world.generate());
    terrainFolder.add(world.params.terrain, 'octaves', 1, 8, 1)
        .name('Octaves').onChange(() => world.generate());
    terrainFolder.add(world.params.terrain, 'persistence', 0.1, 0.9)
        .name('Roughness').onChange(() => world.generate());
    terrainFolder.open();

    // Lighting Settings
    const lightingFolder = gui.addFolder('Lighting');
    lightingFolder.add(lightingSystem, 'timeOfDay', 0, 1)
        .name('Time of Day')
        .listen(); // Updates slider when timeOfDay changes
    lightingFolder.add(lightingSystem, 'autoProgress')
        .name('Auto Progress');
    lightingFolder.open();

    // Performance Monitor
    const perfFolder = gui.addFolder('Performance');
    perfFolder.add({
        getVisibleBlocks: () => {
            return world.instancedMeshes.reduce((sum, mesh) => sum + mesh.count, 0);
        }
    }, 'getVisibleBlocks').name('Visible Blocks');
    perfFolder.open();

    return gui;
}