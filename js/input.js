/**
 * input.js — Keyboard input handler.
 * Tracks which keys are currently held and which were just pressed this frame.
 */
class Input {
    constructor() {
        this.keys    = {};          // currently held
        this._fresh  = {};          // pressed since last update()
        this.justPressed = {};      // populated by update()

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) this._fresh[e.code] = true;
            this.keys[e.code] = true;
            // Prevent default browser scroll on game keys
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    /** Call once per game frame to latch just-pressed keys. */
    update() {
        this.justPressed = this._fresh;
        this._fresh = {};
    }

    isDown(code)         { return !!this.keys[code]; }
    wasJustPressed(code) { return !!this.justPressed[code]; }

    /* Convenience helpers */
    isLeft()  { return this.isDown('ArrowLeft')  || this.isDown('KeyA'); }
    isRight() { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
    isJump()  { return this.isDown('ArrowUp') || this.isDown('KeyW') || this.isDown('Space'); }
    isRun()   { return this.isDown('ShiftLeft') || this.isDown('ShiftRight'); }

    isJumpJustPressed() {
        return this.wasJustPressed('ArrowUp') || this.wasJustPressed('KeyW') || this.wasJustPressed('Space');
    }
    isEnterJustPressed() {
        return this.wasJustPressed('Enter');
    }
    isEscapeJustPressed() {
        return this.wasJustPressed('Escape');
    }
}
