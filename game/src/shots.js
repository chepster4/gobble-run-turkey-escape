// GOBBLE RUN — staged scenes for the screenshots.
// One clear job: read ?shot=… from the URL and put the game into a
// fixed, deterministic pose for the camera (title, chase, kitchen,
// escaped). The live game never uses this; it only makes the maker's
// screenshots reproducible. When a shot is staged, window.__shotReady
// flips true once the scene has been drawn.
import { GROUND_Y, TURKEY_X } from './config.js';
import { FarmerState } from './farmer.js';
import { Kind } from './world.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  return { shot, seed: Number(params.get('seed') || 7) };
}

// Put `game` into the staged pose for the requested shot. Returns true
// when a shot was staged (the caller then draws one frame and signals
// readiness).
export function stageShot(game, name, seed) {
  const w = game.world;
  if (name === 'title') {
    game.state = 'title';
    game.time = 0;
    return true;
  }
  if (name === 'chase') {
    game.state = 'playing';
    game.distance = 640;
    game.score = 1250;
    game.lives = 3;
    game.worldX = 640 * 14; // world px scrolled so far
    w.reset(seed);
    // A fence just ahead, corn in the air, farmer breathing down the bird.
    w.items = [
      { kind: Kind.FENCE, x: game.worldX + 560, y: GROUND_Y - 64, w: 34, h: 64, hit: false },
      { kind: Kind.CORN, x: game.worldX + 430, y: GROUND_Y - 86, w: 26, h: 26, taken: false },
      { kind: Kind.CORN, x: game.worldX + 476, y: GROUND_Y - 86, w: 26, h: 26, taken: false },
      { kind: Kind.HAY, x: game.worldX + 900, y: GROUND_Y - 64, w: 92, h: 64 },
    ];
    w.nextSpawnX = game.worldX + 1200;
    game.turkey.reset();
    game.turkey.y = GROUND_Y - 120; // mid-jump over the fence line
    game.turkey.vy = -220;
    game.farmer.reset();
    game.farmer.x = TURKEY_X - 150; // close behind — the chase reads
    game.farmer.state = FarmerState.CHASE;
    game.farmer.stateTime = 0.4;
    game.time = 12.5;
    return true;
  }
  if (name === 'kitchen') {
    game.state = 'playing';
    game.distance = 3100;
    game.score = 2875;
    game.lives = 2;
    game.worldX = 3100 * 14;
    w.reset(seed);
    w.items = [
      { kind: Kind.FLAME, x: game.worldX + 520, y: GROUND_Y - 70, w: 64, h: 70, phase: 1.2, hit: false },
      { kind: Kind.KNIFE, x: game.worldX + 760, y: 150, w: 30, h: 150, phase: 0.6, hit: false },
      { kind: Kind.KNIFE, x: game.worldX + 980, y: 150, w: 30, h: 150, phase: 2.1, hit: false },
      { kind: Kind.GOLDEN, x: game.worldX + 640, y: GROUND_Y - 110, w: 30, h: 30, taken: false },
    ];
    w.nextSpawnX = game.worldX + 1400;
    game.turkey.reset();
    game.turkey.y = GROUND_Y;
    game.farmer.reset();
    game.farmer.x = 90; // far behind, still visible at the kitchen door
    game.farmer.state = FarmerState.PATROL;
    game.time = 24.0;
    return true;
  }
  if (name === 'escaped') {
    game.state = 'escaped';
    game.distance = 4000;
    game.score = 4325;
    game.lives = 2;
    game.time = 61.4;
    game.turkey.reset();
    game.turkey.x = 900;
    game.turkey.y = GROUND_Y;
    game.farmer.reset();
    game.farmer.x = -160; // left far behind, beaten
    return true;
  }
  return false;
}
