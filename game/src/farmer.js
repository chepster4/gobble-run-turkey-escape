// GOBBLE RUN — the farmer: a five-state chase AI.
// One clear job: decide where the farmer is and what he is doing.
// States: PATROL (loping behind), SEARCH (turkey hidden — he looks
// around the haystack), CHASE (closing in fast), CORNER (turkey boxed
// against an obstacle — he lunges), CAUGHT (game over, he grabs the bird).
// The game loop feeds him the gap to the turkey and whether the turkey
// is hidden; he answers with his screen x and his state.
import { GROUND_Y, TUNING } from './config.js';

export const FarmerState = {
  PATROL: 'patrol',
  SEARCH: 'search',
  CHASE: 'chase',
  CORNER: 'corner',
  CAUGHT: 'caught',
};

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = -140;                 // starts off-screen left, closing in
    this.y = GROUND_Y;
    this.state = FarmerState.PATROL;
    this.stateTime = 0;
    this.walkPhase = 0;
    this.searchSpot = 0;           // where he paces while searching
    this.searchDir = 1;
    this.lunge = 0;                // corner-lunge progress 0..1
    this.nearWarned = false;
    // World speed (px/s) for the current state. The game loop moves him
    // by (worldSpeed - turkeySpeed): he only gains when he is faster
    // than the bird, so running well really does pull away from him.
    this.worldSpeed = TUNING.farmerPatrolSpeed;
  }

  get catching() { return this.state === FarmerState.CAUGHT; }

  // gap: px between farmer and turkey on screen. turkeyHidden: is the
  // bird in a haystack. blocked: is the turkey pressed against a hazard.
  // This only picks the state and the world speed; the game loop applies
  // the relative motion (worldSpeed - turkeySpeed) to his screen x.
  update(dt, gap, turkeyHidden, blocked, speed) {
    this.stateTime += dt;
    this.walkPhase += dt * (this.state === FarmerState.CHASE ? 16 : 9);

    switch (this.state) {
      case FarmerState.PATROL: {
        this.worldSpeed = TUNING.farmerPatrolSpeed;
        if (turkeyHidden) { this.toState(FarmerState.SEARCH); this.searchSpot = this.x; }
        else if (gap < 260) this.toState(FarmerState.CHASE);
        break;
      }
      case FarmerState.SEARCH: {
        // Stands still in the world, pacing and scratching his head:
        // his world speed is 0, so a running turkey pulls away fast.
        this.worldSpeed = 0;
        this.searchSpot += this.searchDir * 30 * dt;
        if (this.searchSpot > this.x + 60) this.searchDir = -1;
        if (this.searchSpot < this.x - 30) this.searchDir = 1;
        if (!turkeyHidden) this.toState(FarmerState.CHASE);
        else if (this.stateTime > 3.2) this.toState(FarmerState.PATROL);
        break;
      }
      case FarmerState.CHASE: {
        this.worldSpeed = TUNING.farmerChaseSpeed;
        if (turkeyHidden) { this.toState(FarmerState.SEARCH); this.searchSpot = this.x; }
        else if (blocked && gap < 150) this.toState(FarmerState.CORNER);
        else if (gap > 420) this.toState(FarmerState.PATROL);
        break;
      }
      case FarmerState.CORNER: {
        // Winds up, then lunges forward at the boxed-in turkey.
        this.lunge = Math.min(1, this.stateTime / 0.9);
        this.worldSpeed = TUNING.farmerChaseSpeed * (1 + 0.35 * this.lunge);
        if (!blocked || turkeyHidden) this.toState(FarmerState.CHASE);
        break;
      }
      case FarmerState.CAUGHT: {
        // Stands over the turkey, triumphant. No movement.
        this.worldSpeed = 0;
        break;
      }
    }
    // Never drift so far back he is forgotten, never pass the turkey
    // except by catching it (the game loop owns the catch).
    if (this.x < -160) this.x = -160;
    if (this.x > 1280) this.x = 1280;
  }

  // The turkey slowed down (hit a hazard): the farmer gains ground.
  gainGround(px) { if (this.state !== FarmerState.CAUGHT) this.x += px; }

  // The turkey sprinted away: the farmer falls back a little.
  loseGround(px) { if (this.state !== FarmerState.CAUGHT) this.x = Math.max(-160, this.x - px); }

  // The turkey slipped out of the haystack unseen: the farmer lost the
  // trail, drops back and goes back to patrolling.
  loseTrail() {
    this.x = Math.max(-160, this.x - 160);
    this.toState(FarmerState.PATROL);
  }

  catch() {
    this.state = FarmerState.CAUGHT;
    this.stateTime = 0;
  }

  toState(next) {
    if (this.state === next) return;
    this.state = next;
    this.stateTime = 0;
    this.lunge = 0;
  }

  // How close he is, 0 (far) to 1 (on top of the bird) — drives the
  // on-screen warning and the alarm sound.
  threatLevel(gap) {
    if (this.state === FarmerState.CAUGHT) return 1;
    return Math.max(0, Math.min(1, 1 - gap / 420));
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const bob = Math.sin(this.walkPhase) * 3;
    const lean = this.state === FarmerState.CHASE ? 0.16 : 0.05;
    ctx.rotate(lean);
    // Legs: overalls blue, stepping.
    const swing = Math.sin(this.walkPhase) * 14;
    ctx.strokeStyle = '#2e4a7a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -34); ctx.lineTo(-8 + swing, 0);
    ctx.moveTo(8, -34); ctx.lineTo(8 - swing, 0);
    ctx.stroke();
    // Body: red plaid shirt under blue overalls.
    ctx.fillStyle = '#b3372a';
    ctx.beginPath();
    ctx.roundRect(-20, -78 + bob, 40, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#2e4a7a';
    ctx.fillRect(-20, -58 + bob, 40, 28);
    ctx.fillStyle = '#f6c453';
    ctx.fillRect(-3, -58 + bob, 6, 6);
    // Arm reaching forward, holding a pitchfork when chasing.
    ctx.strokeStyle = '#b3372a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(14, -66 + bob);
    ctx.lineTo(34, -48 + bob + (this.state === FarmerState.CHASE ? -8 : 0));
    ctx.stroke();
    if (this.state === FarmerState.CHASE || this.state === FarmerState.CORNER) {
      ctx.strokeStyle = '#8a6d3b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(38, -70 + bob); ctx.lineTo(52, -20 + bob);
      ctx.stroke();
      ctx.strokeStyle = '#d9d9d9';
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(38 + i * 5, -70 + bob); ctx.lineTo(44 + i * 5, -84 + bob);
        ctx.stroke();
      }
    }
    // Head + straw hat.
    ctx.fillStyle = '#f0c08a';
    ctx.beginPath();
    ctx.arc(4, -92 + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.ellipse(4, -100 + bob, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, -116 + bob, 24, 12);
    // Moustache + angry eye.
    ctx.fillStyle = '#5e3410';
    ctx.fillRect(10, -90 + bob, 12, 3);
    ctx.fillStyle = '#1d1206';
    ctx.beginPath();
    ctx.arc(12, -96 + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Searching: a big "?" floats above his head.
    if (this.state === FarmerState.SEARCH) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('?', 18, -128 + bob + Math.sin(t * 4) * 4);
    }
    // Corner: an exclamation — he thinks he has the bird.
    if (this.state === FarmerState.CORNER) {
      ctx.fillStyle = '#ffe14d';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('!', 22, -128 + bob);
    }
    ctx.restore();
  }
}
