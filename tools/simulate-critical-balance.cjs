const fs=require('fs');
const {combatSandbox,runFight,summarize}=require('../tests/combat-simulation.cjs');
const ctx=combatSandbox(),rows=[],samplesPerCase=100;
const scenarios=[
 {name:'Ordinaire',names:['garde'],tier:'medium'},
 {name:'Boss',names:['garde'],tier:'boss'},
 {name:'Kraken, réactions',names:['kraken'],krakenProfile:true,krakenSupport:'reactions'},
 {name:'Kraken, stratégies MJ',names:['kraken'],krakenProfile:true,krakenSupport:'tactics'},
 {name:'Kraken, réactions et un PNJ offensif',names:['kraken'],krakenProfile:true,krakenSupport:'reactions',ally:true}
];
for(const level of [1,6,20])for(const scenario of scenarios){
 const versions={};
 for(const criticalRulesVersion of [0,1]){
  const samples=Array.from({length:samplesPerCase},(_,i)=>runFight(ctx,{...scenario,level,version:3,criticalRulesVersion,seed:2000+i*7919}));
  versions[criticalRulesVersion]=summarize(samples);
  if(versions[criticalRulesVersion].errors.length)throw Error(JSON.stringify(versions[criticalRulesVersion].errors));
 }
 rows.push({level,scenario:scenario.name,legacy:versions[0],enhanced:versions[1]});
 console.log(JSON.stringify({level,scenario:scenario.name,oldWin:versions[0].winRate,newWin:versions[1].winRate,oldRounds:versions[0].medianRounds,newRounds:versions[1].medianRounds}));
}
fs.writeFileSync('reports/combat-criticals-2026-11-17.json',JSON.stringify({scope:'3000 deterministic fights through real reducers. Baseline stats, no gear; scripted strategy and optional single Melenchon intervention. Not a measurement of human play. Existing v3 enemy health/damage and Pika mechanics unchanged.',samplesPerCase,rows},null,2));
