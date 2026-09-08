// Script to upload all project files to GitHub and enable GitHub Pages
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const PROJECT_DIR = 'C:\\Users\\ajayy\\.gemini\\antigravity\\scratch\\jarvis-discipline-system';
const OWNER = 'yadavishall0';
const REPO = 'jarvis-discipline-system';

const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
if (!token) {
  console.error('ERROR: Could not get GitHub token from gh auth token');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'User-Agent': 'JARVIS-Publisher',
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
};

function githubRequest(method, urlPath, body = null) {
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

function getFilesRecursively(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === '.git' || item === 'node_modules' || item === 'config.json' || item.endsWith('.ps1')) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function uploadFile(fullPath) {
  const relativePath = path.relative(PROJECT_DIR, fullPath).replace(/\\/g, '/');
  const fileContent = fs.readFileSync(fullPath);
  const base64Content = fileContent.toString('base64');

  // Check if file exists to obtain sha
  const checkRes = await githubRequest('GET', `/repos/${OWNER}/${REPO}/contents/${relativePath}`);
  let sha = null;
  if (checkRes.statusCode === 200 && checkRes.body && checkRes.body.sha) {
    sha = checkRes.body.sha;
  }

  console.log(`Uploading: ${relativePath} (${fileContent.length} bytes)...`);

  const uploadRes = await githubRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${relativePath}`, {
    message: `Deploy ${relativePath} to JARVIS Discipline System`,
    content: base64Content,
    sha: sha
  });

  if (uploadRes.statusCode === 200 || uploadRes.statusCode === 201) {
    console.log(`  ✓ Success: ${relativePath}`);
    return true;
  } else {
    console.error(`  ✗ Failed (${uploadRes.statusCode}): ${JSON.stringify(uploadRes.body)}`);
    return false;
  }
}

async function main() {
  console.log('====================================================');
  console.log(`Publishing JARVIS to https://github.com/${OWNER}/${REPO}`);
  console.log('====================================================');

  const files = getFilesRecursively(PROJECT_DIR);
  console.log(`Found ${files.length} files to publish.`);

  for (const file of files) {
    await uploadFile(file);
  }

  console.log('\nEnabling GitHub Pages...');
  const pagesRes = await githubRequest('POST', `/repos/${OWNER}/${REPO}/pages`, {
    source: {
      branch: 'main',
      path: '/'
    }
  });

  if (pagesRes.statusCode === 201) {
    console.log('✓ GitHub Pages enabled successfully!');
  } else if (pagesRes.statusCode === 409 || pagesRes.statusCode === 422) {
    console.log('✓ GitHub Pages already active or building.');
  } else {
    console.log(`GitHub Pages response: ${pagesRes.statusCode} - ${JSON.stringify(pagesRes.body)}`);
  }

  const liveUrl = `https://${OWNER}.github.io/${REPO}/`;
  const repoUrl = `https://github.com/${OWNER}/${REPO}`;

  console.log('\n====================================================');
  console.log('🎉 PUBLICATION COMPLETE!');
  console.log(`📂 Repository: ${repoUrl}`);
  console.log(`🌐 Live PWA Web App: ${liveUrl}`);
  console.log('====================================================\n');
}

main().catch(err => console.error('Fatal error:', err));
