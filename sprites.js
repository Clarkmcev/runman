// Pixel-art assets generated in code: every sprite, background and title is
// drawn pixel by pixel into an offscreen canvas, so the game loads no images.

// Helpers
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// Small seeded RNG so the generated scenery is the same on every load
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

function disc(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.8) g.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}

// Draws a 1px outline around every opaque shape inside the given region
function outline(g, x0, y0, w, h, color) {
  const data = g.getImageData(x0, y0, w, h).data;
  const solid = (x, y) =>
    x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  g.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        g.fillRect(x0 + x, y0 + y, 1, 1);
      }
    }
  }
}

// Builds a horizontal sprite sheet of 32x32 frames
function sheet(nFrames, drawFrame, outlineColor = "#1b1020") {
  const c = makeCanvas(32 * nFrames, 32);
  const g = c.getContext("2d");
  for (let i = 0; i < nFrames; i++) {
    g.save();
    g.beginPath();
    g.rect(i * 32, 0, 32, 32);
    g.clip();
    g.translate(i * 32, 0);
    drawFrame(g, i);
    g.restore();
    if (outlineColor) outline(g, i * 32, 0, 32, 32, outlineColor);
  }
  return c;
}

// PLAYER
const SKIN = "#f2b880";
const SKIN_DARK = "#c98656";
const SHIRT = "#3aa0d8";
const SHIRT_DARK = "#2470a8";
const PANTS = "#3b3360";
const PANTS_DARK = "#2a2448";
const BAND = "#e8435a";
const SHOE = "#f4f0e6";
const HAIR = "#4a2c2a";

// pose: { bob, legs: [[footDx, footLift], [footDx, footLift]], arms: [dy, dy], blink }
function drawRunner(g, pose) {
  const by = 6 + (pose.bob || 0);
  const [[fbx, fby], [ffx, ffy]] = pose.legs;
  const [armBack, armFront] = pose.arms;

  // Back arm and leg (darker, behind the body)
  px(g, 10, by + 12 + armBack, 3, 5, SKIN_DARK);
  drawLeg(g, 13 + fbx, by + 19, fby, PANTS_DARK);

  // Body
  px(g, 11, by + 11, 10, 8, SHIRT);
  px(g, 11, by + 16, 10, 3, SHIRT_DARK);

  // Front leg
  drawLeg(g, 16 + ffx, by + 19, ffy, PANTS);

  // Head
  px(g, 10, by, 12, 11, SKIN);
  px(g, 10, by, 12, 3, HAIR);
  px(g, 10, by + 3, 12, 2, BAND);
  // Headband tail flowing behind
  px(g, 6, by + 3, 4, 1, BAND);
  px(g, 5, by + 4 - ((pose.bob || 0) & 1), 3, 1, BAND);
  // Eye
  if (pose.blink) {
    px(g, 18, by + 7, 2, 1, "#1b1020");
  } else {
    px(g, 18, by + 6, 2, 3, "#1b1020");
    px(g, 18, by + 6, 1, 1, "#ffffff");
  }
  px(g, 12, by + 7, 2, 1, SKIN_DARK);
  // Mouth
  px(g, 19, by + 9, 2, 1, "#a0404a");

  // Front arm
  px(g, 18, by + 12 + armFront, 3, 5, SKIN);
}

function drawLeg(g, x, hipY, lift, color) {
  const footY = 31 - lift;
  const h = Math.max(2, footY - hipY - 1);
  px(g, x, hipY, 3, h, color);
  px(g, x, hipY + h, 4, 2, SHOE);
}

function runPose(i, n) {
  const a = (i / n) * Math.PI * 2;
  return {
    bob: Math.round(Math.abs(Math.sin(a)) * -1),
    legs: [
      [Math.round(Math.sin(a + Math.PI) * 4), Math.max(0, Math.round(Math.cos(a + Math.PI) * 3))],
      [Math.round(Math.sin(a) * 4), Math.max(0, Math.round(Math.cos(a) * 3))],
    ],
    arms: [Math.round(Math.sin(a) * 2), Math.round(Math.sin(a + Math.PI) * 2)],
  };
}

const jumpPose = { bob: -1, legs: [[-3, 4], [2, 3]], arms: [-4, -4] };
const fallPose = { bob: 0, legs: [[-1, 0], [1, 0]], arms: [-5, -5] };

// Nearest-neighbour rotation keeps the rotated frames crisp
function rotateFrame(src, angle) {
  const out = makeCanvas(32, 32);
  const sd = src.getContext("2d").getImageData(0, 0, 32, 32).data;
  const og = out.getContext("2d");
  const od = og.createImageData(32, 32);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = x - 15.5;
      const dy = y - 17.5;
      const sx = Math.round(dx * cos - dy * sin + 15.5);
      const sy = Math.round(dx * sin + dy * cos + 17.5);
      if (sx < 0 || sy < 0 || sx >= 32 || sy >= 32) continue;
      const si = (sy * 32 + sx) * 4;
      const oi = (y * 32 + x) * 4;
      for (let k = 0; k < 4; k++) od.data[oi + k] = sd[si + k];
    }
  }
  og.putImageData(od, 0, 0);
  return out;
}

export const maskRun = sheet(12, (g, i) => drawRunner(g, runPose(i, 12)));
export const maskJump = sheet(1, (g) => drawRunner(g, jumpPose));
export const maskFall = sheet(1, (g) => drawRunner(g, fallPose));
export const maskIdle = sheet(11, (g, i) =>
  drawRunner(g, {
    bob: i % 6 < 3 ? 0 : 1,
    legs: [[-1, 0], [1, 0]],
    arms: [i % 6 < 3 ? 0 : 1, i % 6 < 3 ? 0 : 1],
    blink: i === 8,
  })
);
export const maskDoubleJump = (() => {
  const tuck = sheet(1, (g) => drawRunner(g, jumpPose));
  return sheet(
    6,
    (g, i) => g.drawImage(rotateFrame(tuck, (i / 6) * Math.PI * 2), 0, 0),
    null
  );
})();

// FRUITS (17-frame sheets that bob and sparkle)
function fruitSheet(drawFruit) {
  return sheet(17, (g, i) => {
    g.translate(0, Math.round(Math.sin((i / 17) * Math.PI * 2) * 1.5));
    drawFruit(g);
    // Travelling glint
    if (i >= 4 && i <= 7) px(g, 11 + (i - 4), 12 - (i - 4), 1, 1, "#ffffff");
  });
}

function leaf(g, x, y) {
  px(g, x, y, 3, 2, "#4caf50");
  px(g, x + 1, y - 1, 3, 1, "#7bd16b");
}

export const appleImg = fruitSheet((g) => {
  disc(g, 16, 18, 6, "#e03b3b");
  disc(g, 17, 19, 4, "#c42a35");
  px(g, 12, 15, 2, 2, "#ff8a80");
  px(g, 15, 9, 2, 4, "#6b3e26");
  leaf(g, 17, 10);
});

export const cherryImg = fruitSheet((g) => {
  g.fillStyle = "#4e8a2e";
  for (let k = 0; k < 8; k++) {
    g.fillRect(12 + Math.round(k * 0.5), 19 - k, 1, 1);
    g.fillRect(20 - Math.round(k * 0.5), 19 - k, 1, 1);
  }
  leaf(g, 16, 10);
  disc(g, 11, 21, 3, "#d32f45");
  disc(g, 21, 21, 3, "#d32f45");
  px(g, 10, 20, 1, 1, "#ff8a9a");
  px(g, 20, 20, 1, 1, "#ff8a9a");
});

export const strawberryImg = fruitSheet((g) => {
  for (let y = 0; y < 11; y++) {
    const half = Math.round(6 - Math.max(0, y - 3) * 0.75);
    px(g, 16 - half, 13 + y, half * 2, 1, y > 6 ? "#c62839" : "#e53950");
  }
  g.fillStyle = "#ffe57a";
  [[12, 15], [16, 16], [19, 14], [14, 19], [18, 19], [16, 22]].forEach(([x, y]) =>
    g.fillRect(x, y, 1, 1)
  );
  px(g, 11, 12, 10, 2, "#3f9b3a");
  px(g, 13, 11, 6, 1, "#5cc04d");
  px(g, 15, 9, 2, 2, "#3f9b3a");
});

export const melonImg = fruitSheet((g) => {
  for (let y = -7; y <= 7; y++) {
    for (let x = -9; x <= 9; x++) {
      if ((x * x) / 81 + (y * y) / 49 <= 1) {
        const stripe = Math.abs(Math.round(x + y * 0.3)) % 4 === 0;
        g.fillStyle = stripe ? "#2f7d32" : "#6cc04a";
        g.fillRect(16 + x, 18 + y, 1, 1);
      }
    }
  }
  px(g, 10, 14, 2, 2, "#b8f09a");
  px(g, 16, 10, 1, 2, "#6b3e26");
});

export const orangeImg = fruitSheet((g) => {
  disc(g, 16, 18, 6, "#f7931e");
  disc(g, 17, 19, 4, "#e07b10");
  g.fillStyle = "#c8650a";
  [[14, 20], [19, 16], [18, 22], [13, 17]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  px(g, 12, 15, 2, 2, "#ffc56b");
  leaf(g, 16, 11);
});

export const pineappleImg = fruitSheet((g) => {
  for (let y = -6; y <= 6; y++) {
    for (let x = -5; x <= 5; x++) {
      if ((x * x) / 25 + (y * y) / 36 <= 1) {
        const hatch = (x + y + 20) % 3 === 0 || (x - y + 20) % 3 === 0;
        g.fillStyle = hatch ? "#c98a1a" : "#f5c242";
        g.fillRect(16 + x, 20 + y, 1, 1);
      }
    }
  }
  g.fillStyle = "#3f9b3a";
  [[12, 12], [14, 10], [16, 8], [18, 10], [20, 12]].forEach(([x, y]) =>
    g.fillRect(x, y, 2, 14 - y)
  );
  px(g, 15, 9, 2, 2, "#5cc04d");
});

export const bananaImg = fruitSheet((g) => {
  for (let y = -8; y <= 8; y++) {
    for (let x = -8; x <= 8; x++) {
      const outer = x * x + y * y <= 64;
      const inner = (x - 3) * (x - 3) + (y + 3) * (y + 3) <= 49;
      if (outer && !inner) {
        g.fillStyle = x + y > 4 ? "#e0b020" : "#ffe14d";
        g.fillRect(16 + x, 16 + y, 1, 1);
      }
    }
  }
  px(g, 22, 9, 2, 2, "#6b3e26");
  px(g, 8, 20, 2, 1, "#6b3e26");
});

// Burst of sparkles played when a fruit is picked up
export const collectedImg = sheet(
  6,
  (g, i) => {
    const r = 3 + i * 2;
    const color = i < 3 ? "#ffffff" : "#fff3a0";
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const size = i < 4 ? 2 : 1;
      px(g, 16 + Math.cos(a) * r, 16 + Math.sin(a) * r, size, size, color);
    }
    if (i < 2) px(g, 14, 14, 4, 4, "#ffffff");
  },
  null
);

export const nothingImg = makeCanvas(32, 32);

// BACKGROUND (low-res layers scaled up by the game; each one tiles horizontally)
const BG_W = 200;
const BG_H = 125;

function layer(draw) {
  const c = makeCanvas(BG_W, BG_H);
  draw(c.getContext("2d"));
  return c;
}

// Height of a ridge of peaks that wraps around seamlessly at BG_W
function ridge(seed, count, minH, maxH, slope) {
  const rand = rng(seed);
  const peaks = [];
  for (let i = 0; i < count; i++) {
    peaks.push({
      x: (i + rand() * 0.6) * (BG_W / count),
      h: minH + rand() * (maxH - minH),
    });
  }
  return (x) => {
    let best = { h: 0, dx: 0 };
    peaks.forEach((p) => {
      let dx = x - p.x;
      dx -= Math.round(dx / BG_W) * BG_W;
      const h = p.h - Math.abs(dx) * slope;
      if (h > best.h) best = { h, dx };
    });
    return best;
  };
}

// Sky: banded dusk gradient with stars
export const back3 = layer((g) => {
  const bands = ["#1d1736", "#2a1f4a", "#3d2a5c", "#5a3a6e", "#7d4a78", "#a85d7a", "#d47f78"];
  const bandH = BG_H / bands.length;
  bands.forEach((color, i) => {
    px(g, 0, Math.floor(i * bandH), BG_W, Math.ceil(bandH) + 1, color);
    // Dither the edge between two bands
    if (i > 0) {
      g.fillStyle = color;
      for (let x = 0; x < BG_W; x += 2) g.fillRect(x, Math.floor(i * bandH) - 1, 1, 1);
    }
  });
  const rand = rng(7);
  g.fillStyle = "#fff6d8";
  for (let i = 0; i < 40; i++) g.fillRect(Math.floor(rand() * BG_W), Math.floor(rand() * 50), 1, 1);
  disc(g, 150, 30, 7, "#ffe9b0");
  disc(g, 148, 28, 5, "#fff6d8");
});

// Far mountains
export const back5 = layer((g) => {
  const r = ridge(11, 4, 50, 75, 0.9);
  for (let x = 0; x < BG_W; x++) {
    const { h } = r(x);
    px(g, x, BG_H - h, 1, h, "#4a3266");
  }
});

// Near mountains with a lit left face
export const back4 = layer((g) => {
  const r = ridge(23, 3, 40, 62, 0.75);
  for (let x = 0; x < BG_W; x++) {
    const { h, dx } = r(x);
    px(g, x, BG_H - h, 1, h, "#2e2140");
    if (dx < 0 && dx > -14) px(g, x, BG_H - h, 1, Math.round(10 + dx * 0.5), "#523a63");
  }
});

function pine(g, x, baseY, height, color, light) {
  const w = Math.round(height * 0.45);
  for (let y = 0; y < height; y++) {
    // Stepped tiers give the classic pixel pine silhouette
    const tier = y % Math.max(3, Math.round(height / 4));
    const half = Math.round(((y + 1) / height) * w * 0.8 + tier * 0.6);
    px(g, x - half, baseY - height + y, half * 2 + 1, 1, color);
    if (light && tier < 2) px(g, x - half, baseY - height + y, 1, 1, light);
  }
  px(g, x - 1, baseY, 2, 3, color);
}

function forest(seed, count, minH, maxH, groundH, color, light) {
  return layer((g) => {
    const rand = rng(seed);
    px(g, 0, BG_H - groundH, BG_W, groundH, color);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * BG_W);
      const h = Math.floor(minH + rand() * (maxH - minH));
      // Draw near both edges too so the layer tiles without seams
      [x - BG_W, x, x + BG_W].forEach((tx) => pine(g, tx, BG_H - groundH, h, color, light));
    }
  });
}

export const back2 = forest(31, 26, 14, 26, 10, "#241a35", "#3a2a4f");
export const back1 = forest(47, 12, 22, 40, 4, "#150f22", null);

// PLATFORMS (pixel size of 3 screen pixels)
const PLATFORM_PIXEL = 3;

export function makePlatform(width, height) {
  const w = Math.ceil(width / PLATFORM_PIXEL);
  const h = Math.ceil(height / PLATFORM_PIXEL);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const rand = rng(width * 31 + height);
  // Rows 0-2 sit above the surface the player stands on: grass tufts only
  const top = 3;
  for (let x = 0; x < w; x++) {
    const tuft = rand();
    if (tuft > 0.55) px(g, x, top - 1, 1, 1, "#6cc04a");
    if (tuft > 0.85) px(g, x, top - 2, 1, 1, "#8fdc5e");
  }
  px(g, 0, top, w, 2, "#6cc04a");
  px(g, 0, top + 2, w, 1, "#3f9b3a");
  px(g, 0, top + 3, w, h, "#7a4a2e");
  for (let i = 0; i < (w * h) / 10; i++) {
    const x = Math.floor(rand() * w);
    const y = top + 4 + Math.floor(rand() * Math.max(1, h - top - 4));
    px(g, x, y, 1, 1, rand() > 0.5 ? "#5e3620" : "#946040");
  }
  // Grass drips over the dirt edge
  for (let x = 0; x < w; x++) {
    if (rand() > 0.6) px(g, x, top + 3, 1, 1, "#3f9b3a");
  }
  return c;
}

// TEXT (5x7 pixel font for titles and prompts)
const FONT = {
  A: ".###.#...##...#######...##...##...#",
  B: "####.#...##...#####.#...##...#####.",
  C: ".###.#...##....#....#....#...#.###.",
  D: "####.#...##...##...##...##...#####.",
  E: "######....#....####.#....#....#####",
  F: "######....#....####.#....#....#....",
  G: ".###.#...##....#.####...##...#.####",
  H: "#...##...##...#######...##...##...#",
  I: "#####..#....#....#....#....#..#####",
  J: "..###...#....#....#.#..#.#..#..##..",
  K: "#...##..#.#.#..##...#.#..#..#.#...#",
  L: "#....#....#....#....#....#....#####",
  M: "#...###.###.#.##.#.##...##...##...#",
  N: "#...###..##.#.##..###...##...##...#",
  O: ".###.#...##...##...##...##...#.###.",
  P: "####.#...##...#####.#....#....#....",
  Q: ".###.#...##...##...##.#.##..#..##.#",
  R: "####.#...##...#####.#.#..#..#.#...#",
  S: ".#####....#.....###.....#....#####.",
  T: "#####..#....#....#....#....#....#..",
  U: "#...##...##...##...##...##...#.###.",
  V: "#...##...##...##...##...#.#.#...#..",
  W: "#...##...##...##.#.##.#.###.###...#",
  X: "#...##...#.#.#...#...#.#.#...##...#",
  Y: "#...##...#.#.#...#....#....#....#..",
  Z: "#####....#...#...#...#...#....#####",
};

// Renders text into the given canvas at 1 canvas pixel per font pixel.
// CSS scales the canvas up; `image-rendering: pixelated` keeps it sharp.
export function pixelText(canvas, text, { color = "#fff5e1", shadow = "#1b0d0a", bold = false } = {}) {
  const lines = text.toUpperCase().split("\n");
  const glyphW = bold ? 6 : 5;
  const advance = glyphW + 1;
  const lineH = 9;
  const pad = 2;
  const maxLen = Math.max(...lines.map((l) => l.length));
  canvas.width = maxLen * advance - 1 + pad * 2;
  canvas.height = lines.length * lineH - 2 + pad * 2;
  const g = canvas.getContext("2d");

  const drawText = (ox, oy, fill) => {
    g.fillStyle = fill;
    lines.forEach((line, li) => {
      const lx = pad + Math.floor(((maxLen - line.length) * advance) / 2);
      [...line].forEach((ch, ci) => {
        const glyph = FONT[ch];
        if (!glyph) return;
        for (let i = 0; i < 35; i++) {
          if (glyph[i] !== "#") continue;
          const x = lx + ci * advance + (i % 5) + ox;
          const y = pad + li * lineH + Math.floor(i / 5) + oy;
          g.fillRect(x, y, bold ? 2 : 1, 1);
        }
      });
    });
  };

  if (shadow) {
    drawText(1, 1, shadow);
    drawText(-1, 0, shadow);
    drawText(0, -1, shadow);
    drawText(1, 0, shadow);
    drawText(0, 1, shadow);
  }
  drawText(0, 0, color);
  return canvas;
}

// Rounded pixel panel used behind the game-over screen
export function pixelPanel(canvas, w, h) {
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  const cut = [3, 2, 1]; // stepped corners
  const fill = (inset, color) => {
    g.fillStyle = color;
    for (let y = inset; y < h - inset; y++) {
      const fromEdge = Math.min(y - inset, h - inset - 1 - y);
      const c = fromEdge < cut.length ? cut[fromEdge] : 0;
      g.fillRect(inset + c, y, w - inset * 2 - c * 2, 1);
    }
  };
  fill(0, "#fff5e1");
  fill(2, "#160806");
  return canvas;
}
