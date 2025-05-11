import { StatsManager } from "./stats.js";

// Manages tournament-related functionality and player data
export class Tournament {
  // Handles statistics and data persistence
  private statsManager: StatsManager;
  // Unique identifier for the tournament
  private tournamentId: string;

  // Initializes the tournament with a stats manager and ID
  constructor(statsManager: StatsManager, tournamentId: string) {
    this.statsManager = statsManager;
    this.tournamentId = tournamentId;
  }

  // Adds players to the tournament
  addPlayers(players: string[] | string) {
    let playerNames: string[];
    // Handle array or single player input
    if (Array.isArray(players)) {
      playerNames = players.filter(name => name);
    } else {
      playerNames = [players, "Player 2"];
    }
    // Create player objects with temporary IDs
    const playerObjects = playerNames.map(name => ({ id: name + Date.now(), name }));
    this.statsManager.addTournamentPlayers(this.tournamentId, playerObjects);
  }

  // Retrieves the list of player names in the tournament
  getPlayers(): string[] {
    const players = this.statsManager.getTournamentPlayers(this.tournamentId);
    return players.length ? players.map(p => p.name) : ["Player 1", "Player 2"];
  }

  // Checks if the tournament has at least two players
  hasPlayers(): boolean {
    return this.statsManager.getTournamentPlayers(this.tournamentId).length >= 2;
  }

  // Clears all players from the tournament
  clearPlayers(): void {
    this.statsManager.clearTournamentPlayers(this.tournamentId);
  }
}