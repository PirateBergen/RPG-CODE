// Pure gameplay commands: caller owns the session and its persistence/permissions.
function createCampaignActionSession(definition){return {characters:Object.fromEntries(definition.characters.map(actor=>{const maxHP=actor.stats?.hp || 100;return [actor.id,{hp:maxHP,maxHP}]})),combat:null,applied:[]}}
function reconcileCampaignActionSession(definition,state){const base=createCampaignActionSession(definition);return {...state,characters:Object.fromEntries(Object.entries(base.characters).map(([id,actor])=>[id,{...actor,hp:state.characters[id]?.hp===0?0:Math.max(0,Math.min(actor.maxHP,actor.maxHP-Math.max(0,(state.characters[id]?.maxHP ?? actor.maxHP)-(state.characters[id]?.hp ?? actor.hp))))}]))}}
function applyCampaignGameplayStep(definition,input,step,eventId){
  if(typeof eventId!=='string'||!eventId||eventId.length>200)throw Error('Identifiant d’exécution invalide.')
  if(input.applied.includes(eventId))return {state:input,changes:[],duplicate:true}
  const checked=createCampaignGmActions([{id:'event-command',name:'Commande',locationIds:[],steps:[step]}],definition)[0].steps[0]
  if(!['health','combat'].includes(checked.kind))throw Error('Cette étape ne modifie pas le jeu.')
  const state=copyCampaignContent(reconcileCampaignActionSession(definition,input)),changes=[]
  if(checked.kind==='combat'){
    if(state.combat?.active)throw Error('Un combat est déjà en cours. Terminez-le avant de déclencher une nouvelle rencontre.')
    const participants=definition.characters.filter(actor=>state.characters[actor.id].hp>0).map(actor=>actor.id)
    if(!participants.some(id=>definition.characters.find(actor=>actor.id===id).kind==='hero'))throw Error('Aucun héros ne peut commencer ce combat : leurs PV sont à zéro.')
    const enemies=[];for(const entry of checked.enemies){const base=definition.bestiary.find(enemy=>enemy.id===entry.enemyId),resolved=resolveDraftEnemy(base,entry.variant,entry.level);for(let i=0;i<entry.count;i++)enemies.push({id:eventId+'-enemy-'+enemies.length,enemyId:base.id,name:base.name,variant:entry.variant,level:entry.level,hp:resolved.stats.hp,maxHP:resolved.stats.hp,stats:resolved.stats,abilities:resolved.abilities})}
    state.combat={active:true,participants,enemies};changes.push({kind:'combat',count:enemies.length})
  }else{
    let targets;if(checked.target==='allEnemies'){if(!state.combat?.active||!state.combat.enemies.length)throw Error('Aucun ennemi en combat à cibler.');targets=state.combat.enemies.map(enemy=>({actor:enemy,id:enemy.id,name:enemy.name}))}
    else targets=definition.characters.filter(actor=>checked.target==='allHeroes'?actor.kind==='hero':checked.characterIds.includes(actor.id)).map(actor=>({actor:state.characters[actor.id],id:actor.id,name:actor.name}))
    for(const target of targets){const before=target.actor.hp,amount=checked.unit==='percentMax'?Math.round(target.actor.maxHP*checked.amount)/100:checked.amount;target.actor.hp=Math.round(Math.max(0,Math.min(target.actor.maxHP,before+(checked.operation==='heal'?amount:-amount)))*100)/100;changes.push({kind:'health',id:target.id,name:target.name,before,after:target.actor.hp,maxHP:target.actor.maxHP})}
  }
  state.applied=[...state.applied,eventId].slice(-1000);return {state,changes,duplicate:false}
}
