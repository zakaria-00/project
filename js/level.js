/**
 * level.js — All level data: ground segments, solid tiles, enemies,
 *            coins, pipes, moving platform, checkpoint, and end goal.
 *
 * Coordinate system: world pixels, origin top-left.
 * GROUND_Y (416) = top surface of the main ground.
 * Tiles are TILE_SIZE × TILE_SIZE (32 × 32).
 */
class Level {
    constructor() {
        this._build();
    }

    _build() {
        const T = TILE_SIZE;   // 32

        /* ---------------------------------------------------------------- */
        /* Ground segments — horizontal ranges where ground exists          */
        /* (ground top surface is always at GROUND_Y = 416)                 */
        /* ---------------------------------------------------------------- */
        // Gap 1: tiles 27-28 (x 864-928 exclusive)
        // Gap 2: tiles 85-87 (x 2720-2816)
        // Gap 3: tiles 118-120 (x 3776-3872)
        // Gap 4: tiles 160-163 (x 5120-5248)
        this.groundSegments = [
            { x1: 0,        x2: 27 * T  },   // tiles 0-26
            { x1: 29 * T,   x2: 85 * T  },   // tiles 29-84
            { x1: 88 * T,   x2: 118 * T },   // tiles 88-117
            { x1: 121 * T,  x2: 160 * T },   // tiles 121-159
            { x1: 164 * T,  x2: LEVEL_WIDTH },// tiles 164-end
        ];

        /* ---------------------------------------------------------------- */
        /* Pipes (each rendered as two stacked rects: cap + shaft)          */
        /* col = leftmost tile column; h = height in tiles from ground up   */
        /* ---------------------------------------------------------------- */
        // Each pipe is 2 tiles wide
        this.pipes = this._makePipes([
            { col: 33,  h: 2 },    // Section 1 — short
            { col: 108, h: 3 },    // Section 2 — tall
            { col: 148, h: 2 },    // Section 3
            { col: 178, h: 2 },    // Section 3 — near flag
        ]);

        /* ---------------------------------------------------------------- */
        /* Question blocks                                                   */
        /* ---------------------------------------------------------------- */
        this.questionBlocks = [
            // Section 1 — row 8 (y = 256)
            new QuestionBlock(13 * T, 8 * T, 'mushroom'),
            new QuestionBlock(15 * T, 8 * T, 'coin'),
            new QuestionBlock(17 * T, 8 * T, 'coin'),
            new QuestionBlock(19 * T, 8 * T, 'coin'),
            // Section 2 — triple ? row 8
            new QuestionBlock(68 * T, 8 * T, 'coin'),
            new QuestionBlock(69 * T, 8 * T, 'coin'),
            new QuestionBlock(70 * T, 8 * T, 'coin'),
        ];

        /* ---------------------------------------------------------------- */
        /* Brick blocks                                                      */
        /* ---------------------------------------------------------------- */
        const brickDefs = [
            // Between ? blocks — section 1 (row 8)
            [16, 8], [18, 8],
            // Elevated platform — section 2 (row 10 = y 320), tiles 76-86
            ...this._range(76, 87).map(c => [c, 10]),
            // Stacked brick formation — tiles 128-135 (row 10), 130-133 (row 9)
            ...this._range(128, 136).map(c => [c, 10]),
            ...this._range(130, 134).map(c => [c, 9]),
            // Descending staircase before flag (section 3)
            // Step 1 tallest (col 183, rows 8-12), step 2 (col 184, rows 9-12), etc.
            ...this._range(8, 13).map(r => [183, r]),
            ...this._range(9, 13).map(r => [184, r]),
            ...this._range(10, 13).map(r => [185, r]),
            ...this._range(11, 13).map(r => [186, r]),
            ...this._range(12, 13).map(r => [187, r]),
        ];
        this.brickBlocks = brickDefs.map(([c, r]) => new BrickBlock(c * T, r * T));

        /* ---------------------------------------------------------------- */
        /* Floating coins                                                    */
        /* ---------------------------------------------------------------- */
        const coinDefs = [
            // Section 1 — above flat ground (row 9)
            [5, 9], [6, 9], [7, 9], [8, 9], [9, 9],
            // Near gap 1
            [24, 9], [25, 9],
            // Section 2 — over triple ? blocks (row 7)
            [68, 7], [69, 7], [70, 7],
            // On the elevated platform area (row 9)
            [79, 9], [81, 9], [83, 9],
            // Section 3
            [168, 9], [170, 9], [172, 9],
        ];
        this.coins = coinDefs.map(([c, r]) => new Coin(
            c * T + (T - 16) / 2,   // centre coin in tile
            r * T + 4
        ));

        /* ---------------------------------------------------------------- */
        /* Enemies                                                           */
        /* ---------------------------------------------------------------- */
        // [spawnCol, groundRow, leftBoundCol, rightBoundCol]
        // groundRow 13 = main ground (GROUND_Y), row 10 = elevated platform
        const enemyDefs = [
            // Section 1 — 2 goombas
            [22,  13, 18,  27],
            [40,  13, 36,  47],
            // Section 2 — 4 goombas
            [65,  13, 62,  73],
            [79,  10, 77,  86],  // on elevated platform (row 10)
            [100, 13, 97,  107],
            [126, 13, 122, 131],
            // Section 3 — 3 goombas
            [143, 13, 140, 151],
            [152, 13, 148, 159],
            [158, 13, 155, 163],
        ];
        this.enemyDefs = enemyDefs.map(([sc, gr, lb, rb]) => ({
            spawnX:  sc * T,
            spawnY:  gr * T,           // foot Y = tile top = ground surface
            leftBound:  lb * T,
            rightBound: rb * T,
        }));

        /* ---------------------------------------------------------------- */
        /* Moving platform (over gap 2, tiles 85-87)                        */
        /* ---------------------------------------------------------------- */
        this.movingPlatforms = [
            {
                x:    84 * T,
                y:    GROUND_Y - 80,   // hover above gap at a reasonable height
                width:  3 * T,         // 96 px
                height: 14,
                minX: 81 * T,
                maxX: 90 * T,
                speed: 1.3,
                dir:  1,
            },
        ];

        /* ---------------------------------------------------------------- */
        /* Checkpoint                                                        */
        /* ---------------------------------------------------------------- */
        this.checkpoint = {
            x:         60 * T,
            activated: false,
        };
        this.checkpointX = 60 * T;   // respawn x after checkpoint

        /* ---------------------------------------------------------------- */
        /* End goal (flag pole)                                              */
        /* ---------------------------------------------------------------- */
        this.endGoal = {
            x:      195 * T,
            poleY:  4 * T,               // top of pole
            poleH:  GROUND_Y - 4 * T,    // full height to ground
            reached: false,
            // Sliding flag animation
            flagY:   4 * T,
            flagSliding: false,
        };
    }

    /* ---------------------------------------------------------------------- */
    /* Helpers                                                                 */
    /* ---------------------------------------------------------------------- */

    _range(start, end) {
        const a = [];
        for (let i = start; i < end; i++) a.push(i);
        return a;
    }

    _makePipes(defs) {
        return defs.map(({ col, h }) => ({
            x:      col * TILE_SIZE,
            y:      GROUND_Y - h * TILE_SIZE,
            width:  2 * TILE_SIZE,
            height: h * TILE_SIZE,
        }));
    }

    /**
     * Returns the Y value of the ground surface (GROUND_Y) at worldX,
     * or null if worldX is over a gap.
     */
    groundYAt(worldX) {
        for (const seg of this.groundSegments) {
            if (worldX >= seg.x1 && worldX < seg.x2) return GROUND_Y;
        }
        return null;
    }

    /**
     * Create fresh Goomba instances (called when resetting/starting level).
     */
    createEnemies() {
        return this.enemyDefs.map(d => new Goomba(
            d.spawnX,
            d.spawnY,
            d.leftBound,
            d.rightBound
        ));
    }

    /**
     * Create fresh Coin instances.
     */
    createCoins() {
        return this.coins.map(c => new Coin(c.x, c.y));
    }

    /**
     * Return all solid rectangular objects (bricks, ? blocks, pipes).
     * Used by collision detection.
     */
    getAllSolids() {
        const solids = [];

        // Active (non-broken) brick blocks
        for (const b of this.brickBlocks) {
            if (!b.broken) solids.push(b);
        }
        // Question blocks (solid even when used)
        for (const q of this.questionBlocks) {
            solids.push(q);
        }
        // Pipes
        for (const p of this.pipes) {
            solids.push(p);
        }

        return solids;
    }

    /**
     * Return all tiles whose top face can be stood on (for enemy standing check).
     */
    getAllPlatformTops() {
        return this.getAllSolids();
    }

    /** Reset mutable state for a new game. */
    reset() {
        this.checkpoint.activated = false;
        this.endGoal.reached      = false;
        this.endGoal.flagY        = this.endGoal.poleY;
        this.endGoal.flagSliding  = false;

        // Re-instantiate blocks and coins
        this._build();
    }
}
