const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../config.js'),'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
for(let level=2;level<=99;level++){const gain=run('getEquipmentLevelBonus('+level+')-getEquipmentLevelBonus('+(level-1)+')');assert(gain>=1&&gain<=3)}
for(const [level,bonus] of [[1,0],[5,4],[6,6],[7,7],[10,12],[15,22],[16,25],[20,35]])assert.equal(run('getEquipmentLevelBonus('+level+')'),bonus);
assert.equal(run('getShopStats({id:"custom",category:"arme",scaling:0,baseStats:"Force +8"},40)'),'Force +8');
console.log('OK progression every level, expected brackets, maximum +3 per level, custom items unchanged');
for(const id of ['greg','ju','elo','bibi'])for(const [level,capacity]of [[1,100],[7,100],[8,120],[15,120],[16,140],[23,140],[24,160],[99,340]]){
 assert.equal(run('getMaxCarryWeight('+JSON.stringify(id)+','+level+')'),capacity);
 assert.equal(run('getPlayerStatsAtLevel('+JSON.stringify(id)+','+level+').poids'),capacity);
}
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/runtime/characters/token-synchronization.js'),'utf8'),ctx);
ctx.record={lvl:8,carriedWeight:120,poids:100};assert.equal(run('isCharacterOverweight("elo",record).overweight'),false);
ctx.record.carriedWeight=120.1;assert.equal(run('isCharacterOverweight("elo",record).overweight'),true);
ctx.record={lvl:7,carriedWeight:101,poids:999};assert.equal(run('isCharacterOverweight("greg",record).overweight'),true);
ctx.record.lvl=8;assert.equal(run('isCharacterOverweight("greg",record).overweight'),false);
ctx.window={};vm.runInContext(fs.readFileSync(path.join(__dirname,'../utils.js'),'utf8').split('function inferNotificationType')[0],ctx);
for(const [level,weight,allowed]of [[7,100,false],[8,100,true],[8,106,false],[16,125,true]]){
 ctx.root={game:{balrogSword:{status:'available',combatId:'loot'}},profiles:{g:{playerId:'greg'}},heroAssignments:{greg:{uid:'g'}},characters:{greg:{lvl:level,inventaire:'Sac ('+weight+')'},bibi:{lvl:1,inventaire:''}}};
 const claim='resolveBalrogSwordRequest(root,{actor:"greg",uid:"g",payload:{operation:"claim",holder:"greg",combatId:"loot"}})';
 if(allowed){run(claim);assert(ctx.root.characters.greg.inventaire.includes('Épée mystérieuse'))}else assert.throws(()=>run(claim),/dépasse/);
}
console.log('OK capacité +20 aux niveaux 8/16/24 pour tous, anciennes fiches, surcharge stricte et épée du Balrog');
