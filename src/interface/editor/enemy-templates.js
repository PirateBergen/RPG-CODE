function createDraftEnemyTemplate(template,id) {
  const templates={goblin:{name:'Gobelin',description:'Petit pillard rusé, dangereux en groupe.',portrait:'images/gobelins.png',hp:32,force:8,defense:4,variants:['weak','medium','high'],attack:'Coup de lame',power:[4,8],visual:'slash'},wolf:{name:'Loup',description:'Prédateur rapide qui cherche à isoler sa proie.',portrait:'images/loup.png',hp:68,force:12,defense:5,variants:['weak','medium','high'],attack:'Morsure',power:[6,10],visual:'slash'},bandit:{name:'Bandit',description:'Combattant opportuniste qui préfère les embuscades.',portrait:'images/bandit.png',hp:34,force:10,defense:6,variants:['weak','medium','high'],attack:'Estoc',power:[5,9],visual:'projectile'},draugr:{name:'Draugr',description:'Gardien mort-vivant lent mais tenace.',portrait:'images/draugr.png',hp:80,force:13,defense:9,variants:['weak','medium','high','boss'],attack:'Frappe funéraire',power:[7,12],visual:'smoke'},golem:{name:'Golem de pierre',description:'Créature lourde et résistante, dont les articulations sont exposées.',portrait:'images/golem.png',hp:64,force:18,defense:14,variants:['medium','high','boss','worldBoss'],attack:'Poing de pierre',power:[10,16],visual:'fire'}}
  const t=templates[template]
  const normal={id:'ability-basic',kind:'normal',name:t?.attack || 'Frappe',description:'Attaque de base personnalisable.',type:'damage',dice:6,stat:'force',target:'enemy',powerMin:t?.power[0] || 4,powerMax:t?.power[1] || 8,cooldown:0,uses:0,effect:{kind:'none',value:0,turns:1},visual:{preset:t?.visual || 'slash',color:'#d8b477',intensity:2},growth:{percent:2,every:2,startLevel:1}}
  const enemy={id,name:t?.name || 'Nouvel ennemi',description:t?.description || '',portrait:t?.portrait || 'images/draft-hero.svg',variants:t?[...t.variants]:['medium'],baseLevel:1,stats:{hp:t?.hp || 60,force:t?.force || 10,charme:2,perspi:6,chance:5,defense:t?.defense || 6},growth:{hpPercent:8,statsPercent:3,every:1},resistances:[],weaknesses:[],abilities:[normal]}
  if(template==='golem'){
    enemy.resistances=[{name:'Coups physiques',percent:25}];enemy.weaknesses=[{name:'Articulations exposées',percent:20}]
    enemy.abilities.push({...normal,id:'ability-stone-guard',kind:'special',name:'Carapace de pierre',description:'Durcit son corps pendant deux tours.',type:'protection',target:'self',powerMin:0,powerMax:0,cooldown:3,effect:{kind:'damageReduction',value:25,turns:2},visual:{preset:'shield',color:'#86b3ce',intensity:2}})
  }
  if(template==='draugr')enemy.weaknesses=[{name:'Feu',percent:20}]
  return createCampaignBestiary([enemy])[0]
}
function setDraftEnemy(definition,enemy) {
  const list=definition.bestiary || []
  return createCampaignDefinition({...definition,bestiary:list.some(item=>item.id===enemy.id)?list.map(item=>item.id===enemy.id?enemy:item):[...list,enemy]})
}
function removeDraftEnemy(definition,id){if(!definition.bestiary?.some(item=>item.id===id))throw Error('Ennemi introuvable');return createCampaignDefinition({...definition,bestiary:definition.bestiary.filter(item=>item.id!==id)})}
