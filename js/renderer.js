/**
 * renderer.js — All Canvas 2D drawing code.
 * No external image assets — everything is drawn programmatically.
 */
class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this._cloudPositions = [
            { rx: 0.05, ry: 0.10, s: 1.1 },
            { rx: 0.22, ry: 0.06, s: 0.85 },
            { rx: 0.40, ry: 0.13, s: 1.3 },
            { rx: 0.60, ry: 0.07, s: 0.95 },
            { rx: 0.78, ry: 0.12, s: 1.0 },
            { rx: 0.90, ry: 0.05, s: 0.8 },
        ];
    }

    /* ====================================================================== */
    /* Main render entry point                                                 */
    /* ====================================================================== */
    render(game) {
        const ctx = this.ctx;
        const cam = game.camera;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        this._drawBackground(cam);

        // World objects (translate by camera)
        ctx.save();
        ctx.translate(-Math.round(cam.x), 0);

        this._drawGround(game.level);
        this._drawPipes(game.level.pipes);
        this._drawBrickBlocks(game.level.brickBlocks, cam);
        this._drawQuestionBlocks(game.level.questionBlocks, cam);
        this._drawCoins(game.coins, cam);
        this._drawMovingPlatforms(game.level.movingPlatforms, cam);
        this._drawCheckpoint(game.level.checkpoint, cam);
        this._drawEndGoal(game.level.endGoal, cam);

        // Items (mushroom)
        for (const item of game.items) {
            if (item.active) this._drawMushroom(item);
        }

        // Enemies
        for (const enemy of game.enemies) {
            if (enemy.alive || enemy.stomped) this._drawGoomba(enemy, cam);
        }

        // Effects (particles, coin pops)
        for (const fx of game.effects) {
            this._drawEffect(fx);
        }

        // Player
        if (!game.player.dead || game.player.deathTimer > 0) {
            this._drawPlayer(game.player);
        }

        ctx.restore();
    }

    /* ====================================================================== */
    /* Background (parallax sky + hills + clouds)                             */
    /* ====================================================================== */
    _drawBackground(cam) {
        const ctx = this.ctx;

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        sky.addColorStop(0,    '#5EC8F0');
        sky.addColorStop(0.7,  '#9EDFF8');
        sky.addColorStop(1.0,  '#C8F0D8');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Far hills (slow parallax)
        this._drawHills(cam.x * 0.2, '#8ED86E', 3);

        // Near hills (medium parallax)
        this._drawHills(cam.x * 0.4, '#70C44A', 2);

        // Clouds (very slow parallax)
        this._drawClouds(cam.x * 0.08);
    }

    _drawHills(offset, color, count) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        for (let i = 0; i < count + 1; i++) {
            const cx = (i * (CANVAS_W / count)) - (offset % (CANVAS_W / count));
            const r  = 100 + i * 20;
            ctx.beginPath();
            ctx.ellipse(cx, CANVAS_H * 0.72, r, r * 0.55, 0, Math.PI, 0);
            ctx.fill();
        }
    }

    _drawClouds(offset) {
        const ctx = this.ctx;
        for (const c of this._cloudPositions) {
            const baseX = (c.rx * CANVAS_W * 3 - offset) % (CANVAS_W * 2.5);
            if (baseX > -200 && baseX < CANVAS_W + 200) {
                this._drawCloud(baseX, c.ry * CANVAS_H * 0.5, c.s);
            }
        }
    }

    _drawCloud(cx, cy, scale) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        const R = 28 * scale;
        [[0, 0, R], [-R*0.9, R*0.25, R*0.75], [R*0.9, R*0.25, R*0.75], [0, R*0.4, R*0.7]].forEach(([dx, dy, r]) => {
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /* ====================================================================== */
    /* Ground tiles                                                            */
    /* ====================================================================== */
    _drawGround(level) {
        const ctx = this.ctx;
        const T   = TILE_SIZE;

        for (const seg of level.groundSegments) {
            const x = seg.x1;
            const w = seg.x2 - seg.x1;

            // Grass top strip
            ctx.fillStyle = '#5DB546';
            ctx.fillRect(x, GROUND_Y, w, T * 0.45);

            // Dirt body
            ctx.fillStyle = '#C87941';
            ctx.fillRect(x, GROUND_Y + T * 0.45, w, CANVAS_H - GROUND_Y - T * 0.45);

            // Grass detail line
            ctx.fillStyle = '#76D462';
            ctx.fillRect(x, GROUND_Y, w, 4);

            // Tile seams on grass top
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            for (let tx = x; tx < seg.x2; tx += T) {
                ctx.beginPath();
                ctx.moveTo(tx, GROUND_Y);
                ctx.lineTo(tx, GROUND_Y + T * 0.45);
                ctx.stroke();
            }

            // Dirt tile seams
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            for (let tx = x; tx < seg.x2; tx += T) {
                for (let ty = GROUND_Y + T * 0.45; ty < CANVAS_H; ty += T) {
                    ctx.strokeRect(tx + 0.5, ty + 0.5, T - 1, T - 1);
                }
            }
        }
    }

    /* ====================================================================== */
    /* Pipes                                                                   */
    /* ====================================================================== */
    _drawPipes(pipes) {
        const ctx = this.ctx;
        for (const p of pipes) {
            const T = TILE_SIZE;
            const x = p.x, y = p.y, w = p.width, h = p.height;

            // Shaft
            ctx.fillStyle = '#3CA83C';
            ctx.fillRect(x + 3, y + T, w - 6, h - T);

            // Shaft highlight
            ctx.fillStyle = '#52D052';
            ctx.fillRect(x + 3, y + T, 8, h - T);

            // Cap (slightly wider)
            ctx.fillStyle = '#3CA83C';
            ctx.fillRect(x - 2, y, w + 4, T);

            // Cap highlight
            ctx.fillStyle = '#52D052';
            ctx.fillRect(x - 2, y, 10, T);

            // Cap outline
            ctx.strokeStyle = '#1E6A1E';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2 + 1, y + 1, w + 4 - 2, T - 2);
            ctx.strokeRect(x + 3 + 1, y + T + 1, w - 6 - 2, h - T - 2);
        }
    }

    /* ====================================================================== */
    /* Question blocks                                                         */
    /* ====================================================================== */
    _drawQuestionBlocks(blocks, cam) {
        const ctx = this.ctx;
        for (const b of blocks) {
            if (!cam.isVisible(b.x, b.y, b.width, b.height)) continue;
            const T = TILE_SIZE;
            const x = b.x;
            const y = b.drawY;   // includes bump animation offset

            if (b.used) {
                // Used — grey/brown
                ctx.fillStyle = '#9E7B5C';
                ctx.fillRect(x, y, T, T);
                ctx.fillStyle = '#7A5C3E';
                ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
            } else {
                // Active — animated yellow
                const pulse = Math.sin(b.animTimer * 4) * 0.08 + 0.92;
                ctx.fillStyle = `hsl(45, 90%, ${Math.round(52 * pulse)}%)`;
                ctx.fillRect(x, y, T, T);
                // Inner bevel
                ctx.fillStyle = `hsl(45, 90%, ${Math.round(70 * pulse)}%)`;
                ctx.fillRect(x + 2, y + 2, T - 4, 4);
                ctx.fillRect(x + 2, y + 2, 4, T - 4);
                ctx.fillStyle = `hsl(35, 80%, ${Math.round(36 * pulse)}%)`;
                ctx.fillRect(x + T - 4, y + 2, 2, T - 4);
                ctx.fillRect(x + 2, y + T - 4, T - 4, 2);
                // "?" text
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x + T / 2, y + T / 2 + 1);
            }
            // Border
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.75, y + 0.75, T - 1.5, T - 1.5);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    /* ====================================================================== */
    /* Brick blocks                                                            */
    /* ====================================================================== */
    _drawBrickBlocks(blocks, cam) {
        const ctx = this.ctx;
        for (const b of blocks) {
            if (b.broken) continue;
            if (!cam.isVisible(b.x, b.y, b.width, b.height)) continue;
            const T = TILE_SIZE;
            const x = b.x;
            const y = b.drawY;

            ctx.fillStyle = '#B25A2A';
            ctx.fillRect(x, y, T, T);
            // Mortar grid
            ctx.fillStyle = '#D0784A';
            // Top half bricks
            ctx.fillRect(x + 2, y + 2, T / 2 - 3, T / 2 - 3);
            ctx.fillRect(x + T / 2 + 1, y + 2, T / 2 - 3, T / 2 - 3);
            // Bottom half bricks (offset)
            ctx.fillRect(x + 2, y + T / 2 + 1, T / 4 - 1, T / 2 - 3);
            ctx.fillRect(x + T / 4 + 2, y + T / 2 + 1, T / 2 - 2, T / 2 - 3);
            ctx.fillRect(x + T * 3/4 + 1, y + T / 2 + 1, T / 4 - 3, T / 2 - 3);

            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.75, y + 0.75, T - 1.5, T - 1.5);
        }
    }

    /* ====================================================================== */
    /* Floating coins                                                          */
    /* ====================================================================== */
    _drawCoins(coins, cam) {
        const ctx = this.ctx;
        for (const c of coins) {
            if (c.collected) continue;
            if (!cam.isVisible(c.x, c.y, c.width, c.height)) continue;
            const spin = Math.abs(Math.cos(c.animTimer * 4)) * c.width;
            const cx   = c.x + (c.width - spin) / 2;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(c.x + c.width / 2, c.y + c.height / 2, spin / 2, c.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFF176';
            ctx.beginPath();
            ctx.ellipse(c.x + c.width / 2 - 2, c.y + c.height / 2 - 2, spin / 5, c.height / 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ====================================================================== */
    /* Moving platforms                                                        */
    /* ====================================================================== */
    _drawMovingPlatforms(platforms, cam) {
        const ctx = this.ctx;
        for (const p of platforms) {
            if (!cam.isVisible(p.x, p.y, p.width, p.height)) continue;
            // Wood plank look
            ctx.fillStyle = '#8B5E2F';
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = '#A9753A';
            ctx.fillRect(p.x + 1, p.y + 1, p.width - 2, p.height / 2 - 1);
            // Plank seams
            ctx.strokeStyle = 'rgba(0,0,0,0.25)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const sx = p.x + (p.width / 3) * (i + 1);
                ctx.beginPath();
                ctx.moveTo(sx, p.y);
                ctx.lineTo(sx, p.y + p.height);
                ctx.stroke();
            }
            ctx.strokeStyle = '#5A3018';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x + 1, p.y + 1, p.width - 2, p.height - 2);
        }
    }

    /* ====================================================================== */
    /* Checkpoint flag                                                         */
    /* ====================================================================== */
    _drawCheckpoint(cp, cam) {
        const ctx = this.ctx;
        const x   = cp.x;
        const poleH = GROUND_Y - 7 * TILE_SIZE;

        if (!cam.isVisible(x - 10, 7 * TILE_SIZE, 50, poleH + 10)) return;

        // Pole
        ctx.fillStyle = '#AAA';
        ctx.fillRect(x + 14, GROUND_Y - poleH, 4, poleH);

        // Flag
        const flagColor = cp.activated ? '#FF6B35' : '#999';
        ctx.fillStyle = flagColor;
        ctx.beginPath();
        ctx.moveTo(x + 18, GROUND_Y - poleH);
        ctx.lineTo(x + 44, GROUND_Y - poleH + 12);
        ctx.lineTo(x + 18, GROUND_Y - poleH + 24);
        ctx.fill();

        // "CHECKPOINT" label
        if (!cp.activated) {
            ctx.fillStyle = '#555';
        } else {
            ctx.fillStyle = '#FF6B35';
        }
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHECK', x + 32, GROUND_Y - poleH + 36);
        ctx.textAlign = 'left';

        // Base
        ctx.fillStyle = '#888';
        ctx.fillRect(x + 8, GROUND_Y - 6, 16, 6);
    }

    /* ====================================================================== */
    /* End goal (flag pole)                                                    */
    /* ====================================================================== */
    _drawEndGoal(goal, cam) {
        const ctx = this.ctx;
        const x   = goal.x;
        if (!cam.isVisible(x - 10, goal.poleY, 80, goal.poleH + 20)) return;

        // Pole
        ctx.fillStyle = '#888';
        ctx.fillRect(x + 15, goal.poleY, 4, goal.poleH);

        // Ball on top
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + 17, goal.poleY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Flag
        const fy = goal.flagY;
        ctx.fillStyle = '#FF3B3B';
        ctx.beginPath();
        ctx.moveTo(x + 19, fy);
        ctx.lineTo(x + 50, fy + 14);
        ctx.lineTo(x + 19, fy + 28);
        ctx.fill();

        // "GOAL" text on flag
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('GOAL', x + 22, fy + 18);
    }

    /* ====================================================================== */
    /* Mushroom power-up item                                                  */
    /* ====================================================================== */
    _drawMushroom(m) {
        const ctx = this.ctx;
        const cx  = m.x + m.width / 2;
        const cy  = m.y + m.height / 2;
        const r   = m.width / 2;

        // Stem
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(m.x + 5, m.y + r, m.width - 10, r - 2);

        // Cap
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.arc(cx, m.y + r, r, Math.PI, 0);
        ctx.fill();

        // White spots on cap
        ctx.fillStyle = '#fff';
        [[-6, -3, 4], [5, -5, 3.5], [0, -8, 3]].forEach(([dx, dy, sr]) => {
            ctx.beginPath();
            ctx.arc(cx + dx, m.y + r + dy, sr, 0, Math.PI * 2);
            ctx.fill();
        });

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(m.x + 5, m.y + r + 2, 5, 5);
        ctx.fillRect(m.x + m.width - 10, m.y + r + 2, 5, 5);
        ctx.fillStyle = '#000';
        ctx.fillRect(m.x + 7, m.y + r + 4, 2, 2);
        ctx.fillRect(m.x + m.width - 8, m.y + r + 4, 2, 2);
    }

    /* ====================================================================== */
    /* Player                                                                  */
    /* ====================================================================== */
    _drawPlayer(player) {
        const ctx = this.ctx;

        // Blinking when invincible
        if (player.invTimer > 0 && Math.floor(player.invTimer * 10) % 2 === 0) return;

        const x = Math.round(player.x);
        const y = Math.round(player.y);
        const w = player.width;
        const h = player.height;
        const facing = player.facingRight ? 1 : -1;

        ctx.save();
        // Flip for facing direction
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(facing, 1);
        ctx.translate(-w / 2, -h / 2);

        if (player.big) {
            this._drawPlayerBig(ctx, 0, 0, w, h, player);
        } else {
            this._drawPlayerSmall(ctx, 0, 0, w, h, player);
        }

        ctx.restore();
    }

    _drawPlayerSmall(ctx, x, y, w, h) {
        // Hat
        ctx.fillStyle = '#D42B2B';
        ctx.fillRect(x + 2, y, w - 4, 7);
        ctx.fillRect(x, y + 4, w, 5);

        // Face
        ctx.fillStyle = '#FFBB88';
        ctx.fillRect(x + 3, y + 8, w - 6, 8);

        // Eyes & moustache
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w - 8, y + 10, 3, 2);
        ctx.fillStyle = '#5A3010';
        ctx.fillRect(x + 5, y + 14, w - 6, 2);  // moustache

        // Body
        ctx.fillStyle = '#D42B2B';
        ctx.fillRect(x + 2, y + 16, w - 4, 6);

        // Overalls
        ctx.fillStyle = '#3A6FD8';
        ctx.fillRect(x + 4, y + 18, w - 8, 4);

        // Feet
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(x + 1, y + 22, w / 2 - 1, 4);
        ctx.fillRect(x + w / 2, y + 22, w / 2 - 1, 4);
    }

    _drawPlayerBig(ctx, x, y, w, h) {
        // Hat
        ctx.fillStyle = '#D42B2B';
        ctx.fillRect(x + 2, y, w - 4, 9);
        ctx.fillRect(x, y + 5, w, 6);

        // Face
        ctx.fillStyle = '#FFBB88';
        ctx.fillRect(x + 2, y + 10, w - 4, 12);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w - 9, y + 13, 4, 3);

        // Moustache
        ctx.fillStyle = '#5A3010';
        ctx.fillRect(x + 3, y + 19, w - 5, 3);

        // Body
        ctx.fillStyle = '#D42B2B';
        ctx.fillRect(x + 2, y + 22, w - 4, 10);

        // Overalls
        ctx.fillStyle = '#3A6FD8';
        ctx.fillRect(x + 4, y + 24, w - 8, 8);

        // Buttons
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 7, y + 25, 3, 3);

        // Feet
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(x + 1, y + 34, w / 2 - 1, 8);
        ctx.fillRect(x + w / 2, y + 34, w / 2 - 1, 8);
    }

    /* ====================================================================== */
    /* Goomba                                                                  */
    /* ====================================================================== */
    _drawGoomba(g, cam) {
        const ctx = this.ctx;
        if (!cam.isVisible(g.x, g.y, g.width, g.height)) return;

        const x = Math.round(g.x);
        const y = Math.round(g.y);
        const w = g.width;
        let   h = g.height;

        if (g.stomped) {
            // Squished flat
            h = 10;
            const sy = y + g.height - h;
            ctx.fillStyle = '#7B4A1E';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4A2800';
            ctx.fillRect(x + 4, sy + h - 4, 5, 4);
            ctx.fillRect(x + w - 9, sy + h - 4, 5, 4);
            return;
        }

        // Walk animation — bob feet
        const bob = Math.sin(g.animTimer * 8) * 2;

        // Body — brown ellipse
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.55, w / 2, h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body shading
        ctx.fillStyle = '#A0522D';
        ctx.beginPath();
        ctx.ellipse(x + w / 2 - 3, y + h * 0.45, w / 3, h * 0.32, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.28, w / 2, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (white + dark pupils)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.3, y + h * 0.22, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.7, y + h * 0.22, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.28, y + h * 0.23, 3, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.68, y + h * 0.23, 3, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.18, y + h * 0.14);
        ctx.lineTo(x + w * 0.40, y + h * 0.19);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + w * 0.82, y + h * 0.14);
        ctx.lineTo(x + w * 0.60, y + h * 0.19);
        ctx.stroke();

        // Feet
        ctx.fillStyle = '#3A1A00';
        const fi = g.animTimer * 6;
        ctx.fillRect(x + 1,     y + h - 7 + (Math.sin(fi) > 0 ? 0 : 2),  11, 7);
        ctx.fillRect(x + w - 12, y + h - 7 + (Math.sin(fi) > 0 ? 2 : 0), 11, 7);
    }

    /* ====================================================================== */
    /* Effects                                                                 */
    /* ====================================================================== */
    _drawEffect(fx) {
        const ctx = this.ctx;
        if (fx instanceof CoinPopEffect) {
            const alpha = Math.max(0, fx.life / 0.6);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(fx.x + 8, fx.y + 10, 7, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFF176';
            ctx.beginPath();
            ctx.ellipse(fx.x + 6, fx.y + 7, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (fx instanceof BrickDebris) {
            const alpha = Math.max(0, fx.life / 0.7);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#B25A2A';
            ctx.fillRect(fx.x, fx.y, fx.size, fx.size);
            ctx.globalAlpha = 1;
        }
    }
}
