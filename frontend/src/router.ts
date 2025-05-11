// Defines the structure of a route
interface Route {
  path: string;
  render: () => string | Promise<string>;
}

// Manages client-side routing for the application
export class Router {
  // Stores registered routes
  private routes: Route[] = [];
  // DOM element to render route content
  private appContainer: HTMLElement;
  // Optional callback to execute after rendering
  private afterRenderCallback: (() => void) | null = null;

  // Initializes the router with a container ID and optional callback
  constructor(appContainerId: string, afterRenderCallback?: () => void) {
    this.appContainer = document.getElementById(appContainerId) as HTMLElement;
    this.afterRenderCallback = afterRenderCallback || null;
    // Handle browser back/forward navigation
    window.addEventListener("popstate", () => {
      console.log("Popstate event, handling route change");
      this.handleRouteChange();
    });
  }

  // Adds a new route to the router
  addRoute(path: string, render: () => string | Promise<string>) {
    this.routes.push({ path, render });
  }

  // Navigates to a specified path
  navigate(path: string) {
    console.log("Navigating to:", path);
    history.pushState({}, "", path);
    this.handleRouteChange();
  }

  // Handles route changes and renders the appropriate content
  async handleRouteChange() {
    let path = window.location.pathname;
    console.log("Handling route change, path:", path);

    // Clean up any existing game instance
    const gameInstance = (window as any).gameInstance;
    if (gameInstance && typeof gameInstance.cleanup === 'function') {
      gameInstance.cleanup();
      gameInstance.gameOver = true;
      (window as any).gameInstance = null;
    }

    // Default to root path if none provided
    if (!path || path === "/") {
      path = "/";
    }
    // Try to find an exact match first
    let route = this.routes.find((r) => r.path === path);
    // If not found, check for dynamic routes (e.g., /multiplayerGame/:matchId)
    if (!route) {
      for (const r of this.routes) {
        // Support /multiplayerGame/:matchId
        if (r.path.includes(":") && this.matchDynamicRoute(r.path, path)) {
          route = r;
          break;
        }
      }
    }
    if (route) {
      console.log("Rendering route:", route.path);
      try {
        const result = await route.render();
        this.appContainer.innerHTML = result;
        // Execute callback if provided
        if (this.afterRenderCallback) {
          this.afterRenderCallback();
        }
      } catch (error) {
        console.error("Error rendering route:", error);
        this.navigate("/");
      }
    } else {
      console.log("Route not found, redirecting to /");
      this.navigate("/");
    }
  }

  // Helper to match dynamic routes like /multiplayerGame/:matchId
  private matchDynamicRoute(routePath: string, actualPath: string): boolean {
    const routeParts = routePath.split("/");
    const pathParts = actualPath.split("/");
    if (routeParts.length !== pathParts.length) return false;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) continue;
      if (routeParts[i] !== pathParts[i]) return false;
    }
    return true;
  }

  // Starts the router and initializes the first route
  start() {
    if (!window.location.pathname || window.location.pathname === "/") {
      history.replaceState({}, "", "/");
    }
    console.log("Starting router, initial path:", window.location.pathname);
    this.handleRouteChange();
  }
}