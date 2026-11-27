// GOBBLE RUN — keyboard and mouse input, nothing else.
// One clear job: turn raw key/mouse events into the small set of actions
// the game loop reads each frame (jump pressed, dash pressed, hide held,
// any key to start, restart requested). Edge-triggered presses are queued
// so a tap between frames is never lost.
export class Input {
  constructor(canvas) {
    this.jumpQueued = false;
    this.dashQueued = false;
    this.hideHeld = false;
    this.anyKeyQueued = false;
    this.restartQueued = false;
    this.muteQueued = false;
    this.clickQueued = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.jumpQueued = true; this.anyKeyQueued = true; e.preventDefault();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
        this.dashQueued = true; e.preventDefault();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.hideHeld = true; e.preventDefault();
      } else if (e.code === 'KeyR') {
        this.restartQueued = true; this.anyKeyQueued = true;
      } else if (e.code === 'KeyM') {
        this.muteQueued = true;
      } else if (e.code === 'Enter') {
        this.anyKeyQueued = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.hideHeld = false;
    });
    canvas.addEventListener('mousedown', () => {
      this.clickQueued = true; this.anyKeyQueued = true;
    });
    // Keep the page from scrolling on Space when the canvas has focus.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault();
    });
  }

  // Called once per frame by the game loop; returns this frame's actions
  // and clears the edge-triggered queues.
  poll() {
    const actions = {
      jump: this.jumpQueued,
      dash: this.dashQueued,
      hideHeld: this.hideHeld,
      anyKey: this.anyKeyQueued,
      restart: this.restartQueued,
      mute: this.muteQueued,
      click: this.clickQueued,
    };
    this.jumpQueued = false;
    this.dashQueued = false;
    this.anyKeyQueued = false;
    this.restartQueued = false;
    this.muteQueued = false;
    this.clickQueued = false;
    return actions;
  }
}
