// src/blocks.js
// Added ROCKET_HULL, ROCKET_FIN, ROCKET_NOSE, ROCKET_TILE

import * as THREE from 'three';

// Define the block types with unique IDs
const MARS_BLOCKS = {
    AIR: 0,
    SURFACE: 1,
    DEEP_SOIL: 2,
    MARS_REGOLITH: 3,
    PORTAL_FRAME: 4,
    PORTAL_EFFECT: 5,
    BASE_WALL: 6,
    BASE_GLASS: 7,
    BASE_METAL_FLOOR: 8,
    BASE_PILLAR: 9,
    BASE_ROOFING: 10,
    ROCKET_HULL: 11,    // <<< NEW: Main body metallic shell
    ROCKET_FIN: 12,     // <<< NEW: Fins material (darker metal?)
    ROCKET_NOSE: 13,    // <<< NEW: Nose cone material (maybe same as fin?)
    ROCKET_TILE: 14     // <<< NEW: Heat shield tiles (dark, textured)
    // Add more base-specific blocks here later
};

// Texture mappings for each block type
// *** Add textures for iron_block.png, obsidian.png, black_concrete.png ***
const BLOCK_TEXTURES = {
    'surface': { all: 'red_sand.png' },
    'deep_soil': { all: 'basalt_side.png' },
    'mars_regolith': { all: 'prismarine_bricks.png' },
    'portal_frame': { all: 'obsidian.png' },
    'portal_effect': { all: 'portal_placeholder.png' },
    'base_wall': { all: 'iron_block.png' },
    'base_glass': { all: 'glass.png' },
    'base_metal_floor': { all: 'stone_andesite_smooth.png' },
    'base_pillar': { all: 'concrete_powder_silver.png' },
    'base_roofing': { all: 'stone_andesite_smooth.png' },
    'rocket_hull': { all: 'iron_block.png' },        // <<< NEW: Placeholder - bright metal
    'rocket_fin': { all: 'obsidian.png' },           // <<< NEW: Placeholder - dark metal/composite
    'rocket_nose': { all: 'obsidian.png' },          // <<< NEW: Placeholder - same as fin?
    'rocket_tile': { all: 'concrete_powder_black.png' }     // <<< NEW: Placeholder - dark, maybe textured
    // 'air' block doesn't need textures
};

// Helper functions
const MarsHelpers = {
    getBlockTexture(blockIdValue) {
        const blockKey = Object.keys(MARS_BLOCKS).find(key => MARS_BLOCKS[key] === blockIdValue);
        if (blockKey) {
            const blockName = blockKey.toLowerCase();
            if (blockName === 'air') return null;
            return BLOCK_TEXTURES[blockName] || { all: 'default.png' };
        }
        return { all: 'default.png' };
    },

    getBlockId(blockName) {
        const upperCaseName = blockName.toUpperCase();
        return MARS_BLOCKS[upperCaseName] !== undefined ? MARS_BLOCKS[upperCaseName] : null;
    },

    isBlockSolid(blockIdValue) {
        // ROCKET BLOCKS ARE SOLID
        const solidBlocks = [
            MARS_BLOCKS.SURFACE, MARS_BLOCKS.DEEP_SOIL, MARS_BLOCKS.MARS_REGOLITH,
            MARS_BLOCKS.PORTAL_FRAME,
            MARS_BLOCKS.BASE_WALL, MARS_BLOCKS.BASE_GLASS, MARS_BLOCKS.BASE_METAL_FLOOR,
            MARS_BLOCKS.BASE_PILLAR, MARS_BLOCKS.BASE_ROOFING,
            MARS_BLOCKS.ROCKET_HULL, MARS_BLOCKS.ROCKET_FIN, // <<< ADDED
            MARS_BLOCKS.ROCKET_NOSE, MARS_BLOCKS.ROCKET_TILE // <<< ADDED
        ];
        return solidBlocks.includes(blockIdValue);
    }
};

// Export all components
export {
    MARS_BLOCKS,
    MarsHelpers,
    BLOCK_TEXTURES
};