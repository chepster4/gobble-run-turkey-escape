// GOBBLE RUN — the turkey: physics, hiding, and its own drawing.
// One clear job: how the bird moves (run, jump, dash, hide) and how it
// looks (body, tail fan, head, wattle, running legs). It knows nothing
// about the farmer or the hazards; the game loop hands it collisions.
import { GROUND_Y, PHYSICS, TUNING, TURKEY_X } from './config.js';

export class Turkey {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = TURKEY_X;
    this.y = GROUND_Y;
    this.vy = 0;
    this.onGround = true;
    this.coyote = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.hidden = false;
    this.hideTimer = 0;
    this.invulnerable = 0;
    this.runPhase = 0;      // leg animation clock
    this.alive = true;
    this.speedBoost = 0;    // short burst after leaving a haystack
  }

  get width() { return 64; }
  get height() { return 58; }

  // Returns true when a jump actually happened.
  tryJump() {
    if (!this.alive || this.hidden) return false;
    if (this.onGround || this.coyote > 0) {
      this.vy = PHYSICS.jumpVelocity;
      this.onGround = false;
      this.coyote = 0;
      return true;
    }
    return false;
  }

  tryDash() {
    if (!this.alive || this.hidden) return false;
    if (this.dashCooldown > 0 || this.dashTimer > 0) return false;
    this.dashTimer = PHYSICS.dashTime;
    this.dashCooldown = PHYSICS.dashCooldown;
    return true;
  }

  startHiding() {
    if (!this.alive || !this.onGround || this.hidden) return false;
    this.hidden = true;
    this.hideTimer = TUNING.hideSeconds;
    return true;
  }

  stopHiding() {
    if (!this.hidden) return;
    this.hidden = false;
    this.speedBoost = 0.55; // slipping out of the haystack gives a burst
  }

  hurt() {
    this.invulnerable = TUNING.invulnerableSeconds;
    this.stopHiding();
  }

  update(dt, speed) {
    if (!this.alive) return;
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.speedBoost > 0) this.speedBoost -= dt;
    if (this.hidden) {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) this.stopHiding();
      return;
    }
    // Vertical physics.
    this.vy += PHYSICS.gravity * dt;
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    if (this.onGround) this.coyote = PHYSICS.coyoteTime;
    else if (this.coyote > 0) this.coyote -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    // Legs pump faster the faster the world scrolls.
    this.runPhase += dt * (6 + speed / 55);
  }

  // Extra horizontal speed from a dash or a haystack burst, in px/s.
  extraSpeed() {
    let extra = 0;
    if (this.dashTimer > 0) extra += PHYSICS.dashSpeed - PHYSICS.baseSpeed;
    if (this.speedBoost > 0) extra += 160;
    return extra;
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.hidden) {
      // Only the tail fan pokes out of the haystack — the joke is visible.
      this.drawTailFan(ctx, t, 0.9);
      ctx.restore();
      return;
    }
    // Blink while invulnerable after a hit.
    if (this.invulnerable > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    const squash = this.onGround ? 1 + Math.sin(this.runPhase * 2) * 0.03 : 1.06;
    ctx.scale(1, squash);
    this.drawTailFan(ctx, t, 1);
    this.drawBody(ctx, t);
    ctx.restore();
  }

  drawTailFan(ctx, t, scale) {
    // Fanned tail feathers behind the body, gently waving.
    const wave = Math.sin(t * 3) * 0.06;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-26, -26);
    for (let i = -2; i <= 2; i++) {
      const ang = -Math.PI / 2 + i * 0.42 + wave;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = i % 2 === 0 ? '#8a4b1f' : '#a35a24';
      ctx.beginPath();
      ctx.ellipse(0, -26, 9, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8a34c';
      ctx.beginPath();
      ctx.ellipse(0, -40, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawBody(ctx, t) {
    // Running legs: two thin legs alternating with the run phase.
    const legSwing = this.onGround ? Math.sin(this.runPhase) * 12 : 8;
    ctx.strokeStyle = '#e8a34c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -8); ctx.lineTo(-6 + legSwing, 0);
    ctx.moveTo(6, -8); ctx.lineTo(6 - legSwing, 0);
    ctx.stroke();
    // Body: plump brown ellipse.
    ctx.fillStyle = '#7a4416';
    ctx.beginPath();
    ctx.ellipse(0, -26, 30, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing.
    ctx.fillStyle = '#5e3410';
    ctx.beginPath();
    ctx.ellipse(-4, -24, 18, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Neck + head.
    ctx.fillStyle = '#8a4b1f';
    ctx.beginPath();
    ctx.ellipse(20, -46, 9, 16, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c96f2e';
    ctx.beginPath();
    ctx.arc(26, -60, 11, 0, Math.PI * 2);
    ctx.fill();
    // Beak, wattle, eye.
    ctx.fillStyle = '#f6c453';
    ctx.beginPath();
    ctx.moveTo(34, -62); ctx.lineTo(46, -58); ctx.lineTo(34, -56);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(30, -50, 3.5, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1206';
    ctx.beginPath();
    ctx.arc(29, -63, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // A dash leaves a little speed-line puff behind.
    if (this.dashTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-38, -22, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
