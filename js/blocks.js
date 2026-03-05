/**
 * blocks.js — Question blocks, brick blocks, collectible coins, mushroom power-up,
 *             and the little coin-pop visual effect when a block is hit.
 */

/* ========================================================================= */
/* QuestionBlock                                                              */
/* ========================================================================= */
class QuestionBlock {
    constructor(x, y, contains = 'coin') {
        this.x        = x;
        this.y        = y;
        this.width    = TILE_SIZE;
        this.height   = TILE_SIZE;
        this.contains = contains;   // 'coin' | 'mushroom'
        this.used     = false;
        this.animTimer = 0;
        this.bumpOffset = 0;        // upward bump animation
        this.bumpTimer  = 0;
    }

    /** Called by the game when the player hits the block from below. */
    onHit(game) {
        if (this.used) return;
        this.used = true;

        // Start bump animation
        this.bumpTimer = 0.18;

        if (this.contains === 'mushroom') {
            // Spawn a mushroom sliding out the top
            game.items.push(new MushroomItem(this.x + 2, this.y - TILE_SIZE));
            game.audio.powerup();
        } else {
            // Coin pop effect
            game.effects.push(new CoinPopEffect(this.x + TILE_SIZE / 2 - 8, this.y - TILE_SIZE + 4));
            game.addCoin(100);
            game.audio.coin();
        }
    }

    update(dt) {
        this.animTimer += dt;

        if (this.bumpTimer > 0) {
            this.bumpTimer -= dt;
            const t = this.bumpTimer / 0.18;
            this.bumpOffset = Math.sin(t * Math.PI) * 8;
        } else {
            this.bumpOffset = 0;
        }
    }

    /** The Y position used for collision (includes bump offset). */
    get drawY() { return this.y - this.bumpOffset; }
}

/* ========================================================================= */
/* BrickBlock                                                                 */
/* ========================================================================= */
class BrickBlock {
    constructor(x, y) {
        this.x      = x;
        this.y      = y;
        this.width  = TILE_SIZE;
        this.height = TILE_SIZE;
        this.broken = false;
        this.bumpTimer  = 0;
        this.bumpOffset = 0;
    }

    onHit(game) {
        if (this.broken) return;

        if (game.player.big) {
            this.broken = true;
            game.score += 50;
            // Spawn debris particles
            for (let i = 0; i < 4; i++) {
                game.effects.push(new BrickDebris(
                    this.x + Math.random() * TILE_SIZE,
                    this.y,
                    (Math.random() - 0.5) * 6,
                    -7 - Math.random() * 4
                ));
            }
            game.audio.blockHit();
        } else {
            this.bumpTimer = 0.18;
            game.audio.blockHit();
        }
    }

    update(dt) {
        if (this.bumpTimer > 0) {
            this.bumpTimer -= dt;
            const t = this.bumpTimer / 0.18;
            this.bumpOffset = Math.sin(t * Math.PI) * 6;
        } else {
            this.bumpOffset = 0;
        }
    }

    get drawY() { return this.y - this.bumpOffset; }
}

/* ========================================================================= */
/* Coin (floating pickup in the world)                                        */
/* ========================================================================= */
class Coin {
    constructor(x, y) {
        this.x         = x;
        this.y         = y;
        this.width     = 16;
        this.height    = 20;
        this.collected = false;
        this.animTimer = 0;
    }

    update(dt) {
        this.animTimer += dt;
    }
}

/* ========================================================================= */
/* MushroomItem — slides along the ground after being released from a block  */
/* ========================================================================= */
class MushroomItem {
    constructor(x, y) {
        this.x        = x;
        this.y        = y;
        this.width    = 26;
        this.height   = 26;
        this.vx       = 1.8;   // slides right initially
        this.vy       = 0;
        this.onGround = false;
        this.active   = true;
        this.collected = false;
    }

    update(dt, game) {
        if (!this.active) return;

        const step = dt * 60;

        // Gravity
        this.vy += GRAVITY * step;
        if (this.vy > MAX_FALL_SPD) this.vy = MAX_FALL_SPD;

        // Horizontal move + wall bounce
        this.x += this.vx * step;
        const solidHit = game.getSolidAt(this.x, this.y, this.width, this.height);
        if (solidHit) {
            if (this.vx > 0) this.x = solidHit.x - this.width;
            else             this.x = solidHit.x + solidHit.width;
            this.vx *= -1;
        }
        // Level edge bounce
        if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); }

        // Vertical move
        this.y += this.vy * step;
        this.onGround = false;

        // Ground collision
        const gy = game.level.groundYAt(this.x + this.width / 2);
        if (gy !== null && this.y + this.height >= gy) {
            this.y = gy - this.height;
            this.vy = 0;
            this.onGround = true;
        }

        // Solid tile collision (tops of blocks/pipes)
        const solidBelow = game.getSolidBelow(this.x, this.y, this.width, this.height);
        if (solidBelow) {
            this.y = solidBelow.y - this.height;
            this.vy = 0;
            this.onGround = true;
        }

        // Fall into pit
        if (this.y > DEATH_Y) this.active = false;
    }
}

/* ========================================================================= */
/* CoinPopEffect — the coin that floats up when a ? block is struck          */
/* ========================================================================= */
class CoinPopEffect {
    constructor(x, y) {
        this.x    = x;
        this.y    = y;
        this.vy   = -4;
        this.life = 0.6;
        this.done = false;
    }

    update(dt) {
        this.life -= dt;
        this.y    += this.vy * dt * 60;
        this.vy   += 0.15 * dt * 60;
        if (this.life <= 0) this.done = true;
    }
}

/* ========================================================================= */
/* BrickDebris — small flying chunk when a brick is broken                   */
/* ========================================================================= */
class BrickDebris {
    constructor(x, y, vx, vy) {
        this.x    = x;
        this.y    = y;
        this.vx   = vx;
        this.vy   = vy;
        this.life = 0.7;
        this.done = false;
        this.size = 6 + Math.random() * 6;
    }

    update(dt) {
        this.life -= dt;
        const step = dt * 60;
        this.x  += this.vx * step;
        this.y  += this.vy * step;
        this.vy += GRAVITY * step;
        if (this.life <= 0) this.done = true;
    }
}
