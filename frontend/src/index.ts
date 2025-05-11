import i18next from './i18n/config.js';
import { MultiplayerSpaceBattle } from './multiplayerSpaceBattle.js';
const uuidv4 = () => crypto.randomUUID();
// Imports Router class for client-side routing
import { Router } from "./router.js";
// Imports UI rendering and setup functions for various pages
import {
  renderWelcomePage,
  setupWelcomePage,
  renderNameEntryForm,
  setupNameForm,
  renderGameView,
  renderRegistrationForm,
  setupRegistrationForm,
  renderLoginForm,
  setupLoginForm,
  renderLoggedInWelcomePage,
  setupLoggedInWelcomePage,
  renderTournamentEnd,
  setupTournamentEnd,
  renderProfilePage,
  setupProfilePage,
  renderMultiplayerMenu,
  setupMultiplayerMenu,
  renderWaitingForOpponent,
  setupWaitingForOpponent,
} from "./ui.js";
// Imports Tournament class for managing tournament logic
import { Tournament } from "./tournament.js";
// Imports base PongGame class
import { PongGame } from "./game.js";
// Imports NeonCityPong class for the neon-themed game mode
import { NeonCityPong } from "./neonCityPong.js";
// Imports AI Pong class for AI opponent mode
import { AIPong } from "./AIPong.js";
// Imports SpaceBattle class for the space-themed game mode
import { SpaceBattle } from "./spaceBattle.js";
// Imports Bracket class for tournament bracket management
import { Bracket } from "./bracket.js";
// Imports StatsManager and Player type for player statistics
import { StatsManager, Player, GameStats, MatchRecord } from "./stats.js";
// Imports SettingsView class
import { SettingsView } from "./settings.js";
// Imports MultiplayerPongGame class
import { MultiplayerPongGame } from "./multiplayer.js";
import './i18n/config.js';
import { renderLanguageSwitcherWithHandler, setupLanguageSwitcherWithHandler } from './language.js';
import { getBackendUrl, getWebSocketUrl } from './config.js';

// Initializes StatsManager for tracking player stats
const statsManager = new StatsManager();
// Generates a unique ID for the tournament
let tournamentId = uuidv4();
// Creates a new Tournament instance
const tournament = new Tournament(statsManager, tournamentId);
// Initializes Router with the app container ID and route listener setup
const router = new Router("app", setupRouteListeners);

// Initialize i18next and start the router
import('./i18n/config.js').then(() => {
  console.log("[i18n] Initialized");
  router.start();
}).catch(error => {
  console.error("[i18n] Failed to initialize:", error);
  router.start(); // Start router anyway to show error state
});

// Stores the current game instance (PongGame, NeonCityPong, AIPong, or SpaceBattle)
let gameInstance: PongGame | SpaceBattle | null = null;
(window as any).gameInstance = null;
// Stores the current tournament bracket instance
let bracketInstance: Bracket | null = null;
// Tracks whether the game is in tournament mode
let isTournamentMode: boolean = false;
// Stores the backend tournament ID
let backendTournamentId: number | null = null;

// Update API base URL
export const API_BASE_URL = getBackendUrl();

// Defines navigate function to handle route changes
const navigate = (path: string) => router.navigate(path);

// --- Presence WebSocket connection ---
let presenceSocket: WebSocket | null = null;
let presenceReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let presencePingInterval: ReturnType<typeof setInterval> | null = null;

function connectPresenceWS() {
  const sessionToken = localStorage.getItem("sessionToken");
  if (!sessionToken) return;
  
  // Clear any existing reconnect timeout
  if (presenceReconnectTimeout) {
    clearTimeout(presenceReconnectTimeout);
    presenceReconnectTimeout = null;
  }

  // Clear any existing ping interval
  if (presencePingInterval) {
    clearInterval(presencePingInterval);
    presencePingInterval = null;
  }

  // Close existing socket if it exists
  if (presenceSocket) {
    presenceSocket.close();
    presenceSocket = null;
  }

  const presenceWsUrl = getWebSocketUrl(`/ws/presence?token=${encodeURIComponent(sessionToken)}`);
  presenceSocket = new WebSocket(presenceWsUrl);

  presenceSocket.onopen = () => {
    console.log("[Presence WS] Connected");
    // Send initial ping to establish connection
    if (presenceSocket?.readyState === WebSocket.OPEN) {
      presenceSocket.send(JSON.stringify({ type: 'ping' }));
    }
    // Start periodic ping to keep connection alive
    presencePingInterval = setInterval(() => {
      if (presenceSocket?.readyState === WebSocket.OPEN) {
        presenceSocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  };

  presenceSocket.onclose = () => {
    console.log("[Presence WS] Disconnected, attempting to reconnect...");
    // Clear any existing reconnect timeout
    if (presenceReconnectTimeout) {
      clearTimeout(presenceReconnectTimeout);
    }
    // Clear ping interval
    if (presencePingInterval) {
      clearInterval(presencePingInterval);
      presencePingInterval = null;
    }
    // Try to reconnect after a short delay
    presenceReconnectTimeout = setTimeout(connectPresenceWS, 2000);
  };

  presenceSocket.onerror = (error) => {
    console.error("[Presence WS] Error:", error);
    // Close and reconnect on error
    if (presenceSocket) {
      presenceSocket.close();
    }
  };

  presenceSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        // Connection is alive, do nothing
        return;
      }
    } catch (error) {
      console.error("[Presence WS] Error parsing message:", error);
    }
  };
}

// Call connectPresenceWS after login or on any authenticated page
export function ensurePresenceWS() {
  if (!presenceSocket || presenceSocket.readyState === WebSocket.CLOSED) {
    connectPresenceWS();
  }
}

// Clean up presence WebSocket connection
function cleanupPresenceWS() {
  if (presenceSocket) {
    presenceSocket.close();
    presenceSocket = null;
  }
  if (presenceReconnectTimeout) {
    clearTimeout(presenceReconnectTimeout);
    presenceReconnectTimeout = null;
  }
  if (presencePingInterval) {
    clearInterval(presencePingInterval);
    presencePingInterval = null;
  }
}

// Helper function to get current user from backend
async function getCurrentUser(): Promise<{ id: number; username: string; email: string } | null> {
  const sessionToken = localStorage.getItem("sessionToken");
  console.log("[GetUser Debug] Checking sessionToken:", sessionToken ? "Present" : "Missing");

  if (!sessionToken) {
    console.log("[GetUser Debug] No sessionToken found, clearing localStorage");
    localStorage.removeItem("sessionToken");
    return null;
  }

  try {
    console.log("[GetUser Debug] Fetching user profile with sessionToken");
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: { "Authorization": `Bearer ${sessionToken}` }
    });
    console.log("[GetUser Debug] Profile fetch response status:", response.status);

    if (!response.ok) {
      console.error("[GetUser Debug] Failed to fetch user profile, status:", response.status);
      throw new Error("Failed to fetch user");
    }

    const { user } = await response.json();
    // Ensure presence WebSocket is connected
    ensurePresenceWS();
    console.log("[GetUser Debug] User profile retrieved successfully:", { id: user.id, username: user.name });
    return { id: user.id, username: user.name, email: user.email };
  } catch (error) {
    console.error("[GetUser Debug] Error fetching user profile:", error);
    return null;
  }
}

// Defines root route ("/")
router.addRoute("/", async () => {
  ensurePresenceWS();
  console.log("[Route Debug] Entering root route handler");
  const currentUser = await getCurrentUser();
  console.log("[Route Debug] getCurrentUser result:", currentUser ? "User found" : "No user found");

  if (currentUser) {
    console.log("[Route Debug] Rendering logged-in welcome page for user:", currentUser.username);
    const html = renderLoggedInWelcomePage(
      async () => {
        // Logout callback
        try {
          await fetch(`${API_BASE_URL}/logout`, { method: 'POST' });
          router.navigate('/');
        } catch (error) {
          console.error('Logout failed:', error);
        }
      },
      currentUser.username,
      currentUser.email,
      (mode: string) => {
        tournament.addPlayers([currentUser.username, "Player 2"]);
        isTournamentMode = false;
      },
      () => router.navigate('/tournament'),
      () => router.navigate('/settings'),
    );
    console.log("[Route Debug] Logged-in welcome page HTML generated");

    setTimeout(() => {
      console.log("[Route Debug] Setting up logged-in welcome page handlers");
      setupLoggedInWelcomePage(
        async () => {
          // Logout callback
          const sessionToken = localStorage.getItem("sessionToken");
          if (sessionToken) {
            try {
              await fetch(`${API_BASE_URL}/logout`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${sessionToken}` }
              });
            } catch (error) {
              console.error("Logout error:", error);
            }
          }
          localStorage.removeItem("sessionToken");
          router.navigate("/");
        },
        currentUser.username,
        (mode: string) => {
          tournament.addPlayers([currentUser.username, "Player 2"]);
          isTournamentMode = false;
          if (mode === "standard") {
            router.navigate("/game");
          } else if (mode === "neonCity") {
            router.navigate("/neonCityGame");
          } else if (mode === "ai") {
            router.navigate("/aiGame");
          } else if (mode === "spaceBattle") {
            router.navigate("/spaceBattleGame");
          }
        },
        () => {
          // Play Tournament callback
          tournament.clearPlayers();
          router.navigate("/tournament");
        },
        () => {
          // Settings callback
          router.navigate("/settings");
        },
        (path: string) => router.navigate(path)
      );
    }, 0);
    return html;
  } else {
    console.log("[Route Debug] Rendering pre-login welcome page");
    const html = renderWelcomePage(
      () => router.navigate("/register"),
      () => router.navigate("/login")
    );
    setTimeout(() => {
      setupWelcomePage(
        () => router.navigate("/register"),
        () => router.navigate("/login")
      );
    }, 0);
    return html;
  }
});

// Defines welcome route ("/welcome")
router.addRoute("/welcome", () => {
  return "";
});

// Defines registration route ("/register")
router.addRoute("/register", () => {
  console.log("[Registration Debug] Rendering /register route");
  return renderRegistrationForm(async (username, email, password, avatar) => {
    console.log("[Registration Debug] Starting registration process");
    console.log("[Registration Debug] Form data:", { 
      username, 
      email, 
      hasPassword: !!password, 
      hasAvatar: !!avatar 
    });
    if (avatar) {
      console.log("[Registration Debug] Avatar details:", {
        name: avatar.name,
        type: avatar.type,
        size: avatar.size + " bytes",
        lastModified: new Date(avatar.lastModified).toISOString()
      });
    }

    try {
      console.log("[Registration Debug] Creating FormData");
      const formData = new FormData();
      formData.append('name', username);
      formData.append('email', email);
      formData.append('password', password);
      if (avatar) {
        formData.append('avatar', avatar);
      }

      console.log("[Registration Debug] Sending registration request to server");
      const registerResponse = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        body: formData
      });

      console.log("[Registration Debug] Registration response:", {
        status: registerResponse.status,
        ok: registerResponse.ok,
        statusText: registerResponse.statusText
      });

      const registerData = await registerResponse.json();
      console.log("[Registration Debug] Registration response data:", registerData);

      if (!registerResponse.ok) {
        console.error("[Registration Debug] Registration failed:", registerData.error);
        alert(registerData.error || "Registration failed");
        return;
      }

      // After registration, login to get the session token
      console.log("[Registration Debug] Registration successful, attempting login");
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("[Registration Debug] Login response:", {
        status: loginResponse.status,
        ok: loginResponse.ok,
        statusText: loginResponse.statusText
      });

      const loginData = await loginResponse.json();
      console.log("[Registration Debug] Login response data:", {
        hasSessionToken: !!loginData.sessionToken,
        error: loginData.error
      });

      if (!loginResponse.ok) {
        console.error("[Registration Debug] Login failed:", loginData.error);
        alert(loginData.error || "Login failed after registration");
        return;
      }

      if (!loginData.sessionToken || typeof loginData.sessionToken !== "string") {
        console.error("[Registration Debug] Invalid session token received");
        alert("Login failed: Invalid session token");
        return;
      }

      // Store the session token
      localStorage.setItem("sessionToken", loginData.sessionToken);
      // Ensure WebSocket connection is established before navigation
      await new Promise<void>((resolve) => {
        connectPresenceWS();
        // Give a small delay to ensure connection is established
        setTimeout(resolve, 100);
      });
      console.log("[Registration Debug] Session token stored in localStorage");

      console.log("[Registration Debug] Registration process complete, navigating to home");
      router.navigate("/");
    } catch (error) {
      console.error("[Registration Debug] Unexpected error:", error);
      alert("Server error during registration");
    }
  });
});

// Defines standard game route ("/game")
router.addRoute("/game", () => {
  // Since addRoute expects a synchronous string return, we call the async handler
  // and immediately return a placeholder string. The actual rendering is handled
  // by the async function.
  handleGameRoute().then(html => {
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = html;
    }
  }).catch(error => {
    console.error("Error in /game route:", error);
    router.navigate("/"); // Redirect to root on error
  });
  return ""; // Return placeholder string synchronously
});

// Defines login route ("/login")
router.addRoute("/login", () => {
  console.log("[Login Debug] Rendering /login route");
  return renderLoginForm(
    async (email, password) => {
      console.log("[Login Debug] Login form submitted with email:", email);
      try {
        console.log("[Login Debug] Sending login request to backend");
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        console.log("[Login Debug] Login response status:", response.status);
        
        if (!response.ok) {
          const data = await response.json();
          console.error("[Login Debug] Login failed:", data.error);
          alert((data.error as string) || "Invalid email or password");
          return;
        }

        const user = await response.json();
        console.log("[Login Debug] Login successful, user data received:", { 
          ...user, 
          sessionToken: user.sessionToken ? 'Present' : 'Missing' 
        });

        // Validate sessionToken before storing
        if (!user.sessionToken || typeof user.sessionToken !== "string") {
          console.error("[Login Debug] Invalid session token:", user.sessionToken);
          localStorage.removeItem("sessionToken"); // Clear invalid token
          alert("Login failed: Invalid session token");
          return;
        }

        console.log("[Login Debug] Storing session token in localStorage");
        localStorage.setItem("sessionToken", user.sessionToken);
        // Ensure WebSocket connection is established before navigation
        await new Promise<void>((resolve) => {
          connectPresenceWS();
          // Give a small delay to ensure connection is established
          setTimeout(resolve, 100);
        });
        console.log("[Login Debug] Session token stored for user:", user.email);
        
        console.log("[Login Debug] Attempting navigation to /");
        router.navigate("/");
        console.log("[Login Debug] Navigation command executed");
      } catch (error) {
        console.error("[Login Debug] Login error:", error);
        alert("Server error during login");
      }
    },
    () => {
      console.log("[Login Debug] Register link clicked, navigating to /register");
      router.navigate("/register");
    }
  );
});

// Defines tournament route ("/tournament")
router.addRoute("/tournament", () => {
  console.log("Rendering /tournament route");
  if (tournament.hasPlayers() && isTournamentMode) {
    router.navigate("/game");
    return "";
  }
  return renderNameEntryForm(async (player1, player2, player3, player4) => {
    const playerNames = [player1, player2, player3, player4]
      .map(name => name?.trim())
      .filter(name => name && name.length > 0);
    if (playerNames.length !== 4) {
      alert("Exactly four players are required for a tournament. Names cannot be empty or whitespace-only.");
      return;
    }
    try {
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        throw new Error("User not logged in");
      }
      const response = await fetch(`${API_BASE_URL}/profile/me`, {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (!response.ok) throw new Error("Failed to fetch logged-in user");
      const { user } = await response.json();
      
      if (playerNames[0] !== user.name) {
        throw new Error("First player name must match the logged-in user's username");
      }

      const tournamentResponse = await fetch(`${API_BASE_URL}/tournament`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ usernames: playerNames }),
      });
      if (!tournamentResponse.ok) {
        const data = await tournamentResponse.json();
        throw new Error((data.error as string) || "Failed to create tournament");
      }
      const { tournamentId: newTournamentId } = await tournamentResponse.json();
      backendTournamentId = newTournamentId;
      tournamentId = newTournamentId.toString();
      tournament.addPlayers(playerNames);
      const players: Player[] = playerNames.map(name => ({ id: uuidv4(), name }));
      bracketInstance = new Bracket(players, statsManager, tournamentId);
      isTournamentMode = true;
      router.navigate("/game");
    } catch (error) {
      console.error("Tournament creation error:", error);
      alert("Failed to create tournament: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  });
});

// Function to handle the /game route logic asynchronously
async function handleGameRoute(): Promise<string> {
  // Check if the user is logged in
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    router.navigate("/login");
    return "";
  }
  // Redirects to root if no players are in the tournament
  if (!tournament.hasPlayers()) {
    router.navigate("/");
    return "";
  }
  let left: string, right: string;
  // Flag to prevent duplicate winner recording
  let winnerRecorded = false;
  // Handles tournament mode logic
  if (isTournamentMode && bracketInstance) {
    const match = bracketInstance.getNextMatch();
    // Handles tournament end
    if (!match) {
      const winnerId = bracketInstance.getWinner();
      if (winnerId && !winnerRecorded) {
        const winner = bracketInstance.getRounds().flat().find(m => m.player1.id === winnerId || m.player2.id === winnerId);
        if (winner) {
          const winnerName = winner.player1.id === winnerId ? winner.player1.name : winner.player2.name;
          const currentPlayers = tournament.getPlayers();
          isTournamentMode = false;
          bracketInstance = null;
          tournament.clearPlayers();
          backendTournamentId = null;
          winnerRecorded = true; // Prevent duplicate recording
          const html = renderTournamentEnd(winnerName);
          // Sets up tournament end page
          setTimeout(() => {
            setupTournamentEnd(
              async () => {
                // Create a new tournament on the backend
                try {
                  const sessionToken = localStorage.getItem("sessionToken");
                  if (!sessionToken) throw new Error("User not logged in");
                  const tournamentResponse = await fetch(`${API_BASE_URL}/tournament`, {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${sessionToken}`
                    },
                    body: JSON.stringify({ usernames: currentPlayers }),
                  });
                  if (!tournamentResponse.ok) {
                    const data = await tournamentResponse.json();
                    throw new Error((data.error as string) || "Failed to create tournament");
                  }
                  const { tournamentId: newTournamentId } = await tournamentResponse.json();
                  backendTournamentId = newTournamentId;
                  tournamentId = newTournamentId.toString();
                  tournament.addPlayers(currentPlayers);
                  const players: Player[] = currentPlayers.map(name => ({ id: uuidv4(), name }));
                  bracketInstance = new Bracket(players, statsManager, tournamentId);
                  isTournamentMode = true;
                  winnerRecorded = false; // Reset for new tournament
                  router.navigate("/game");
                } catch (error) {
                  console.error("Error restarting tournament:", error);
                  alert("Failed to restart tournament: " + (error instanceof Error ? error.message : "Unknown error"));
                  router.navigate("/");
                }
              },
              () => {
                router.navigate("/");
              }
            );
          }, 0);
          return html;
        }
      }
      return "";
    }
    left = match.player1.name;
    right = match.player2.name;
  } else {
    // Uses default players for non-tournament mode
    [left, right] = tournament.getPlayers();
  }
  // Renders game view
  const html = renderGameView(left, right, isTournamentMode ? bracketInstance?.getCurrentRound() : undefined);
  // Initializes standard PongGame instance
  setTimeout(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.navigate("/login");
      return;
    }
    // In the /game route's setTimeout callback
    const onGameEnd = isTournamentMode ? async (winnerName: string) => {
      if (!isTournamentMode) {
        console.log("Tournament mode ended, skipping onGameEnd");
        return;
      }
      if (bracketInstance && backendTournamentId) {
        const match = bracketInstance.getNextMatch();
        if (match) {
          const winnerId = match.player1.name === winnerName ? match.player1.id : match.player2.id;
          try {
            const sessionToken = localStorage.getItem("sessionToken");
            if (!sessionToken) throw new Error("User not logged in");

            // Get player names directly from the match
            let player1Name = match.player1.name;
            let player2Name = match.player2.name;

            // Validate player names
            if (!player1Name?.trim() || !player2Name?.trim()) {
              throw new Error("Player names cannot be empty or whitespace-only");
            }

            // Ensure required fields are present
            if (!match.tournamentId || match.roundNumber == null) {
              throw new Error("Tournament match is missing required fields");
            }

            // Create tournament match
            const matchResponse = await fetch(`${API_BASE_URL}/tournament/match`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
              },
              body: JSON.stringify({
                tournamentId: backendTournamentId,
                roundNumber: match.roundNumber,
                player1: player1Name,
                player2: player2Name,
              }),
            });
            if (!matchResponse.ok) {
              const errorData = await matchResponse.json();
              throw new Error(errorData.error || "Failed to create match");
            }
            const { matchId } = await matchResponse.json();

            // Set match winner
            const winnerResponse = await fetch(`${API_BASE_URL}/tournament/match/winner`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
              },
              body: JSON.stringify({
                tournamentId: backendTournamentId,
                matchId,
                winner: winnerName,
              }),
            });
            if (!winnerResponse.ok) {
              const errorData = await winnerResponse.json();
              throw new Error(errorData.error || "Failed to set match winner");
            }
            bracketInstance.setMatchWinner(match.id, winnerId);
            router.navigate("/game");
          } catch (error) {
            console.error("Error recording match winner:", error);
            alert("Failed to record match winner: " + (error instanceof Error ? error.message : "Unknown error"));
          }
        } else {
          console.error("No match found from getNextMatch");
        }
      } else {
        console.error("bracketInstance or backendTournamentId is null", { bracketInstance, backendTournamentId });
      }
    } : undefined;

    gameInstance = new PongGame(
      left,
      right,
      "pongCanvas",
      "speedSlider",
      "backgroundColorSelect",
      "scoreLeft",
      "scoreRight",
      "restartButton",
      "settingsButton",
      "settingsMenu",
      "settingsContainer",
      statsManager,
      statsManager.getCurrentUser()?.username || null,
      onGameEnd,
      navigate,
      isTournamentMode
    );
    (window as any).gameInstance = gameInstance;
  }, 0);
  return html;
}

// Defines neon city game route ("/neonCityGame")
router.addRoute("/neonCityGame", () => {
  if (!tournament.hasPlayers()) {
    router.navigate("/");
    return "";
  }
  let left: string, right: string;
  [left, right] = tournament.getPlayers();
  const html = renderGameView(left, right);
  setTimeout(() => {
    gameInstance = new NeonCityPong(
      left,
      right,
      "pongCanvas",
      "speedSlider",
      "backgroundColorSelect",
      "scoreLeft",
      "scoreRight",
      "restartButton",
      "settingsButton",
      "settingsMenu",
      "settingsContainer",
      statsManager,
      statsManager.getCurrentUser()?.username || null,
      navigate,
      (winnerName: string) => {
        // Handle game end
        if (winnerName) {
          console.log(`Game over! Winner: ${winnerName}`);
        }
      }
    );
    (window as any).gameInstance = gameInstance;
  }, 0);
  return html;
});

// Defines AI game route ("/aiGame")
router.addRoute("/aiGame", () => {
  if (!tournament.hasPlayers()) {
    router.navigate("/");
    return "";
  }
  const [left] = tournament.getPlayers();
  const right = "AI Opponent";
  const html = renderGameView(left, right);
  setTimeout(() => {
    gameInstance = new AIPong(
      left,
      right,
      "pongCanvas",
      "speedSlider",
      "backgroundColorSelect",
      "scoreLeft",
      "scoreRight",
      "restartButton",
      "settingsButton",
      "settingsMenu",
      "settingsContainer",
      statsManager,
      statsManager.getCurrentUser()?.username || null,
      navigate,
      (winnerName: string) => {
        // Handle game end
        if (winnerName) {
          console.log(`Game over! Winner: ${winnerName}`);
        }
      }
    );
    (window as any).gameInstance = gameInstance;
  }, 0);
  return html;
});

// Defines space battle game route ("/spaceBattleGame")
router.addRoute("/spaceBattleGame", () => {
  if (!tournament.hasPlayers()) {
    router.navigate("/");
    return "";
  }
  let left: string, right: string;
  [left, right] = tournament.getPlayers();
  const html = renderGameView(left, right);
  setTimeout(() => {
    gameInstance = new SpaceBattle(
      left,
      right,
      "pongCanvas",
      "speedSlider",
      "backgroundColorSelect",
      "scoreLeft",
      "scoreRight",
      "restartButton",
      "settingsButton",
      "settingsMenu",
      "settingsContainer",
      statsManager,
      statsManager.getCurrentUser()?.username || null,
      navigate,
      (winnerName: string) => {
        // Handle game end
        if (winnerName) {
          console.log(`Game over! Winner: ${winnerName}`);
        }
      }
    );
    (window as any).gameInstance = gameInstance;
  }, 0);
  return html;
});

// Add multiplayer route
router.addRoute("/multiplayer", () => {
  const html = renderMultiplayerMenu();
  setTimeout(() => {
    setupMultiplayerMenu((path) => router.navigate(path));
  }, 0);
  return html;
});

// Add settings route
router.addRoute("/settings", () => {
  ensurePresenceWS();
  const settingsView = new SettingsView(statsManager, navigate);
  const loadingContent = '<div class="settings-loading">Loading settings...</div>';
  
  // Handle the async operations after initial render
  setTimeout(async () => {
    const content = await settingsView.render();
    const appElement = document.getElementById("app");
    if (appElement) {
      appElement.innerHTML = content;
      await settingsView.setup();
    }
  }, 0);

  return loadingContent;
});

// Add profile route
let profilePollingInterval: ReturnType<typeof setInterval> | null = null;
router.addRoute("/profile", async () => {
  ensurePresenceWS();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    router.navigate("/login");
    return "";
  }

  const sessionToken = localStorage.getItem("sessionToken");
  let latestFriends: any[] = [];
  let latestHtml = "";
  let playerStats: any = {};
  let matchHistory: any[] = [];
  let gameStats: Record<string, any> = {};

  async function fetchAndRenderProfile() {
    try {
      if (!currentUser) {
        router.navigate("/login");
        return;
      }
      const response = await fetch(`${API_BASE_URL}/profile/me`, {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (!response.ok) throw new Error("Failed to fetch profile data");
      const { user, matches, friends } = await response.json();
      latestFriends = friends;
      playerStats = {
        wins: user.wins || 0,
        losses: user.losses || 0,
        tournamentsWon: user.tournamentsWon || 0,
      };
      gameStats = {};
      matches.forEach((match: any) => {
        const { gameType, userName, opponentName, userScore, opponentScore } = match;
        if (!gameStats[gameType]) {
          gameStats[gameType] = {
            username: currentUser.username,
            gameType,
            gamesPlayed: 0,
            wins: 0,
            losses: 0
          };
        }
        gameStats[gameType].gamesPlayed++;
        if (userName === currentUser.username && userScore > opponentScore) {
          gameStats[gameType].wins++;
        } else if (opponentName === currentUser.username && opponentScore > userScore) {
          gameStats[gameType].wins++;
        } else {
          gameStats[gameType].losses++;
        }
      });
      matchHistory = matches.map((match: any) => ({
        winner: match.userScore > match.opponentScore ? match.userName : match.opponentName,
        loser: match.userScore > match.opponentScore ? match.opponentName : match.userName,
        timestamp: match.date
      }));
      latestHtml = renderProfilePage(
        currentUser.username,
        currentUser.email,
        playerStats,
        matchHistory,
        gameStats,
        latestFriends,
        true
      );
      const appContainer = document.getElementById("app");
      if (appContainer) {
        appContainer.innerHTML = latestHtml;
        setTimeout(() => {
          setupProfilePage(() => {
            if (profilePollingInterval) {
              clearInterval(profilePollingInterval);
              profilePollingInterval = null;
            }
            // Remove popstate listener
            window.removeEventListener("popstate", cleanupPolling);
            // Restore router.handleRouteChange
            if (router.handleRouteChange === customHandleRouteChange) {
              router.handleRouteChange = originalHandleRouteChange;
            }
            router.navigate("/");
          }, router.navigate);
        }, 0);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      router.navigate("/");
    }
  }

  // Initial render
  await fetchAndRenderProfile();

  // Start polling every 5 seconds
  if (profilePollingInterval) clearInterval(profilePollingInterval);
  profilePollingInterval = setInterval(fetchAndRenderProfile, 5000);

  // Clean up polling when navigating away
  function cleanupPolling() {
    if (profilePollingInterval) {
      clearInterval(profilePollingInterval);
      profilePollingInterval = null;
    }
    window.removeEventListener("popstate", cleanupPolling);
    if (router.handleRouteChange === customHandleRouteChange) {
      router.handleRouteChange = originalHandleRouteChange;
    }
  }

  // Clean up on popstate (browser back/forward)
  window.addEventListener("popstate", cleanupPolling);

  // Clean up on route change
  const originalHandleRouteChange = router.handleRouteChange;
  async function customHandleRouteChange() {
    cleanupPolling();
    await originalHandleRouteChange.call(router);
  }
  router.handleRouteChange = customHandleRouteChange;

  return latestHtml;
});

// Add dynamic profile route for viewing other users' profiles
router.addRoute("/profile/:id", async () => {
  ensurePresenceWS();
  const sessionToken = localStorage.getItem("sessionToken");
  const pathParts = window.location.pathname.split("/");
  const userId = pathParts[pathParts.length - 1];
  if (!userId) {
    router.navigate("/profile");
    return "";
  }

  let latestHtml = "";
  let playerStats: any = {};
  let matchHistory: any[] = [];
  let gameStats: Record<string, any> = {};
  let latestFriends: any[] = [];

  try {
    const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
      headers: { "Authorization": `Bearer ${sessionToken}` }
    });
    if (!response.ok) throw new Error("Failed to fetch user profile");
    const { user, matches, friends } = await response.json();
    latestFriends = friends || [];
    playerStats = {
      wins: user.wins || 0,
      losses: user.losses || 0,
      tournamentsWon: user.tournamentsWon || 0,
    };
    gameStats = {};
    matches.forEach((match: any) => {
      const { gameType, userName, opponentName, userScore, opponentScore } = match;
      if (!gameStats[gameType]) {
        gameStats[gameType] = {
          username: user.name,
          gameType,
          gamesPlayed: 0,
          wins: 0,
          losses: 0
        };
      }
      gameStats[gameType].gamesPlayed++;
      if (userName === user.name && userScore > opponentScore) {
        gameStats[gameType].wins++;
      } else if (opponentName === user.name && opponentScore > userScore) {
        gameStats[gameType].wins++;
      } else {
        gameStats[gameType].losses++;
      }
    });
    matchHistory = matches.map((match: any) => ({
      winner: match.userScore > match.opponentScore ? match.userName : match.opponentName,
      loser: match.userScore > match.opponentScore ? match.opponentName : match.userName,
      timestamp: match.date
    }));
    latestHtml = renderProfilePage(
      user.name,
      user.email,
      playerStats,
      matchHistory,
      gameStats,
      latestFriends,
      false
    );
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = latestHtml;
      setTimeout(() => {
        setupProfilePage(() => {
          router.navigate("/");
        }, router.navigate);
      }, 0);
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    router.navigate("/welcome");
  }
  return latestHtml;
});

// Add multiplayer game route
router.addRoute("/multiplayerGame/:matchId", async () => {
  // Extract matchId from the URL
  const matchId = window.location.pathname.split("/").pop();
  const currentUser = await getCurrentUser();
  if (!currentUser || !matchId) {
    router.navigate("/");
    return "";
  }
  // Read the selected game type
  const multiplayerGameType = sessionStorage.getItem("multiplayerGameType") || "pong";
  // Render the standard Pong game view with placeholder names
  const html = renderGameView(currentUser.username, "Waiting for opponent...");
  setTimeout(() => {
    // Connect to WebSocket
    const sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
      alert("Session token not found. Please log in again.");
      navigate("/login");
      return;
    }
    const wsUrl = getWebSocketUrl(`/ws/match/${matchId}?token=${encodeURIComponent(sessionToken)}`);
    const ws = new WebSocket(wsUrl);
    
    let localPlayerReady = false;
    let remotePlayerReady = false;
    let isHost = false;
    let assigned = false;
    let opponentName = "Waiting for opponent...";
    let multiplayerGame: any = null;
    let gameStarted = false;

    // Store event listener references for cleanup
    const keydownListener = (e: KeyboardEvent) => {
      if (e.key === " " && gameStarted) {
        ws.send(JSON.stringify({
          type: "paddle",
          key: e.key,
          pressed: true,
        }));
      }
      if (isHost) {
        // Host only sends W/S keys
        if (["w", "s"].includes(e.key)) {
          ws.send(JSON.stringify({
            type: "paddle",
            key: e.key,
            pressed: true,
          }));
        }
      } else {
        // Guest only sends ArrowUp/ArrowDown keys
        if (["ArrowUp", "ArrowDown"].includes(e.key)) {
          ws.send(JSON.stringify({
            type: "paddle",
            key: e.key,
            pressed: true,
          }));
        }
      }
    };

    const keyupListener = (e: KeyboardEvent) => {
      if (isHost) {
        // Host only sends W/S keys
        if (["w", "s"].includes(e.key)) {
          ws.send(JSON.stringify({
            type: "paddle",
            key: e.key,
            pressed: false,
          }));
        }
      } else {
        // Guest only sends ArrowUp/ArrowDown keys
        if (["ArrowUp", "ArrowDown"].includes(e.key)) {
          ws.send(JSON.stringify({
            type: "paddle",
            key: e.key,
            pressed: false,
          }));
        }
      }
    };

    // Function to handle game start
    const startGame = () => {
      if (!multiplayerGame) return;
      console.log('[DEBUG] Start button clicked. localPlayerReady:', localPlayerReady);
      if (!localPlayerReady) {
        localPlayerReady = true;
        multiplayerGame.restartButton.textContent = 'Waiting for opponent...';
        multiplayerGame.restartButton.disabled = true;
        ws.send(JSON.stringify({ type: 'ready' }));
        console.log('[DEBUG] Sent ready message to backend');
      }
    };

    ws.onopen = () => {
      // Send a join message to get assigned
      ws.send(JSON.stringify({ type: "join", user: currentUser.username }));
      console.log('[DEBUG] WebSocket connection opened');
    };

    ws.onclose = (event) => {
      console.log('[DEBUG] WebSocket closed:', event);
      if (multiplayerGame) {
        multiplayerGame.cleanup();
        multiplayerGame = null;
      }
      navigate('/'); // Or navigate('/multiplayer') if you prefer
    };

    ws.onerror = (event) => {
      console.log('[DEBUG] WebSocket error:', event);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Forward all messages to the game instance if it has handleWebSocketMessage
      if (multiplayerGame && typeof multiplayerGame.handleWebSocketMessage === "function") {
        multiplayerGame.handleWebSocketMessage(data);
        return; // Prevent further game-specific logic
      }
      if (data.type === "cleanup") {
        if (data.reason === "opponent_left") {
          alert(i18next.t('game.opponentLeft'));
        }
        if (multiplayerGame) {
          multiplayerGame.cleanup();
          navigate('/');
        }
      }
      if (data.type === "game_start") {
        if (multiplayerGame) {
          // Reset game state
          multiplayerGame.scoreLeft = 0;
          multiplayerGame.scoreRight = 0;
          multiplayerGame.scoreLeftElement.textContent = "0";
          multiplayerGame.scoreRightElement.textContent = "0";
          multiplayerGame.gameOver = false;
          multiplayerGame.gameStarted = true;
          multiplayerGame.isPaused = false;
          if (multiplayerGameType === "spaceBattle") {
            multiplayerGame.targets = [];
            multiplayerGame.projectiles = [];
            multiplayerGame.targetSpawnTimer = 0;
            multiplayerGame.leftShootTimer = 0;
            multiplayerGame.rightShootTimer = 0;
          } else {
            multiplayerGame.paddleLeftY = 160;
            multiplayerGame.paddleRightY = 160;
            multiplayerGame.ballX = 400;
            multiplayerGame.ballY = 200;
            multiplayerGame.ballSpeedX = 6.0;
            multiplayerGame.ballSpeedY = 4.1;
          }
          multiplayerGame.restartButton.style.display = "none";
          multiplayerGame.draw();
          return;
        }
      }
      if (!assigned && data.type === "assign") {
        isHost = data.host;
        assigned = true;
        opponentName = data.opponentName || i18next.t('game.waitingForOpponent');
        
        // Initialize the game for both host and guest
        if (!multiplayerGame) {
          if (multiplayerGameType === "spaceBattle") {
            multiplayerGame = new MultiplayerSpaceBattle(
              isHost ? currentUser.username : opponentName,
              isHost ? opponentName : currentUser.username,
              "pongCanvas",
              "speedSlider",
              "backgroundColorSelect",
              "scoreLeft",
              "scoreRight",
              "restartButton",
              "settingsButton",
              "settingsMenu",
              "settingsContainer",
              statsManager,
              currentUser.username,
              navigate,
              matchId,
              isHost
            );
            multiplayerGame.setupWebSocket(ws, isHost, opponentName);
            multiplayerGame.pollForGameStart();
          } else {
            multiplayerGame = new MultiplayerPongGame(
              isHost ? currentUser.username : opponentName,
              isHost ? opponentName : currentUser.username,
              "pongCanvas",
              "speedSlider",
              "backgroundColorSelect",
              "scoreLeft",
              "scoreRight",
              "restartButton",
              "settingsButton",
              "settingsMenu",
              "settingsContainer",
              statsManager,
              currentUser.username,
              navigate
            );
            multiplayerGame.setupWebSocket(ws, isHost, opponentName);
            multiplayerGame.pollForGameStart();
          }
          multiplayerGame.restartButton.style.display = "block";
          multiplayerGame.restartButton.textContent = i18next.t('game.start');
          multiplayerGame.restartButton.disabled = false;
          multiplayerGame.restartButton.onclick = startGame;
          if (!isHost && multiplayerGameType !== "spaceBattle") {
            document.addEventListener("keydown", keydownListener);
            document.addEventListener("keyup", keyupListener);
          }
          multiplayerGame.draw();
          if (typeof multiplayerGame.attachBackButtonListener === "function") {
            multiplayerGame.attachBackButtonListener();
          }
          // Ensure cleanup and WebSocket close on navigation
          const cleanupAndClose = () => {
            if (multiplayerGame) {
              multiplayerGame.cleanup();
              multiplayerGame = null;
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
            // Notify backend to leave match or queue
            const sessionToken = localStorage.getItem("sessionToken");
            if (sessionToken) {
              fetch(`${API_BASE_URL}/matchmaking/leave`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${sessionToken}` },
              }).then(() => {
                // After leaving the match, navigate to the multiplayer menu
                navigate("/multiplayer");
              });
            }
          };
          window.addEventListener("popstate", cleanupAndClose, { once: true });
          window.addEventListener("beforeunload", cleanupAndClose, { once: true });
          console.log('[DEBUG] Multiplayer game assigned and draw loop started');
        }

        // Update player names
        if (isHost) {
          multiplayerGame.playerLeftName = currentUser.username;
          const leftNameElem = document.getElementById("playerLeftNameDisplay");
          if (leftNameElem) leftNameElem.textContent = currentUser.username;
          if (opponentName && opponentName !== i18next.t('game.waitingForOpponent')) {
            multiplayerGame.playerRightName = opponentName;
            const rightNameElem = document.getElementById("playerRightNameDisplay");
            if (rightNameElem) rightNameElem.textContent = opponentName;
          }
        } else {
          multiplayerGame.playerRightName = currentUser.username;
          const rightNameElem = document.getElementById("playerRightNameDisplay");
          if (rightNameElem) rightNameElem.textContent = currentUser.username;
          if (opponentName && opponentName !== i18next.t('game.waitingForOpponent')) {
            multiplayerGame.playerLeftName = opponentName;
            const leftNameElem = document.getElementById("playerLeftNameDisplay");
            if (leftNameElem) leftNameElem.textContent = opponentName;
          }
        }
      }
      // Handle opponent join/update
      else if (multiplayerGame && data.type === "opponent") {
        // Always update both name displays for robustness
        if (multiplayerGame.isHost) {
          multiplayerGame.playerRightName = data.name;
          const rightNameElem = document.getElementById("playerRightNameDisplay");
          if (rightNameElem) rightNameElem.textContent = data.name;
        } else {
          multiplayerGame.playerLeftName = data.name;
          const leftNameElem = document.getElementById("playerLeftNameDisplay");
          if (leftNameElem) leftNameElem.textContent = data.name;
        }
        console.log('[DEBUG] Multiplayer game opponent joined and name updated');
      }
      // Handle paddle and state messages for multiplayer
      else if (multiplayerGame && data.type === "paddle") {
        multiplayerGame.handlePaddleMessage(data);
      }
      else if (multiplayerGame && data.type === "state") {
        multiplayerGame.handleStateMessage(data);
      }
      
    };

    // In /multiplayerGame/:matchId route, after initializing multiplayerGame (both host and guest), always show the back button
    if (multiplayerGame) {
      const backButton = document.getElementById("backButton") as HTMLButtonElement;
      if (backButton) backButton.style.display = "block";
    }
  }, 0);
  return html;
});

// Starts the router
router.start();

// Sets up event listeners for each route
function setupRouteListeners() {
  console.log("Setting up route listeners for pathname:", window.location.pathname);
  if (window.location.pathname === "/" || window.location.pathname === "/welcome") {
    const appContainer = document.getElementById("app");
    if (!appContainer) return;

    // Setup event listeners for welcome page elements
    const registerButton = document.getElementById("registerButton");
    const loginButton = document.getElementById("loginButton");
    const settingsLink = document.getElementById("settingsLink");
    const profileLink = document.getElementById("profileLink");
    const logoutLink = document.getElementById("logoutLink");
    const playMatchButton = document.getElementById("playMatchButton");
    const playTournamentButton = document.getElementById("playTournamentButton");
    const gameModeSelect = document.getElementById("gameModeSelect") as HTMLSelectElement;
    const menuButton = document.getElementById("menuButton");
    const sidebar = document.getElementById("sidebar");

    // Setup pre-login buttons
    if (registerButton) {
      registerButton.addEventListener("click", () => router.navigate("/register"));
    }
    if (loginButton) {
      loginButton.addEventListener("click", () => router.navigate("/login"));
    }

    // Setup post-login elements
    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const sessionToken = localStorage.getItem("sessionToken");
        if (sessionToken) {
          try {
            await fetch(`${API_BASE_URL}/logout`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${sessionToken}` }
            });
          } catch (error) {
            console.error("Logout error:", error);
          }
        }
        localStorage.removeItem("sessionToken");
        router.navigate("/");
      });
    }

    if (settingsLink) {
      settingsLink.addEventListener("click", (e) => {
        e.preventDefault();
        router.navigate("/settings");
      });
    }

    if (profileLink) {
      profileLink.addEventListener("click", (e) => {
        e.preventDefault();
        router.navigate("/profile");
      });
    }

    if (playMatchButton && gameModeSelect) {
      playMatchButton.addEventListener("click", async (e) => {
        e.preventDefault();
        const currentUser = await getCurrentUser();
        if (!currentUser) return;

        const selectedMode = gameModeSelect.value;
        if (selectedMode === "multiplayer") {
          router.navigate("/multiplayer");
          return;
        }
        
        tournament.addPlayers([currentUser.username, "Player 2"]);
        isTournamentMode = false;
        if (selectedMode === "standard") {
          router.navigate("/game");
        } else if (selectedMode === "neonCity") {
          router.navigate("/neonCityGame");
        } else if (selectedMode === "ai") {
          router.navigate("/aiGame");
        } else if (selectedMode === "spaceBattle") {
          router.navigate("/spaceBattleGame");
        }
      });
    }

    if (playTournamentButton) {
      playTournamentButton.addEventListener("click", (e) => {
        e.preventDefault();
        tournament.clearPlayers();
        router.navigate("/tournament");
      });
    }

    if (menuButton && sidebar) {
      menuButton.addEventListener("click", () => {
        sidebar.classList.toggle("visible");
      });

      document.addEventListener("click", (e) => {
        const target = e.target as Node;
        if (
          sidebar.classList.contains("visible") &&
          !sidebar.contains(target) &&
          !menuButton.contains(target)
        ) {
          sidebar.classList.remove("visible");
        }
      });
    }
  } else if (window.location.pathname === "/register") {
    console.log("Setting up registration form");
    setupRegistrationForm(async (username, email, password, avatar) => {
      console.log("[Registration Debug] Starting registration process");
      console.log("[Registration Debug] Form data:", { username, email, hasPassword: !!password, hasAvatar: !!avatar });
      if (avatar) {
        console.log("[Registration Debug] Avatar details:", {
          name: avatar.name,
          type: avatar.type,
          size: avatar.size + " bytes",
          lastModified: new Date(avatar.lastModified).toISOString()
        });
      }

      try {
        // First register the user
        console.log("[Registration Debug] Sending registration request to server");
        const formData = new FormData();
        formData.append('name', username);
        formData.append('email', email);
        formData.append('password', password);
        if (avatar) {
          formData.append('avatar', avatar);
        }

        const registerResponse = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          body: formData
        });

        const registerData = await registerResponse.json();
        console.log("[Registration Debug] Registration response:", {
          status: registerResponse.status,
          ok: registerResponse.ok,
          data: registerData
        });

        if (!registerResponse.ok) {
          console.error("[Registration Debug] Registration failed:", registerData.error);
          alert(registerData.error || "Registration failed");
          return;
        }

        // After registration, login to get the session token
        console.log("[Registration Debug] Registration successful, attempting login");
        const loginResponse = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();
        console.log("[Registration Debug] Login response:", {
          status: loginResponse.status,
          ok: loginResponse.ok,
          hasSessionToken: !!loginData.sessionToken
        });

        if (!loginResponse.ok) {
          console.error("[Registration Debug] Login failed:", loginData.error);
          alert(loginData.error || "Login failed after registration");
          return;
        }

        if (!loginData.sessionToken || typeof loginData.sessionToken !== "string") {
          console.error("[Registration Debug] Invalid session token received");
          alert("Login failed: Invalid session token");
          return;
        }

        // Store the session token
        localStorage.setItem("sessionToken", loginData.sessionToken);
        // Ensure WebSocket connection is established before navigation
        await new Promise<void>((resolve) => {
          connectPresenceWS();
          // Give a small delay to ensure connection is established
          setTimeout(resolve, 100);
        });
        console.log("[Registration Debug] Session token stored in localStorage");

        console.log("[Registration Debug] Registration process complete, navigating to home");
        router.navigate("/");
      } catch (error) {
        console.error("[Registration Debug] Unexpected error:", error);
        alert("Server error during registration");
      }
    });
  } else if (window.location.pathname === "/login") {
    console.log("Setting up login form");
    setupLoginForm(
      async (email, password) => {
        console.log("Login form submitted from setup with:", { email });
        try {
          const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (!response.ok) {
            const data = await response.json();
            alert((data.error as string) || "Invalid email or password");
            return;
          }
          const user = await response.json();
          console.log("Credentials valid from setup, setting session token");
          // Validate sessionToken before storing
          if (!user.sessionToken || typeof user.sessionToken !== "string") {
            console.error("Invalid session token received:", user.sessionToken);
            localStorage.removeItem("sessionToken"); // Clear invalid token
            alert("Login failed: Invalid session token");
            return;
          }
          localStorage.setItem("sessionToken", user.sessionToken);
          // Ensure WebSocket connection is established before navigation
          await new Promise<void>((resolve) => {
            connectPresenceWS();
            // Give a small delay to ensure connection is established
            setTimeout(resolve, 100);
          });
          console.log("Session token set for user:", user.email);
          console.log("Attempting navigation to / from setup");
          router.navigate("/");
        } catch (error) {
          console.error("Login error:", error);
          alert("Server error during login");
        }
      },
      () => {
        console.log("onRegister callback triggered from login setup");
        router.navigate("/register");
      }
    );
  } else if (window.location.pathname === "/tournament") {
    if (tournament.hasPlayers() && isTournamentMode) {
      router.navigate("/game");
    } else {
      getCurrentUser().then(currentUser => {
        if (!currentUser) {
          console.log("No logged-in user found, redirecting to /login");
          router.navigate("/login");
          return;
        }
        setupNameForm(
          async (player1: string, player2: string, player3: string, player4: string): Promise<void> => {
            const playerNames = [player1, player2, player3, player4].filter(name => name);
            if (playerNames.length !== 4) {
              alert("Exactly four players are required for a tournament.");
              return;
            }
            try {
              // Validate that the first player name matches the logged-in user's username
              if (playerNames[0] !== currentUser.username) {
                throw new Error("First player name must match the logged-in user's username");
              }

              // Create tournament on backend with usernames
              const sessionToken = localStorage.getItem("sessionToken");
              const tournamentResponse = await fetch(`${API_BASE_URL}/tournament`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ usernames: playerNames }),
              });
              if (!tournamentResponse.ok) {
                const data = await tournamentResponse.json();
                throw new Error((data.error as string) || "Failed to create tournament");
              }
              const { tournamentId: newTournamentId } = await tournamentResponse.json();
              backendTournamentId = newTournamentId;
              tournamentId = newTournamentId.toString(); // Update local tournamentId
              tournament.addPlayers(playerNames);
              const players: Player[] = playerNames.map(name => ({ id: uuidv4(), name }));
              bracketInstance = new Bracket(players, statsManager, tournamentId);
              isTournamentMode = true;
              router.navigate("/game");
            } catch (error) {
              console.error("Tournament creation error:", error);
              alert("Failed to create tournament: " + (error instanceof Error ? error.message : "Unknown error"));
            }
          },
          currentUser.username // Pass the logged-in user's username to pre-fill the form
        );
      }).catch(error => {
        console.error("Error fetching current user for tournament form:", error);
        router.navigate("/login");
      });
    }
  }
}

// Listens for browser back/forward navigation
window.addEventListener("popstate", () => {
  console.log("popstate event, pathname:", window.location.pathname);
  router.handleRouteChange();
});

async function handleLogin(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("sessionToken", data.sessionToken);
      statsManager.setCurrentUser({
        username: data.name,
        email: data.email,
        password: "", // Don't store password
      });

      // Cache the avatar after successful login
      const avatar = await statsManager.getAvatar(data.name);
      
      // Navigate to welcome page
      router.navigate("/welcome");
    } else {
      const errorDiv = document.getElementById("loginError");
      if (errorDiv) {
        errorDiv.textContent = data.error;
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
      errorDiv.textContent = "An error occurred during login";
    }
  }
}

// After DOMContentLoaded, render the global language switcher
window.addEventListener('DOMContentLoaded', () => {
  const langDiv = document.getElementById('globalLanguageSwitcher');
  if (langDiv) {
    langDiv.innerHTML = renderLanguageSwitcherWithHandler(() => {
      // Reload the current route
      router.navigate(window.location.pathname);
    });
    setupLanguageSwitcherWithHandler(() => {
      router.navigate(window.location.pathname);
    });
  }
});

// Add beforeunload handler to close presenceSocket
window.addEventListener("beforeunload", () => {
  cleanupPresenceWS();
});

// Add visibility change handler to reconnect when tab becomes visible
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    ensurePresenceWS();
  }
});