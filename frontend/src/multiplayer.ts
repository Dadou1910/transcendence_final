import { StatsManager } from "./stats.js";
import i18next from './i18n/config.js';
import { ensurePresenceWS } from "./index.js";

// Multiplayer Pong Game class (WebSocket-based)
export class MultiplayerPongGame {
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
  public statsManager: StatsManager;
  public userName: string | null;
  public navigate: (path: string) => void;

  // Multiplayer state
  public ws: WebSocket | null = null;
  public isHost: boolean = false;
  public opponentName: string = "";
  public localPlayerReady: boolean = false;
  public remotePlayerReady: boolean = false;

  // Game state variables (replicate from PongGame)
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
  public hasTriggeredGameEnd: boolean = false;
  public paddleSpeed: number = 5;
  public keys: Record<"w" | "s" | "ArrowUp" | "ArrowDown", boolean> = {
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false,
  };
  public baseBallSpeedX: number = 6.0;
  public baseBallSpeedY: number = 4.1;
  public baseWidth: number = 800;
  public baseHeight: number = 400;
  public scale: number = 1;
  public lastTime: number = 0;
  public gameLoopRunning: boolean = false;
  public animationFrameId: number | null = null;
  public hasResetInitialScore: boolean = false;

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
    navigate?: (path: string) => void,
    onGameEnd?: (winnerName: string) => void
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
    this.navigate = navigate || (() => {});
    this.onGameEnd = onGameEnd;
    // Set initial ball speed using base values and speed multiplier
    const speedMultiplier = this.getSpeedMultiplier();
    this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
    this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
    // Ensure Back button is always visible
    const backButton = document.getElementById("backButton") as HTMLButtonElement;
    if (backButton) {
      backButton.style.display = "block";
      backButton.onclick = () => {
        // Send cleanup message to both players
        if (this.ws) {
          this.ws.send(JSON.stringify({ type: "cleanup", reason: "opponent_left" }));
        }
        if (this.ws) {
          this.ws.close();
        }
        this.cleanup();
        this.navigate("/");
      };
    }
    // Touch controls for mobile/tablet (split screen for both paddles)
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
          // For the guest, always send right paddle movement regardless of touch position
          if (!this.isHost && this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (lastTouchY !== null) {
              const direction = touchY < lastTouchY ? 'ArrowUp' : 'ArrowDown';
              this.ws.send(JSON.stringify({ type: 'paddle', key: direction, pressed: true }));
            }
          }
          // Only the host updates paddle positions locally
          if (this.isHost) {
            const touchX = e.touches[0].clientX - rect.left;
            if (touchX < this.canvas.width / 2) {
              this.paddleLeftY = Math.max(0, Math.min(this.baseHeight - 80, touchY - 40));
            } else {
              this.paddleRightY = Math.max(0, Math.min(this.baseHeight - 80, touchY - 40));
            }
          }
          lastTouchY = touchY;
        }
      }, { passive: false });
      this.canvas.addEventListener('touchend', () => {
        lastTouchY = null;
      });
    }
    // Multiplayer-specific setup (WebSocket, etc.) will be added here
  }

  public handleWebSocketMessage(data: any): void {
    if (data.type === 'paddle') {
      // Only the host should process guest paddle movement
      if (this.isHost && data.player === 'guest') {
        // Update the host's internal representation of the guest's key state
        if (data.key === 'ArrowUp') {
          this.keys.ArrowUp = data.pressed;
        } else if (data.key === 'ArrowDown') {
          this.keys.ArrowDown = data.pressed;
        }
        // The actual paddle movement based on this.keys will happen in this.updateGameState()
      }
    }
    switch (data.type) {
      case "opponent":
        // Update opponent name when they join
        if (this.isHost) {
          this.playerRightName = data.name;
          const rightNameElem = document.getElementById("playerRightNameDisplay");
          if (rightNameElem) rightNameElem.textContent = data.name;
        } else {
          this.playerLeftName = data.name;
          const leftNameElem = document.getElementById("playerLeftNameDisplay");
          if (leftNameElem) leftNameElem.textContent = data.name;
        }
        break;
      case "game_start":
        this.gameStarted = true;
        this.isPaused = false;
        this.gameOver = false;
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.scoreLeftElement.textContent = "0";
        this.scoreRightElement.textContent = "0";
        this.paddleLeftY = 160;
        this.paddleRightY = 160;
        // Reset ball speed according to the current slider value at game start
        const speedMultiplier = this.getSpeedMultiplier();
        this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
        this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
        this.restartButton.style.display = "none";
        this.pollForGameStart();
        break;
      case "state":
        this.handleStateMessage(data);
        break;
      case "gameOver":
        this.handleGameOver(data.winnerName);
        break;
      case "cleanup":
        if (data.reason === "opponent_left") {
          alert(i18next.t('game.opponentLeft'));
        }
        // Only close the WebSocket, do not call cleanup or navigate
        if (this.ws) {
          this.ws.close();
        }
        break;
      case 'requestSpeedChange': // New case for host
        if (this.isHost && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.speedSlider.value = data.value;
          const newSpeedMultiplier = this.getSpeedMultiplier();
          this.ballSpeedX = this.baseBallSpeedX * this.scale * newSpeedMultiplier * Math.sign(this.ballSpeedX || (Math.random() > 0.5 ? 1 : -1));
          this.ballSpeedY = this.baseBallSpeedY * this.scale * newSpeedMultiplier * Math.sign(this.ballSpeedY || (Math.random() > 0.5 ? 1 : -1));
          // Notify guest of the confirmed speed change
          this.ws.send(JSON.stringify({ type: 'updateSpeed', value: this.speedSlider.value }));
          // Persist setting for the host
          if (this.userName) {
            this.statsManager.setUserSettings(this.userName, { ballSpeed: parseInt(this.speedSlider.value) });
          }
        }
        break;
      case 'updateSpeed': // New case for guest
        if (!this.isHost) {
          this.speedSlider.value = data.value;
          const newSpeedMultiplier = this.getSpeedMultiplier();
          // Ensure ballSpeedX/Y have a direction if they were 0 (e.g. after gameOver)
          this.ballSpeedX = this.baseBallSpeedX * this.scale * newSpeedMultiplier * Math.sign(this.ballSpeedX || (Math.random() > 0.5 ? 1 : -1));
          this.ballSpeedY = this.baseBallSpeedY * this.scale * newSpeedMultiplier * Math.sign(this.ballSpeedY || (Math.random() > 0.5 ? 1 : -1));
          // Persist setting for the guest
           if (this.userName) { // Assuming guest also has a userName to save settings
            this.statsManager.setUserSettings(this.userName, { ballSpeed: parseInt(this.speedSlider.value) });
          }
        }
        break;
      case 'requestBackgroundColorChange': // For Host
        if (this.isHost && this.ws && this.ws.readyState === WebSocket.OPEN && this.backgroundColorSelect) {
          this.backgroundColor = data.color;
          this.backgroundColorSelect.value = data.color;
          this.ws.send(JSON.stringify({ type: 'updateBackgroundColor', color: data.color }));
          if (this.userName) {
            this.statsManager.setUserSettings(this.userName, { backgroundColor: data.color });
          }
        }
        break;
      case 'updateBackgroundColor': // For Guest
        if (!this.isHost && this.backgroundColorSelect) {
          this.backgroundColor = data.color;
          this.backgroundColorSelect.value = data.color;
          if (this.userName) {
            this.statsManager.setUserSettings(this.userName, { backgroundColor: data.color });
          }
        }
        break;
    }
  }

  public setupWebSocket(ws: WebSocket, isHost: boolean, opponentName: string) {
    this.ws = ws;
    this.isHost = isHost;
    this.opponentName = opponentName;

    // Update player names in the UI
    if (isHost) {
      this.playerLeftName = this.userName || "";
      const leftNameElem = document.getElementById("playerLeftNameDisplay");
      if (leftNameElem) leftNameElem.textContent = this.playerLeftName;
      if (opponentName && opponentName !== i18next.t('game.waitingForOpponent')) {
        this.playerRightName = opponentName;
        const rightNameElem = document.getElementById("playerRightNameDisplay");
        if (rightNameElem) rightNameElem.textContent = opponentName;
      }
    } else {
      this.playerRightName = this.userName || "";
      const rightNameElem = document.getElementById("playerRightNameDisplay");
      if (rightNameElem) rightNameElem.textContent = this.playerRightName;
      if (opponentName && opponentName !== i18next.t('game.waitingForOpponent')) {
        this.playerLeftName = opponentName;
        const leftNameElem = document.getElementById("playerLeftNameDisplay");
        if (leftNameElem) leftNameElem.textContent = opponentName;
      }
    }

    // Speed Slider event listener
    this.speedSlider.addEventListener("input", () => {
      const newSliderValue = this.speedSlider.value;
      if (this.isHost) {
        // Host updates locally and sends to guest
        const speedMultiplier = parseFloat(newSliderValue) / 5;
        this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier * Math.sign(this.ballSpeedX || (Math.random() > 0.5 ? 1 : -1));
        this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * Math.sign(this.ballSpeedY || (Math.random() > 0.5 ? 1 : -1));
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'updateSpeed', value: newSliderValue }));
        }
        if (this.userName) {
          this.statsManager.setUserSettings(this.userName, { ballSpeed: parseInt(newSliderValue) });
        }
      } else {
        // Guest sends request to host
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'requestSpeedChange', value: newSliderValue }));
        }
        // Guest can also save their preferred setting locally, host will confirm authoritative speed
        if (this.userName) {
            this.statsManager.setUserSettings(this.userName, { ballSpeed: parseInt(newSliderValue) });
        }
      }
    });

    // Prevent arrow keys from controlling the speed slider when it's focused
    this.speedSlider.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
      }
    });

    // Background Color Selector event listener
    if (this.backgroundColorSelect) {
      // Set initial background color from select or default
      this.backgroundColor = this.backgroundColorSelect.value || "#d8a8b5";
      this.backgroundColorSelect.addEventListener("change", () => {
        const newColorValue = (this.backgroundColorSelect as HTMLSelectElement).value;
        if (this.isHost) {
          // Host updates locally and sends to guest
          this.backgroundColor = newColorValue;
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'updateBackgroundColor', color: newColorValue }));
          }
          if (this.userName) {
            this.statsManager.setUserSettings(this.userName, { backgroundColor: newColorValue });
          }
        } else {
          // Guest sends request to host
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'requestBackgroundColorChange', color: newColorValue }));
          }
          // Guest can also save their preferred setting locally
          if (this.userName) {
            this.statsManager.setUserSettings(this.userName, { backgroundColor: newColorValue });
          }
        }
      });
    }

    // Start/Restart button
    this.restartButton.addEventListener("click", () => {
      if (!this.gameStarted) {
        this.localPlayerReady = true;
        if (this.isHost) {
          if (this.remotePlayerReady) {
            this.ws?.send(JSON.stringify({ type: 'game_start' }));
          } else {
            this.ws?.send(JSON.stringify({ type: 'ready' }));
            this.restartButton.disabled = true;
            this.restartButton.textContent = i18next.t('game.waitingForOpponent');
          }
        } else {
          this.ws?.send(JSON.stringify({ type: 'ready' }));
          this.restartButton.disabled = true;
          this.restartButton.textContent = i18next.t('game.waitingForOpponent');
        }
      }
    });

    // Paddle input listeners (both host and guest)
    document.addEventListener("keydown", (e) => {
      if (e.key === " " && this.gameStarted) {
        this.isPaused = !this.isPaused;
      }
      if (this.isHost) {
        // Host only controls left paddle with W/S
        if (["w", "s"].includes(e.key)) {
          this.keys[e.key as "w" | "s"] = true;
        }
      } else {
        // Guest only controls right paddle with ArrowUp/ArrowDown
        // Send input to host, do not update local keys state
        if (["ArrowUp", "ArrowDown"].includes(e.key)) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'paddle', key: e.key, pressed: true, player: 'guest' }));
          }
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      if (this.isHost) {
        // Host only controls left paddle with W/S
        if (["w", "s"].includes(e.key)) {
          this.keys[e.key as "w" | "s"] = false;
        }
      } else {
        // Guest only controls right paddle with ArrowUp/ArrowDown
        // Send input to host, do not update local keys state
        if (["ArrowUp", "ArrowDown"].includes(e.key)) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'paddle', key: e.key, pressed: false, player: 'guest' }));
          }
        }
      }
    });

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
  }

  private handleGameOver(winnerName: string): void {
    if (this.gameOver) return; // Prevent multiple calls
    this.gameOver = true;
    this.ballSpeedX = 0;
    this.ballSpeedY = 0;
    this.restartButton.style.display = "none";
    
    // Send final state to host if we're the guest
    if (!this.isHost && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "state",
        state: {
          paddleLeftY: this.paddleLeftY,
          paddleRightY: this.paddleRightY,
          ballX: this.ballX,
          ballY: this.ballY,
          ballSpeedX: this.ballSpeedX,
          ballSpeedY: this.ballSpeedY,
          scoreLeft: this.scoreLeft,
          scoreRight: this.scoreRight,
          gameOver: this.gameOver,
          gameStarted: this.gameStarted
        }
      }));
    }
    
    // Only attempt to record match if we're the host and the WebSocket is still open
    if (this.isHost && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const loserName = winnerName === this.playerLeftName ? this.playerRightName : this.playerLeftName;
        this.statsManager.recordMatch(winnerName, loserName, "Online Pong", {
          player1Score: this.scoreLeft,
          player2Score: this.scoreRight,
          sessionToken: localStorage.getItem("sessionToken")
        });
      } catch (error) {
        console.error('[DEBUG] Match recording error:', error);
      }
    }
    
    // Call onGameEnd callback if it exists and hasn't been triggered yet
    if (this.onGameEnd && !this.hasTriggeredGameEnd) {
      this.hasTriggeredGameEnd = true;
      this.onGameEnd(winnerName);
    }

    // Cleanup after a few seconds
    setTimeout(() => {
      this.cleanup();
    }, 5000); // 5 seconds delay
  }

  // Host: handle state updates from guest
  public handleStateMessage(msg: any) {
    if (!this.isHost && msg.type === "state") {
      Object.assign(this, msg.state);
      this.draw(performance.now());
    }
  }

  // Call this after assignment to ensure the game loop starts when gameStarted is set to true
  public pollForGameStart() {
    const poll = () => {
      if (this.gameStarted && !this.gameLoopRunning) {
        console.log('========== DEBUG: GAME LOOP STARTED FROM POLLFORGAMESTART() ==========');
        let countdown = 3;
        const countdownInterval = setInterval(() => {
          if (countdown > 0) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.draw();
            this.ctx.font = `bold ${100 * this.scale}px 'Verdana', sans-serif`;
            this.ctx.fillStyle = "white";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.shadowColor = "rgba(0, 0, 255, 0.5)";
            this.ctx.shadowBlur = 10 * this.scale;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            this.ctx.fillText(countdown.toString(), this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.shadowColor = "transparent";
            this.ctx.shadowBlur = 0;
            countdown--;
          } else {
            clearInterval(countdownInterval);
            this.startGameLoop();
            this.gameLoopRunning = true;
          }
        }, 1000);
      } else {
        requestAnimationFrame(poll);
      }
    };
    requestAnimationFrame(poll);
  }

  // Host: runs the game loop and sends state to guest
  public startGameLoop() {
    const loop = (timestamp: number) => {
      if (!this.gameStarted) {
        return;
      }
      this.updateGameState(timestamp);
      this.draw(timestamp);
      // Send state to guest
      if (this.ws && this.isHost && !this.gameOver) {
        this.ws.send(JSON.stringify({
          type: "state",
          state: {
            paddleLeftY: this.paddleLeftY,
            paddleRightY: this.paddleRightY,
            ballX: this.ballX,
            ballY: this.ballY,
            ballSpeedX: this.ballSpeedX,
            ballSpeedY: this.ballSpeedY,
            scoreLeft: this.scoreLeft,
            scoreRight: this.scoreRight,
            gameOver: this.gameOver,
            gameStarted: this.gameStarted
          }
        }));
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Host: updates the game state
  private updateGameState(timestamp: number) {
    // Calculate delta time
    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (this.isPaused || this.gameOver) return;

    // Reset any initial point that might be incorrectly assigned (only once)
    if (this.gameStarted && !this.hasResetInitialScore && (this.scoreLeft === 1 || this.scoreRight === 1)) {
      this.scoreLeft = 0;
      this.scoreRight = 0;
      this.scoreLeftElement.textContent = "0";
      this.scoreRightElement.textContent = "0";
      this.hasResetInitialScore = true;
    }

    // Target 60 FPS for normalization (1/60 seconds per frame)
    const frameTime = 1 / 60;
    const deltaTimeFactor = deltaTime / frameTime; // Scale movements to match 60 FPS

    // Paddle movement
    if (this.keys.w && this.paddleLeftY > 0) this.paddleLeftY -= this.paddleSpeed * deltaTimeFactor;
    if (this.keys.s && this.paddleLeftY < this.baseHeight - 80) this.paddleLeftY += this.paddleSpeed * deltaTimeFactor;
    if (this.keys.ArrowUp && this.paddleRightY > 0) this.paddleRightY -= this.paddleSpeed * deltaTimeFactor;
    if (this.keys.ArrowDown && this.paddleRightY < this.baseHeight - 80) this.paddleRightY += this.paddleSpeed * deltaTimeFactor;
    
    // Ball movement
    this.ballX += this.ballSpeedX * deltaTimeFactor;
    this.ballY += this.ballSpeedY * deltaTimeFactor;
    // Collisions
    if (this.ballY <= 0 || this.ballY >= this.baseHeight) this.ballSpeedY = -this.ballSpeedY;
    // Paddle collisions
    if (
      this.ballX - 10 <= 30 &&
      this.ballX + 10 >= 10 &&
      this.ballY >= this.paddleLeftY &&
      this.ballY <= this.paddleLeftY + 80 &&
      (this.ballX - 10 <= 10 || this.ballX + 10 >= 30)
    ) {
      this.ballSpeedX = -this.ballSpeedX;
      this.ballX = 30 + 10;
    }
    if (
      this.ballX + 10 >= this.baseWidth - 30 &&
      this.ballX - 10 <= this.baseWidth - 10 &&
      this.ballY >= this.paddleRightY &&
      this.ballY <= this.paddleRightY + 80 &&
      (this.ballX - 10 <= this.baseWidth - 30 || this.ballX + 10 >= this.baseWidth - 10)
    ) {
      this.ballSpeedX = -this.ballSpeedX;
      this.ballX = this.baseWidth - 30 - 10;
    }
    // Scoring
    if (this.ballX < 0) {
      this.scoreRight++;
      this.scoreRightElement.textContent = this.scoreRight.toString();
      // Send immediate score update
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "state",
          state: {
            paddleLeftY: this.paddleLeftY,
            paddleRightY: this.paddleRightY,
            ballX: this.ballX,
            ballY: this.ballY,
            ballSpeedX: this.ballSpeedX,
            ballSpeedY: this.ballSpeedY,
            scoreLeft: this.scoreLeft,
            scoreRight: this.scoreRight,
            gameOver: this.gameOver,
            gameStarted: this.gameStarted
          }
        }));
      }
      this.resetBall();
    } else if (this.ballX > this.baseWidth) {
      this.scoreLeft++;
      this.scoreLeftElement.textContent = this.scoreLeft.toString();
      // Send immediate score update
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "state",
          state: {
            paddleLeftY: this.paddleLeftY,
            paddleRightY: this.paddleRightY,
            ballX: this.ballX,
            ballY: this.ballY,
            ballSpeedX: this.ballSpeedX,
            ballSpeedY: this.ballSpeedY,
            scoreLeft: this.scoreLeft,
            scoreRight: this.scoreRight,
            gameOver: this.gameOver,
            gameStarted: this.gameStarted
          }
        }));
      }
      this.resetBall();
    }
    // Game over
    if (this.scoreLeft >= 3 || this.scoreRight >= 3) {
      const winnerName = this.scoreLeft >= 3 ? this.playerLeftName : this.playerRightName;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'gameOver', winnerName }));
      }
      this.handleGameOver(winnerName);
    }
  }

  private resetBall() {
    this.ballX = this.baseWidth / 2;
    this.ballY = this.baseHeight / 2;
    const speedMultiplier = this.getSpeedMultiplier();
    this.ballSpeedX = this.baseBallSpeedX * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
    this.ballSpeedY = this.baseBallSpeedY * this.scale * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
  }

  // Both: renders the game using the current state
  public draw(timestamp: number = performance.now()) {
    // Clear canvas
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.baseWidth * this.scale, this.baseHeight * this.scale);
    // Draw paddles
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(10 * this.scale, this.paddleLeftY, 20 * this.scale, 80 * this.scale);
    this.ctx.fillRect((this.baseWidth - 30) * this.scale, this.paddleRightY, 20 * this.scale, 80 * this.scale);
    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, 10 * this.scale, 0, Math.PI * 2);
    this.ctx.fillStyle = "white";
    this.ctx.fill();
    // Draw scores
    this.scoreLeftElement.textContent = this.scoreLeft.toString();
    this.scoreRightElement.textContent = this.scoreRight.toString();
    // Game over message
    if (this.gameOver) {
      this.ctx.font = `bold ${50 * this.scale}px 'Verdana', sans-serif`;
      this.ctx.fillStyle = "white";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.shadowColor = "rgba(0, 0, 255, 0.5)";
      this.ctx.shadowBlur = 10 * this.scale;
      this.ctx.fillText(
        this.scoreLeft >= 3 ? `${this.playerLeftName} Wins!` : `${this.playerRightName} Wins!`,
        this.canvas.width / 2,
        this.canvas.height / 2
      );
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
    }
  }

  // Attaches a back button listener to handle navigation
  public attachBackButtonListener(): void {
    const backButton = document.getElementById("backButton") as HTMLButtonElement;
    if (backButton) {
      backButton.style.display = "block";
      backButton.onclick = () => {
        this.cleanup();
        this.navigate("/");
      };
    }
  }

  public cleanup(): void {
    // Send cleanup message to both players
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "cleanup", reason: "opponent_left"}));
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close();
    }
    window.removeEventListener("resize", () => this.resizeCanvas());
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.gameLoopRunning) {
      this.gameLoopRunning = false;
    }
    // Re-establish presence connection
    ensurePresenceWS();
  }

  // Computes the speed multiplier based on the speed slider
  public getSpeedMultiplier(): number {
    return parseInt(this.speedSlider.value) / 5;
  }

  private resizeCanvas(): void {
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
  }
}