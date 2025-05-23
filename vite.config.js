// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // If you have other plugins or configurations, they go here
  base: '/MarsWarArena/', // <<< THIS IS THE CRITICAL LINE
  build: {
    outDir: 'dist' // This is the default and should match your deploy.yml
  }
  // Make sure there are no other 'base' properties defined elsewhere in this config
  // that might override this one.
})