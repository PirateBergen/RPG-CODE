const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../config.js'),'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
for(let level=2;level<=99;level++){const gain=run('getEquipmentLevelBonus('+level+')-getEquipmentLevelBonus('+(level-1)+')');assert(gain>=1&&gain<=3)}
for(const [level,bonus] of [[1,0],[5,4],[6,6],[7,7],[10,12],[15,22],[16,25],[20,35]])assert.equal(run('getEquipmentLevelBonus('+level+')'),bonus);
assert.equal(run('getShopStats({id:"custom",category:"arme",scaling:0,baseStats:"Force +8"},40)'),'Force +8');
console.log('OK progression every level, expected brackets, maximum +3 per level, custom items unchanged');
