const kingSceneImageCache=new Map()
const KING_SCENE_TITLES={intro:"La Couronne qui refuse le destin",sentence:"Sentence royale",blood:"Le tribut de sang",schnaw:"Mes sujets vous dévoreront",sweep:"Personne ne décide de mon destin",aurora:"Turn Around",odin:"L’appel des aurores"}
function loadKingSceneImages(scene){
 const files={roi:"roi.png",chnaw:"chnaw.png",odin:"odin.png",hel:"hel.png",nidhogg:"nhiddog.png",greg:"greg pion.png",elo:"ELO PION.png",pika:"pika-token.svg",bibi:"bibi.png",arena:"roi-salle-du-trone.jpg"}
 const wanted=["roi","arena",...(scene==="intro"?[]:["greg","elo","pika","bibi"]),...(scene==="schnaw"?["chnaw"]:[]),...(scene==="odin"?["odin"]:[])]
 return Promise.all(wanted.map(key=>{if(kingSceneImageCache.has(key))return kingSceneImageCache.get(key);const promise=new Promise(resolve=>{
  const file=files[key]
  const img=new Image();img.decoding="async";img.onload=()=>{const thumb=document.createElement("canvas"),scale=Math.min(1,(key==="arena"?960:480)/Math.max(img.naturalWidth,img.naturalHeight));thumb.width=Math.max(1,Math.round(img.naturalWidth*scale));thumb.height=Math.max(1,Math.round(img.naturalHeight*scale));thumb.getContext("2d").drawImage(img,0,0,thumb.width,thumb.height);thumb.complete=true;resolve([key,thumb])};img.onerror=()=>{kingSceneImageCache.delete(key);resolve([key,null])};img.src="images/"+file
 });kingSceneImageCache.set(key,promise);return promise})).then(Object.fromEntries)
}
const kingSceneClosures=new Map()
function isKingIntroPending(data=window.__combatSnapshot){
 if(!isKingEncounter(data?.mob))return false
 if(window.__kingIntroPresentationId===data.id)return true
 const opening=Object.values(data.kingEvents||{}).find(event=>event.phase===1)
 return !!opening&&opening.time>=(window.__pageLoadTime||0)&&!data.kingSceneDismissals?.["king-"+opening.id]&&!kingSceneClosures.get(data.id)?.["king-"+opening.id]
}
function observeKingSceneClosures(data){
 const opening=Object.values(data.kingEvents||{}).find(event=>event.phase===1),key=opening?"king-"+opening.id:null,newlyClosed=key&&data.kingSceneDismissals?.[key]&&!kingSceneClosures.get(data.id)?.[key]
 kingSceneClosures.set(data.id,data.kingSceneDismissals||{})
 if(kingSceneClosures.size>3)kingSceneClosures.delete(kingSceneClosures.keys().next().value)
 window.__kingSceneClosed?.(data.id,data.kingSceneDismissals||{})
 if(newlyClosed&&!isKingIntroPending(data)&&combatActive&&typeof renderCombatInitiativeOverlay==="function")renderCombatInitiativeOverlay(data.turnState)
}
function presentKingScene(result){
 const scene=result.kingScene||result.scene||"intro",combatId=window.__combatSnapshot?.id
 const sceneId=result.kingSceneId
 if(kingSceneClosures.get(combatId)?.[sceneId])return Promise.resolve()
 let resolveClosed;const completed=new Promise(resolve=>{resolveClosed=resolve})
 const gm=window.__authRole==="gm"||(!window.__authRole&&isGM)
 const overlay=document.createElement("div"),stage=document.createElement("section"),title=document.createElement("h2"),canvas=document.createElement("canvas"),caption=document.createElement("p"),outcome=document.createElement("p"),close=document.createElement("button")
 overlay.id="kingScene";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",KING_SCENE_TITLES[scene]||"Le Roi")
 stage.className="kingSceneStage";title.textContent=result.kingRelease?"Une aurore est libérée":(result.kingWarning?"Préparation — ":"")+(scene==="strike"?result.attack:KING_SCENE_TITLES[scene]||"Le Roi");canvas.width=960;canvas.height=600;canvas.setAttribute("role","img");canvas.setAttribute("aria-label",title.textContent);outcome.textContent=result.explanation||result.message||"";close.textContent="Fermer — Échap";close.type="button"
 outcome.hidden=!!result.kingWarning
 stage.append(title,canvas,caption,outcome,close);overlay.append(stage);document.body.append(overlay)
 const onField=scene!=="intro"&&scene!=="odin"
 if(onField){overlay.classList.add("kingOnField");overlay.classList.toggle("kingPreparing",!!result.kingWarning);overlay.setAttribute("role","region");overlay.removeAttribute("aria-modal");overlay.append(canvas);canvas.className="kingFieldCanvas"}
 const shakenNodes=new Set()
 let voicePlaying=scene==="intro",pendingClose=false
 const finish=()=>{if(window.__kingIntroPresentationId===combatId)delete window.__kingIntroPresentationId;for(const node of shakenNodes)node.classList.remove("kingImpactShake");if(window.__kingIntroAudioCombatId===combatId)delete window.__kingIntroAudioCombatId;window.GameWindows?.closed(overlay);if(window.__kingSceneClosed===onClosed)window.__kingSceneClosed=null;if(scene==="intro"&&kingSceneClosures.get(combatId)?.[sceneId]&&combatActive&&window.__combatSnapshot?.id===combatId&&typeof renderCombatInitiativeOverlay==="function")renderCombatInitiativeOverlay(window.__combatSnapshot.turnState);resolveClosed()},scope=createPresentationScope("__cancelKingScene",finish);scope.node(overlay)
 const onClosed=(id,closed)=>{if(id===combatId&&closed[sceneId]){if(voicePlaying)pendingClose=true;else scope.cancel()}};window.__kingSceneClosed=onClosed
 const requestClose=async()=>{
  if(!gm||close.disabled||voicePlaying)return
  if(!sceneId){scope.cancel();return}
  close.disabled=true
  try{requireActionAccess({gmOnly:true});requireExplorationConnection();const uid=window.__authUid,revision=persistenceRevision||"initial";const tx=await reliableRootTransaction(root=>applyKingSceneDismissal(root,uid,combatId,revision,sceneId));if(!tx.committed)throw Error("Fermeture non confirmée");scope.cancel()}
  catch(error){outcome.textContent=error.message;close.disabled=false}
 }
 close.textContent=gm?"Continuer — fermer pour tous (Échap)":"En attente du MJ";close.disabled=!gm;close.onclick=requestClose
 scope.listen(overlay,"keydown",e=>{if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();requestClose()}})
 window.GameWindows?.register(overlay,requestClose);close.focus({preventScroll:true})
 const milliseconds=result.kingWarning||result.kingRelease||result.kingTransition?3500:scene==="odin"?8500:7000
 if(scene==="intro"){
  window.__kingIntroPresentationId=combatId
  if(typeof closeCombatInitiativeOverlay==="function")closeCombatInitiativeOverlay();document.getElementById("combatInitiativeToggle")?.remove()
  caption.hidden=!!outcome.textContent
  window.__kingIntroAudioCombatId=combatId;stopAllMusic();close.disabled=true;close.textContent="Entrée du Roi — lecture en cours…"
  const portrait=scope.node(document.createElement("img"));portrait.className="kingIntroPortrait";portrait.src="images/roi.png";portrait.alt="Le Roi";canvas.hidden=true;stage.hidden=true;overlay.classList.add("kingIntroOnly");overlay.append(portrait)
  const voice=scope.audio(new Audio("audio/roi.mp3"));setManagedAudioBaseVolume(voice,1)
  const smoke=scope.node(document.createElement("div"));smoke.className="kingIntroSmoke";smoke.setAttribute("aria-hidden","true")
  for(let i=0;i<6;i++){const puff=document.createElement("span");puff.style.setProperty("--puff",i);smoke.append(puff)}
  let fading=false,fadeTimer=null
  const revealText=()=>{
   if(scope.cancelled||!voicePlaying)return
   clearInterval(fadeTimer);setManagedAudioBaseVolume(voice,0);voice.pause();portrait.remove();smoke.remove();stage.hidden=false;overlay.classList.remove("kingIntroOnly")
   voicePlaying=false;if(window.__kingIntroAudioCombatId===combatId)delete window.__kingIntroAudioCombatId
   close.disabled=!gm;close.textContent=gm?"Continuer — fermer pour tous (Échap)":"En attente du MJ"
   if(window.__combatSnapshot?.id===combatId&&combatActive)crossfadeMusic("audio/worldboss.mp3",{fadeInMs:5000})
   if(pendingClose)scope.cancel()
  }
  const beginFade=()=>{
   if(scope.cancelled||!voicePlaying||fading)return;fading=true;portrait.classList.add("is-fading");overlay.append(smoke)
   const started=performance.now();fadeTimer=scope.every(()=>{if(!voicePlaying)return;const progress=Math.min(1,(performance.now()-started)/1600);setManagedAudioBaseVolume(voice,(1+Math.cos(progress*Math.PI))/2)},40)
   scope.later(revealText,1600)
  }
  scope.listen(voice,"ended",beginFade);scope.listen(voice,"error",beginFade)
  let started=false;const start=()=>{if(started||scope.cancelled)return;started=true;voice.play().then(()=>{if(!scope.cancelled&&voicePlaying)scope.later(beginFade,14400)}).catch(beginFade)}

  scope.listen(portrait,"load",start);scope.listen(portrait,"error",beginFade);if(portrait.complete&&portrait.naturalWidth>0)start()
 }
 if(onField){
  let impactShown=false
  const heavy=result.mode==="enemy"&&result.special&&!result.kingWarning
  const impact=()=>{if(impactShown||!heavy)return;impactShown=true;if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return;const flash=scope.node(document.createElement("div"));flash.className="kingAttackFlash";overlay.append(flash);const camera=document.getElementById("camera")||document.getElementById("map"),tokens=document.getElementById("combatTokens");for(const node of [camera,tokens]){if(!node||node===tokens&&camera?.contains(tokens))continue;node.classList.add("kingImpactShake");shakenNodes.add(node)}scope.later(()=>{flash.remove();for(const node of shakenNodes)node.classList.remove("kingImpactShake");shakenNodes.clear()},800)}
  const sounds=new Set(),sound=id=>{if(sounds.has(id))return;sounds.add(id);if(id==="pow"||id==="crystal")impact();const file={pow:"pow.mp3",crystal:"cristalfx.mp3",schnaw:"chnaws.mp3",rumble:"tremblement.mp3"}[id];if(!file)return;const audio=scope.audio(new Audio("audio/"+file));setManagedAudioBaseVolume(audio,id==="rumble"?(heavy?.35:.14):result.kingWarning?.2:heavy?.65:.35,"effects");audio.play().catch(()=>{})}
  const draw=createKingFieldRenderer(canvas,{...result,scene},text=>{caption.textContent=text},sound),reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const finalTime=result.kingWarning?2:reduced?4:9,started=performance.now();let last=0,held=false
  const hold=()=>{if(held)return;held=true;scope.every(()=>{if(window.__combatSnapshot?.id!==combatId){scope.cancel();return}draw(finalTime)},250)}
  if(["sentence","schnaw","sweep","aurora"].includes(scene))sound("rumble")
  if(reduced||result.kingTransition||result.kingRelease){draw(finalTime);hold()}
  else {const tick=now=>{if(scope.cancelled)return;if(window.__combatSnapshot?.id!==combatId){scope.cancel();return}const elapsed=(now-started)/1000;if(now-last>=32){last=now;draw(result.kingWarning?Math.min(2,elapsed):Math.min(9,elapsed*9/(milliseconds/1000)))}if(elapsed*1000<milliseconds)scope.frame(tick);else hold()};scope.frame(tick)}
 }
 else loadKingSceneImages(scene).then(images=>{
  if(scope.cancelled||window.__combatSnapshot?.id!==combatId)return
  if(["sentence","schnaw","sweep","aurora"].includes(scene)){const rumble=scope.audio(new Audio("audio/tremblement.mp3"));setManagedAudioBaseVolume(rumble,.18,"effects");rumble.play().catch(()=>{})}
  const fired=new Set(),sound=(id)=>{if(fired.has(id))return;fired.add(id);const file={pow:"pow.mp3",schnaw:"chnaws.mp3",crystal:"cristalfx.mp3"}[id];if(!file)return;const audio=scope.audio(new Audio("audio/"+file));setManagedAudioBaseVolume(audio,id==="pow"?(result.kingWarning?.2:.35):.4,"effects");audio.play().catch(()=>{})}
  const data={...result,scene,kingLights:result.kingLights??result.lights??0},draw=createKingSceneRenderer(canvas,images,data,text=>{if((scene!=="intro"||!outcome.textContent)&&caption.textContent!==text)caption.textContent=text},sound),reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if(reduced&&result.kingWarning&&scene==="sentence")sound("pow")
  if(result.kingTransition||result.kingRelease){draw(scene==="intro"?4:5.5);if(scene!=="intro")caption.textContent=result.message||caption.textContent;return}
  if(reduced){draw(result.kingWarning?2:9.5);return}
  const started=performance.now();let last=0
  const tick=now=>{if(scope.cancelled)return;if(window.__combatSnapshot?.id!==combatId){scope.cancel();return}const seconds=(now-started)/1000;if(now-last>=32){last=now;draw(result.kingWarning?Math.min(4,seconds):Math.min(12,seconds*12/(milliseconds/1000)))}if(seconds*1000<milliseconds)scope.frame(tick)}
  scope.frame(tick)
 })
 return completed
}
function observeKingScenes(data){
 for(const event of Object.values(data.kingEvents||{}).sort((a,b)=>a.time-b.time)){
  if(!Number.isFinite(event.time)||event.time<(window.__pageLoadTime||0))continue
  const phase=event.phase,scene=phase?(phase===1?"intro":KING_PHASES[phase-1].scene):event.scene
  enqueueSharedVisual("king-"+event.id,()=>presentKingScene({...event,kingScene:scene,kingSceneId:"king-"+event.id,kingTransition:!!phase,kingLights:event.lights||0}),phase||event.kingRelease?3600:scene==="odin"?8600:7100,phase===1?-10:1.5)
 }
}
function renderKingBattlefield(){
 const c=window.__combatSnapshot,slot=typeof currentKingSlot==="function"?currentKingSlot():null,host=document.getElementById("combatTokens")
 let overlay=document.getElementById("kingBattlefield")
 if(!combatActive||!slot||!host){overlay?.remove();return}
 const mob=c[slot],phase=kingStage(mob),signature=JSON.stringify([c.id,phase,mob.king.pillars,mob.king.auroras,mob.king.refugesConfirmed,mob.king.refugeTargets,mob.chargingSpecial?.id])
 if(overlay?.dataset.signature===signature)return
 if(phase===2)loadKingSceneImages("schnaw").catch(()=>{})
 if(phase===5)loadKingSceneImages("odin").catch(()=>{})
 overlay?.remove();overlay=document.createElement("div");overlay.id="kingBattlefield";overlay.dataset.signature=signature;overlay.setAttribute("aria-label","Repères du combat du Roi");host.prepend(overlay)
 if(phase===5&&kingAuroraCount(mob)>0){const sky=document.createElement("div");sky.className="kingFreedSky";sky.setAttribute("aria-label","Les aurores libérées illuminent le ciel");overlay.append(sky)}
 const marker=(name,cls,x,y,text)=>{const node=document.createElement("div");node.className=cls;node.style.left=x+"%";node.style.top=y+"%";node.dataset.kingMarker=name;const label=document.createElement("span");label.textContent=text;node.append(label);overlay.append(node)}

 if(phase===2)for(let i=0;i<2;i++)marker("ritual-"+i,"kingRitual",24+i*50,40,"Rituel Schnaw")
 if(phase===5&&mob.chargingSpecial?.kingStage===5){for(let i=0;i<3;i++)marker("aurora-"+i,"kingAuroraMarker"+(mob.king.auroras?.[i]?" is-released":""),20+i*30,38,"Aurore "+(i+1)+(mob.king.auroras?.[i]?" libérée":""));marker("refuge","kingRefuge",50,72,mob.king.refugesConfirmed?"Refuges validés par le MJ":"Refuge — validation MJ")}
}

function createKingSceneRenderer(canvas,images,result,setCaption,onSound){
 const c=canvas.getContext("2d"),state={scene:result.scene,lights:result.kingLights||0,defense:result.kingProtected||result.success?"yes":"no"},targetX=({greg:315,ju:440,elo:565,bibi:650})[result.targets?.[0]]||440;let t=0;const playing=true;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},fade=(a,b)=>ease((t-a)/(b-a));
 function cue(id,time){if(t>=time)onSound(id)}
 function glow(x,y,r,color,alpha=1){c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
 function line(points,color,width=2,alpha=1){c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();c.restore()}
 function sprite(name,x,y,h,alpha=1,shadow=null){const im=images[name];if(!im||!im.complete)return;c.save();c.globalAlpha=alpha;if(shadow){c.shadowColor=shadow;c.shadowBlur=22}const w=h*im.width/im.height;c.drawImage(im,x-w/2,y-h,w,h);c.restore()}
 function ring(x,y,rx,ry,color,a=1){c.save();c.globalAlpha=a;c.strokeStyle=color;c.lineWidth=3;c.shadowColor=color;c.shadowBlur=18;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();c.restore()}
 function particles(color,n,cx,cy,spread,progress){c.save();c.fillStyle=color;for(let i=0;i<n;i++){const a=i*2.399,rad=((i*17)%100)/100*spread*(.3+progress);c.globalAlpha=(1-progress)*(.4+(i%5)/10);c.beginPath();c.arc(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.65-progress*70,1+(i%3),0,Math.PI*2);c.fill()}c.restore()}
 function crown(x,y,size,color,broken=false){const pts=[[-1,.2],[-1,-.4],[-.45,-.05],[0,-.8],[.45,-.05],[1,-.4],[1,.2],[-1,.2]].map(([a,b])=>[x+a*size,y+b*size]);line(pts,color,3);if(broken)line([[x-8,y-size*.6],[x+5,y-7],[x-2,y+7]],'#f5eee5',3)}
 function auroras(strength=1,center=220){c.save();c.globalCompositeOperation='screen';const cols=['#63ffc2','#649bff','#ce79ff'];for(let k=0;k<3;k++){const cy=center-70+k*58;for(let j=0;j<5;j++){c.globalAlpha=strength*(.19-j*.027);c.fillStyle=cols[k];c.beginPath();for(let x=0;x<=960;x+=12){const y=cy+Math.sin(x/190+t*.6+k*.35)*31;c.lineTo(x,y-j*5)}for(let x=960;x>=0;x-=12){const y=cy+Math.sin(x/190+t*.6+k*.35)*31;c.lineTo(x,y+14+j*5)}c.closePath();c.fill()}}c.restore()}
 function mist(color,power=.5){for(let i=0;i<9;i++)glow(((i*143+t*16)%1200)-100,470+Math.sin(i+t*.3)*40,160,color,power*.28)}
 function players(y=480,safe=false){[315,440,565].forEach((x,i)=>{glow(x,y+4,36,safe?'#7effc4':'#8c6eaa',.3);ring(x,y,27,10,safe?'#8eeedb':'#b8a78b',.6);if(i!==1)sprite(i===0?'greg':'elo',x,y,58,1);else{c.fillStyle='#9dcbd2';c.beginPath();c.arc(x,y-24,19,0,Math.PI*2);c.fill();sprite('pika',x,y+2,55)}});ring(650,y,21,8,safe?'#8eeedb':'#b8a78b',.6);sprite('bibi',650,y,44)}
 function caption(text){setCaption(text)}
 function draw(){
  const sc=state.scene,success=state.defense==='yes';c.clearRect(0,0,960,600);c.fillStyle='#0a0a12';c.fillRect(0,0,960,600);
  const arena=images.arena;if(arena?.complete){c.save();c.globalAlpha=.37;c.drawImage(arena,0,0,960,600);c.restore()}
  const shade=c.createLinearGradient(0,0,0,600);shade.addColorStop(0,'#050914e8');shade.addColorStop(.45,'#13111c55');shade.addColorStop(1,'#05070ccc');c.fillStyle=shade;c.fillRect(0,0,960,600);
  const shake=playing&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&t>4.7&&t<5.05?Math.sin(t*85)*3:0;c.save();c.translate(shake,0);
  if(sc==='intro'){
   glow(480,290,260,'#b59a48',.4);sprite('roi',480,470,325*(.94+.06*fade(0,5)));crown(480,125,55,'#dfc783',t>7);particles('#edcf85',50,480,340,220,((t*.08)%1));
   caption(t<5?'« Enfants de mouche… Votre prophétie ne signifie rien. »':'« Personne ne décide de mon destin. »');
  }else if(sc==='strike'){
   sprite('roi',480,315,190);players();glow(targetX,440,75,'#ce344e',Math.max(0,1-Math.abs(t-5)/3));caption(result.attack||'Le Roi attaque');cue('pow',4.5);
  }else if(sc==='sentence'){
   sprite('roi',480,315,190);crown(480,110,30,'#e5c580');players();const aimX=targetX;
   if(t<4.5){line([[480,300],[aimX,480]],'#f06d66',5,.3+.25*Math.sin(t*5));ring(targetX,480,36,13,'#ff7676');crown(targetX,399,20,'#f47676');particles('#ad9785',30,480,320,200,(t*.12)%1);caption(result.kingWarning?(result.message||'Le Roi prépare Sentence royale — '+(result.targets||[]).map(combatFriendlyName).join(', ')+' est visé.'):'Sentence royale');cue('pow',1.4);}
   else{const endY=480;line([[480,300],[aimX,endY]],'#ffad7c',26,clamp(1-(t-4.5)*1.5));line([[480,300],[aimX,endY]],'#fff2bb',7,clamp(1-(t-4.5)*1.5));particles('#edc795',50,aimX,endY,150,clamp((t-4.5)/2));caption(success?'La protection validée par le MJ arrête Sentence royale.':'Sentence royale frappe sa cible.');cue('pow',4.5)}
  }else if(sc==='blood'){
   sprite('roi',480,315,190);players();glow(targetX,450,90,'#d22640',.5);const broken=success&&t>=5;
   if(!broken){const pts=[];for(let i=0;i<=40;i++){const p=i/40;pts.push([480+(targetX-480)*p+Math.sin(p*13-t*5)*9,300+155*p])}line(pts,'#ca2749',7,.8);for(let i=0;i<7;i++){const p=((i/7+t*.28)%1);glow(targetX+(480-targetX)*p,455-155*p,15,'#ff5567',.8)}}else particles('#ff3c67',60,520,375,170,clamp((t-5)/3));
   caption(t<5?'Un lien de sang se tend vers la cible annoncée.':broken?'Le lien éclate · le Roi ne reçoit aucun soin.':'Le sang rejoint la couronne · le Roi se soigne.');cue('crystal',5)
  }else if(sc==='schnaw'){
   sprite('roi',480,315,190);players();mist('#6b1529',.8);[270,690].forEach((x,i)=>{glow(x,360,95,'#c72f49',.5);line([[x-65,385],[x-25,369],[x-5,381],[x+15,356],[x+65,368]],'#ff5d67',3);ring(x,375,68*fade(.5,3),19,'#d84965');const appear=fade(2.5+i*.4,5);sprite('chnaw',x,370,145*appear,appear,'#b42347');if(t>5)particles('#ad6d79',15,x,355,80,clamp((t-5)/3))});
   caption(t<3?'Deux marques apparaissent · le rituel peut être perturbé.':'Les deux Schnaw émergent des fissures.');cue('schnaw',3.7)
  }else if(sc==='sweep'){
   sprite('roi',480,315,190);crown(480,111,35,'#ff707a',true);players();const zones=[210,440,670];zones.forEach((x,i)=>{const fire=4+i*1.2,pre=t<fire,alpha=pre?.12:clamp(1-(t-fire)/1.1)*.8;c.fillStyle=`rgba(224,48,77,${alpha})`;c.fillRect(x-85,310,170,205);line([[x-85,310],[x-85,515],[x+85,515]],'#ca6d78',2,.5);if(!pre&&t<fire+1.1){glow(x,410,160,'#bf244e',.75);line([[x,315],[x,510]],'#ffb4bb',12,.6)}});
   caption(t<4?'Les secteurs annoncent l’ordre du balayage.':t<8?'Les vagues traversent les secteurs successivement.':'Le balayage s’achève · le Roi est exposé.');cue('pow',5.2)
  }else if(sc==='aurora'||sc==='odin'){
   const lights=sc==='odin'?3:Number(state.lights),released=fade(2,6),impact=fade(8,9),rescue=lights>0;
   sprite('roi',480,310,175,1-impact*.25);crown(480,125,40,'#e5b3cf',true);glow(480,142,110,'#b175cd',.28);mist('#11051f',1);
   for(let k=0;k<3;k++){const x=[250,480,710][k],active=k<lights,p=active?released:0;line([[480,140],[x-20,230],[x,355]],active?'#80edce':'#9b739a',3,.2+.6*p);ring(x,360,35+10*p,13,active?'#9affd4':'#947297',.8);if(active){glow(x,340,80,'#67d9b7',.4*p);particles('#bbffe5',18,x,345,70,(t*.1+k*.2)%1)}}
   auroras(released*.75,235);if(rescue){glow(440,466,120+lights*30,'#66e5cb',released*.28);ring(440,480,80+lights*28,25+lights*7,'#9cffe1',released);}
   players(480,rescue&&released>.6);
   if(sc==='odin'&&t>3){const a=fade(3,6);glow(480,280,250,'#a0dbe9',a*.5);line([[480,80],[460,170],[495,200],[480,390]],'#d2fcff',5,a);sprite('odin',480,418,300,a,'#a2ffff')}
   if(t>7.8){c.save();const wy=80+(t-7.8)*210,night=c.createLinearGradient(0,wy-90,0,wy+90);night.addColorStop(0,"transparent");night.addColorStop(.5,"#03010ce0");night.addColorStop(1,"transparent");c.fillStyle=night;c.fillRect(0,wy-90,960,180);c.restore();if(rescue){c.save();c.globalCompositeOperation='screen';const g=c.createRadialGradient(440,480,40,440,480,240);g.addColorStop(0,'#74e7c530');g.addColorStop(.78,'#80d9f277');g.addColorStop(.9,'#b1ffff');g.addColorStop(1,'transparent');c.fillStyle=g;c.beginPath();c.ellipse(440,480,170+lights*18,170+lights*18,0,Math.PI,Math.PI*2);c.lineTo(440+170+lights*18,480);c.closePath();c.fill();c.restore();players(480,true)}cue('pow',8.2);if(t>10)auroras(.8,220)}
   caption(sc==='odin'?(t<5?'Trois aurores libérées · l’appel atteint Odin.':t<8?(result.message||'« Je viens pour les aurores. »'):'Odin canalise les aurores · Turn Around est arrêté.'):(t<3?'La couronne laisse échapper les dernières aurores.':t<7?'Les joueurs libèrent les aurores et ouvrent leurs refuges.':rescue?(lights===3?'Les trois aurores arrêtent Turn Around.':'Le refuge absorbe une partie de Turn Around.'):'Sans aurore libérée · seule subsiste une faible lueur de secours.'));
   cue('crystal',3)
  }else if(sc==='duo'){
   const a=fade(.5,3),strike=fade(7,8);mist('#52335f',1);sprite('roi',620,385,235,1-strike*.25);sprite('hel',300,450,310,a,'#a3a0e2');sprite('nidhogg',650-120*strike,390,245,fade(3,5),'#c3aedc');
   for(let i=0;i<7;i++){const x=530+i*26;line([[x+40,510],[x-15,430],[x+20,390],[620,290]],'#70556f',4,fade(4,7))}
   if(t>7){glow(610,255,180,'#d3b7ff',clamp(1-(t-7)/3));particles('#e4cbff',65,610,250,230,clamp((t-7)/4));crown(620,145,40,'#e9d4ff',true)}
   caption(t<6?'Hel se révèle dans la brume ; Nidhogg approche.':'« Tu portes une couronne. Tu n’en restes pas moins mortel. »');cue('pow',7.5)
  }
  const vig=c.createRadialGradient(480,300,180,480,300,600);vig.addColorStop(0,'transparent');vig.addColorStop(1,'#02030bcf');c.fillStyle=vig;c.fillRect(0,0,960,600);c.restore();
 }

 return seconds=>{t=seconds;draw()}
}

// Effets transparents ancrés aux pions réels : aucune arène ni personnage redessiné.
function createKingFieldRenderer(canvas,result,setCaption,onSound){
 const ctx=canvas.getContext("2d"),scene=result.scene,warning=!!result.kingWarning,fired=new Set()
 const cue=id=>{if(!fired.has(id)){fired.add(id);onSound(id)}}
 const point=id=>{const node=document.getElementById(id==="mob"?"mobToken":id?.startsWith("mob")?"mobToken_"+id:id==="eloSummon"?"eloSummonToken":id);if(!node)return null;const rect=node.getBoundingClientRect();return rect.width>0&&rect.height>0?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,r:Math.max(20,Math.min(rect.width,rect.height)/2)}:null}
 const path=(a,b,color,width,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
 const ring=(p,color,size=1,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*size,p.r*size*.65,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 return seconds=>{
  if(document.hidden)return
  const width=window.innerWidth,height=window.innerHeight,ratio=Math.min(1.5,window.devicePixelRatio||1)
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio)}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height)
  const map=document.getElementById("map")?.getBoundingClientRect();ctx.save();if(map&&map.width>0&&map.height>0){ctx.beginPath();ctx.rect(map.left,map.top,map.width,map.height);ctx.clip()}
  const c=window.__combatSnapshot,mob=c?.[result.kingSlot||"mob"],charge=mob?.chargingSpecial,origin=point(result.kingSlot||"mob"),ids=result.targets?.length?result.targets:charge?.kingTargets||[],targets=ids.map(point).filter(Boolean),pulse=.65+.2*Math.sin(seconds*4)
  if(scene==="sentence"||scene==="strike"||scene==="blood"){
   for(const target of targets){
    ring(target,scene==="blood"?"#db315a":"#ff706a",1.2,pulse)
    if(origin){
     if(scene==="blood"){path(origin,target,"#ad2048",5,pulse);for(let i=0;i<6;i++){const progress=(seconds*.22+i/6)%1;ring({x:target.x+(origin.x-target.x)*progress,y:target.y+(origin.y-target.y)*progress,r:4},"#ff577e",1,.8)}if(seconds>3)cue("crystal")}
     else if(warning){path(origin,target,"#e94c55",2,pulse*.65);if(seconds>=1)cue("pow")}
     else{const major=scene==="sentence",impact=seconds<3?.3:seconds<5.5?1:Math.max(0,1-(seconds-5.5)/1.8);if(major){path(origin,target,"#a71939",seconds<3?10:72,impact*.32);path(origin,target,"#ff3d42",seconds<3?4:38,impact*.6)}path(origin,target,"#ed514c",seconds<3?3:major?24:16,impact);if(seconds>=3){path(origin,target,"#fff1bd",major?10:4,impact);cue("pow");const age=seconds-3;if(major&&age<3){ring({...target,r:target.r+age*75},"#ff9d62",1,Math.max(0,1-age/3));ring({...target,r:target.r+age*50},"#fff2ce",1,Math.max(0,1-age/2));for(let i=0;i<40;i++){const angle=i*2.399,radius=(30+i%9*5)+age*(45+i%7*10),p={x:target.x+Math.cos(angle)*radius,y:target.y+Math.sin(angle)*radius};path(p,{x:p.x+Math.cos(angle)*12,y:p.y+Math.sin(angle)*12},i%3?"#ff824a":"#fff0c4",2,Math.max(0,1-age/3))}}}if(result.kingProtected)ring(target,"#a4e9dc",1.6,.9)}
    }
   }
   setCaption(warning?(result.message||"Le Roi prépare "+(result.attack||"Sentence royale")+"."):(result.attack||KING_SCENE_TITLES[scene]||"Le Roi attaque"))
  }else if(scene==="schnaw"){
   for(const slot of COMBAT_MOBS){const p=point(slot);if(p&&c?.[slot]?.kingMinion){ring(p,"#d24b68",1.5,pulse);ring(p,"#8a214e",1.9,.45)}}cue("schnaw");setCaption(result.message||"Les Schnaw répondent au Roi.")
  }else if(scene==="sweep"){
   if(origin){ctx.save();ctx.strokeStyle="#e84e70";ctx.lineWidth=warning?3:10;ctx.globalAlpha=warning?.35:.7;ctx.shadowColor="#ef335d";ctx.shadowBlur=20;const radius=Math.min(width,height)*.36;ctx.beginPath();ctx.arc(origin.x,origin.y,radius,-Math.PI+(seconds%3)*.5,(seconds%3)*.5);ctx.stroke();ctx.restore()}for(const target of targets)ring(target,"#f57e90",1.3,pulse);if(!warning)cue("pow");setCaption(result.message||"Le refus du destin")
  }else if(scene==="aurora"||scene==="odin"){
   const lights=scene==="odin"?3:result.kingLights||0,colors=["#6ce8ba","#6c9eff","#bf84e8"],bounds=map?.width>0?map:{left:0,top:0,width,height}
   for(let i=0;i<lights;i++){ctx.save();ctx.strokeStyle=colors[i];ctx.lineWidth=18;ctx.shadowColor=colors[i];ctx.shadowBlur=25;ctx.globalAlpha=.35;ctx.beginPath();for(let x=0;x<=bounds.width;x+=12){const y=bounds.top+bounds.height*(.12+i*.07)+Math.sin(x/130+seconds*.5+i)*18;ctx.lineTo(bounds.left+x,y)}ctx.stroke();ctx.restore()}
   for(const id of ["greg","ju","elo","bibi","eloSummon"]){const p=point(id);if(p&&(scene==="odin"||mob?.king?.refugeTargets?.includes(id)))ring(p,"#a0efdd",1.7,.8)}cue("crystal");setCaption(result.message||result.explanation||KING_SCENE_TITLES[scene])
  }
  ctx.restore()
 }
}
