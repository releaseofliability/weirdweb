const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const chalk = require('chalk');

const ASSETS_DIR = path.join(__dirname, '../assets');

// Ensure directories exist
function ensureDirectories() {
  const dirs = ['img', 'gif', 'texts'];
  dirs.forEach(dir => {
    const dirPath = path.join(ASSETS_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.yellow(`Created directory: ${dirPath}`));
    }
  });
}

async function scrapeWebsite(url, config) {
  console.log(chalk.blue(`Scraping content from ${url}...`));
  try {
    // Set a timeout of 20 seconds for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Scrape text content
    const texts = [];
    $('h1, h2, h3, h4, h5, h6, p, span, div').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) {
        texts.push(text);
      }
    });
    if (texts.length > 0) {
        const textFile = path.join(ASSETS_DIR, 'texts', `scraped-${Date.now()}.txt`);
        fs.writeFileSync(textFile, texts.join('\n\n'), 'utf8');
        console.log(chalk.green(`✓ Saved ${texts.length} text snippets to ${textFile}`));
      }

    // Scrape images
    const images = [];
    $('img').each((i, el) => {
      let src = $(el).attr('src');
      if (src && !src.startsWith('data:')) {
        if (!src.startsWith('http')) {
          src = new URL(src, url).href;
        }
        images.push(src);
      }
    });
    for (const imgUrl of images.slice(0, config['layer-settings']['max-assets-per-layer'])) {
      try {
        if (config['scraping-mode'] === 'fast') {
          console.log(chalk.blue(`Checking URL: ${imgUrl}`));
          const imgRes = await fetch(imgUrl, { method: 'HEAD', timeout: 5000 });
          if (imgRes.ok) {
            const ext = imgUrl.match(/\.(jpe?g|png|gif|webp)$/i)?.[0] || '.jpg';
            const linkFilePath = path.join(ASSETS_DIR, ext === '.gif' ? 'gif' : 'img', 'links.txt');
            fs.appendFileSync(linkFilePath, imgUrl + '\n', 'utf8');
            console.log(chalk.green(`✓ Fast mode: Saved URL ${imgUrl} to ${linkFilePath}`));
          } else {
            console.log(chalk.red(`✗ Fast mode: URL ${imgUrl} did not respond (status: ${imgRes.status})`));
          }
          continue;
        }
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
        const ext = imgUrl.match(/\.(jpe?g|png|gif|webp)$/i)?.[0] || '.jpg';
        const filename = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
        const dest = path.join(ASSETS_DIR, ext === '.gif' ? 'gif' : 'img', filename);
        const buffer = await imgRes.buffer();
        fs.writeFileSync(dest, buffer);
        console.log(chalk.green(`✓ Downloaded image ${imgUrl} to ${filename}`));
      } catch (err) {
        console.error(chalk.red(`✗ Failed to download image ${imgUrl}: ${err.message}`));
      }
    }
  } catch (error) {
    console.error(chalk.red(`✗ Error scraping ${url}: ${error.message}`));
  }
}

async function scrapeAssets(config) {
  ensureDirectories();
  console.log(chalk.blue('Starting asset scraping from target websites...'));
  for (const url of config['scrape-targets']) {
    await scrapeWebsite(url, config);
  }
  console.log(chalk.blue('Asset scraping completed.'));
}

module.exports = { scrapeAssets };
