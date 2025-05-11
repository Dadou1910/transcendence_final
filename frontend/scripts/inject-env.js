const fs = require('fs');
const path = require('path');

// Log the current directory and .env path
const envPath = path.resolve(__dirname, '../../.env');
console.log('\n');
console.log('='.repeat(80));
console.log('🔍 Environment Configuration Debug:');
console.log('='.repeat(80));
console.log('📂 Current directory:', __dirname);
console.log('📄 Looking for .env at:', envPath);
console.log('📝 .env file exists:', fs.existsSync(envPath));

// Try to load the .env file
require('dotenv').config({ path: envPath });

// Log environment variable status
console.log('🔑 API_IP from process.env:', process.env.API_IP);

// Read the built config file
const configPath = path.resolve(__dirname, '../dist/config.js');
console.log('📦 Config file path:', configPath);
console.log('📝 Config file exists:', fs.existsSync(configPath));

let configContent = fs.readFileSync(configPath, 'utf8');

// Replace environment variables
const envVars = {
  API_IP: process.env.API_IP || 'localhost'
};

// Log the final value being injected
console.log('💉 Value being injected:', envVars.API_IP);

// Replace process.env.API_IP with the actual value
configContent = configContent.replace(
  /process\.env\.API_IP/g,
  `"${envVars.API_IP}"`
);

// Write the modified content back
fs.writeFileSync(configPath, configContent);

console.log('✅ Injection completed');
console.log('='.repeat(80));
console.log('\n');

// Make the message very visible
console.log('\n');
console.log('='.repeat(80));
console.log('🚀 API Configuration Status:');
console.log('='.repeat(80));
console.log(`📡 API IP Address: ${envVars.API_IP}`);
console.log('='.repeat(80));
console.log('\n'); 