/**
 * player.js — Player entity with physics, controls, and state management.
 *
 * States: 'normal' | 'big' | 'dead'
 * Physics uses frame-equivalent values scaled by dt*60 for frame-rate independence.
 */
class Player {
    constructor(x, spawnY, big = false) {
        this.big = big;
        this._setSize();

        this.x  = x;
        this.y  = spawnY - this.height;   // feet land at spawnY

        this.vx = 0;
        this.vy = 0;

        this.onGround   = false;
        this.facingRight = true;

        // Jump mechanics
        this.jumpHeld     = false;
        this.jumpTimer    = 0;      // how long jump key has been held (for variable height)
        this.maxJumpTime  = 0.28;   // seconds of boosted jump

        // Damage invincibility
        this.invTimer     = 0;      // seconds of invincibility remaining
        this.blinkTimer   = 0;

        // Power-up grow animation
        this.growTimer    = 0;

        // Standing on moving platform
        this.onPlatform   = null;

        // Used by the game to track respawn
        this.dead         = false;
        this.deathTimer   = 0;

        this.animTimer    = 0;
        this.walkFrame    = 0;
        this.walkAccum    = 0;
    }

    _setSize() {
        if (this.big) {
            this.width  = 22;
            this.height = 42;
        } else {
            this.width  = 20;
            this.height = 26;
        }
    }

    setBig(val) {
        const oldFeet = this.y + this.height;
        this.big = val;
        this._setSize();
        this.y = oldFeet - this.height;   // keep feet in same spot
        this.growTimer = 0.3;
    }

    isInvincible() { return this.invTimer > 0; }

    takeDamage(game) {
        if (this.invTimer > 0) return;

        if (this.big) {
            this.setBig(false);
            this.invTimer = 2.0;
            game.audio.death();
        } else {
            this.die(game);
        }
    }

    die(game) {
        if (this.dead) return;
        this.dead      = true;
        this.vy        = JUMP_FORCE * 0.9;   // pop up a bit on death
        this.vx        = 0;
        this.deathTimer = 1.5;   // animation plays for 1.5 s, then game handles it
        game.audio.death();
    }

    /** Update called every frame. `solids` is all solid world objects. */
    update(dt, input, game) {
        if (this.dead) {
            this._updateDead(dt);
            return;
        }

        const step = dt * 60;

        // Timers
        if (this.invTimer   > 0) this.invTimer   -= dt;
        if (this.growTimer  > 0) this.growTimer  -= dt;
        if (this.blinkTimer > 0) this.blinkTimer -= dt;

        // ---- Horizontal input ----------------------------------------
        const speed  = input.isRun() ? PLAYER_RUN : PLAYER_SPD;
        const accel  = this.onGround ? 0.7 : 0.45;   // less air control
        const decel  = this.onGround ? 0.8 : 0.95;

        if (input.isLeft()) {
            this.vx      = Math.max(this.vx - accel * step, -speed);
            this.facingRight = false;
        } else if (input.isRight()) {
            this.vx      = Math.min(this.vx + accel * step, speed);
            this.facingRight = true;
        } else {
            // Decelerate
            this.vx *= Math.pow(decel, step);
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // ---- Jump -------------------------------------------------------
        if (input.isJumpJustPressed() && this.onGround) {
            this.vy        = JUMP_FORCE;
            this.jumpHeld  = true;
            this.jumpTimer = 0;
            this.onGround  = false;
            game.audio.jump();
        }
        if (this.jumpHeld) {
            if (input.isJump() && this.jumpTimer < this.maxJumpTime) {
                // Extra upward force while key is held
                this.vy     -= 0.35 * step;
                this.jumpTimer += dt;
            } else {
                this.jumpHeld = false;
            }
        }
        // Release jump early → cut vertical speed
        if (!input.isJump() && this.vy < 0) {
            this.jumpHeld = false;
        }

        // ---- Gravity & terminal velocity --------------------------------
        this.vy += GRAVITY * step;
        if (this.vy > MAX_FALL_SPD) this.vy = MAX_FALL_SPD;

        // ---- Move X then resolve, then move Y then resolve -------------
        this.x += this.vx * step;
        game.resolveHorizontal(this, true);

        this.y += this.vy * step;
        this.onGround  = false;
        this.onPlatform = null;
        game.resolveVertical(this, true);

        // ---- Moving platform ride ---------------------------------------
        if (this.onPlatform) {
            const mp = this.onPlatform;
            this.x += mp.vx * step;
            // Re-clamp to level so we don't ride off edge
            this.x = Math.max(0, Math.min(this.x, LEVEL_WIDTH - this.width));
        }

        // ---- Walk animation ---------------------------------------------
        if (this.onGround && Math.abs(this.vx) > 0.3) {
            this.walkAccum += Math.abs(this.vx) * dt;
            if (this.walkAccum > 0.12) {
                this.walkAccum = 0;
                this.walkFrame = (this.walkFrame + 1) % 3;
            }
        } else {
            this.walkFrame = 0;
            this.walkAccum = 0;
        }

        // Clamp to level left edge
        if (this.x < 0) { this.x = 0; this.vx = 0; }
    }

    _updateDead(dt) {
        const step = dt * 60;
        this.deathTimer -= dt;
        this.vy += GRAVITY * step;
        this.y  += this.vy * step;
    }

    /** Centre X of the player. */
    get cx() { return this.x + this.width / 2; }
    /** Centre Y of the player. */
    get cy() { return this.y + this.height / 2; }
}
