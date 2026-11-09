const assert=require('assert/strict'),vm=require('vm'),fs=require('fs'),path=require('path'),{screen,extract}=require('./presentation.cjs');
const s=screen('MJ',true),w=s.w,ctx=s.dom.getInternalVMContext();try{
 for(const name of ['stopCombatStatsSubscription','disposeHighPNJScroll','resetLocalCombatVisualState','resetMadnessPresentation','updateMadnessVisibility'])w[name]=()=>{};
 vm.runInContext(extract('game.js','cleanupTransientGameUI'),ctx);
 let old=0,fresh=0;w.enqueueSharedVisual('pending',()=>old++,1000);w.cleanupTransientGameUI();s.clock.tick(10000);assert.equal(old,0);assert.equal(w.__sharedVisualBusy,false);
 w.enqueueSharedVisual('fresh',()=>fresh++,1000);s.clock.tick(100);assert.equal(fresh,1);w.cancelSharedVisuals();w.enqueueSharedVisual('new',()=>fresh++,20000);s.clock.tick(2000);assert.equal(fresh,2);assert.equal(w.__sharedVisualBusy,true);w.cancelSharedVisuals();assert.equal(w.__sharedVisualBusy,false);
 w._showDiceAnimationNow('greg',12,12,12);s.clock.tick(500);w.cleanupTransientGameUI();s.clock.tick(10000);assert.equal(s.dice.length,0);assert.equal(w.document.getElementById('diceResult').style.display,'none');assert.equal(w.__cancelDicePresentation,null);
 const pnj=vm.runInContext('ALLY_PNJS.find(p=>p.id==="thor")',ctx);let completed=0;w._allyInvocationCinematic(pnj,pnj.actions[0],'mob',()=>completed++);s.clock.tick(700);assert(w.document.getElementById('allyCinScreen'));w.cleanupTransientGameUI();s.clock.tick(20000);assert(!w.document.getElementById('allyCinScreen'));assert.equal(completed,0);assert.equal(w.__cancelAllyPresentation,null);assert.equal(s.errors.length,0);
 vm.runInContext('if(getMobAttacksForMob("ELO PION","weak").length!==2)throw Error("Elo attacks missing")',ctx);
 console.log('OK queued/reset, active timer isolation, dice and ally cancellation, no late effect; Elo custom attacks');
}finally{s.close()}
