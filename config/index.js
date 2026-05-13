require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  baseUrl: process.env.DND_API_BASE_URL || 'https://www.dnd5eapi.co/api',
  concurrencyLimit: parseInt(process.env.CONCURRENCY_LIMIT || '5', 10),
  filePath: path.join(__dirname, '../compendium.json')
};
