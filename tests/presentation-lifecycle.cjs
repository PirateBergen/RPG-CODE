const assert=require('assert/strict'),vm=require('vm'),fs=require('fs'),path=require('path'),{screen,extract}=require('./presentation.cjs');
const s=screen('MJ',true),w=s.w,ctx=s.dom.getInternalVMContext();try{
 for(const name of ['stopCombatStatsSubscription','disposeHighPNJScroll','resetLocalCombatVisualState','resetMadnessPresentation','updateMadnessVisibility'])w[name]=()=>{};
 vm.runInContext(extract('game.js','cleanupTransientGameUI'),ctx);
 let old=0,fresh=0;w.enqueueSharedVisual('pending',()=>old++,1000);w.cleanupTransientGameUI();s.clock.tick(10000);assert.equal(old,0);assert.equal(w.__sharedVisualBusy,false);
 w.enqueueSharedVisual('fresh',()=>fresh++,1000);s.clock.tick(100);assert.equal(fresh,1);w.cancelSharedVisuals();w.enqueueSharedVisual('new',()=>fresh++,20000);s.clock.tick(2000);assert.equal(fresh,2);assert.equal(w.__sharedVisualBusy,true);w.cancelSharedVisuals();assert.equal(w.__sharedVisualBusy,false);
 w._showDiceAnimationNow('greg',12,12,12);s.clock.tick(500);w.cleanupTransientGameUI();s.clock.tick(10000);assert.equal(s.dice.length,0);assert.equal(w.document.getElementById('diceResult').style.display,'none');assert.equal(w.__cancelDicePresentation,null);
 const pnj=vm.runInContext('ALLY_PNJS.find(p=>p.id==="thor")',ctx);let completed=0;w._allyInvocationCinematic(pnj,pnj.actions[0],'mob',()=>completed++);s.clock.tick(700);assert(w.document.getElementById('allyCinScreen'));w.cleanupTransientGameUI();s.clock.tick(20000);assert(!w.document.getElementById('allyCinScreen'));assert.equal(completed,0);assert.equal(w.__cancelAllyPresentation,null);assert.equal(s.errors.length,0);
 vm.runInContext('if(getMobAttacksForMob("ELO PION","weak").length!==2)throw Error("Elo attacks missing")',ctx);

 // Une portée remplacée ne peut plus rappeler un effet, écouter une touche ou relancer un son.
 w.cancelSharedVisuals();let delayed=0,pressed=0,paused=0
 const sound=w.document.createElement('audio');sound.pause=()=>paused++
 const oldScope=w.createPresentationScope('__cancelLifecycleProbe');oldScope.audio(sound);oldScope.later(()=>delayed++,20);oldScope.every(()=>delayed++,10);oldScope.frame(()=>delayed++);oldScope.listen(w.document,'keydown',()=>pressed++)
 const freshScope=w.createPresentationScope('__cancelLifecycleProbe');oldScope.cancel();assert.equal(w.__cancelLifecycleProbe,freshScope.cancel)
 oldScope.later(()=>delayed++,1);oldScope.every(()=>delayed++,1);oldScope.frame(()=>delayed++);oldScope.listen(w.document,'keydown',()=>pressed++)
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Space'}));s.clock.tick(100);assert.equal(delayed,0);assert.equal(pressed,0);assert.equal(paused,1);w.cancelSharedVisuals();assert.equal(w.__presentationScopes.size,0)

 for(const name of ['showFlySwarmEffect','resetFlySwarmPresentation'])vm.runInContext(extract('ui.js',name),ctx)
 vm.runInContext(extract('exploration.js','clearFlySwarmVisuals'),ctx)
 w.document.getElementById('thuumUnlockScreen').style.display='none'
 w.showFlySwarmEffect();s.clock.tick(400);assert.equal(w.document.querySelectorAll('.fly-particle').length,50)
 w.resetFlySwarmPresentation();w.clearFlySwarmVisuals();s.clock.tick(12000);assert.equal(w.document.getElementById('thuumUnlockScreen').style.display,'none');assert.equal(w.document.querySelectorAll('.fly-particle,#flySwarmOverlay').length,0);assert.equal(w.__cancelFlySwarm,null)
 w.showFlySwarmEffect();w.resetFlySwarmPresentation();s.clock.tick(600);assert.equal(w.document.getElementById('thuumUnlockScreen').style.display,'flex');w.cancelMapPresentations();s.clock.tick(10000);assert.equal(w.document.getElementById('thuumUnlockScreen').style.display,'none')
 w.showFlySwarmEffect();w.resetFlySwarmPresentation();s.clock.tick(600);w.showFlySwarmEffect();s.clock.tick(10000);assert(w.document.getElementById('flySwarmOverlay'));assert.equal(w.document.getElementById('thuumUnlockScreen').style.display,'none');w.resetFlySwarmPresentation();s.clock.tick(9000);assert.equal(w.__cancelFlySwarm,null);assert.equal(w.__presentationScopes.size,0)

 vm.runInContext(require('fs').readFileSync(require('path').join(__dirname,'../pika-combat.js'),'utf8'),ctx)
 w.COMBAT_MOBS=['mob','mob2','mob3'];w.presentPikaAttack({pikaKind:'endikaki',actor:'ju',target:'mob',attack:'Endikaki'});s.clock.tick(3300);w.cancelSharedVisuals();s.clock.tick(10000);assert.equal(w.document.querySelectorAll('.endikaki-intro,.endikaki-bomb-token,.endikaki-blast').length,0);assert.equal(w.__cancelEndikakiPresentation,null)
 w.presentPikaAttack({pikaKind:'laugh'});w.cancelSharedVisuals();assert.equal(w.document.querySelectorAll('.pika-attack-effect').length,0)
 w.showMobSpecialAttackEvent({mobName:'valkyrie',attack:'Test',animation:'fire'});s.clock.tick(200);w.cancelSharedVisuals();s.clock.tick(10000);assert.equal(w.document.querySelectorAll('.mobSpecialOverlay').length,0);assert.equal(w.__cancelMobSpecialPresentation,null)

 let shakes=0;const shake=w.screenShake;w.screenShake=()=>shakes++
 w.showPlayerSpecialCinematic('greg',{name:'Spéciale'},{mode:'damage',amount:20,targetName:'Loup'},{crit:true});w.cancelSharedVisuals();s.clock.tick(10000);assert.equal(shakes,0);assert.equal(w.document.querySelectorAll('.playerSpecialOverlay').length,0);assert.equal(w.__cancelPlayerSpecial,null);w.screenShake=shake
 vm.runInContext(extract('character-effects.js','presentFlyBlessing'),ctx)
 w.currentMap='chapelle.jpg';w.presentFlyBlessing({id:'queued-before-move',time:w.Date.now()});w.currentMap='foret.jpg';s.clock.tick(100);assert.equal(w.document.querySelectorAll('.flyBlessingScene').length,0);w.cancelSharedVisuals()
 w.resolveAudioPath=file=>'audio/'+file;w.playCharacterPowerSound({file:'test.mp3',fadeAt:2000},{fadeIn:true});s.clock.tick(100);w.cancelSharedVisuals();s.clock.tick(10000);assert.equal(w.__cancelCharacterPowerSound,null)

 for(const name of ['showEndSessionPresentation','startEndSession'])vm.runInContext(extract('game.js',name),ctx)
 const updates=[];w.db={ref:()=>({set:()=>Promise.resolve(),update:value=>{updates.push(value);return Promise.resolve()}})}
 w.startEndSession();s.clock.tick(1000);w.startEndSession();s.clock.tick(3800);assert.equal(w.document.getElementById('endSessionBg').style.display,'block')
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Escape'}));assert.equal(updates.length,1);assert.equal(w.document.getElementById('endSessionBg').style.display,'none');assert.equal(w.__cancelEndSession,null)
 w.startEndSession();s.clock.tick(100);w.cleanupTransientGameUI();s.clock.tick(5000);assert.equal(w.document.getElementById('endSessionBg').style.display,'none');w.document.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Space'}));assert.equal(updates.length,1);assert.equal(w.__presentationScopes.size,0)
 console.log('OK annulation des délais, images, sons et touches ; essaim interrompu/repris ; Pika, spéciales monstres et fin de session sans effet tardif');
}finally{s.close()}
