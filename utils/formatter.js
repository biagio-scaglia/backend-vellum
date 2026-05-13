function formatMonsterDetails(data) {
  let buffer = '';
  buffer += `ARMOR CLASS: ${data.armor_class?.[0]?.value || '?'}\n`;
  buffer += `HIT POINTS: ${data.hit_points || '?'}\n`;
  
  if (data.speed) {
    const speedStr = JSON.stringify(data.speed).replace(/[\{\}"]/g, '').replace(/:/g, ': ');
    buffer += `SPEED: ${speedStr}\n`;
  }
  buffer += '\n';
  
  buffer += `STR: ${data.strength} | DEX: ${data.dexterity} | CON: ${data.constitution} | INT: ${data.intelligence} | WIS: ${data.wisdom} | CHA: ${data.charisma}\n\n`;

  if (data.special_abilities && data.special_abilities.length > 0) {
    buffer += 'ABILITIES\n';
    for (const ab of data.special_abilities) {
      buffer += `• ${ab.name}: ${ab.desc}\n\n`;
    }
  }

  if (data.actions && data.actions.length > 0) {
    buffer += 'ACTIONS\n';
    for (const ac of data.actions) {
      buffer += `• ${ac.name}: ${ac.desc}\n\n`;
    }
  }

  return buffer;
}

function formatSpellDescription(data) {
  if (!data.desc) return 'Nessuna descrizione.';
  return Array.isArray(data.desc) ? data.desc.join('\n\n') : data.desc.toString();
}

module.exports = {
  formatMonsterDetails,
  formatSpellDescription
};
