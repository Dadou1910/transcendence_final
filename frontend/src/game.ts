import { StatsManager } from "./stats.js";
import i18next from "./i18n/config.js";

// Manages the core game logic for Pong Transcendence
export class PongGame {
  // Canvas and context for rendering
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  // UI elements for game settings and scores
  public speedSlider: HTMLInputElement;
  public backgroundColorSelect: HTMLSelectElement | null;
  public scoreLeftElement: HTMLSpanElement;
  public scoreRightElement: HTMLSpanElement;
  public restartButton: HTMLButtonElement;
  public settingsButton: HTMLButtonElement;
  public settingsMenu: HTMLDivElement;
  public settingsContainer: HTMLDivElement;
  // Manages game statistics
  public statsManager: StatsManager;
  // User name for settings persistence
  public userName: string | null;
  // Navigation callback
  public navigate: (path: string) => void;

  // Game state variables
  public paddleLeftY: number = 160;
  public paddleRightY: number = 160;
  public ballX: number = 400;
  public ballY: number = 200;
  public ballSpeedX: number = 6.0;
  public ballSpeedY: number = 4.1;
  public scoreLeft: number = 0;
  public scoreRight: number = 0;
  public gameOver: boolean = false;
  public gameStarted: boolean = false;
  public isPaused: boolean = false;
  public playerLeftName: string;
  public playerRightName: string;
  public backgroundColor: string = "#d8a8b5";
  public onGameEnd?: (winnerName: string) => void;

  protected countdown: number = 0;
  protected countdownStartTime: number = 0;
  protected isCountingDown: boolean = false;

  public isTournamentMode: boolean;

  // Flag to prevent multiple onGameEnd triggers
  public hasTriggeredGameEnd: boolean = false;

  // Game constants
  public paddleSpeed: number = 5;
  public keys: Record<"w" | "s" | "ArrowUp" | "ArrowDown", boolean> = {
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false,
  };
  // Base ball speeds
  public baseBallSpeedX: number = 6.0;
  public baseBallSpeedY: number = 4.1;

  // Canvas dimensions and scaling
  public baseWidth: number = 800;
  public baseHeight: number = 400;
  public scale: number = 1;

  // Timing for delta-time calculation
  public lastTime: number = 0; // Stores timestamp of last frame

  // Initializes the game with player names and UI element IDs
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
    userName: string | null,
    onGameEnd?: (winnerName: string) => void,
    navigate?: (path: string) => void,
    isTournamentMode: boolean = false
  ) {
    this.playerLeftName = playerLeftName;
    this.playerRightName = playerRightName;
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.speedSlider = document.getElementById(speedSliderId) as HTMLInputElement;
    this.backgroundColorSelect = document.getElementById(backgroundColorSelectId) as HTMLSelectElement | null;
    this.scoreLeftElement = document.getElementById(scoreLeftId) as HTMLSpanElement;
    this.scoreRightElement = document.getElementById(scoreRightId) as HTMLSpanElement;
    this.restartButton = document.getElementById(restartButtonId) as HTMLButtonElement;
    this.settingsButton = document.getElementById(settingsButtonId) as HTMLButtonElement;
    this.settingsMenu = document.getElementById(settingsMenuId) as HTMLDivElement;
    this.settingsContainer = document.getElementById(settingsContainerId) as HTMLDivElement;
    this.statsManager = statsManager;
    this.userName = userName;
    this.onGameEnd = onGameEnd;
    this.navigate = navigate || (() => {});
    this.isTournamentMode = isTournamentMode;

    // Ensure restartButton is in buttonContainer
    const buttonContainer = document.getElementById("buttonContainer");
    if (buttonContainer && this.restartButton.parentElement !== buttonContainer) {
      buttonContainer.appendChild(this.restartButton);
    }

    // Attach event listener to the existing backButton
    const backButton = document.getElementById("backButton") as HTMLButtonElement;
    if (backButton) {
      backButton.addEventListener("click", () => {
        this.cleanup();
        this.navigate("/");
      });
    } else {
      console.error("Back button not found!");
    }

    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.draw(performance.now()); // Initialize with current time

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

  // Computes the speed multiplier based on the speed slider
  public getSpeedMultiplier(): number {
    return parseInt(this.speedSlider.value) / 5; // Default slider value of 5 gives multiplier of 1
  }

  // Resizes canvas based on browser window size and maintains aspect ratio
  protected resizeCanvas(): void {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    const aspectRatio = this.baseWidth / this.baseHeight;

    let newWidth = Math.min(maxWidth, this.baseWidth);
    let newHeight = newWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    this.scale = newWidth / this.baseWidth;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    this.canvas.style.display = "block";
    this.canvas.style.margin = "auto";

    this.ballX = (this.baseWidth / 2) * this.scale;
    this.ballY = (this.baseHeight / 2) * this.scale;
    // Initialize ball speed with slider value
    const speedMultiplier = this.getSpeedMultiplier();
    this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier;
    this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier;
    this.paddleLeftY = (this.baseHeight / 2 - 40) * this.scale;
    this.paddleRightY = (this.baseHeight / 2 - 40) * this.scale;
    this.paddleSpeed = 7 * this.scale;
  }

  // Sets up event listeners for game controls and settings
  protected setupEventListeners(): void {
    // Speed slider
    this.speedSlider.addEventListener("input", () => {
      if (this.userName) {
        this.statsManager.setUserSettings(this.userName, { ballSpeed: parseInt(this.speedSlider.value) });
      }
      // Apply speed change immediately
      const speedMultiplier = this.getSpeedMultiplier();
      this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier * Math.sign(this.ballSpeedX);
      this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * Math.sign(this.ballSpeedY);
    });

    // Background color selector
    if (this.backgroundColorSelect) {
      this.backgroundColor = this.backgroundColorSelect.value || "#d8a8b5";
      this.backgroundColorSelect.addEventListener("change", (e) => {
        this.backgroundColor = (e.target as HTMLSelectElement).value;
        if (this.userName) {
          this.statsManager.setUserSettings(this.userName, { backgroundColor: this.backgroundColor });
        }
      });
    } else {
      console.warn("Background color select element not found");
    }

    // Settings menu toggle
    this.settingsButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.settingsMenu.classList.toggle("visible");
    });

    document.addEventListener("click", (e) => {
      if (!this.settingsContainer.contains(e.target as Node)) {
        this.settingsMenu.classList.remove("visible");
      }
    });

    // Start button
    this.restartButton.addEventListener("click", () => {
      if (!this.gameStarted) {
        this.startCountdown();
      } else {
        this.resetGame();
      }
    });

    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (e.key === " " && this.gameStarted) {
        this.isPaused = !this.isPaused;
      }
      if (["w", "s", "ArrowUp", "ArrowDown"].includes(e.key)) {
        this.keys[e.key as "w" | "s" | "ArrowUp" | "ArrowDown"] = true;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (["w", "s", "ArrowUp", "ArrowDown"].includes(e.key)) {
        this.keys[e.key as "w" | "s" | "ArrowUp" | "ArrowDown"] = false;
      }
    });
  }

  // Start the countdown before game begins
  protected startCountdown(): void {
    this.countdown = 3;
    this.countdownStartTime = performance.now();
    this.isCountingDown = true;
    this.gameStarted = false;
    this.gameOver = false;
    this.scoreLeft = 0;
    this.scoreRight = 0;
    this.scoreLeftElement.textContent = "0";
    this.scoreRightElement.textContent = "0";
    this.restartButton.style.display = "none";
  }

  // Reset the game state
  private resetGame(): void {
    this.gameStarted = true;
    this.isPaused = false;
    this.gameOver = false;
    this.scoreLeft = 0;
    this.scoreRight = 0;
    this.scoreLeftElement.textContent = "0";
    this.scoreRightElement.textContent = "0";
    this.ballX = (this.baseWidth / 2) * this.scale;
    this.ballY = (this.baseHeight / 2) * this.scale;
    const speedMultiplier = this.getSpeedMultiplier();
    this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier;
    this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
    this.restartButton.style.display = "none";
  }

  // Renders the game and updates game state
  public draw(timestamp: number = performance.now()) {
    // Calculate delta time (in seconds)
    const deltaTime = (timestamp - this.lastTime) / 1000; // Convert ms to seconds
    this.lastTime = timestamp;

    // Target 60 FPS for normalization (1/60 seconds per frame)
    const frameTime = 1 / 60;
    const deltaTimeFactor = deltaTime / frameTime; // Scale movements to match 60 FPS

    // Clear canvas with background color
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw paddles
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(10 * this.scale, this.paddleLeftY, 20 * this.scale, 80 * this.scale);
    this.ctx.fillRect((this.baseWidth - 30) * this.scale, this.paddleRightY, 20 * this.scale, 80 * this.scale);

    // Handle countdown
    if (this.isCountingDown) {
      const elapsed = (timestamp - this.countdownStartTime) / 1000;
      if (elapsed >= 1) {
        this.countdown--;
        this.countdownStartTime = timestamp;
        if (this.countdown <= 0) {
          this.isCountingDown = false;
          this.resetGame();
        }
      }

      // Draw countdown
      this.ctx.font = `bold ${100 * this.scale}px 'Verdana', sans-serif`;
      this.ctx.fillStyle = "white";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.shadowColor = "rgba(0, 0, 255, 0.5)";
      this.ctx.shadowBlur = 10 * this.scale;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.fillText(
        this.countdown.toString(),
        this.canvas.width / 2,
        this.canvas.height / 2
      );
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
    }

    // Update game state if not paused or over
    if (this.gameStarted && !this.isPaused && !this.gameOver) {
      // Move paddles based on key input, scaled by deltaTime
      if (this.keys.w && this.paddleLeftY > 0) {
        this.paddleLeftY -= this.paddleSpeed * deltaTimeFactor;
      }
      if (this.keys.s && this.paddleLeftY < this.canvas.height - 80 * this.scale) {
        this.paddleLeftY += this.paddleSpeed * deltaTimeFactor;
      }
      if (this.keys.ArrowUp && this.paddleRightY > 0) {
        this.paddleRightY -= this.paddleSpeed * deltaTimeFactor;
      }
      if (this.keys.ArrowDown && this.paddleRightY < this.canvas.height - 80 * this.scale) {
        this.paddleRightY += this.paddleSpeed * deltaTimeFactor;
      }

      // Update ball position
      this.ballX += this.ballSpeedX * deltaTimeFactor;
      this.ballY += this.ballSpeedY * deltaTimeFactor;

      // Bounce off top and bottom walls with proper collision handling
      const ballRadius = 10 * this.scale;
      if (this.ballY - ballRadius <= 0) {
        // Top wall collision
        this.ballY = ballRadius; // Place ball at top boundary
        this.ballSpeedY = Math.abs(this.ballSpeedY); // Ensure downward movement
      } else if (this.ballY + ballRadius >= this.canvas.height) {
        // Bottom wall collision
        this.ballY = this.canvas.height - ballRadius; // Place ball at bottom boundary
        this.ballSpeedY = -Math.abs(this.ballSpeedY); // Ensure upward movement
      }

      // Handle left paddle collision
      if (
        this.ballX - 10 * this.scale <= 30 * this.scale &&
        this.ballX + 10 * this.scale >= 10 * this.scale &&
        this.ballY >= this.paddleLeftY &&
        this.ballY <= this.paddleLeftY + 80 * this.scale
      ) {
        // Reverse horizontal velocity
        this.ballSpeedX = -this.ballSpeedX;
        // Reposition ball to prevent re-collision
        this.ballX = 30 * this.scale + 10 * this.scale; // Place right of paddle
      }

      // Handle right paddle collision
      if (
        this.ballX + 10 * this.scale >= (this.baseWidth - 30) * this.scale &&
        this.ballX - 10 * this.scale <= (this.baseWidth - 10) * this.scale &&
        this.ballY >= this.paddleRightY &&
        this.ballY <= this.paddleRightY + 80 * this.scale
      ) {
        // Reverse horizontal velocity
        this.ballSpeedX = -this.ballSpeedX;
        // Reposition ball to prevent re-collision
        this.ballX = (this.baseWidth - 30) * this.scale - 10 * this.scale; // Place left of paddle
      }

      // Handle scoring
      if (this.ballX < 0) {
        this.scoreRight++;
        this.scoreRightElement.textContent = this.scoreRight.toString();
        if (this.scoreRight >= 3) {
          this.gameOver = true;
          this.restartButton.style.display = "block";
          if (!this.isTournamentMode) { // Only record match if not in tournament mode
            this.statsManager.recordMatch(this.playerRightName, this.playerLeftName, "Pong", {
              player1Score: this.scoreLeft,
              player2Score: this.scoreRight,
              sessionToken: localStorage.getItem("sessionToken")
            });
          }
          if (this.onGameEnd && !this.hasTriggeredGameEnd) {
            this.hasTriggeredGameEnd = true; // Prevent multiple triggers
            this.onGameEnd(this.playerRightName);
          }
        } else {
          this.ballX = (this.baseWidth / 2) * this.scale;
          this.ballY = (this.baseHeight / 2) * this.scale;
          // Reset ball speed with slider value
          const speedMultiplier = this.getSpeedMultiplier();
          this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier;
          this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
        }
      } else if (this.ballX > this.canvas.width) {
        this.scoreLeft++;
        this.scoreLeftElement.textContent = this.scoreLeft.toString();
        if (this.scoreLeft >= 3) {
          this.gameOver = true;
          this.restartButton.style.display = "block";
          
          if (!this.isTournamentMode) { // Only record match if not in tournament mode
            this.statsManager.recordMatch(this.playerLeftName, this.playerRightName, "Pong", {
              player1Score: this.scoreLeft,
              player2Score: this.scoreRight,
              sessionToken: localStorage.getItem("sessionToken")
            });
          }

          if (this.onGameEnd && !this.hasTriggeredGameEnd) {
            this.hasTriggeredGameEnd = true; // Prevent multiple triggers
            this.onGameEnd(this.playerLeftName);
          }
        } else {
          this.ballX = (this.baseWidth / 2) * this.scale;
          this.ballY = (this.baseHeight / 2) * this.scale;
          // Reset ball speed with slider value
          const speedMultiplier = this.getSpeedMultiplier();
          this.ballSpeedX = -this.baseBallSpeedX * this.scale * speedMultiplier;
          this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
        }
      }
    }

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, 10 * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = "white";
    this.ctx.fill();

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

  // Cleans up event listeners and WebSocket
  public cleanup(): void {
    window.removeEventListener("resize", () => this.resizeCanvas());
  }
}