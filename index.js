const express = require('express');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const cache = require('./services/cache');
const sync = require('./services/sync');
const compendiumRoutes = require('./routes/compendium');

const app = express();

// Middlewares
app.use(cors({
  origin: config.corsOrigin
}));
app.use(compression());
app.use(express.json());

// Routes
app.use('/api/compendium', compendiumRoutes);

// Gestione errori 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rotta non trovata' });
});

// Boot del server
app.listen(config.port, () => {
  console.log(`[Server] Backend in ascolto sulla porta ${config.port}`);
  
  // 1. Carica la cache da file locale
  cache.loadCache();
  
  // 2. Controlla lo stato della cache
  const metadata = cache.getMetadata();
  
  if (metadata.itemCount === 0) {
    console.log('[Server] Cache vuota al boot. Avvio sincronizzazione automatica...');
    sync.runSync();
  } else {
    console.log(`[Server] Pronto con ${metadata.itemCount} elementi in cache.`);
    
    // Logica Stale-While-Revalidate: Se i dati sono più vecchi di 7 giorni, aggiorna in background
    const lastSync = new Date(metadata.lastSyncAt);
    const now = new Date();
    const diffDays = (now - lastSync) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 7) {
      console.log(`[Server] Cache stale (vecchia di ${Math.round(diffDays)} giorni). Avvio refresh in background...`);
      sync.runSync();
    }
  }
});
