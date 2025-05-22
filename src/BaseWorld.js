// src/BaseWorld.js
import * as THREE from 'three';
import { BLOCK_TEXTURES, MarsHelpers } from './blocks.js'; // Assuming MarsHelpers might be useful later

// Base class/module for common world functionality
export class BaseWorld {
    constructor(scene) {
        if (!scene) {
            throw new Error("BaseWorld constructor requires a scene object.");
        }
        this.scene = scene;
        this.params = {}; // Specific parameters will be set by subclasses
        this.data = [];
        this.instancedMeshes = [];
        this.blockGeometries = {}; // Geometries for block types
        this.atlasTexture = null; // Texture atlas
        this.textureIndexMap = {}; // Map texture names to atlas indices
        this.worldCenterOffset = 0; // Calculated based on width
    }

    // Basic bounds check
    inBounds(x, y, z) {
        // Check against subclass parameters
        return x >= 0 && x < this.params.width &&
               y >= 0 && y < this.params.height &&
               z >= 0 && z < this.params.width; // Assuming width === depth
    }

    // Get block data at coordinates
    getBlock(x, y, z) {
        if (!this.inBounds(x, y, z)) return null;
        // Handle potential out-of-bounds y access carefully if height changes
        if (y < 0 || y >= this.params.height) return { id: 'air', instanceId: null }; // Treat outside Y range as air
        // Need to ensure data structure matches expected indices
        try {
           return this.data[x][y][z];
        } catch (e) {
            // console.warn(`Error accessing block data at ${x}, ${y}, ${z}`, e);
             return { id: 'air', instanceId: null }; // Fallback
        }
    }


    // Set block ID at coordinates
    setBlockId(x, y, z, id) {
        if (!this.inBounds(x, y, z)) return;
         // Ensure y index is valid for the array
         if (y < 0 || y >= this.params.height) return;
        try {
            if (!this.data[x]) this.data[x] = [];
            if (!this.data[x][y]) this.data[x][y] = [];
             this.data[x][y][z] = { id: id, instanceId: null }; // Ensure object structure
        } catch (e) {
            console.error(`Error setting block ID at ${x}, ${y}, ${z}`, e);
        }
    }

    // Check if a block is surrounded by non-air blocks
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
            const block = this.getBlock(nx, ny, nz);
            // If neighbor is out of bounds (null) or is air, then current block is not obscured
            if (!block || block.id === 'air') {
                return false;
            }
        }
        return true;
    }

    // Initialize the 3D data array with air
    initializeData() {
        this.data = [];
        const { width, height } = this.params;
        this.worldCenterOffset = (width - 1) / 2; // Calculate center offset

        for (let x = 0; x < width; x++) {
            const xSlice = [];
            for (let y = 0; y < height; y++) {
                const zRow = new Array(width); // Use width for z dimension
                for (let z = 0; z < width; z++) {
                    zRow[z] = { id: 'air', instanceId: null };
                }
                xSlice.push(zRow);
            }
            this.data.push(xSlice);
        }
    }

    // --- Texture Atlas and Geometry Setup ---

    async loadTextures(requiredTextureNames) {
         const textureLoader = new THREE.TextureLoader();
         textureLoader.setPath('textures/'); // Set base path

         const textures = await Promise.all(
             Array.from(requiredTextureNames).map(name => textureLoader.loadAsync(name))
         );

         const canvas = document.createElement('canvas');
         const size = 256; // Assuming texture size
         const numTextures = textures.length;
         canvas.width = size * numTextures;
         canvas.height = size;
         const ctx = canvas.getContext('2d');
         textures.forEach((tex, index) => {
            if (tex.image) {
                 ctx.drawImage(tex.image, index * size, 0, size, size);
            } else {
                console.warn(`Texture image not loaded for index ${index}`);
                // Optionally draw a placeholder color/pattern
                ctx.fillStyle = `hsl(${index * 60}, 100%, 50%)`;
                ctx.fillRect(index * size, 0, size, size);
            }
         });

         this.atlasTexture = new THREE.CanvasTexture(canvas);
         this.atlasTexture.magFilter = THREE.NearestFilter;
         this.atlasTexture.minFilter = THREE.NearestFilter;
         this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
         this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
         this.atlasTexture.colorSpace = THREE.SRGBColorSpace;

         this.textureIndexMap = {};
         let index = 0;
         for (const name of requiredTextureNames) {
             this.textureIndexMap[name] = index++;
         }
    }

    // Pre-build geometries with correct UVs for known block types
    // Takes MARS_BLOCKS enum as argument
    buildBlockGeometries(blocksEnum) {
        this.blockGeometries = {};
        const numTextures = Object.keys(this.textureIndexMap).length;
        if (numTextures === 0) {
            console.warn("Texture atlas not loaded before building block geometries.");
            return;
        }

        for (const blockKey in blocksEnum) {
            const blockName = blockKey.toLowerCase(); // Convert key like 'SURFACE' to 'surface'
             const blockInfo = BLOCK_TEXTURES[blockName];

             if (!blockInfo || !blockInfo.all) {
                console.warn(`Texture info for block "${blockName}" not found or missing 'all' property.`);
                continue; // Skip blocks without texture info
             }

            const textureName = blockInfo.all;
            const textureIndex = this.textureIndexMap[textureName];

            if (textureIndex === undefined) {
                console.warn(`Texture "${textureName}" for block "${blockName}" not found in atlas map.`);
                continue; // Skip if texture isn't in the atlas
            }

            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const uvAttribute = geometry.attributes.uv;
            const numFaces = 6;
            const atlasWidth = numTextures; // Number of textures horizontally

            for (let face = 0; face < numFaces; face++) {
                const offset = textureIndex / atlasWidth; // Horizontal offset in the atlas
                for (let i = face * 4; i < (face + 1) * 4; i++) {
                    const u = uvAttribute.getX(i);
                    const v = uvAttribute.getY(i);
                    // Map UV to the correct tile in the atlas
                    uvAttribute.setXY(i, (u / atlasWidth) + offset, v);
                }
            }
             geometry.computeVertexNormals(); // Important for lighting
             this.blockGeometries[blockName] = geometry; // Store using lowercase name key
        }
    }


    // --- Mesh Generation ---

    // Generate InstancedMeshes based on world data
    generateMeshes() {
        this.disposeMeshes(); // Clear existing meshes first

        const materials = {};
        // Create one material using the atlas
        const sharedMaterial = new THREE.MeshStandardMaterial({
            map: this.atlasTexture,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.FrontSide // Render only front faces (potential optimization)
        });

        const blockPositions = {}; // Group positions by block ID

        for (let x = 0; x < this.params.width; x++) {
            for (let y = 0; y < this.params.height; y++) {
                for (let z = 0; z < this.params.width; z++) {
                    const block = this.getBlock(x, y, z);
                    if (block && block.id !== 'air' && !this.isBlockObscured(x, y, z)) {
                        if (!blockPositions[block.id]) {
                            blockPositions[block.id] = [];
                        }
                        blockPositions[block.id].push({ x, y, z });
                    }
                }
            }
        }

        const matrix = new THREE.Matrix4();
        for (const blockId in blockPositions) {
            const positions = blockPositions[blockId];
            if (positions.length === 0) continue;

            const geometry = this.blockGeometries[blockId];
            if (!geometry) {
                console.warn(`Geometry not found for block ID: ${blockId}. Skipping mesh creation.`);
                continue; // Skip if no geometry exists for this block
            }

            const count = positions.length;
            const mesh = new THREE.InstancedMesh(geometry, sharedMaterial, count);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.name = `world_blocks_${blockId}`; // Helpful for debugging

            positions.forEach((pos, index) => {
                const { x, y, z } = pos;
                // Position blocks based on their bottom-corner, centered world coordinates
                matrix.setPosition(
                    x - this.worldCenterOffset, // Centered X
                    y,                         // Y origin is bottom of block
                    z - this.worldCenterOffset  // Centered Z
                );
                mesh.setMatrixAt(index, matrix);

                // Store instanceId back into data (optional, might be useful)
                // if(this.data[x] && this.data[x][y] && this.data[x][y][z]) {
                //    this.data[x][y][z].instanceId = index;
                // }
            });
            mesh.instanceMatrix.needsUpdate = true;

            this.scene.add(mesh);
            this.instancedMeshes.push(mesh);
        }
         console.log(`Generated ${this.instancedMeshes.length} instanced mesh groups.`);
    }

    // Dispose of old meshes
    disposeMeshes() {
        this.instancedMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            // Dispose material only if it's unique per mesh, otherwise handle externally
        });
         // If using a single shared material, dispose it when the world is truly destroyed
         // if (this.sharedMaterial) { this.sharedMaterial.dispose(); this.sharedMaterial = null; }
        this.instancedMeshes = [];
    }

     // Placeholder for terrain generation - subclasses MUST override this
     generateTerrain(rng) {
         throw new Error("generateTerrain() must be implemented by subclass.");
     }

     // Placeholder for structure placement - subclasses can override
     placeStructures() {
         // Default implementation does nothing
     }

    // Main generation function to be called by subclasses or externally
     async generate(blocksEnum) {
         console.log(`Generating world with params:`, this.params);
         this.initializeData(); // Sets up this.data based on this.params

         // --- Determine required textures ---
         const requiredTextureNames = new Set();
         for (const blockKey in blocksEnum) {
             const blockName = blockKey.toLowerCase();
             const textures = BLOCK_TEXTURES[blockName];
             if (textures?.all) {
                 requiredTextureNames.add(textures.all);
             }
         }
         console.log("Required textures:", requiredTextureNames);

         // --- Load textures and build atlas ---
         await this.loadTextures(requiredTextureNames);
         console.log("Texture atlas created.");

         // --- Build geometries using the atlas info ---
         this.buildBlockGeometries(blocksEnum);
         console.log("Block geometries built.");

         // --- Generate terrain (specific to subclass) ---
         this.generateTerrain(); // Assuming subclass implements this
         console.log("Terrain data generated.");

         // --- Place structures (specific to subclass, optional) ---
         this.placeStructures();
         console.log("Structures placed (if any).");

         // --- Generate meshes ---
         this.generateMeshes();
         console.log("World meshes generated.");
     }
}