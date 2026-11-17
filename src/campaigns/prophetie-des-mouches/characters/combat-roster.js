const COMBAT_HEROES = ["greg", "ju", "elo"]
const COMBAT_MOBS = ["mob", "mob2", "mob3"]
const COMBAT_CHARACTERS = [...COMBAT_HEROES, "bibi"]
function recordHeroCritical(root,actor,crit,fail){
 if(!COMBAT_HEROES.includes(actor)||!root.characters?.[actor])return
 const c=root.characters[actor]
 if(crit)c.corruption=Math.min(10,combatInt(c.corruption)+1)
 if(fail)c.curse=Math.min(8,combatInt(c.curse)+1)
}
