// src/menu.js

export class Menu {
    constructor(onResumeCallback, isMobileFlag) { // <<< MODIFIED: Accept isMobileFlag
        this.pcMenuElement = document.getElementById('pause-menu');
        this.mobileMenuElement = document.getElementById('mobile-pause-menu'); // <<< NEW: Get mobile menu
        
        // Get resume buttons for both menus
        this.pcResumeButton = document.getElementById('resume-button');
        this.mobileResumeButton = document.getElementById('mobile-resume-button'); // <<< NEW: Get mobile resume button

        // Basic validation
        if (!this.pcMenuElement || !this.pcResumeButton) {
            console.error("PC Pause Menu elements not found in the DOM!");
            // Depending on your game logic, you might still want to function if only mobile menu exists or vice-versa
        }
        if (!this.mobileMenuElement || !this.mobileResumeButton) {
            console.error("Mobile Pause Menu elements not found in the DOM!");
        }

        this.isVisible = false; 
        this.onResumeCallback = onResumeCallback;
        this.isMobile = isMobileFlag; // <<< NEW: Store the mobile flag

        // Ensure both menus are hidden initially
        if (this.pcMenuElement) this.pcMenuElement.classList.add('hidden');
        if (this.mobileMenuElement) this.mobileMenuElement.classList.add('hidden');

        // Add click event listener for the PC resume button
        if (this.pcResumeButton) {
            this.pcResumeButton.addEventListener('click', () => {
                this.hide(); 
                if (this.onResumeCallback) {
                    this.onResumeCallback();
                }
            });
        }

        // Add click event listener for the Mobile resume button
        if (this.mobileResumeButton) { // <<< NEW: Listener for mobile resume button
            this.mobileResumeButton.addEventListener('click', () => {
                this.hide();
                if (this.onResumeCallback) {
                    this.onResumeCallback();
                }
            });
        }
    }

    show() {
        let menuToShow = this.isMobile ? this.mobileMenuElement : this.pcMenuElement;
        let menuToHide = this.isMobile ? this.pcMenuElement : this.mobileMenuElement;

        if (menuToShow) {
            menuToShow.classList.remove('hidden');
            if (menuToHide) menuToHide.classList.add('hidden'); // Ensure the other is hidden

            this.isVisible = true;
            document.exitPointerLock();
        } else {
            console.warn("Menu element to show was not found (PC or Mobile). isMobile:", this.isMobile);
        }
    }

    hide() {
        // Hide both, as only one should have been visible
        if (this.pcMenuElement) this.pcMenuElement.classList.add('hidden');
        if (this.mobileMenuElement) this.mobileMenuElement.classList.add('hidden');
        
        this.isVisible = false;
        // The onResumeCallback is now called by the button listeners or toggle, not directly in hide.
    }

    toggle() {
        if (this.isVisible) {
            this.hide(); 
            // When toggling off (closing), trigger the onResumeCallback
            if (this.onResumeCallback) {
                this.onResumeCallback();
            }
        } else {
            this.show();
        }
    }

    isOpen() {
        return this.isVisible;
    }
}