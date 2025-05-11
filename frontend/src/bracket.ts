const uuidv4 = () => crypto.randomUUID();
import { StatsManager, Player, TournamentMatch } from "./stats.js";

// Defines the structure of a match in the tournament
// interface Match {
//   id: string;
//   player1: Player;
//   player2: Player;
//   winner: string | null;
// }

export class Bracket {
  private rounds: TournamentMatch[][] = [];
  private currentRound: number = 0;
  private statsManager: StatsManager;
  private tournamentId: string;

  constructor(players: Player[], statsManager: StatsManager, tournamentId: string) {
    this.statsManager = statsManager;
    this.tournamentId = tournamentId;
    if (players.length === 4) {
      this.generateInitialRound(players);
    }
  }

  private generateInitialRound(players: Player[]): void {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const round: TournamentMatch[] = [
      {
        id: uuidv4(),
        tournamentId: this.tournamentId,
        roundNumber: 0, // Semifinals
        player1: shuffled[0],
        player2: shuffled[1],
        winner: null,
      },
      {
        id: uuidv4(),
        tournamentId: this.tournamentId,
        roundNumber: 0, // Semifinals
        player1: shuffled[2],
        player2: shuffled[3],
        winner: null,
      },
    ];
    this.rounds.push(round);
    round.forEach(match => {
      this.statsManager.addTournamentMatch(this.tournamentId, match);
    });
  }

  private generateNextRound(): void {
    const previousRound = this.rounds[this.currentRound];
    if (previousRound.every((match) => match.winner)) {
      const winners = previousRound.map((match) => {
        const winnerId = match.winner!;
        return match.player1.id === winnerId ? match.player1 : match.player2;
      });
      if (winners.length === 2 && this.currentRound === 0) {
        const newMatch: TournamentMatch = {
          id: uuidv4(),
          tournamentId: this.tournamentId,
          roundNumber: 1, // Final
          player1: winners[0],
          player2: winners[1],
          winner: null,
        };
        this.rounds.push([newMatch]);
        this.statsManager.addTournamentMatch(this.tournamentId, newMatch);
        this.currentRound++;
      }
    }
  }

  getNextMatch(): TournamentMatch | null {
    const currentRoundMatches = this.rounds[this.currentRound];
    if (currentRoundMatches) {
      const unplayedMatch = currentRoundMatches.find((match) => !match.winner);
      if (unplayedMatch) {
        return unplayedMatch;
      }
    }
    this.generateNextRound();
    return this.rounds[this.currentRound]?.find((match) => !match.winner) || null;
  }

  setMatchWinner(matchId: string, winnerId: string): void {
    const allMatches = this.rounds.flat();
    const match = allMatches.find((m) => m.id === matchId);
    if (match) {
      if (match.player1.id !== winnerId && match.player2.id !== winnerId) {
        throw new Error("Winner ID does not match either player");
      }
      match.winner = winnerId;
      this.statsManager.setTournamentMatchWinner(this.tournamentId, matchId, winnerId);
      this.generateNextRound();
    } else {
      throw new Error("Match not found");
    }
  }

  getWinner(): string | null {
    const finalRound = this.rounds[this.rounds.length - 1];
    if (finalRound && finalRound.length === 1 && finalRound[0].winner) {
      return finalRound[0].winner;
    }
    return null;
  }

  getRounds(): TournamentMatch[][] {
    return this.rounds;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }
}
