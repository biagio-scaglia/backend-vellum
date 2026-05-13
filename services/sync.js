const pLimit = require('p-limit');
const dndApi = require('./dndApi');
const cache = require('./cache');
const formatter = require('../utils/formatter');
const config = require('../config');

// Inizializza il limite di concorrenza (es. 5 richieste alla volta)
const limit = pLimit(config.concurrencyLimit);

async function runSync() {
  const metadata = cache.getMetadata();
  if (metadata.syncStatus === 'syncing') {
    console.log('[Sync] Sincronizzazione già in corso. Salto.');
    return;
  }

  cache.setSyncStatus('syncing');
  console.log('[Sync] Inizio sincronizzazione...');

  const allItems = [];
  let errorCount = 0;

  try {
    // 1. Spells
    console.log('[Sync] Scaricamento lista spells...');
    const spells = await dndApi.fetchSpells();
    
    console.log(`[Sync] Scaricamento dettagli per ${spells.length} spells (concorrenza: ${config.concurrencyLimit})...`);
    
    const spellPromises = spells.map(spell => {
      return limit(async () => {
        try {
          const data = await dndApi.fetchSpellDetails(spell.index);
          const school = data.school?.name || 'Unknown';
          
          allItems.push({
            id: data.index,
            name: data.name,
            type: 'spell',
            description: formatter.formatSpellDescription(data),
            shortDescription: `School: ${school}.`,
            metaInfo: `Spell (${school})`,
            isFavorite: false
          });
        } catch (e) {
          console.error(`[Sync] Errore spell ${spell.index}:`, e.message);
          errorCount++;
        }
      });
    });

    // Aspetta che tutte le spell siano scaricate
    await Promise.all(spellPromises);

    // 2. Monsters
    console.log('[Sync] Scaricamento lista monsters...');
    const monsters = await dndApi.fetchMonsters();
    
    console.log(`[Sync] Scaricamento dettagli per ${monsters.length} monsters (concorrenza: ${config.concurrencyLimit})...`);
    
    const monsterPromises = monsters.map(monster => {
      return limit(async () => {
        try {
          const data = await dndApi.fetchMonsterDetails(monster.index);
          
          const size = data.size || '';
          const mType = data.type || '';
          const alignment = data.alignment || '';
          const hp = data.hit_points || '?';
          const acList = data.armor_class;
          const ac = acList && acList.length > 0 ? acList[0].value || '?' : '?';
          
          const shortDesc = `${size} ${mType}, ${alignment}. HP: ${hp}. AC: ${ac}`;
          
          allItems.push({
            id: data.index,
            name: data.name,
            type: 'monster',
            description: formatter.formatMonsterDetails(data),
            shortDescription: shortDesc,
            metaInfo: `Mostro (${mType})`,
            isFavorite: false
          });
        } catch (e) {
          console.error(`[Sync] Errore mostro ${monster.index}:`, e.message);
          errorCount++;
        }
      });
    });

    // Aspetta che tutti i mostri siano scaricati
    await Promise.all(monsterPromises);

    // Aggiorna la cache e salva su file
    cache.updateCache(allItems, {
      syncStatus: 'idle',
      lastError: errorCount > 0 ? `${errorCount} errori durante il sync` : null
    });
    
    console.log(`[Sync] Sincronizzazione completata! Totale elementi: ${allItems.length}`);
  } catch (e) {
    console.error('[Sync] Errore critico durante il sync:', e.message);
    cache.setSyncStatus('error', e.message);
  }
}

module.exports = {
  runSync
};
