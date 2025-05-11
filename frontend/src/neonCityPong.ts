import { PongGame } from "./game.js";
import { StatsManager } from "./stats.js";
import i18next from "./i18n/config.js";

// Defines interfaces for buildings and power-ups used in the game
interface Building {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  image: HTMLImageElement;
}

interface PowerUp {
  x: number;
  y: number;
  type: "speedBoost" | "paddleExtend";
  active: boolean;
  side: "left" | "right";
}


// Extends the base PongGame class to create a neon-themed version with additional features
export class NeonCityPong extends PongGame {
  // Array to store building objects for the background
  protected buildings: Building[];
  // Array to store power-up objects
  protected powerUps: PowerUp[];
  // Timer to control power-up spawning
  protected powerUpTimer: number;
  // Constant for power-up spawn interval
  protected readonly POWER_UP_SPAWN_INTERVAL: number;
  // Stores the animation frame ID for the game loop
  protected animationFrameId: number | null = null;
  // Heights for left and right paddles, which can change with power-ups
  protected paddleLeftHeight: number = 80;
  protected paddleRightHeight: number = 80;
  // Function to navigate to different routes
  public navigate: (path: string) => void;
  // Offscreen canvas for static background
  protected backgroundCanvas: HTMLCanvasElement | null = null;
  protected backgroundCtx: CanvasRenderingContext2D | null = null;
  protected isBackgroundInitializing: boolean = false;
  // Reference to background color select element
  public backgroundColorSelect: HTMLSelectElement | null = null;
  // Static background image
  protected backgroundImage: HTMLImageElement | null = null;
  // Store the background color select ID for re-fetching if needed
  protected readonly backgroundColorSelectId: string;
  // Background color with default value
  public backgroundColor: string = "#d8a8b5";
  // Tracks if speed boost is active
  protected isSpeedBoosted: boolean = false;
  // Stores the boosted speed values
  protected boostedSpeedX: number = 0;
  protected boostedSpeedY: number = 0;
  // Tracks active power-up effects
  protected leftSpeedBoostActive: boolean = false;
  protected rightSpeedBoostActive: boolean = false;
  protected leftPaddleExtendActive: boolean = false;
  protected rightPaddleExtendActive: boolean = false;
  // Maximum speed limit for the ball
  protected readonly MAX_SPEED_INCREASE: number = 1.5; // 50% above base speed

  // Constructor initializes the game with player names, DOM element IDs, and other dependencies
  constructor(
    playerLeftName: string,
    playerRightName: string,
    canvasId: string,
    speedSliderId: string,
    backgroundColorSelectId: string,
    scoreLeftId: string,
    scoreRightId: string,
    restartButtonId: string,
    settingsButtonId: string,
    settingsMenuId: string,
    settingsContainerId: string,
    statsManager: StatsManager,
    userEmail: string | null,
    navigate: (path: string) => void,
    onGameEnd?: (winnerName: string) => void
  ) {
    // Calls the parent class constructor
    super(
      playerLeftName,
      playerRightName,
      canvasId,
      speedSliderId,
      backgroundColorSelectId,
      scoreLeftId,
      scoreRightId,
      restartButtonId,
      settingsButtonId,
      settingsMenuId,
      settingsContainerId,
      statsManager,
      userEmail,
      onGameEnd,
      navigate
    );
    this.navigate = navigate;
    this.backgroundColorSelectId = backgroundColorSelectId; // Store the ID for later use
    // Checks if canvas context is initialized
    if (!this.ctx) {
      console.error("Canvas context not initialized!");
      throw new Error("Failed to get 2D canvas context");
    }
    // Initialize building image
    const buildingImage = new Image();
    buildingImage.src = "assets/buildingBlock.png";
    // Initializes buildings with position, size, speed, and image
    this.buildings = [
      { x: 200 * this.scale, y: 100 * this.scale, width: 30 * this.scale, height: 80 * this.scale, speed: 0.5 * this.scale, image: buildingImage },
      { x: 300 * this.scale, y: 300 * this.scale, width: 40 * this.scale, height: 120 * this.scale, speed: -0.5 * this.scale, image: buildingImage },
      { x: 600 * this.scale, y: 200 * this.scale, width: 25 * this.scale, height: 100 * this.scale, speed: 0.75 * this.scale, image: buildingImage },
    ];
    // Initializes empty power-ups array
    this.powerUps = [];
    // Sets initial power-up timer
    this.powerUpTimer = 0;
    // Sets power-up spawn interval
    this.POWER_UP_SPAWN_INTERVAL = 500;

    // Initialize background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = "assets/buildingBackground.png";
    this.backgroundImage.onload = () => {
      console.log("Background image loaded successfully");
      if (this.backgroundCtx) {
        this.drawNeonBackground(this.backgroundCtx);
      }
    };
    this.backgroundImage.onerror = () => {
      console.error("Failed to load background image");
    };

    // Logs initialization details
    console.log("NeonCityPong initialized:", {
      buildings: this.buildings,
      powerUps: this.powerUps,
      powerUpTimer: this.powerUpTimer,
      POWER_UP_SPAWN_INTERVAL: this.POWER_UP_SPAWN_INTERVAL,
    });

    // Binds methods to the class instance
    this.draw = this.draw.bind(this);
    this.drawBuildings = this.drawBuildings.bind(this);
    this.drawPowerUps = this.drawPowerUps.bind(this);
    this.spawnPowerUp = this.spawnPowerUp.bind(this);
    this.checkPowerUpCollision = this.checkPowerUpCollision.bind(this);
    this.checkBuildingCollision = this.checkBuildingCollision.bind(this);

    // Resizes canvas and starts animation
    this.resizeCanvas();
    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.initBackgroundCanvas();
    });

    // Touch controls for mobile/tablet
    if ('ontouchstart' in window) {
      let lastTouchY: number | null = null;
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          lastTouchY = e.touches[0].clientY;
        }
      });
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          const rect = this.canvas.getBoundingClientRect();
          const touchX = e.touches[0].clientX - rect.left;
          const touchY = e.touches[0].clientY - rect.top;
          // Left half controls left paddle, right half controls right paddle
          if (touchX < this.canvas.width / 2) {
            this.paddleLeftY = Math.max(0, Math.min(this.baseHeight - 80, touchY - 40));
          } else {
            this.paddleRightY = Math.max(0, Math.min(this.baseHeight - 80, touchY - 40));
          }
        }
      }, { passive: false });
      this.canvas.addEventListener('touchend', () => {
        lastTouchY = null;
      });
    }
  }

  // Initializes the offscreen background canvas
  protected initBackgroundCanvas(): void {
    if (!this.canvas) return;
    this.isBackgroundInitializing = true;
    this.backgroundCanvas = document.createElement("canvas");
    this.backgroundCanvas.width = this.canvas.width;
    this.backgroundCanvas.height = this.canvas.height;
    this.backgroundCtx = this.backgroundCanvas.getContext("2d");
    if (!this.backgroundCtx) {
      console.error("Failed to get 2D context for background canvas");
      return;
    }
    if (this.backgroundImage && this.backgroundImage.complete) {
    this.drawNeonBackground(this.backgroundCtx);
    }
    this.isBackgroundInitializing = false;
  }

  // Resizes the canvas based on browser window size and maintains aspect ratio
  protected resizeCanvas(): void {
    const maxWidth = window.innerWidth * 0.9; // Use 90% of browser width
    const maxHeight = window.innerHeight * 0.9; // Use 90% of browser height
    const aspectRatio = this.baseWidth / this.baseHeight;

    let newWidth = Math.min(maxWidth, this.baseWidth);
    let newHeight = newWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    // Updates scale and canvas dimensions
    this.scale = newWidth / this.baseWidth;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    // Center the canvas
    this.canvas.style.display = "block";
    this.canvas.style.margin = "auto";

    // Resets game elements positions and speeds
    this.ballX = (this.baseWidth / 2) * this.scale;
    this.ballY = (this.baseHeight / 2) * this.scale;
    this.paddleLeftY = (this.baseHeight / 2 - 40) * this.scale;
    this.paddleRightY = (this.baseHeight / 2 - 40) * this.scale;
    // Initialize ball speed with slider value
    const speedMultiplier = this.getSpeedMultiplier();
    this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier;
    this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier;
    this.isSpeedBoosted = false; // Reset speed boost
    this.boostedSpeedX = 0;
    this.boostedSpeedY = 0;
    this.paddleSpeed = 7 * this.scale;
    this.paddleLeftHeight = 80 * this.scale;
    this.paddleRightHeight = 80 * this.scale;

    // Reinitializes buildings with scaled values
    const buildingImage = new Image();
    buildingImage.src = "assets/buildingBlock.png";
    this.buildings = [
      { x: 200 * this.scale, y: 100 * this.scale, width: 30 * this.scale, height: 80 * this.scale, speed: 0.5 * this.scale, image: buildingImage },
      { x: 300 * this.scale, y: 300 * this.scale, width: 40 * this.scale, height: 120 * this.scale, speed: -0.5 * this.scale, image: buildingImage },
      { x: 600 * this.scale, y: 200 * this.scale, width: 25 * this.scale, height: 100 * this.scale, speed: 0.75 * this.scale, image: buildingImage },
    ];
    this.powerUps = [];
    this.powerUpTimer = 0;
    // Reset power-up effect flags
    this.leftSpeedBoostActive = false;
    this.rightSpeedBoostActive = false;
    this.leftPaddleExtendActive = false;
    this.rightPaddleExtendActive = false;
  }

  // Spawns a power-up at a random position near a paddle
  protected spawnPowerUp(): void {
    // Check if power-ups can be spawned
    const canSpawnLeftSpeed = !this.leftSpeedBoostActive && !this.powerUps.some(p => p.active && p.type === "speedBoost" && p.side === "left");
    const canSpawnRightSpeed = !this.rightSpeedBoostActive && !this.powerUps.some(p => p.active && p.type === "speedBoost" && p.side === "right");
    const canSpawnLeftPaddle = !this.leftPaddleExtendActive && !this.powerUps.some(p => p.active && p.type === "paddleExtend" && p.side === "left");
    const canSpawnRightPaddle = !this.rightPaddleExtendActive && !this.powerUps.some(p => p.active && p.type === "paddleExtend" && p.side === "right");

    // Exit if no power-ups can be spawned
    if (!canSpawnLeftSpeed && !canSpawnRightSpeed && !canSpawnLeftPaddle && !canSpawnRightPaddle) {
      return;
    }

    // Randomly select a side and type
    const possibleSpawns: { type: "speedBoost" | "paddleExtend"; side: "left" | "right" }[] = [];
    if (canSpawnLeftSpeed) possibleSpawns.push({ type: "speedBoost", side: "left" });
    if (canSpawnRightSpeed) possibleSpawns.push({ type: "speedBoost", side: "right" });
    if (canSpawnLeftPaddle) possibleSpawns.push({ type: "paddleExtend", side: "left" });
    if (canSpawnRightPaddle) possibleSpawns.push({ type: "paddleExtend", side: "right" });

    if (possibleSpawns.length === 0) return;

    const spawn = possibleSpawns[Math.floor(Math.random() * possibleSpawns.length)];
    const x = spawn.side === "left" ? 20 * this.scale : (this.baseWidth - 20) * this.scale;
    const y = Math.random() * (this.canvas.height - 20 * this.scale) + 10 * this.scale;

    if (!this.powerUps) {
      console.warn("powerUps array is undefined, reinitializing...");
      this.powerUps = [];
    }
    this.powerUps.push({ x, y, type: spawn.type, active: true, side: spawn.side });
    console.log(`Spawned ${spawn.type} power-up on ${spawn.side} side`);
  }

  // Draws the neon-themed background
  protected drawNeonBackground(ctx: CanvasRenderingContext2D): void {
    const canvas = ctx.canvas;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the static background image, stretched to fit canvas width and aligned at the bottom
    if (!this.backgroundImage || !this.backgroundImage.complete) {
      // Only warn once when image is completely missing
      if (!this.backgroundImage) {
        console.warn("Background image not loaded, skipping draw");
      }
    } else {
      const imgWidth = canvas.width; // Stretch to full canvas width
      const aspectRatio = this.backgroundImage.naturalWidth / this.backgroundImage.naturalHeight;
      const imgHeight = imgWidth / aspectRatio; // Maintain original aspect ratio
      const imgY = canvas.height - imgHeight + 200 * this.scale; // Shift downward by 200 scaled pixels
      ctx.drawImage(this.backgroundImage, 0, imgY, imgWidth, imgHeight);
    }
  }

  // Draws moving buildings in the background
  protected drawBuildings(ctx: CanvasRenderingContext2D): void {
    if (!this.buildings) {
      console.warn("Buildings array is undefined, reinitializing...");
      const buildingImage = new Image();
      buildingImage.src = "assets/buildingBlock.png";
      this.buildings = [
        { x: 200 * this.scale, y: 100 * this.scale, width: 30 * this.scale, height: 80 * this.scale, speed: 0.5 * this.scale, image: buildingImage },
        { x: 300 * this.scale, y: 300 * this.scale, width: 40 * this.scale, height: 120 * this.scale, speed: -0.5 * this.scale, image: buildingImage },
        { x: 600 * this.scale, y: 200 * this.scale, width: 25 * this.scale, height: 100 * this.scale, speed: 0.75 * this.scale, image: buildingImage },
      ];
    }
    this.buildings.forEach(building => {
      ctx.save();
      building.y += building.speed;
      if (building.y < -building.height) building.y = this.canvas.height;
      if (building.y > this.canvas.height) building.y = -building.height;

      if (!building.image || !building.image.complete || building.image.naturalWidth === 0) {
        // Only warn once when image is actually not loaded
        if (!building.image) {
          console.warn("Building image not loaded for building at x:", building.x);
        }
      } else {
        ctx.drawImage(building.image, building.x, building.y, building.width, building.height);
      }
      ctx.restore();
    });
  }

  // Draws active power-ups on the canvas
  protected drawPowerUps(ctx: CanvasRenderingContext2D): void {
    console.log("Drawing power-ups");
    if (!this.powerUps) {
      console.warn("powerUps array is undefined, reinitializing...");
      this.powerUps = [];
    }
    this.powerUps.forEach(powerUp => {
      if (!powerUp.active) return;
      ctx.fillStyle = powerUp.type === "speedBoost" ? "#FF00FF" : "#00FFFF";
      ctx.beginPath();
      ctx.arc(powerUp.x, powerUp.y, 10 * this.scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Checks for collisions between power-ups and paddles
  protected checkPowerUpCollision(): void {
    if (!this.powerUps) {
      console.warn("powerUps array is undefined, reinitializing...");
      this.powerUps = [];
    }
    this.powerUps.forEach(powerUp => {
      if (!powerUp.active) return;

      // Calculate base speed from slider for max speed cap
      const speedMultiplier = this.getSpeedMultiplier(); // Use standard multiplier (/ 5)
      const baseSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier;
      const baseSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier;
      const maxSpeedX = baseSpeedX * this.MAX_SPEED_INCREASE;
      const maxSpeedY = baseSpeedY * this.MAX_SPEED_INCREASE;

      // Defines left paddle boundaries
      const leftPaddle = {
        x: 10 * this.scale,
        y: this.paddleLeftY,
        width: 20 * this.scale,
        height: this.paddleLeftHeight,
      };
      // Checks collision with left paddle
      if (
        powerUp.x + 10 * this.scale > leftPaddle.x &&
        powerUp.x - 10 * this.scale < leftPaddle.x + leftPaddle.width &&
        powerUp.y + 10 * this.scale > leftPaddle.y &&
        powerUp.y - 10 * this.scale < leftPaddle.y + leftPaddle.height
      ) {
        powerUp.active = false;
        if (powerUp.type === "speedBoost") {
          // Apply speed boost based on current speed with cap
          this.isSpeedBoosted = true;
          this.boostedSpeedX = Math.min(Math.abs(this.ballSpeedX) * 1.5, maxSpeedX) * Math.sign(this.ballSpeedX);
          this.boostedSpeedY = Math.min(Math.abs(this.ballSpeedY) * 1.5, maxSpeedY) * Math.sign(this.ballSpeedY);
          this.ballSpeedX = this.boostedSpeedX;
          this.ballSpeedY = this.boostedSpeedY;
          this.leftSpeedBoostActive = true;
          console.log(`Speed Boost activated for left paddle! X: ${this.ballSpeedX}, Y: ${this.ballSpeedY}`);
        } else if (powerUp.type === "paddleExtend") {
          this.paddleLeftHeight = 120 * this.scale;
          this.leftPaddleExtendActive = true;
          console.log("Left paddle extended!");
          setTimeout(() => {
            this.paddleLeftHeight = 80 * this.scale;
            this.leftPaddleExtendActive = false;
            console.log("Left paddle reverted to normal size");
          }, 5000);
        }
      }

      // Defines right paddle boundaries
      const rightPaddle = {
        x: (this.baseWidth - 30) * this.scale,
        y: this.paddleRightY,
        width: 20 * this.scale,
        height: this.paddleRightHeight,
      };
      // Checks collision with right paddle
      if (
        powerUp.x + 10 * this.scale > rightPaddle.x &&
        powerUp.x - 10 * this.scale < rightPaddle.x + rightPaddle.width &&
        powerUp.y + 10 * this.scale > rightPaddle.y &&
        powerUp.y - 10 * this.scale < rightPaddle.y + rightPaddle.height
      ) {
        powerUp.active = false;
        if (powerUp.type === "speedBoost") {
          // Apply speed boost based on current speed with cap
          this.isSpeedBoosted = true;
          this.boostedSpeedX = Math.min(Math.abs(this.ballSpeedX) * 1.5, maxSpeedX) * Math.sign(this.ballSpeedX);
          this.boostedSpeedY = Math.min(Math.abs(this.ballSpeedY) * 1.5, maxSpeedY) * Math.sign(this.ballSpeedY);
          this.ballSpeedX = this.boostedSpeedX;
          this.ballSpeedY = this.boostedSpeedY;
          this.rightSpeedBoostActive = true;
          console.log(`Speed Boost activated for right paddle! X: ${this.ballSpeedX}, Y: ${this.ballSpeedY}`);
        } else if (powerUp.type === "paddleExtend") {
          this.paddleRightHeight = 120 * this.scale;
          this.rightPaddleExtendActive = true;
          console.log("Right paddle extended!");
          setTimeout(() => {
            this.paddleRightHeight = 80 * this.scale;
            this.rightPaddleExtendActive = false;
            console.log("Right paddle reverted to normal size");
          }, 5000);
        }
      }
    });
  }

  // Checks for collisions between the ball and buildings
  protected checkBuildingCollision(): void {
    if (!this.buildings) {
      console.warn("Buildings array is undefined, reinitializing...");
      const buildingImage = new Image();
      buildingImage.src = "assets/buildingBlock.png";
      this.buildings = [
        { x: 200 * this.scale, y: 100 * this.scale, width: 30 * this.scale, height: 80 * this.scale, speed: 0.5 * this.scale, image: buildingImage },
        { x: 300 * this.scale, y: 300 * this.scale, width: 40 * this.scale, height: 120 * this.scale, speed: -0.5 * this.scale, image: buildingImage },
        { x: 600 * this.scale, y: 200 * this.scale, width: 25 * this.scale, height: 100 * this.scale, speed: 0.75 * this.scale, image: buildingImage },
      ];
    }
  
    let collisionHandled = false; // Flag to process only one collision per frame
  
    this.buildings.forEach(building => {
      if (collisionHandled) return; // Skip if a collision was already handled
  
      if (
        this.ballX + 10 * this.scale > building.x &&
        this.ballX - 10 * this.scale < building.x + building.width &&
        this.ballY + 10 * this.scale > building.y &&
        this.ballY - 10 * this.scale < building.y + building.height
      ) {
        // Store the current speed magnitudes
        const speedXMag = Math.abs(this.isSpeedBoosted ? this.boostedSpeedX : this.ballSpeedX);
        const speedYMag = Math.abs(this.isSpeedBoosted ? this.boostedSpeedY : this.ballSpeedY);
  
        // Determine which side of the building the ball hit
        const ballLeft = this.ballX - 10 * this.scale;
        const ballRight = this.ballX + 10 * this.scale;
        const ballTop = this.ballY - 10 * this.scale;
        const ballBottom = this.ballY + 10 * this.scale;
  
        const leftDiff = Math.abs(ballRight - building.x);
        const rightDiff = Math.abs(ballLeft - (building.x + building.width));
        const topDiff = Math.abs(ballBottom - building.y);
        const bottomDiff = Math.abs(ballTop - (building.y + building.height));
  
        const minDiff = Math.min(leftDiff, rightDiff, topDiff, bottomDiff);
  
        // Reposition ball and reverse direction while preserving speed magnitude
        if (minDiff === leftDiff) {
          this.ballX = building.x - 10 * this.scale; // Move left of building
          this.ballSpeedX = -speedXMag; // Reverse X direction, preserve magnitude
          if (this.isSpeedBoosted) this.boostedSpeedX = -speedXMag;
        } else if (minDiff === rightDiff) {
          this.ballX = building.x + building.width + 10 * this.scale; // Move right of building
          this.ballSpeedX = speedXMag; // Reverse X direction, preserve magnitude
          if (this.isSpeedBoosted) this.boostedSpeedX = speedXMag;
        } else if (minDiff === topDiff) {
          this.ballY = building.y - 10 * this.scale; // Move above building
          this.ballSpeedY = -speedYMag; // Reverse Y direction, preserve magnitude
          if (this.isSpeedBoosted) this.boostedSpeedY = -speedYMag;
        } else if (minDiff === bottomDiff) {
          this.ballY = building.y + building.height + 10 * this.scale; // Move below building
          this.ballSpeedY = speedYMag; // Reverse Y direction, preserve magnitude
          if (this.isSpeedBoosted) this.boostedSpeedY = speedYMag;
        }
  
        collisionHandled = true; // Mark collision as handled
      }
    });
  }

  // Sets up event listeners for game controls and settings
  protected setupEventListeners(): void {
    super.setupEventListeners();
  
    // Add listener for background color change
    if (this.backgroundColorSelect) {
      this.backgroundColor = this.backgroundColorSelect.value || "#d8a8b5";
      this.initBackgroundCanvas();
      this.backgroundColorSelect.addEventListener("change", (e) => {
        this.backgroundColor = (e.target as HTMLSelectElement).value;
        console.log("Background color changed to:", this.backgroundColor);
        if (this.userName) {
          this.statsManager.setUserSettings(this.userName, { backgroundColor: this.backgroundColor });
        }
        this.initBackgroundCanvas();
        // Removed this.draw() to prevent speed increase; animation loop will handle rendering
      });
    } else {
      console.warn(`Background color select element not found with ID "${this.backgroundColorSelectId}". Using default color #d8a8b5.`);
      this.backgroundColor = "#d8a8b5";
      this.initBackgroundCanvas();
    }
  }

  // Main draw loop for rendering the game
  public draw(timestamp: number = performance.now()): void {
    if (!this.ctx) {
      console.error("Canvas context is null");
      return;
    }

    // Calculate delta time (in seconds)
    const deltaTime = (timestamp - this.lastTime) / 1000; // Convert ms to seconds
    this.lastTime = timestamp;

    // Target 60 FPS for normalization (1/60 seconds per frame)
    const frameTime = 1 / 60;
    const deltaTimeFactor = deltaTime / frameTime; // Scale movements to match 60 FPS

    // Clear the main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the pre-rendered background
    if (this.backgroundCanvas) {
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
    } else if (!this.isBackgroundInitializing) {
      this.initBackgroundCanvas();
      if (this.backgroundCanvas) {
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);
      }
    }

    // Draw countdown if active
    if (this.isCountingDown) {
      const currentTime = performance.now();
      const elapsed = (currentTime - this.countdownStartTime) / 1000;
      const remaining = Math.ceil(3 - elapsed);
      
      if (remaining > 0) {
        this.ctx.font = `bold ${100 * this.scale}px 'Verdana', sans-serif`;
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowColor = "rgba(0, 0, 255, 0.5)";
        this.ctx.shadowBlur = 10 * this.scale;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText(remaining.toString(), this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
      } else {
        this.isCountingDown = false;
        this.gameStarted = true;
      }
    }

    // Draw buildings
    this.drawBuildings(this.ctx);

    // Draw paddles with dynamic height
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(10 * this.scale, this.paddleLeftY, 20 * this.scale, this.paddleLeftHeight);
    this.ctx.fillRect((this.baseWidth - 30) * this.scale, this.paddleRightY, 20 * this.scale, this.paddleRightHeight);

    // Update game state if the game is active
    if (this.gameStarted && !this.isPaused && !this.gameOver) {
      // Handle paddle movement based on key inputs
      if (this.keys.w && this.paddleLeftY > 0) this.paddleLeftY -= this.paddleSpeed * deltaTimeFactor;
      if (this.keys.s && this.paddleLeftY < this.canvas.height - this.paddleLeftHeight) this.paddleLeftY += this.paddleSpeed * deltaTimeFactor;
      if (this.keys.ArrowUp && this.paddleRightY > 0) this.paddleRightY -= this.paddleSpeed * deltaTimeFactor;
      if (this.keys.ArrowDown && this.paddleRightY < this.canvas.height - this.paddleRightHeight) this.paddleRightY += this.paddleSpeed * deltaTimeFactor;

      // Update ball position
      this.ballX += this.ballSpeedX * deltaTimeFactor;
      this.ballY += this.ballSpeedY * deltaTimeFactor;

      // Bounce ball off top and bottom walls
      if (this.ballY <= 10 * this.scale || this.ballY >= this.canvas.height - 10 * this.scale) {
        this.ballSpeedY = -this.ballSpeedY;
        if (this.isSpeedBoosted) this.boostedSpeedY = -this.boostedSpeedY;
      }

      // Handle ball collision with left paddle
      if (
        this.ballX - 10 * this.scale <= 30 * this.scale &&
        this.ballX + 10 * this.scale >= 10 * this.scale &&
        this.ballY >= this.paddleLeftY &&
        this.ballY <= this.paddleLeftY + this.paddleLeftHeight
      ) {
        this.ballSpeedX = -this.ballSpeedX;
        if (this.isSpeedBoosted) this.boostedSpeedX = -this.boostedSpeedX;
        this.ballX = 30 * this.scale + 10 * this.scale; // Place right of paddle
      }

      // Handle ball collision with right paddle
      if (
        this.ballX + 10 * this.scale >= (this.baseWidth - 30) * this.scale &&
        this.ballX - 10 * this.scale <= (this.baseWidth - 10) * this.scale &&
        this.ballY >= this.paddleRightY &&
        this.ballY <= this.paddleRightY + this.paddleRightHeight
      ) {
        this.ballSpeedX = -this.ballSpeedX;
        if (this.isSpeedBoosted) this.boostedSpeedX = -this.boostedSpeedX;
        this.ballX = (this.baseWidth - 30) * this.scale - 10 * this.scale; // Place left of paddle
      }

      // Check for ball collisions with buildings
      this.checkBuildingCollision();

      // Manage power-up spawning and collisions
      this.powerUpTimer++;
      if (this.powerUpTimer >= this.POWER_UP_SPAWN_INTERVAL) {
        this.spawnPowerUp();
        this.powerUpTimer = 0;
      }
      this.checkPowerUpCollision();

      // Handle scoring and game over conditions
      if (this.ballX < 0) {
        this.scoreRight++;
        this.scoreRightElement.textContent = this.scoreRight.toString();
        if (this.scoreRight >= 3) {
          this.gameOver = true;
          this.powerUps = []; // Clear all power-ups
          this.restartButton.style.display = "block";
          this.statsManager.recordMatch(this.playerRightName, this.playerLeftName, "Neon City Pong", {
            player1Score: this.scoreLeft,
            player2Score: this.scoreRight,
            sessionToken: localStorage.getItem("sessionToken") // Add sessionToken
          });
          if (this.onGameEnd) {
            this.onGameEnd(this.playerRightName);
          }
        } else {
          this.ballX = (this.baseWidth / 2) * this.scale;
          this.ballY = (this.baseHeight / 2) * this.scale;
          // Reset ball speed with slider value
          const speedMultiplier = this.getSpeedMultiplier();
          this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier; // Move right (positive)
          this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1); // Random Y direction
          this.isSpeedBoosted = false; // Reset speed boost
          this.boostedSpeedX = 0;
          this.boostedSpeedY = 0;
          this.leftSpeedBoostActive = false;
          this.rightSpeedBoostActive = false;
          this.paddleLeftHeight = 80 * this.scale;
          this.paddleRightHeight = 80 * this.scale;
        }
      } else if (this.ballX > this.canvas.width) {
        this.scoreLeft++;
        this.scoreLeftElement.textContent = this.scoreLeft.toString();
        if (this.scoreLeft >= 3) {
          this.gameOver = true;
          this.powerUps = []; // Clear all power-ups
          this.restartButton.style.display = "block";
          this.statsManager.recordMatch(this.playerLeftName, this.playerRightName, "Neon City Pong", {
            player1Score: this.scoreLeft,
            player2Score: this.scoreRight,
            sessionToken: localStorage.getItem("sessionToken") // Add sessionToken
          });
          if (this.onGameEnd) {
            this.onGameEnd(this.playerLeftName);
          }
        } else {
          this.ballX = (this.baseWidth / 2) * this.scale;
          this.ballY = (this.baseHeight / 2) * this.scale;
          // Reset ball speed with slider value
          const speedMultiplier = this.getSpeedMultiplier();
          this.ballSpeedX = -this.baseBallSpeedX * this.scale * speedMultiplier; // Move left (negative)
          this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1); // Random Y direction
          this.isSpeedBoosted = false; // Reset speed boost
          this.boostedSpeedX = 0;
          this.boostedSpeedY = 0;
          this.leftSpeedBoostActive = false;
          this.rightSpeedBoostActive = false;
          this.paddleLeftHeight = 80 * this.scale;
          this.paddleRightHeight = 80 * this.scale;
        }
      }
    }

    // Draw power-ups and the ball
    this.drawPowerUps(this.ctx);
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, 10 * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = "white";
    this.ctx.fill();

    // Display game over message with winner
    if (this.gameOver) {
      this.ctx.font = `bold ${50 * this.scale}px 'Verdana', sans-serif`;
      this.ctx.fillStyle = "white";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.shadowColor = "rgba(0, 0, 255, 0.5)";
      this.ctx.shadowBlur = 10 * this.scale;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      const winnerName = this.scoreLeft >= 3 ? this.playerLeftName : this.playerRightName;
      this.ctx.fillText(
        i18next.t('game.wins', { player: winnerName }),
        this.canvas.width / 2,
        this.canvas.height / 2
      );
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
    }

    // Continue the animation loop with proper binding
    this.animationFrameId = requestAnimationFrame(this.draw.bind(this));
  }
}