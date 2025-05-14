// Get API IP from environment variable or fallback to current hostname
const getApiIp = () => {
  // This function is no longer needed as we use relative paths for the backend.
  // Keeping it for now in case it's used elsewhere, but it should be reviewed.
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return window.location.hostname;
  }
  // For other environments, you might want to return a specific internal IP or leave it empty
  // if Nginx is on the same host and proxies based on path.
  // For this change, we assume Nginx is on the same host.
  return window.location.hostname; 
};

// Base URL for backend API calls - now a relative path for Nginx proxying
export const getBackendUrl = () => {
  return '/api'; // Nginx will proxy /api requests to the backend
};

// URL for WebSocket connections - now relative for Nginx proxying
export const getWebSocketUrl = (path: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // e.g., localhost:3000 or yourdomain.com
  return `${protocol}//${host}${path}`; // path should start with /ws/
}; 