const KING_PHASES=[
 {name:"Le mépris du souverain",scene:"sentence",hint:"100 à 80 % des PV. Sentence royale annonce une cible pour le prochain round. Les joueurs décrivent leur parade ; le MJ règle les protections avant l’impact. Si le coup est entièrement évité, deux actions offensives de héros gagnent +25 % de dégâts. Une Sentence par phase. Aucun abri imposé par le jeu.",quote:"Enfants de mouche… Votre prophétie ne signifie rien. Personne ne décide de mon destin. L’ère des vampires est arrivée, et aucune prophétie ne défera ma puissance."},
 {name:"Le tribut de sang",scene:"blood",hint:"Brisez le lien pour empêcher le soin. Les marques au sol annoncent aussi les deux Schnaw de la prochaine phase : leur rituel peut être perturbé.",quote:"Votre sang nourrira le règne que vous prétendez arrêter."},
 {name:"Mes sujets vous dévoreront",scene:"schnaw",hint:"Deux Schnaw renforcés arrivent, jamais davantage. Le garde réduit les dégâts reçus par le Roi de 20 %. Le Roi reste vulnérable.",quote:"Vous vouliez atteindre votre roi ? Traversez donc mes sujets."},
 {name:"Personne ne décide de mon destin",scene:"sweep",hint:"Le balayage est annoncé. Décrivez votre abri, votre déplacement ou votre protection ; le MJ valide la réduction pour chacun.",quote:"Aucun dieu. Aucun mortel. Aucune prophétie. Personne ne décide de mon destin !"},
 {name:"La couronne brisée",scene:"aurora",hint:"Turn Around rappelle les dernières aurores pour les éteindre. Libérez les trois brèches, rassemblez-vous dans les refuges et faites valider votre position par le MJ. Les trois aurores permettent d’appeler Odin, même après une trahison.",quote:"Regardez-les une dernière fois, enfants de mouche. Après cette nuit, aucune aurore ne se lèvera."}
]
function isKingEncounter(mob){return mob?.name==="roi"&&mob.encounterProfile==="king-v1"}
function initializeKingEncounter(mob){
 if(mob.name!=="roi")return mob
 const hp=Math.round(mob.maxHP*2.25/5)*5
 return {...mob,hp,maxHP:hp,baseBalancedHP:hp,actionsPerTurn:1,encounterProfile:"king-v1",king:{phase:1,pillars:3,disruptions:0,auroras:{},specialsUsed:{},openingHits:0}}
}
function kingStage(mob){return Math.max(mob?.king?.phase||1,mob?.hp<=mob?.maxHP*.2?5:mob?.hp<=mob?.maxHP*.4?4:mob?.hp<=mob?.maxHP*.6?3:mob?.hp<=mob?.maxHP*.8?2:1)}
function kingPhaseInfo(mob){return KING_PHASES[kingStage(mob)-1]}
function kingAuroraCount(mob){return [0,1,2].filter(i=>mob?.king?.auroras?.[i]).length}
function kingSpecialAttack(mob){
 const stage=mob.chargingSpecial?.kingStage||kingStage(mob)
 return {name:["","Sentence royale","Le tribut de sang","Décret des sujets","Le refus du destin","Turn Around"][stage],icon:stage===5?"☄":"👑",dmgMin:26,dmgMax:40,special:true,oncePerCombat:false,oncePerPhase:true,effect:stage>=3?"all":null,kingStage:stage,healSelfRatio:stage===2?.75:0,flavor:KING_PHASES[stage-1].hint}
}
function kingNormalAttacks(mob){return getMobAttacksForMob("roi","boss")}
function kingSpecialUsed(mob){return !!mob.king?.specialsUsed?.[mob.chargingSpecial?.kingStage||kingStage(mob)]}
function kingDamageFactor(attack,mob){return isKingEncounter(mob)?1.35*(attack.special?[0,2.1,1.35,1,3.2,4.5][attack.kingStage||kingStage(mob)]:1):1}
function kingOdinAvailable(mob){return isKingEncounter(mob)&&mob.hp>0&&kingStage(mob)===5&&kingAuroraCount(mob)===3&&!mob.king.odinInvoked&&mob.chargingSpecial?.kingStage===5}
