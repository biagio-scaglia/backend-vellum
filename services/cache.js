const fs = require('fs');
const config = require('../config');

let compendiumCache = [];
let metadata = {
  lastSyncAt: null,
  itemCount: 0,
  syncStatus: 'idle', // idle, syncing, error
  lastError: null,
  cacheVersion: '1.0'
};

// Carica da file al boot
function loadCache() {
  if (fs.existsSync(config.filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(config.filePath, 'utf8'));
      compendiumCache = data.items || [];
      metadata = { ...metadata, ...data.metadata };
      console.log(`[Cache] Caricati ${compendiumCache.length} elementi dal file locale.`);
    } catch (e) {
      console.error('[Cache] Errore lettura file cache:', e.message);
      metadata.lastError = `Errore lettura file: ${e.message}`;
    }
  }
}

function getCache() {
  return compendiumCache;
}

function getMetadata() {
  return metadata;
}

function updateCache(items, syncMetadata = {}) {
  compendiumCache = items;
  metadata = {
    ...metadata,
    ...syncMetadata,
    itemCount: items.length,
    lastSyncAt: new Date().toISOString()
  };

  // Salva su file in modo atomico
  try {
    const dataToSave = {
      metadata,
      items: compendiumCache
    };
    const tempPath = `${config.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2));
    fs.renameSync(tempPath, config.filePath);
    console.log('[Cache] Dati salvati su file in modo sicuro.');
  } catch (e) {
    console.error('[Cache] Errore salvataggio file cache:', e.message);
    metadata.lastError = `Errore salvataggio file: ${e.message}`;
  }
}

function setSyncStatus(status, error = null) {
  metadata.syncStatus = status;
  if (error) {
    metadata.lastError = error;
  }
}

module.exports = {
  loadCache,
  getCache,
  getMetadata,
  updateCache,
  setSyncStatus
};
