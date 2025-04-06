// src/menu.js

export class Menu {
    constructor() {
        // Find the HTML elements
        this.menuElement = document.getElementById('pause-menu');
        this.resumeButton = document.getElementById('resume-button');

        if (!this.menuElement || !this.resumeButton) {
            console.error("Menu elements not found in the DOM!");
            return;
        }

        this.isVisible = false; // Track menu state

        // Ensure the menu is hidden initially
        this.hide();

        // Add click event listener for the resume button
        this.resumeButton.addEventListener('click', this.hide.bind(this));
    }

    show() {
        if (this.menuElement) {
            this.menuElement.classList.remove('hidden');
            this.isVisible = true;
            // Release pointer lock to allow interaction with the menu
            document.exitPointerLock();
        }
    }

    hide() {
        if (this.menuElement) {
            this.menuElement.classList.add('hidden');
            this.isVisible = false;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    isOpen() {
        return this.isVisible;
    }
}