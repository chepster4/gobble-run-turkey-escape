// GOBBLE RUN — tuning constants and stage definitions.
// One clear job: every number the game balances lives here, so tuning
// never means hunting through the draw or physics code.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 620;
export const TURKEY_X = 320;

// Distance (metres) where each stage begins. The run ends at ESCAPE_AT.
export const STAGES = [
  { name: 'FARMYARD', start: 0,    sky: '#f6c453', ground: '#8a5a2b', accent: '#c96f2e' },
  { name: 'THE BARN', start: 1200, sky: '#d98e32', ground: '#6e4423', accent: '#a34d1f' },
  { name: 'THE KITCHEN', start: 2600, sky: '#e8a34c', ground: '#7a4a28', accent: '#b3372a' },
];
export const ESCAPE_AT = 4000;

export const PHYSICS = {
  gravity: 2600,
  jumpVelocity: -880,
  coyoteTime: 0.09,
  dashSpeed: 980,
  dashTime: 0.22,
  dashCooldown: 1.1,
  baseSpeed: 330,
  maxSpeed: 560,
};

export const TUNING = {
  startLives: 3,
  cornScore: 25,
  goldenCornScore: 100,
  hideSeconds: 2.6,
  farmerCatchDistance: 46,
  farmerPatrolSpeed: 350, // a touch faster than the turkey's base run
  farmerChaseSpeed: 480,  // faster than base run, slower than a late run
  invulnerableSeconds: 1.6,
};

// Deterministic random: mulberry32, so a staged screenshot replays the
// exact same scene every time it is opened with the same seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
