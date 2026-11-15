const assert=require('assert/strict'),vm=require('vm'),engine=require('./combat.cjs'),{combatSandbox}=require('./combat-simulation.cjs');
const ctx=combatSandbox(),clone=x=>JSON.parse(JSON.stringify(x));let serial=0;
function fixture(){const root=engine.fixture('mob');delete root.combat.mob2;root.combat.balanceVersion=3;root.combat.mob=clone(ctx.calibratedCombatMob('kraken','boss',10));root.combat.mob.chargingSpecial={name:ctx.getMobSpecialAttack('kraken','boss').name,readyRound:1};const ts=root.combat.turnState;ts.order=ts.order.filter(p=>p.id!=='mob2');ts.participants=clone(ts.order);ts.currentIndex=3;for(const c of Object.values(root.characters)){c.hp=1000;c.defense=0}return root}
function adjust(root,change,uid='gm',id='adjust-'+(++serial)){return clone(ctx.applyCombatReactionAdjustment(root,uid,root.combat.id,'initial',{slot:'mob',chargeKey:ctx.combatChargeKey(root.combat.mob),...change},id))}
function start(root=fixture(),participants=['greg','ju']){return adjust(root,{kind:'start',participants,dice:12,threshold:8,successReduction:50})}
function change(root,values){return adjust(root,{reactionId:root.combat.mob.chargingSpecial.reaction.id,...values})}
function act(root,kind,actor,payload,roll=6,max=12,uid='gm'){
 const id='action-'+(++serial);engine.request(root,kind,actor,payload,uid,id);return {root:engine.reduce(root,id,engine.seedFor(roll,max)),id};
}
function roll(root,actor='greg',natural=9,uid='g'){return act(root,'initiative',actor,{slot:'mob',reactionId:root.combat.mob.chargingSpecial.reaction.id},natural,12,uid)}
function attack(root){return act(root,'enemy','mob',{attack:ctx.getMobSpecialAttack('kraken','boss').name,target:'all'})}
let count=0;function test(name,fn){fn();console.log('OK '+name);count++}
test('Création MJ uniquement, personnages vivants uniques et paramètres validés',()=>{
 assert.throws(()=>start(fixture(),[]),/Choisissez/);assert.throws(()=>start(fixture(),['greg','greg']),/Choisissez/);assert.throws(()=>adjust(fixture(),{kind:'start',participants:['greg'],dice:12,threshold:8,successReduction:50},'g'),/MJ/);
 assert.throws(()=>adjust(fixture(),{kind:'start',participants:['greg'],dice:100,threshold:8,successReduction:50}),/D6/);
 const root=fixture();root.characters.greg.hp=0;assert.throws(()=>start(root,['greg']),/vivant/);
 const next=start();assert.equal(next.combat.turnState.sequence,0);assert.equal(next.combat.turnState.currentActorId,'mob');assert(Object.values(next.game.sessionLog).some(e=>e.text.includes('Réactions ouvertes')));
});
test('Un jet par joueur sélectionné, sans tour ni jauge consommés',()=>{
 const root=start(),before=clone(root.characters),first=roll(root,'greg',12),next=first.root,reaction=next.combat.mob.chargingSpecial.reaction;
 assert.equal(next.combatRequests[first.id].status,'done');assert.equal(reaction.rolls.greg.roll,12);assert.equal(reaction.rolls.greg.success,true);assert.equal(next.combat.turnState.sequence,0);assert.deepEqual(next.characters,before);assert.deepEqual(next.combat.turnState.rolls,root.combat.turnState.rolls);
 const second=roll(next);assert.equal(second.root.combatRequests[second.id].status,'failed');assert.equal(second.root.combat.mob.chargingSpecial.reaction.rolls.greg.roll,12);
 const forged=roll(root,'ju',9,'g');assert.equal(forged.root.combatRequests[forged.id].status,'failed');
 const unselected=roll(root,'elo',9,'e');assert.equal(unselected.root.combatRequests[unselected.id].status,'failed');
});
test('Attaque retenue jusqu’à validation ; décision sans jet possible',()=>{
 let root=start();const blocked=attack(root);assert.equal(blocked.root.combatRequests[blocked.id].status,'failed');assert.deepEqual(blocked.root.characters,root.characters);
 assert.throws(()=>change(root,{kind:'finish'}),/manque/);
 root=change(root,{kind:'decision',target:'greg',amount:25});root=change(root,{kind:'decision',target:'ju',amount:100});root=change(root,{kind:'finish'});assert.equal(root.combat.mob.chargingSpecial.reaction.status,'ready');
 const later=roll(root);assert.equal(later.root.combatRequests[later.id].status,'failed');
});
test('Réussite et échec proposés ; le MJ garde la priorité',()=>{
 let root=start();root=roll(root,'greg',12).root;root=roll(root,'ju',1,'y').root;
 const finish=change(root,{kind:'finish'});assert.equal(finish.combat.mob.chargingSpecial.reaction.decisions.greg,50);assert.equal(finish.combat.mob.chargingSpecial.reaction.decisions.ju,0);
 root=change(root,{kind:'decision',target:'ju',amount:100});assert.equal(change(root,{kind:'finish'}).combat.mob.chargingSpecial.reaction.decisions.ju,100);
});
test('25/100 % réellement appliqués et consommés sur la spéciale uniquement',()=>{
 let root=start();root=change(root,{kind:'decision',target:'greg',amount:25});root=change(root,{kind:'decision',target:'ju',amount:100});root=change(root,{kind:'finish'});
 const normal=clone(root);delete normal.combat.mob.chargingSpecial.reaction;
 const baseline=attack(normal),next=attack(root);assert.equal(next.root.combatRequests[next.id].status,'done');
 const damage=normal.characters.greg.hp-baseline.root.characters.greg.hp;assert.equal(root.characters.greg.hp-next.root.characters.greg.hp,Math.round(damage*.75));assert.equal(next.root.characters.ju.hp,root.characters.ju.hp);assert(next.root.characters.elo.hp<root.characters.elo.hp);assert(!next.root.combat.mob.chargingSpecial);
 assert(Object.values(next.root.game.sessionLog).some(e=>e.text.includes('protection −25')));
});
test('Attaque ordinaire n’utilise pas la protection réservée ; annulation explicite',()=>{
 let root=start();root=change(root,{kind:'decision',target:'greg',amount:100});root=change(root,{kind:'decision',target:'ju',amount:100});root=change(root,{kind:'finish'});
 const normal=act(root,'enemy','mob',{attack:ctx.getMobAttacksForMob('kraken','boss')[0].name,target:'greg'});assert(normal.root.characters.greg.hp<root.characters.greg.hp);assert(normal.root.combat.mob.chargingSpecial.reaction);
 const canceled=change(root,{kind:'cancel'});assert(!canceled.combat.mob.chargingSpecial.reaction);const resolved=attack(canceled);assert.equal(resolved.root.combatRequests[resolved.id].status,'done');
});
test('Sauvegarde garde les dés et protections ; ancien événement et ancienne session refusés',()=>{
 const root=roll(start(),'greg',10).root,saved=clone(root);assert.equal(saved.combat.mob.chargingSpecial.reaction.rolls.greg.roll,10);
 assert.throws(()=>adjust(root,{kind:'finish',reactionId:'ancien'}),/changé/);assert.throws(()=>ctx.applyCombatReactionAdjustment(root,'gm','autre','initial',{slot:'mob',kind:'cancel'},'stale'),/changé/);
 const old=fixture(),legacy=attack(old);assert.equal(legacy.root.combatRequests[legacy.id].status,'done');
});
test('Une décision peut être corrigée avant la frappe, sans relancer les dés',()=>{
 let root=roll(start(fixture(),['greg']),'greg',12).root;root=change(root,{kind:'finish'});assert.equal(root.combat.mob.chargingSpecial.reaction.decisions.greg,50);
 root=change(root,{kind:'reopen'});assert.equal(attack(root).root.characters.greg.hp,root.characters.greg.hp);root=change(root,{kind:'decision',target:'greg',amount:100});root=change(root,{kind:'finish'});
 assert.equal(root.combat.mob.chargingSpecial.reaction.rolls.greg.roll,12);assert.equal(root.combat.mob.chargingSpecial.reaction.decisions.greg,100);
});
test('Évitement total annule aussi un effet secondaire',()=>{
 const original=ctx.getMobSpecialAttack;try{
  ctx.getMobSpecialAttack=(...args)=>({...original(...args),effect:'stun'});
  let root=start(fixture(),['greg']);root=change(root,{kind:'decision',target:'greg',amount:100});root=change(root,{kind:'finish'});
  const request={id:'stun-check',kind:'enemy',actor:'mob',uid:'gm',sequence:0,time:Date.now(),payload:{attack:original('kraken','boss').name,target:'greg'}};
  const result=ctx.resolveEnemyCombatAction(root,request,()=>6);assert.equal(result.amount,0);assert.equal(root.characters.greg.hp,1000);assert(!root.combat.heroStuns?.greg);
 }finally{ctx.getMobSpecialAttack=original}
});
console.log(count+' contrôles de réactions réussis');
