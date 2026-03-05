/**
 * camera.js — Horizontal scrolling camera that follows the player.
 */
class Camera {
    constructor(viewWidth, viewHeight) {
        this.x = 0;
        this.y = 0;
        this.viewWidth  = viewWidth;
        this.viewHeight = viewHeight;
    }

    /**
     * Smoothly follow a target entity, clamped to the level bounds.
     * @param {object} target     - entity with .x, .width
     * @param {number} levelWidth - total pixel width of level
     */
    follow(target, levelWidth) {
        // Centre the target in the viewport
        const ideal = target.x + target.width / 2 - this.viewWidth / 2;
        // Lerp toward ideal position for a slight lag feel
        this.x += (ideal - this.x) * 0.12;
        // Clamp
        this.x = Math.max(0, Math.min(this.x, levelWidth - this.viewWidth));
    }

    /**
     * Returns true if the world-space rectangle is (partially) on screen.
     */
    isVisible(wx, wy, w, h) {
        return wx + w > this.x && wx < this.x + this.viewWidth &&
               wy + h > this.y && wy < this.y + this.viewHeight;
    }
}
