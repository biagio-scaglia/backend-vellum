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

  // 1. Spells
  try {
    console.log('[Sync] Scaricamento lista spells...');
    const spells = await dndApi.fetchSpells();
    
    console.log(`[Sync] Scaricamento dettagli per ${spells.length} spells...`);
    
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

    await Promise.all(spellPromises);
    // Salva il progresso parziale
    cache.updateCache(allItems, { syncStatus: 'syncing' });
  } catch (e) {
    console.error('[Sync] Errore critico spells:', e.message);
    errorCount++;
  }

  // 2. Monsters
  try {
    console.log('[Sync] Scaricamento lista monsters...');
    const monsters = await dndApi.fetchMonsters();
    
    console.log(`[Sync] Scaricamento dettagli per ${monsters.length} monsters...`);
    
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

    await Promise.all(monsterPromises);
    // Salva il progresso parziale
    cache.updateCache(allItems, { syncStatus: 'syncing' });
  } catch (e) {
    console.error('[Sync] Errore critico monsters:', e.message);
    errorCount++;
  }

  // 3. Magic Items
  try {
    console.log('[Sync] Scaricamento lista magic items...');
    const items = await dndApi.fetchMagicItems();
    console.log(`[Sync] Scaricamento dettagli per ${items.length} magic items...`);
    const itemPromises = items.map(item => {
      return limit(async () => {
        try {
          const data = await dndApi.fetchMagicItemDetails(item.index);
          allItems.push({
            id: data.index,
            name: data.name,
            type: 'item',
            description: data.desc ? (Array.isArray(data.desc) ? data.desc.join('\n\n') : data.desc.toString()) : 'No description.',
            shortDescription: 'Magic Item',
            metaInfo: 'Magic Item',
            isFavorite: false
          });
        } catch (e) {
          console.error(`[Sync] Errore item ${item.index}:`, e.message);
          errorCount++;
        }
      });
    });
    await Promise.all(itemPromises);
    // Salva il progresso parziale
    cache.updateCache(allItems, { syncStatus: 'syncing' });
  } catch (e) {
    console.error('[Sync] Errore critico items:', e.message);
    errorCount++;
  }

  // 4. Classes
  try {
    console.log('[Sync] Scaricamento lista classes...');
    const classes = await dndApi.fetchClasses();
    console.log(`[Sync] Scaricamento dettagli per ${classes.length} classes...`);
    const classPromises = classes.map(c => {
      return limit(async () => {
        try {
          const data = await dndApi.fetchClassDetails(c.index);
          allItems.push({
            id: data.index,
            name: data.name,
            type: 'class',
            description: `Hit Die: d${data.hit_die || '?'}\n\nProficiencies: ${data.proficiencies?.map(p => p.name).join(', ') || 'None'}`,
            shortDescription: 'Class',
            metaInfo: 'Class',
            isFavorite: false
          });
        } catch (e) {
          console.error(`[Sync] Errore classe ${c.index}:`, e.message);
          errorCount++;
        }
      });
    });
    await Promise.all(classPromises);
    // Salva il progresso parziale
    cache.updateCache(allItems, { syncStatus: 'syncing' });
  } catch (e) {
    console.error('[Sync] Errore critico classes:', e.message);
    errorCount++;
  }

  // 5. Races
  try {
    console.log('[Sync] Scaricamento lista races...');
    const races = await dndApi.fetchRaces();
    console.log(`[Sync] Scaricamento dettagli per ${races.length} races...`);
    const racePromises = races.map(r => {
      return limit(async () => {
        try {
          const data = await dndApi.fetchRaceDetails(r.index);
          allItems.push({
            id: data.index,
            name: data.name,
            type: 'race',
            description: `Speed: ${data.speed || '?'}\nSize: ${data.size || '?'}\n\nAlignment: ${data.alignment || 'None'}\n\nTraits: ${data.traits?.map(t => t.name).join(', ') || 'None'}`,
            shortDescription: 'Race',
            metaInfo: 'Race',
            isFavorite: false
          });
        } catch (e) {
          console.error(`[Sync] Errore razza ${r.index}:`, e.message);
          errorCount++;
        }
      });
    });
    await Promise.all(racePromises);
  } catch (e) {
    console.error('[Sync] Errore critico races:', e.message);
    errorCount++;
  }

  // Aggiorna la cache finale
  cache.updateCache(allItems, {
    syncStatus: 'idle',
    lastError: errorCount > 0 ? `${errorCount} errori durante il sync` : null
  });
  
  console.log(`[Sync] Sincronizzazione completata! Totale elementi: ${allItems.length}`);
}

module.exports = {
  runSync
};
