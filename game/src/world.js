// GOBBLE RUN — the world: what the turkey runs through.
// One clear job: spawn and recycle the scrolling content — fences,
// oven flames, swinging carving knives, haystacks to hide in, corn to
// grab — and answer collision questions. Distances are in world px;
// the game loop converts them to screen px.
import { GROUND_Y, STAGES, mulberry32 } from './config.js';

export const Kind = {
  FENCE: 'fence',
  FLAME: 'flame',
  KNIFE: 'knife',
  HAY: 'hay',
  CORN: 'corn',
  GOLDEN: 'golden',
};

// Spacing rules per stage, in world px between obstacle groups.
const STAGE_RULES = [
  { gapMin: 420, gapMax: 700, kinds: [Kind.FENCE, Kind.HAY, Kind.CORN] },
  { gapMin: 380, gapMax: 620, kinds: [Kind.FENCE, Kind.HAY, Kind.CORN, Kind.FLAME] },
  { gapMin: 340, gapMax: 560, kinds: [Kind.FENCE, Kind.FLAME, Kind.KNIFE, Kind.HAY, Kind.CORN] },
];

export class World {
  constructor(seed) {
    this.rng = mulberry32(seed || 20261127);
    this.items = [];           // { kind, x, y, w, h, taken, phase, ... }
    this.nextSpawnX = 900;
    this.spawnedGolden = false;
  }

  reset(seed) {
    this.items = [];
    this.rng = mulberry32(seed || 20261127);
    this.nextSpawnX = 900;
    this.spawnedGolden = false;
  }

  stageIndex(distanceM) {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (distanceM >= STAGES[i].start) idx = i;
    }
    return idx;
  }

  // Spawn content ahead of the visible world as it scrolls.
  ensureAhead(worldX, distanceM) {
    const rules = STAGE_RULES[this.stageIndex(distanceM)];
    while (this.nextSpawnX < worldX + 1700) {
      const kind = rules.kinds[Math.floor(this.rng() * rules.kinds.length)];
      const x = this.nextSpawnX;
      if (kind === Kind.FENCE) {
        this.items.push({ kind, x, y: GROUND_Y - 64, w: 34, h: 64, hit: false });
      } else if (kind === Kind.FLAME) {
        // Oven flame jet: a hot gap on the floor, jump it or dash past.
        this.items.push({ kind, x, y: GROUND_Y - 70, w: 64, h: 70, phase: this.rng() * Math.PI * 2, hit: false });
      } else if (kind === Kind.KNIFE) {
        // Carving knife swinging from above on a rope.
        this.items.push({ kind, x, y: 150, w: 30, h: 150, phase: this.rng() * Math.PI * 2, hit: false });
      } else if (kind === Kind.HAY) {
        this.items.push({ kind, x, y: GROUND_Y - 64, w: 92, h: 64, hide: false });
      } else if (kind === Kind.CORN) {
        const n = 2 + Math.floor(this.rng() * 3);
        for (let i = 0; i < n; i++) {
          this.items.push({ kind, x: x + i * 46, y: GROUND_Y - 40 - (i % 2) * 46, w: 26, h: 26, taken: false });
        }
      }
      // One golden corn per run, far into the kitchen, worth the risk.
      if (!this.spawnedGolden && distanceM > 2900 && this.nextSpawnX > worldX + 900) {
        this.items.push({ kind: Kind.GOLDEN, x: this.nextSpawnX + 300, y: GROUND_Y - 110, w: 30, h: 30, taken: false });
        this.spawnedGolden = true;
      }
      this.nextSpawnX += rules.gapMin + this.rng() * (rules.gapMax - rules.gapMin);
    }
    // Drop anything far behind the camera.
    this.items = this.items.filter((it) => it.x > worldX - 400);
  }

  // Items overlapping the turkey's box, in screen px.
  update(dt, worldX, turkey) {
    for (const it of this.items) it.phase = (it.phase || 0) + dt;
  }

  // Screen x of a world item.
  screenX(it, worldX) { return it.x - worldX; }

  // Is the turkey's feet box overlapping this item's box?
  overlaps(it, turkey, worldX) {
    const sx = this.screenX(it, worldX);
    const tx0 = turkey.x - turkey.width / 2 + 8;
    const tx1 = turkey.x + turkey.width / 2 - 8;
    const ty0 = turkey.y - turkey.height;
    const ty1 = turkey.y;
    let ix0 = sx, ix1 = sx + it.w, iy0 = it.y, iy1 = it.y + it.h;
    if (it.kind === Kind.KNIFE) {
      // The blade swings: its danger box follows the swing angle.
      const ang = Math.sin(it.phase * 1.8) * 0.7;
      const tipX = sx + Math.sin(ang) * it.h;
      const tipY = it.y + Math.cos(ang) * it.h;
      ix0 = Math.min(sx, tipX) - 12; ix1 = Math.max(sx, tipX) + 12;
      iy0 = Math.min(it.y, tipY) - 6; iy1 = Math.max(it.y, tipY) + 26;
    }
    if (it.kind === Kind.FLAME) {
      // Flames pulse: taller when the jet is high.
      const h = it.h * (0.75 + 0.25 * Math.sin(it.phase * 6));
      iy0 = it.y + it.h - h;
    }
    return tx1 > ix0 && tx0 < ix1 && ty1 > iy0 && ty0 < iy1;
  }

  // Nearest haystack the turkey could hide in (screen px, or null).
  nearestHay(turkey, worldX) {
    let best = null, bestD = 130;
    for (const it of this.items) {
      if (it.kind !== Kind.HAY) continue;
      const sx = this.screenX(it, worldX);
      const d = Math.abs(sx + it.w / 2 - turkey.x);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  // Is the turkey pressed against a fence or flame right now? (Farmer
  // corners the bird when it is boxed in like this.)
  isBlocked(turkey, worldX) {
    for (const it of this.items) {
      if (it.kind !== Kind.FENCE && it.kind !== Kind.FLAME) continue;
      if (this.overlaps(it, turkey, worldX)) return true;
    }
    return false;
  }
}
