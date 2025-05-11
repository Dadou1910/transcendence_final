import { StatsManager } from "./stats.js";
import { renderSettingsPage, setupSettingsPage } from "./ui.js";
import { API_BASE_URL } from './index.js';

export class SettingsView {
  private statsManager: StatsManager;
  private navigate: (path: string) => void;

  constructor(statsManager: StatsManager, navigate: (path: string) => void) {
    this.statsManager = statsManager;
    this.navigate = navigate;
  }

  async render(): Promise<string> {
    const currentUser = await this.statsManager.fetchCurrentUser();
    if (!currentUser) {
      this.navigate("/");
      return "<div>Please log in to access settings</div>";
    }

    // Ensure we have the latest user data
    const sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
      this.navigate("/");
      return "<div>Session expired. Please log in again.</div>";
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
      const user = data.user;

      return renderSettingsPage(
        user.name,
        user.email
      );
    } catch (error) {
      console.error("Error fetching user data:", error);
      return "<div>Error loading settings. Please try again.</div>";
    }
  }

  async setup(): Promise<void> {
    const currentUser = await this.statsManager.fetchCurrentUser();
    if (!currentUser) {
      this.navigate("/");
      return;
    }

    setupSettingsPage(
      async (updates) => {
        try {
          const sessionToken = localStorage.getItem("sessionToken");
          if (!sessionToken) {
            throw new Error("No session token found");
          }

          // Handle avatar upload if a file is selected
          const avatarInput = document.getElementById('avatar') as HTMLInputElement;
          if (avatarInput && avatarInput.files && avatarInput.files.length > 0) {
            const formData = new FormData();
            formData.append('avatar', avatarInput.files[0]);

            const avatarResponse = await fetch(`${API_BASE_URL}/avatar`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${sessionToken}`
              },
              body: formData
            });

            if (!avatarResponse.ok) {
              throw new Error("Failed to upload avatar");
            }

            // Clear avatar cache to show the new avatar
            this.statsManager.clearAvatarCache(currentUser.username);
          }

          // Handle profile updates (username/email) and password changes separately
          const profileUpdates = {
            ...(updates.username ? { username: updates.username } : {}),
            ...(updates.email ? { email: updates.email } : {})
          };

          const passwordUpdates = {
            ...(updates.currentPassword ? { currentPassword: updates.currentPassword } : {}),
            ...(updates.newPassword ? { newPassword: updates.newPassword } : {})
          };

          // Update profile if username or email changed
          if (Object.keys(profileUpdates).length > 0) {
            const profileResponse = await fetch(`${API_BASE_URL}/profile/update`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
              },
              body: JSON.stringify(profileUpdates)
            });

            if (!profileResponse.ok) {
              const data = await profileResponse.json();
              throw new Error(data.error || "Failed to update profile");
            }

            // Update local state
            if (updates.username) {
              currentUser.username = updates.username;
              // Clear avatar cache for the new username
              this.statsManager.clearAvatarCache(updates.username);
            }
            if (updates.email) {
              currentUser.email = updates.email;
            }
          }

          // Update password if password fields were filled
          if (Object.keys(passwordUpdates).length > 0) {
            const passwordResponse = await fetch(`${API_BASE_URL}/profile/update`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
              },
              body: JSON.stringify(passwordUpdates)
            });

            if (!passwordResponse.ok) {
              const data = await passwordResponse.json();
              throw new Error(data.error || "Failed to update password");
            }
          }

          // Force a page reload when navigating back to welcome page
          window.location.href = "/";
        } catch (error) {
          console.error("Failed to update profile:", error);
          const errorDiv = document.getElementById("settingsError");
          if (errorDiv) {
            errorDiv.textContent = error instanceof Error ? error.message : "Failed to update profile";
            errorDiv.classList.add("visible");
          }
        }
      },
      () => this.navigate("/"),
      this.statsManager
    );
  }
} 