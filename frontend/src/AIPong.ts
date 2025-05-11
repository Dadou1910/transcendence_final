import { NeonCityPong } from "./neonCityPong.js";
import { StatsManager } from "./stats.js";
import i18next from "./i18n/config.js";

// Extends the base PongGame to include an AI-controlled right paddle
export class AIPong extends NeonCityPong {
  // AI difficulty (0.5 to 0.8, adjusted dynamically)
  private aiDifficulty: number = 0.6;
  // Time accumulator for AI updates (seconds)
  private aiElapsedTime: number = 0;
  // Target Y position for AI paddle
  private aiTargetY: number;
  // Simulated key state (true = down, false = up, null = no movement)
  private aiKeyState: boolean | null = null;
  // Tracks if speed boost is active
  protected isSpeedBoosted: boolean = false;
  // Stores the boosted speed values
  protected boostedSpeedX: number = 0;
  protected boostedSpeedY: number = 0;

  constructor(
    playerLeftName: string,
    playerRightName: string, // Ignored, always set to "AI Opponent"
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
    // Force right player name to "AI Opponent"
    super(
      playerLeftName,
      "AI Opponent",
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
      navigate,
      onGameEnd
    );
    // Initialize AI target to current paddle position
    this.aiTargetY = this.paddleRightY;

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

    // Initialize building image
    const buildingImage = new Image();
    buildingImage.src = "assets/buildingBlock.png";
    // Initializes buildings with position, size, speed, and image
    this.buildings = [
      { x: 200 * this.scale, y: 100 * this.scale, width: 30 * this.scale, height: 80 * this.scale, speed: 0.5 * this.scale, image: buildingImage },
      { x: 300 * this.scale, y: 300 * this.scale, width: 40 * this.scale, height: 120 * this.scale, speed: -0.5 * this.scale, image: buildingImage },
      { x: 600 * this.scale, y: 200 * this.scale, width: 25 * this.scale, height: 100 * this.scale, speed: 0.75 * this.scale, image: buildingImage },
    ];

    // Initialize power-ups
    this.powerUps = [];
    this.powerUpTimer = 0;

    // Initialize paddle heights
    this.paddleLeftHeight = 80 * this.scale;
    this.paddleRightHeight = 80 * this.scale;

    // Initialize power-up effect flags
    this.leftSpeedBoostActive = false;
    this.rightSpeedBoostActive = false;
    this.leftPaddleExtendActive = false;
    this.rightPaddleExtendActive = false;

    // Initialize background canvas
    this.initBackgroundCanvas();

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
          const touchY = e.touches[0].clientY - rect.top;
          // Only left paddle (player) moves with touch
          this.paddleLeftY = Math.max(0, Math.min(this.baseHeight - 80, touchY - 40));
        }
      }, { passive: false });
      this.canvas.addEventListener('touchend', () => {
        lastTouchY = null;
      });
    }
  }

  // Override setupEventListeners to remove player controls for right paddle
  protected setupEventListeners(): void {
    // Call parent setup to retain other event listeners
    super.setupEventListeners();

    // Remove keydown listeners for right paddle (ArrowUp, ArrowDown)
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    // Add modified key listeners for left paddle only
    document.addEventListener("keydown", (e) => {
      if (e.key === " " && this.gameStarted) {
        this.isPaused = !this.isPaused;
      }
      if (["w", "s"].includes(e.key)) {
        this.keys[e.key as "w" | "s"] = true;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (["w", "s"].includes(e.key)) {
        this.keys[e.key as "w" | "s"] = false;
      }
    });

    // Set up restart button listener
    this.restartButton.addEventListener("click", () => {
      if (!this.gameStarted) {
        this.startCountdown();
      }
    });
  }

  // Store original keydown/keyup handlers for modification
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " && this.gameStarted) {
      this.isPaused = !this.isPaused;
    }
    if (["w", "s"].includes(e.key)) {
      this.keys[e.key as "w" | "s"] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (["w", "s"].includes(e.key)) {
      this.keys[e.key as "w" | "s"] = false;
    }
  };

  // Override draw to include AI paddle movement
  public draw(timestamp: number = performance.now()): void {
    // Calculate delta time (in seconds)
    const deltaTime = (timestamp - this.lastTime) / 1000; // Convert ms to seconds
    this.lastTime = timestamp;

    // Target 60 FPS for normalization (1/60 seconds per frame)
    const frameTime = 1 / 60;
    const deltaTimeFactor = deltaTime / frameTime; // Scale movements to match 60 FPS

    // Clear canvas with background color
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw neon background and buildings
    if (this.backgroundCtx && this.backgroundCanvas) {
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
    }
    this.drawBuildings(this.ctx);
    this.drawPowerUps(this.ctx);

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

    // Update game state if not paused or over
    if (this.gameStarted && !this.isPaused && !this.gameOver) {
      // Move left paddle (player-controlled)
      if (this.keys.w && this.paddleLeftY > 0) this.paddleLeftY -= this.paddleSpeed * deltaTimeFactor;
      if (this.keys.s && this.paddleLeftY < this.canvas.height - this.paddleLeftHeight) this.paddleLeftY += this.paddleSpeed * deltaTimeFactor;

      // AI controls right paddle
      this.updateAIPaddle(deltaTime, deltaTimeFactor);

      // Update ball position
      this.ballX += this.ballSpeedX * deltaTimeFactor;
      this.ballY += this.ballSpeedY * deltaTimeFactor;

      // Update power-up timer and spawn power-ups
      this.powerUpTimer += deltaTime * 1000; // Convert to milliseconds
      if (this.powerUpTimer >= this.POWER_UP_SPAWN_INTERVAL) {
        this.spawnPowerUp();
        this.powerUpTimer = 0;
      }

      // Check for power-up and building collisions
      this.checkPowerUpCollision();
      this.checkBuildingCollision();

      // Bounce off top and bottom walls
      if (this.ballY <= 10 * this.scale || this.ballY >= this.canvas.height - 10 * this.scale) {
        this.ballSpeedY = -this.ballSpeedY;
      }

      // Handle left paddle collision
      if (
        this.ballX - 10 * this.scale <= 30 * this.scale &&
        this.ballX + 10 * this.scale >= 10 * this.scale &&
        this.ballY >= this.paddleLeftY &&
        this.ballY <= this.paddleLeftY + this.paddleLeftHeight
      ) {
        this.ballSpeedX = -this.ballSpeedX;
        this.ballX = 30 * this.scale + 10 * this.scale; // Place right of paddle
      }

      // Handle right paddle collision
      if (
        this.ballX + 10 * this.scale >= (this.baseWidth - 30) * this.scale &&
        this.ballX - 10 * this.scale <= (this.baseWidth - 10) * this.scale &&
        this.ballY >= this.paddleRightY &&
        this.ballY <= this.paddleRightY + this.paddleRightHeight
      ) {
        this.ballSpeedX = -this.ballSpeedX;
        this.ballX = (this.baseWidth - 30) * this.scale - 10 * this.scale; // Place left of paddle
      }

      // Handle scoring
      if (this.ballX < 0) {
        this.scoreRight++;
        this.scoreRightElement.textContent = this.scoreRight.toString();
        if (this.scoreRight >= 3) {
          this.gameOver = true;
          this.restartButton.style.display = "block";
          this.statsManager.recordMatch(this.playerRightName, this.playerLeftName, "AI Pong", {
            player1Score: this.scoreLeft,
            player2Score: this.scoreRight,
            sessionToken: localStorage.getItem("sessionToken")
          });
          if (this.onGameEnd) {
            this.onGameEnd(this.playerRightName);
          }
        } else {
          this.resetBall();
        }
      } else if (this.ballX > this.canvas.width) {
        this.scoreLeft++;
        this.scoreLeftElement.textContent = this.scoreLeft.toString();
        if (this.scoreLeft >= 3) {
          this.gameOver = true;
          this.restartButton.style.display = "block";
          this.statsManager.recordMatch(this.playerLeftName, this.playerRightName, "AI Pong", {
            player1Score: this.scoreLeft,
            player2Score: this.scoreRight,
            sessionToken: localStorage.getItem("sessionToken")
          });
          if (this.onGameEnd) {
            this.onGameEnd(this.playerLeftName);
          }
        } else {
          this.resetBall();
        }
      }
    }

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, 10 * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = "white";
    this.ctx.fill();

    // Draw paddles with dynamic height
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(10 * this.scale, this.paddleLeftY, 20 * this.scale, this.paddleLeftHeight);
    this.ctx.fillRect((this.baseWidth - 30) * this.scale, this.paddleRightY, 20 * this.scale, this.paddleRightHeight);

    // Display game over message
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

    // Continue animation loop
    requestAnimationFrame((time) => this.draw(time));
  }

  // Updates the AI-controlled right paddle
  private updateAIPaddle(deltaTime: number, deltaTimeFactor: number): void {
    // Accumulate elapsed time for AI update
    this.aiElapsedTime += deltaTime;

    // Adjust difficulty based on score difference and speed slider
    const scoreDifference = this.scoreLeft - this.scoreRight;
    const speedMultiplier = this.getSpeedMultiplier();
    // Increase difficulty at lower speeds, decrease at higher speeds
    const speedAdjustment = (1.0 - (speedMultiplier - 1.0)) * 0.1; // Ranges from 0.18 (min speed) to 0.0 (max speed)
    this.aiDifficulty = Math.min(0.8, Math.max(0.5, 0.6 + scoreDifference * 0.05 + speedAdjustment));

    // Check if ball is moving towards AI's side
    const ballMovingTowardsAI = this.ballSpeedX > 0;

    // Find closest active power-up
    let closestPowerUp: { x: number; y: number } | null = null;
    let minDistance = Infinity;
    
    if (this.powerUps) {
      for (const powerUp of this.powerUps) {
        if (powerUp.active) {
          const distance = Math.abs(powerUp.y - (this.paddleRightY + this.paddleRightHeight / 2));
          if (distance < minDistance) {
            minDistance = distance;
            closestPowerUp = { x: powerUp.x, y: powerUp.y };
          }
        }
      }
    }

    // Update target Y only once per second
    if (this.aiElapsedTime >= 1) {
      // If there's a power-up and ball is not moving towards AI, prioritize collecting it
      if (closestPowerUp && !ballMovingTowardsAI) {
        this.aiTargetY = closestPowerUp.y - this.paddleRightHeight / 2;
      } else {
        // Otherwise, predict ball's Y position when it reaches the right paddle
        const predictedY = this.predictBallPosition();
        const paddleCenter = this.paddleRightY + (80 * this.scale) / 2;

        // Introduce error based on difficulty and speed (smaller error at low speeds, larger at high speeds)
        const baseError = 200 * this.scale;
        const errorScale = 1.0 + (speedMultiplier - 1.0) * 0.25; // Ranges from 0.8 (min speed) to 1.25 (max speed)
        const error = (1 - this.aiDifficulty) * (Math.random() - 0.5) * baseError * errorScale;
        this.aiTargetY = predictedY - (80 * this.scale) / 2 + error;
      }

      // Reset elapsed time
      this.aiElapsedTime = 0;
    }

    // Simulate keyboard input for human-like movement at player paddle speed
    const paddleCenter = this.paddleRightY + (80 * this.scale) / 2;
    const targetCenter = this.aiTargetY + (80 * this.scale) / 2;
    const threshold = 5 * this.scale; // Small threshold to prevent jittering

    if (targetCenter > paddleCenter + threshold) {
      this.aiKeyState = true; // Simulate "down" key
    } else if (targetCenter < paddleCenter - threshold) {
      this.aiKeyState = false; // Simulate "up" key
    } else {
      this.aiKeyState = null; // No movement
    }

    // Apply movement based on simulated key state
    if (this.aiKeyState === true && this.paddleRightY < this.canvas.height - this.paddleRightHeight) {
      this.paddleRightY += this.paddleSpeed * deltaTimeFactor;
    } else if (this.aiKeyState === false && this.paddleRightY > 0) {
      this.paddleRightY -= this.paddleSpeed * deltaTimeFactor;
    }
  }

  // Predicts the ball's Y position when it reaches the right paddle
  private predictBallPosition(): number {
    let x = this.ballX;
    let y = this.ballY;
    let vx = this.ballSpeedX;
    let vy = this.ballSpeedY;
    const targetX = (this.baseWidth - 30) * this.scale; // Right paddle's X position

    // Simulate ball movement until it reaches the right paddle
    while (x < targetX && x > 0) {
      x += vx;
      y += vy;

      // Handle bounces off top and bottom walls
      if (y <= 10 * this.scale) {
        y = 10 * this.scale;
        vy = -vy;
      } else if (y >= this.canvas.height - 10 * this.scale) {
        y = this.canvas.height - 10 * this.scale;
        vy = -vy;
      }

      // Stop if ball hits left paddle (simplification, assume AI only predicts when ball is moving right)
      if (vx < 0 && x <= 30 * this.scale) {
        return this.paddleRightY + (80 * this.scale) / 2; // Return current paddle position as fallback
      }
    }

    // Return predicted Y position, clamped to canvas bounds
    return Math.max(10 * this.scale, Math.min(this.canvas.height - 10 * this.scale, y));
  }

  protected resetBall(): void {
    this.ballX = this.canvas.width / 2;
    this.ballY = this.canvas.height / 2;
    this.ballSpeedX = this.baseBallSpeedX * this.scale * this.getSpeedMultiplier();
    this.ballSpeedY = this.baseBallSpeedY * this.scale * this.getSpeedMultiplier();
    // Randomize initial direction
    this.ballSpeedX *= Math.random() > 0.5 ? 1 : -1;
    this.ballSpeedY *= Math.random() > 0.5 ? 1 : -1;
  }

  // Clean up event listeners
  public cleanup(): void {
    super.cleanup();
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }
}