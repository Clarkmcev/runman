import {
  backgrounds,
  maskRun,
  maskJump,
  maskDoubleJump,
  maskFall,
  maskIdle,
  makePlatform,
  cherryImg,
  melonImg,
  orangeImg,
  pineappleImg,
  strawberryImg,
  bananaImg,
  collectedImg,
  nothingImg,
  appleImg,
  pixelText,
  pixelPanel,
} from "./sprites.js";

// Canvas
const myCanvas = document.getElementById("game-board");
const ctx = myCanvas.getContext("2d");

myCanvas.width = 800;
myCanvas.height = 500;
// Keep the low-res pixel art sharp when it is scaled up
ctx.imageSmoothingEnabled = false;

// Phones and tablets get tap prompts instead of key prompts
const isTouch = matchMedia("(pointer: coarse)").matches;

// Menu titles are pixel text drawn in code
pixelText(document.querySelector(".biglogo"), "Runman", { bold: true });
pixelText(document.getElementById("press-enter"), isTouch ? "Tap to start" : "Press Enter");
pixelPanel(document.querySelector(".blackscreen"), 130, 56);
pixelText(document.querySelector(".gameovermessage"), "Game Over", { bold: true });
pixelText(document.getElementById("overpress"), isTouch ? "Tap\nto restart" : "Press Enter\nto restart");

// Theme: saved choice, otherwise follow the system setting. T toggles it.
const THEME_KEY = "runman-theme";
const hudColor = { dark: "yellow", light: "#2a2448" };
let theme = loadTheme();
applyTheme();

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  theme = theme === "light" ? "dark" : "light";
  applyTheme();
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

// Scale the fixed-size stage (canvas + menus) to fill the whole window
const stage = document.getElementById("stage");
function fitStage() {
  const scaleX = window.innerWidth / myCanvas.width;
  const scaleY = window.innerHeight / myCanvas.height;
  stage.style.transform = `scale(${scaleX}, ${scaleY})`;
}
addEventListener("resize", fitStage);
fitStage();

// Configs
const gravity = 1;
let speedObj = 0.7;
let gameAsStarted = false;
let points = 0;

// Audio
var jumpSound = new Audio("./SOUND/SFX_Jump_42.wav", 100);
var doubleJump = new Audio("./SOUND/SFX_Jump_24.wav");
var playerFall = new Audio("./SOUND/Teleport_3.wav");
var footSteps = new Audio("./SOUND/sfx_movement_footsteps1b.wav");
var fruitCollected = new Audio("./SOUND/collected.wav");
var jumpLand = new Audio("./SOUND/sfx_movement_jump9_landing.wav");
var musicBack = new Audio("./SOUND/Musics/Runman soundtrack MASTER.wav", 0.2);
var enterSound = new Audio("./SOUND/entersound.wav");
var gameOverSound = new Audio("./SOUND/game_over_bad_chest.wav");
var musicFront = new Audio("./SOUND/Musics/spirited_away.mp3");
var musicFront = new Audio("./SOUND/Musics/8-bit-lofi-hip-hop (1).mp3");

musicBack.volume = 0.6;
jumpSound.volume = 0.6;
enterSound.volume = 0.5;
doubleJump.volume = 0.5;
fruitCollected.volume = 0.4;
gameOverSound.volume = 0.7;
musicFront.volume = 0.1;
jumpLand.volume = 1;
playerFall.volume = 0.1;
footSteps.volume = 0.1;

// Sound on/off: saved between visits, M toggles it
const soundButton = document.getElementById("sound-toggle");
const SOUND_KEY = "runman-sound";
const sounds = [
  jumpSound,
  doubleJump,
  playerFall,
  footSteps,
  fruitCollected,
  jumpLand,
  musicBack,
  enterSound,
  gameOverSound,
  musicFront,
];
let soundOn = loadSound();
applySound();

function loadSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function applySound() {
  sounds.forEach((sound) => (sound.muted = !soundOn));
  soundButton.textContent = soundOn ? "Sound on" : "Sound off";
}

function toggleSound() {
  soundOn = !soundOn;
  applySound();
  try {
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
  } catch {}
}

musicBack;

let widthBackPlus = 0;
let widthBack = 0;
let widthMid = 0;
let widthFore = 0;
let widthForePlus = 0;
let scrollingSpeed1 = 0.5;
let scrollingSpeed2 = 1;
let scrollingSpeed3 = 2;
let scrollingSpeed4 = 4;
let scrollingSpeed5 = 5;

let frames = 0;
let nPressEnter = 1;

let currentGame;
let currentPlayer;

// DOM
const pressEnter = document.getElementById("press-enter");
const pressEnterRestart = document.getElementById("overpress");
const scoreSpan = document.getElementById("scorespan");
const startMenu = document.getElementById("start-menu");
const gameOverMenu = document.getElementById("game-over");
const themeButton = document.getElementById("theme-toggle");
const returnButton = document.getElementById("return");

let pressLoop1 = false;
let pressLoop2 = false;

class Player {
  constructor() {
    this.position = {
      x: 150,
      y: 370,
    };
    this.velocity = {
      x: 0,
      y: 1,
    };
    this.width = 50;
    this.height = 70;
    this.image = maskRun;
    this.frames = 0;

    this.sprites = {
      run: {
        image: maskRun,
        cropWidth: 32,
        maxFrames: 12,
      },
      jump: {
        image: maskJump,
        cropWidth: 32,
        maxFrames: 1,
      },
      doubleJump: {
        image: maskDoubleJump,
        cropWidth: 32,
        maxFrames: 7,
      },
      fall: {
        image: maskFall,
        cropWidth: 32,
        maxFrames: 1,
      },
      idle: {
        image: maskIdle,
        cropWidth: 32,
        maxFrames: 11,
      },
    };

    this.currentSprite = this.sprites.run.image;
    this.currentCropWidth = this.sprites.run.cropWidth;
    this.CurrentMaxFrames = this.sprites.run.maxFrames;
  }
  draw() {
    ctx.drawImage(
      this.currentSprite,
      this.currentCropWidth * this.frames,
      0,
      this.currentCropWidth,
      32,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );
  }

  update() {
    // Sprite Player
    if (frames % 5 === 0 && this.currentSprite === this.sprites.run.image) {
      this.frames += 1;
      if (this.frames >= this.CurrentMaxFrames) {
        this.frames = 0;
      }
      this.draw();
    } else if (
      frames % 1 === 0 &&
      this.currentSprite === this.sprites.jump.image
    ) {
      this.frames += 1;
      if ((this.frames = this.CurrentMaxFrames)) {
        this.frames = 0;
      }
      this.draw();
    } else if (
      frames % 6 === 0 &&
      this.currentSprite === this.sprites.doubleJump.image
    ) {
      this.frames += 1;
      if (this.frames >= this.CurrentMaxFrames) {
        this.frames = 0;
        this.currentSprite = this.sprites.jump.image;
      }
      this.draw();
    } else if (
      frames % 1 === 0 &&
      this.currentSprite === this.sprites.fall.image
    ) {
      this.frames += 1;
      if (this.frames >= this.CurrentMaxFrames) {
        this.frames = 0;
      }
      this.draw();
    } else if (
      frames % 5 === 0 &&
      this.currentSprite === this.sprites.idle.image
    ) {
      this.frames += 1;
      if (this.frames >= this.CurrentMaxFrames) {
        this.frames = 0;
      }
      this.draw();
    } else {
      this.draw();
    }

    this.position.y += this.velocity.y;

    if (this.position.x < 150) {
      this.position.x += 0.5;
    }

    if (
      this.position.y /*+ this.height + this.velocity.y*/ <= myCanvas.height
    ) {
      this.velocity.y += gravity;
    } else {
      this.velocity.y = 0;
    }

    // if (this.position.y <= 0) {
    //   this.position.y = 0;
    // }
  }

  jump() {
    this.position.y += 50;
    this.update();
  }
}

class Game {
  constructor() {
    this.player = {};
    this.platforms = [];
    this.score = 0;

    this.pointsToBeReceived = true;
  }
  clear() {
    this.player = {};
    this.platform = [];
  }
}

// can pass in arguments image
class Platform {
  constructor(x, y, width, height, image, color, radius = 0) {
    this.position = {
      x: x,
      y: y,
    };
    this.width = width;
    this.height = height;
    this.image = image;
    this.color = color;
    this.radius = radius;
  }
  update() {
    ctx.fillStyle = "transparent"; /* this.pattern; */
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    // Clip to a rounded rectangle so the grass tile has round corners
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      this.position.x,
      this.position.y - 10,
      this.width,
      this.height,
      this.radius
    );
    ctx.clip();
    ctx.drawImage(
      this.image,
      this.position.x,
      this.position.y - 10,
      this.width,
      this.height
    );
    ctx.restore();
  }
}

class Coin {
  constructor(x, y, width, height, image) {
    this.position = {
      x: x,
      y: y,
    };
    this.velocity = {
      x: 0,
      y: 0.2,
    };
    this.width = width;
    this.height = height;
    this.frames = 0;
    this.isFruitCollected = false;
    this.image = image;

    this.sprites = {
      banana: {
        image: bananaImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 3,
        color: "yellow",
      },
      cherry: {
        image: cherryImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 2,
        color: "red",
      },
      strawberry: {
        image: strawberryImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 2,
        color: "red",
      },
      melon: {
        image: melonImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 3,
        color: "red",
      },
      orange: {
        image: orangeImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 3,
        color: "orange",
      },
      pineapple: {
        image: pineappleImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 3,
        color: "orange",
      },
      apple: {
        image: appleImg,
        cropWidth: 32,
        maxFrames: 17,
        points: 2,
        color: "red",
      },
      collected: {
        image: collectedImg,
        cropWidth: 32,
        maxFrames: 7,
        points: 0,
        color: "white",
      },
      nothing: {
        image: nothingImg,
        cropWidth: 32,
        maxFrames: 4,
        points: 0,
        color: "white",
      },
    };

    this.currentSprite = this.sprites[this.image].image;
    this.currentCropWidth = this.sprites[this.image].cropWidth;
    this.currentMaxFrames = this.sprites[this.image].maxFrames;
    this.currentPoints = this.sprites[this.image].points;
    this.currentColor = this.sprites[this.image].color;
  }

  fruitCollection(coin) {
    if (this.frames) {
      ctx.font = "25px bit";
      ctx.fillStyle = coin.currentColor;
      ctx.fillText(
        `+${coin.currentPoints}`,
        coin.position.x + coin.width + 50,
        coin.position.y
      );
    }
  }

  draw() {
    ctx.drawImage(
      this.currentSprite,
      this.currentCropWidth * this.frames,
      0,
      this.currentCropWidth,
      32,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );
  }

  update() {
    ctx.fillStyle = "transparent";
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

    this.frames += 1;
    if (
      this.frames >= this.currentMaxFrames &&
      this.currentSprite != collectedImg
    ) {
      this.frames = 0;
    }
    if (
      this.frames >= this.currentMaxFrames &&
      this.currentSprite === collectedImg &&
      frames % 2 === 0
    ) {
      this.frames = 0;
    }

    this.draw();

    this.position.y += this.velocity.y;
    if (this.position.y <= myCanvas.height) {
      this.velocity.y += gravity;
    } else {
      this.velocity.y = 0;
    }
  }
}

// Functions
// Press Enter Functions
setInterval(() => {
  if (!pressLoop1) {
    pressEnter.style.display = "none";
    pressLoop1 = true;
  } else {
    pressEnter.style.display = "block";
    pressLoop1 = false;
  }
}, 500);

// Press for Restart
setInterval(() => {
  if (!pressLoop2) {
    pressEnterRestart.style.display = "none";
    pressLoop2 = true;
  } else {
    pressEnterRestart.style.display = "block";
    pressLoop2 = false;
  }
}, 500);

// Start function
function startGame() {
  musicFront.pause();
  musicFront.currentTime = 0;
  gameAsStarted = true;
  gameOverSound.pause();
  gameOverSound.currenTime = 0;
  musicBack.play();
  clearInterval();
}

function computeScore() {
  let nFruitCollected = [];
  currentGame.currentCoins.forEach((elem, index) => {
    if (
      !nFruitCollected.includes(index) &&
      elem.currentSprite === collectedImg
    ) {
      nFruitCollected.push(elem.currentPoints);
    }
  });
  obstacleFrequency + -speedObj;
  currentGame.currentPlatforms.forEach((elem, index) => {
    if (elem.position.x + elem.width <= 0) {
      currentGame.currentPlatforms.splice(elem, 1);
    }
  });

  currentGame.score = nFruitCollected.reduce((a, b) => a + b, 0);
  ctx.font = "50px bit";
  ctx.fillStyle = hudColor[theme];
  ctx.fillText(`Score ${currentGame.score}`, 20, 30);
}

function updateSpeed() {
  currentGame.currentPlatforms.forEach((elem) => {
    elem.position.x -= speedObj;
  });

  currentGame.currentCoins.forEach((coin) => {
    coin.position.x -= speedObj;
  });
}
let nJump = 0;

// Actions shared by the keyboard and touch controls
function dropDown() {
  if (!currentGame.currentPlayer) return;
  currentGame.currentPlayer.position.y += 10;
}

function pressStart() {
  startMenu.style.display = "none";
  enterSound.play();
  if (!gameAsStarted) {
    startGame();
  }
  if (gameAsStarted /*&& checkGameOver() === true*/) {
    gameOverMenu.style.display = "none";
    Init();
  }
}

function jump() {
  if (!currentGame.currentPlayer) return;
  nJump += 1;
  if (nJump === 1) {
    jumpSound.play();
    currentGame.currentPlayer.velocity.y -= 18;
    currentGame.currentPlayer.CurrentMaxFrames =
      currentGame.currentPlayer.CurrentMaxFrames =
        currentGame.currentPlayer.sprites.jump.maxFrames;
  } else if (nJump === 2) {
    doubleJump.play(currentGame.currentPlayer.velocity.y);
    currentGame.currentPlayer.velocity.y -= 20;
    currentGame.currentPlayer.CurrentMaxFrames =
      currentGame.currentPlayer.sprites.doubleJump.maxFrames;
    currentGame.currentPlayer.currentSprite =
      currentGame.currentPlayer.sprites.doubleJump.image;
  }
}

function returnToMenu() {
  if (!gameAsStarted) {
    gameOverMenu.style.display = "none";
    startMenu.style.display = "block";
    Init();
  }
}

// EventListener
addEventListener("keydown", (event) => {
  switch (event.code) {
    case "ArrowDown":
      dropDown();
      break;
    case "Enter":
      pressStart();
      break;
    case "Space":
      jump();
      break;
    case "KeyT":
      toggleTheme();
      break;
    case "KeyM":
      toggleSound();
      break;
    case "Escape":
      returnToMenu();
      break;
  }
});

// Touch / mouse: while playing, the right half of the screen jumps and the
// left half drops through a platform; on a menu, a tap starts the game.
let tapStartedOnMenu = false;

stage.addEventListener("pointerdown", (event) => {
  tapStartedOnMenu = !gameAsStarted;
  if (!gameAsStarted) return;
  if (event.clientX < window.innerWidth / 2) {
    dropDown();
  } else {
    jump();
  }
});

// Starting happens on release: browsers only allow audio and fullscreen
// after a completed tap, not on touchstart / pointerdown.
stage.addEventListener("pointerup", () => {
  if (!tapStartedOnMenu || gameAsStarted) return;
  tapStartedOnMenu = false;
  if (isTouch) goFullscreen();
  pressStart();
});

function goFullscreen() {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement
    .requestFullscreen()
    .then(() => screen.orientation?.lock?.("landscape"))
    .catch(() => {});
}

// Buttons on top of the stage must not also count as a tap on the game
[themeButton, soundButton, returnButton].forEach((button) => {
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("pointerup", (event) => event.stopPropagation());
});
// Drop focus after a click so SPACE / ENTER don't press the button again
themeButton.addEventListener("click", () => {
  toggleTheme();
  themeButton.blur();
});
soundButton.addEventListener("click", () => {
  toggleSound();
  soundButton.blur();
});
returnButton.addEventListener("click", returnToMenu);

function checkGameOver() {
  if (currentGame.currentPlayer.position.y >= myCanvas.height) {
    playerFall.play();
  }

  if (currentGame.currentPlayer.position.y >= myCanvas.height) {
    obstacleFrequency = 0;
    currentGame.currentPlatforms = [];
    scoreSpan.innerText = " " + currentGame.score;
    currentGame.score = 0;
    gameOverMenu.style.display = "block";
    speedObj = 1.25;
    delete currentGame.currentPlayer;
    gameAsStarted = false;
    musicBack.pause();
    musicBack.currentTime = 0;
    gameOverSound.play();

    return true;
  } else return false;
}

function randomObjects(n) {
  let arrFruit = [
    "banana",
    "cherry",
    "strawberry",
    "pineapple",
    "melon",
    "orange",
    "apple",
  ];
  let arrPlatY = [100, 200, 300, 400];
  // let image;
  setTimeout(() => {
    if (n % 20 === 1) {
      // let randomY = Math.floor(Math.random() * 200 + 160);
      let randomWidth = Math.floor(Math.random() * 100 + 150);
      let randomArrPlatYIndex = Math.floor(Math.random() * arrPlatY.length);
      currentGame.currentPlatforms.push(
        new Platform(
          myCanvas.width,
          arrPlatY[randomArrPlatYIndex],
          randomWidth,
          30,
          makePlatform(randomWidth, 30),
          undefined,
          15
        )
      );
      let imageIndexRandom = Math.floor(Math.random() * arrFruit.length);

      let randomSpawnFruit = Math.floor(Math.random() * 100);
      if (randomSpawnFruit >= 80) {
        currentGame.currentCoins.push(
          new Coin(
            myCanvas.width + randomWidth / 2,
            arrPlatY[randomArrPlatYIndex] - 100,
            50,
            60,
            arrFruit[imageIndexRandom]
          )
        );
      }
    }
  }, 10);
}

let obstacleFrequency = 0;

function Init() {
  gameOverSound.pause();
  gameOverSound.currentTime = 0;
  if (!gameAsStarted) {
    musicFront.play();
  }
  currentGame = new Game();
  currentGame.currentPlayer = new Player();

  // Platform plus froot init
  currentGame.currentCoins = [new Coin(560, 350, 50, 60, "cherry")];
  currentGame.currentPlatforms = [new Platform(0, 470, 800, 50, makePlatform(800, 50))];
  currentGame.currentPlatforms[0].update();
  currentGame.currentCoins[0].update();
  currentGame.currentPlayer.update();
}

Init();
animate();

function backgroundRender() {
  //   BACKGROUND RENDERING
  const { back1, back2, back3, back4, back5 } = backgrounds[theme];
  //   BackGround sky
  ctx.drawImage(back3, widthBackPlus, 0, myCanvas.width, myCanvas.height);
  ctx.drawImage(
    back3,
    widthBackPlus + myCanvas.width,
    0,
    myCanvas.width,
    myCanvas.height
  );

  ctx.drawImage(back5, widthBack, 0, myCanvas.width, myCanvas.height);
  ctx.drawImage(
    back5,
    widthBack + myCanvas.width,
    0,
    myCanvas.width,
    myCanvas.height
  );

  // Mountain trees
  ctx.drawImage(back2, widthMid, 0, myCanvas.width, myCanvas.height);
  ctx.drawImage(
    back2,
    widthMid + myCanvas.width,
    0,
    myCanvas.width,
    myCanvas.height
  );

  // Mountains
  ctx.drawImage(back4, widthMid, 0, myCanvas.width, myCanvas.height);
  ctx.drawImage(
    back4,
    widthMid + myCanvas.width,
    0,
    myCanvas.width,
    myCanvas.height
  );
  // Trees
  ctx.drawImage(back1, widthFore, 0, myCanvas.width, myCanvas.height);
  ctx.drawImage(
    back1,
    widthFore + myCanvas.width,
    0,
    myCanvas.width,
    myCanvas.height
  );

  // conditionals background
  if (widthBackPlus == -myCanvas.width) {
    widthBackPlus = 0;
  }

  if (widthBack == -myCanvas.width) {
    widthBack = 0;
  }

  if (widthFore == -myCanvas.width) {
    widthFore = 0;
  }

  if (widthMid == -myCanvas.width) {
    widthMid = 0;
  }

  widthBackPlus -= scrollingSpeed1;
  widthBack -= scrollingSpeed2;
  widthMid -= scrollingSpeed3;
  widthFore -= scrollingSpeed4;
}

let isUp = false;

function collisionsAndUpdate() {
  // Update Coin, platform and Player
  if (currentGame.currentPlayer && currentGame.currentPlatforms) {
    currentGame.currentPlatforms.forEach((platform) => {
      platform.update();
    });
    currentGame.currentCoins.forEach((coin) => {
      coin.update();
    });
    currentGame.currentPlayer.update();

    if (gameAsStarted && currentGame.currentPlayer.velocity.y < 0) {
      isUp = true;
    }

    // Collision Platforms and player
    currentGame.currentPlatforms.forEach((elem) => {
      if (
        currentGame.currentPlayer.position.y +
          currentGame.currentPlayer.height <=
          elem.position.y &&
        currentGame.currentPlayer.position.y +
          currentGame.currentPlayer.height +
          currentGame.currentPlayer.velocity.y >=
          elem.position.y &&
        currentGame.currentPlayer.position.x +
          currentGame.currentPlayer.width >=
          elem.position.x &&
        elem.position.x + elem.width >= currentGame.currentPlayer.position.x
      ) {
        // Velocity to 0 when the player land on a platform
        // Snap the feet onto the platform so there is no gap after landing
        currentGame.currentPlayer.position.y =
          elem.position.y - currentGame.currentPlayer.height;

        if (gameAsStarted) {
          currentGame.currentPlayer.currentSprite =
            currentGame.currentPlayer.sprites.run.image;
          currentGame.currentPlayer.velocity.y = 0;
          currentGame.currentPlayer.currentSprite =
            currentGame.currentPlayer.sprites.run.image;
          currentGame.currentPlayer.currentCropWidth =
            currentGame.currentPlayer.sprites.run.cropWidth;
          currentGame.currentPlayer.CurrentMaxFrames =
            currentGame.currentPlayer.sprites.run.maxFrames;
        } else {
          currentGame.currentPlayer.currentSprite =
            currentGame.currentPlayer.sprites.idle.image;
          currentGame.currentPlayer.velocity.y = 0;
          currentGame.currentPlayer.currentSprite =
            currentGame.currentPlayer.sprites.idle.image;
          currentGame.currentPlayer.currentCropWidth =
            currentGame.currentPlayer.sprites.idle.cropWidth;
          currentGame.currentPlayer.CurrentMaxFrames =
            currentGame.currentPlayer.sprites.idle.maxFrames;
        }

        // Landing sound
        if (isUp) {
          jumpLand.play();
          isUp = false;
        }
        // Run Sprite when on a platform
        nJump = 0;
      }

      // Sprite Fall
      if (
        currentGame.currentPlayer.velocity.y > 0 &&
        currentGame.currentPlayer.velocity.y < 12 &&
        currentGame.currentPlayer.currentSprite != maskFall
      ) {
        currentGame.currentPlayer.currentSprite =
          currentGame.currentPlayer.sprites.fall.image;
        currentGame.currentPlayer.currentCropWidth =
          currentGame.currentPlayer.sprites.fall.cropWidth;
        currentGame.currentPlayer.CurrentMaxFrames =
          currentGame.currentPlayer.sprites.fall.maxFrames;
      }
      // Collision with the side of the platforms
      // if (
      //   currentGame.currentPlayer.position.x +
      //     currentGame.currentPlayer.width >=
      //     elem.position.x &&
      //   currentGame.currentPlayer.position.y +
      //     currentGame.currentPlayer.height >=
      //     elem.position.y &&
      //   currentGame.currentPlayer.position.x <= elem.position.x + elem.height &&
      //   currentGame.currentPlayer.position.y +
      //     currentGame.currentPlayer.height <=
      //     elem.position.y + elem.height
      // ) {
      //   currentGame.currentPlayer.position.x -= speedObj;
      // }
    });

    // Collisions Coins and player
    currentGame.currentCoins.forEach((coin) => {
      currentGame.currentPlatforms.forEach((platform) => {
        if (
          coin.position.y + coin.height <= platform.position.y &&
          coin.position.y + coin.height + coin.velocity.y >=
            platform.position.y &&
          coin.position.x + coin.width >= platform.position.x &&
          platform.position.x + platform.width >= coin.position.x
        ) {
          coin.velocity.y = -5;
        }
        if (
          coin.position.x <= currentGame.currentPlayer.position.x &&
          currentGame.currentPlayer.position.y >= coin.position.y &&
          coin.position.x + coin.width > currentGame.currentPlayer.position.x &&
          currentGame.currentPlayer.position.x +
            currentGame.currentPlayer.width >=
            coin.position.x &&
          currentGame.currentPlayer.position.y <= coin.position.y + coin.height
        ) {
          fruitCollected.play();
          coin.currentSprite = collectedImg;
          coin.fruitCollection(coin);
        }
        if (
          coin.position.x - 200 <= currentGame.currentPlayer.position.x &&
          coin.currentSprite === collectedImg
        ) {
        }
      });
    });
  }
}

// ANIMATION - HERE
function animate() {
  frames++;
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);

  backgroundRender();
  collisionsAndUpdate();

  if (gameAsStarted) {
    speedObj += 0.004;
    obstacleFrequency++;
    updateSpeed();
    randomObjects(obstacleFrequency);
    checkGameOver();
    computeScore();
  }
  // console.log(currentGame.currentPlayer.currentSprite);
  requestAnimationFrame(animate);
}
