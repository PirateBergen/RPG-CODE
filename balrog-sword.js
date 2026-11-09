"use strict"
window.__balrogSword=null
let balrogSwordSignature="",balrogSwordCollapsed=false,balrogSwordId=null
function canManageBalrogSword(){return (window.__authPlayerId==="greg"&&canAccessCharacter("greg"))||(window.__isolatedTestMode&&window.__authRole==="gm")}
function renderBalrogSwordLoot(){
 if(!window.__balrogSword&&window.__defeatedMobFlags?.balraug&&window.__authRole==="gm")recoverLegacyBalrogSword()
 const data=window.__balrogSword,visible=gameStarted&&gameState==="GAME"&&!combatActive&&!window.__sessionBusy&&!window.__combatReturnInProgress&&data&&["available","claimed"].includes(data.status),manage=canManageBalrogSword()
 if(!visible||(data.status==="claimed"&&!manage)){document.getElementById("balrogSwordLoot")?.remove();balrogSwordSignature="";return}
 if(balrogSwordId!==data.combatId){balrogSwordId=data.combatId;balrogSwordCollapsed=false}
 const level=window.__publicCharacters?.greg?.lvl||1,signature=JSON.stringify([data,manage,level,balrogSwordCollapsed]);if(signature===balrogSwordSignature&&document.getElementById("balrogSwordLoot"))return
 balrogSwordSignature=signature;document.getElementById("balrogSwordLoot")?.remove()
 const box=document.createElement("aside");box.id="balrogSwordLoot";box.setAttribute("aria-label","Épée mystérieuse du Balrog")
 const button=(label,fn)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=fn;return b}
 if(balrogSwordCollapsed){box.className="swordLootBadge";box.appendChild(button(data.status==="available"?"⚔ Épée découverte":"⚔ Gérer l’épée",()=>{balrogSwordCollapsed=false;renderBalrogSwordLoot()}));document.body.appendChild(box);return}
 box.className="swordLootCard";const art=document.createElement("img"),content=document.createElement("div"),title=document.createElement("h2"),description=document.createElement("p"),stats=document.createElement("p"),error=document.createElement("p");art.src="images/balrog-sword.png";art.alt="Une épée mystérieuse aux inscriptions elfiques";title.textContent="Une épée mystérieuse…";description.textContent=data.status==="available"?"Sur la dépouille du monstre se trouve une épée mystérieuse portant des inscriptions elfiques.":"Porteur : "+heroDisplayName(data.holder)+". "+(data.equipped?"Équipée par Greg.":"Non équipée.");const bonus=balrogSwordBonus(level);stats.textContent="Poids : 15. Équipée par Greg au niveau "+level+" : +"+bonus.force+" Force, +"+bonus.defense+" Défense. L’épée évolue avec son niveau.";error.setAttribute("role","alert");error.className="swordLootError";content.append(title,description,stats,error);box.append(art,content)
 const send=async(payload)=>{for(const b of box.querySelectorAll("button"))b.disabled=true;try{await requestBalrogSword(payload);balrogSwordCollapsed=true;balrogSwordSignature="";renderBalrogSwordLoot()}catch(e){error.textContent=e.message}finally{for(const b of box.querySelectorAll("button"))b.disabled=false}}
 if(manage){if(data.status==="available"){content.append(button("Récupérer dans l’inventaire de Greg",()=>send({operation:"claim",holder:"greg"})),button("Récupérer dans l’inventaire de Bibi",()=>send({operation:"claim",holder:"bibi"})))}else{content.append(button(data.holder==="greg"?"Confier l’épée à Bibi":"Transférer l’épée à Greg",()=>send({operation:"transfer",holder:data.holder==="greg"?"bibi":"greg"})));if(data.holder==="greg")content.appendChild(button(data.equipped?"Déséquiper":"Équiper",()=>send({operation:"equip",equipped:!data.equipped})))} }else if(data.status==="available"){const waiting=document.createElement("p");waiting.textContent="Greg peut récupérer cette découverte.";content.appendChild(waiting)}
 content.appendChild(button("Réduire",()=>{balrogSwordCollapsed=true;renderBalrogSwordLoot()}));document.body.appendChild(box)
}
async function requestBalrogSword(payload){
 if(!canManageBalrogSword())throw Error("Seul Greg peut récupérer et gérer l’épée.")
 requireExplorationConnection()
 if(document.getElementById("notesEditorPanel"))throw Error("Enregistrez ou fermez l’éditeur d’inventaire avant de gérer l’épée.")
 if(["greg","bibi"].includes(currentSheetPlayer)){if(!await saveCharacter())throw Error("La fiche doit être enregistrée avant le transfert.");forceCloseCharacterSheetWithoutSave()}
 return submitExplorationAction("relic","greg",{...payload,combatId:window.__balrogSword?.combatId})
}
let swordRepairBusy=false
async function recoverLegacyBalrogSword(){
 if(swordRepairBusy||window.__authRole!=="gm"||window.__sessionBusy)return
 swordRepairBusy=true;try{await reliableRootTransaction(root=>{if(root?.roles?.[window.__authUid]!=="gm"||root.sessionControl?.phase||root.combat||!root.game?.defeatedMobs?.balraug||root.game.balrogSword)return undefined;root.game.balrogSword={status:"available",combatId:"legacy-balrog",map:"prairie.jpg"};return root})}catch(e){console.warn("Découverte de l’épée",e.message)}finally{swordRepairBusy=false}
}
document.addEventListener("DOMContentLoaded",()=>{
 db.ref("game/balrogSword").on("value",snapshot=>{const previous=window.__balrogSword;window.__balrogSword=snapshot.val();if(previous?.status==="available"&&window.__balrogSword?.status==="claimed")balrogSwordCollapsed=true;renderBalrogSwordLoot();if(canAccessCharacter("greg"))readCharacter("greg").then(snapshot=>{const data=snapshot?.val();if(data)publishCharacterCombatSummary("greg",data)}).catch(()=>{});if(currentSheetPlayer==="greg"&&typeof refreshSheetEffectiveStatsDisplay==="function")refreshSheetEffectiveStatsDisplay()})
 db.ref("game/defeatedMobs/balraug").on("value",()=>recoverLegacyBalrogSword())
})
