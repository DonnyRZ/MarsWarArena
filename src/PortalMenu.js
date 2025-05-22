// src/PortalMenu.js
// PHASE 2: Updated constructor to accept and use callbacks

export class PortalMenu {
    constructor(readyCallback, backCallback) { // Accept callbacks
        // Find the HTML elements
        this.menuElement = document.getElementById('portal-menu');
        this.titleElement = document.getElementById('portal-title');
        this.descriptionElement = document.getElementById('portal-description');
        this.readyButton = document.getElementById('portal-ready-button');
        this.backButton = document.getElementById('portal-back-button');

        if (!this.menuElement || !this.titleElement || !this.descriptionElement || !this.readyButton || !this.backButton) {
            console.error("Portal menu elements not found in the DOM!");
            return;
        }

        this.isVisible = false; // Track menu state
        this.readyCallback = readyCallback; // Store the ready callback
        this.backCallback = backCallback;   // Store the back callback

        // Ensure the menu is hidden initially
        this.hide();

        // Add click event listeners using the stored callbacks
        this.readyButton.addEventListener('click', () => {
            this.hide();
            if (this.readyCallback) {
                console.log("Portal Ready button clicked, calling readyCallback.");
                this.readyCallback(); // Call the stored function
            } else {
                console.warn("Portal Ready button clicked, but no readyCallback provided.");
            }
        });
        this.backButton.addEventListener('click', () => {
            this.hide();
            if (this.backCallback) {
                console.log("Portal Back button clicked, calling backCallback.");
                this.backCallback(); // Call the stored function
            } else {
                console.warn("Portal Back button clicked, but no backCallback provided.");
            }
        });
    }

    show(title, description) {
        if (!this.menuElement) return; // Safety check

        this.titleElement.textContent = title;
        this.descriptionElement.textContent = description;
        this.menuElement.classList.remove('hidden');
        this.isVisible = true;
        // Release pointer lock to allow interaction with the menu
        document.exitPointerLock();
        console.log("Portal Menu Shown");
    }

    hide() {
        if (this.menuElement) {
            this.menuElement.classList.add('hidden');
            this.isVisible = false;
            console.log("Portal Menu Hidden");
            // Note: We don't re-lock pointer lock here.
            // That should happen naturally when the player clicks back into the game
            // or automatically after the world transition.
        }
    }

    isOpen() {
        return this.isVisible;
    }
}