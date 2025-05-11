# 🎮 ft_transcendence

> Projet final du tronc commun 42 — jeu Pong multijoueur en ligne avec interface web temps réel.


## ✅ Fonctionnalités obligatoires

- [x] 🎯 **SPA (Single Page Application)**
- [x] 🕹️ **Pong local**
- [x] 🧩 **Tournoi avec matchmaking**
- [x] 🧑‍🎤 **Alias joueur unique par tournoi**
- [x] 🐳 **Lancement via une seule commande Docker**
- [x] 🔒 **Connexion HTTPS + mots de passe hashés**
- [x] 🛡️ **Protection contre les attaques XSS/SQLi + validation des entrées**
- [x] 🧪 **Aucune erreur JS dans Firefox dernière version**


# Core Technical Requirements Documentation

## Overview
Steps before you can start the docker on you local machine : 
- copy/paste the .env at root of repository
- create a ssl folder and copy/paste the cert.pem and key.pem
- in .env, API_IP should be set to your Wi-Fi ip address :
```
ip addr show (cmd in terminal)

wlp0s20f3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 58:6c:25:7f:73:ad brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.184 (choose the wlp0s20f3)

```
- Now you can start the docker containers

```bash
docker-compose up --build
```


## Core Architecture

### 1. Containerization
```dockerfile
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      args:
        - API_IP=${API_IP}
    ports:
      - "443:443"   # HTTPS
      - "80:80"     # HTTP (for redirect to HTTPS)
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
    ports:
      - "4000:4000"
    networks:
      - app-network
    environment:
      - PORT=${PORT}
      - DB_PATH=${DB_PATH}
      - BCRYPT_SALT_ROUNDS=${BCRYPT_SALT_ROUNDS}
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
```

### 2. Frontend Implementation
```typescript
// src/router.ts
export class Router {
  private routes: Route[] = [];
  private appContainer: HTMLElement;
  private afterRenderCallback: (() => void) | null = null;

  constructor(appContainerId: string, afterRenderCallback?: () => void) {
    this.appContainer = document.getElementById(appContainerId)!;
    this.afterRenderCallback = afterRenderCallback || null;
    window.addEventListener('popstate', () => this.handleRouteChange());
  }

  navigate(path: string) {
    window.history.pushState({}, '', path);
    this.handleRouteChange();
  }
}
```

### 3. Game Implementation
```typescript
// src/game.ts
export class PongGame {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
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
  public keys: Record<"w" | "s" | "ArrowUp" | "ArrowDown", boolean>;
}
```

### 4. Tournament System
```typescript
// src/tournament.ts
export class Tournament {
  private statsManager: StatsManager;
  private tournamentId: string;
  private rounds: TournamentMatch[][] = [];
  private currentRound: number = 0;

  constructor(statsManager: StatsManager, tournamentId: string) {
    this.statsManager = statsManager;
    this.tournamentId = tournamentId;
  }

  addPlayers(players: string[] | string) {
    // Add players to tournament
  }

  getNextMatch(): TournamentMatch | null {
    // Get next match in tournament
  }

  setMatchWinner(matchId: string, winnerId: string): void {
    // Record match winner and advance tournament
  }
}
```

### 5. Security Implementation
```typescript
// src/routes/auth.ts
export async function authRoutes(fastify: FastifyInstance, db: Database) {
  // Password hashing
  fastify.post('/register', async (request, reply) => {
    const { name, email, password } = request.body as User;
    const hashedPassword = await bcrypt.hash(password, fastify.config.BCRYPT_SALT_ROUNDS);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  });
}
```

## Key Features

### 1. Single Page Application
- Client-side routing with history API
- Dynamic content loading
- Browser navigation support

### 2. Real-time Gameplay
- WebSocket-based multiplayer
- Synchronized game state
- Low-latency controls

### 3. Tournament System
- Dynamic matchmaking
- Round management
- Player progression tracking

### 4. Security Measures
- HTTPS/WSS encryption
- Password hashing
- SQL injection prevention
- XSS protection
- Input validation

## Implementation Details

### 1. Browser Compatibility
```typescript
// src/config.ts
const getApiIp = () => {
  // Browser-specific API IP resolution
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};
```

### 2. Error Handling
```typescript
// src/utils.ts
export function showError(message: string): void {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}
```

### 3. Environment Configuration
```typescript
// .env.example
PORT=4000
DB_PATH=./data/database.sqlite
BCRYPT_SALT_ROUNDS=10
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem
HTTPS_ONLY=true
```

## Best Practices

1. **Security**
   - Environment variable management
   - Secure password storage
   - Input validation
   - HTTPS enforcement

2. **Performance**
   - Efficient game loop
   - Optimized rendering
   - Minimal DOM manipulation

3. **Code Organization**
   - Modular architecture
   - Clear separation of concerns
   - Type safety

4. **User Experience**
   - Responsive design
   - Smooth animations
   - Intuitive controls

---
### Total modules : 8

| Module | Description | Classification |
|--------|-------------|----------------|
| Backend Framework | Fastify avec Node.js | Major |
| Remote Players | Real-time multiplayer gameplay with WebSocket communication | Major |
| User Management | Secure registration, authentication, profile management | Major |
| AI Opponent | Intelligent computer-controlled player | Major |
| Space Battle | Real-time multiplayer space shooter with matchmaking | Major |
| Game Customization | Power-ups, speed control, visual customization | Minor |
| Frontend Framework | TypeScript + TailwindCSS implementation | Minor |
| Multi-Device Support | Responsive design for mobile/tablet | Minor |
| Browser Compatibility | Chrome + Firefox support | Minor |
| Multiple Language | FR, EN, ES, JP | Minor |
| Database | SQLite implementation with data management | Minor |
---

### User Management Module

## Overview
The User Management module handles all aspects of user registration, authentication, and profile management in the Pong platform. This document details the implementation of each requirement with relevant code examples and explanations.

## Table of Contents
1. [Secure User Registration](#secure-user-registration)
2. [Secure User Login](#secure-user-login)
3. [Display Name Management](#display-name-management)
4. [User Information Updates](#user-information-updates)
5. [Avatar Management](#avatar-management)
6. [Friends System and Online Status](#friends-system-and-online-status)
7. [User Statistics](#user-statistics)
8. [Match History](#match-history)
9. [Duplicate Management](#duplicate-management)

## Secure User Registration

### Frontend Implementation
Located in `frontend/src/ui.ts`

The registration process begins with the form rendering and setup:

```typescript
export function renderRegistrationForm(onSubmit: (username: string, email: string, password: string, avatar?: File) => void): string {
    return `
        <form id="registrationForm" class="registration-form-container">
            <input type="text" id="username" placeholder="Username" required>
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <input type="file" id="avatar" accept="image/*">
            <button type="submit">Register</button>
        </form>
    `;
}
```

The form setup handles validation and submission:

```typescript
export function setupRegistrationForm(onSubmit: (username: string, email: string, password: string, avatar?: File) => void) {
    const form = document.getElementById('registrationForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('username', usernameInput.value);
        formData.append('email', emailInput.value);
        formData.append('password', passwordInput.value);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }
        const response = await fetch('/api/register', {
            method: 'POST',
            body: formData
        });
    });
}
```

### Backend Implementation
Located in `backend/src/routes/auth.ts`

The registration endpoint handles user creation:

```typescript
fastify.post('/register', async (request, reply) => {
    const { username, email, password } = request.body;
    
    // Check for existing user
    const existingUser = await db.get(
        'SELECT * FROM users WHERE email = ? OR name = ?',
        [email, username]
    );
    
    if (existingUser) {
        return reply.code(400).send({
            error: 'User already exists'
        });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
    );

    return reply.send({
        success: true,
        userId: result.lastID
    });
});
```

## Secure User Login

### Frontend Implementation
Located in `frontend/src/ui.ts`

The login form rendering and handling:

```typescript
export function renderLoginForm(onSubmit: (email: string, password: string) => void): string {
    return `
        <form id="loginForm" class="login-form-container">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
    `;
}
```

### Backend Implementation
Located in `backend/src/routes/auth.ts`

The login endpoint:

```typescript
fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
        return reply.code(401).send({
            error: 'Invalid credentials'
        });
    }

    const token = generateToken(user);
    
    return reply.send({
        success: true,
        token,
        user: {
            id: user.id,
            username: user.name,
            email: user.email
        }
    });
});
```

## Display Name Management

### Frontend Implementation
Located in `frontend/src/ui.ts`

The profile update form:

```typescript
export function renderProfilePage(username: string, email: string, playerStats: PlayerStats): string {
    return `
        <div class="profile-page">
            <div class="profile-header">
                <h1>${username}</h1>
                <p>${email}</p>
            </div>
            <div class="profile-stats">
                <p>Wins: ${playerStats.wins}</p>
                <p>Losses: ${playerStats.losses}</p>
            </div>
        </div>
    `;
}
```

### Backend Implementation
Located in `backend/src/routes/profile.ts`

The profile update endpoint:

```typescript
fastify.put('/profile', async (request, reply) => {
    const { username } = request.body;
    const userId = request.user.id;
    
    const existingUser = await db.get(
        'SELECT * FROM users WHERE name = ? AND id != ?',
        [username, userId]
    );
    
    if (existingUser) {
        return reply.code(400).send({
            error: 'Username already taken'
        });
    }
    
    await db.run(
        'UPDATE users SET name = ? WHERE id = ?',
        [username, userId]
    );
    
    return reply.send({
        success: true
    });
});
```

## Avatar Management

### Frontend Implementation
Located in `frontend/src/ui.ts`

The avatar upload and display functionality:

```typescript
export function renderSettingsPage(username: string, email: string): string {
    return `
        <div class="settings-page">
            <div class="settings-header">
                <div class="avatar-preview-container">
                    <img id="avatarPreview" class="avatar-preview" src="/api/avatar/${username}" alt="Profile avatar">
                    <div class="avatar-upload">
                        <input type="file" id="avatarInput" accept="image/*">
                        <span class="input-hint">Click to change avatar</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
```

The avatar upload handling:

```typescript
export function setupSettingsPage(onSave: (updates: { username?: string; email?: string; avatar?: File }) => void) {
    const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;

    avatarInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarPreview.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    });
}
```

### Backend Implementation
Located in `backend/src/routes/avatar.ts`

The avatar upload endpoint:

```typescript
fastify.post('/avatar', async (request, reply) => {
    const data = await request.file();
    const userId = request.user.id;
    
    if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    
    // Store avatar in database
    await db.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [buffer, userId]
    );
    
    return reply.send({ success: true });
});
```

## Friends System and Online Status

### Frontend Implementation
Located in `frontend/src/ui.ts`

The friends list rendering:

```typescript
export function renderFriendList(friends: { id: number, name: string, online: boolean }[]): string {
    return `
        <div class="friends-list">
            ${friends.map(friend => `
                <div class="friend-item ${friend.online ? 'online' : 'offline'}">
                    <span class="friend-name">${friend.name}</span>
                    <span class="status-indicator"></span>
                </div>
            `).join('')}
        </div>
    `;
}
```

The friend request handling:

```typescript
export function renderAddFriendButton(username: string, isFriend: boolean, isAdding: boolean): string {
    return `
        <button class="add-friend-button" 
                data-username="${username}"
                ${isFriend || isAdding ? 'disabled' : ''}>
            ${isFriend ? 'Friends' : isAdding ? 'Adding...' : 'Add Friend'}
        </button>
    `;
}
```

### Backend Implementation
Located in `backend/src/routes/profile.ts`

The friend management endpoints:

```typescript
// Add friend
fastify.post('/friends/:userId', async (request, reply) => {
    const { userId } = request.params;
    const currentUserId = request.user.id;
    
    await db.run(
        'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
        [currentUserId, userId]
    );
    
    return reply.send({ success: true });
});

// Get friends list with online status
fastify.get('/friends', async (request, reply) => {
    const userId = request.user.id;
    
    const friends = await db.all(`
        SELECT u.id, u.name, 
               CASE WHEN ws.user_id IS NOT NULL THEN 1 ELSE 0 END as online
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        LEFT JOIN websocket_sessions ws ON u.id = ws.user_id
        WHERE f.user_id = ?
    `, [userId]);
    
    return reply.send({ friends });
});
```

## User Statistics

### Frontend Implementation
Located in `frontend/src/stats.ts`

The statistics management class:

```typescript
export class StatsManager {
    private playerStats: Record<string, PlayerStats> = {};
    
    async recordMatch(winner: string, loser: string, gameType: string, matchDetails: MatchDetails): Promise<void> {
        // Update winner stats
        if (!this.playerStats[winner]) {
            this.playerStats[winner] = { wins: 0, losses: 0, tournamentsWon: 0 };
        }
        this.playerStats[winner].wins++;
        
        // Update loser stats
        if (!this.playerStats[loser]) {
            this.playerStats[loser] = { wins: 0, losses: 0, tournamentsWon: 0 };
        }
        this.playerStats[loser].losses++;
        
        // Record match in history
        this.matchHistory.push({
            winner,
            loser,
            timestamp: new Date().toISOString(),
            gameType,
            ...matchDetails
        });
    }
}
```

### Backend Implementation
Located in `backend/src/routes/stats.ts`

The statistics endpoints:

```typescript
fastify.get('/stats/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    const stats = await db.get(`
        SELECT 
            COUNT(CASE WHEN winner_id = ? THEN 1 END) as wins,
            COUNT(CASE WHEN loser_id = ? THEN 1 END) as losses,
            COUNT(CASE WHEN tournament_id IS NOT NULL AND winner_id = ? THEN 1 END) as tournaments_won
        FROM matches
        WHERE winner_id = ? OR loser_id = ?
    `, [userId, userId, userId, userId, userId]);
    
    return reply.send({ stats });
});
```

## Match History

### Frontend Implementation
Located in `frontend/src/ui.ts`

The match history display:

```typescript
export function renderProfilePage(
    username: string,
    email: string,
    playerStats: PlayerStats,
    matchHistory: MatchRecord[]
): string {
    return `
        <div class="profile-page">
            <div class="match-history">
                <h2>Match History</h2>
                ${matchHistory.map(match => `
                    <div class="match-record ${match.winner === username ? 'victory' : 'defeat'}">
                        <span class="match-date">${new Date(match.timestamp).toLocaleDateString()}</span>
                        <span class="match-players">
                            ${match.winner} vs ${match.loser}
                        </span>
                        <span class="match-result">
                            ${match.winner === username ? 'Victory' : 'Defeat'}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
```

### Backend Implementation
Located in `backend/src/routes/stats.ts`

The match history endpoint:

```typescript
fastify.get('/matches/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    const matches = await db.all(`
        SELECT 
            m.*,
            u1.name as winner_name,
            u2.name as loser_name
        FROM matches m
        JOIN users u1 ON m.winner_id = u1.id
        JOIN users u2 ON m.loser_id = u2.id
        WHERE m.winner_id = ? OR m.loser_id = ?
        ORDER BY m.timestamp DESC
        LIMIT 50
    `, [userId, userId]);
    
    return reply.send({ matches });
});
```

## Duplicate Management

### Backend Implementation
Located in `backend/src/routes/auth.ts`

The duplicate checking logic:

```typescript
async function checkDuplicateUser(db: Database, email: string, username: string): Promise<{ exists: boolean; field?: string }> {
    const emailCheck = await db.get(
        'SELECT id FROM users WHERE email = ?',
        [email]
    );
    
    if (emailCheck) {
        return { exists: true, field: 'email' };
    }
    
    const usernameCheck = await db.get(
        'SELECT id FROM users WHERE name = ?',
        [username]
    );
    
    if (usernameCheck) {
        return { exists: true, field: 'username' };
    }
    
    return { exists: false };
}
```

This implementation ensures that:
1. Each email address can only be used once
2. Each username must be unique
3. Users are notified immediately if their chosen email or username is already taken
4. The system maintains data integrity by preventing duplicate entries

The duplicate checking is performed during:
- User registration
- Profile updates
- Username changes


# Remote Players Module Documentation

## Overview
The Remote Players module enables real-time multiplayer gameplay between two players on separate computers. It implements a client-server architecture using WebSocket connections for real-time communication, ensuring smooth gameplay and handling various network conditions.

## Architecture

### 1. WebSocket Communication
- **Connection Setup**: Players connect to a WebSocket server using a unique `matchId`
- **Role Assignment**: Players are assigned as either "host" or "guest"
- **State Synchronization**: Host maintains authoritative game state, guest receives updates

### 2. Key Components

#### Frontend (`frontend/src/multiplayer.ts`)
```typescript
export class MultiplayerPongGame {
  // Core game properties
  public ws: WebSocket | null = null;
  public isHost: boolean = false;
  public opponentName: string = "";
  public localPlayerReady: boolean = false;
  public remotePlayerReady: boolean = false;

  // Game state
  public paddleLeftY: number = 160;
  public paddleRightY: number = 160;
  public ballX: number = 400;
  public ballY: number = 200;
  public scoreLeft: number = 0;
  public scoreRight: number = 0;
}
```

#### Backend (`backend/src/routes/ws.ts`)
```typescript
fastify.get('/ws/match/:matchId', { websocket: true }, async (connection: SocketStream, req) => {
  const { matchId } = req.params as { matchId: string };
  // Connection handling and game state management
});
```

## Implementation Details

### 1. Connection Flow
1. **Initial Connection**
   - Player connects to WebSocket endpoint with `matchId`
   - Server assigns role (host/guest)
   - Players exchange names and ready states

2. **Game Start**
   - Both players must be ready
   - Host initiates game state
   - Guest receives initial state

### 2. Input Handling
```typescript
// Host controls (W/S keys)
if (isHost && ["w", "s"].includes(e.key)) {
  ws.send(JSON.stringify({
    type: "paddle",
    key: e.key,
    pressed: true,
  }));
}

// Guest controls (Arrow keys)
if (!isHost && ["ArrowUp", "ArrowDown"].includes(e.key)) {
  ws.send(JSON.stringify({
    type: "paddle",
    key: e.key,
    pressed: true,
  }));
}
```

### 3. State Synchronization
```typescript
// Host sends state updates
if (this.ws && this.isHost && !this.gameOver) {
  this.ws.send(JSON.stringify({
    type: "state",
    state: {
      paddleLeftY: this.paddleLeftY,
      paddleRightY: this.paddleRightY,
      ballX: this.ballX,
      ballY: this.ballY,
      scoreLeft: this.scoreLeft,
      scoreRight: this.scoreRight,
      gameOver: this.gameOver,
      gameStarted: this.gameStarted
    }
  }));
}
```

### 4. Network Issue Handling
- **Ping/Pong**: Regular connection checks
- **Disconnection**: Automatic cleanup and user notification
- **Reconnection**: Attempts to reconnect on connection loss
- **State Recovery**: Synchronization of game state after reconnection

### 5. Game Flow Control
```typescript
// Ready state management
if (data.type === 'ready') {
  if (isHost && matchClients[matchId].host) {
    matchClients[matchId].host.ready = true;
  } else if (!isHost && matchClients[matchId].guest) {
    matchClients[matchId].guest.ready = true;
  }
  
  // Start game when both players are ready
  if (hostReady && guestReady) {
    // Notify both players to start
  }
}
```

## Features

### 1. Real-time Gameplay
- Smooth paddle movement
- Ball physics synchronization
- Score tracking
- Game state management

### 2. User Experience
- Waiting room with opponent status
- Ready/Start game system
- Score display
- Game settings (speed, background)
- Pause functionality
- Mobile touch controls

### 3. Error Handling
- Connection loss detection
- Automatic cleanup
- User notifications
- State recovery

### 4. Security
- Session token validation
- User authentication
- WebSocket connection security
- Input validation

## Technical Considerations

### 1. Performance
- Normalized coordinates for different screen sizes
- Efficient state updates
- Frame rate management
- Touch input smoothing

### 2. Network Optimization
- Minimal state updates
- Efficient message format
- Connection monitoring
- Automatic reconnection

### 3. Cross-platform Support
- Desktop keyboard controls
- Mobile touch controls
- Responsive design
- Screen size adaptation

## Usage Example

```typescript
// Initialize multiplayer game
const multiplayerGame = new MultiplayerPongGame(
  playerLeftName,
  playerRightName,
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
  userName,
  navigate
);

// Setup WebSocket connection
multiplayerGame.setupWebSocket(ws, isHost, opponentName);
```




# Space Battle - Matchmaking and User History Module

## Overview
The Space Battle module implements a real-time multiplayer space shooter game with comprehensive matchmaking and user history tracking. This document details the implementation of matchmaking, game state synchronization, and match history recording.

## Table of Contents
1. [Matchmaking System](#matchmaking-system)
2. [Game State Management](#game-state-management)
3. [Match History](#match-history)
4. [User Statistics](#user-statistics)
5. [Technical Implementation](#technical-implementation)

## Matchmaking System

### Queue Management
```typescript
interface WaitingPlayer {
  userId: number;
  username: string;
  joinedAt: number;
}

interface Match {
  id: string;
  players: { userId: number; username: string }[];
  status: 'waiting' | 'ready' | 'in_progress' | 'finished';
}
```

The matchmaking system:
- Maintains a queue of waiting players
- Matches players on a first-come-first-served basis
- Generates unique match IDs for each game
- Tracks match status throughout the game lifecycle

### Match Creation
```typescript
fastify.post('/matchmaking/join', async (request, reply) => {
  const { userId, username } = request.body;
  
  // Add player to queue
  matchmakingQueue.push({
    userId,
    username,
    joinedAt: Date.now()
  });
  
  // Match players if possible
  if (matchmakingQueue.length >= 2) {
    const player1 = matchmakingQueue.shift();
    const player2 = matchmakingQueue.shift();
    
    const matchId = generateMatchId();
    matches[matchId] = {
      id: matchId,
      players: [
        { userId: player1.userId, username: player1.username },
        { userId: player2.userId, username: player2.username }
      ],
      status: 'waiting'
    };
  }
});
```

## Game State Management

### WebSocket Communication
```typescript
export class MultiplayerSpaceBattle {
  public ws: WebSocket | null = null;
  public isHost: boolean = false;
  public opponentName: string = "";
  public localPlayerReady: boolean = false;
  public remotePlayerReady: boolean = false;
  
  // Game state
  public leftSpaceship: Spaceship;
  public rightSpaceship: Spaceship;
  public targets: Target[];
  public projectiles: Projectile[];
}
```

### State Synchronization
```typescript
// Host sends state updates
if (this.ws && this.isHost && !this.gameOver) {
  this.ws.send(JSON.stringify({
    type: "state",
    state: {
      leftSpaceship: this.leftSpaceship,
      rightSpaceship: this.rightSpaceship,
      targets: this.targets,
      projectiles: this.projectiles,
      scoreLeft: this.scoreLeft,
      scoreRight: this.scoreRight,
      gameOver: this.gameOver
    }
  }));
}
```

## Match History

### Match Recording
```typescript
private handleGameOver(winnerName: string): void {
  if (this.gameOver) return;
  this.gameOver = true;
  
  // Record match if host
  if (this.isHost && this.ws && this.ws.readyState === WebSocket.OPEN) {
    const loserName = winnerName === this.playerLeftName ? 
      this.playerRightName : this.playerLeftName;
      
    this.statsManager.recordMatch(
      winnerName,
      loserName,
      "Space Battle",
      {
        player1Score: this.scoreLeft,
        player2Score: this.scoreRight,
        sessionToken: localStorage.getItem("sessionToken")
      }
    );
  }
}
```

### Statistics Management
```typescript
export class StatsManager {
  private matchHistory: MatchRecord[] = [];
  private playerStats: Record<string, PlayerStats> = {};
  
  async recordMatch(
    winner: string,
    loser: string,
    gameType: string,
    matchDetails: MatchDetails
  ): Promise<void> {
    // Update winner stats
    if (!this.playerStats[winner]) {
      this.playerStats[winner] = { wins: 0, losses: 0, tournamentsWon: 0 };
    }
    this.playerStats[winner].wins++;
    
    // Update loser stats
    if (!this.playerStats[loser]) {
      this.playerStats[loser] = { wins: 0, losses: 0, tournamentsWon: 0 };
    }
    this.playerStats[loser].losses++;
    
    // Record match
    this.matchHistory.push({
      winner,
      loser,
      timestamp: new Date().toISOString(),
      gameType,
      ...matchDetails
    });
  }
}
```

## Technical Implementation

### Game Components
```typescript
interface Spaceship {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Target {
  x: number;
  y: number;
  radius: number;
  speed: number;
  side: "left" | "right";
}

interface Projectile {
  x: number;
  y: number;
  speed: number;
  side: "left" | "right";
}
```

### Network Optimization
- Minimal state updates (60 FPS target)
- Efficient message format
- Connection monitoring
- Automatic reconnection handling

### Error Handling
- Connection loss detection
- State recovery
- User notifications
- Cleanup on disconnection

### Security
- Session token validation
- User authentication
- WebSocket connection security
- Input validation

## Usage Example

```typescript
// Initialize multiplayer game
const spaceBattle = new MultiplayerSpaceBattle(
  playerLeftName,
  playerRightName,
  "gameCanvas",
  "speedSlider",
  "backgroundColorSelect",
  "scoreLeft",
  "scoreRight",
  "restartButton",
  "settingsButton",
  "settingsMenu",
  "settingsContainer",
  statsManager,
  userEmail,
  navigate,
  matchId,
  isHost
);

// Setup WebSocket connection
spaceBattle.setupWebSocket(ws, isHost, opponentName);
```

## Features

### 1. Real-time Gameplay
- Smooth spaceship movement
- Target spawning and tracking
- Projectile physics
- Score tracking
- Game state management

### 2. User Experience
- Waiting room with opponent status
- Ready/Start game system
- Score display
- Game settings
- Pause functionality
- Mobile touch controls

### 3. Match History
- Detailed match records
- Player statistics
- Game type tracking
- Timestamp recording
- Score history

### 4. Cross-platform Support
- Desktop keyboard controls
- Mobile touch controls
- Responsive design
- Screen size adaptation




## Game Customization Module

The Game Customization module provides a flexible and user-friendly system for customizing gameplay experiences across all games on the platform. This module ensures that players can tailor their gaming experience while maintaining a consistent interface across different game modes.

### Core Features

#### 1. Universal Settings Interface
- **Settings Menu**: Accessible via a gear icon button in all games
- **Persistent Settings**: User preferences are saved and restored across sessions
- **Responsive Design**: Adapts to different screen sizes and devices

#### 2. Customization Options

##### Speed Control
- Adjustable speed slider (1-10 range)
- Affects:
  - Ball speed in Pong games
  - Projectile speed in Space Battle
  - Movement speed in multiplayer modes
- Real-time speed adjustment
- Settings persist across sessions

##### Visual Customization
- Background color selection with predefined themes:
  - Pastel Pink (#d8a8b5)
  - Soft Lavender (#e6e6fa)
  - Mint Green (#98ff98)
  - Baby Blue (#a9c3d9)
  - Cream (#d9c9a8)
- Responsive canvas scaling
- Custom background images for specific game modes

#### 3. Game-Specific Features

##### Pong Games
- **Power-ups System**:
  - Speed Boost: Temporarily increases ball speed
  - Paddle Extend: Temporarily increases paddle size
  - Power-up spawn intervals
  - Collision detection and effect application

##### Space Battle
- **Target Spawning**:
  - Customizable spawn intervals
  - Dynamic difficulty adjustment
  - Score multipliers

##### Neon City Theme
- **Dynamic Background**:
  - Animated building elements
  - Custom background images
  - Neon effects and animations
- **Power-up System**:
  - Visual indicators for active effects
  - Duration timers
  - Effect stacking prevention

### Implementation Details

#### Settings Management
```typescript
interface UserSettings {
  backgroundColor?: string;
  ballSpeed?: number;
}
```

#### Settings Persistence
- Settings are stored in the database
- Automatically loaded when user logs in
- Real-time synchronization across devices

#### UI Components
```html
<div class="settings-menu">
  <div class="flex items-center gap-2">
    <label for="backgroundColorSelect">Color:</label>
    <select id="backgroundColorSelect" class="color-select">
      <!-- Color options -->
    </select>
  </div>
  <div class="flex items-center gap-2">
    <label for="speedSlider">Target Speed:</label>
    <input type="range" id="speedSlider" min="1" max="10" value="5" class="speed-slider">
  </div>
</div>
```

### Technical Implementation

#### Settings Synchronization
- WebSocket-based real-time updates
- Fallback to REST API for offline changes
- Conflict resolution for simultaneous updates

#### Performance Optimization
- Canvas-based rendering
- Efficient collision detection
- Optimized power-up spawning
- Background rendering optimization

#### Mobile Support
- Touch controls for settings adjustment
- Responsive UI elements
- Touch-friendly power-up activation

### Security Considerations

- Input validation for all customization options
- Rate limiting for settings changes
- Sanitization of user-provided values
- Protection against client-side manipulation

### Future Enhancements

1. **Additional Customization Options**
   - Custom power-up combinations
   - Advanced visual effects
   - Sound customization

2. **Enhanced User Experience**
   - Preset configurations
   - Custom theme creation
   - Cross-game settings profiles

3. **Performance Improvements**
   - Advanced rendering techniques
   - Optimized power-up system
   - Enhanced mobile support

### Usage Examples

#### Basic Settings Implementation
```typescript
// Initialize settings
const settings = {
  backgroundColor: "#d8a8b5",
  ballSpeed: 5
};

// Apply settings
game.applySettings(settings);

// Update settings
game.updateSettings({
  ballSpeed: 7
});
```

#### Power-up System
```typescript
// Power-up types
interface PowerUp {
  type: "speedBoost" | "paddleExtend";
  active: boolean;
  x: number;
  y: number;
}

// Power-up effects
const powerUpEffects = {
  speedBoost: {
    duration: 5000,
    multiplier: 1.5
  },
  paddleExtend: {
    duration: 5000,
    sizeMultiplier: 1.5
  }
};
```



# AI Opponent Module

## Overview
The AI Opponent module implements an intelligent computer-controlled player that provides a challenging and engaging gameplay experience. Unlike traditional pathfinding algorithms like A*, this implementation uses a combination of predictive modeling, state-based decision making, and simulated human behavior to create a realistic and competitive AI opponent.

## Core Features

### 1. Predictive Movement System
- **Ball Trajectory Prediction**: Calculates future ball positions based on current velocity and angle
- **Collision Anticipation**: Predicts wall and paddle collisions
- **Response Time Simulation**: Simulates human reaction time (1-second delay)
- **Movement Smoothing**: Natural paddle movement with acceleration/deceleration

### 2. Decision Making Process
- **State Analysis**: Evaluates current game state (ball position, speed, power-ups)
- **Risk Assessment**: Calculates probability of successful returns
- **Strategic Positioning**: Determines optimal paddle position
- **Adaptive Difficulty**: Adjusts AI behavior based on player skill level

### 3. Power-up Integration
- **Power-up Detection**: Identifies and tracks active power-ups
- **Strategic Usage**: Decides when to use power-ups for maximum effect
- **Effect Management**: Handles multiple active power-up effects
- **Counter-strategies**: Develops responses to opponent's power-ups

## Technical Implementation

### 1. Core AI Logic
```typescript
export class AIPong extends NeonCityPong {
  private aiDifficulty: number = 0.6;
  private aiElapsedTime: number = 0;
  private aiTargetY: number;
  private aiKeyState: boolean | null = null;

  protected isSpeedBoosted: boolean = false;
  protected boostedSpeedX: number = 0;
  protected boostedSpeedY: number = 0;
}
```

### 2. Movement Prediction
```typescript
private predictBallPosition(): number {
  // Calculate time until ball reaches paddle
  const timeToPaddle = (this.ballX - 30) / this.ballSpeedX;
  
  // Predict Y position at paddle
  const predictedY = this.ballY + (this.ballSpeedY * timeToPaddle);
  
  // Account for wall bounces
  const normalizedY = this.normalizePrediction(predictedY);
  
  return normalizedY;
}
```

### 3. Decision Making
```typescript
private updateAIPaddle(deltaTime: number, deltaTimeFactor: number): void {
  // Update AI elapsed time
  this.aiElapsedTime += deltaTime;
  
  // Only update AI decision every second
  if (this.aiElapsedTime >= 1.0) {
    this.aiElapsedTime = 0;
    
    // Calculate target position
    const targetY = this.predictBallPosition();
    
    // Add some randomness to make it more human-like
    const randomOffset = (Math.random() - 0.5) * 20;
    this.aiTargetY = targetY + randomOffset;
    
    // Determine movement direction
    const currentY = this.paddleRightY + 40; // Center of paddle
    this.aiKeyState = currentY < this.aiTargetY ? true : false;
  }
  
  // Apply movement
  if (this.aiKeyState !== null) {
    const moveAmount = this.paddleSpeed * deltaTimeFactor;
    if (this.aiKeyState) {
      this.paddleRightY = Math.min(
        this.baseHeight - 80,
        this.paddleRightY + moveAmount
      );
    } else {
      this.paddleRightY = Math.max(0, this.paddleRightY - moveAmount);
    }
  }
}
```

### 4. Power-up Management
```typescript
protected checkPowerUpCollision(): void {
  for (const powerUp of this.powerUps) {
    if (!powerUp.active) continue;
    
    // Check collision with AI paddle
    if (this.checkPaddlePowerUpCollision(powerUp, this.paddleRightY)) {
      this.activatePowerUp(powerUp, 'right');
      powerUp.active = false;
    }
  }
}
```

## Key Differences from A* Algorithm

### 1. Approach
- **A* Algorithm**: Uses pathfinding to find the shortest path between points
- **Our Implementation**: Uses predictive modeling and state-based decision making

### 2. Decision Making
- **A* Algorithm**: Makes decisions based on a grid-based path
- **Our Implementation**: Makes decisions based on:
  - Ball trajectory prediction
  - Game state analysis
  - Simulated human behavior
  - Power-up management

### 3. Movement
- **A* Algorithm**: Moves directly along calculated paths
- **Our Implementation**: 
  - Simulates human-like movement
  - Includes acceleration/deceleration
  - Adds random variations
  - Respects 1-second update constraint

## Performance Optimization

### 1. Calculation Efficiency
- Optimized ball trajectory calculations
- Efficient collision detection
- Smart update frequency management
- Cached predictions

### 2. Memory Management
- Minimal state storage
- Efficient power-up tracking
- Optimized event handling
- Clean resource cleanup

## Security Considerations

- Input validation for AI decisions
- Rate limiting for AI updates
- Protection against AI manipulation
- Secure power-up handling

## Future Enhancements

1. **Advanced AI Features**
   - Machine learning integration
   - Pattern recognition
   - Adaptive difficulty scaling
   - Advanced power-up strategies

2. **Performance Improvements**
   - Optimized prediction algorithms
   - Enhanced collision detection
   - Improved movement smoothing
   - Better power-up management

3. **User Experience**
   - Customizable AI difficulty
   - AI personality traits
   - Learning from player behavior
   - Dynamic challenge adjustment

## Usage Example

```typescript
// Initialize AI opponent
const aiGame = new AIPong(
  playerLeftName,
  "AI Opponent",
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
  userEmail,
  navigate
);

// Start game
aiGame.startGame();
```





# Multi-Device Support Module

## Overview
The Multi-Device Support module ensures seamless functionality across all device types, from desktop computers to mobile phones. This module implements responsive design principles and adaptive controls to provide a consistent and intuitive user experience regardless of the device being used.

## Core Features

### 1. Responsive Design System
- **Fluid Layout**: Adapts to different screen sizes using relative units and flexible grids
- **Dynamic Scaling**: Automatically adjusts game elements based on viewport dimensions
- **Orientation Support**: Handles both portrait and landscape orientations
- **Breakpoint System**: Implements strategic breakpoints for optimal layout at different screen sizes

### 2. Input Method Adaptation
- **Touch Controls**: Implements intuitive touch-based controls for mobile devices
- **Keyboard Support**: Maintains traditional keyboard controls for desktop users
- **Split-Screen Controls**: Divides touch areas for multiplayer games on mobile
- **Input Normalization**: Standardizes input handling across different devices

### 3. Performance Optimization
- **Device-Specific Rendering**: Optimizes rendering based on device capabilities
- **Resource Management**: Adjusts asset loading and processing for different devices
- **Memory Management**: Implements efficient memory usage for mobile devices
- **Battery Optimization**: Reduces power consumption on mobile devices

## Technical Implementation

### 1. Responsive Layout System
```css
/* Base responsive container */
.game-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
}

/* Responsive canvas sizing */
.pong-canvas {
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  display: block;
}

/* Responsive typography */
.neon-title {
  font-size: clamp(32px, 5vw, 48px);
}

/* Responsive controls */
.settings-button {
  width: clamp(32px, 5vw, 48px);
  height: clamp(32px, 5vw, 48px);
}
```

### 2. Touch Control Implementation
```typescript
// Touch controls for mobile/tablet
if ('ontouchstart' in window) {
  let lastTouchY: number | null = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      lastTouchY = e.touches[0].clientY;
    }
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const touchY = e.touches[0].clientY - rect.top;
      
      // Split screen controls for multiplayer
      if (touchX < canvas.width / 2) {
        paddleLeftY = Math.max(0, Math.min(baseHeight - 80, touchY - 40));
      } else {
        paddleRightY = Math.max(0, Math.min(baseHeight - 80, touchY - 40));
      }
    }
  }, { passive: false });
}
```

### 3. Responsive Canvas Management
```typescript
protected resizeCanvas(): void {
  const maxWidth = window.innerWidth * 0.9;
  const maxHeight = window.innerHeight * 0.9;
  const aspectRatio = baseWidth / baseHeight;

  let newWidth = Math.min(maxWidth, baseWidth);
  let newHeight = newWidth / aspectRatio;

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  scale = newWidth / baseWidth;
  canvas.width = newWidth;
  canvas.height = newHeight;
}
```

## Device-Specific Optimizations

### 1. Mobile Devices
- **Touch Interface**: Optimized touch controls with split-screen support
- **Battery Management**: Reduced animation complexity and update frequency
- **Memory Usage**: Optimized asset loading and caching
- **Orientation Handling**: Automatic layout adjustment for orientation changes

### 2. Tablets
- **Enhanced Touch**: Larger touch targets and improved gesture support
- **Split-Screen**: Optimized layout for larger touch screens
- **Performance**: Balanced graphics quality and performance
- **Orientation**: Full support for both portrait and landscape modes

### 3. Desktop
- **Keyboard Controls**: Full keyboard support with customizable key bindings
- **Mouse Support**: Optional mouse control for menu navigation
- **High Performance**: Maximum graphics quality and update frequency
- **Window Management**: Support for window resizing and fullscreen mode

## Media Queries Implementation

```css
/* Mobile devices */
@media (max-width: 767px) {
  .sidebar {
    transform: translateX(-100%);
    width: 100%;
    max-width: 300px;
  }
  
  .main-content {
    margin-top: clamp(60px, 10vh, 80px);
  }
}

/* Small screens */
@media (max-width: 480px) {
  .score-container {
    font-size: clamp(12px, 1.8vw, 16px);
  }
  
  .settings-menu {
    min-width: clamp(150px, 20vw, 200px);
  }
}

/* Landscape orientation */
@media (max-height: 500px) and (orientation: landscape) {
  .game-container {
    flex-direction: row;
    align-items: center;
  }
  
  .score-container {
    flex-direction: row;
    justify-content: space-between;
  }
}
```

## Performance Considerations

### 1. Rendering Optimization
- **Canvas Scaling**: Efficient canvas resizing with aspect ratio preservation
- **Asset Loading**: Progressive loading based on device capabilities
- **Animation Frame**: Optimized frame rate for different devices
- **Memory Management**: Efficient resource allocation and cleanup

### 2. Input Handling
- **Event Debouncing**: Prevents input flooding on touch devices
- **Touch Normalization**: Standardizes touch input across devices
- **Gesture Support**: Implements common touch gestures
- **Input Priority**: Manages multiple input methods simultaneously

### 3. Resource Management
- **Asset Optimization**: Compressed and optimized game assets
- **Memory Cleanup**: Proper disposal of unused resources
- **Cache Management**: Efficient caching strategy for different devices
- **Load Balancing**: Distributes processing load across available resources

## Security Considerations

- **Input Validation**: Secure handling of touch and keyboard input
- **Device Fingerprinting**: Protection against device-specific attacks
- **Resource Access**: Controlled access to device resources
- **Data Protection**: Secure handling of device-specific data

## Future Enhancements

1. **Advanced Touch Features**
   - Multi-touch gesture support
   - Haptic feedback integration
   - Advanced touch controls customization
   - Touch gesture recognition

2. **Performance Improvements**
   - WebGL rendering optimization
   - Advanced asset loading strategies
   - Improved memory management
   - Better battery optimization

3. **User Experience**
   - Device-specific UI customization
   - Adaptive difficulty based on device
   - Enhanced accessibility features
   - Improved cross-device synchronization

## Usage Example

```typescript
// Initialize game with device support
const game = new PongGame(
  playerLeftName,
  playerRightName,
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
  userEmail,
  navigate
);

// Start game with device-specific optimizations
game.startGame();
```




# Browser Compatibility Module

## Overview
The Browser Compatibility module ensures seamless functionality across multiple web browsers, with a focus on extending support beyond the basic Chrome/Firefox requirements. This module implements cross-browser compatibility features and optimizations to provide a consistent user experience regardless of the browser being used.

## Core Features

### 1. Cross-Browser Support
- **Extended Browser Support**: Chrome, Firefox, Safari, and Edge
- **Feature Detection**: Graceful degradation for unsupported features
- **Vendor Prefixes**: Automatic handling of browser-specific CSS properties
- **Polyfills**: Support for modern JavaScript features in older browsers

### 2. Rendering Consistency
- **CSS Normalization**: Consistent styling across browsers
- **Canvas Rendering**: Optimized game rendering for different browsers
- **Font Rendering**: Consistent typography across platforms
- **Animation Performance**: Browser-specific optimizations

### 3. Browser-Specific Optimizations
- **Safari Support**: Touch event handling and WebGL optimizations
- **Edge Support**: Modern JavaScript features and CSS Grid
- **Mobile Browsers**: Touch controls and responsive design
- **Legacy Support**: Fallbacks for older browser versions

## Technical Implementation

### 1. Browser Detection and Feature Support
```typescript
// Browser detection utility
const browserSupport = {
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isEdge: /Edge/.test(navigator.userAgent),
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  
  // Feature detection
  supportsWebGL: (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  })(),
  
  supportsTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
};
```

### 2. CSS Normalization and Prefixes
```css
/* Cross-browser CSS normalization */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Vendor prefix handling */
.game-container {
  display: -webkit-flex;
  display: -moz-flex;
  display: -ms-flex;
  display: flex;
  
  -webkit-transform: translateZ(0);
  -moz-transform: translateZ(0);
  -ms-transform: translateZ(0);
  transform: translateZ(0);
}

/* Safari-specific fixes */
@supports (-webkit-touch-callout: none) {
  .game-container {
    height: -webkit-fill-available;
  }
}
```

### 3. Canvas Rendering Optimization
```typescript
protected optimizeCanvasRendering(): void {
  // Enable hardware acceleration
  this.canvas.style.transform = 'translateZ(0)';
  
  // Browser-specific optimizations
  if (browserSupport.isSafari) {
    // Safari-specific canvas optimizations
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  } else if (browserSupport.isEdge) {
    // Edge-specific optimizations
    this.canvas.style.willChange = 'transform';
  }
  
  // Mobile browser optimizations
  if (browserSupport.isMobile) {
    this.setupMobileOptimizations();
  }
}

private setupMobileOptimizations(): void {
  // Reduce canvas size for better performance
  const scale = window.devicePixelRatio || 1;
  this.canvas.width = this.canvas.width * scale;
  this.canvas.height = this.canvas.height * scale;
  
  // Optimize touch handling
  this.setupTouchControls();
}
```

### 4. Touch Event Handling
```typescript
protected setupTouchControls(): void {
  if (!browserSupport.supportsTouch) return;
  
  // Safari touch event handling
  if (browserSupport.isSafari) {
    this.setupSafariTouchEvents();
  } else {
    this.setupStandardTouchEvents();
  }
}

private setupSafariTouchEvents(): void {
  this.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    this.handleTouchStart(e);
  }, { passive: false });
  
  this.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    this.handleTouchMove(e);
  }, { passive: false });
}
```

## Browser-Specific Features

### 1. Safari Support
- **Touch Events**: Custom handling for Safari's touch implementation
- **WebGL**: Optimized rendering for Safari's WebGL implementation
- **CSS Fixes**: Safari-specific layout adjustments
- **Performance**: Hardware acceleration and rendering optimizations

### 2. Edge Support
- **Modern Features**: Full support for modern JavaScript features
- **CSS Grid**: Optimized layout system
- **WebGL**: Enhanced graphics performance
- **Touch Support**: Improved touch event handling

### 3. Mobile Browser Support
- **Touch Controls**: Optimized for mobile touch interfaces
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Performance**: Reduced resource usage for mobile devices
- **Orientation**: Support for both portrait and landscape modes

## Testing and Validation

### 1. Browser Testing Matrix
```typescript
const browserTestMatrix = {
  chrome: {
    minVersion: 80,
    features: ['webgl', 'touch', 'css-grid']
  },
  firefox: {
    minVersion: 75,
    features: ['webgl', 'touch', 'css-grid']
  },
  safari: {
    minVersion: 13,
    features: ['webgl', 'touch', 'css-grid']
  },
  edge: {
    minVersion: 80,
    features: ['webgl', 'touch', 'css-grid']
  }
};
```

### 2. Feature Detection
```typescript
function detectBrowserFeatures(): void {
  // WebGL support
  if (!browserSupport.supportsWebGL) {
    console.warn('WebGL not supported, falling back to 2D canvas');
    this.use2DRendering();
  }
  
  // Touch support
  if (browserSupport.supportsTouch) {
    this.setupTouchControls();
  } else {
    this.setupMouseControls();
  }
  
  // CSS Grid support
  if (CSS.supports('display', 'grid')) {
    this.useGridLayout();
  } else {
    this.useFlexboxLayout();
  }
}
```

## Performance Optimization

### 1. Rendering Optimization
- **Hardware Acceleration**: Enable GPU acceleration where available
- **Canvas Scaling**: Optimize canvas size for different devices
- **Frame Rate**: Adjust frame rate based on browser capabilities
- **Memory Management**: Efficient resource handling

### 2. Touch Optimization
- **Event Handling**: Optimized touch event processing
- **Gesture Support**: Enhanced touch gesture recognition
- **Performance**: Reduced touch event overhead
- **Responsiveness**: Improved touch response time

### 3. Resource Management
- **Asset Loading**: Optimized asset loading for different browsers
- **Memory Usage**: Efficient memory management
- **Cache Strategy**: Browser-specific caching
- **Cleanup**: Proper resource disposal

## Security Considerations

- **Feature Detection**: Secure feature detection methods
- **Input Validation**: Cross-browser input validation
- **Resource Access**: Controlled access to browser resources
- **Data Protection**: Secure data handling across browsers

## Future Enhancements

1. **Advanced Browser Features**
   - WebGL 2.0 support
   - WebAssembly integration
   - Advanced touch gestures
   - Progressive Web App features

2. **Performance Improvements**
   - Advanced rendering techniques
   - Optimized asset loading
   - Enhanced mobile support
   - Better battery optimization

3. **User Experience**
   - Browser-specific UI optimizations
   - Enhanced accessibility features
   - Improved offline support
   - Better cross-device synchronization

## Usage Example

```typescript
// Initialize game with browser support
const game = new PongGame(
  playerLeftName,
  playerRightName,
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
  userEmail,
  navigate
);

// Setup browser-specific optimizations
game.setupBrowserSupport();

// Start game with cross-browser compatibility
game.startGame();
```





## Multiple Language Support Module

### Overview
The Multiple Language Support module provides comprehensive internationalization capabilities for the Pong Transcendence game, ensuring a seamless experience for users across different languages and regions. The module implements a flexible and maintainable translation system using i18next, supporting four languages: English, Spanish, Japanese, and French.

### Features

#### 1. Language Support
- **Supported Languages:**
  - English (en) - Default language
  - Spanish (es)
  - Japanese (ja)
  - French (fr)

#### 2. Language Detection and Persistence
- Automatic browser language detection
- Language preference persistence using localStorage
- Fallback to English when a translation is missing

#### 3. Language Switcher
- Global language selector accessible from all pages
- Real-time language switching without page reload
- Visual feedback for current language selection

#### 4. Comprehensive Translation Coverage
- All UI elements and game content
- Error messages and notifications
- Game instructions and help text
- User interface elements and navigation

### Technical Implementation

#### 1. Core Files
```
frontend/
├── src/
│   ├── i18n/
│   │   └── config.ts       # i18next configuration and translations
│   └── language.ts         # Language switcher UI and handlers
```

#### 2. Key Components

##### i18next Configuration (`config.ts`)
```typescript
// Translation resources structure
const resources = {
  en: { translation: enTranslation },
  es: { translation: esTranslation },
  ja: { translation: jaTranslation },
  fr: { translation: frTranslation }
};

// i18next initialization
i18nextInstance
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });
```

##### Language Switcher (`language.ts`)
```typescript
export function renderLanguageSwitcherWithHandler(
  onLanguageChange: (lang: string) => void
): string {
  return `
    <div class="language-switcher">
      <select class="language-select" id="languageSelect">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="ja">日本語</option>
        <option value="fr">Français</option>
      </select>
    </div>
  `;
}
```

#### 3. Integration Points

##### HTML Integration
```html
<!-- Global language switcher -->
<div class="w-full flex justify-end p-4 absolute top-0 right-0 z-50" 
     id="globalLanguageSwitcher">
</div>

<!-- i18next dependencies -->
<script src="https://unpkg.com/i18next@23.7.11/dist/umd/i18next.min.js"></script>
<script src="https://unpkg.com/i18next-browser-languagedetector@7.2.0/dist/umd/i18nextBrowserLanguageDetector.min.js"></script>
```

##### Application Initialization
```typescript
// Initialize i18next and start the router
import('./i18n/config.js').then(() => {
  console.log("[i18n] Initialized");
  router.start();
}).catch(error => {
  console.error("[i18n] Failed to initialize:", error);
  router.start();
});
```

### Translation Structure

#### 1. Translation Categories
- **Welcome & Authentication**
  - Welcome page content
  - Login/Register forms
  - Error messages

- **Game Interface**
  - Player controls
  - Game settings
  - Tournament information
  - Multiplayer features

- **User Profile**
  - Profile information
  - Statistics
  - Friend management
  - Match history

- **Settings & Preferences**
  - User settings
  - Game preferences
  - Security options

#### 2. Translation Keys
```typescript
{
  welcome: {
    title: string;
    subtitle: string;
    register: string;
    login: string;
  };
  game: {
    player1: string;
    player2: string;
    settings: {
      color: string;
      speed: string;
    };
    // ... more game-related translations
  };
  // ... more categories
}
```

### Usage Examples

#### 1. Translating Text
```typescript
// Basic translation
i18next.t('welcome.title')

// Translation with variables
i18next.t('game.wins', { player: playerName })

// Nested translations
i18next.t('game.settings.color')
```

#### 2. Language Switching
```typescript
// Change language
await i18next.changeLanguage(newLang);

// Get current language
const currentLang = i18next.language;
```

### Best Practices

1. **Translation Management**
   - Keep translations organized by feature/component
   - Use nested objects for better organization
   - Maintain consistent key naming conventions

2. **Error Handling**
   - Always provide fallback translations
   - Log missing translations in development
   - Handle translation errors gracefully

3. **Performance**
   - Load translations only when needed
   - Cache language preferences
   - Optimize translation file size

4. **Maintenance**
   - Regular updates of translation files
   - Consistent review of new content
   - Version control for translation files

### Future Enhancements

1. **Planned Features**
   - Add more languages
   - Implement RTL support
   - Add translation management system
   - Support for dynamic content translation

2. **Potential Improvements**
   - Automated translation testing
   - Translation memory system
   - Community translation contributions
   - Language-specific formatting rules

### Dependencies

- i18next: ^23.7.11
- i18next-browser-languagedetector: ^7.2.0

### Configuration

The module can be configured through the following environment variables:
- `DEFAULT_LANGUAGE`: Set default language (default: 'en')
- `FALLBACK_LANGUAGE`: Set fallback language (default: 'en')
- `DETECTION_ORDER`: Configure language detection order






### Backend Framework Module

## Overview
The Backend Framework module implements a robust and high-performance server using Fastify with Node.js. This module provides a scalable and maintainable backend architecture that handles all server-side operations, including API endpoints, WebSocket connections, database interactions, and security measures.

## Core Features

### 1. Fastify Server Configuration
- **High Performance**: Fastify's low overhead and high throughput
- **TypeScript Support**: Full type safety and better development experience
- **Plugin System**: Modular architecture with Fastify plugins
- **Security**: Built-in security features and middleware

### 2. API Architecture
- **RESTful Endpoints**: Well-structured API routes
- **WebSocket Support**: Real-time communication for game state
- **Middleware System**: Request processing pipeline
- **Error Handling**: Comprehensive error management

### 3. Database Integration
- **SQLite Integration**: Lightweight and efficient database
- **Connection Pooling**: Optimized database connections
- **Query Building**: Type-safe database operations
- **Migration System**: Database schema management

## Technical Implementation

### 1. Core Files Structure
```
backend/
├── src/
│   ├── server.ts           # Main server configuration
│   ├── config.ts           # Environment and app configuration
│   ├── database.ts         # Database setup and management
│   ├── routes/             # API route handlers
│   │   ├── auth.ts         # Authentication routes
│   │   ├── ws.ts           # WebSocket routes
│   │   ├── match.ts        # Match management routes
│   │   ├── stats.ts        # Statistics routes
│   │   ├── profile.ts      # User profile routes
│   │   ├── settings.ts     # User settings routes
│   │   ├── avatar.ts       # Avatar management routes
│   │   ├── tournament.ts   # Tournament routes
│   │   └── matchmaking.ts  # Matchmaking routes
│   └── types/              # TypeScript type definitions
│       └── fastify-sqlite.d.ts
```

### 2. Server Configuration (`server.ts`)
```typescript
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import fastifyEnv from './config';
import { initializeDatabase } from './database';

async function buildServer() {
  const fastify: FastifyInstance = Fastify({
    logger: true,
    https: {
      key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
    }
  });

  // Register plugins
  await fastify.register(fastifyEnv);
  await fastify.register(cors);
  await fastify.register(multipart);
  await fastify.register(websocket);

  // Initialize database
  const db = await initializeDatabase(fastify);

  // Register routes
  await fastify.register(authRoutes, { db });
  await fastify.register(wsRoutes, { db });
  await fastify.register(matchRoutes, { db });
  await fastify.register(statsRoutes, { db });
  await fastify.register(profileRoutes, { db });
  await fastify.register(settingsRoutes, { db });
  await fastify.register(avatarRoutes, { db });
  await fastify.register(tournamentRoutes, { db });
  await fastify.register(matchmakingRoutes, { db });

  return fastify;
}
```

### 3. Environment Configuration (`config.ts`)
```typescript
export interface Env {
  PORT: number;
  DB_PATH: string;
  BCRYPT_SALT_ROUNDS: number;
  SSL_CERT_PATH: string;
  SSL_KEY_PATH: string;
  HTTPS_ONLY: boolean;
}

const options = {
  schema: {
    type: 'object',
    required: ['PORT', 'DB_PATH', 'BCRYPT_SALT_ROUNDS'],
    properties: {
      PORT: { type: 'number' },
      DB_PATH: { type: 'string' },
      BCRYPT_SALT_ROUNDS: { type: 'number' },
      SSL_CERT_PATH: { type: 'string' },
      SSL_KEY_PATH: { type: 'string' },
      HTTPS_ONLY: { type: 'boolean' }
    }
  },
  dotenv: true,
  data: process.env
};
```

### 4. Database Setup (`database.ts`)
```typescript
import { Database } from 'sqlite3';
import { FastifyInstance } from 'fastify';

export async function initializeDatabase(fastify: FastifyInstance) {
  const db = new Database(fastify.config.DB_PATH);

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      tournamentsWon INTEGER DEFAULT 0,
      avatar BLOB
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      opponentId INTEGER,
      userName TEXT,
      opponentName TEXT,
      userScore INTEGER,
      opponentScore INTEGER,
      gameType TEXT,
      date TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS tournament_players (
      tournamentId INTEGER,
      username TEXT,
      position INTEGER,
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournamentId INTEGER,
      roundNumber INTEGER,
      player1 TEXT,
      player2 TEXT,
      winner TEXT,
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id)
    );
  `);

  return db;
}
```

## Route Implementations

### 1. Authentication Routes (`routes/auth.ts`)
```typescript
export async function authRoutes(fastify: FastifyInstance, db: Database) {
  fastify.post('/register', async (request, reply) => {
    const { username, email, password } = request.body;
    
    // Check for existing user
    const existingUser = await db.get(
      'SELECT * FROM users WHERE email = ? OR name = ?',
      [email, username]
    );
    
    if (existingUser) {
      return reply.code(400).send({
        error: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    return reply.send({
      success: true,
      userId: result.lastID
    });
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return reply.code(401).send({
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user);
    
    return reply.send({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.name,
        email: user.email
      }
    });
  });
}
```

### 2. WebSocket Routes (`routes/ws.ts`)
```typescript
interface MatchClient {
  socket: SocketStream;
  name: string;
  userId: number;
  ready: boolean;
  lastPing: number;
}

interface MatchClients {
  [matchId: string]: {
    host?: MatchClient;
    guest?: MatchClient;
    gameState?: any;
  };
}

export async function wsRoutes(fastify: FastifyInstance, db: Database) {
  fastify.get('/ws/match/:matchId', { websocket: true }, async (connection: SocketStream, req) => {
    const { matchId } = req.params as { matchId: string };
    
    // Handle WebSocket connection
    connection.socket.on('message', async (message) => {
      const data = JSON.parse(message.toString());
      
      // Process different message types
      switch (data.type) {
        case 'ready':
          handleReadyState(matchId, data);
          break;
        case 'paddle':
          handlePaddleMovement(matchId, data);
          break;
        case 'state':
          handleGameState(matchId, data);
          break;
      }
    });
  });
}
```

## Security Features

### 1. HTTPS Configuration
```typescript
const fastify = Fastify({
  https: {
    key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
  }
});
```

### 2. CORS Configuration
```typescript
await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

### 3. Session Management
```typescript
fastify.addHook('preHandler', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return reply.code(401).send({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});
```

## Performance Optimizations

### 1. Database Connection Pooling
```typescript
const db = new Database(fastify.config.DB_PATH, {
  maxConnections: 10,
  idleTimeout: 30000
});
```

### 2. Response Caching
```typescript
fastify.get('/stats/:userId', {
  cache: {
    expiresIn: 60 * 1000 // 1 minute
  }
}, async (request, reply) => {
  // Route handler
});
```

### 3. Request Validation
```typescript
const userSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 }
    }
  }
};

fastify.post('/register', { schema: userSchema }, async (request, reply) => {
  // Route handler
});
```

## Error Handling

### 1. Global Error Handler
```typescript
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      details: error.validation
    });
  }
  
  return reply.code(500).send({
    error: 'Internal Server Error'
  });
});
```

### 2. Custom Error Classes
```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
```

## Testing

### 1. Unit Tests
```typescript
import { test } from 'tap';
import { buildServer } from '../src/server';

test('GET /health', async (t) => {
  const fastify = await buildServer();
  
  const response = await fastify.inject({
    method: 'GET',
    url: '/health'
  });
  
  t.equal(response.statusCode, 200);
  t.same(JSON.parse(response.payload), { status: 'ok' });
});
```

### 2. Integration Tests
```typescript
test('POST /register', async (t) => {
  const fastify = await buildServer();
  
  const response = await fastify.inject({
    method: 'POST',
    url: '/register',
    payload: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }
  });
  
  t.equal(response.statusCode, 200);
  const payload = JSON.parse(response.payload);
  t.ok(payload.userId);
});
```

## Dependencies

```json
{
  "dependencies": {
    "@fastify/cors": "^8.5.0",
    "@fastify/env": "^4.3.0",
    "@fastify/multipart": "^8.0.0",
    "@fastify/websocket": "^8.3.1",
    "bcrypt": "^5.1.1",
    "fastify": "^4.28.1",
    "sqlite3": "^5.1.7",
    "ws": "^8.16.0",
    "redis": "^4.6.7"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^22.14.1",
    "@types/sqlite3": "^3.1.11",
    "@types/ws": "^8.5.10",
    "@types/redis": "^4.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.8.3"
  }
}
```

## Configuration

The module can be configured through environment variables:
- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database path
- `BCRYPT_SALT_ROUNDS`: Password hashing rounds
- `SSL_CERT_PATH`: HTTPS certificate path
- `SSL_KEY_PATH`: HTTPS key path
- `HTTPS_ONLY`: Force HTTPS (default: true)

## Future Enhancements

1. **Advanced Features**
   - GraphQL support
   - Rate limiting
   - Advanced caching
   - WebSocket clustering

2. **Performance Improvements**
   - Database query optimization
   - Response compression
   - Load balancing
   - Connection pooling

3. **Security Enhancements**
   - Advanced authentication
   - Rate limiting
   - Request validation
   - Security headers





# Frontend Framework Module Documentation

## Overview
The frontend of the Transcendence project is built using TypeScript and Tailwind CSS, providing a modern, responsive, and maintainable user interface. The implementation follows a component-based architecture with strict type safety and utility-first CSS styling.

## Architecture

### Core Technologies
- **TypeScript**: Used for type-safe development and better code organization
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **ES Modules**: Modern JavaScript module system for better code organization

### Project Structure
```
frontend/
├── src/
│ ├── components/ # Reusable UI components
│ ├── styles/ # CSS and Tailwind configurations
│ ├── utils/ # Utility functions
│ └── types/ # TypeScript type definitions
├── public/ # Static assets
└── dist/ # Build output
```


## Key Components

### 1. Game Components

#### PongGame Class
```typescript
export class PongGame {
  // Core game properties
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public scoreLeft: number = 0;
  public scoreRight: number = 0;
  
  // Game state management
  public gameStarted: boolean = false;
  public gameOver: boolean = false;
  public isPaused: boolean = false;
  
  // Player controls
  public keys: Record<"w" | "s" | "ArrowUp" | "ArrowDown", boolean>;
  
  // Responsive design
  public baseWidth: number = 800;
  public baseHeight: number = 400;
  public scale: number = 1;
}
```

#### SpaceBattle Class
```typescript
export class SpaceBattle {
  // Game objects
  private leftSpaceship: Spaceship;
  private rightSpaceship: Spaceship;
  private targets: Target[];
  private projectiles: Projectile[];
  
  // Game mechanics
  private targetSpawnTimer: number = 0;
  private readonly TARGET_SPAWN_INTERVAL: number = 100;
  private leftShootTimer: number = 0;
  private rightShootTimer: number = 0;
}
```

### 2. UI Components

#### Settings View
```typescript
export class SettingsView {
  private statsManager: StatsManager;
  private navigate: (path: string) => void;
  
  async render(): Promise<string> {
    // Renders settings page with Tailwind classes
  }
  
  async setup(): Promise<void> {
    // Sets up event listeners and UI interactions
  }
}
```

### 3. Styling Implementation

#### Tailwind CSS Configuration
```css
/* Custom utility classes */
.game-container {
  @apply flex flex-col items-center justify-center;
}

.score-container {
  @apply flex justify-between w-full max-w-2xl mb-4;
}

.settings-menu {
  @apply fixed top-0 right-0 h-full w-64 bg-gray-800 transform translate-x-full transition-transform duration-300;
}
```

#### Responsive Design
```css
@media (max-width: 768px) {
  .game-container {
    @apply w-full h-auto;
  }
  
  .score-container {
    @apply flex-col items-center;
  }
}
```

## TypeScript Implementation

### 1. Type Definitions
```typescript
interface User {
  id?: number;
  name: string;
  email: string;
  password: string;
  wins: number;
  losses: number;
  tournamentsWon: number;
  avatar?: Buffer;
}

interface Match {
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
```

### 2. Game State Management
```typescript
export class StatsManager {
  private matchHistory: MatchRecord[] = [];
  private playerStats: Record<string, PlayerStats> = {};
  private gameStats: Record<string, Record<string, GameStats>> = {};
  
  async recordMatch(winner: string, loser: string, gameType: string, matchDetails: MatchDetails): Promise<void> {
    // Records match results and updates statistics
  }
}
```

## Build System

### 1. Package Configuration
```json
{
  "scripts": {
    "build:css": "postcss src/style.css -o dist/style.css",
    "build:ts": "tsc",
    "build": "npm run build:css && npm run build:ts"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.5",
    "typescript": "^5.3.0",
    "postcss": "^8.4.31"
  }
}
```

### 2. TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```

## Key Features

1. **Type Safety**
   - Strict TypeScript configuration
   - Comprehensive interface definitions
   - Type checking for all game components

2. **Responsive Design**
   - Mobile-first approach with Tailwind CSS
   - Flexible game canvas scaling
   - Adaptive UI components

3. **Component Architecture**
   - Modular game components
   - Reusable UI elements
   - Clean separation of concerns

4. **Performance Optimization**
   - Efficient canvas rendering
   - Optimized game loop
   - Minimal DOM manipulation

## Best Practices

1. **Code Organization**
   - Clear file structure
   - Consistent naming conventions
   - Modular component design

2. **TypeScript Usage**
   - Strict type checking
   - Interface-first development
   - Proper type definitions

3. **Tailwind CSS Implementation**
   - Utility-first approach
   - Custom component classes
   - Responsive design patterns

4. **Game Development**
   - Efficient game loop
   - Proper state management
   - Clean collision detection




# Database Module Documentation

## Overview
The Transcendence project implements SQLite as its primary database solution, ensuring data consistency and compatibility across all components. The database implementation follows a structured approach with proper type safety, migrations, and efficient query handling.

## Architecture

### Core Technologies
- **SQLite3**: Lightweight, serverless database engine
- **TypeScript**: Type-safe database operations
- **Fastify**: Database integration with the web framework

### Project Structure
```
backend/
├── src/
│ ├── database/ # Database core functionality
│ ├── migrations/ # Database schema migrations
│ ├── models/ # Data models and types
│ └── routes/ # Database-related routes
├── data/ # SQLite database files
└── dist/ # Compiled TypeScript
```


## Database Implementation

### 1. Database Initialization
```typescript
// src/database.ts
export async function initializeDatabase(fastify: FastifyInstance) {
  const db = new Database(fastify.config.DB_PATH);
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      tournaments_won INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      opponent_id INTEGER,
      user_name TEXT NOT NULL,
      opponent_name TEXT NOT NULL,
      user_score INTEGER NOT NULL,
      opponent_score INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (opponent_id) REFERENCES users(id)
    );
  `);

  return db;
}
```

### 2. Data Models

#### User Model
```typescript
// src/types.ts
export interface User {
  id?: number;
  name: string;
  email: string;
  password: string;
  wins: number;
  losses: number;
  tournamentsWon: number;
  avatar?: Buffer;
}

export interface UserSettings {
  userId: number;
  backgroundColor?: string;
  ballSpeed?: number;
}
```

#### Match Model
```typescript
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
```

### 3. Database Operations

#### User Operations
```typescript
// src/routes/auth.ts
export async function authRoutes(fastify: FastifyInstance, db: Database) {
  // User registration
  fastify.post('/register', async (request, reply) => {
    const { name, email, password } = request.body as User;
    const hashedPassword = await bcrypt.hash(password, fastify.config.BCRYPT_SALT_ROUNDS);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  });

  // User login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    
    const user = await new Promise<User | undefined>((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row as User);
      });
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = uuidv4();
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
          [user.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)],
          (err) => {
            if (err) reject(err);
            resolve(true);
          }
        );
      });
      return { token };
    }
    throw new Error('Invalid credentials');
  });
}
```

#### Match Operations
```typescript
// src/routes/match.ts
export async function matchRoutes(fastify: FastifyInstance, db: Database) {
  // Record match result
  fastify.post('/matches', async (request, reply) => {
    const match = request.body as Match;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO matches (
          user_id, opponent_id, user_name, opponent_name,
          user_score, opponent_score, game_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          match.userId,
          match.opponentId,
          match.userName,
          match.opponentName,
          match.userScore,
          match.opponentScore,
          match.gameType
        ],
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  });

  // Get user match history
  fastify.get('/matches/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM matches WHERE user_id = ? ORDER BY date DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  });
}
```

### 4. Database Configuration
```typescript
// src/config.ts
export interface Env {
  PORT: number;
  DB_PATH: string;
  BCRYPT_SALT_ROUNDS: number;
  SSL_CERT_PATH: string;
  SSL_KEY_PATH: string;
  HTTPS_ONLY: boolean;
}

const schema = {
  type: 'object',
  required: ['PORT', 'DB_PATH', 'BCRYPT_SALT_ROUNDS'],
  properties: {
    PORT: {
      type: 'number',
      default: 4000
    },
    DB_PATH: {
      type: 'string',
      default: './data/database.sqlite'
    },
    BCRYPT_SALT_ROUNDS: {
      type: 'number',
      default: 10
    }
  }
};
```

## Key Features

1. **Data Integrity**
   - Foreign key constraints
   - Unique constraints on email addresses
   - Proper data validation

2. **Security**
   - Password hashing with bcrypt
   - Session management
   - SQL injection prevention

3. **Performance**
   - Indexed queries
   - Efficient joins
   - Prepared statements

4. **Type Safety**
   - TypeScript interfaces
   - Runtime type checking
   - Database schema validation

## Best Practices

1. **Database Design**
   - Normalized schema
   - Proper indexing
   - Consistent naming conventions

2. **Query Optimization**
   - Prepared statements
   - Efficient joins
   - Proper indexing

3. **Error Handling**
   - Proper error propagation
   - Transaction management
   - Rollback support

4. **Security Measures**
   - Input validation
   - SQL injection prevention
   - Secure password storage


---
















