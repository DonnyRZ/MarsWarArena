// --- START OF FILE src/PlayerInputHandler.js ---
// DEBUG: Added logging for weapon switch flags
// REVISED: Added lookDeltaX and lookDeltaY for mobile touch input

export class PlayerInputHandler {
    constructor() {
        // Movement states
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.up = false; // For no-gravity mode
        this.down = false; // For no-gravity mode

        // Action states (single frame triggers or continuous)
        this.jumpRequested = false;         // Single frame
        this.shootRequested = false;        // Can be continuous (held down)
        this.switchWeapon1Requested = false; // Single frame
        this.switchWeapon2Requested = false; // Single frame
        this.toggleGravityRequested = false; // Single frame

        // --- NEW: For mobile touch-look input (deltas per frame) ---
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;
        // --- END NEW ---

        // Internal state for detecting single presses of keyboard keys
        this._isDigit1Down = false;
        this._isDigit2Down = false;
        this._isVDown = false;

        // Bind event listeners
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);

        // Listeners are typically added/removed by a controller (e.g., Player or main game)
        // For now, let's assume they are added when this handler is created if always active.
        // Or, MobileControls will manage its own listeners and update these properties.
    }

    // Call this to attach keyboard/mouse listeners if they are not always active
    addKeyboardMouseListeners() {
        document.addEventListener('keydown', this._onKeyDown, false);
        document.addEventListener('keyup', this._onKeyUp, false);
        document.addEventListener('mousedown', this._onMouseDown, false);
        document.addEventListener('mouseup', this._onMouseUp, false);
        console.log("PlayerInputHandler: Keyboard/Mouse listeners added.");
    }

    removeKeyboardMouseListeners() {
        document.removeEventListener('keydown', this._onKeyDown, false);
        document.removeEventListener('keyup', this._onKeyUp, false);
        document.removeEventListener('mousedown', this._onMouseDown, false);
        document.removeEventListener('mouseup', this._onMouseUp, false);
        console.log("PlayerInputHandler: Keyboard/Mouse listeners removed.");
    }

    // Called at the end of each game frame to reset single-action flags
    // and per-frame deltas.
    resetFrameState() {
        // console.log(`InputHandler: resetFrameState clearing flags (current: W1=${this.switchWeapon1Requested}, W2=${this.switchWeapon2Requested})`);

        this.jumpRequested = false;
        this.switchWeapon1Requested = false;
        this.switchWeapon2Requested = false;
        this.toggleGravityRequested = false;

        // --- NEW: Reset look deltas ---
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;
        // --- END NEW ---
    }

    _onKeyDown(event) {
        // Prevent input if a text input field is focused, for example
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        switch (event.code) {
            case 'KeyW': this.forward = true; break;
            case 'KeyS': this.backward = true; break;
            case 'KeyA': this.left = true; break;
            case 'KeyD': this.right = true; break;
            case 'KeyE': this.up = true; break;
            case 'KeyQ': this.down = true; break;
            case 'Space': this.jumpRequested = true; break;
            case 'KeyV':
                if (!this._isVDown) {
                    this.toggleGravityRequested = true;
                    this._isVDown = true;
                }
                break;
            case 'Digit1':
                if (!this._isDigit1Down) {
                    this.switchWeapon1Requested = true;
                    // console.log("InputHandler: switchWeapon1Requested SET to true");
                    this._isDigit1Down = true;
                }
                break;
            case 'Digit2':
                if (!this._isDigit2Down) {
                    this.switchWeapon2Requested = true;
                    // console.log("InputHandler: switchWeapon2Requested SET to true");
                    this._isDigit2Down = true;
                }
                break;
        }
    }

    _onKeyUp(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        switch (event.code) {
            case 'KeyW': this.forward = false; break;
            case 'KeyS': this.backward = false; break;
            case 'KeyA': this.left = false; break;
            case 'KeyD': this.right = false; break;
            case 'KeyE': this.up = false; break;
            case 'KeyQ': this.down = false; break;
            case 'KeyV': this._isVDown = false; break;
            case 'Digit1': this._isDigit1Down = false; break;
            case 'Digit2': this._isDigit2Down = false; break;
            // case 'Space': break; // jumpRequested is reset by resetFrameState
        }
    }

    _onMouseDown(event) {
        // Only process if pointer is locked or if it's a general click not on UI
        // This check might need to be more sophisticated depending on game state
        // For now, assume Player.js or main.js handles when to process shootRequested
        if (event.button === 0) { // Left mouse button
            this.shootRequested = true;
        }
    }

    _onMouseUp(event) {
        if (event.button === 0) { // Left mouse button
            this.shootRequested = false;
        }
    }
}
// --- END OF FILE src/PlayerInputHandler.js ---