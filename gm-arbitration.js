"use strict"
let gmArbitrationCombat=null,gmArbitrationSignature="",gmArbitrationHidden=""
function gmArbitrationPending(){const pending=gmArbitrationCombat?.pendingResolution;return pending?.source?.kind==="free"?null:pending}
function gmArbitrationElement(tag,text,parent){const e=document.createElement(tag);if(text!==null)e.textContent=pikaDisplayText(text);if(parent)parent.appendChild(e);return e}
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
 requireActionAccess({gmOnly:true})
 if(gmArbitrationCombat?.id&&gmArbitrationCombat.phase!=="finished"&&gmArbitrationCombat.turnState?.phase==="active")return submitCombatAction(kind,gmArbitrationCombat.turnState.currentActorId,payload)
 throw Error("Intervenir est disponible pendant un combat actif.")
}
function gmArbitrationClose(){const modal=document.getElementById("gmArbitrationModal");gmArbitrationHidden=gmArbitrationPending()?.id||"";modal?.remove();if(modal)window.GameWindows?.closed(modal)}
async function openGMIntervention(){
 if(window.__authRole!=="gm")return
 if(gmArbitrationPending()){gmArbitrationHidden="";gmArbitrationSignature="";return renderGMArbitration()}
 if(gmArbitrationCombat?.turnState?.phase!=="active"||gmArbitrationCombat.phase==="finished")return showNotification("Intervenir est disponible pendant un combat actif.")
 try{const armed=gmArbitrationCombat?.interventionArmed;await gmArbitrationSend("armIntervention");showNotification(armed?"Intervention désactivée":"La prochaine attaque attendra votre décision")}catch(e){showNotification(e.message)}
}
function renderGMArbitration(){
 const playing=gameStarted&&document.body.dataset.entryStage==="playing",gmRole=window.__authRole==="gm"
 const intervene=document.getElementById("gmInterveneBtn")
 if(intervene)intervene.style.display=playing&&gmRole&&gmArbitrationCombat?.turnState?.phase==="active"?"":"none"
 if(!playing){document.getElementById("gmArbitrationBanner")?.remove();document.getElementById("gmArbitrationModal")?.remove();gmArbitrationSignature="";return}
 const p=gmArbitrationPending(),gm=window.__authRole==="gm",btn=document.getElementById("gmInterveneBtn")
 if(btn)btn.textContent=p?"Décision en attente":gmArbitrationCombat?.interventionArmed?"Intervention activée":"Intervenir"
 let banner=document.getElementById("gmArbitrationBanner")
 if(!p){banner?.remove();if(gmArbitrationSignature){document.getElementById("gmArbitrationModal")?.remove();gmArbitrationSignature=""}gmArbitrationHidden="";return}
 if(!banner){banner=gmArbitrationElement("button","Décision MJ en attente — afficher",document.body);banner.id="gmArbitrationBanner";banner.style.cssText="position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483645;padding:12px;background:#4b2810;color:#ffe5b4;border:1px solid #c99e55";banner.onclick=()=>{gmArbitrationHidden="";gmArbitrationSignature="";renderGMArbitration()}}
 const signature=p.id+":"+p.revision+":"+gm
 if(!gameStarted||gmArbitrationHidden===p.id||gmArbitrationSignature===signature)return
 gmArbitrationSignature=signature
 const {panel,button}=gmArbitrationModal(gm?"Décision du MJ":"Une action attend la décision du MJ"),result=p.preview.result
 gmArbitrationElement("p",heroDisplayName(result.actor||"MJ").toUpperCase()+" — "+(result.attack||result.message||"Action"),panel)
 if(Number.isFinite(result.roll))gmArbitrationElement("p","Jet conservé : "+result.roll+" / "+result.dice+(result.crit?" — critique réussi":result.fail?" — échec critique":""),panel)
 gmArbitrationElement("p","Prévision : "+((p.preview.changes||[]).length?(p.preview.changes||[]).map(c=>gmArbitrationLabel(c.target)+" "+(c.delta>0?"+":"")+c.delta+" PV").join(" ; "):"aucun changement de PV")+". Aucune conséquence n’est encore appliquée.",panel)
 button("Voir la carte",gmArbitrationClose)
 if(!gm)return
 const modes=[["normal","Résolution normale"],["half","Moitié des dégâts / soins"],["none","Esquive totale : aucun effet"],["custom","Montant personnalisé par cible"]]
 const mode=gmArbitrationSelect(panel,"Conséquences",modes,"normal"),amount=gmArbitrationNumber(panel,"Montant personnalisé",0),effects=gmArbitrationCheck(panel,"Conserver les effets secondaires",true)
 const originalTargets=[...new Set([...(result.targets||[]),...(result.target?[result.target]:[]),...(p.preview.changes||[]).map(c=>c.target)])]
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
function gmArbitrationLabel(id){return id==="ju"?"Pika":COMBAT_MOBS.includes(id)?heroDisplayName(gmArbitrationCombat?.[id]?.name||id).toUpperCase():id==="mj"?"MJ":id.charAt(0).toUpperCase()+id.slice(1)}

function syncGMArbitration(){gmArbitrationSignature="";renderGMArbitration()}
document.addEventListener("DOMContentLoaded",()=>{
 db.ref("combat").on("value",s=>{gmArbitrationCombat=s.val();renderGMArbitration()})
})
const gmArbitrationOriginalTavern=showTavern
showTavern=function(...args){const result=gmArbitrationOriginalTavern(...args);renderGMArbitration();return result}
