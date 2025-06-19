const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { downloadAssets } = require('./utils/assetManager');
const { scrapeAssets } = require('./utils/scraper');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use('/assets', express.static('assets'));

const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

if (config['regenerate-assets']) {
  console.log('Regenerating assets...');
  downloadAssets(config);
  scrapeAssets(config);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/assets/:type', (req, res) => {
  const type = req.params.type;
  const allowedTypes = ['img', 'gif', 'texts', 'fonts'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid asset type' });
  }

  const dirPath = path.join(__dirname, 'assets', type);
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist, creating it.`);
    fs.mkdirSync(dirPath, { recursive: true });
    return res.json([]);
  }

  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${dirPath}:`, err);
      return res.status(500).json({ error: 'Failed to read asset directory' });
    }
    // Filter out .gitkeep and other non-asset files if necessary
    const assetFiles = files.filter(file => file !== '.gitkeep');
    res.json(assetFiles);
  });
});

// API endpoint to get configuration
app.get('/config', (req, res) => {
  const configToSend = {
    layerCount: config['layer-settings'].layerCount,
    maxAssetsPerLayer: config['layer-settings'].maxAssetsPerLayer,
    pageHeightMultiplier: config['layer-settings'].pageHeightMultiplier,
    'effect-chances': config['effect-chances']
  };
  res.json(configToSend);
});

app.listen(PORT, () => {
  console.log(`WeirdWeb running at http://localhost:${PORT}`);
});
