// --- START OF FILE src/MobileControls.js ---

/**
 * MobileControls Class
 * Manages on-screen touch controls (joystick, buttons) for mobile devices.
 * It updates a shared PlayerInputHandler instance.
 */
export class MobileControls {
    /**
     * @param {PlayerInputHandler} inputHandlerRef - A reference to the shared PlayerInputHandler instance.
     * @param {Player} playerRef - A reference to the Player instance (for camera look).
     * @param {HTMLElement} parentElement - The parent HTML element to append controls to.
     * @param {object} [options={}] - Configuration options for the controls.
     */
    constructor(inputHandlerRef, playerRef, parentElement, options = {}) {
        console.log("MobileControls: Constructor called.");
        if (!inputHandlerRef) {
            console.error("MobileControls Constructor: PlayerInputHandler reference is required!");
            this.isValid = false; return;
        }
        if (!playerRef) {
            console.error("MobileControls Constructor: Player reference is required!");
            this.isValid = false; return;
        }
        if (!parentElement || typeof parentElement.appendChild !== 'function') {
            console.error("MobileControls Constructor: Valid parentElement (DOM node) is required!", parentElement);
            this.isValid = false; return;
        }

        this.inputHandlerRef = inputHandlerRef;
        this.playerRef = playerRef;
        this.parentElement = parentElement;
        this.isValid = true;

        // --- Configuration with Defaults ---
        this.options = {
            joystickSize: options.joystickSize ?? 120,
            joystickKnobSize: options.joystickKnobSize ?? 60,
            joystickDeadZoneRatio: options.joystickDeadZoneRatio ?? 0.15,
            buttonSize: options.buttonSize ?? 70,
            lookSensitivity: options.lookSensitivity ?? 0.0025,
            joystickColorBase: options.joystickColorBase ?? 'rgba(100, 100, 100, 0.3)',
            joystickColorKnob: options.joystickColorKnob ?? 'rgba(80, 80, 80, 0.6)',
            buttonColor: options.buttonColor ?? 'rgba(100, 100, 100, 0.4)',
            buttonActiveColor: options.buttonActiveColor ?? 'rgba(80, 80, 80, 0.7)',
        };

        this.joystickRadius = this.options.joystickSize / 2;
        this.joystickKnobRadius = this.options.joystickKnobSize / 2;
        this.joystickDeadZone = this.joystickRadius * this.options.joystickDeadZoneRatio;

        // --- DOM Elements ---
        this.controlsOverlay = null;
        this.joystickBase = null;
        this.joystickKnob = null;
        this.jumpButton = null;
        this.shootButton = null;
        this.weapon1Button = null;
        this.weapon2Button = null;
        this.lookArea = null;

        // --- Joystick State ---
        this.joystickActive = false;
        this.joystickTouchIdentifier = null;
        this.joystickOriginX = 0;
        this.joystickOriginY = 0;
        this.joystickCurrentRelX = 0;
        this.joystickCurrentRelY = 0;

        // --- Look/Aim State ---
        this.lookTouchIdentifier = null;
        this.lookStartX = 0;
        this.lookStartY = 0;

        // --- Button States ---
        this.jumpPressedThisFrame = false;
        this.shootActive = false;
        this.weapon1PressedThisFrame = false;
        this.weapon2PressedThisFrame = false;

        this.isVisible = false;

        this._createDOMElements();
        this.hide();
        this._bindEventHandlers();
        console.log("MobileControls: Constructor finished.");
    }

    _bindEventHandlers() {
        this._onInitialTouchStart = this._onInitialTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
    }

    _createDOMElements() {
        if (!this.isValid) return;
        console.log("MobileControls: _createDOMElements called.");

        this.controlsOverlay = document.createElement('div');
        this.controlsOverlay.id = 'mobile-controls-overlay';
        this.controlsOverlay.style.position = 'fixed'; this.controlsOverlay.style.left = '0'; this.controlsOverlay.style.top = '0';
        this.controlsOverlay.style.width = '100vw'; this.controlsOverlay.style.height = '100vh';
        this.controlsOverlay.style.pointerEvents = 'none'; this.controlsOverlay.style.zIndex = '1000';

        this.lookArea = document.createElement('div'); this.lookArea.id = 'mobile-look-area';
        this.lookArea.classList.add('mobile-control-element');
        this.controlsOverlay.appendChild(this.lookArea);

        this.joystickBase = document.createElement('div'); this.joystickBase.id = 'mobile-joystick-base';
        this.joystickBase.classList.add('mobile-control-element');
        this.joystickBase.style.width = `${this.options.joystickSize}px`; this.joystickBase.style.height = `${this.options.joystickSize}px`;
        this.joystickBase.style.borderRadius = '50%'; this.joystickBase.style.backgroundColor = this.options.joystickColorBase;
        this.controlsOverlay.appendChild(this.joystickBase);

        this.joystickKnob = document.createElement('div'); this.joystickKnob.id = 'mobile-joystick-knob';
        this.joystickKnob.style.width = `${this.options.joystickKnobSize}px`; this.joystickKnob.style.height = `${this.options.joystickKnobSize}px`;
        this.joystickKnob.style.borderRadius = '50%'; this.joystickKnob.style.backgroundColor = this.options.joystickColorKnob;
        this.joystickKnob.style.position = 'absolute';
        const knobOffset = (this.options.joystickSize - this.options.joystickKnobSize) / 2;
        this.joystickKnob.style.left = `${knobOffset}px`;
        this.joystickKnob.style.top = `${knobOffset}px`;
        this.joystickKnob.style.transform = 'translate(0px, 0px)';
        // --- THE FIX for joystick knob intercepting touches ---
        this.joystickKnob.style.pointerEvents = 'none';
        // --- END FIX ---
        this.joystickBase.appendChild(this.joystickKnob);

        const createButton = (id, textContent, actionName) => {
            const button = document.createElement('div'); button.id = id; button.dataset.action = actionName;
            button.classList.add('mobile-control-element', 'mobile-action-button');
            button.style.width = `${this.options.buttonSize}px`; button.style.height = `${this.options.buttonSize}px`;
            button.style.backgroundColor = this.options.buttonColor; button.style.borderRadius = '50%';
            button.style.display = 'flex'; button.style.alignItems = 'center'; button.style.justifyContent = 'center';
            button.style.color = 'white'; button.style.fontSize = '14px'; button.textContent = textContent;
            this.controlsOverlay.appendChild(button); return button;
        };
        this.jumpButton = createButton('mobile-jump-button', 'JMP', 'jump');
        this.shootButton = createButton('mobile-shoot-button', 'ATK', 'shoot');
        this.weapon1Button = createButton('mobile-weapon1-button', 'W1', 'weapon1');
        this.weapon2Button = createButton('mobile-weapon2-button', 'W2', 'weapon2');

        console.log("MobileControls: Appending controlsOverlay to parentElement:", this.parentElement);
        this.parentElement.appendChild(this.controlsOverlay);
        console.log("MobileControls: DOM elements created and appended.");
    }

    show() {
        if (!this.isValid || !this.controlsOverlay) return;
        this.controlsOverlay.style.display = 'block'; this.isVisible = true;
        this._addListeners();
        requestAnimationFrame(() => {
            if (!this.joystickBase) return;
            const rect = this.joystickBase.getBoundingClientRect();
            this.joystickOriginX = rect.left + rect.width / 2;
            this.joystickOriginY = rect.top + rect.height / 2;
            console.log(`MobileControls: Shown. Joystick Origin: X=${this.joystickOriginX.toFixed(2)}, Y=${this.joystickOriginY.toFixed(2)}`);
        });
    }

    hide() {
        if (!this.isValid || !this.controlsOverlay) return;
        this.controlsOverlay.style.display = 'none'; this.isVisible = false;
        this._removeListeners();
        this.joystickActive = false; this.joystickTouchIdentifier = null; this.lookTouchIdentifier = null;
        this.shootActive = false;
        if (this.joystickKnob) {
            this.joystickKnob.style.transform = `translate(0px, 0px)`;
        }
        this.joystickCurrentRelX = 0; this.joystickCurrentRelY = 0;
        console.log("MobileControls: Hidden.");
    }

    _addListeners() {
        if (!this.isValid) return;
        console.log("MobileControls: Adding event listeners.");
        this.controlsOverlay.addEventListener('touchstart', this._onInitialTouchStart, { passive: false });
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
        window.addEventListener('touchend', this._onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', this._onTouchEnd, { passive: false });

        this.jumpButton.addEventListener('touchstart', (e) => this._onButtonTouchStart(this.jumpButton, e), { passive: false });
        this.shootButton.addEventListener('touchstart', (e) => this._onButtonTouchStart(this.shootButton, e), { passive: false });
        this.weapon1Button.addEventListener('touchstart', (e) => this._onButtonTouchStart(this.weapon1Button, e), { passive: false });
        this.weapon2Button.addEventListener('touchstart', (e) => this._onButtonTouchStart(this.weapon2Button, e), { passive: false });
        this.jumpButton.addEventListener('touchend', (e) => this._onButtonTouchEnd(this.jumpButton, e));
        this.shootButton.addEventListener('touchend', (e) => this._onButtonTouchEnd(this.shootButton, e));
        this.weapon1Button.addEventListener('touchend', (e) => this._onButtonTouchEnd(this.weapon1Button, e));
        this.weapon2Button.addEventListener('touchend', (e) => this._onButtonTouchEnd(this.weapon2Button, e));
    }

    _removeListeners() {
        if (!this.isValid) return;
        console.log("MobileControls: Removing event listeners.");
        this.controlsOverlay.removeEventListener('touchstart', this._onInitialTouchStart);
        window.removeEventListener('touchmove', this._onTouchMove);
        window.removeEventListener('touchend', this._onTouchEnd);
        window.removeEventListener('touchcancel', this._onTouchEnd);
    }

    _onInitialTouchStart(event) {
        if (!this.isValid) return;
        // console.log("MobileControls: _onInitialTouchStart", event.changedTouches);
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
            // console.log("MobileControls: Touch target:", targetElement ? targetElement.id : 'null');

            if (targetElement === this.joystickBase && this.joystickTouchIdentifier === null) {
                console.log("MobileControls: Joystick touch started.", touch.identifier);
                event.preventDefault();
                this.joystickActive = true;
                this.joystickTouchIdentifier = touch.identifier;
                const rect = this.joystickBase.getBoundingClientRect();
                this.joystickOriginX = rect.left + rect.width / 2;
                this.joystickOriginY = rect.top + rect.height / 2;
                this._updateJoystickPosition(touch.clientX, touch.clientY);
            } else if (targetElement === this.lookArea && this.lookTouchIdentifier === null && this.joystickTouchIdentifier !== touch.identifier) {
                console.log("MobileControls: Look area touch started.", touch.identifier);
                event.preventDefault();
                this.lookTouchIdentifier = touch.identifier;
                this.lookStartX = touch.clientX;
                this.lookStartY = touch.clientY;
            }
        }
    }

    _onTouchMove(event) {
        if (!this.isValid || !this.isVisible) return;
        let relevantTouchMoved = false;
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            if (this.joystickActive && touch.identifier === this.joystickTouchIdentifier) {
                // console.log("MobileControls: Joystick touch move.");
                this._updateJoystickPosition(touch.clientX, touch.clientY);
                relevantTouchMoved = true;
            } else if (this.lookTouchIdentifier !== null && touch.identifier === this.lookTouchIdentifier) {
                // console.log("MobileControls: Look area touch move.");
                const deltaX = touch.clientX - this.lookStartX;
                const deltaY = touch.clientY - this.lookStartY;
                this.inputHandlerRef.lookDeltaX += deltaX * this.options.lookSensitivity;
                this.inputHandlerRef.lookDeltaY += deltaY * this.options.lookSensitivity;
                this.lookStartX = touch.clientX;
                this.lookStartY = touch.clientY;
                relevantTouchMoved = true;
            }
        }
        if (relevantTouchMoved) {
            event.preventDefault();
        }
    }

    _updateJoystickPosition(clientX, clientY) {
        let dx = clientX - this.joystickOriginX;
        let dy = clientY - this.joystickOriginY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // console.log(`MobileControls: Joystick raw dx:${dx.toFixed(1)}, dy:${dy.toFixed(1)}, dist:${distance.toFixed(1)}`);

        if (distance > this.joystickRadius) {
            dx = (dx / distance) * this.joystickRadius;
            dy = (dy / distance) * this.joystickRadius;
        }
        this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

        if (distance < this.joystickDeadZone) {
            this.joystickCurrentRelX = 0;
            this.joystickCurrentRelY = 0;
        } else {
            this.joystickCurrentRelX = dx / this.joystickRadius;
            this.joystickCurrentRelY = dy / this.joystickRadius;
        }
        // console.log(`MobileControls: Joystick RelX:${this.joystickCurrentRelX.toFixed(2)}, RelY:${this.joystickCurrentRelY.toFixed(2)}`);
    }

    _onTouchEnd(event) {
        if (!this.isValid || !this.isVisible) return;
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            if (touch.identifier === this.joystickTouchIdentifier) {
                console.log("MobileControls: Joystick touch ended.");
                this.joystickActive = false;
                this.joystickTouchIdentifier = null;
                this.joystickKnob.style.transform = `translate(0px, 0px)`;
                this.joystickCurrentRelX = 0;
                this.joystickCurrentRelY = 0;
            } else if (touch.identifier === this.lookTouchIdentifier) {
                console.log("MobileControls: Look area touch ended.");
                this.lookTouchIdentifier = null;
            }
        }
    }

    _onButtonTouchStart(buttonElement, event) {
        if (!this.isValid) return;
        event.preventDefault();
        event.stopPropagation();
        buttonElement.style.backgroundColor = this.options.buttonActiveColor;
        const action = buttonElement.dataset.action;
        console.log(`MobileControls: Button ${action} touch start.`);
        switch (action) {
            case 'jump': this.jumpPressedThisFrame = true; break;
            case 'shoot': this.shootActive = true; break;
            case 'weapon1': this.weapon1PressedThisFrame = true; break;
            case 'weapon2': this.weapon2PressedThisFrame = true; break;
        }
    }

    _onButtonTouchEnd(buttonElement, event) {
        if (!this.isValid) return;
        buttonElement.style.backgroundColor = this.options.buttonColor;
        const action = buttonElement.dataset.action;
        // console.log(`MobileControls: Button ${action} touch end.`);
        switch (action) {
            case 'shoot': this.shootActive = false; break;
        }
    }

    update() {
        if (!this.isValid || !this.isVisible) return;

        const deadZoneThreshold = 0.1;
        this.inputHandlerRef.forward = this.joystickCurrentRelY < -deadZoneThreshold;
        this.inputHandlerRef.backward = this.joystickCurrentRelY > deadZoneThreshold;
        this.inputHandlerRef.left = this.joystickCurrentRelX < -deadZoneThreshold;
        this.inputHandlerRef.right = this.joystickCurrentRelX > deadZoneThreshold;

        // console.log(`MobileControls Update: F:${this.inputHandlerRef.forward}, B:${this.inputHandlerRef.backward}, L:${this.inputHandlerRef.left}, R:${this.inputHandlerRef.right}`);

        if (this.jumpPressedThisFrame) {
            this.inputHandlerRef.jumpRequested = true;
            this.jumpPressedThisFrame = false;
        }
        this.inputHandlerRef.shootRequested = this.shootActive;
        if (this.weapon1PressedThisFrame) {
            this.inputHandlerRef.switchWeapon1Requested = true;
            this.weapon1PressedThisFrame = false;
        }
        if (this.weapon2PressedThisFrame) {
            this.inputHandlerRef.switchWeapon2Requested = true;
            this.weapon2PressedThisFrame = false;
        }
    }
}
// --- END OF FILE src/MobileControls.js ---