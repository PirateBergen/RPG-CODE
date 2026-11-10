const assert=require('assert/strict'),{fixture,request,reduce}=require('./combat.cjs');
let checked=0;
for(const uid of ['gm','g'])for(const kind of ['free','armIntervention','resolveIntervention','refreshIntervention','dismissIntervention']){
 const root=fixture('greg'),before=JSON.parse(JSON.stringify(root));request(root,kind,uid==='gm'?'mj':'greg',{amount:999,pendingId:'old',revision:0},uid,'retired');const next=reduce(root,'retired');assert.equal(next.combatRequests.retired.status,'failed',kind+' '+uid);assert.deepEqual(next.characters,before.characters);assert.deepEqual(next.combat.turnState,before.combat.turnState);assert.equal(next.combat.mob.hp,before.combat.mob.hp);checked++;
}
console.log('OK '+checked+' anciennes commandes refusées pour MJ et joueur, sans dégâts ni consommation de tour.');
