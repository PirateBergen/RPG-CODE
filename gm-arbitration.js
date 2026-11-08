"use strict"
let gmArbitrationCombat=null,gmArbitrationScene=null,gmArbitrationSignature="",gmArbitrationHidden=""
function gmArbitrationPending(){return gmArbitrationCombat?.pendingResolution||gmArbitrationScene}
function gmArbitrationElement(tag,text,parent){const e=document.createElement(tag);if(text!==null)e.textContent=text;if(parent)parent.appendChild(e);return e}
let gmChoiceSequence=0
function gmArbitrationSelect(parent,label,options,value){
 const row=gmArbitrationElement("div",null,parent);row.className="gmChoice"
 const id="gmChoice-"+(++gmChoiceSequence),caption=gmArbitrationElement("span",label||"Règle pour cette cible",row);caption.id=id+"-label"
 const select=gmArbitrationElement("select",null,row);select.hidden=true;select.tabIndex=-1;select.setAttribute("aria-hidden","true")
 for(const [v,t]of options){const o=gmArbitrationElement("option",t,select);o.value=v}select.value=value
 const trigger=gmArbitrationElement("button",null,row);trigger.type="button";trigger.id=id;trigger.className="gmChoiceTrigger";trigger.setAttribute("role","combobox");trigger.setAttribute("aria-haspopup","listbox");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls",id+"-list");trigger.setAttribute("aria-labelledby",caption.id+" "+id)
 const list=gmArbitrationElement("div",null,row);list.id=id+"-list";list.className="gmChoiceList";list.hidden=true;list.setAttribute("role","listbox");list.setAttribute("aria-labelledby",caption.id)
 let active=Math.max(0,select.selectedIndex)
 const items=options.map(([v,t],i)=>{const b=gmArbitrationElement("button",t,list);b.type="button";b.tabIndex=-1;b.id=id+"-option-"+i;b.setAttribute("role","option");b.dataset.value=v;b.addEventListener("pointerdown",e=>e.preventDefault());b.addEventListener("click",()=>commit(i));return b})
 const refresh=()=>{trigger.textContent=select.selectedOptions[0]?.textContent||"Choisir";items.forEach((b,i)=>{b.setAttribute("aria-selected",String(i===select.selectedIndex));b.classList.toggle("gmChoiceActive",i===active)});if(!list.hidden)trigger.setAttribute("aria-activedescendant",items[active]?.id||"")}
 const close=()=>{list.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.removeAttribute("aria-activedescendant")};row.__closeChoice=close
 const open=()=>{for(const other of parent.closest("#gmArbitrationModal").querySelectorAll(".gmChoice"))if(other!==row)other.__closeChoice?.();active=Math.max(0,select.selectedIndex);list.hidden=false;trigger.setAttribute("aria-expanded","true");refresh();items[active]?.scrollIntoView?.({block:"nearest"})}
 function commit(i){select.value=String(options[i][0]);active=i;close();refresh();select.dispatchEvent(new Event("change",{bubbles:true}));trigger.focus()}
 select.addEventListener("change",refresh)
 trigger.addEventListener("click",()=>list.hidden?open():close())
 trigger.addEventListener("keydown",e=>{
  if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){e.preventDefault();e.stopPropagation();if(list.hidden){open();if(e.key==="Home")active=0;else if(e.key==="End")active=items.length-1}else active=e.key==="Home"?0:e.key==="End"?items.length-1:(active+(e.key==="ArrowDown"?1:-1)+items.length)%items.length;refresh();items[active]?.scrollIntoView?.({block:"nearest"})}
  else if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();if(list.hidden)open();else commit(active)}
  else if(e.key==="Escape"&&!list.hidden){e.preventDefault();e.stopPropagation();close()}
  else if(e.key==="Tab")close()
 });refresh();return select
}
function gmArbitrationNumber(parent,label,value,min=0,max=50000){const row=gmArbitrationElement("label",label+" ",parent),e=gmArbitrationElement("input",null,row);e.type="number";e.min=min;e.max=max;e.value=value;return e}
function gmArbitrationCheck(parent,label,checked){const row=gmArbitrationElement("label",null,parent),e=gmArbitrationElement("input",null,row);e.type="checkbox";e.checked=checked;row.appendChild(document.createTextNode(" "+label));return e}
function gmArbitrationModal(title){
 const previousModal=document.getElementById("gmArbitrationModal"),returnFocus=previousModal?.__windowReturnFocus||document.activeElement;previousModal?.remove()
 const overlay=gmArbitrationElement("div",null,document.body);overlay.id="gmArbitrationModal";overlay.style.cssText="position:fixed;inset:0;z-index:2147483646;background:#000c;display:flex;align-items:center;justify-content:center;padding:15px;color:#ffe5b4"
 overlay.addEventListener("keydown",e=>{if(e.key!=="Escape")e.stopPropagation()})
 overlay.addEventListener("pointerdown",e=>{for(const row of overlay.querySelectorAll(".gmChoice"))if(!row.contains(e.target))row.__closeChoice?.()})
 const panel=gmArbitrationElement("div",null,overlay);panel.style.cssText="background:#20150e;border:2px solid #bc9454;border-radius:12px;padding:22px;width:min(700px,95vw);max-height:88vh;overflow:auto;font:17px Georgia;display:flex;flex-direction:column;gap:12px"
 gmArbitrationElement("h2",title,panel)
 const error=gmArbitrationElement("p","",panel);error.setAttribute("role","alert");error.style.color="#ffb1a5"
 let busy=false
 const button=(text,fn)=>{const b=gmArbitrationElement("button",text,panel);b.type="button";b.addEventListener("click",async()=>{if(busy)return;busy=true;const controls=[...panel.querySelectorAll("button,input,select,textarea")].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);panel.setAttribute("aria-busy","true");error.textContent="";try{await fn()}catch(e){error.textContent=e.message}finally{busy=false;controls.forEach(([el,disabled])=>el.disabled=disabled);panel.removeAttribute("aria-busy")}});return b}
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-label",title);window.GameWindows?.register(overlay,()=>{if(panel.getAttribute("aria-busy")!=="true")gmArbitrationClose()},{returnFocus})
 return {panel,button,overlay}
}
async function gmArbitrationSend(kind,payload={}){
 if(window.__authRole!=="gm")throw Error("Commande réservée au MJ")
 if(window.__sessionBusy)throw Error("La partie se synchronise")
 if(gmArbitrationCombat?.id&&gmArbitrationCombat.phase!=="finished"&&gmArbitrationCombat.turnState?.phase==="active")return submitCombatAction(kind,gmArbitrationCombat.turnState.currentActorId,payload)
 if(Array.isArray(payload.decision?.targets))payload={...payload,decision:{...payload.decision,targetsSpecified:true}}
 const id=db.ref().push().key,seed=Math.floor(Math.random()*4294967296),revision=persistenceRevision
 const result=await transactCombatRoot(root=>{if(revision!==(root.sessionControl?.revision||null))throw Error("La session a changé");return reduceSceneGMAction(root,window.__authUid,id,payload,seed)})
 if(!result.committed)throw Error("Action non confirmée")
}
let gmFreeWindowDraft=null
function gmArbitrationClose(){const modal=document.getElementById("gmArbitrationModal");gmArbitrationHidden=gmArbitrationPending()?.id||"";modal?.__retainFreeDraft?.();modal?.remove();if(modal)window.GameWindows?.closed(modal)}
async function openGMIntervention(){
 if(window.__authRole!=="gm")return
 if(gmArbitrationPending()){gmArbitrationHidden="";gmArbitrationSignature="";return renderGMArbitration()}
 if(gmArbitrationCombat?.turnState?.phase!=="active"||gmArbitrationCombat.phase==="finished")return showNotification("Intervenir est disponible pendant un combat. Utilisez Action libre hors combat.")
 try{const armed=gmArbitrationCombat?.interventionArmed;await gmArbitrationSend("armIntervention");showNotification(armed?"Intervention désactivée":"La prochaine attaque attendra votre décision")}catch(e){showNotification(e.message)}
}
function renderGMArbitration(){
 const playing=gameStarted&&document.body.dataset.entryStage==="playing",gmRole=window.__authRole==="gm"
 const intervene=document.getElementById("gmInterveneBtn"),free=document.getElementById("gmFreeActionBtn")
 if(intervene)intervene.style.display=playing&&gmRole&&gmArbitrationCombat?.turnState?.phase==="active"?"":"none"
 if(free)free.style.display=playing&&gmRole?"":"none"
 if(!playing){document.getElementById("gmArbitrationBanner")?.remove();document.getElementById("gmArbitrationModal")?.remove();gmArbitrationSignature="";return}
 const draft=document.getElementById("gmArbitrationModal");if(draft?.dataset.freeCombatId&&(draft.dataset.freeCombatId!==gmArbitrationCombat?.id||gmArbitrationCombat?.phase==="finished"||!combatActive))draft.remove()
 document.getElementById("gmArbitrationModal")?.__refreshTargets?.()
 const p=gmArbitrationPending(),gm=window.__authRole==="gm",btn=document.getElementById("gmInterveneBtn")
 if(btn)btn.textContent=p?"Décision en attente":gmArbitrationCombat?.interventionArmed?"Intervention activée":"Intervenir"
 let banner=document.getElementById("gmArbitrationBanner")
 if(!p){banner?.remove();if(gmArbitrationSignature){document.getElementById("gmArbitrationModal")?.remove();gmArbitrationSignature=""}gmArbitrationHidden="";return}
 if(!banner){banner=gmArbitrationElement("button","Décision MJ en attente — afficher",document.body);banner.id="gmArbitrationBanner";banner.style.cssText="position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483645;padding:12px;background:#4b2810;color:#ffe5b4;border:1px solid #c99e55";banner.onclick=()=>{gmArbitrationHidden="";gmArbitrationSignature="";renderGMArbitration()}}
 const signature=p.id+":"+p.revision+":"+gm
 if(!gameStarted||gmArbitrationHidden===p.id||gmArbitrationSignature===signature)return
 gmArbitrationSignature=signature
 const {panel,button}=gmArbitrationModal(gm?"Décision du MJ":"Une action attend la décision du MJ"),result=p.preview.result
 gmArbitrationElement("p",(result.actor==="ju"?"Pika":result.actor||"MJ").toUpperCase()+" — "+(result.attack||result.message||"Action"),panel)
 if(Number.isFinite(result.roll))gmArbitrationElement("p","Jet conservé : "+result.roll+" / "+result.dice+(result.crit?" — critique réussi":result.fail?" — échec critique":""),panel)
 gmArbitrationElement("p","Prévision : "+((p.preview.changes||[]).length?(p.preview.changes||[]).map(c=>gmArbitrationLabel(c.target)+" "+(c.delta>0?"+":"")+c.delta+" PV").join(" ; "):"aucun changement de PV")+". Aucune conséquence n’est encore appliquée.",panel)
 button("Voir la carte",gmArbitrationClose)
 if(!gm)return
 const modes=[["normal","Résolution normale"],["half","Moitié des dégâts / soins"],["none","Esquive totale : aucun effet"],["custom","Montant personnalisé par cible"]]
 const mode=gmArbitrationSelect(panel,"Conséquences",modes,"normal"),amount=gmArbitrationNumber(panel,"Montant personnalisé",0),effects=gmArbitrationCheck(panel,"Conserver les effets secondaires",true)
 const originalTargets=[...new Set([...(result.targets||[]),...(result.target?[result.target]:[]),...(p.preview.changes||[]).map(c=>c.target),...(p.source.payload.targets||[])])]
 const choices=originalTargets.some(id=>COMBAT_MOBS.includes(id))&&originalTargets.some(id=>COMBAT_CHARACTERS.includes(id))?[...COMBAT_CHARACTERS,...COMBAT_MOBS]:p.source.kind==="enemy"?COMBAT_CHARACTERS:originalTargets.some(id=>COMBAT_MOBS.includes(id))?COMBAT_MOBS:COMBAT_CHARACTERS
 const singleTarget=["hero","ally"].includes(p.source.kind)&&originalTargets.length===1
 const rows=[];gmArbitrationElement("p","Cibles (décochez pour les protéger) et exceptions individuelles :",panel)
 for(const id of choices){if(COMBAT_MOBS.includes(id)&&!gmArbitrationCombat?.[id])continue;const row=gmArbitrationElement("div",null,panel);const selected=gmArbitrationCheck(row,gmArbitrationLabel(id),originalTargets.includes(id));const rule=gmArbitrationSelect(row,"",[["inherit","Choix général"],...modes],"inherit"),n=gmArbitrationNumber(row,"PV",0);rows.push({id,selected,rule,n});if(singleTarget)selected.addEventListener("change",()=>{if(selected.checked)rows.forEach(r=>{if(r.id!==id)r.selected.checked=false})})}
 const label=gmArbitrationElement("label","Explication visible par tous",panel),narrative=gmArbitrationElement("textarea",null,label);narrative.maxLength=600;narrative.style.cssText="width:100%;min-height:70px";narrative.placeholder="Ex. Le groupe se réfugie derrière les piliers."
 const decision=()=>({mode:mode.value,amount:Number(amount.value),effects:effects.checked,targets:rows.filter(r=>r.selected.checked).map(r=>r.id),perTarget:Object.fromEntries(rows.filter(r=>r.rule.value!=="inherit").map(r=>[r.id,{mode:r.rule.value,amount:Number(r.n.value)}])),narrative:narrative.value})
 const send=async(kind,d)=>{await gmArbitrationSend(kind,{pendingId:p.id,revision:p.revision,decision:d,kind:kind==="resolveIntervention"?"resolve":kind==="refreshIntervention"?"refresh":"dismiss"});gmArbitrationSignature="";renderGMArbitration()}
 button("Appliquer la décision",()=>send("resolveIntervention",decision()))
 button("Esquive totale — consommer l’action",()=>send("resolveIntervention",{...decision(),mode:"none",perTarget:{},effects:false}))
 button("Annuler l’attaque — consommer l’action",()=>send("resolveIntervention",{...decision(),cancel:true,mode:"none",perTarget:{},effects:false}))
 button("Actualiser la prévision (même jet)",()=>send("refreshIntervention"))
 button("Abandonner la préparation — conserver l’action",()=>send("dismissIntervention"))
}
function gmArbitrationLabel(id){return id==="ju"?"Pika":COMBAT_MOBS.includes(id)?(gmArbitrationCombat?.[id]?.name||id).toUpperCase():id==="mj"?"MJ":id.charAt(0).toUpperCase()+id.slice(1)}
function openGMFreeAction(){
 if(window.__authRole!=="gm")return
 if(gmArbitrationPending())return openGMIntervention()
 if(typeof prepareGMScene==="function"&&prepareGMScene()===false)return
 const inCombat=gmArbitrationCombat?.phase!=="finished"&&gmArbitrationCombat?.turnState?.phase==="active"
 const draftKey=[window.__authUid||"",typeof persistenceRevision==="undefined"?"initial":persistenceRevision||"initial",inCombat?gmArbitrationCombat.id:"map:"+(typeof currentMap==="undefined"?"":currentMap)].join(":")
 const existing=document.getElementById("gmArbitrationModal");if(existing?.dataset.freeDraftKey===draftKey)return
 const {panel,button}=gmArbitrationModal("Action libre");document.getElementById("gmArbitrationModal").dataset.freeDraftKey=draftKey
 const combatId=inCombat?gmArbitrationCombat.id:null;if(combatId)document.getElementById("gmArbitrationModal").dataset.freeCombatId=combatId
 const actors=[...COMBAT_CHARACTERS,...(inCombat?COMBAT_MOBS.filter(id=>gmArbitrationCombat[id]?.hp>0):[]),"mj"],actor=gmArbitrationSelect(panel,"Qui agit ?",actors.map(id=>[id,gmArbitrationLabel(id)]),inCombat?gmArbitrationCombat.turnState.currentActorId:"mj")
 const row=gmArbitrationElement("label","Description visible par tous",panel),label=gmArbitrationElement("textarea",null,row);label.maxLength=180;label.style.cssText="width:100%;min-height:65px"
 const die=gmArbitrationSelect(panel,"Jet facultatif",[0,4,6,8,10,12,20,100].map(n=>[String(n),n?"D"+n:"Sans dé"]),"0")
 gmArbitrationElement("p","Le jet ne décide pas automatiquement des conséquences : vous les confirmerez après l’avoir vu.",panel)
 const targetBox=gmArbitrationElement("div",null,panel);targetBox.className="gmFreeTargets"
 const tools=gmArbitrationElement("div",null,targetBox);tools.className="gmFreeTargetTools"
 const heroes=gmArbitrationElement("fieldset",null,targetBox);gmArbitrationElement("legend","Héros et familier",heroes)
 const enemies=inCombat?gmArbitrationElement("fieldset",null,targetBox):null;if(enemies)gmArbitrationElement("legend","Ennemis",enemies)
 const targetIds=[...COMBAT_CHARACTERS,...(inCombat?COMBAT_MOBS.filter(id=>gmArbitrationCombat[id]):[])]
 const targets=targetIds.map(id=>{const e=gmArbitrationCheck(COMBAT_MOBS.includes(id)?enemies:heroes,"Cible : "+gmArbitrationLabel(id),false);e.setAttribute("aria-label","Cible : "+gmArbitrationLabel(id));e.parentElement.className="gmFreeTarget";const status=gmArbitrationElement("span",null,e.parentElement);status.className="gmFreeTargetStatus";return{id,e,status}})
 const targetHP=id=>COMBAT_MOBS.includes(id)?gmArbitrationCombat?.[id]?.hp:window.__publicCharacters?.[id]?.hp
 const targetReason=id=>COMBAT_MOBS.includes(id)&&!gmArbitrationCombat?.[id]?"Cible absente":hpMode.value==="heal"&&Number.isFinite(targetHP(id))&&targetHP(id)<=0?"Un soin ne ressuscite pas une cible KO":effect.value==="stun"&&COMBAT_MOBS.includes(id)?"L’étourdissement concerne les héros. Pour un ennemi, choisissez un malus.":""
 const selectGroup=group=>{for(const t of targets)if(group==="none")t.e.checked=false;else if((group==="heroes")===COMBAT_CHARACTERS.includes(t.id))t.e.checked=!targetReason(t.id);refreshDraft()}
 for(const [text,group]of [["Tous les héros","heroes"],...(inCombat?[["Tous les ennemis","enemies"]]:[]),["Tout décocher","none"]]){const b=gmArbitrationElement("button",text,tools);b.type="button";b.addEventListener("click",()=>selectGroup(group))}
 const hpMode=gmArbitrationSelect(panel,"PV",[["none","Aucun changement"],["damage","Dégâts"],["heal","Soin (sans résurrection)"]],"none"),amount=gmArbitrationNumber(panel,"Montant par cible",0)
 const effect=gmArbitrationSelect(panel,"Effet",[["none","Aucun effet secondaire"],...(inCombat?[["stun","Étourdir un héros : une action"],["debuff","Malus de combat"]]:[])],"none"),effectAmount=gmArbitrationNumber(panel,"Force du malus",2,1,50),turns=gmArbitrationNumber(panel,"Durée du malus (rounds)",2,1,10)
 const cost=gmArbitrationCheck(panel,"Consommer l’action de l’acteur (Greg / Bibi : une seule action)",!!inCombat);if(!inCombat)cost.disabled=true
 const targetWarning=gmArbitrationElement("p",null,panel);targetWarning.className="gmFreeTargetWarning";targetWarning.setAttribute("role","status")
 const summary=gmArbitrationElement("p",null,panel);summary.className="gmFreeActionSummary";summary.setAttribute("aria-live","polite")
 const refreshDraft=()=>{
  amount.parentElement.hidden=hpMode.value==="none"
  effectAmount.parentElement.hidden=turns.parentElement.hidden=effect.value!=="debuff"
  effect.closest(".gmChoice").hidden=!inCombat
  cost.parentElement.hidden=!inCombat
  for(const t of targets){const hp=targetHP(t.id),reason=targetReason(t.id);t.status.textContent=(COMBAT_MOBS.includes(t.id)?"n° "+(COMBAT_MOBS.indexOf(t.id)+1)+" — ":"")+(Number.isFinite(hp)?hp+" PV"+(hp<=0?" — KO":""):"PV indisponibles")+(reason?" — "+reason:"");t.e.setAttribute("aria-invalid",String(t.e.checked&&!!reason));t.e.parentElement.classList.toggle("gmFreeTargetInvalid",t.e.checked&&!!reason)}
  const invalid=targets.filter(t=>t.e.checked&&targetReason(t.id));targetWarning.hidden=!invalid.length;targetWarning.textContent=invalid.map(t=>gmArbitrationLabel(t.id)+" : "+targetReason(t.id)).join(" · ")
  const names=targets.filter(t=>t.e.checked).map(t=>gmArbitrationLabel(t.id)).join(", ")||"aucune cible"
  const consequence=hpMode.value==="none"?"aucun changement de PV":(hpMode.value==="damage"?"Dégâts":"Soin")+" : "+(amount.value||"0")+" par cible"
  const secondary=effect.value==="debuff"?"Malus de "+effectAmount.value+" pendant "+turns.value+" round(s)":effect.value==="stun"?"Étourdissement : une action (héros uniquement)":"Aucun effet secondaire"
  summary.textContent=gmArbitrationLabel(actor.value)+" — "+(label.value.trim()||"Description à compléter")+". Cibles : "+names+". "+(die.value==="0"?"Sans jet": "Jet D"+die.value)+". "+consequence+". "+secondary+". "+(inCombat&&cost.checked?"Consomme l’action de l’acteur.":"Ne consomme pas d’action.")+" Vous confirmerez les conséquences après la préparation."
 }
 const draftFields=[actor,label,die,hpMode,amount,effect,effectAmount,turns,cost]
 if(gmFreeWindowDraft?.key===draftKey)draftFields.forEach((el,i)=>{const v=gmFreeWindowDraft.values[i];if(v!==undefined){if(el.type==="checkbox")el.checked=v;else if(el.tagName!=="SELECT"||[...el.options].some(o=>o.value===v))el.value=v}})
 if(gmFreeWindowDraft?.key===draftKey)targets.forEach(t=>t.e.checked=gmFreeWindowDraft.targets.includes(t.id))
 document.getElementById("gmArbitrationModal").__retainFreeDraft=()=>{gmFreeWindowDraft={key:draftKey,values:draftFields.map(el=>el.type==="checkbox"?el.checked:el.value),targets:targets.filter(t=>t.e.checked).map(t=>t.id)}}
 for(const el of [actor,die,hpMode,effect])el.dispatchEvent(new Event("change",{bubbles:true}))
 document.getElementById("gmArbitrationModal").__refreshTargets=refreshDraft
 panel.addEventListener("input",refreshDraft);panel.addEventListener("change",refreshDraft);refreshDraft()
 button("Préparer et voir le résultat",async()=>{
   if(combatId&&(gmArbitrationCombat?.id!==combatId||gmArbitrationCombat?.phase==="finished"||!combatActive))throw new Error("Ce combat est terminé. Ouvrez une nouvelle action libre depuis la carte.")
   if(!label.value.trim())throw Error("Décrivez l’action avant de la préparer.")
   const hasConsequences=hpMode.value!=="none"||effect.value!=="none"
   if(hasConsequences&&!targets.some(t=>t.e.checked))throw Error("Choisissez au moins une cible pour ces conséquences.")
   if(hpMode.value!=="none"&&(!Number.isInteger(Number(amount.value))||Number(amount.value)<1||Number(amount.value)>50000))throw Error("Indiquez un montant entier entre 1 et 50 000 par cible.")
   const invalidTarget=targets.find(t=>t.e.checked&&targetReason(t.id));if(invalidTarget)throw Error(gmArbitrationLabel(invalidTarget.id)+" : "+targetReason(invalidTarget.id))
   if(effect.value==="debuff"&&(!Number.isInteger(Number(effectAmount.value))||Number(effectAmount.value)<1||Number(effectAmount.value)>50||!Number.isInteger(Number(turns.value))||Number(turns.value)<1||Number(turns.value)>10))throw Error("Choisissez un malus entre 1 et 50 et une durée entre 1 et 10 rounds.")
   const action={label:label.value.trim(),targets:targets.filter(t=>t.e.checked).map(t=>t.id),die:Number(die.value),hpMode:hpMode.value,amount:hpMode.value==="none"?0:Number(amount.value),effect:effect.value,effectAmount:effect.value==="debuff"?Number(effectAmount.value):2,turns:effect.value==="debuff"?Number(turns.value):2,consumeAction:inCombat&&cost.checked}
   if(inCombat)await submitCombatAction("free",actor.value,action);else await gmArbitrationSend("free",{kind:"prepare",actor:actor.value,action})
   gmFreeWindowDraft=null;gmArbitrationHidden="";gmArbitrationSignature="";renderGMArbitration()
 })
 button("Fermer",gmArbitrationClose)
}
function syncGMArbitration(){gmArbitrationSignature="";renderGMArbitration()}
document.addEventListener("DOMContentLoaded",()=>{
 db.ref("combat").on("value",s=>{gmArbitrationCombat=s.val();renderGMArbitration()})
 db.ref("game/pendingGMAction").on("value",s=>{gmArbitrationScene=s.val();renderGMArbitration()})
 db.ref("game/gmActionEvents").on("child_added",s=>{const event=s.val();if(event?.time>=(window.__pageLoadTime||0))presentCombatResolution(event)})
})
const gmArbitrationOriginalTavern=showTavern
showTavern=function(...args){const result=gmArbitrationOriginalTavern(...args);renderGMArbitration();return result}
