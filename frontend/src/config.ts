// Get API IP from environment variable or fallback to current hostname
const getApiIp = () => {
  // @ts-ignore - This will be replaced during build
  const apiIp = process.env.API_IP;
  const finalIp = apiIp || window.location.hostname;
  
  // Create a persistent check in the browser console
  console.log('%c🔍 API Configuration Check', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  console.log('%cAPI IP:', 'font-weight: bold;', finalIp);
  console.log('%cBackend URL:', 'font-weight: bold;', `${window.location.protocol}//${finalIp}:4000`);
  console.log('%cWebSocket URL:', 'font-weight: bold;', `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${finalIp}:4000`);
  console.log('%cIf you see "localhost" above, the API_IP injection failed!', 'color: #f44336; font-weight: bold;');
  
  return finalIp;
};

// Configuration for the application
export const getBackendUrl = () => {
  const hostname = getApiIp();
  const protocol = window.location.protocol;
  const port = '4000'; // Backend port
  
  return `${protocol}//${hostname}:${port}`;
};

// WebSocket URL helper
export const getWebSocketUrl = (path: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = getApiIp();
  const port = '4000';
  
  return `${protocol}//${hostname}:${port}${path}`;
}; 