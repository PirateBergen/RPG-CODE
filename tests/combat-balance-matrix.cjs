// Broader reproducible audit; intentionally separate from the quick unit suite.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {combatSandbox,runFight,summarize}=require('./combat-simulation.cjs');
const ctx=combatSandbox(),names=vm.runInContext('Object.keys(mobStats)',ctx),rows=[];
function sample(label,options,count=30){
 const summary=summarize(Array.from({length:count},(_,i)=>runFight(ctx,{...options,version:3,seed:1000+i*7919})));
 assert.deepEqual(summary.errors,[],label);assert.equal(summary.timeouts,0,label);
 rows.push({label,options,...summary});
}
for(const level of [1,10,50])for(const name of names){if(name!=='jormungand')sample('espèce '+name+' niveau '+level,{level,names:[name]})}
for(const level of [1,10,50]){
 sample('groupe mixte niveau '+level,{level,names:['garde','golem','gobelins']});
 sample('équipement niveau '+level,{level,names:['roi'],gear:15});
 sample('renfort allié niveau '+level,{level,names:['roi'],ally:true});
 sample('niveaux mélangés autour de '+level,{level,names:['kraken'],heroLevels:{greg:Math.max(1,level-3),ju:level,elo:level+3}});
 sample('sans soins ni hypnose niveau '+level,{level,names:['kraken'],policy:'basic'});
}
const report={scope:'Audit local du moteur réel : toutes les espèces sauf Jörmungandr (victoire scénarisée testée séparément), niveaux 1/10/50, groupes mixtes, équipement, une intervention de Mélenchon, niveaux mélangés et stratégie sans soutien. Décisions scriptées ; aucune donnée de partie réelle.',fights:rows.reduce((n,r)=>n+r.samples,0),rows};
fs.writeFileSync('reports/combat-balance-matrix-2026-11-15.json',JSON.stringify(report,null,2));
console.log(report.fights+' combats, '+rows.length+' scénarios, aucune erreur ni limite de tours atteinte.');
for(const row of rows.filter(r=>!r.label.startsWith('espèce ')))console.log(row.label,JSON.stringify({wins:row.winRate,medianRounds:row.medianRounds,remainingHP:row.meanRemainingHP}));
