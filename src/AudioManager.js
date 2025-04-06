// AudioManager.js
class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
    }

    loadSound(name, path) {
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(buffer => this.context.decodeAudioData(buffer))
            .then(decodedBuffer => {
                this.sounds[name] = decodedBuffer;
                console.log(`Sound "${name}" loaded successfully.`);
            })
            .catch(error => console.error(`Error loading sound "${name}":`, error));
    }

    playSound(name) {
        if (this.sounds[name]) {
            const source = this.context.createBufferSource();
            source.buffer = this.sounds[name];
            source.connect(this.context.destination);
            source.start(0);
        } else {
            console.warn(`Sound "${name}" not loaded yet.`);
        }
    }
}

export { AudioManager };