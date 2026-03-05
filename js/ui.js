/**
 * ui.js — HUD (score, coins, lives, timer) and overlay screens
 *         (start, game-over, victory).
 */
class UI {
    constructor(canvas) {
        this.canvas = canvas;
    }

    /* ====================================================================== */
    /* HUD (drawn on top of the game world, not in camera space)              */
    /* ====================================================================== */
    drawHUD(ctx, game) {
        ctx.save();
        // Semi-transparent dark bar at top
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.fillRect(0, 0, CANVAS_W, 34);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textBaseline = 'middle';

        // Score
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', 12, 11);
        ctx.fillText(String(game.score).padStart(7, '0'), 12, 25);

        // Coin icon + count
        this._drawCoinIcon(ctx, 130, 17);
        ctx.textAlign = 'left';
        ctx.fillText('×' + String(game.coinCount).padStart(2, '0'), 148, 18);

        // Lives
        ctx.textAlign = 'left';
        this._drawHeartIcon(ctx, 220, 17);
        ctx.fillText('×' + game.lives, 236, 18);

        // World name
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#FFD';
        ctx.fillText('SUNNY MEADOW RUN', CANVAS_W / 2, 11);

        // Timer
        ctx.textAlign = 'right';
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('TIME', CANVAS_W - 12, 11);
        const t = Math.ceil(game.timer);
        ctx.fillStyle = t < 60 ? '#FF4444' : '#fff';
        ctx.fillText(String(t).padStart(3, '0'), CANVAS_W - 12, 25);

        ctx.restore();
    }

    _drawCoinIcon(ctx, cx, cy) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF176';
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawHeartIcon(ctx, cx, cy) {
        ctx.fillStyle = '#FF4466';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 5);
        ctx.bezierCurveTo(cx - 10, cy - 3, cx - 14, cy + 6, cx, cy + 14);
        ctx.bezierCurveTo(cx + 14, cy + 6, cx + 10, cy - 3, cx, cy + 5);
        ctx.fill();
    }

    /* ====================================================================== */
    /* Start screen                                                            */
    /* ====================================================================== */
    drawStartScreen(ctx) {
        this._drawOverlay(ctx);

        // Title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = 'bold 52px Arial';
        ctx.fillText('☀ Sunny Meadow Run', CANVAS_W / 2 + 3, CANVAS_H / 2 - 80 + 3);

        // Title gradient
        const g = ctx.createLinearGradient(0, CANVAS_H / 2 - 110, 0, CANVAS_H / 2 - 50);
        g.addColorStop(0, '#FFE030');
        g.addColorStop(0.5, '#FF9800');
        g.addColorStop(1, '#FF5722');
        ctx.fillStyle = g;
        ctx.font = 'bold 52px Arial';
        ctx.fillText('☀ Sunny Meadow Run', CANVAS_W / 2, CANVAS_H / 2 - 80);

        // Subtitle
        ctx.fillStyle = '#E0F8FF';
        ctx.font = '18px Arial';
        ctx.fillText('A cheerful 2D platformer adventure!', CANVAS_W / 2, CANVAS_H / 2 - 28);

        // Controls summary
        ctx.fillStyle = '#ccc';
        ctx.font = '14px Arial';
        ctx.fillText('← → / A D   Move      ↑ / W / Space   Jump      Shift   Run', CANVAS_W / 2, CANVAS_H / 2 + 18);

        // Blinking prompt
        const blink = Math.floor(Date.now() / 600) % 2 === 0;
        if (blink) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px Arial';
            ctx.fillText('Press ENTER to Start', CANVAS_W / 2, CANVAS_H / 2 + 62);
        }

        ctx.restore();
    }

    /* ====================================================================== */
    /* Game-over screen                                                        */
    /* ====================================================================== */
    drawGameOverScreen(ctx, score) {
        this._drawOverlay(ctx);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#FF3333';
        ctx.font = 'bold 60px Arial';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 60);

        ctx.fillStyle = '#fff';
        ctx.font = '22px Arial';
        ctx.fillText('Final Score: ' + String(score).padStart(7, '0'), CANVAS_W / 2, CANVAS_H / 2);

        const blink = Math.floor(Date.now() / 600) % 2 === 0;
        if (blink) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Press ENTER to Play Again', CANVAS_W / 2, CANVAS_H / 2 + 55);
        }

        ctx.restore();
    }

    /* ====================================================================== */
    /* Victory screen                                                          */
    /* ====================================================================== */
    drawVictoryScreen(ctx, score, coins) {
        this._drawOverlay(ctx, 'rgba(0,80,0,0.75)');
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Animated rainbow text effect
        const h = (Date.now() / 20) % 360;
        ctx.fillStyle = `hsl(${h}, 100%, 65%)`;
        ctx.font = 'bold 56px Arial';
        ctx.fillText('Level Complete!', CANVAS_W / 2, CANVAS_H / 2 - 80);

        ctx.fillStyle = '#fff';
        ctx.font = '22px Arial';
        ctx.fillText('Score: ' + String(score).padStart(7, '0'), CANVAS_W / 2, CANVAS_H / 2 - 18);
        ctx.fillText('Coins: ' + coins, CANVAS_W / 2, CANVAS_H / 2 + 14);

        const blink = Math.floor(Date.now() / 700) % 2 === 0;
        if (blink) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Press ENTER to Play Again', CANVAS_W / 2, CANVAS_H / 2 + 70);
        }

        ctx.restore();
    }

    /* ====================================================================== */
    /* Respawn / death overlay                                                 */
    /* ====================================================================== */
    drawDeathOverlay(ctx, lives) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        if (lives > 0) {
            ctx.fillText('You lost a life! ♥ ×' + lives + ' remaining…', CANVAS_W / 2, CANVAS_H / 2);
        }
        ctx.restore();
    }

    /* ====================================================================== */
    /* Internal helpers                                                        */
    /* ====================================================================== */
    _drawOverlay(ctx, color = 'rgba(0,0,0,0.62)') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
}
