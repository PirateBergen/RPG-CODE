const DRAFT_ENEMY_VARIANTS={weak:{label:'Faible',hp:.7,stats:.85},medium:{label:'Moyen',hp:1,stats:1},high:{label:'Fort',hp:1.6,stats:1.2},boss:{label:'Boss',hp:4,stats:1.5},worldBoss:{label:'World boss',hp:10,stats:2.2}}
function createCampaignBestiary(input) {
  if(!Array.isArray(input))throw Error('Bestiaire de brouillon invalide')
  const ids=new Set(),statKeys=['hp','force','charme','perspi','chance','defense']
  return input.map(enemy=>{
    if(!enemy||typeof enemy.id!=='string'||!/^enemy-[a-z0-9-]+$/.test(enemy.id)||ids.has(enemy.id))throw Error('Identifiant d’ennemi invalide ou dupliqué')
    ids.add(enemy.id)
    if(typeof enemy.name!=='string'||!enemy.name.trim()||enemy.name.length>120||typeof enemy.description!=='string'||enemy.description.length>5000||!isCampaignAssetPath(enemy.portrait,['png','jpg','jpeg','webp','svg']))throw Error('Fiche d’ennemi invalide')
    if(!Array.isArray(enemy.variants)||!enemy.variants.length||new Set(enemy.variants).size!==enemy.variants.length||enemy.variants.some(key=>!Object.hasOwn(DRAFT_ENEMY_VARIANTS,key)))throw Error('Cochez au moins une catégorie d’ennemi.')
    if(!Number.isSafeInteger(enemy.baseLevel)||enemy.baseLevel<1||enemy.baseLevel>1000)throw Error('Niveau de référence invalide')
    if(!enemy.stats||statKeys.some(key=>!Number.isFinite(enemy.stats[key])||enemy.stats[key]<0||enemy.stats[key]>1000000)||enemy.stats.hp<=0)throw Error('Statistiques d’ennemi invalides')
    const g=enemy.growth;if(!g||!Number.isSafeInteger(g.every)||g.every<1||g.every>1000||['hpPercent','statsPercent'].some(key=>!Number.isFinite(g[key])||g[key]<0||g[key]>100))throw Error('Progression d’ennemi invalide')
    const used=new Set(),traits={}
    for(const key of ['resistances','weaknesses']){
      if(!Array.isArray(enemy[key])||enemy[key].length>20)throw Error('Résistances ou faiblesses invalides (20 maximum chacune)')
      traits[key]=enemy[key].map(item=>{
        if(!item||typeof item.name!=='string'||!item.name.trim()||item.name.length>80||!Number.isFinite(item.percent)||item.percent<0||item.percent>(key==='resistances'?100:200)||used.has(item.name.trim().toLocaleLowerCase('fr')))throw Error('Résistance/faiblesse invalide ou contradictoire')
        used.add(item.name.trim().toLocaleLowerCase('fr'));return {name:item.name.trim(),percent:item.percent}
      })
    }
    const appearance={}
    if(enemy.appearance!==undefined){
      if(!enemy.appearance||typeof enemy.appearance!=='object'||Array.isArray(enemy.appearance))throw Error('Images d’ennemi invalides')
      for(const key of ['portrait','fullBody'])if(enemy.appearance[key]!==undefined){const image=enemy.appearance[key];if(typeof image!=='string'||image.length>600000||!/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(image))throw Error('Image d’ennemi invalide');appearance[key]=image}
    }
    return {id:enemy.id,name:enemy.name,description:enemy.description,portrait:enemy.portrait,variants:[...enemy.variants],baseLevel:enemy.baseLevel,stats:Object.fromEntries(statKeys.map(key=>[key,enemy.stats[key]])),growth:{hpPercent:g.hpPercent,statsPercent:g.statsPercent,every:g.every},...traits,...(enemy.appearance!==undefined?{appearance}:{}),abilities:createCampaignAbilities(enemy.abilities || [])}
  })
}
function resolveDraftEnemy(enemy,variant,level) {
  const base=createCampaignBestiary([enemy])[0]
  if(!base.variants.includes(variant))throw Error('Cette catégorie n’est pas cochée pour cet ennemi.')
  if(!Number.isSafeInteger(level)||level<base.baseLevel||level>1000)throw Error('Choisissez un niveau entre le niveau de référence et 1 000.')
  const steps=Math.floor((level-base.baseLevel)/base.growth.every),mod=DRAFT_ENEMY_VARIANTS[variant]
  return {...base,stats:Object.fromEntries(Object.entries(base.stats).map(([key,value])=>[key,Math.round(value*(key==='hp'?mod.hp*(1+steps*base.growth.hpPercent/100):mod.stats*(1+steps*base.growth.statsPercent/100))*100)/100]))}
}
