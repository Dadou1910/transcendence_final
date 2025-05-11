// Declare global variables for TypeScript
declare global {
  interface Window {
    i18next: any;
    i18nextBrowserLanguageDetector: any;
  }
}

// Inline translation objects instead of importing JSON files
const enTranslation = {
  welcome: {
    title: "Pong Transcendence",
    subtitle: "Challenge Your Friends in a Neon Pong Arena",
    register: "Register",
    login: "Login"
  },
  login: {
    title: "Login to Your Account",
    email: "Email",
    password: "Password",
    submit: "Login",
    noAccount: "Don't have an account?",
    createAccount: "Create one here",
    errors: {
      email: "Please enter a valid email address.",
      password: "Password is required."
    }
  },
  register: {
    title: "Create Your Account",
    username: "Username",
    email: "Email",
    password: "Password",
    avatar: "Profile Picture",
    submit: "Register",
    errors: {
      username: "Username must be 3-20 characters, alphanumeric only.",
      email: "Please enter a valid email address.",
      password: "Password must be at least 8 characters, including a number and a special character.",
      avatar: "File must be an image under 2MB."
    }
  },
  game: {
    player1: "Player 1",
    player2: "Player 2",
    round: "Tournament",
    semifinals: "Semifinals",
    final: "Final",
    start: "Start",
    back: "Back",
    settings: {
      color: "Color:",
      speed: "Target Speed:"
    },
    colors: {
      pastelPink: "Pastel Pink",
      softLavender: "Soft Lavender",
      mintGreen: "Mint Green",
      babyBlue: "Baby Blue",
      cream: "Cream"
    },
    wins: "{{player}} Wins!",
    waitingForOpponent: "Waiting for Opponent...",
    opponentJoining: "Another player will join soon.",
    cancel: "Cancel",
    opponentLeft: "The other player has left the game. You have been redirected to the welcome page.",
    tournament: {
      enterNames: "Enter Player Names",
      playerName: "Player {{number}} Name",
      startTournament: "Start Tournament",
      fourPlayersRequired: "Please enter names for exactly four players.",
      complete: "Tournament Complete!",
      winner: "Winner: {{winnerName}}",
      backToMenu: "Back to Menu"
    },
    multiplayer: {
      title: "Multiplayer",
      subtitle: "Play against other players online",
      gameType: "Game Type:",
      matchmaking: "Matchmaking",
      inviteFriend: "Invite Friend",
      gameTypes: {
        pong: "Pong",
        spaceBattle: "Space Battle"
      }
    }
  },
  postlogin: {
    menu: "Menu",
    searchFriends: "search for friends",
    settings: "Settings",
    leaderboard: "Leaderboard",
    profile: "Profile",
    logout: "Logout",
    welcome: "Welcome, {{username}}!",
    playTournament: "Play Tournament",
    standardPong: "Standard Pong",
    neonCityPong: "Neon City Pong",
    aiPong: "AI Pong",
    spaceBattle: "Space Battle",
    multiplayer: "Multiplayer",
    playMatch: "Play Match",
    aboutPong: "About Pong",
    aboutPongDesc1: "Pong is a classic two-player game where each player controls a paddle to hit a ball back and forth. Use <strong>W</strong> and <strong>S</strong> keys for the left paddle, and <strong>Arrow Up</strong> and <strong>Arrow Down</strong> for the right. Score a point when your opponent misses the ball. The first to 3 points wins the match!",
    aboutPongDesc2: "Originating in 1972, Pong was created by Atari and is considered one of the first video games, sparking the arcade gaming revolution. Its simple yet addictive gameplay has made it a timeless icon in gaming history."
  },
  settings: {
    profile: "Profile Information",
    security: "Security",
    username: "Username",
    email: "Email Address",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    back: "Back",
    save: "Save Changes",
    avatarHint: "Maximum file size: 2MB. Supported formats: JPEG, PNG, GIF."
  },
  profile: {
    back: "Back",
    overallWinRate: "Overall Win Rate",
    tournamentsWon: "Tournaments Won",
    totalGames: "Total Games",
    currentSessionStats: "Current Session Statistics",
    onlinePong: "Online Pong (Multiplayer)",
    gamesPlayed: "Games Played",
    wins: "Wins",
    losses: "Losses",
    friends: "Friends",
    noFriends: "No friends yet.",
    matchHistory: "Match History",
    noMatches: "No matches played yet.",
    victory: "Victory",
    defeat: "Defeat",
    vs: "vs",
    gameTypes: {
      standardPong: "Standard Pong",
      neonCityPong: "Neon City Pong",
      aiPong: "AI Pong",
      spaceBattle: "Space Battle",
      onlinePong: "Online Pong"
    },
    friendActions: {
      addFriend: "Add Friend",
      addingFriend: "Adding...",
      friendAdded: "Added!",
      alreadyFriends: "Already friends",
      cannotAddSelf: "You can't add yourself",
      noUserFound: "No user found"
    }
  },
  common: {
    profile: "Profile",
    scoreFormat: "{{name}}: {{score}}",
    dateFormat: "{{date}}",
    acceptImageTypes: "image/*"
  }
};

const esTranslation = {
  welcome: {
    title: "Pong Trascendencia",
    subtitle: "Desafía a tus amigos en una arena de Pong neón",
    register: "Registrarse",
    login: "Iniciar sesión"
  },
  login: {
    title: "Inicia sesión en tu cuenta",
    email: "Correo electrónico",
    password: "Contraseña",
    submit: "Iniciar sesión",
    noAccount: "¿No tienes una cuenta?",
    createAccount: "Crea una aquí",
    errors: {
      email: "Por favor, introduce un correo electrónico válido.",
      password: "La contraseña es obligatoria."
    }
  },
  register: {
    title: "Crea tu cuenta",
    username: "Nombre de usuario",
    email: "Correo electrónico",
    password: "Contraseña",
    avatar: "Foto de perfil",
    submit: "Registrarse",
    errors: {
      username: "El nombre de usuario debe tener entre 3 y 20 caracteres, solo alfanuméricos.",
      email: "Por favor, introduce un correo electrónico válido.",
      password: "La contraseña debe tener al menos 8 caracteres, incluyendo un número y un carácter especial.",
      avatar: "El archivo debe ser una imagen de menos de 2MB."
    }
  },
  game: {
    player1: "Jugador 1",
    player2: "Jugador 2",
    round: "Torneo",
    semifinals: "Semifinales",
    final: "Final",
    start: "Comenzar",
    back: "Atrás",
    settings: {
      color: "Color:",
      speed: "Velocidad objetivo:"
    },
    colors: {
      pastelPink: "Rosa Pastel",
      softLavender: "Lavanda Suave",
      mintGreen: "Verde Menta",
      babyBlue: "Azul Bebé",
      cream: "Crema"
    },
    wins: "¡{{player}} gana!",
    waitingForOpponent: "Esperando al oponente...",
    opponentJoining: "Otro jugador se unirá pronto.",
    cancel: "Cancelar",
    opponentLeft: "El otro jugador ha abandonado el juego. Has sido redirigido a la página de bienvenida.",
    tournament: {
      enterNames: "Ingresa los nombres de los jugadores",
      playerName: "Nombre del Jugador {{number}}",
      startTournament: "Comenzar Torneo",
      fourPlayersRequired: "Por favor ingresa nombres para exactamente cuatro jugadores.",
      complete: "¡Torneo Completado!",
      winner: "Ganador: {{winnerName}}",
      backToMenu: "Volver al Menú"
    },
    multiplayer: {
      title: "Multijugador",
      subtitle: "Juega contra otros jugadores en línea",
      gameType: "Tipo de Juego:",
      matchmaking: "Buscar Partida",
      inviteFriend: "Invitar Amigo",
      gameTypes: {
        pong: "Pong",
        spaceBattle: "Batalla Espacial"
      }
    }
  },
  postlogin: {
    menu: "Menú",
    searchFriends: "buscar amigos",
    settings: "Configuración",
    leaderboard: "Clasificación",
    profile: "Perfil",
    logout: "Cerrar sesión",
    welcome: "¡Bienvenido, {{username}}!",
    playTournament: "Jugar Torneo",
    standardPong: "Pong Estándar",
    neonCityPong: "Pong Ciudad Neón",
    aiPong: "Pong IA",
    spaceBattle: "Batalla Espacial",
    multiplayer: "Multijugador",
    playMatch: "Jugar Partido",
    aboutPong: "Sobre Pong",
    aboutPongDesc1: "Pong es un juego clásico para dos jugadores donde cada uno controla una paleta para golpear la pelota de un lado a otro. Usa las teclas <strong>W</strong> y <strong>S</strong> para la paleta izquierda, y <strong>Flecha Arriba</strong> y <strong>Flecha Abajo</strong> para la derecha. Ganas un punto cuando tu oponente falla la pelota. ¡El primero en llegar a 3 puntos gana el partido!",
    aboutPongDesc2: "Originado en 1972, Pong fue creado por Atari y se considera uno de los primeros videojuegos, iniciando la revolución de los juegos arcade. Su jugabilidad simple pero adictiva lo ha convertido en un ícono atemporal en la historia de los videojuegos."
  },
  settings: {
    profile: "Información de perfil",
    security: "Seguridad",
    username: "Nombre de usuario",
    email: "Correo electrónico",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar nueva contraseña",
    back: "Atrás",
    save: "Guardar cambios",
    avatarHint: "Tamaño máximo de archivo: 2MB. Formatos soportados: JPEG, PNG, GIF."
  },
  profile: {
    back: "Atrás",
    overallWinRate: "Porcentaje de victorias",
    tournamentsWon: "Torneos ganados",
    totalGames: "Juegos totales",
    currentSessionStats: "Estadísticas de la sesión actual",
    onlinePong: "Pong en línea (Multijugador)",
    gamesPlayed: "Juegos jugados",
    wins: "Victorias",
    losses: "Derrotas",
    friends: "Amigos",
    noFriends: "Aún no tienes amigos.",
    matchHistory: "Historial de partidas",
    noMatches: "Aún no se han jugado partidas.",
    victory: "Victoria",
    defeat: "Derrota",
    vs: "vs",
    gameTypes: {
      standardPong: "Pong Estándar",
      neonCityPong: "Pong Ciudad Neón",
      aiPong: "Pong IA",
      spaceBattle: "Batalla Espacial",
      onlinePong: "Pong en Línea"
    },
    friendActions: {
      addFriend: "Añadir Amigo",
      addingFriend: "Añadiendo...",
      friendAdded: "¡Añadido!",
      alreadyFriends: "Ya son amigos",
      cannotAddSelf: "No puedes añadirte a ti mismo",
      noUserFound: "Usuario no encontrado"
    }
  },
  common: {
    profile: "Perfil",
    scoreFormat: "{{name}}: {{score}}",
    dateFormat: "{{date}}",
    acceptImageTypes: "image/*"
  }
};

const jaTranslation = {
  welcome: {
    title: "ポン・トランセンデンス",
    subtitle: "ネオンアリーナで友達と対戦しよう",
    register: "登録",
    login: "ログイン"
  },
  login: {
    title: "アカウントにログイン",
    email: "メールアドレス",
    password: "パスワード",
    submit: "ログイン",
    noAccount: "アカウントをお持ちでないですか？",
    createAccount: "新規登録はこちら",
    errors: {
      email: "有効なメールアドレスを入力してください。",
      password: "パスワードを入力してください。"
    }
  },
  register: {
    title: "アカウント作成",
    username: "ユーザー名",
    email: "メールアドレス",
    password: "パスワード",
    avatar: "プロフィール画像",
    submit: "登録",
    errors: {
      username: "ユーザー名は3〜20文字の英数字で入力してください。",
      email: "有効なメールアドレスを入力してください。",
      password: "パスワードは8文字以上で、数字と特殊文字を含める必要があります。",
      avatar: "2MB以下の画像ファイルを選択してください。"
    }
  },
  game: {
    player1: "プレイヤー1",
    player2: "プレイヤー2",
    round: "トーナメント",
    semifinals: "準決勝",
    final: "決勝",
    start: "開始",
    back: "戻る",
    settings: {
      color: "色:",
      speed: "目標速度:"
    },
    colors: {
      pastelPink: "パステルピンク",
      softLavender: "ソフトラベンダー",
      mintGreen: "ミントグリーン",
      babyBlue: "ベイビーブルー",
      cream: "クリーム"
    },
    wins: "{{player}}の勝利！",
    waitingForOpponent: "対戦相手を待っています...",
    opponentJoining: "もうすぐ他のプレイヤーが参加します。",
    cancel: "キャンセル",
    opponentLeft: "相手がゲームを退出しました。ウェルカムページに戻ります。",
    tournament: {
      enterNames: "プレイヤー名を入力",
      playerName: "プレイヤー{{number}}の名前",
      startTournament: "トーナメント開始",
      fourPlayersRequired: "4人のプレイヤー名を入力してください。",
      complete: "トーナメント終了！",
      winner: "優勝者: {{winnerName}}",
      backToMenu: "メニューに戻る"
    },
    multiplayer: {
      title: "マルチプレイヤー",
      subtitle: "オンラインで他のプレイヤーと対戦",
      gameType: "ゲームタイプ:",
      matchmaking: "マッチング",
      inviteFriend: "友達を招待",
      gameTypes: {
        pong: "ポン",
        spaceBattle: "スペースバトル"
      }
    }
  },
  postlogin: {
    menu: "メニュー",
    searchFriends: "友達を検索",
    settings: "設定",
    leaderboard: "ランキング",
    profile: "プロフィール",
    logout: "ログアウト",
    welcome: "ようこそ、{{username}}さん！",
    playTournament: "トーナメントをプレイ",
    standardPong: "スタンダードポン",
    neonCityPong: "ネオンシティポン",
    aiPong: "AIポン",
    spaceBattle: "スペースバトル",
    multiplayer: "マルチプレイヤー",
    playMatch: "対戦開始",
    aboutPong: "ポンについて",
    aboutPongDesc1: "ポンは2人のプレイヤーがパドルを操作してボールを打ち合うクラシックゲームです。左パドルは<strong>W</strong>と<strong>S</strong>キー、右パドルは<strong>↑</strong>と<strong>↓</strong>キーで操作します。相手がボールを打ち返せなかったら得点です。3点先取で勝利！",
    aboutPongDesc2: "1972年にアタリによって作られたポンは、最初のビデオゲームの一つとされ、アーケードゲーム革命の火付け役となりました。シンプルながらも中毒性のあるゲームプレイで、ゲーム史に残る不朽の名作となっています。"
  },
  settings: {
    profile: "プロフィール情報",
    security: "セキュリティ",
    username: "ユーザー名",
    email: "メールアドレス",
    currentPassword: "現在のパスワード",
    newPassword: "新しいパスワード",
    confirmPassword: "新しいパスワード（確認）",
    back: "戻る",
    save: "変更を保存",
    avatarHint: "最大ファイルサイズ: 2MB。対応フォーマット: JPEG、PNG、GIF。"
  },
  profile: {
    back: "戻る",
    overallWinRate: "総勝率",
    tournamentsWon: "トーナメント優勝",
    totalGames: "総対戦数",
    currentSessionStats: "現在のセッション統計",
    onlinePong: "オンラインポン（マルチプレイヤー）",
    gamesPlayed: "プレイ回数",
    wins: "勝利",
    losses: "敗北",
    friends: "友達",
    noFriends: "まだ友達がいません。",
    matchHistory: "対戦履歴",
    noMatches: "まだ対戦履歴がありません。",
    victory: "勝利",
    defeat: "敗北",
    vs: "対",
    gameTypes: {
      standardPong: "スタンダードポン",
      neonCityPong: "ネオンシティポン",
      aiPong: "AIポン",
      spaceBattle: "スペースバトル",
      onlinePong: "オンラインポン"
    },
    friendActions: {
      addFriend: "友達を追加",
      addingFriend: "追加中...",
      friendAdded: "追加しました！",
      alreadyFriends: "すでに友達です",
      cannotAddSelf: "自分自身を追加することはできません",
      noUserFound: "ユーザーが見つかりません"
    }
  },
  common: {
    profile: "プロフィール",
    scoreFormat: "{{name}}: {{score}}",
    dateFormat: "{{date}}",
    acceptImageTypes: "image/*"
  }
};

const frTranslation = {
  welcome: {
    title: "Pong Transcendance",
    subtitle: "Défiez vos amis dans une arène Pong néon",
    register: "S'inscrire",
    login: "Connexion"
  },
  login: {
    title: "Connectez-vous à votre compte",
    email: "E-mail",
    password: "Mot de passe",
    submit: "Connexion",
    noAccount: "Vous n'avez pas de compte ?",
    createAccount: "Créez-en un ici",
    errors: {
      email: "Veuillez entrer une adresse e-mail valide.",
      password: "Le mot de passe est requis."
    }
  },
  register: {
    title: "Créez votre compte",
    username: "Nom d'utilisateur",
    email: "E-mail",
    password: "Mot de passe",
    avatar: "Photo de profil",
    submit: "S'inscrire",
    errors: {
      username: "Le nom d'utilisateur doit comporter entre 3 et 20 caractères alphanumériques.",
      email: "Veuillez entrer une adresse e-mail valide.",
      password: "Le mot de passe doit comporter au moins 8 caractères, dont un chiffre et un caractère spécial.",
      avatar: "Le fichier doit être une image de moins de 2 Mo."
    }
  },
  game: {
    player1: "Joueur 1",
    player2: "Joueur 2",
    round: "Tournoi",
    semifinals: "Demi-finales",
    final: "Finale",
    start: "Démarrer",
    back: "Retour",
    settings: {
      color: "Couleur :",
      speed: "Vitesse cible :"
    },
    colors: {
      pastelPink: "Rose Pastel",
      softLavender: "Lavande Douce",
      mintGreen: "Vert Menthe",
      babyBlue: "Bleu Bébé",
      cream: "Crème"
    },
    wins: "{{player}} gagne !",
    waitingForOpponent: "En attente d'un adversaire...",
    opponentJoining: "Un autre joueur va bientôt rejoindre.",
    cancel: "Annuler",
    opponentLeft: "L'autre joueur a quitté la partie. Vous avez été redirigé vers la page d'accueil.",
    tournament: {
      enterNames: "Entrez les noms des joueurs",
      playerName: "Nom du joueur {{number}}",
      startTournament: "Démarrer le tournoi",
      fourPlayersRequired: "Veuillez entrer les noms de quatre joueurs.",
      complete: "Tournoi terminé !",
      winner: "Vainqueur : {{winnerName}}",
      backToMenu: "Retour au menu"
    },
    multiplayer: {
      title: "Multijoueur",
      subtitle: "Jouez contre d'autres joueurs en ligne",
      gameType: "Type de jeu :",
      matchmaking: "Matchmaking",
      inviteFriend: "Inviter un ami",
      gameTypes: {
        pong: "Pong",
        spaceBattle: "Bataille Spatiale"
      }
    }
  },
  postlogin: {
    menu: "Menu",
    searchFriends: "rechercher des amis",
    settings: "Paramètres",
    leaderboard: "Classement",
    profile: "Profil",
    logout: "Déconnexion",
    welcome: "Bienvenue, {{username}} !",
    playTournament: "Jouer un tournoi",
    standardPong: "Pong Standard",
    neonCityPong: "Pong Ville Néon",
    aiPong: "Pong IA",
    spaceBattle: "Bataille Spatiale",
    multiplayer: "Multijoueur",
    playMatch: "Commencer une partie",
    aboutPong: "À propos de Pong",
    aboutPongDesc1: "Pong est un jeu classique à deux joueurs où chacun contrôle une raquette pour renvoyer la balle. Utilisez les touches <strong>W</strong> et <strong>S</strong> pour la raquette de gauche, et <strong>Flèche Haut</strong> et <strong>Flèche Bas</strong> pour la droite. Marquez un point lorsque votre adversaire manque la balle. Le premier à 3 points gagne !",
    aboutPongDesc2: "Créé en 1972 par Atari, Pong est l'un des premiers jeux vidéo et a lancé la révolution des jeux d'arcade. Son gameplay simple mais addictif en a fait une icône intemporelle de l'histoire du jeu vidéo."
  },
  settings: {
    profile: "Informations du profil",
    security: "Sécurité",
    username: "Nom d'utilisateur",
    email: "Adresse e-mail",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    back: "Retour",
    save: "Enregistrer les modifications",
    avatarHint: "Taille maximale : 2 Mo. Formats pris en charge : JPEG, PNG, GIF."
  },
  profile: {
    back: "Retour",
    overallWinRate: "Taux de victoire global",
    tournamentsWon: "Tournois gagnés",
    totalGames: "Parties totales",
    currentSessionStats: "Statistiques de la session en cours",
    onlinePong: "Pong en ligne (Multijoueur)",
    gamesPlayed: "Parties jouées",
    wins: "Victoires",
    losses: "Défaites",
    friends: "Amis",
    noFriends: "Pas encore d'amis.",
    matchHistory: "Historique des parties",
    noMatches: "Aucune partie jouée pour l'instant.",
    victory: "Victoire",
    defeat: "Défaite",
    vs: "vs",
    gameTypes: {
      standardPong: "Pong Standard",
      neonCityPong: "Pong Ville Néon",
      aiPong: "Pong IA",
      spaceBattle: "Bataille Spatiale",
      onlinePong: "Pong en ligne"
    },
    friendActions: {
      addFriend: "Ajouter un ami",
      addingFriend: "Ajout...",
      friendAdded: "Ajouté !",
      alreadyFriends: "Déjà amis",
      cannotAddSelf: "Vous ne pouvez pas vous ajouter vous-même",
      noUserFound: "Aucun utilisateur trouvé"
    }
  },
  common: {
    profile: "Profil",
    scoreFormat: "{{name}} : {{score}}",
    dateFormat: "{{date}}",
    acceptImageTypes: "image/*"
  }
};

// Use global variables from CDN
const i18nextInstance = window.i18next;
const LanguageDetector = window.i18nextBrowserLanguageDetector;

// Initialize i18next
i18nextInstance
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      es: {
        translation: esTranslation
      },
      ja: {
        translation: jaTranslation
      },
      fr: {
        translation: frTranslation
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18nextInstance; 