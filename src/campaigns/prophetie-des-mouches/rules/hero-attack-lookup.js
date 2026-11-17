function getCombatHeroAttack(actor,name,special=false){if(special)return getPlayerSpecialAttack(actor);const list=actor==="bibi"?[attacks.greg.find(a=>a.name==="Le Bibi")]:attacks[actor]||[];return list.find(a=>a?.name===name)}

// Retired preparations are discarded, never replayed as attacks.
