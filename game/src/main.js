// GOBBLE RUN — the game loop and the screens around it.
// One clear job: own the state machine (title → playing → caught /
// escaped → restart), run the update + draw each frame, and wire the
// turkey, the farmer, the world and the HUD together. It draws the
// title and end screens itself; the run itself is drawn by render.js.
import { ESCAPE_AT, GROUND_Y, PHYSICS, STAGES, TUNING, VIEW_H, VIEW_W } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { Turkey } from './turkey.js';
import { Farmer, FarmerState } from './farmer.js';
import { World, Kind } from './world.js';
import { drawBackdrop, drawHud, drawItem } from './render.js';
import { parseShot, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export class Game {
  constructor() {
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.turkey = new Turkey();
    this.farmer = new Farmer();
    this.world = new World(20261127);
    this.state = 'title'; // title | playing | caught | escaped
    this.score = 0;
    this.distance = 0;    // metres run
    this.worldX = 0;      // world px scrolled
    this.lives = TUNING.startLives;
    this.time = 0;
    this.speed = PHYSICS.baseSpeed;
    this.threat = 0;
    this.nearHay = false;
    this.wasHidden = false; // previous frame's hiding state (for loseTrail)
    this.best = 0;
    this.staged = parseShot();
    this.shotStaged = false;
    this.last = performance.now();
    this.gobbleTimer = 0;
  }

  get stageName() {
    let name = STAGES[0].name;
    for (const s of STAGES) if (this.distance >= s.start) name = s.name;
    return name;
  }

  get stage() {
    let st = STAGES[0];
    for (const s of STAGES) if (this.distance >= s.start) st = s;
    return st;
  }

  get dashReady() { return this.turkey.dashCooldown <= 0; }
  get dashFraction() {
    if (this.dashReady) return 1;
    return Math.max(0, 1 - this.turkey.dashCooldown / PHYSICS.dashCooldown);
  }

  resetRun() {
    this.turkey.reset();
    this.farmer.reset();
    this.world.reset(20261127 + Math.floor(Math.random() * 1000));
    this.state = 'playing';
    this.score = 0;
    this.distance = 0;
    this.worldX = 0;
    this.lives = TUNING.startLives;
    this.time = 0;
    this.speed = PHYSICS.baseSpeed;
    this.threat = 0;
    this.nearHay = false;
    this.wasHidden = false;
    this.sounds.stopAlarm();
  }

  start() {
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frame(dt) {
    const a = this.input.poll();
    if (a.mute) this.sounds.toggleMute();

    // Staged screenshot scenes: pose once, draw once, signal ready.
    if (this.staged && !this.shotStaged) {
      this.shotStaged = stageShot(this, this.staged.shot, this.staged.seed);
      if (this.shotStaged) {
        this.drawStaged();
        window.__shotReady = true;
        return;
      }
    }
    if (this.staged) { this.drawStaged(); return; } // frozen pose for the camera

    this.time += dt;

    if (this.state === 'title') {
      this.gobbleTimer -= dt;
      if (this.gobbleTimer <= 0) { this.sounds.gobble(); this.gobbleTimer = 2.4; }
      if (a.anyKey) { this.resetRun(); }
      this.drawTitle();
      return;
    }
    if (this.state === 'caught' || this.state === 'escaped') {
      if (a.restart || a.anyKey) this.resetRun();
      this.drawEnd();
      return;
    }

    this.updatePlaying(dt, a);
    this.draw();
  }

  updatePlaying(dt, a) {
    const turkey = this.turkey;

    // Actions.
    if (a.jump && turkey.tryJump()) this.sounds.jump();
    if (a.dash && turkey.tryDash()) this.sounds.dash();
    const hay = this.world.nearestHay(turkey, this.worldX);
    this.nearHay = !!hay && turkey.onGround && !turkey.hidden;
    if (a.hideHeld && hay && turkey.startHiding()) this.sounds.hide();
    if (!a.hideHeld && turkey.hidden) turkey.stopHiding();

    // Speed grows with distance and stage; dash and haystack bursts add.
    // While the turkey hides, the world holds its breath: no scrolling,
    // so the haystack stays under the bird while the farmer searches.
    const stageIdx = this.world.stageIndex(this.distance);
    const target = Math.min(
      PHYSICS.maxSpeed,
      PHYSICS.baseSpeed + this.distance * 0.045 + stageIdx * 30,
    );
    this.speed = turkey.hidden ? 0 : target + turkey.extraSpeed();
    const scroll = this.speed * dt;
    this.worldX += scroll;
    this.distance += scroll / 14; // ~14 px per metre

    turkey.update(dt, this.speed);
    this.world.ensureAhead(this.worldX, this.distance);
    this.world.update(dt, this.worldX, turkey);

    // Corn pickups.
    for (const it of this.world.items) {
      if ((it.kind === Kind.CORN || it.kind === Kind.GOLDEN) && !it.taken) {
        if (this.world.overlaps(it, turkey, this.worldX)) {
          it.taken = true;
          this.score += it.kind === Kind.GOLDEN ? TUNING.goldenCornScore : TUNING.cornScore;
          this.sounds.corn();
        }
      }
    }

    // Hazards: a hit costs a life, knocks the bird back, and lets the
    // farmer gain ground. Invulnerability stops double-hits.
    if (turkey.invulnerable <= 0) {
      for (const it of this.world.items) {
        if ((it.kind === Kind.FENCE || it.kind === Kind.FLAME || it.kind === Kind.KNIFE) && !it.hit) {
          if (this.world.overlaps(it, turkey, this.worldX)) {
            it.hit = true;
            this.loseLife();
            break;
          }
        }
      }
    }

    // The farmer: gap in screen px, hiding state, boxed-in state. He
    // moves by the difference between his world speed and the turkey's,
    // so running well pulls away and stumbling lets him close in.
    const wasHidden = this.wasHidden;
    this.wasHidden = turkey.hidden;
    if (wasHidden && !turkey.hidden) this.farmer.loseTrail();
    const gap = turkey.x - this.farmer.x;
    const blocked = this.world.isBlocked(turkey, this.worldX);
    this.farmer.update(dt, gap, turkey.hidden, blocked, this.speed);
    this.farmer.x += (this.farmer.worldSpeed - this.speed) * dt;
    if (this.farmer.x < -160) this.farmer.x = -160;
    this.threat = this.farmer.threatLevel(turkey.x - this.farmer.x);

    // Alarm while he is close; the chase music of a narrow escape.
    if (this.threat > 0.55) this.sounds.startAlarm();
    else this.sounds.stopAlarm();

    // Caught: he reaches the bird.
    if (this.farmer.x + 40 >= turkey.x - 10 && !turkey.hidden) {
      this.farmer.catch();
      this.state = 'caught';
      this.sounds.stopAlarm();
      this.sounds.caughtSting();
      return;
    }

    // Escaped: past the kitchen door, 4000 m, dinner is cancelled.
    if (this.distance >= ESCAPE_AT) {
      this.state = 'escaped';
      this.score += 500; // escape bonus
      this.best = Math.max(this.best, this.score);
      this.sounds.stopAlarm();
      this.sounds.fanfare();
    }
  }

  loseLife() {
    this.lives -= 1;
    this.turkey.hurt();
    this.sounds.hurt();
    this.farmer.gainGround(120); // a stumble lets him close in fast
    if (this.lives <= 0) {
      this.state = 'caught';
      this.farmer.catch();
      this.sounds.stopAlarm();
      this.sounds.caughtSting();
    }
  }

  // Draw the staged scene for a screenshot: the title screen, the end
  // screen, or the live run, depending on the staged state.
  drawStaged() {
    if (this.state === 'title') { this.drawTitle(); return; }
    if (this.state === 'caught' || this.state === 'escaped') { this.drawEnd(); return; }
    this.draw();
  }

  draw() {
    drawBackdrop(ctx, this.stage, this.worldX, this.time);
    // World items, back to front.
    const items = [...this.world.items].sort((a, b) => a.x - b.x);
    for (const it of items) {
      if (it.taken) continue;
      const sx = this.world.screenX(it, this.worldX);
      if (sx < -160 || sx > VIEW_W + 160) continue;
      drawItem(ctx, it, sx, this.time);
    }
    // Haystack the turkey hides in is drawn over the bird.
    const hidingHay = this.turkey.hidden ? this.world.nearestHay(this.turkey, this.worldX) : null;
    this.turkey.draw(ctx, this.time);
    if (hidingHay) {
      drawItem(ctx, hidingHay, this.world.screenX(hidingHay, this.worldX), this.time);
    }
    this.farmer.draw(ctx, this.time);
    drawHud(ctx, this);
    // Distance progress bar to the kitchen door.
    ctx.fillStyle = 'rgba(43,26,14,0.6)';
    ctx.beginPath();
    ctx.roundRect(VIEW_W - 320, 14, 300, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#7ed957';
    ctx.beginPath();
    ctx.roundRect(VIEW_W - 320, 14, 300 * Math.min(1, this.distance / ESCAPE_AT), 20, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ESCAPE ${Math.floor(this.distance)} / ${ESCAPE_AT} m`, VIEW_W - 170, 28);
    ctx.textAlign = 'left';
  }

  drawTitle() {
    drawBackdrop(ctx, STAGES[0], this.time * 20, this.time);
    // A big friendly turkey on the title screen. The demo bird draws
    // itself from its own (x, y), so park it at the origin and place
    // it with the transform instead.
    ctx.save();
    ctx.translate(640, 470);
    ctx.scale(2.4, 2.4);
    const demo = new Turkey();
    demo.x = 0;
    demo.y = 0;
    demo.draw(ctx, this.time);
    ctx.restore();
    // Title card.
    ctx.fillStyle = 'rgba(43,26,14,0.88)';
    ctx.beginPath();
    ctx.roundRect(240, 60, 800, 210, 20);
    ctx.fill();
    ctx.fillStyle = '#f6c453';
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOBBLE RUN', 640, 150);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('One turkey. One farmer. No dinner.', 640, 200);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ffd98a';
    ctx.fillText('Run 4000 m from the farmyard, through the barn, out of the kitchen —', 640, 240);
    ctx.fillText('before the farmer catches you for Thanksgiving.', 640, 266);
    // Controls card.
    ctx.fillStyle = 'rgba(43,26,14,0.82)';
    ctx.beginPath();
    ctx.roundRect(380, 560, 520, 120, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('SPACE / ↑  jump        SHIFT  dash', 640, 596);
    ctx.fillText('↓ near a haystack  hide        R  restart', 640, 628);
    ctx.fillStyle = '#f6c453';
    ctx.font = 'bold 24px sans-serif';
    const blink = Math.floor(this.time * 2) % 2 === 0;
    if (blink) ctx.fillText('— press SPACE to run —', 640, 664);
    ctx.textAlign = 'left';
  }

  drawEnd() {
    drawBackdrop(ctx, this.stage, this.worldX, this.time);
    const escaped = this.state === 'escaped';
    ctx.fillStyle = 'rgba(43,26,14,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = escaped ? '#7ed957' : '#ff6b5e';
    ctx.beginPath();
    ctx.roundRect(290, 130, 700, 300, 20);
    ctx.fill();
    ctx.fillStyle = '#2b1a0e';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', 640, 230);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#fff';
    if (escaped) {
      ctx.fillText('The turkey made it out the kitchen door.', 640, 290);
      ctx.fillText('Thanksgiving dinner is officially cancelled.', 640, 326);
    } else {
      ctx.fillText('The farmer got his bird… this time.', 640, 290);
      ctx.fillText('The oven was already warm. Run again!', 640, 326);
    }
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#f6c453';
    ctx.fillText(`SCORE ${this.score}    •    ${Math.floor(this.distance)} m`, 640, 386);
    const blink = Math.floor(this.time * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('— press R or click to run again —', 640, 480);
    }
    ctx.textAlign = 'left';
  }
}

const game = new Game();
game.start();
// Exposed for debugging and automated play-testing only.
window.__game = game;
