const assert=require('assert/strict'),engine=require('./combat.cjs');
function fixture(actor='greg',extras=false){const r=engine.fixture(actor);r.game.map=r.game.combatState.returnMap='bateau.jpg';r.combat.mob.name='jormungand';if(!extras){delete r.combat.mob2;r.combat.turnState.order=r.combat.turnState.order.filter(e=>e.id!=='mob2');r.combat.turnState.participants=r.combat.turnState.order;r.combat.turnState.currentIndex=r.combat.turnState.order.findIndex(e=>e.id===actor)}return r}
function act(root,kind,actor,payload,roll=6,max=12,uid){engine.request(root,kind,actor,payload,uid);return engine.reduce(root,'action-1',engine.seedFor(roll,max))}
for(const roll of [2,6,12]){const r=fixture(),n=act(r,'hero','greg',{attack:'Chat Bite (CaC)',target:'mob'},roll);assert.equal(n.combat.mob.hp,1000);assert.equal(n.combatRequests['action-1'].result.amount,0);assert.equal(n.combat.turnState.currentActorId,'ju')}
console.log('OK melee and critical hits blocked, turn consumed');
{const r=fixture(),n=act(r,'manualDamage','greg',{amount:50000,target:'mob'},6,12,'gm');assert.equal(n.combat.mob.hp,1000);assert.equal(n.combatRequests['action-1'].result.amount,0)}
{const r=fixture('ju'),n=act(r,'hero','ju',{attack:'Rire KRRKRR',target:'mob'},12);assert.equal(n.combat.mob.hp,1000)}
{const r=fixture();r.game.playerAllyAccess={actionId:'odin_gungnir'};const n=act(r,'ally','greg',{pnjId:'odin',actionId:'odin_gungnir',target:'mob'},20,20);assert.equal(n.combat.mob.hp,1000)}
{const r=fixture('mob');r.combat.mob.playerPoison={turns:2,damage:500};r.combat.mob.playerBleed={turns:2,damage:500};const n=act(r,'pass','mob',{},6,12,'gm');assert.equal(n.combat.mob.hp,1000)}
console.log('OK manual damage, Pika magic, Odin and damage over time cannot kill serpent');
for(const roll of [1,10,20]){const r=fixture();r.game.playerAllyAccess={actionId:'thor_mjolnir'};const n=act(r,'ally','greg',{pnjId:'thor',actionId:'thor_mjolnir',target:'mob'},roll,20);assert.equal(n.combat.mob.hp,0);assert.equal(n.combat.mob.defeatedByThor,true);assert.equal(n.combatRequests['action-1'].result.amount,1000);assert.equal(n.combatRequests['action-1'].result.fail,false);assert.equal(n.game.combatOutcome.type,'victory');assert.equal(n.game.defeatedMobs.jormungand,true);assert(!n.game.playerAllyAccess)}
console.log('OK authorized Thor kills on any die including 1, produces victory and consumes grant');
{const r=fixture(),n=act(r,'ally','greg',{pnjId:'thor',actionId:'thor_mjolnir',target:'mob'},10,20);assert.equal(n.combatRequests['action-1'].status,'failed');assert.equal(n.combat.mob.hp,1000)}
{const r=fixture();r.game.map=r.game.combatState.returnMap='prairie.jpg';r.game.playerAllyAccess={actionId:'thor_mjolnir'};const n=act(r,'ally','greg',{pnjId:'thor',actionId:'thor_mjolnir',target:'mob'},10,20);assert.equal(n.combat.mob.hp,1000)}
console.log('OK Thor still requires MJ grant, and cannot kill serpent outside boat');
{const r=engine.fixture();r.game.playerAllyAccess={actionId:'thor_mjolnir'};const n=act(r,'ally','greg',{pnjId:'thor',actionId:'thor_mjolnir',target:'mob'},1,20);assert(n.combat.mob.hp>0);assert.equal(n.combatRequests['action-1'].status,'failed')}
{const r=fixture('greg',true);r.game.playerAllyAccess={actionId:'thor_mjolnir'};const n=act(r,'ally','greg',{pnjId:'thor',actionId:'thor_mjolnir',target:'mob'},15,20);assert.equal(n.combat.mob.hp,0);assert.equal(n.combat.mob2.hp,300)}
console.log('OK Thor keeps ordinary damage on other enemies, including splash');
