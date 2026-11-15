const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),engine=require('./combat.cjs'),{combatSandbox}=require('./combat-simulation.cjs');
const ctx=combatSandbox(),clone=x=>JSON.parse(JSON.stringify(x));vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../exploration-core.js'),'utf8'),ctx);let checks=0;
function fixture(){const root=engine.fixture();delete root.combat;root.characters.greg.chance=999;root.characters.greg.lvl=5;return root}
function roll(root,max=20,natural=8,options={diceKind:'chance'},actor='greg',uid='g',id='die'){
 root=clone(root);root.explorationRequests||={};root.explorationRequests[id]={uid,actor,kind:'dice',payload:{max,...options},status:'queued',time:Date.now()};return clone(ctx.reduceExplorationRequest(root,id,engine.seedFor(natural,max)));
}
function test(name,fn){fn();checks++;console.log('OK '+name)}
test('Chance sur tous les dés : calcul autoritaire et bonus borné',()=>{
 for(const max of [4,6,8,10,12,20,100]){const next=roll(fixture(),max,2),entry=next.diceRoll.die;assert.equal(next.explorationRequests.die.status,'done');assert.equal(entry.diceKind,'chance');assert.equal(entry.rawRoll,2);assert(entry.bonus>=0&&entry.bonus<=2);assert.equal(entry.result,entry.rawRoll+entry.bonus);assert(entry.result<max);assert(Object.values(next.game.sessionLog).some(e=>e.text.includes('Chance D'+max)))}
});
test('Échec/critique naturels, jauges sans faux critique',()=>{
 for(const natural of [1,19,20]){const root=fixture();root.characters.greg.curse=0;root.characters.greg.corruption=0;const next=roll(root,20,natural),entry=next.diceRoll.die;assert.equal(entry.bonus,0);assert.equal(entry.result,natural);assert.equal(next.characters.greg.curse,natural===1?1:0);assert.equal(next.characters.greg.corruption,natural===20?1:0)}
 const next=roll(fixture(),20,18);assert.equal(next.diceRoll.die.result,19);assert.equal(next.characters.greg.corruption,0);
});
test('Équipement et bonus temporaires comptés, fiche inchangée',()=>{
 const root=fixture();root.characters.greg.chance=0;root.characters.greg.inventaire='Arc\n+100 chance';const next=roll(root);assert.equal(next.diceRoll.die.bonus,2);assert.deepEqual(next.characters.greg,root.characters.greg);
 const combat=engine.fixture();combat.combat.balanceVersion=3;combat.characters.greg.chance=0;combat.combat.heroBuffs={greg:{stat:'chance',amount:100,turns:3}};assert.equal(roll(combat).diceRoll.die.bonus,2);
});
test('Jet libre historique conservé ; aucune initiative modifiée',()=>{
 const root=engine.fixture();const before=clone(root.combat.turnState),next=roll(root,12,7,{});assert.equal(next.diceRoll.die.result,7);assert.equal(next.diceRoll.die.diceKind,undefined);assert.deepEqual(next.combat.turnState,before);assert.equal(roll(root,12,7).diceRoll.die.diceKind,'chance');assert.deepEqual(roll(root,12,7).combat.turnState,before);
});
test('Ni statistique cumulée, ni bonus client, ni faux type Initiative',()=>{
 for(const options of [{diceKind:'chance',stat:'chance'},{diceKind:'initiative'}])assert.equal(roll(fixture(),20,8,options).explorationRequests.die.status,'failed');
 const next=roll(fixture(),20,8,{diceKind:'chance',bonus:999,result:10000});assert.equal(next.diceRoll.die.result,10);
});
test('Propriété du personnage et présence de la fiche revalidées',()=>{
 assert.equal(roll(fixture(),20,8,{diceKind:'chance'},'greg','y').explorationRequests.die.status,'failed');assert.equal(roll(fixture(),20,8,{diceKind:'chance'},'MJ','gm').explorationRequests.die.status,'failed');
 const root=fixture();delete root.characters.greg;assert.equal(roll(root).explorationRequests.die.status,'failed');
 const gm=roll(fixture(),20,8,{diceKind:'chance'},'greg','gm');assert.equal(gm.explorationRequests.die.status,'done');
});
test('Rejeu et sauvegarde : un seul résultat conservé',()=>{
 const root=roll(fixture());assert.equal(ctx.reduceExplorationRequest(root,'die',12345),undefined);assert.equal(clone(root).diceRoll.die.bonus,2);const busy=fixture();busy.sessionControl={phase:'saving'};assert.equal(roll(busy).explorationRequests.die.status,'failed');
});
console.log(checks+' contrôles des types de dés réussis');
