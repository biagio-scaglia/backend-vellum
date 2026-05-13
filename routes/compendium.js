const express = require('express');
const router = express.Router();
const cache = require('../services/cache');
const sync = require('../services/sync');

// GET /api/compendium
router.get('/', (req, res) => {
  const items = cache.getCache();
  const metadata = cache.getMetadata();

  // Se la cache è vuota e sta sincronizzando, avvisa il client
  if (items.length === 0 && metadata.syncStatus === 'syncing') {
    return res.json({
      status: 'syncing',
      message: 'Il backend sta popolando la cache per la prima volta. Riprova tra poco.',
      metadata
    });
  }

  // Risponde con i dati + metadata
  res.json({
    metadata,
    items
  });
});

// GET /api/compendium/status
router.get('/status', (req, res) => {
  res.json(cache.getMetadata());
});

// POST /api/compendium/sync
router.post('/sync', (req, res) => {
  const metadata = cache.getMetadata();

  if (metadata.syncStatus === 'syncing') {
    return res.json({ status: 'syncing', message: 'Sincronizzazione già in corso.' });
  }

  // Avvia la sincronizzazione in background
  sync.runSync();
  
  res.json({ status: 'started', message: 'Sincronizzazione avviata in background.' });
});

module.exports = router;
