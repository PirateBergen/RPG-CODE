const BALROG_SWORD_LINE="Épée mystérieuse aux inscriptions elfiques (15)"
function balrogSwordBonus(level){const lvl=Math.max(1,Math.min(99,Number(level)||1));return {force:4+getEquipmentLevelBonus(lvl),defense:Math.min(3,1+Math.floor(lvl/10))}}
function balrogSwordIsEquipped(root){return root.game?.balrogSword?.status==="claimed"&&root.game.balrogSword.holder==="greg"&&root.game.balrogSword.equipped===true&&String(root.characters?.greg?.inventaire||"").includes(BALROG_SWORD_LINE)}
function resolveBalrogSwordRequest(root,request){
 const data=root.game.balrogSword,payload=request.payload||{},testGM=root.testSchema===1&&root.roles?.[request.uid]==="gm"
 if(request.actor!=="greg"||(!testGM&&(root.profiles?.[request.uid]?.playerId!=="greg"||root.heroAssignments?.greg?.uid!==request.uid)))throw Error("Seul Greg peut récupérer l’épée")
 if(!data||data.combatId!==payload.combatId||root.combat||root.game.combatState?.active)throw Error("L’épée n’est pas disponible pendant ce combat")
 const clean=inventory=>String(inventory||"").split(/\r?\n/).filter(line=>!line.trim().startsWith("Épée mystérieuse aux inscriptions elfiques")).join("\n")
 if(payload.operation==="equip"){
  if(data.status!=="claimed"||data.holder!=="greg")throw Error("L’épée doit être dans l’inventaire de Greg")
  data.equipped=payload.equipped===true
 }else{
  if(!["claim","transfer"].includes(payload.operation)||!["greg","bibi"].includes(payload.holder))throw Error("Choisissez Greg ou Bibi")
  if(payload.operation==="claim"&&data.status!=="available")throw Error("L’épée a déjà été récupérée")
  if(payload.operation==="transfer"&&data.status!=="claimed")throw Error("L’épée n’a pas encore été récupérée")
  const target=root.characters?.[payload.holder];if(!target)throw Error("Inventaire introuvable")
  const base=clean(target.inventaire),weight=parseInventoryWeight(base);if(weight.warnings.length)throw Error("Corrigez les poids manquants ou invalides de cet inventaire avant le transfert")
  const capacity=getMaxCarryWeight(payload.holder,target.lvl)
  if(weight.total+15>capacity)throw Error("Cet inventaire dépasse "+capacity+" avec le poids 15 de l’épée. Libérez de la place ou choisissez l’autre inventaire")
  for(const id of ["greg","bibi"])root.characters[id].inventaire=clean(root.characters[id].inventaire)
  target.inventaire=(base.trim()?base.trim()+"\n":"")+BALROG_SWORD_LINE
  data.status="claimed";data.holder=payload.holder;data.equipped=payload.holder==="greg";data.claimedBy="greg"
 }
 for(const id of ["greg","bibi"]){const c=root.characters[id];c.equipmentModifiers=getEffectiveCharacterData(id,c,data).__inventoryStatMods;c.carriedWeight=parseInventoryWeight(c.inventaire).total}
 return {mode:"relic",message:payload.operation==="equip"?(data.equipped?"Épée équipée":"Épée déséquipée"):"L’épée rejoint l’inventaire de "+heroDisplayName(data.holder)}
}

