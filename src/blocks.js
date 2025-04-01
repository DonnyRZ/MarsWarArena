import * as THREE from 'three'; // Assuming Three.js is still needed

// Define the two block types
const MARS_BLOCKS = {
    surface: 1,
    deep_soil: 2
};

// Texture mappings for each block type
const BLOCK_TEXTURES = {
    'surface': {
        all: 'red_sand.png' // Surface uses red_sand.png as requested
    },
    'deep_soil': {
        all: 'basalt_side.png' // Deep soil texture, assumed correct from original
    }
};

// Helper functions
const MarsHelpers = {
    getBlockTexture(blockId) {
        const blockName = Object.keys(MARS_BLOCKS).find(key => MARS_BLOCKS[key] === blockId);
        return BLOCK_TEXTURES[blockName] || { all: 'default.png' };
    }
};

// Export all components
export {
    MARS_BLOCKS,
    MarsHelpers,
    BLOCK_TEXTURES
};