import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RNG } from './rng.js';
import { MARS_BLOCKS, MarsHelpers, BLOCK_TEXTURES } from './blocks.js';

class World {
    constructor(scene) {
        this.scene = scene;
        this.params = {
            width: 64,
            height: 5,
            terrain: {
                seed: 1337,
                scale: 25,
                magnitude: 0.9,
                offset: 0.2,
                octaves: 3,
                persistence: 0.3296
            }
        };

        /** @type {{ id: string, instanceId: number | null }[][][]} */
        this.data = [];
        this.instancedMeshes = [];
        this.blockGeometries = {};
        this.atlasTexture = null;

        this.generate();
    }

    inBounds(x, y, z) {
        return x >= 0 && x < this.params.width &&
               y >= 0 && y < this.params.height &&
               z >= 0 && z < this.params.width;
    }

    getBlock(x, y, z) {
        if (!this.inBounds(x, y, z)) return null;
        return this.data[x][y][z];
    }

    setBlockId(x, y, z, id) {
        if (!this.inBounds(x, y, z)) return;
        this.data[x][y][z].id = id;
    }

    isBlockObscured(x, y, z) {
        const directions = [
            [1, 0, 0], [-1, 0, 0],
            [0, 1, 0], [0, -1, 0],
            [0, 0, 1], [0, 0, -1]
        ];
        for (const [dx, dy, dz] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const nz = z + dz;
            if (!this.inBounds(nx, ny, nz) || this.data[nx][ny][nz].id === 'air') {
                return false;
            }
        }
        return true;
    }

    async generate() {
        const rng = new RNG(this.params.terrain.seed);

        const textureNames = new Set();
        for (const block in BLOCK_TEXTURES) {
            const textures = BLOCK_TEXTURES[block];
            if (textures.all) {
                textureNames.add(textures.all);
            }
        }

        const textureLoader = new THREE.TextureLoader();
        const textures = await Promise.all(
            Array.from(textureNames).map(name => textureLoader.loadAsync(`textures/${name}`))
        );

        const canvas = document.createElement('canvas');
        const size = 256;
        const numTextures = textures.length;
        canvas.width = size * numTextures;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        textures.forEach((tex, index) => {
            ctx.drawImage(tex.image, index * size, 0, size, size);
        });

        this.atlasTexture = new THREE.CanvasTexture(canvas);
        this.atlasTexture.magFilter = THREE.NearestFilter;
        this.atlasTexture.minFilter = THREE.NearestFilter;
        this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
        this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.atlasTexture.colorSpace = THREE.SRGBColorSpace;

        const textureIndexMap = {};
        let index = 0;
        for (const name of textureNames) {
            textureIndexMap[name] = index++;
        }

        for (const blockId in MARS_BLOCKS) {
            const textures = BLOCK_TEXTURES[blockId];
            if (!textures) continue;

            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const uvAttribute = geometry.attributes.uv;

            const idx = textureIndexMap[textures.all];
            const faceIndices = [idx, idx, idx, idx, idx, idx];

            const numFaces = 6;
            const atlasWidth = numTextures;
            for (let face = 0; face < numFaces; face++) {
                const idx = faceIndices[face];
                const offset = idx / atlasWidth;
                for (let i = face * 4; i < (face + 1) * 4; i++) {
                    const u = uvAttribute.getX(i);
                    const v = uvAttribute.getY(i);
                    uvAttribute.setXY(i, (u / atlasWidth) + offset, v);
                }
            }

            this.blockGeometries[blockId] = geometry;
        }

        this.initializeData();
        this.generateTerrain(rng);
        this.generateMeshes();
    }

    initializeData() {
        this.data = [];
        const { width, height } = this.params;
        for (let x = 0; x < width; x++) {
            const xSlice = [];
            for (let y = 0; y < height; y++) {
                const zRow = [];
                for (let z = 0; z < width; z++) {
                    zRow.push({ id: 'air', instanceId: null });
                }
                xSlice.push(zRow);
            }
            this.data.push(xSlice);
        }
    }

    generateTerrain(rng) {
        const simplexTerrain = new SimplexNoise({ random: () => rng.random() });
        const { width, height, terrain } = this.params;

        for (let x = 0; x < width; x++) {
            for (let z = 0; z < width; z++) {
                let noiseValue = 0;
                let amplitude = 1;
                let frequency = 1;
                for (let o = 0; o < terrain.octaves; o++) {
                    const nx = (x / terrain.scale) * frequency;
                    const nz = (z / terrain.scale) * frequency;
                    noiseValue += simplexTerrain.noise(nx, nz) * amplitude;
                    amplitude *= terrain.persistence;
                    frequency *= 2;
                }
                const scaledNoise = terrain.offset + noiseValue * terrain.magnitude;
                let yHeight = Math.floor(height * scaledNoise);
                yHeight = THREE.MathUtils.clamp(yHeight, 0, height - 1);

                for (let y = 0; y < yHeight; y++) {
                    this.setBlockId(x, y, z, 'deep_soil');
                }
                this.setBlockId(x, yHeight, z, 'surface');
            }
        }
    }

    generateMeshes() {
        if (this.instancedMeshes) {
            this.instancedMeshes.forEach(mesh => this.scene.remove(mesh));
        }
        this.instancedMeshes = [];

        const materials = {};
        for (const blockId in MARS_BLOCKS) {
            const material = new THREE.MeshStandardMaterial({
                map: this.atlasTexture,
                roughness: 0.8,
                metalness: 0.1
            });
            materials[blockId] = material;
        }

        const blockPositions = {};
        this.data.forEach((xSlice, x) => {
            xSlice.forEach((yRow, y) => {
                yRow.forEach((block, z) => {
                    if (block.id !== 'air' && !this.isBlockObscured(x, y, z)) {
                        if (!blockPositions[block.id]) {
                            blockPositions[block.id] = [];
                        }
                        blockPositions[block.id].push({ x, y, z });
                    }
                });
            });
        });

        const center = (this.params.width - 1) / 2;
        for (const blockId in blockPositions) {
            const positions = blockPositions[blockId];
            const count = positions.length;
            const geometry = this.blockGeometries[blockId] || new THREE.BoxGeometry(1, 1, 1);
            const material = materials[blockId];
            const mesh = new THREE.InstancedMesh(geometry, material, count);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const matrix = new THREE.Matrix4();
            positions.forEach((pos, index) => {
                const { x, y, z } = pos;
                matrix.setPosition(x - center + 0.5, y + 0.5, z - center + 0.5);
                mesh.setMatrixAt(index, matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            this.scene.add(mesh);
            this.instancedMeshes.push(mesh);
        }
    }
}

export default World;