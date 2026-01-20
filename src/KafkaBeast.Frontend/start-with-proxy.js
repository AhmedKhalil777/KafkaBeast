#!/usr/bin/env node

// This script starts the Angular dev server with a proxy configuration
// that uses the dashboard endpoint from environment variables

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get dashboard URL from environment variable (set by Aspire via WithReference)
// Aspire sets endpoint URLs in format: Endpoints__dashboard__https or Endpoints__dashboard__http
const dashboardUrl = process.env['Endpoints__dashboard__https'] || 
                     process.env['Endpoints__dashboard__http'] ||
                     process.env.DASHBOARD_URL || 
                     'https://localhost:7000';

// Set environment variables for Angular to read at runtime
process.env.API_URL = dashboardUrl;
process.env.SIGNALR_URL = dashboardUrl;

// Create proxy config dynamically
const proxyConfig = {
  "/api": {
    "target": dashboardUrl,
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/hubs": {
    "target": dashboardUrl,
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "logLevel": "debug"
  }
};

// Write proxy config
const proxyConfigPath = path.join(__dirname, 'proxy.conf.json');
fs.writeFileSync(proxyConfigPath, JSON.stringify(proxyConfig, null, 2));

console.log(`Proxy configured to use dashboard at: ${dashboardUrl}`);

// Update environment.ts with the backend URL from Aspire
const envPath = path.join(__dirname, 'src', 'app', 'environments', 'environment.ts');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  // Replace the apiUrl and signalRUrl values with the dashboard URL
  envContent = envContent.replace(
    /apiUrl:\s*['"][^'"]*['"]/,
    `apiUrl: '${dashboardUrl}'`
  );
  envContent = envContent.replace(
    /signalRUrl:\s*['"][^'"]*['"]/,
    `signalRUrl: '${dashboardUrl}'`
  );
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated environment.ts with backend URL: ${dashboardUrl}`);
}

// Check if node_modules exists, if not run npm install
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('Installing npm dependencies...');
  try {
    execSync('npm install --legacy-peer-deps', {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Check if Angular CLI is available locally, if not install it
const angularCliPath = path.join(nodeModulesPath, '@angular/cli');
if (!fs.existsSync(angularCliPath)) {
  console.log('Angular CLI not found in node_modules, installing...');
  try {
    execSync('npm install --save-dev @angular/cli', {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    console.error('Failed to install Angular CLI:', error.message);
    process.exit(1);
  }
}

// Start Angular dev server using local Angular CLI
const args = process.argv.slice(2);
const angularCliBin = process.platform === 'win32' 
  ? path.join(nodeModulesPath, '@angular/cli', 'bin', 'ng.cmd')
  : path.join(nodeModulesPath, '@angular/cli', 'bin', 'ng');

// Use local Angular CLI if available, otherwise use npx
const ngCommand = fs.existsSync(angularCliBin) 
  ? `"${angularCliBin}"`
  : 'npx --yes @angular/cli';

// Pass API URLs to Angular via environment variables
// Angular will read these and inject them into index.html
const env = { 
  ...process.env, 
  NG_CLI_ANALYTICS: 'false',
  API_URL: dashboardUrl,
  SIGNALR_URL: dashboardUrl
};

try {
  execSync(`${ngCommand} serve --port 4200 --host 0.0.0.0 --proxy-config proxy.conf.json ${args.join(' ')}`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: env,
    shell: true
  });
} catch (error) {
  console.error('Failed to start Angular dev server');
  if (error.status !== null) {
    console.error(`Exit code: ${error.status}`);
  }
  if (error.stderr) {
    console.error('Error output:', error.stderr.toString());
  }
  process.exit(error.status || 1);
}

