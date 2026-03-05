/**
 * game.js — Main game class: loop, state machine, physics, and collision.
 *
 * States: 'START' | 'PLAYING' | 'DEAD' | 'GAMEOVER' | 'VICTORY'
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx    = this.canvas.getContext('2d');

        // Sub-systems
        this.input    = new Input();
        this.audio    = new AudioManager();
        this.camera   = new Camera(CANVAS_W, CANVAS_H);
        this.ui       = new UI(this.canvas);
        this.renderer = new Renderer(this.ctx);

        // World
        this.level    = new Level();
        this.player   = null;
        this.enemies  = [];
        this.coins    = [];
        this.items    = [];        // mushrooms, etc.
        this.effects  = [];        // particles, pops

        // HUD state
        this.score     = 0;
        this.coinCount = 0;
        this.lives     = 3;
        this.timer     = 300;
        this._timerAcc = 0;

        // Game state
        this.state     = 'START';
        this.deadTimer = 0;

        // Respawn tracking
        this._checkpointActive = false;
        this._playerWasBig     = false;

        // Resize canvas to fit window
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        // Start loop
        this._lastTime = 0;
        requestAnimationFrame(ts => this._loop(ts));
    }

    /* ====================================================================== */
    /* Initialisation                                                          */
    /* ====================================================================== */

    _resizeCanvas() {
        const scaleX = window.innerWidth  / CANVAS_W;
        const scaleY = window.innerHeight / CANVAS_H;
        const scale  = Math.min(scaleX, scaleY);
        this.canvas.width  = CANVAS_W;
        this.canvas.height = CANVAS_H;
        this.canvas.style.width  = (CANVAS_W * scale) + 'px';
        this.canvas.style.height = (CANVAS_H * scale) + 'px';
    }

    _initLevel() {
        this.level   = new Level();
        this.enemies = this.level.createEnemies();
        this.coins   = this.level.createCoins();
        this.items   = [];
        this.effects = [];
        this._checkpointActive = false;
        this._playerWasBig     = false;
        this._spawnPlayer();
    }

    _spawnPlayer() {
        const spawnX = this._checkpointActive ? this.level.checkpointX + 10 : 50;
        this.player  = new Player(spawnX, GROUND_Y, this._playerWasBig);
        this.camera.x = Math.max(0, this.player.x - CANVAS_W / 2);
    }

    _resetGame() {
        this.score     = 0;
        this.coinCount = 0;
        this.lives     = 3;
        this.timer     = 300;
        this._timerAcc = 0;
        this._initLevel();
        this.state = 'PLAYING';
    }

    /* ====================================================================== */
    /* Main loop                                                               */
    /* ====================================================================== */

    _loop(timestamp) {
        const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
        this._lastTime = timestamp;

        this.input.update();

        switch (this.state) {
            case 'START':    this._updateStart();          break;
            case 'PLAYING':  this._update(dt);             break;
            case 'DEAD':     this._updateDead(dt);         break;
            case 'GAMEOVER': this._updateGameOver();       break;
            case 'VICTORY':  this._updateVictory();        break;
        }

        this._render();
        requestAnimationFrame(ts => this._loop(ts));
    }

    /* ====================================================================== */
    /* State handlers                                                          */
    /* ====================================================================== */

    _updateStart() {
        if (this.input.isEnterJustPressed()) {
            this.audio.resume();
            this._resetGame();
        }
    }

    _updateGameOver() {
        if (this.input.isEnterJustPressed()) {
            this._resetGame();
        }
    }

    _updateVictory() {
        if (this.input.isEnterJustPressed()) {
            this.state = 'START';
        }
    }

    _updateDead(dt) {
        // Continue animating death (player arc), then proceed
        this.deadTimer -= dt;
        if (this.player) {
            const step = dt * 60;
            this.player.vy += GRAVITY * step;
            this.player.y  += this.player.vy * step;
        }

        if (this.deadTimer <= 0) {
            this.lives--;
            if (this.lives <= 0) {
                this.state = 'GAMEOVER';
            } else {
                // Respawn
                this._spawnPlayer();
                this.timer     = 300;
                this._timerAcc = 0;
                this.state     = 'PLAYING';
                // Re-create enemies (but keep checkpoint state)
                this.enemies = this.level.createEnemies();
                this.items   = [];
                this.effects = [];
            }
        }
    }

    /* ====================================================================== */
    /* Core update (PLAYING state)                                            */
    /* ====================================================================== */

    _update(dt) {
        /* --- Timer -------------------------------------------------------- */
        this._timerAcc += dt;
        if (this._timerAcc >= 1) {
            this._timerAcc -= 1;
            this.timer = Math.max(0, this.timer - 1);
            if (this.timer === 0) this._killPlayer();
        }

        /* --- Player ------------------------------------------------------- */
        this.player.update(dt, this.input, this);

        if (this.player.dead) {
            if (this.player.deathTimer <= 0) {
                this._killPlayer();
            }
            return;   // no more updates while death anim plays
        }

        /* --- Enemies ------------------------------------------------------ */
        for (const e of this.enemies) {
            if (!e.alive || e.stomped) continue;

            // Apply gravity + vertical integration
            const step = dt * 60;
            e.vy += GRAVITY * step;
            if (e.vy > MAX_FALL_SPD) e.vy = MAX_FALL_SPD;
            e.y += e.vy * step;

            // Vertical collision
            this.resolveVertical(e, false);

            // Horizontal update (AI)
            e.update(dt);

            // Horizontal collision against solids
            this.resolveHorizontal(e, false);

            // Kill enemies that fall off the world
            if (e.y > DEATH_Y) e.alive = false;
        }

        // Remove dead enemies whose animation has finished
        this.enemies = this.enemies.filter(e => e.alive);

        /* --- Moving platforms --------------------------------------------- */
        for (const mp of this.level.movingPlatforms) {
            const step = dt * 60;
            mp.x += mp.speed * mp.dir * step;
            if (mp.x + mp.width >= mp.maxX) { mp.x = mp.maxX - mp.width; mp.dir = -1; }
            if (mp.x <= mp.minX)            { mp.x = mp.minX;            mp.dir =  1; }
            mp.vx = mp.speed * mp.dir;      // used by player.js ride logic
        }

        /* --- Mushroom items ----------------------------------------------- */
        for (const item of this.items) {
            if (item instanceof MushroomItem) item.update(dt, this);
        }
        this.items = this.items.filter(it => it.active);

        /* --- Effects ------------------------------------------------------ */
        for (const fx of this.effects) fx.update(dt);
        this.effects = this.effects.filter(fx => !fx.done);

        /* --- Block updates ------------------------------------------------ */
        for (const b of this.level.questionBlocks) b.update(dt);
        for (const b of this.level.brickBlocks)    b.update(dt);

        /* --- Coin update -------------------------------------------------- */
        for (const c of this.coins) c.update(dt);

        /* --- Player ↔ Enemy collision ------------------------------------- */
        this._checkPlayerEnemyCollision();

        /* --- Player ↔ Coin ------------------------------------------------ */
        this._checkPlayerCoinCollision();

        /* --- Player ↔ Mushroom item --------------------------------------- */
        this._checkPlayerItemCollision();

        /* --- Checkpoint --------------------------------------------------- */
        this._checkCheckpoint();

        /* --- End goal ----------------------------------------------------- */
        this._checkEndGoal(dt);

        /* --- Player out-of-bounds (fell into pit) ------------------------- */
        if (this.player.y > DEATH_Y) this._killPlayer();

        /* --- Camera ------------------------------------------------------- */
        this.camera.follow(this.player, LEVEL_WIDTH);
    }

    /* ====================================================================== */
    /* Collision resolution helpers (used by Player and Goomba)               */
    /* ====================================================================== */

    /**
     * Resolves horizontal (X-axis) overlaps between entity and solid tiles.
     * `isPlayer` controls whether block-hit logic (from top/below) fires.
     */
    resolveHorizontal(entity, isPlayer) {
        const solids = this.level.getAllSolids();

        for (const s of solids) {
            // Always use the nominal (non-animated) y for physics
            if (!_aabbOverlap(entity.x, entity.y, entity.width, entity.height,
                              s.x, s.y, s.width, s.height)) continue;

            const ol = (entity.x + entity.width) - s.x;
            const or = (s.x + s.width) - entity.x;

            if (ol < or) {
                entity.x = s.x - entity.width;
                if (!isPlayer) entity.vx =  Math.abs(entity.vx);  // enemy bounces
                else           entity.vx = 0;
            } else {
                entity.x = s.x + s.width;
                if (!isPlayer) entity.vx = -Math.abs(entity.vx);  // enemy bounces
                else           entity.vx = 0;
            }
        }

        // Level right boundary
        if (entity.x + entity.width > LEVEL_WIDTH) {
            entity.x = LEVEL_WIDTH - entity.width;
            entity.vx = 0;
        }
    }

    /**
     * Resolves vertical (Y-axis) overlaps.
     * Checks ground segments, solid tile tops (landing), and solid tile
     * bottoms (block-hit from below).
     */
    resolveVertical(entity, isPlayer) {
        const solids = this.level.getAllSolids();

        // --- Solid tiles (use nominal y, not visual bump offset) -----------
        for (const s of solids) {
            if (!_aabbOverlap(entity.x, entity.y, entity.width, entity.height,
                              s.x, s.y, s.width, s.height)) continue;

            const ot = (entity.y + entity.height) - s.y;      // overlap from top
            const ob = (s.y + s.height) - entity.y;           // overlap from bottom

            if (ot < ob) {
                // Entity landed on top of tile
                entity.y = s.y - entity.height;
                entity.vy = 0;
                entity.onGround = true;
            } else {
                // Entity hit the bottom of the tile (only relevant when moving up)
                if (entity.vy < 0) {
                    entity.y = s.y + s.height;
                    entity.vy = 0;
                    // Trigger block
                    if (isPlayer && s.onHit) {
                        s.onHit(this);
                    }
                }
            }
        }

        // --- Moving platforms (one-way: land on top when falling) ----------
        for (const mp of this.level.movingPlatforms) {
            if (!_aabbOverlap(entity.x, entity.y, entity.width, entity.height,
                              mp.x, mp.y, mp.width, mp.height)) continue;

            const ot = (entity.y + entity.height) - mp.y;
            const ob = (mp.y + mp.height) - entity.y;

            if (ot < ob && entity.vy >= 0) {
                entity.y = mp.y - entity.height;
                entity.vy = 0;
                entity.onGround  = true;
                if (isPlayer) entity.onPlatform = mp;
            }
        }

        // --- Main ground: check under centre, left foot, right foot --------
        for (const checkX of [
            entity.x + entity.width / 2,
            entity.x + 2,
            entity.x + entity.width - 3,
        ]) {
            const gy = this.level.groundYAt(checkX);
            if (gy !== null && entity.y + entity.height >= gy && entity.vy >= 0) {
                entity.y = gy - entity.height;
                entity.vy = 0;
                entity.onGround = true;
            }
        }
    }

    /* ====================================================================== */
    /* Collision query helpers (used by MushroomItem)                         */
    /* ====================================================================== */

    /** Return the first solid tile overlapping the given AABB (or null). */
    getSolidAt(x, y, w, h) {
        for (const s of this.level.getAllSolids()) {
            if (_aabbOverlap(x, y, w, h, s.x, s.y, s.width, s.height)) return s;
        }
        return null;
    }

    /** Return the first solid tile whose top surface is directly below the AABB. */
    getSolidBelow(x, y, w, h) {
        for (const s of this.level.getAllSolids()) {
            if (_aabbOverlap(x, y + 2, w, h, s.x, s.y, s.width, s.height) &&
                y + h <= s.y + 8) {
                return s;
            }
        }
        return null;
    }

    /* ====================================================================== */
    /* Game event checks                                                       */
    /* ====================================================================== */

    _checkPlayerEnemyCollision() {
        const p = this.player;
        for (const e of this.enemies) {
            if (!e.alive || e.stomped) continue;
            if (!_aabbOverlap(p.x, p.y, p.width, p.height, e.x, e.y, e.width, e.height)) continue;

            // Stomp check: player's feet vs enemy's top third
            const pFeet = p.y + p.height;
            const eMid  = e.y + e.height * 0.4;

            if (p.vy > 0.5 && pFeet <= eMid + 8) {
                // Stomp!
                e.stomp();
                this.score += 200;
                // Bounce player up
                p.vy = JUMP_FORCE * 0.55;
                p.onGround = false;
                this.audio.stomp();
            } else {
                // Side / bottom hit — take damage
                p.takeDamage(this);
            }
        }
    }

    _checkPlayerCoinCollision() {
        const p = this.player;
        for (const c of this.coins) {
            if (c.collected) continue;
            if (_aabbOverlap(p.x, p.y, p.width, p.height, c.x, c.y, c.width, c.height)) {
                c.collected = true;
                this.addCoin(50);
                this.audio.coin();
            }
        }
    }

    _checkPlayerItemCollision() {
        const p = this.player;
        for (const item of this.items) {
            if (!item.active || item.collected) continue;
            if (item instanceof MushroomItem &&
                _aabbOverlap(p.x, p.y, p.width, p.height, item.x, item.y, item.width, item.height)) {
                item.active    = false;
                item.collected = true;
                if (!p.big) {
                    p.setBig(true);
                    this._playerWasBig = true;
                }
                this.score += 1000;
                this.audio.powerup();
            }
        }
    }

    _checkCheckpoint() {
        if (this.level.checkpoint.activated) return;
        const cp = this.level.checkpoint;
        const p  = this.player;
        if (p.x + p.width >= cp.x && p.x <= cp.x + TILE_SIZE * 2) {
            cp.activated = true;
            this._checkpointActive = true;
            this.audio.checkpoint();
            this.score += 500;
        }
    }

    _checkEndGoal(dt) {
        const goal = this.level.endGoal;
        if (goal.reached) {
            // Animate flag sliding down
            if (goal.flagSliding) {
                goal.flagY = Math.min(goal.flagY + 200 * dt, GROUND_Y - 36);
                if (goal.flagY >= GROUND_Y - 36) {
                    // Wait a moment then show victory
                    if (!this._victoryTimer) this._victoryTimer = 1.8;
                }
            }
            if (this._victoryTimer) {
                this._victoryTimer -= dt;
                if (this._victoryTimer <= 0) {
                    this._victoryTimer = 0;
                    this.state = 'VICTORY';
                    this.audio.levelComplete();
                }
            }
            return;
        }

        const p    = this.player;
        const pole = { x: goal.x + 15, y: goal.poleY, width: 6, height: goal.poleH };

        if (_aabbOverlap(p.x, p.y, p.width, p.height, pole.x, pole.y, pole.width, pole.height)) {
            goal.reached      = true;
            goal.flagSliding  = true;
            this.score        += 2000;
            // Freeze player at flag
            p.vx = 0;
            p.vy = 0;
        }
    }

    _killPlayer() {
        if (this.state === 'DEAD') return;
        this.state     = 'DEAD';
        this.deadTimer = 1.0;   // brief pause before respawn/game-over
        this._playerWasBig = false;
        if (this.player) this.player.die(this);
    }

    /* ====================================================================== */
    /* Score / coin helpers                                                    */
    /* ====================================================================== */
    addCoin(points) {
        this.coinCount++;
        this.score += points;
        // Extra life every 100 coins
        if (this.coinCount % 100 === 0) {
            this.lives++;
            this.audio.powerup();
        }
    }

    /* ====================================================================== */
    /* Rendering                                                               */
    /* ====================================================================== */
    _render() {
        const ctx  = this.ctx;
        const game = this;

        switch (this.state) {
            case 'START':
                // Draw a static background + start screen overlay
                this.renderer._drawBackground(this.camera);
                this.ui.drawStartScreen(ctx);
                break;

            case 'PLAYING':
            case 'DEAD':
                this.renderer.render(game);
                this.ui.drawHUD(ctx, game);
                if (this.state === 'DEAD' && this.lives > 0) {
                    this.ui.drawDeathOverlay(ctx, this.lives - 1);
                }
                break;

            case 'GAMEOVER':
                this.renderer.render(game);
                this.ui.drawGameOverScreen(ctx, this.score);
                break;

            case 'VICTORY':
                this.renderer.render(game);
                this.ui.drawVictoryScreen(ctx, this.score, this.coinCount);
                break;
        }
    }
}

/* ====================================================================== */
/* AABB overlap helper                                                      */
/* ====================================================================== */
function _aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx &&
           ay < by + bh && ay + ah > by;
}

/* ====================================================================== */
/* Boot                                                                     */
/* ====================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
