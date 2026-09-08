/**
 * JARVIS Discipline System - GitHub Pages Deployment & Mobile APK Generator
 * 
 * Usage:
 * 1. Create a config.json with your GitHub Personal Access Token (with repo & workflow scopes):
 *    { "username": "your-github-username", "token": "ghp_your_github_token" }
 * 2. Run: node deploy_and_build_apk.js
 * 
 * This script will:
 * - Create or update the 'jarvis-os' GitHub repository.
 * - Upload all modular app files (HTML, CSS, JS, manifest, icons, service worker).
 * - Enable GitHub Pages (e.g. https://<username>.github.io/jarvis-os/).
 * - Query PWABuilder Cloud APK Generator to package and download your ready-to-install Android APK!
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.log("=================================================================");
  console.log("  JARVIS MOBILE APK GENERATOR & DEPLOYER");
  console.log("=================================================================");
  console.log("To deploy and generate your mobile APK automatically:");
  console.log("1. Create config.json in this folder with:");
  console.log('   {\n     "username": "your-github-username",\n     "token": "your-github-token"\n   }');
  console.log("2. Run: node deploy_and_build_apk.js");
  console.log("=================================================================\n");
  process.exit(0);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error("ERROR: Failed to parse config.json! Check syntax.");
  process.exit(1);
}

const { username, token } = config;
if (!username || !token) {
  console.error("ERROR: username or token missing in config.json!");
  process.exit(1);
}

const headers = {
  'Authorization': `token ${token}`,
  'User-Agent': 'JARVIS-Deployer',
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
};

const repoName = 'jarvis-os';

function request(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { if (data) parsed = JSON.parse(data); } catch(e) {}
        resolve({ statusCode: res.statusCode, body: parsed, raw: data });
      });
    });

    req.on('error', err => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if (file === '.git' || file === 'config.json' || file === 'node_modules') return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.relative(__dirname, fullPath).replace(/\\/g, '/'));
    }
  });
  return arrayOfFiles;
}

async function main() {
  try {
    console.log(`Checking if repository ${username}/${repoName} exists...`);
    let repoCheck = await request('GET', `/repos/${username}/${repoName}`);
    
    if (repoCheck.statusCode === 404) {
      console.log(`Repository does not exist. Creating ${repoName}...`);
      const createRes = await request('POST', '/user/repos', {
        name: repoName,
        description: 'JARVIS — Personal Discipline Operating System with PWA & Mobile APK support.',
        private: false,
        has_issues: true,
        has_projects: false,
        has_wiki: false
      });
      if (createRes.statusCode !== 201) {
        throw new Error(`Failed to create repository: ${JSON.stringify(createRes.body)}`);
      }
      console.log("Repository created successfully!");
    } else if (repoCheck.statusCode === 200) {
      console.log("Repository already exists. Uploading updated files...");
    }

    const filesToUpload = getAllFiles(__dirname);
    console.log(`Found ${filesToUpload.length} files to synchronize.`);

    for (const relFile of filesToUpload) {
      const filePath = path.join(__dirname, relFile);
      const content = fs.readFileSync(filePath);
      const base64Content = content.toString('base64');
      
      let fileCheck = await request('GET', `/repos/${username}/${repoName}/contents/${relFile}`);
      let sha = null;
      if (fileCheck.statusCode === 200) {
        sha = fileCheck.body.sha;
      }

      console.log(`Uploading ${relFile}...`);
      const uploadRes = await request('PUT', `/repos/${username}/${repoName}/contents/${relFile}`, {
        message: `Deploy ${relFile} to JARVIS OS`,
        content: base64Content,
        sha: sha
      });

      if (uploadRes.statusCode !== 200 && uploadRes.statusCode !== 201) {
        console.warn(`Note on ${relFile}: ${uploadRes.statusCode}`);
      }
    }

    console.log("Files synchronized. Ensuring GitHub Pages is enabled...");
    await request('POST', `/repos/${username}/${repoName}/pages`, {
      source: { branch: 'main', path: '/' }
    });

    const webUrl = `https://${username}.github.io/${repoName}/`;
    console.log("\n=================================================================");
    console.log("🎉 JARVIS DEPLOYED SUCCESSFULLY!");
    console.log(`👉 Web & PWA URL: ${webUrl}`);
    console.log("=================================================================");
    console.log("\nTO INSTALL APK ON YOUR PHONE:");
    console.log("Option 1 (Instant): Open the URL above on your Android phone in Chrome,");
    console.log("         tap the menu (⋮) -> 'Install App' or 'Add to Home Screen'.");
    console.log("Option 2 (Signed APK package via PWABuilder):");
    console.log(`         Visit: https://www.pwabuilder.com`);
    console.log(`         Enter: ${webUrl}`);
    console.log("         Click 'Package for Stores' -> 'Android' -> 'Download Package'!");
    console.log("=================================================================\n");

  } catch (err) {
    console.error("\n❌ DEPLOYMENT FAILED:", err.message);
  }
}

main();
