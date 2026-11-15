const assert=require('assert/strict'),vm=require('vm'),fs=require('fs'),path=require('path');
const {combatSandbox,runFight,summarize}=require('./combat-simulation.cjs'),engine=require('./combat.cjs');
const ctx=combatSandbox(),clone=x=>JSON.parse(JSON.stringify(x)),evaluate=s=>vm.runInContext(s,ctx);
function fixture(actor='greg',name='kraken',level=10){
 const root=engine.fixture(actor);root.combat.balanceVersion=3;delete root.combat.mob2;
 for(const id of ['greg','ju','elo','bibi']){ctx.hero=id;ctx.level=level;Object.assign(root.characters[id],clone(evaluate('getPlayerStatsAtLevel(hero,level)')),{lvl:level})}
 root.combat.mob=ctx.calibratedCombatMob(name,null,level);Object.assign(root.combat.mob,{x:150,y:100});
 const ts=root.combat.turnState;ts.order=ts.order.filter(p=>p.id!=='mob2');ts.participants=clone(ts.order);ts.currentIndex=ts.order.findIndex(p=>p.id===actor);return root;
}
function action(root,kind,actor,payload,roll=6,max=12,uid='gm'){
 engine.request(root,kind,actor,payload,uid);const next=engine.reduce(root,'action-1',engine.seedFor(roll,max));assert.equal(next.combatRequests['action-1'].status,'done',next.combatRequests['action-1'].error);return next;
}
let checks=0;function test(name,fn){fn();checks++;console.log('OK '+name)}
test('Tous les niveaux et espèces : PV et dégâts finis et progressifs',()=>{
 const names=clone(evaluate('Object.keys(mobStats)'));let previous=0;
 for(let level=1;level<=99;level++){
  const health=ctx.calibratedHealth(level);assert(health>previous);previous=health;
  for(const name of names)for(const count of [1,3]){
   const mob=ctx.calibratedCombatMob(name,null,level,count);assert(mob.hp>=10&&mob.hp===mob.maxHP);assert.equal(mob.balanceVersion,3);
   for(const attack of ctx.getMobAttacksForMob(name,mob.tier)){const range=ctx.getMobDamageRange(attack,mob.lvl,mob.tier,mob);assert(Number.isFinite(range.min)&&range.min>0&&range.max>=range.min)}
  }
 }
});
test('Chance bornée ; échec et critique restent naturels',()=>{
 for(const chance of [0,5,30,999])for(const max of [12,20])for(let natural=1;natural<=max;natural++){
  const r=ctx.calibratedHeroRoll({chance,lvl:1},natural,max);assert(r.bonus>=0&&r.bonus<=2);assert(r.total>=natural&&r.total<=max);
  if(natural===1||natural===max)assert.equal(r.bonus,0);else assert(r.total<max);
 }
 assert(ctx.calibratedHeroRoll({chance:999,lvl:1},6,12).total>6);
});
test('Toutes les statistiques ont un effet borné',()=>{
 const data={lvl:10,chance:5,perspi:5,defense:5};
 assert(ctx.calibratedDefense({...data,defense:100})>ctx.calibratedDefense(data));assert(ctx.calibratedDefense({...data,defense:999})<.4);
 assert.equal(ctx.calibratedIncomingDamage(data,0),0);assert.equal(ctx.calibratedIncomingDamage({...data,defense:999},1),1);
 assert(ctx.calibratedIncomingDamage({...data,defense:100},100)<ctx.calibratedIncomingDamage(data,100));
 assert(ctx.calibratedInitiativeBonus({...data,perspi:100})>ctx.calibratedInitiativeBonus(data));
 assert(ctx.calibratedHypnosisBonus({...data,charme:100})>ctx.calibratedHypnosisBonus({...data,charme:0}));
 for(const attack of clone(evaluate('[...attacks.greg,...attacks.elo]')))assert(ctx.calibratedAttackPower(attack,6,100,{charData:data})>ctx.calibratedAttackPower(attack,6,0,{charData:data}));
 assert(ctx.calibratedPikaKickDamage({...data,force:100},2)>ctx.calibratedPikaKickDamage({...data,force:0},2));
});
test('Initiative : bonus au tri, dé brut validé',()=>{
 const state={phase:"rolling",participants:[{id:'greg',type:'player'},{id:'mob',type:'mob'}],rolls:{greg:5,mob:7},initiativeBonuses:{greg:3,mob:0}};
 const r=ctx.finalizedInitiative(state);assert.equal(r.order[0].id,'greg');assert.equal(r.order[0].roll,5);assert.equal(r.order[0].total,8);state.rolls.greg=13;assert.equal(ctx.finalizedInitiative(state),null);
});
test('Résolveur : chance enregistrée, sans critique artificiel ni double action',()=>{
 const root=fixture();root.characters.greg.chance=999;
 const next=action(root,'hero','greg',{attack:'Chat Bite (CaC)',target:'mob'},10),r=next.combatRequests['action-1'].result;
 assert.equal(r.roll,10);assert.equal(r.rollTotal,11);assert.equal(r.luckBonus,1);assert.equal(r.crit,false);
 engine.request(next,'hero','greg',{attack:'Chat Bite (CaC)',target:'mob'},'gm','duplicate');const replay=engine.reduce(next,'duplicate',engine.seedFor(10,12));assert.equal(replay.combatRequests.duplicate.status,'failed');assert.equal(replay.combat.mob.hp,next.combat.mob.hp);
});
test('Défense appliquée aux dégâts réels',()=>{
 const low=fixture('mob'),high=clone(low);low.characters.greg.defense=0;high.characters.greg.defense=999;
 const payload={attack:ctx.getMobAttacksForMob('kraken','boss')[0].name,target:'greg'};
 assert(action(high,'enemy','mob',payload).characters.greg.hp>action(low,'enemy','mob',payload).characters.greg.hp);
});
test('Hypnose : Charme sur boss ; world boss sur critique naturel',()=>{
 for(const name of ['garde','kraken']){
  const root=fixture('ju',name);if(name==='garde')root.combat.mob=ctx.calibratedCombatMob(name,'boss',10);
  root.characters.ju.charme=999;root.characters.ju.chance=999;
  assert.equal(action(root,'hero','ju',{attack:'Je suis une fille',target:'mob'},8).combatRequests['action-1'].result.hypnotized,name==='garde');
  assert.equal(action(root,'hero','ju',{attack:'Je suis une fille',target:'mob'},12).combatRequests['action-1'].result.hypnotized,true);
 }
});
test('Soin plafonné ; John Pork à 35 % pendant trois rounds',()=>{
 const root=fixture('elo');root.characters.greg.hp-=1;assert.equal(action(root,'hero','elo',{attack:'Mains magiques',target:'greg'},12).characters.greg.hp,ctx.getCharacterMaxHp('greg',root.characters.greg));
 const next=action(fixture('elo'),'hero','elo',{attack:'Je suis jet laguée',target:'mob'});
 assert.equal(next.combat.eloSummon.hp,Math.round(ctx.getCharacterMaxHp('elo',next.characters.elo)*.35));assert.equal(next.combat.eloSummon.maxHP,next.combat.eloSummon.hp);
 for(let n=0;n<3;n++)ctx.tickCombatRound(next,{id:'tick-'+n,time:Date.now()});assert.equal(next.combat.eloSummon,undefined);
});
test('Alliés : dégâts plafonnés, élixir temporaire',()=>{
 const root=fixture(),before=root.characters.greg.force;const pnj=clone(evaluate('ALLY_PNJS.find(p=>p.actions.some(a=>a.id==="witch_elixir"))'));
 const buff=action(root,'ally','greg',{pnjId:pnj.id,actionId:'witch_elixir',target:'greg'},20,20);
 assert.equal(buff.characters.greg.force,before);assert(ctx.combatCharacter(buff,'greg').force>before);
 for(let n=0;n<3;n++)ctx.tickCombatRound(buff,{id:'tick-'+n,time:Date.now()});assert.equal(ctx.combatCharacter(buff,'greg').force,before);
 const damage=action(root,'ally','greg',{pnjId:'melenchon',actionId:'melenchon_bombardment',target:'mob'},20,20);
 assert(damage.combatRequests['action-1'].result.amount<=Math.round(root.combat.mob.maxHP*.4));assert(damage.combat.usedAllies.melenchon_bombardment);
});
test('Jörmungandr reste invulnérable, Thor garde la victoire scénarisée',()=>{
 const root=fixture('greg','jormungand');root.game.map=root.game.combatState.returnMap='bateau.jpg';
 assert.equal(action(root,'hero','greg',{attack:'Chat Bite (CaC)',target:'mob'},12).combat.mob.hp,root.combat.mob.hp);
 const next=action(root,'ally','greg',{pnjId:'thor',actionId:'thor_mjolnir',target:'mob'},1,20);assert.equal(next.combat.mob.hp,0);assert.equal(next.game.combatOutcome.type,'victory');
});
test('Corruption : pouvoir +25 %, deux rounds, consommation unique',()=>{
 vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../character-effects-core.js'),'utf8'),ctx);
 const root=fixture();root.characters.greg.corruption=10;root.characterRequests={p:{uid:'g',actor:'greg',kind:'power',time:Date.now(),status:'queued'}};
 const next=ctx.reduceCharacterRequest(root,'p',10);assert.equal(next.characterRequests.p.status,'done');assert.equal(next.characters.greg.corruption,0);assert.equal(ctx.calibratedOutgoingDamage(next,'greg',100),125);
 ctx.tickCombatRound(next,{id:'tick',time:Date.now()});ctx.tickCombatRound(next,{id:'tick2',time:Date.now()});assert.equal(ctx.calibratedOutgoingDamage(next,'greg',100),100);assert.equal(ctx.reduceCharacterRequest(next,'p',10),undefined);
});
test('Thu’um adapté au niveau et rang, permission consommée',()=>{
 for(const word of ['SKRAA','REIHKT',"SKARO'H"]){const root=fixture();root.game.playerThuum={greg:{[word]:{unlocked:true,rank:3}}};root.game.playerThuumAccess={greg:{[word]:{allowed:true}}};const next=action(root,'thuum','greg',{word,target:'mob'});assert.equal(next.combat.usedThuum.greg[word],true);assert(!next.game.playerThuumAccess.greg[word]);if(word!=="SKARO'H")assert(next.combat.mob.hp<root.combat.mob.hp);else assert.equal(next.combat.heroHaste.remaining,2)}
 assert(ctx.calibratedThuumDamage('SKRAA',3,99).main>ctx.calibratedThuumDamage('SKRAA',1,1).main);
});
test('Anciennes sauvegardes : règles historiques conservées',()=>{
 const root=engine.fixture();delete root.combat.mob2;const next=action(root,'hero','greg',{attack:'Chat Bite (CaC)',target:'mob'});assert.equal(next.combat.balanceVersion,undefined);assert.equal(next.combatRequests['action-1'].result.luckBonus,0);
});
test('Équipement compté une seule fois ; arc renforcé par la Perspicacité',()=>{
 const root=fixture();root.characters.greg.inventaire='Arc\n+15 perspi\n+8 defense';
 const raw=clone(root.characters.greg),effective=ctx.combatCharacter(root,'greg');assert.equal(effective.perspi,raw.perspi+15);assert.equal(effective.defense,raw.defense+8);assert.deepEqual(root.characters.greg,raw);
 const low=clone(root);low.characters.greg.inventaire='Arc';const payload={attack:'I know Frank (si arc)',target:'mob'};
 assert(action(root,'hero','greg',payload).combatRequests['action-1'].result.amount>action(low,'hero','greg',payload).combatRequests['action-1'].result.amount);
});
test('Poison progresse avec le niveau ; soin allié critique ressuscite',()=>{
 const low=action(fixture('elo','kraken',1),'hero','elo',{attack:'Je vais te raconter une histoire',target:'mob'},12);
 const high=action(fixture('elo','kraken',50),'hero','elo',{attack:'Je vais te raconter une histoire',target:'mob'},12);
 assert(high.combat.mob.playerPoison.damage>low.combat.mob.playerPoison.damage);
 const root=fixture();root.characters.elo.hp=0;const next=action(root,'ally','greg',{pnjId:'gardienne',actionId:'gardienne_souffle',target:'elo'},20,20);
 assert.equal(next.characters.elo.hp,ctx.getCharacterMaxHp('elo',root.characters.elo));
});
test('Le pouvoir de Pika renforce aussi le ricochet',()=>{
 const root=fixture('ju');root.combat.mob2=clone(root.combat.mob);
 const normal=action(root,'hero','ju',{attack:'Rire KRRKRR',target:'mob'},12).combatRequests['action-1'].result;
 root.combat.heroPowerBuffs={ju:{turns:2}};
 const boosted=action(root,'hero','ju',{attack:'Rire KRRKRR',target:'mob'},12).combatRequests['action-1'].result;
 assert.equal(boosted.bounceAmount,Math.round(normal.bounceAmount*1.25));assert.equal(boosted.amount,Math.round(normal.amount*1.25));
});
test('Combats reproductibles : durées et absence de blocage',()=>{
 for(const level of [1,10,99])for(const [name,tier]of [['garde','medium'],['golem','high'],['garde','boss'],['kraken','boss']]){const r=summarize(Array.from({length:12},(_,n)=>runFight(ctx,{level,names:[name],tier,version:3,seed:n*7919+1000})));assert.equal(r.errors.length,0);assert.equal(r.timeouts,0);assert(r.medianRounds<=14)}
});
console.log(checks+' contrôles du recalibrage réussis');
