import { PlayerStats, MatchRecord, GameStats, StatsManager } from './stats.js';
import { API_BASE_URL } from './index.js';
import i18next from './i18n/config.js';
import { renderLanguageSwitcherWithHandler, setupLanguageSwitcherWithHandler } from './language.js';
import { showError } from './utils.js';

// Manages UI rendering and setup for the Pong Transcendence game
// Includes welcome pages, game view, forms, and tournament end screen

// ------------------------------------------
// Section 1: Welcome Page (Pre-Login)
// ------------------------------------------

// Renders the pre-login welcome page with register and login buttons
export function renderWelcomePage(onRegister: () => void, onLogin: () => void): string {
  return `
    <div class="full-screen-container">
      <div class="welcome-container">
        <h1 class="neon-title">
          ${i18next.t('welcome.title')}
        </h1>
        <p class="welcome-subtitle">
          ${i18next.t('welcome.subtitle')}
        </p>
        <div class="flex flex-col gap-4">
          <button id="registerButton" class="welcome-button">
            ${i18next.t('welcome.register')}
          </button>
          <button id="loginButton" class="welcome-button">
            ${i18next.t('welcome.login')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Sets up event listeners for the welcome page buttons
export function setupWelcomePage(onRegister: () => void, onLogin: () => void) {
  setupLanguageSwitcherWithHandler(() => { window.location.reload(); });
  let registerButton = document.getElementById("registerButton") as HTMLButtonElement;
  let loginButton = document.getElementById("loginButton") as HTMLButtonElement;
  // Remove old listeners by replacing with clone
  if (registerButton) {
    const newRegisterButton = registerButton.cloneNode(true) as HTMLButtonElement;
    registerButton.parentNode?.replaceChild(newRegisterButton, registerButton);
    registerButton = newRegisterButton;
    registerButton.addEventListener("click", onRegister);
  }
  if (loginButton) {
    const newLoginButton = loginButton.cloneNode(true) as HTMLButtonElement;
    loginButton.parentNode?.replaceChild(newLoginButton, loginButton);
    loginButton = newLoginButton;
    loginButton.addEventListener("click", onLogin);
  }
}

// ------------------------------------------
// Section 2: Welcome Page (Post-Login)
// ------------------------------------------
// Renders the post-login welcome page with user info and game options
export function renderLoggedInWelcomePage(
  onLogout: () => void,
  username: string,
  email: string,
  onPlayMatch: (mode: string) => void,
  onPlayTournament: () => void,
  onSettings: () => void,
): string {
  return `
    <div class="logged-in-container">
      <button id="menuButton" class="menu-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div id="sidebar" class="sidebar">
        <img
          src="${API_BASE_URL}/avatar/${encodeURIComponent(username)}"
          class="avatar"
          alt="${i18next.t('common.profile')}"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiIGZpbGw9IiNmNGMyYzIiLz48cGF0aCBkPSJNMzAgMTgwYzAtNDAgNjAtNzAgMTQwLTcwczE0MCAzMCAxNDAgNzBIMzB6IiBmaWxsPSIjZjRjMmMyIi8+PC9zdmc+'; this.onerror=null;"
        />
        <h2 class="sidebar-username">${username}</h2>
        <p class="sidebar-email">${email}</p>
        <div class="sidebar-friend-search">
          <input type="text" id="friendSearchInput" class="form-input" placeholder="${i18next.t('postlogin.searchFriends')}" style="font-style: italic;" onfocus="this.style.fontStyle='normal'" onblur="if(!this.value)this.style.fontStyle='italic'" />
        </div>
        <div class="sidebar-links">
          <a id="settingsLink" class="sidebar-link">${i18next.t('postlogin.settings')}</a>
          <a id="profileLink" class="sidebar-link">${i18next.t('postlogin.profile')}</a>
          <a id="logoutLink" class="sidebar-link">${i18next.t('postlogin.logout')}</a>
        </div>
      </div>
      <div class="main-content">
        <h1 class="main-title">
          ${i18next.t('postlogin.welcome', { username })}
        </h1>
        <div class="flex flex-col gap-6">
          <button id="playTournamentButton" class="action-button">
            ${i18next.t('postlogin.playTournament')}
          </button>
          <div class="flex flex-col gap-2">
            <select id="gameModeSelect" class="action-button p-2 rounded-md">
              <option value="standard">${i18next.t('postlogin.standardPong')}</option>
              <option value="neonCity">${i18next.t('postlogin.neonCityPong')}</option>
              <option value="ai">${i18next.t('postlogin.aiPong')}</option>
              <option value="spaceBattle">${i18next.t('postlogin.spaceBattle')}</option>
              <option value="multiplayer">${i18next.t('postlogin.multiplayer')}</option>
            </select>
            <button id="playMatchButton" class="action-button">
              ${i18next.t('postlogin.playMatch')}
            </button>
          </div>
        </div>
        <div class="about-pong">
          <h2 class="about-title">
            ${i18next.t('postlogin.aboutPong')}
          </h2>
          <p class="mb-4">
            ${i18next.t('postlogin.aboutPongDesc1')}
          </p>
          <p>
            ${i18next.t('postlogin.aboutPongDesc2')}
          </p>
        </div>
      </div>
    </div>
  `;
}

// Sets up event listeners for the post-login welcome page
export function setupLoggedInWelcomePage(
  onLogout: () => void,
  username: string,
  onPlayMatch: (mode: string) => void,
  onPlayTournament: () => void,
  onSettings: () => void,
  navigate: (path: string) => void
) {
  setupLanguageSwitcherWithHandler(() => { window.location.reload(); });
  let logoutLink = document.getElementById("logoutLink");
  let settingsLink = document.getElementById("settingsLink");
  let profileLink = document.getElementById("profileLink");
  let playMatchButton = document.getElementById("playMatchButton");
  let playTournamentButton = document.getElementById("playTournamentButton");
  let gameModeSelect = document.getElementById("gameModeSelect");

  // Remove old listeners by replacing with clone
  if (logoutLink) {
    const newLogoutLink = logoutLink.cloneNode(true) as HTMLElement;
    logoutLink.parentNode?.replaceChild(newLogoutLink, logoutLink);
    logoutLink = newLogoutLink;
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      onLogout();
    });
  }
  if (settingsLink) {
    const newSettingsLink = settingsLink.cloneNode(true) as HTMLElement;
    settingsLink.parentNode?.replaceChild(newSettingsLink, settingsLink);
    settingsLink = newSettingsLink;
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      onSettings();
    });
  }
  if (profileLink) {
    const newProfileLink = profileLink.cloneNode(true) as HTMLElement;
    profileLink.parentNode?.replaceChild(newProfileLink, profileLink);
    profileLink = newProfileLink;
    profileLink.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("/profile");
    });
  }
  if (playMatchButton && gameModeSelect) {
    const newPlayMatchButton = playMatchButton.cloneNode(true) as HTMLElement;
    playMatchButton.parentNode?.replaceChild(newPlayMatchButton, playMatchButton);
    playMatchButton = newPlayMatchButton;
    playMatchButton.addEventListener("click", (e) => {
      e.preventDefault();
      const selectedMode = (gameModeSelect as HTMLSelectElement).value;
      if (selectedMode === "multiplayer") {
        navigate("/multiplayer");
        return;
      }
      onPlayMatch(selectedMode);
    });
  }
  if (playTournamentButton) {
    const newPlayTournamentButton = playTournamentButton.cloneNode(true) as HTMLElement;
    playTournamentButton.parentNode?.replaceChild(newPlayTournamentButton, playTournamentButton);
    playTournamentButton = newPlayTournamentButton;
    playTournamentButton.addEventListener("click", (e) => {
      e.preventDefault();
      onPlayTournament();
    });
  }

  // Friend search logic
  const friendSearchInput = document.getElementById("friendSearchInput") as HTMLInputElement;
  let friendSearchDropdown: HTMLDivElement | null = null;
  // Helper to track if dropdown should stay open
  let dropdownShouldStayOpen = false;

  if (friendSearchInput) {
    // Remove any previous dropdown
    const removeDropdown = () => {
      if (friendSearchDropdown && friendSearchDropdown.parentElement) {
        friendSearchDropdown.parentElement.removeChild(friendSearchDropdown);
        friendSearchDropdown = null;
      }
      dropdownShouldStayOpen = false;
    };

    friendSearchInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && friendSearchInput.value.trim()) {
        e.preventDefault();
        removeDropdown();
        const searchName = friendSearchInput.value.trim();
        friendSearchInput.disabled = true;
        try {
          const sessionToken = localStorage.getItem("sessionToken");
          const res = await fetch(`${API_BASE_URL}/users/search?name=${encodeURIComponent(searchName)}`, {
            headers: sessionToken ? { "Authorization": `Bearer ${sessionToken}` } : {}
          });
          const data = await res.json();
          if (data && data.user && data.user.name !== username) {
            // Show dropdown with Add Friend button
            friendSearchDropdown = document.createElement("div");
            friendSearchDropdown.className = "friend-search-dropdown";
            friendSearchDropdown.style.position = "absolute";
            friendSearchDropdown.style.background = "#222";
            friendSearchDropdown.style.color = "#fff";
            friendSearchDropdown.style.border = "1px solid #444";
            friendSearchDropdown.style.zIndex = "1000";
            friendSearchDropdown.style.left = friendSearchInput.offsetLeft + "px";
            friendSearchDropdown.style.top = (friendSearchInput.offsetTop + friendSearchInput.offsetHeight) + "px";
            friendSearchDropdown.style.width = friendSearchInput.offsetWidth + "px";
            friendSearchDropdown.innerHTML = `
              <div style="padding: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>${data.user.name}</span>
                <button id="addFriendBtn" class="form-button" style="margin-left: 8px;">${i18next.t('profile.friendActions.addFriend')}</button>
              </div>
            `;
            friendSearchInput.parentElement!.appendChild(friendSearchDropdown);
            dropdownShouldStayOpen = true;
            const addFriendBtn = friendSearchDropdown.querySelector("#addFriendBtn") as HTMLButtonElement;
            addFriendBtn.addEventListener("click", async () => {
              addFriendBtn.disabled = true;
              addFriendBtn.textContent = i18next.t('profile.friendActions.addingFriend');
              try {
                const addRes = await fetch(`${API_BASE_URL}/friends/add`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionToken}`
                  },
                  body: JSON.stringify({ friendId: data.user.id })
                });
                const addData = await addRes.json();
                if (addRes.ok && addData.status === "Friend added") {
                  addFriendBtn.textContent = i18next.t('profile.friendActions.friendAdded');
                  setTimeout(() => {
                    removeDropdown();
                    friendSearchInput.value = "";
                  }, 1000);
                } else if (addData.status === "Already friends") {
                  addFriendBtn.textContent = i18next.t('profile.friendActions.alreadyFriends');
                  setTimeout(removeDropdown, 2000);
                } else {
                  addFriendBtn.textContent = addData.error ? i18next.t('profile.friendActions.cannotAddSelf') : (addData.status || i18next.t('profile.friendActions.addFriend'));
                  setTimeout(removeDropdown, 2000);
                }
              } catch (err) {
                addFriendBtn.textContent = i18next.t('profile.friendActions.addFriend');
                setTimeout(removeDropdown, 2000);
              }
            });
          } else if (data && data.user && data.user.name === username) {
            // Can't add yourself
            friendSearchDropdown = document.createElement("div");
            friendSearchDropdown.className = "friend-search-dropdown";
            friendSearchDropdown.style.position = "absolute";
            friendSearchDropdown.style.background = "#222";
            friendSearchDropdown.style.color = "#fff";
            friendSearchDropdown.style.border = "1px solid #444";
            friendSearchDropdown.style.zIndex = "1000";
            friendSearchDropdown.style.left = friendSearchInput.offsetLeft + "px";
            friendSearchDropdown.style.top = (friendSearchInput.offsetTop + friendSearchInput.offsetHeight) + "px";
            friendSearchDropdown.style.width = friendSearchInput.offsetWidth + "px";
            friendSearchDropdown.innerHTML = `<div style="padding: 8px;">${i18next.t('profile.friendActions.cannotAddSelf')}</div>`;
            friendSearchInput.parentElement!.appendChild(friendSearchDropdown);
            dropdownShouldStayOpen = false;
            setTimeout(removeDropdown, 2000);
          } else {
            // Not found
            friendSearchDropdown = document.createElement("div");
            friendSearchDropdown.className = "friend-search-dropdown";
            friendSearchDropdown.style.position = "absolute";
            friendSearchDropdown.style.background = "#222";
            friendSearchDropdown.style.color = "#fff";
            friendSearchDropdown.style.border = "1px solid #444";
            friendSearchDropdown.style.zIndex = "1000";
            friendSearchDropdown.style.left = friendSearchInput.offsetLeft + "px";
            friendSearchDropdown.style.top = (friendSearchInput.offsetTop + friendSearchInput.offsetHeight) + "px";
            friendSearchDropdown.style.width = friendSearchInput.offsetWidth + "px";
            friendSearchDropdown.innerHTML = `<div style="padding: 8px;">${i18next.t('profile.friendActions.noUserFound')}</div>`;
            friendSearchInput.parentElement!.appendChild(friendSearchDropdown);
            dropdownShouldStayOpen = false;
            setTimeout(removeDropdown, 2000);
          }
        } catch (err) {
          removeDropdown();
        } finally {
          friendSearchInput.disabled = false;
        }
      }
    });
    // Remove dropdown on blur, but only if it shouldn't stay open
    friendSearchInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (!dropdownShouldStayOpen) removeDropdown();
      }, 200);
    });
    // Remove dropdown if clicking outside
    document.addEventListener("mousedown", (e) => {
      if (friendSearchDropdown && !friendSearchDropdown.contains(e.target as Node) && e.target !== friendSearchInput) {
        removeDropdown();
      }
    });
  }
}

// ------------------------------------------
// Section 3: Name Entry Form (Tournament)
// ------------------------------------------
// Renders the form for entering tournament player names
export function renderNameEntryForm(onSubmit: (player1: string, player2: string, player3: string, player4: string) => void): string {
  return `
    <div class="full-screen-container">
      <form id="nameEntryForm" class="name-entry-form">
        <h2 class="form-title">
          ${i18next.t('game.tournament.enterNames')}
        </h2>
        <input
          id="player1Input"
          type="text"
          placeholder="${i18next.t('game.tournament.playerName', { number: 1 })}"
          class="form-input"
          required
        />
        <input
          id="player2Input"
          type="text"
          placeholder="${i18next.t('game.tournament.playerName', { number: 2 })}"
          class="form-input"
          required
        />
        <input
          id="player3Input"
          type="text"
          placeholder="${i18next.t('game.tournament.playerName', { number: 3 })}"
          class="form-input"
          required
        />
        <input
          id="player4Input"
          type="text"
          placeholder="${i18next.t('game.tournament.playerName', { number: 4 })}"
          class="form-input"
          required
        />
        <button type="submit" class="form-button">
          ${i18next.t('game.tournament.startTournament')}
        </button>
      </form>
    </div>
  `;
}

export function setupNameForm(
  onSubmit: (player1: string, player2: string, player3: string, player4: string) => void,
  loggedInUsername?: string
) {
  const form = document.getElementById("nameEntryForm") as HTMLFormElement;
  const player1Input = document.getElementById("player1Input") as HTMLInputElement;
  const player2Input = document.getElementById("player2Input") as HTMLInputElement;
  const player3Input = document.getElementById("player3Input") as HTMLInputElement;
  const player4Input = document.getElementById("player4Input") as HTMLInputElement;

  // Pre-fill the first player's field with the logged-in user's username and make it read-only
  if (loggedInUsername && player1Input) {
    player1Input.value = loggedInUsername;
    player1Input.readOnly = true;
  }

  // Validate and submit player names
  if (form && player1Input && player2Input && player3Input && player4Input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const player1 = player1Input.value.trim();
      const player2 = player2Input.value.trim();
      const player3 = player3Input.value.trim();
      const player4 = player4Input.value.trim();

      // Ensure exactly four non-empty names
      const enteredNames = [player1, player2, player3, player4].filter(name => name !== '');
      if (enteredNames.length === 4) {
        onSubmit(player1, player2, player3, player4);
      } else {
        alert(i18next.t('game.tournament.fourPlayersRequired'));
      }
    });
  } else {
    console.error("Name entry form elements not found!");
  }
}

// ------------------------------------------
// Section 4: Game Screen
// ------------------------------------------
// Renders the game view with player names and optional round number
export function renderGameView(playerLeftName: string, playerRightName: string, roundNumber?: number): string {
  const leftDisplayName = playerLeftName.trim() || i18next.t('game.player1');
  const rightDisplayName = playerRightName.trim() || i18next.t('game.player2');
  return `
    <div id="gameContainer" class="game-container">
      ${roundNumber !== undefined ? `
        <div class="tournament-round">
          ${i18next.t('game.round')}
          ${roundNumber === 0 ? i18next.t('game.semifinals') : i18next.t('game.final')}
        </div>
      ` : ''}
      <div class="score-container">
        <span>${i18next.t('common.scoreFormat', { name: `<span id="playerLeftNameDisplay">${leftDisplayName}</span>`, score: '<span id="scoreLeft">0</span>' })}</span>
        <span>${i18next.t('common.scoreFormat', { name: `<span id="playerRightNameDisplay">${rightDisplayName}</span>`, score: '<span id="scoreRight">0</span>' })}</span>
      </div>
      <div class="game-area flex gap-5 items-start relative">
        <canvas id="pongCanvas" width="800" height="400" class="pong-canvas"></canvas>
        <div id="settingsContainer" class="relative w-10">
          <button id="settingsButton" class="settings-button"></button>
          <div id="settingsMenu" class="settings-menu">
            <div class="flex items-center gap-2">
              <label for="backgroundColorSelect" class="text-white whitespace-nowrap">${i18next.t('game.settings.color')}</label>
              <select id="backgroundColorSelect" class="color-select">
                <option value="#d8a8b5">${i18next.t('game.colors.pastelPink')}</option>
                <option value="#b8b8d8">${i18next.t('game.colors.softLavender')}</option>
                <option value="#a8c8b5">${i18next.t('game.colors.mintGreen')}</option>
                <option value="#a9c3d9">${i18next.t('game.colors.babyBlue')}</option>
                <option value="#d9c9a8">${i18next.t('game.colors.cream')}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label for="speedSlider" class="text-white">${i18next.t('game.settings.speed')}</label>
              <input type="range" id="speedSlider" min="1" max="10" value="5" class="speed-slider">
            </div>
          </div>
        </div>
        <div id="buttonContainer" class="button-container">
          <button id="restartButton" class="game-control-button">${i18next.t('game.start')}</button>
          <button id="backButton" class="game-control-button">${i18next.t('game.back')}</button>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------
// Section 5: Registration Form
// ------------------------------------------
// Renders the registration form with enhanced password validation warning
export function renderRegistrationForm(onSubmit: (username: string, email: string, password: string, avatar?: File) => void): string {
  return `
    <div class="full-screen-container">
      <div id="registrationFormContainer" class="registration-form-container">
        <h2 class="form-title-small">
          ${i18next.t('register.title')}
        </h2>
        <form id="registrationForm" class="flex flex-col gap-4">
          <div>
            <label for="username" class="block text-white text-lg">${i18next.t('register.username')}:</label>
            <input type="text" id="username" class="form-input" required>
            <p id="usernameError" class="error-message">${i18next.t('register.errors.username')}</p>
          </div>
          <div>
            <label for="email" class="block text-white text-lg">${i18next.t('register.email')}:</label>
            <input type="email" id="email" class="form-input" required>
            <p id="emailError" class="error-message">${i18next.t('register.errors.email')}</p>
          </div>
          <div>
            <label for="password" class="block text-white text-lg">${i18next.t('register.password')}:</label>
            <input type="password" id="password" class="form-input" required>
            <p id="passwordError" class="error-message">${i18next.t('register.errors.password')}</p>
          </div>
          <div>
            <label for="avatar" class="block text-white text-lg">${i18next.t('register.avatar')}:</label>
            <input type="file" id="avatar" class="form-input" accept="${i18next.t('common.acceptImageTypes')}">
            <p id="avatarError" class="error-message">${i18next.t('register.errors.avatar')}</p>
          </div>
          <button type="submit" class="form-button">${i18next.t('register.submit')}</button>
        </form>
      </div>
    </div>
  `;
}

// Sets up the registration form with validation
export function setupRegistrationForm(onSubmit: (username: string, email: string, password: string, avatar?: File) => void) {
  // Setup language switcher
  setupLanguageSwitcherWithHandler(() => {
    const container = document.getElementById('registrationFormContainer');
    if (container) {
      container.parentElement!.innerHTML = renderRegistrationForm(onSubmit);
      setupRegistrationForm(onSubmit);
    }
  });

  // Get form elements
  const form = document.getElementById("registrationForm") as HTMLFormElement;
  if (!form) {
    console.error("Registration form not found!");
    return;
  }

  const usernameInput = document.getElementById("username") as HTMLInputElement;
  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const avatarInput = document.getElementById("avatar") as HTMLInputElement;
  const usernameError = document.getElementById("usernameError") as HTMLParagraphElement;
  const emailError = document.getElementById("emailError") as HTMLParagraphElement;
  const passwordError = document.getElementById("passwordError") as HTMLParagraphElement;
  const avatarError = document.getElementById("avatarError") as HTMLParagraphElement;

  // Handle form submission with validation
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    console.log("Registration form submitted");
    let isValid = true;

    // Validate username: 3-20 characters, alphanumeric
    const username = usernameInput.value.trim();
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
    if (!usernameRegex.test(username)) {
      usernameError.classList.add("visible");
      isValid = false;
    } else {
      usernameError.classList.remove("visible");
    }

    // Validate email
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailError.classList.add("visible");
      isValid = false;
    } else {
      emailError.classList.remove("visible");
    }

    // Validate password: 8+ characters, 1 number, 1 special character
    const password = passwordInput.value;
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
    if (!passwordRegex.test(password)) {
      passwordError.classList.add("visible");
      isValid = false;
    } else {
      passwordError.classList.remove("visible");
    }

    // Validate avatar if one was selected
    let avatar: File | undefined;
    if (avatarInput.files && avatarInput.files.length > 0) {
      avatar = avatarInput.files[0];
      if (!avatar.type.startsWith('image/')) {
        avatarError.textContent = i18next.t('register.errors.avatarType');
        avatarError.classList.add("visible");
        isValid = false;
      } else if (avatar.size > 2 * 1024 * 1024) { // 2MB
        avatarError.textContent = i18next.t('register.errors.avatarSize');
        avatarError.classList.add("visible");
        isValid = false;
      } else {
        avatarError.classList.remove("visible");
      }
    }

    // Submit if valid
    if (isValid) {
      console.log("Registration validation passed, calling onSubmit");
      try {
        onSubmit(username, email, password, avatar);
      } catch (error) {
        console.error("Error in registration onSubmit:", error);
      }
    } else {
      console.log("Registration validation failed");
    }
  });
}

// ------------------------------------------
// Section 6: Login Form
// ------------------------------------------
// Renders the login form
export function renderLoginForm(onSubmit: (email: string, password: string) => void, onRegister: () => void): string {
  return `
    <div class="full-screen-container">
      <div id="loginFormContainer" class="login-form-container">
        <h2 class="form-title-small">
          ${i18next.t('login.title')}
        </h2>
        <form id="loginForm" class="flex flex-col gap-4" autocomplete="off">
          <div>
            <label for="email" class="block text-white text-lg">${i18next.t('login.email')}:</label>
            <input type="email" id="email" class="form-input" required autocomplete="off">
            <p id="emailError" class="error-message">${i18next.t('login.errors.email')}</p>
          </div>
          <div>
            <label for="password" class="block text-white text-lg">${i18next.t('login.password')}:</label>
            <input type="password" id="password" class="form-input" required autocomplete="off">
            <p id="passwordError" class="error-message">${i18next.t('login.errors.password')}</p>
          </div>
          <button type="submit" class="form-button">${i18next.t('login.submit')}</button>
        </form>
        <p class="text-white mt-4">
          ${i18next.t('login.noAccount')} 
          <a id="registerLink" class="form-link" href="/register">${i18next.t('login.createAccount')}</a>.
        </p>
      </div>
    </div>
  `;
}

// Sets up the login form with validation and register link
export function setupLoginForm(onSubmit: (email: string, password: string) => void, onRegister: () => void) {
  setupLanguageSwitcherWithHandler(() => { window.location.reload(); });
  const form = document.getElementById("loginForm") as HTMLFormElement;
  let registerLink = document.getElementById("registerLink") as HTMLAnchorElement;

  if (!form) {
    console.error("Login form not found!");
    return;
  }

  // Function to attach register link listener
  function attachRegisterLinkListener(link: HTMLAnchorElement, onRegisterCallback: () => void) {
    console.log("Attaching listener to register link");
    link.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Register link clicked, calling onRegister");
      try {
        onRegisterCallback();
      } catch (error) {
        console.error("Error in onRegister:", error);
      }
    });
  }

  // Handle register link with delay if not found
  if (!registerLink) {
    console.error("Register link not found! Attempting to find after delay...");
    setTimeout(() => {
      registerLink = document.getElementById("registerLink") as HTMLAnchorElement;
      if (!registerLink) {
        console.error("Register link still not found after delay!");
        return;
      }
      attachRegisterLinkListener(registerLink, onRegister);
    }, 100);
  } else {
    attachRegisterLinkListener(registerLink, onRegister);
  }

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const emailError = document.getElementById("emailError") as HTMLParagraphElement;
  const passwordError = document.getElementById("passwordError") as HTMLParagraphElement;

  // Handle form submission with validation
  form.addEventListener("submit", (e) => {
    console.log("Login form submit event triggered");
    e.preventDefault();

    let isValid = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Email validation failed:", email);
      emailError.classList.remove("hidden");
      isValid = false;
    } else {
      emailError.classList.add("hidden");
    }

    // Validate password: non-empty
    if (!password) {
      console.log("Password validation failed: empty");
      passwordError.classList.remove("hidden");
      isValid = false;
    } else {
      passwordError.classList.add("hidden");
    }

    // Submit if valid
    if (isValid) {
      console.log("Form validation passed, calling onSubmit with:", { email, password });
      try {
        onSubmit(email, password);
      } catch (error) {
        console.error("Error during login onSubmit:", error);
      }
    } else {
      console.log("Form validation failed");
    }
  });
}

// ------------------------------------------
// Section 7: Tournament End Screen
// ------------------------------------------
// Renders the tournament end screen with the winner's name
export function renderTournamentEnd(winnerName: string): string {
  return `
    <div class="tournament-end-container">
      <h1 class="tournament-winner">${i18next.t('game.tournament.complete')}</h1>
      <h2 class="tournament-winner">${i18next.t('game.tournament.winner', { winnerName })}</h2>
      <button id="backToMenuButton" class="tournament-end-button">${i18next.t('game.tournament.backToMenu')}</button>
    </div>
  `;
}

// Sets up event listeners for the tournament end screen buttons
export function setupTournamentEnd(onStartAgain: () => void, onBack: () => void) {
  const startAgainButton = document.getElementById("startAgainButton") as HTMLButtonElement;
  const backButton = document.getElementById("backButton") as HTMLButtonElement;

  // Attach start again button listener
  if (startAgainButton) {
    startAgainButton.addEventListener("click", (e) => {
      e.preventDefault();
      onStartAgain();
    });
  } else {
    console.error("Start Again button not found!");
  }

  // Attach back button listener
  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      onBack();
    });
  } else {
    console.error("Back button not found!");
  }
}

export function renderSettingsPage(
  username: string,
  email: string
): string {
  return `
    <div class="settings-page">
      <div class="settings-header">
        <img
          src="${API_BASE_URL}/avatar/${encodeURIComponent(username)}"
          class="profile-avatar"
          alt="${i18next.t('common.profile')}"
          onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiIGZpbGw9IiNmNGMyYzIiLz48cGF0aCBkPSJNMzAgMTgwYzAtNDAgNjAtNzAgMTQwLTcwczE0MCAzMCAxNDAgNzBIMzB6IiBmaWxsPSIjZjRjMmMyIi8+PC9zdmc+'; this.onerror=null;"
        />
        <div class="avatar-upload">
          <input type="file" id="avatar" accept="${i18next.t('common.acceptImageTypes')}" />
          <p class="input-hint">${i18next.t('settings.avatarHint')}</p>
        </div>
      </div>
      
      <div class="settings-content">
        <div class="settings-section">
          <h2>${i18next.t('settings.profile')}</h2>
          <div class="settings-option">
            <label for="username">${i18next.t('settings.username')}</label>
            <input type="text" id="username" class="text-input" value="${escapeHtml(username || '')}" />
          </div>
          <div class="settings-option">
            <label for="email">${i18next.t('settings.email')}</label>
            <input type="email" id="email" class="text-input" value="${escapeHtml(email || '')}" />
          </div>
        </div>

        <div class="settings-section">
          <h2>${i18next.t('settings.security')}</h2>
          <div class="settings-option">
            <label for="currentPassword">${i18next.t('settings.currentPassword')}</label>
            <input type="password" id="currentPassword" class="text-input" />
          </div>
          <div class="settings-option">
            <label for="newPassword">${i18next.t('settings.newPassword')}</label>
            <input type="password" id="newPassword" class="text-input" />
          </div>
          <div class="settings-option">
            <label for="confirmPassword">${i18next.t('settings.confirmPassword')}</label>
            <input type="password" id="confirmPassword" class="text-input" />
          </div>
        </div>

        <div id="settingsError" class="settings-error"></div>

        <div class="settings-actions">
          <button id="backButton" class="secondary-button">${i18next.t('settings.back')}</button>
          <button id="saveButton" class="primary-button">${i18next.t('settings.save')}</button>
        </div>
      </div>
    </div>
  `;
}

export function setupSettingsPage(
  onSave: (updates: { username?: string; email?: string; currentPassword?: string; newPassword?: string }) => void,
  onBack: () => void,
  statsManager: StatsManager
): void {
  const usernameInput = document.getElementById("username") as HTMLInputElement;
  const emailInput = document.getElementById("email") as HTMLInputElement;
  const currentPasswordInput = document.getElementById("currentPassword") as HTMLInputElement;
  const newPasswordInput = document.getElementById("newPassword") as HTMLInputElement;
  const confirmPasswordInput = document.getElementById("confirmPassword") as HTMLInputElement;
  const saveButton = document.getElementById("saveButton");
  const backButton = document.getElementById("backButton");
  const errorDiv = document.getElementById("settingsError");

  const currentUser = statsManager.getCurrentUser();
  if (!currentUser) return;

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      // Clear previous error
      if (errorDiv) errorDiv.textContent = "";

      const updates: { username?: string; email?: string; currentPassword?: string; newPassword?: string } = {};
      let hasChanges = false;

      // Check for avatar changes
      const avatarInput = document.getElementById('avatar') as HTMLInputElement;
      if (avatarInput && avatarInput.files && avatarInput.files.length > 0) {
        hasChanges = true;
      }

      // Collect profile changes
      if (usernameInput && usernameInput.value.trim() !== usernameInput.defaultValue) {
        updates.username = usernameInput.value.trim();
        hasChanges = true;
      }

      if (emailInput && emailInput.value.trim() !== emailInput.defaultValue) {
        updates.email = emailInput.value.trim();
        hasChanges = true;
      }

      // Only validate password if both current and new password fields are intentionally filled
      if (currentPasswordInput?.value && newPasswordInput?.value) {
        if (newPasswordInput.value.length < 8) {
          if (errorDiv) errorDiv.textContent = "New password must be at least 8 characters long";
          return;
        }

        if (newPasswordInput.value !== confirmPasswordInput?.value) {
          if (errorDiv) errorDiv.textContent = "New passwords do not match";
          return;
        }

        updates.currentPassword = currentPasswordInput.value;
        updates.newPassword = newPasswordInput.value;
        hasChanges = true;
      }

      if (!hasChanges) {
        if (errorDiv) errorDiv.textContent = "No changes made";
        return;
      }

      onSave(updates);
    });
  }

  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      onBack();
    });
  }
}

// ------------------------------------------
// Section 8: Profile Dashboard
// ------------------------------------------
export function renderProfilePage(
  username: string,
  email: string,
  playerStats: PlayerStats,
  matchHistory: MatchRecord[],
  gameStats: Record<string, GameStats>,
  friends: { id: number, name: string, online: boolean }[],
  showOnlineStatus: boolean = true
): string {
  // Map backend game type names to translation keys
  const gameTypeKeyMap: Record<string, string> = {
    'Pong': 'standardPong',
    'Neon City Pong': 'neonCityPong',
    'AI Pong': 'aiPong',
    'Space Battle': 'spaceBattle',
    'Online Pong': 'onlinePong',
  };

  // Calculate total games and win rate from all game types combined
  let totalWins = 0;
  let totalLosses = 0;
  
  // Use playerStats for the overall stats (from database)
  totalWins = playerStats.wins;
  totalLosses = playerStats.losses;
  
  const totalGames = totalWins + totalLosses;
  const winRate = totalGames > 0
    ? ((totalWins / totalGames) * 100).toFixed(1)
    : "0.0";

  return `
    <div class="profile-page">
      <div class="profile-actions">
        <button id="backButton" class="secondary-button">${i18next.t('profile.back')}</button>
      </div>
      <div class="profile-header" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #f4c2c2; border-radius: 12px; box-shadow: 0 0 15px rgba(244, 194, 194, 0.5);">
        <div class="profile-user-info">
          <img
            src="${API_BASE_URL}/avatar/${encodeURIComponent(username)}"
            class="profile-avatar"
            alt="${i18next.t('common.profile')}"
            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNTAiIGZpbGw9IiNmNGMyYzIiLz48cGF0aCBkPSJNMzAgMTgwYzAtNDAgNjAtNzAgMTQwLTcwczE0MCAzMCAxNDAgNzBIMzB6IiBmaWxsPSIjZjRjMmMyIi8+PC9zdmc+'; this.onerror=null;"
          />
          <div class="profile-text-info">
            <h2 class="profile-username">${escapeHtml(username)}</h2>
            <p class="profile-email">${escapeHtml(email)}</p>
          </div>
        </div>
        <div class="profile-quick-stats">
          <div class="quick-stat">
            <span class="stat-value">${winRate}%</span>
            <span class="stat-label">${i18next.t('profile.overallWinRate')}</span>
          </div>
          <div class="quick-stat">
            <span class="stat-value">${playerStats.tournamentsWon}</span>
            <span class="stat-label">${i18next.t('profile.tournamentsWon')}</span>
          </div>
          <div class="quick-stat">
            <span class="stat-value">${totalGames}</span>
            <span class="stat-label">${i18next.t('profile.totalGames')}</span>
          </div>
        </div>
      </div>

      <div class="profile-content">
        <div class="profile-section game-stats-section" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #f4c2c2; border-radius: 12px; box-shadow: 0 0 15px rgba(244, 194, 194, 0.5);">
          <h2>${i18next.t('profile.currentSessionStats')}</h2>
          <div class="game-stats-grid">
            ${Object.entries(gameStats).map(([gameType, stats]) => {
              const key = gameTypeKeyMap[gameType] || gameType.toLowerCase().replace(/\s+/g, '');
              const translated = i18next.t(`profile.gameTypes.${key}`);
              const displayName = translated.startsWith('profile.gameTypes.') ? gameType : translated;
              return `
                <div class="game-type-stats">
                  <h3>${escapeHtml(displayName)}</h3>
                  <canvas id="${gameType.replace(/\s+/g, '-').toLowerCase()}-chart" width="200" height="250"></canvas>
                  <div class="game-type-details">
                    <p>${i18next.t('profile.gamesPlayed')}: ${stats.gamesPlayed}</p>
                    <p>${i18next.t('profile.wins')}: ${stats.wins}</p>
                    <p>${i18next.t('profile.losses')}: ${stats.losses}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="profile-section friends-section" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #f4c2c2; border-radius: 12px; box-shadow: 0 0 15px rgba(244, 194, 194, 0.5);">
          <h2>${i18next.t('profile.friends')}</h2>
          <div class="friends-list">
            ${friends && friends.length > 0
              ? renderFriendList(friends, showOnlineStatus)
              : `<div class="no-friends">${i18next.t('profile.noFriends')}</div>`}
          </div>
        </div>

        <div class="profile-section">
          <h2>${i18next.t('profile.matchHistory')}</h2>
          <div class="match-history-scroll">
            <ul class="match-history-list">
              ${matchHistory.length === 0
                ? `<li class="no-matches">${i18next.t('profile.noMatches')}</li>`
                : matchHistory
                    .map(
                      (match) => `
                        <li class="match-history-item ${match.winner === username ? 'victory' : 'defeat'}">
                          <div class="match-result">${match.winner === username ? i18next.t('profile.victory') : i18next.t('profile.defeat')}</div>
                          <div class="match-players">
                            <span class="winner">${escapeHtml(match.winner)}</span>
                            <span class="vs">${i18next.t('profile.vs')}</span>
                            <span class="loser">${escapeHtml(match.loser)}</span>
                          </div>
                          <div class="match-date">${i18next.t('common.dateFormat', { date: new Date(match.timestamp).toLocaleString() })}</div>
                        </li>
                      `
                    )
                    .join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupGameChart(canvas: HTMLCanvasElement, gameType: string): void {
  const ctx = canvas.getContext('2d')!;
  // Get game stats from the canvas's parent element
  const statsContainer = canvas.closest('.game-type-stats');
  if (!statsContainer) return;

  const wins = parseInt(statsContainer.querySelector('.game-type-details p:nth-child(2)')?.textContent?.split(': ')[1] || '0');
  const losses = parseInt(statsContainer.querySelector('.game-type-details p:nth-child(3)')?.textContent?.split(': ')[1] || '0');

  // Draw pie chart
  const total = wins + losses;
  const startAngle = 0;
  const winAngle = total > 0 ? (wins / total) * Math.PI * 2 : 0;

  // Clear the canvas first
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw wins
  ctx.beginPath();
  ctx.fillStyle = '#4CAF50';
  ctx.moveTo(100, 100);
  ctx.arc(100, 100, 80, startAngle, startAngle + winAngle);
  ctx.lineTo(100, 100);
  ctx.fill();

  // Draw losses
  ctx.beginPath();
  ctx.fillStyle = '#f44336';
  ctx.moveTo(100, 100);
  ctx.arc(100, 100, 80, startAngle + winAngle, startAngle + Math.PI * 2);
  ctx.lineTo(100, 100);
  ctx.fill();

  // Removed game type label under the chart for cleaner look
}

export function setupProfilePage(onBack: () => void, navigate: (path: string) => void): void {
  const backButton = document.getElementById("backButton") as HTMLButtonElement;
  if (backButton) {
    backButton.style.display = "block";
    backButton.onclick = onBack;
  }

  // Add click handlers for friend items
  const friendItems = document.querySelectorAll('.friend-item');
  friendItems.forEach(item => {
    item.addEventListener('click', () => {
      const friendId = item.getAttribute('data-friend-id');
      if (friendId) {
        window.location.href = `/profile/${friendId}`;
      }
    });
  });

  // Setup charts for each game type
  // Dynamically find all chart canvases and set up their charts, including Online Pong
  const chartCanvases = document.querySelectorAll(".game-type-stats canvas");
  chartCanvases.forEach((canvas) => {
    const id = canvas.id;
    // Extract game type from id
    let gameType = id.replace(/-chart$/, '').replace(/-/g, ' ');
    // Capitalize each word
    gameType = gameType.replace(/\b\w/g, c => c.toUpperCase());
    if (gameType === 'Online Pong') gameType = 'Online Pong';
    setupGameChart(canvas as HTMLCanvasElement, gameType);
  });
}

// Renders the multiplayer menu with matchmaking and invite options
export function renderMultiplayerMenu(): string {
  return `
    <div class="full-screen-container">
      <div class="welcome-container">
        <h1 class="neon-title">
          ${i18next.t('game.multiplayer.title')}
        </h1>
        <p class="welcome-subtitle">
          ${i18next.t('game.multiplayer.subtitle')}
        </p>
        <div class="flex flex-col gap-4">
          <label for="multiplayerGameTypeSelect" style="color:white;font-weight:bold;">${i18next.t('game.multiplayer.gameType')}</label>
          <select id="multiplayerGameTypeSelect" class="welcome-button" style="color:black;">
            <option value="pong">${i18next.t('game.multiplayer.gameTypes.pong')}</option>
            <option value="spaceBattle">${i18next.t('game.multiplayer.gameTypes.spaceBattle')}</option>
          </select>
          <button id="matchmakingButton" class="welcome-button">
            ${i18next.t('game.multiplayer.matchmaking')}
          </button>
          <button id="backButton" class="welcome-button">
            ${i18next.t('game.back')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Sets up event listeners for the multiplayer menu
export function setupMultiplayerMenu(navigate: (path: string) => void): void {
  const matchmakingButton = document.getElementById("matchmakingButton");
  const backButton = document.getElementById("backButton");
  const gameTypeSelect = document.getElementById("multiplayerGameTypeSelect") as HTMLSelectElement;

  if (matchmakingButton) {
    matchmakingButton.addEventListener("click", async () => {
      // Store selected game type in sessionStorage
      if (gameTypeSelect) {
        sessionStorage.setItem("multiplayerGameType", gameTypeSelect.value);
      } else {
        sessionStorage.setItem("multiplayerGameType", "pong");
      }
      // Start matchmaking
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        alert("You must be logged in to play multiplayer.");
        navigate("/login");
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/matchmaking/join`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${sessionToken}` },
        });
        if (!response.ok) {
          throw new Error("Failed to join matchmaking");
        }
        const data = await response.json();
        const app = document.getElementById("app");
        if (app) app.innerHTML = renderWaitingForOpponent();
        let polling = true;
        setupWaitingForOpponent(() => {
          polling = false;
          const sessionToken = localStorage.getItem("sessionToken");
          if (sessionToken) {
            fetch(`${API_BASE_URL}/matchmaking/leave`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${sessionToken}` },
            }).catch(error => console.error("Error leaving matchmaking:", error));
          }
          navigate("/multiplayer");
        });
        if (data.status === "ready" && data.matchId) {
          navigate(`/multiplayerGame/${data.matchId}`);
          return;
        }
        const userId = data.userId;
        if (!userId) {
          throw new Error("No user ID received from matchmaking");
        }
        const poll = async () => {
          if (!polling) return;
          try {
            const statusRes = await fetch(`${API_BASE_URL}/matchmaking/status/${userId}`, {
              headers: { "Authorization": `Bearer ${sessionToken}` },
            });
            if (!statusRes.ok) {
              throw new Error("Failed to get matchmaking status");
            }
            const status = await statusRes.json();
            if (status.status === "ready" && status.matchId) {
              navigate(`/multiplayerGame/${status.matchId}`);
            } else {
              setTimeout(poll, 2000);
            }
          } catch (error) {
            console.error("Error polling matchmaking status:", error);
            polling = false;
            navigate("/multiplayer");
          }
        };
        poll();
      } catch (error) {
        console.error("Matchmaking error:", error);
        alert("Failed to join matchmaking. Please try again.");
        navigate("/multiplayer");
      }
    });
  }
  if (backButton) {
    backButton.addEventListener("click", () => {
      navigate("/");
    });
  }
}

// Renders the waiting for opponent UI
export function renderWaitingForOpponent(): string {
  return `
    <div class="full-screen-container">
      <div class="welcome-container">
        <h1 class="neon-title">${i18next.t('game.waitingForOpponent')}</h1>
        <p class="welcome-subtitle">${i18next.t('game.opponentJoining')}</p>
        <div class="flex flex-col gap-4">
          <button id="cancelMatchmakingButton" class="welcome-button">${i18next.t('game.cancel')}</button>
        </div>
      </div>
    </div>
  `;
}

export function setupWaitingForOpponent(onCancel: () => void) {
  const cancelButton = document.getElementById("cancelMatchmakingButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", onCancel);
  }
}

export function escapeHtml(str: string): string {
  // Check if the string contains any HTML tags or script tags
  if (/<[^>]*>|<\/[^>]*>|javascript:|on\w+\s*=/.test(str)) {
    return "Nice try! 😄";
  }
  return String(str).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]!));
}

export function renderFriendList(friends: { id: number, name: string, online: boolean }[], showOnlineStatus: boolean = true): string {
  return `
    <div class="friends-list">
      ${friends.length === 0
        ? `<div class="no-friends">${i18next.t('profile.noFriends')}</div>`
        : friends
            .map(
              (friend) => `
                <div class="friend-item" style="display: flex; align-items: center; gap: 8px; background: rgba(255,192,203,0.08); border-radius: 8px; padding: 6px 12px; margin-bottom: 6px; cursor: pointer;" data-friend-id="${friend.id}">
                  ${showOnlineStatus ? `<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${friend.online ? '#4CAF50' : '#f44336'}; margin-right: 8px;"></span>` : ''}
                  <span class="friend-name" style="color: #fff; font-weight: 500;">${escapeHtml(friend.name)}</span>
                </div>
              `
            )
            .join('')}
    </div>
  `;
}

export function renderAddFriendButton(username: string, isFriend: boolean, isAdding: boolean): string {
  if (isFriend) {
    return `<button class="friend-button" disabled>${i18next.t('profile.friendActions.alreadyFriends')}</button>`;
  }
  if (isAdding) {
    return `<button class="friend-button" disabled>${i18next.t('profile.friendActions.adding')}</button>`;
  }
  return `<button class="friend-button" data-username="${escapeHtml(username)}">${i18next.t('profile.friendActions.addFriend')}</button>`;
}

export function showFriendError(message: string): void {
  let translatedMessage = message;
  switch (message) {
    case "You can't add yourself as a friend":
      translatedMessage = i18next.t('profile.friendActions.cantAddSelf');
      break;
    case "User not found":
      translatedMessage = i18next.t('profile.friendActions.userNotFound');
      break;
    case "Already friends":
      translatedMessage = i18next.t('profile.friendActions.alreadyFriends');
      break;
  }
  showError(translatedMessage);
}