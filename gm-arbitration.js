"use strict"
let gmArbitrationCombat=null,gmArbitrationScene=null,gmArbitrationSignature="",gmArbitrationHidden=""
function gmArbitrationPending(){return gmArbitrationCombat?.pendingResolution||gmArbitrationScene}
function gmArbitrationElement(tag,text,parent){const e=document.createElement(tag);if(text!==null)e.textContent=text;if(parent)parent.appendChild(e);return e}
function gmArbitrationSelect(parent,label,options,value){const row=gmArbitrationElement("label",label+" ",parent),e=gmArbitrationElement("select",null,row);for(const [v,t]of options){const o=gmArbitrationElement("option",t,e);o.value=v}e.value=value;return e}
function gmArbitrationNumber(parent,label,value,min=0,max=50000){const row=gmArbitrationElement("label",label+" ",parent),e=gmArbitrationElement("input",null,row);e.type="number";e.min=min;e.max=max;e.value=value;return e}
function gmArbitrationCheck(parent,label,checked){const row=gmArbitrationElement("label",null,parent),e=gmArbitrationElement("input",null,row);e.type="checkbox";e.checked=checked;row.appendChild(document.createTextNode(" "+label));return e}
function gmArbitrationModal(title){
 document.getElementById("gmArbitrationModal")?.remove()
 const overlay=gmArbitrationElement("div",null,document.body);overlay.id="gmArbitrationModal";overlay.style.cssText="position:fixed;inset:0;z-index:2147483646;background:#000c;display:flex;align-items:center;justify-content:center;padding:15px;color:#ffe5b4"
 const panel=gmArbitrationElement("div",null,overlay);panel.style.cssText="background:#20150e;border:2px solid #bc9454;border-radius:12px;padding:22px;width:min(700px,95vw);max-height:88vh;overflow:auto;font:17px Georgia;display:flex;flex-direction:column;gap:12px"
 gmArbitrationElement("h2",title,panel)
 const error=gmArbitrationElement("p","",panel);error.setAttribute("role","alert");error.style.color="#ffb1a5"
 const button=(text,fn)=>{const b=gmArbitrationElement("button",text,panel);b.type="button";b.addEventListener("click",async()=>{b.disabled=true;error.textContent="";try{await fn()}catch(e){error.textContent=e.message}finally{b.disabled=false}});return b}
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
function gmArbitrationClose(){gmArbitrationHidden=gmArbitrationPending()?.id||"";document.getElementById("gmArbitrationModal")?.remove()}
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
 const inCombat=gmArbitrationCombat?.phase!=="finished"&&gmArbitrationCombat?.turnState?.phase==="active",{panel,button}=gmArbitrationModal("Action libre")
 const combatId=inCombat?gmArbitrationCombat.id:null;if(combatId)document.getElementById("gmArbitrationModal").dataset.freeCombatId=combatId
 const actors=[...COMBAT_CHARACTERS,...(inCombat?COMBAT_MOBS.filter(id=>gmArbitrationCombat[id]?.hp>0):[]),"mj"],actor=gmArbitrationSelect(panel,"Qui agit ?",actors.map(id=>[id,gmArbitrationLabel(id)]),inCombat?gmArbitrationCombat.turnState.currentActorId:"mj")
 const row=gmArbitrationElement("label","Description visible par tous",panel),label=gmArbitrationElement("textarea",null,row);label.maxLength=180;label.style.cssText="width:100%;min-height:65px"
 const die=gmArbitrationSelect(panel,"Jet facultatif",[0,4,6,8,10,12,20,100].map(n=>[String(n),n?"D"+n:"Sans dé"]),"0")
 gmArbitrationElement("p","Le jet ne décide pas automatiquement des conséquences : vous les confirmerez après l’avoir vu.",panel)
 const targets=actors.filter(id=>id!=="mj").map(id=>({id,e:gmArbitrationCheck(panel,"Cible : "+gmArbitrationLabel(id),false)}))
 const hpMode=gmArbitrationSelect(panel,"PV",[["none","Aucun changement"],["damage","Dégâts"],["heal","Soin (sans résurrection)"]],"none"),amount=gmArbitrationNumber(panel,"Montant par cible",0)
 const effect=gmArbitrationSelect(panel,"Effet",[["none","Narration uniquement"],...(inCombat?[["stun","Étourdir un héros : une action"],["debuff","Malus de combat"]]:[])],"none"),effectAmount=gmArbitrationNumber(panel,"Force du malus",2,1,50),turns=gmArbitrationNumber(panel,"Durée du malus (rounds)",2,1,10)
 const cost=gmArbitrationCheck(panel,"Consommer l’action de l’acteur (Greg / Bibi : une seule action)",!!inCombat);if(!inCombat)cost.disabled=true
 button("Préparer et voir le résultat",async()=>{
   if(combatId&&(gmArbitrationCombat?.id!==combatId||gmArbitrationCombat?.phase==="finished"||!combatActive))throw new Error("Ce combat est terminé. Ouvrez une nouvelle action libre depuis la carte.")
   const action={label:label.value,targets:targets.filter(t=>t.e.checked).map(t=>t.id),die:Number(die.value),hpMode:hpMode.value,amount:Number(amount.value),effect:effect.value,effectAmount:Number(effectAmount.value),turns:Number(turns.value),consumeAction:cost.checked}
   if(inCombat)await submitCombatAction("free",actor.value,action);else await gmArbitrationSend("free",{kind:"prepare",actor:actor.value,action})
   gmArbitrationHidden="";gmArbitrationSignature="";renderGMArbitration()
 })
 button("Fermer",()=>document.getElementById("gmArbitrationModal")?.remove())
}
function syncGMArbitration(){gmArbitrationSignature="";renderGMArbitration()}
document.addEventListener("DOMContentLoaded",()=>{
 db.ref("combat").on("value",s=>{gmArbitrationCombat=s.val();renderGMArbitration()})
 db.ref("game/pendingGMAction").on("value",s=>{gmArbitrationScene=s.val();renderGMArbitration()})
 db.ref("game/gmActionEvents").on("child_added",s=>{const event=s.val();if(event?.time>=(window.__pageLoadTime||0))presentCombatResolution(event)})
})
const gmArbitrationOriginalTavern=showTavern
showTavern=function(...args){const result=gmArbitrationOriginalTavern(...args);renderGMArbitration();return result}
