const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

const BASE_URL = 'https://www.dnd5eapi.co/api';
const FILE_PATH = path.join(__dirname, 'compendium.json');

// Cache in memoria
let compendiumCache = [];
let isSyncing = false;

// Carica da file se esiste
if (fs.existsSync(FILE_PATH)) {
  try {
    compendiumCache = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    console.log(`Caricati ${compendiumCache.length} elementi dal file locale.`);
  } catch (e) {
    console.error('Errore lettura file cache:', e.message);
  }
}

// Funzione per scaricare tutto
async function syncCompendium() {
  if (isSyncing) return;
  isSyncing = true;
  console.log('Inizio sincronizzazione con D&D API...');
  
  const allItems = [];
  
  try {
    // 1. Spells
    console.log('Scaricamento spells...');
    const spellsResp = await axios.get(`${BASE_URL}/spells`);
    const spells = spellsResp.data.results;
    
    for (const spell of spells) {
      try {
        const detail = await axios.get(`${BASE_URL}/spells/${spell.index}`);
        const data = detail.data;
        const school = data.school?.name || 'Unknown';
        
        allItems.push({
          id: data.index,
          name: data.name,
          type: 'spell',
          description: data.desc ? (Array.isArray(data.desc) ? data.desc.join('\n\n') : data.desc.toString()) : 'Nessuna descrizione.',
          shortDescription: `School: ${school}.`,
          metaInfo: `Spell (${school})`,
          isFavorite: false
        });
        console.log(`Spell scaricata: ${data.name}`);
      } catch (e) {
        console.error(`Errore spell ${spell.index}:`, e.message);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 2. Monsters
    console.log('Scaricamento monsters...');
    const monstersResp = await axios.get(`${BASE_URL}/monsters`);
    const monsters = monstersResp.data.results;
    
    for (const monster of monsters) {
      try {
        const detail = await axios.get(`${BASE_URL}/monsters/${monster.index}`);
        const data = detail.data;
        
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
          description: formatMonsterDetails(data),
          shortDescription: shortDesc,
          metaInfo: `Mostro (${mType})`,
          isFavorite: false
        });
        console.log(`Mostro scaricato: ${data.name}`);
      } catch (e) {
        console.error(`Errore mostro ${monster.index}:`, e.message);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    compendiumCache = allItems;
    fs.writeFileSync(FILE_PATH, JSON.stringify(allItems, null, 2));
    console.log(`Sincronizzazione completata! Totale elementi: ${allItems.length} (Salvati su file)`);
  } catch (e) {
    console.error('Errore durante il sync:', e.message);
  } finally {
    isSyncing = false;
  }
}

function formatMonsterDetails(data) {
  let buffer = '';
  buffer += `ARMOR CLASS: ${data.armor_class?.[0]?.value || '?'}\n`;
  buffer += `HIT POINTS: ${data.hit_points || '?'}\n`;
  
  if (data.speed) {
    buffer += `SPEED: ${JSON.stringify(data.speed).replaceAll('{', '').replaceAll('}', '')}\n`;
  }
  buffer += '\n';
  
  buffer += `STR: ${data.strength} | DEX: ${data.dexterity} | CON: ${data.constitution} | INT: ${data.intelligence} | WIS: ${data.wisdom} | CHA: ${data.charisma}\n\n`;

  if (data.special_abilities) {
    buffer += 'ABILITIES\n';
    for (const ab of data.special_abilities) {
      buffer += `• ${ab.name}: ${ab.desc}\n\n`;
    }
  }

  if (data.actions) {
    buffer += 'ACTIONS\n';
    for (const ac of data.actions) {
      buffer += `• ${ac.name}: ${ac.desc}\n\n`;
    }
  }

  return buffer;
}

// Endpoints
app.get('/api/compendium', (req, res) => {
  if (compendiumCache.length === 0 && !isSyncing) {
    syncCompendium(); // Avvia in background se vuoto
    return res.json({ status: 'syncing', message: 'Il backend sta popolando la cache. Riprova tra poco.' });
  }
  res.json(compendiumCache);
});

app.get('/api/sync', (req, res) => {
  syncCompendium();
  res.json({ status: 'started', message: 'Sincronizzazione avviata in background.' });
});

app.listen(PORT, () => {
  console.log(`Backend in ascolto sulla porta ${PORT}`);
  // Avvia il sync al boot solo se la cache è vuota
  if (compendiumCache.length === 0) {
    syncCompendium();
  } else {
    console.log('Cache già presente (caricata da file). Salto il sync iniziale.');
  }
});
