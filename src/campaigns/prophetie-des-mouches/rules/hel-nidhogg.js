const HEL_NIDHOGG_DUO={id:"hel_nidhogg_duo",name:"Duo — Hel et Nidhogg",image:"hel.png",role:"Invocation conjointe — uniquement contre le Roi",color:"#bfa0d8",actions:[{id:"hel_nidhogg_judgment",label:"Le Jugement de la Couronne creuse",type:"damage",icon:"☽",dice:20,desc:"Uniquement contre le Roi. D20 : 2–19, dégâts de base égaux à 25 % de ses PV maximum ; 20 naturel, 30 %. Sa prochaine attaque inflige 50 % de dégâts en moins, spéciale comprise. Sur 1 : aucun effet. Consomme l’action du héros et les interventions de Hel et Nidhogg, même sur échec. Protections conservées ; aucun multiplicateur critique supplémentaire.",dialogue:"Tu portes une couronne. Tu n’en restes pas moins mortel."}]}
function combatAllyDefinition(id){return id===HEL_NIDHOGG_DUO.id?HEL_NIDHOGG_DUO:ALLY_PNJS.find(p=>p.id===id)}
function helNidhoggAllied(root){return ["hel","nidhogg"].every(id=>root.game?.allyDiscoveries?.[id]&&!root.game?.allyBreaks?.[id])}
function helNidhoggWrath(root){return ["greg","ju","elo","bibi"].some(id=>root.game?.helMarks?.[id]||root.characters?.[id]?.helMark===true)}
function helNidhoggAvailability(root,target=null){
 const c=root.combat,kingSlots=["mob","mob2","mob3"].filter(id=>c?.[id]?.name==="roi"&&c[id].hp>0),visible=c?.phase==="active"&&kingSlots.length>0&&helNidhoggAllied(root)
 let reason=""
 if(!kingSlots.length)reason="Cette invocation est réservée au Roi"
 else if(!helNidhoggAllied(root))reason="Hel et Nidhogg doivent être tous les deux alliés"
 else if(helNidhoggWrath(root))reason="Le courroux de Hel doit d’abord être levé"
 else if(["hel_reprieve","nidhogg_bite","hel_nidhogg_judgment"].some(id=>c.usedAllies?.[id]))reason="Hel ou Nidhogg a déjà été invoqué pendant ce combat"
 else if(c.phase!=="active"||c.turnState?.phase!=="active")reason="Attendez le début des tours de combat"
 else if(target&&!kingSlots.includes(target))reason="Choisissez le Roi comme cible"
 return {visible,allowed:!reason,reason,kingSlots}
}
function revealHelNidhoggAlliance(root,time=Date.now()){
 const g=root.game;if(!g||g.helNidhoggRevealed||!helNidhoggAllied(root)||helNidhoggWrath(root))return false
 g.helNidhoggRevealed=true;g.helNidhoggAnnouncement={id:"hel-nidhogg-"+time,time}
 for(const id of ["hel","nidhogg"])if(g.allyDiscoveries[id]?.time===time)g.allyDiscoveries[id].duoAnnouncement=true
 g.sessionLog||={};g.sessionLog[g.helNidhoggAnnouncement.id]={text:"Hel et Nidhogg vous accordent leur soutien commun. Le Jugement de la Couronne creuse sera disponible uniquement contre le Roi, sur autorisation du MJ.",time,status:"applied",display:new Date(time).toTimeString().slice(0,5)}
 return true
}
function nidhoggIncomingDamage(root,slot,amount){const wound=root.combat?.[slot]?.nidhoggWound;return wound&&wound.expiresAfterRound>=(root.combat.turnState?.round||1)?Math.round(amount*(1+wound.percent/100)):amount}

function currentCombatAllyContext(){return {combat:window.__combatSnapshot,game:{...window.__explorationState,helMarks:window.__helMarks},characters:window.__publicCharacters}}
function combatAllyOptions(){const context=currentCombatAllyContext();return [...ALLY_PNJS,...(helNidhoggAvailability(context).visible?[HEL_NIDHOGG_DUO]:[])]}
