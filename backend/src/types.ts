export interface User {
    id?: number
    name: string
    email: string
    password: string
    wins: number
    losses: number
    tournamentsWon: number
    avatar?: Buffer
}

export interface UserSettings {
    userId: number
    backgroundColor?: string
    ballSpeed?: number
}

export interface Match {
    id?: number;
    userId?: number;
    opponentId?: number;
    userName: string;
    opponentName: string;
    userScore: number;
    opponentScore: number;
    gameType: string;
    date: string;
}

export interface Tournament {
    id?: number
    createdAt: string
}

export interface TournamentPlayer {
    tournamentId: number
    username: string
    position?: number
}

export interface TournamentMatch {
    id?: number
    tournamentId: number
    roundNumber: number
    player1: string
    player2: string
    winner?: string
}