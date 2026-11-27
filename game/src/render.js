// GOBBLE RUN — everything drawn that is not a character.
// One clear job: paint the stage backdrops (farmyard, barn, kitchen),
// the obstacles and pickups, and the HUD. Characters draw themselves.
import { GROUND_Y, STAGES, VIEW_H, VIEW_W } from './config.js';
import { Kind } from './world.js';

// Parallax silhouettes per stage: [kind, colour] layers, drawn from a
// deterministic function of the scrolled distance so they never jump.
function parallaxLayer(ctx, worldX, factor, colour, drawOne) {
  ctx.fillStyle = colour;
  const period = 900;
  const offset = -((worldX * factor) % period);
  for (let x = offset - period; x < VIEW_W + period; x += period) {
    drawOne(ctx, x);
  }
}

export function drawBackdrop(ctx, stage, worldX, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, stage.sky);
  sky.addColorStop(0.75, '#f9d976');
  sky.addColorStop(1, '#e8a34c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Sun with a sleepy Thanksgiving face — outdoors only, never in the kitchen.
  if (stage.name !== 'THE KITCHEN') {
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(1080, 110, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b1a0e';
    ctx.beginPath(); ctx.arc(1064, 104, 4, 0, Math.PI * 2); ctx.arc(1096, 104, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b1a0e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(1080, 118, 16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  if (stage.name === 'FARMYARD') {
    parallaxLayer(ctx, worldX, 0.25, 'rgba(120,72,32,0.35)', (c, x) => {
      // Distant barn + trees.
      c.fillRect(x + 60, 380, 220, 160);
      c.beginPath(); c.moveTo(x + 40, 382); c.lineTo(x + 170, 300); c.lineTo(x + 300, 382); c.closePath(); c.fill();
      c.beginPath(); c.arc(x + 420, 430, 70, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 410, 480, 20, 60);
    });
    parallaxLayer(ctx, worldX, 0.5, 'rgba(96,54,20,0.5)', (c, x) => {
      // Nearer fence posts and pumpkins.
      for (let i = 0; i < 4; i++) c.fillRect(x + i * 90, 520, 10, 100);
      c.fillRect(x, 540, 360, 8);
      c.beginPath(); c.arc(x + 640, 590, 26, 0, Math.PI * 2); c.fill();
    });
  } else if (stage.name === 'THE BARN') {
    ctx.fillStyle = 'rgba(60,32,12,0.55)';
    ctx.fillRect(0, 0, VIEW_W, 90); // dark roof beams
    for (let x = 0; x < VIEW_W; x += 160) {
      ctx.fillRect(x, 0, 26, 120);
    }
    parallaxLayer(ctx, worldX, 0.4, 'rgba(70,40,16,0.6)', (c, x) => {
      c.fillRect(x + 120, 300, 180, 240); // hay bales stacked
      c.beginPath(); c.arc(x + 210, 300, 90, Math.PI, 0); c.fill();
    });
    // Warm lantern glow.
    const glow = ctx.createRadialGradient(640, 180, 10, 640, 180, 260);
    glow.addColorStop(0, 'rgba(255,220,130,0.35)');
    glow.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else {
    // THE KITCHEN: tiled wall, hanging pans, a big oven at the back.
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let y = 60; y < 420; y += 60) {
      for (let x = (y % 120 === 0 ? 0 : 30); x < VIEW_W; x += 60) {
        ctx.strokeStyle = 'rgba(120,60,20,0.25)';
        ctx.strokeRect(x, y, 60, 60);
      }
    }
    parallaxLayer(ctx, worldX, 0.3, 'rgba(90,40,18,0.55)', (c, x) => {
      // Hanging pots and pans.
      c.beginPath(); c.arc(x + 140, 180, 34, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + 330, 200, 26, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 138, 120, 4, 30); c.fillRect(x + 328, 140, 4, 30);
    });
    // The oven, looming at the back of the kitchen.
    ctx.fillStyle = 'rgba(60,28,14,0.6)';
    ctx.fillRect(980, 380, 300, 240);
    ctx.fillStyle = 'rgba(255,140,40,0.85)';
    ctx.fillRect(1010, 420, 240, 110);
    ctx.fillStyle = '#2b1a0e';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('OVEN', 1085, 480);
  }

  // Ground.
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = stage.accent;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 8);
  // Scrolled ground dashes so speed reads on screen.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  const dash = -((worldX) % 120);
  for (let x = dash; x < VIEW_W; x += 120) ctx.fillRect(x, GROUND_Y + 34, 60, 6);
}

export function drawItem(ctx, it, sx, t) {
  if (it.kind === Kind.FENCE) {
    // A tall farm fence the turkey must jump — wide rails, easy to read.
    ctx.fillStyle = '#5e3410';
    ctx.fillRect(sx, it.y, 9, it.h);
    ctx.fillRect(sx + it.w - 9, it.y, 9, it.h);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(sx - 5, it.y + 6, it.w + 10, 11);
    ctx.fillRect(sx - 5, it.y + 28, it.w + 10, 11);
    ctx.fillRect(sx - 5, it.y + 50, it.w + 10, 11);
  } else if (it.kind === Kind.FLAME) {
    // Oven flame jet from a floor vent.
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(sx - 6, GROUND_Y - 8, it.w + 12, 8);
    const h = it.h * (0.75 + 0.25 * Math.sin(it.phase * 6));
    const grad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y - h);
    grad.addColorStop(0, '#ffdd55');
    grad.addColorStop(0.5, '#ff7b24');
    grad.addColorStop(1, '#e63b12');
    ctx.fillStyle = grad;
    for (let i = 0; i < 3; i++) {
      const fx = sx + 10 + i * 20;
      const wob = Math.sin(t * 9 + i * 2) * 5;
      ctx.beginPath();
      ctx.moveTo(fx, GROUND_Y);
      ctx.quadraticCurveTo(fx + wob - 12, GROUND_Y - h * 0.6, fx + wob, GROUND_Y - h);
      ctx.quadraticCurveTo(fx + wob + 12, GROUND_Y - h * 0.6, fx + 18, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
  } else if (it.kind === Kind.KNIFE) {
    // Carving knife swinging from a rope, blade down.
    const ang = Math.sin(it.phase * 1.8) * 0.7;
    ctx.save();
    ctx.translate(sx + 8, it.y);
    ctx.rotate(ang);
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, it.h - 40); ctx.stroke();
    ctx.fillStyle = '#d9d9d9';
    ctx.beginPath();
    ctx.moveTo(-19, it.h - 40);
    ctx.lineTo(19, it.h - 40);
    ctx.lineTo(0, it.h + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5e3410';
    ctx.fillRect(-7, it.h - 56, 14, 18);
    ctx.restore();
  } else if (it.kind === Kind.HAY) {
    // Haystack: deep golden, lumpy, with a little flag that says HIDE.
    ctx.fillStyle = '#c99327';
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y);
    ctx.quadraticCurveTo(sx + it.w / 2, it.y - 26, sx + it.w, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.moveTo(sx + 8, GROUND_Y);
    ctx.quadraticCurveTo(sx + it.w / 2, it.y - 14, sx + it.w - 8, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c9a13b';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const hx = sx + 12 + i * 16;
      ctx.beginPath(); ctx.moveTo(hx, GROUND_Y - 8); ctx.lineTo(hx + 6, GROUND_Y - 34); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(43,26,14,0.75)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDE ↓', sx + it.w / 2, it.y - 8);
    ctx.textAlign = 'left';
  } else if (it.kind === Kind.CORN || it.kind === Kind.GOLDEN) {
    const golden = it.kind === Kind.GOLDEN;
    const bobY = Math.sin(t * 3 + it.x * 0.01) * 4;
    ctx.save();
    ctx.translate(sx + it.w / 2, it.y + it.h / 2 + bobY);
    if (golden) {
      ctx.fillStyle = 'rgba(255,215,0,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, 24 + Math.sin(t * 5) * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.rotate(0.5);
    ctx.fillStyle = golden ? '#ffd700' : '#f6c453';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = golden ? '#b8860b' : '#d98e32';
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(i * 5 - 1, -11, 2, 22);
    }
    ctx.fillStyle = '#4a7c2f';
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(-8, -24); ctx.lineTo(2, -18);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

export function drawHud(ctx, game) {
  // Top bar: score, distance, lives, stage, and the farmer warning.
  ctx.fillStyle = 'rgba(43,26,14,0.82)';
  ctx.beginPath();
  ctx.roundRect(16, 14, 560, 54, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${game.score}`, 32, 48);
  ctx.fillText(`${Math.floor(game.distance)} m`, 250, 48);
  ctx.fillStyle = '#f6c453';
  ctx.fillText(game.stageName, 400, 48);
  // Lives as little turkey heads.
  for (let i = 0; i < game.lives; i++) {
    const lx = 620 + i * 40;
    ctx.fillStyle = '#c96f2e';
    ctx.beginPath(); ctx.arc(lx, 40, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6c453';
    ctx.beginPath(); ctx.moveTo(lx + 10, 38); ctx.lineTo(lx + 20, 42); ctx.lineTo(lx + 10, 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d1206';
    ctx.beginPath(); ctx.arc(lx + 4, 36, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Farmer proximity warning.
  const threat = game.threat;
  if (threat > 0.45) {
    const blink = Math.floor(game.time * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b30' : '#c0392b';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ THE FARMER IS RIGHT BEHIND YOU! ⚠', VIEW_W / 2, 108);
    ctx.textAlign = 'left';
  }
  // Dash cooldown pip.
  ctx.fillStyle = 'rgba(43,26,14,0.6)';
  ctx.beginPath();
  ctx.roundRect(16, 78, 150, 18, 9);
  ctx.fill();
  ctx.fillStyle = game.dashReady ? '#7ed957' : '#f6c453';
  ctx.beginPath();
  ctx.roundRect(16, 78, 150 * game.dashFraction, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('DASH [Shift]', 170, 92);
  // Hide hint when a haystack is near.
  if (game.nearHay) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press ↓ to HIDE in the haystack!', VIEW_W / 2, 660);
    ctx.textAlign = 'left';
  }
}
