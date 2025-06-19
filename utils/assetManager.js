const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const chalk = require('chalk');

const ASSETS_DIR = path.join(__dirname, '../assets');

// Ensure directories exist
function ensureDirectories() {
  const dirs = ['img', 'gif', 'texts', 'fonts'];
  dirs.forEach(dir => {
    const dirPath = path.join(ASSETS_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.yellow(`Created directory: ${dirPath}`));
    }
  });
}

async function downloadAssets(config) {
  ensureDirectories();

  // Clear existing assets
  Object.keys(config['asset-sources']).forEach(type => {
    const dir = path.join(ASSETS_DIR, type === 'texts' ? 'texts' : type === 'fonts' ? 'fonts' : type === 'images' ? 'img' : 'gif');
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(dir, file));
        }
      });
      console.log(chalk.yellow(`Cleared contents of ${dir}`));
    }
  });

  // Download new assets
  for (const [type, urls] of Object.entries(config['asset-sources'])) {
    console.log(chalk.blue(`Downloading ${type}...`));
    
    const targetDir = type === 'texts' ? 'texts' : type === 'fonts' ? 'fonts' : type === 'images' ? 'img' : 'gif';
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        let ext = '';
        if (type === 'fonts') ext = '.ttf';
        else if (type === 'texts') ext = '.txt';
        else if (type === 'images') {
          ext = url.match(/\.(jpe?g|png|webp)$/i)?.[0] || '.jpg';
        } else if (type === 'gifs') {
          ext = '.gif';
        } else {
          ext = '.bin';
        }
        
        const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
        const dest = path.join(ASSETS_DIR, targetDir, filename);
        
        const buffer = await response.buffer();
        fs.writeFileSync(dest, buffer);
        console.log(chalk.green(`✓ ${url} → ${filename}`));
      } catch (error) {
        console.error(chalk.red(`✗ Failed to download ${url}: ${error.message}`));
      }
    }
  }
  console.log(chalk.blue('Assets download completed.'));
}

module.exports = { downloadAssets };
