import { API_BASE_URL } from './index.js';

const uuidv4 = () => crypto.randomUUID();

// Defines structure for a match record
export interface MatchRecord {
  winner: string;
  loser: string;
  timestamp: string;
}

// Defines structure for player statistics
export interface PlayerStats {
  wins: number;
  losses: number;
  tournamentsWon: number;
}

// Defines structure for a user
export interface User {
  username: string;
  email: string;
  password: string;
}

// Defines structure for a player
export interface Player {
  id: string;
  name: string;
}

// Defines structure for a tournament match
export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundNumber: number;
  player1: Player;
  player2: Player;
  winner: string | null;
}

// Defines structure for user settings
export interface UserSettings {
  backgroundColor?: string;
  ballSpeed?: number;
}

// Defines structure for game-specific statistics
export interface GameStats {
  username: string;
  gameType: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

// Defines structure for match details
export interface MatchDetails {
  player1Score: number;
  player2Score: number;
  sessionToken?: string | null;
}

// Manages game statistics, user data, and tournament information
export class StatsManager {
  private matchHistory: MatchRecord[] = [];
  private playerStats: Record<string, PlayerStats> = {};
  private users: User[] = [];
  private sessionToken: string | null = null;
  private tournamentPlayers: Record<string, Player[]> = {};
  private tournamentMatches: Record<string, TournamentMatch[]> = {};
  private userSettings: Record<string, UserSettings> = {};
  private gameStats: Record<string, Record<string, GameStats>> = {};
  private currentUser: User | null = null;
  private avatarCache: { [username: string]: string } = {}; // Memory cache for avatars

  private log(message: string, data?: any): void {
    console.log(`[StatsManager] ${message}`, data ? data : '');
  }

  private error(message: string, error?: any): void {
    console.error(`[StatsManager] ${message}`, error ? error : '');
  }

  constructor() {
    this.sessionToken = localStorage.getItem("sessionToken") || null;
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    try {
      if (this.sessionToken) {
        this.log('Attempting to fetch user profile with session token');
        const response = await fetch(`${API_BASE_URL}/profile/me`, {
          headers: { "Authorization": `Bearer ${this.sessionToken}` }
        });
        if (response.ok) {
          const { user, matches, settings } = await response.json();
          this.log('Fetched user data', user);
          this.users = this.users.filter(u => u.email !== user.email);
          this.users.push({
            username: user.name,
            email: user.email,
            password: "",
          });
          this.matchHistory = matches.map((m: any) => ({
            winner: m.userScore > m.opponentScore ? m.userName : m.opponentName,
            loser: m.userScore > m.opponentScore ? m.opponentName : m.userName,
            timestamp: m.date,
          }));
          this.playerStats[user.name] = {
            wins: user.wins,
            losses: user.losses,
            tournamentsWon: user.tournamentsWon,
          };
          if (settings) {
            this.userSettings[user.name] = {
              backgroundColor: settings.backgroundColor,
              ballSpeed: settings.ballSpeed,
            };
          }
        } else {
          this.error(`Failed to fetch profile with session token. Status: ${response.status}`);
        }
      }
      this.log("Initialized StatsManager with backend data");
    } catch (error) {
      this.error("Error loading initial data from backend", error);
    }
  }

  // --- User Management ---
  addUser(username: string, email: string, password: string): void {
    const user = { username, email: email.toLowerCase(), password };
    this.users.push(user);
    console.log("Added user:", { username, email });
  }

  hasUser(username: string): boolean {
    const exists = this.users.some((user) => user.username.toLowerCase() === username.toLowerCase());
    console.log("Checking if user exists:", { username, exists });
    return exists;
  }

  getUserByEmail(email: string): User | undefined {
    const user = this.users.find((user) => user.email === email.toLowerCase());
    console.log("getUserByEmail:", { email, found: !!user });
    return user;
  }

  // --- Tournament Management ---
  addTournamentPlayers(tournamentId: string, players: Player[]): void {
    this.tournamentPlayers[tournamentId] = players;
    console.log("Added tournament players:", { tournamentId, players });
  }

  getTournamentPlayers(tournamentId: string): Player[] {
    return this.tournamentPlayers[tournamentId] || [];
  }

  clearTournamentPlayers(tournamentId: string): void {
    delete this.tournamentPlayers[tournamentId];
    console.log("Cleared tournament players:", { tournamentId });
  }

  addTournamentMatch(tournamentId: string, match: TournamentMatch): void {
    if (!this.tournamentMatches[tournamentId]) {
      this.tournamentMatches[tournamentId] = [];
    }
    this.tournamentMatches[tournamentId].push(match);
    console.log("Added tournament match:", { tournamentId, match });
  }

  setTournamentMatchWinner(tournamentId: string, matchId: string, winnerId: string): void {
    const matches = this.tournamentMatches[tournamentId];
    if (matches) {
      const match = matches.find((m) => m.id === matchId);
      if (match) {
        if (match.player1.id !== winnerId && match.player2.id !== winnerId) {
          throw new Error("Winner ID does not match either player");
        }
        match.winner = winnerId;
        console.log("Set match winner:", { tournamentId, matchId, winnerId });
      } else {
        throw new Error("Match not found");
      }
    } else {
      throw new Error("Tournament not found");
    }
  }

  getTournamentMatches(tournamentId: string): TournamentMatch[] {
    return this.tournamentMatches[tournamentId] || [];
  }

  // --- Match and Stats Management ---
  async recordMatch(winner: string, loser: string, gameType: string, matchDetails: MatchDetails): Promise<void> {
    const match: MatchRecord = {
      winner,
      loser,
      timestamp: new Date().toISOString(),
    };
    this.matchHistory.push(match);
  
    // Initialize player stats if they don't exist
    this.playerStats[winner] = this.playerStats[winner] || { wins: 0, losses: 0, tournamentsWon: 0 };
    this.playerStats[loser] = this.playerStats[loser] || { wins: 0, losses: 0, tournamentsWon: 0 };
  
    this.playerStats[winner].wins += 1;
    this.playerStats[loser].losses += 1;
  
    this.log("Recorded match locally", { winner, loser, matchDetails });
  
    try {
      // Fetch the current user
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        throw new Error("No session token available. Please log in again.");
      }
  
      const userResponse = await fetch(`${API_BASE_URL}/profile/me`, {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (!userResponse.ok) {
        throw new Error("Failed to fetch current user. Please log in again.");
      }
      const { user } = await userResponse.json();
      const loggedInUsername = user.name;
  
      console.log("Fetched logged-in user:", loggedInUsername);
  
      // Simplify logic: logged-in user is always userName
      let userName: string = loggedInUsername;
      let opponentName: string;
      let userScore: number;
      let opponentScore: number;
  
      // In AIPong, playerLeftName is the user, playerRightName is AI Opponent
      if (gameType === "AI Pong") {
        opponentName = "AI Opponent";
        userScore = matchDetails.player1Score; // scoreLeft (user)
        opponentScore = matchDetails.player2Score; // scoreRight (AI)
      } else {
        // For other game modes (Pong, Neon City Pong, Space Battle)
        // Assume playerLeftName is the user (consistent with initialization)
        if (winner === loggedInUsername) {
          opponentName = loser;
          userScore = matchDetails.player1Score;
          opponentScore = matchDetails.player2Score;
        } else {
          opponentName = winner;
          userScore = matchDetails.player1Score;
          opponentScore = matchDetails.player2Score;
        }
      }
  
      console.log("Sending to /match:", {
        userName,
        opponentName,
        userScore,
        opponentScore,
        gameType,
      });
  
      const matchResponse = await fetch(`${API_BASE_URL}/match`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          userName,
          opponentName,
          userScore,
          opponentScore,
          gameType,
        }),
      });
  
      const responseData = await matchResponse.json();
      console.log("Match response:", { status: matchResponse.status, data: responseData });
  
      if (!matchResponse.ok) {
        throw new Error(responseData.error || "Failed to record match");
      }
  
      console.log("Match recorded in backend:", { userName, opponentName, userScore, opponentScore, gameType });
    } catch (error) {
      console.error("Error recording match in backend:", error);
      alert("Failed to record match: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  recordGameStats(username: string, gameType: string, isWinner: boolean): void {
    if (!this.gameStats[username]) {
      this.gameStats[username] = {};
    }
    if (!this.gameStats[username][gameType]) {
      this.gameStats[username][gameType] = {
        username,
        gameType,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      };
    }

    const stats = this.gameStats[username][gameType];
    stats.gamesPlayed += 1;
    if (isWinner) {
      stats.wins += 1;
    } else {
      stats.losses += 1;
    }

    console.log("Recorded game stats:", { username, gameType, isWinner, stats });
  }

  getGameStats(username: string, gameType: string): GameStats | null {
    return this.gameStats[username]?.[gameType] || null;
  }

  recordTournamentWin(player: string): void {
    if (!this.playerStats[player]) {
      this.playerStats[player] = { wins: 0, losses: 0, tournamentsWon: 0 };
    }
    this.playerStats[player].tournamentsWon += 1;
    console.log("Recorded tournament win:", { player });
  }

  getMatchHistory(): MatchRecord[] {
    return this.matchHistory;
  }

  getPlayerStats(player: string): PlayerStats | null {
    return this.playerStats[player] || null;
  }

  async fetchCurrentUser(): Promise<User | null> {
    const sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/profile/me`, {
        headers: {
          "Authorization": `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();
      this.currentUser = data.user;
      return this.currentUser;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
  }

  // --- User Settings Management ---
  async setUserSettings(username: string, settings: Partial<UserSettings>): Promise<void> {
    if (!this.userSettings[username]) {
      this.userSettings[username] = {};
    }
    this.userSettings[username] = { ...this.userSettings[username], ...settings };
    console.log("Set user settings locally:", { username, settings });

    try {
      const sessionToken = localStorage.getItem("sessionToken");
      // Fetch user ID by username using /profile/:id
      const userResponse = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(username)}`, {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (!userResponse.ok) {
        throw new Error("User not found in backend");
      }
      const { user: backendUser } = await userResponse.json();

      // Send settings to backend
      const settingsResponse = await fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          backgroundColor: settings.backgroundColor,
          ballSpeed: settings.ballSpeed,
        }),
      });

      if (!settingsResponse.ok) {
        const data = await settingsResponse.json();
        throw new Error(data.error || "Failed to save settings");
      }

      console.log("Settings saved to backend:", { username: backendUser.name, settings });
    } catch (error) {
      console.error("Error saving settings to backend:", error);
    }
  }

  getUserSettings(username: string): UserSettings | null {
    return this.userSettings[username] || null;
  }

  // Avatar caching methods
  async getAvatar(username: string): Promise<string> {
    // Check memory cache first
    if (this.avatarCache[username]) {
      return this.avatarCache[username];
    }

    // Check localStorage
    const cachedAvatar = localStorage.getItem(`avatar_${username}`);
    if (cachedAvatar) {
      this.avatarCache[username] = cachedAvatar; // Update memory cache
      return cachedAvatar;
    }

    // Fetch from server if not in cache
    const avatar = await this.fetchAvatar(username);
    this.cacheAvatar(username, avatar);
    return avatar;
  }

  private async fetchAvatar(username: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/avatar/${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch avatar');
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching avatar:', error);
      // Return default avatar
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiIGZpbGw9IiNmNGMyYzIiLz48cGF0aCBkPSJNMzAgMTgwYzAtNDAgNjAtNzAgMTQwLTcwczE0MCAzMCAxNDAgNzBIMzB6IiBmaWxsPSIjZjRjMmMyIi8+PC9zdmc+';
    }
  }

  cacheAvatar(username: string, avatar: string) {
    this.avatarCache[username] = avatar;
    localStorage.setItem(`avatar_${username}`, avatar);
  }

  clearAvatarCache(username: string) {
    delete this.avatarCache[username];
    localStorage.removeItem(`avatar_${username}`);
  }
}