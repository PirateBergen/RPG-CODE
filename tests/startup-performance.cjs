const fs=require('fs'),assert=require('assert/strict'),acorn=require('acorn'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
function definition(file,name){const s=read(file),n=acorn.parse(s,{ecmaVersion:'latest'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return s.slice(n.start,n.end)}
function screen(html=''){return new JSDOM(html,{url:'https://performance.test',runScripts:'outside-only'})}
function panels(){
 const d=screen(),w=d.window;let reads=0,builds=0;
 Object.assign(w,{isGM:true,combatActive:true,MOB_SLOTS:['mob','mob2','mob3'],activeMobSlots:{mob:true},db:{ref(){return{once(_,cb){reads++;cb({val:()=>({hp:50})})}}}},buildMobSubPanel(mob,slot){builds++;const e=w.document.createElement('div');e.dataset.slot=slot;e.textContent=mob.hp;return e}});
 w.eval(definition('ui.js','renderAllMobPanels'));
 const c={id:'fight',turnState:{round:1},mob:{name:'garde',hp:50,maxHP:100}};
 w.renderAllMobPanels(c);const original=w.document.getElementById('mobAttackPanel');original.style.left='100px';original.style.display='none';
 for(let i=0;i<100;i++)w.renderAllMobPanels({...c,hits:{[i]:{damage:2}},turnState:{round:1,currentActorId:i%2?'greg':'mob'}});
 assert.equal(builds,1);assert.equal(reads,0);assert.equal(w.document.getElementById('mobAttackPanel'),original);assert.equal(original.style.display,'none');assert.equal(original.style.left,'100px');
 w.renderAllMobPanels({...c,mob:{...c.mob,hp:30,specialUsed:true}});assert.equal(builds,2);assert.notEqual(w.document.getElementById('mobAttackPanel'),original);
 w.renderAllMobPanels({...c,turnState:{round:2}});assert.equal(builds,3);
 w.isGM=false;w.renderAllMobPanels({...c,turnState:{round:2}});assert.equal(builds,4);
 w.document.getElementById('mobAttackPanel').remove();w.renderAllMobPanels(c);assert.equal(builds,5);
 w.renderAllMobPanels();assert.equal(reads,1);
 w.combatActive=false;w.renderAllMobPanels(c);assert.equal(w.document.getElementById('mobAttackPanel'),null);
 d.window.close();console.log('OK 100 mises à jour de tour/journal : une construction, zéro relecture ; PV, round, rôle et retrait actualisés');
}
function tokens(){
 const d=screen('<div id="greg" style="left:0;top:0"></div><div id="stats_greg"></div><div id="hp_greg"></div>'),w=d.window;let reads=0;
 Object.assign(w,{combatActive:false,selected:null,_state:{},lastHP:{},cameraZoom:1,getMaxHP:()=>100,isCharacterOverweight:()=>({weight:0,maxWeight:100,overweight:false}),updateTokenGlow(){},startBloodEffect(){},stopBloodEffect(){},readCharacter(id,cb){reads++;cb({val:()=>({hp:80,lvl:2})})}});
 w.eval(definition('game.js','updateTokenFromDB')+'\n'+definition('game.js','updateTokenStats'));
 for(let i=0;i<100;i++)w.updateTokenFromDB({key:'greg',val:()=>({x:i,y:i,facing:0})});
 assert.equal(reads,0);assert.equal(w.document.getElementById('greg').style.left,'99px');
 w.updateTokenStats('greg',{hp:45,lvl:3});assert.equal(reads,0);assert(w.document.getElementById('stats_greg').textContent.includes('45/100'));
 w.updateTokenStats('greg');assert.equal(reads,1);assert(w.document.getElementById('stats_greg').textContent.includes('80/100'));
 d.window.close();console.log('OK 100 déplacements : zéro lecture de fiche ; statistiques reçues réutilisées et lecture explicite conservée');
}
async function startup(){
 const d=screen('<button id="startButton"><span class="btn-inner">CONTINUER</span></button>'),w=d.window;let release,calls=0,starts=0,fail=false;
 const root={roles:{gm:'gm'},game:{}},s=read('src/interface/session/entrance.js'),n=acorn.parse(s,{ecmaVersion:'latest'}).body.find(n=>n.type==='ExpressionStatement'&&n.expression.left?.name==='startGame');assert(n);
 Object.assign(w,{gameStarted:false,persistenceRevision:'initial',entranceStartAttempt:null,__entryConfirmed:true,__authUid:'gm',__authRole:'gm',__entranceEpoch:0,requireActionConnection(){},showNotification(){},queueEntranceJoin(){},db:{ref:()=>({push:()=>({key:'launch'})})},combatClone:structuredClone,entranceOriginalStartGame(){starts++;w.gameStarted=true},transactCombatRoot:async cb=>{calls++;await new Promise(r=>release=r);if(fail)throw Error('offline');const next=cb(root);return {committed:!!next}}});
 w.eval(s.slice(n.start,n.end));
 let pending=w.startGame();await w.startGame();assert.equal(calls,1);assert(w.document.getElementById('startButton').disabled);release();await pending;assert.equal(starts,1);assert(!w.document.getElementById('startButton').disabled);
 w.gameStarted=false;pending=w.startGame();w.__entranceEpoch++;release();await pending;assert.equal(starts,1);
 pending=w.startGame();w.__authUid='other';release();await pending;assert.equal(starts,1);w.__authUid='gm';
 fail=true;pending=w.startGame();release();await pending;assert(!w.document.getElementById('startButton').disabled);assert.equal(w.entranceStartAttempt,null);
 fail=false;pending=w.startGame();release();await pending;assert.equal(starts,2);assert.equal(w.document.querySelector('.btn-inner').textContent,'CONTINUER');
 d.window.close();console.log('OK lancement différé : clics répétés bloqués, ancienne identité/session ignorée, erreur récupérable');
}
(async()=>{panels();tokens();await startup()})().catch(e=>{console.error(e);process.exitCode=1});
