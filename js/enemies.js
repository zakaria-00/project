/**
 * enemies.js — Goomba-style enemy that walks back and forth.
 */
class Goomba {
    /**
     * @param {number} x         - Spawn x (world pixels)
     * @param {number} y         - Spawn y — feet at this y (top of tile they stand on)
     * @param {number} leftBound - Leftmost x allowed (world px)
     * @param {number} rightBound- Rightmost x allowed (world px)
     */
    constructor(x, y, leftBound, rightBound) {
        this.width      = 28;
        this.height     = 28;
        this.x          = x;
        this.y          = y - this.height;   // position so feet are at y
        this.vx         = -1.4;              // starts walking left
        this.vy         = 0;
        this.onGround   = false;
        this.leftBound  = leftBound;
        this.rightBound = rightBound;

        this.alive      = true;    // false → remove from list
        this.stomped    = false;   // playing squish animation
        this.stompTimer = 0.4;     // seconds before disappearing after stomp
        this.animTimer  = 0;
        this.invTimer   = 0;       // short invulnerability after being kicked
    }

    update(dt) {
        if (this.stomped) {
            this.stompTimer -= dt;
            if (this.stompTimer <= 0) this.alive = false;
            return;
        }

        this.animTimer += dt;
        const step = dt * 60;

        // Turn around at patrol bounds
        if (this.x <= this.leftBound)               this.vx =  Math.abs(this.vx);
        if (this.x + this.width >= this.rightBound) this.vx = -Math.abs(this.vx);

        // Horizontal move — collision handled by game
        this.x += this.vx * step;
    }

    /**
     * Called by the game's collision system after vertical integration.
     * Separate-axis physics: game.js applies gravity & resolves vertical for us.
     */
    stomp() {
        this.stomped    = true;
        this.stompTimer = 0.38;
        this.vx = 0;
    }
}
