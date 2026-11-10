const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{JSDOM}=require('jsdom'),{extract}=require('./presentation.cjs'),root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{runScripts:'outside-only'}),w=dom.window;
try{
 const evaluate=s=>vm.runInContext(s,dom.getInternalVMContext());evaluate(fs.readFileSync(root+'/config.js','utf8'));evaluate(extract('game.js','getMaxHP'));evaluate(extract('character-sheet.js','updateHPBar'));const hp=w.document.getElementById('hp'),lvl=w.document.getElementById('lvl'),bar=w.document.getElementById('hpBar');
 for(const [hero,level,max] of [['greg',1,120],['ju',1,100],['elo',1,110],['bibi',1,110],['greg',5,160]]){
  w.currentSheetPlayer=hero;lvl.value=level;
  for(const [value,percent] of [[0,0],[max/2,50],[max,100],[max+100,100],[-10,0]]){hp.value=value;w.updateHPBar();assert.equal(parseFloat(bar.style.width),percent,hero+' '+value+'/'+max);assert.equal(hp.value,String(value),'L’affichage ne modifie pas les PV');assert.equal(bar.getAttribute('aria-valuemax'),String(max));}
 }
 w.currentSheetPlayer='greg';lvl.value=1;hp.value=60;w.updateHPBar();assert.equal(bar.style.width,'50%');assert.equal(bar.title,'60 / 120 PV');lvl.value=5;hp.value=80;w.updateHPBar();assert.equal(bar.style.width,'50%');assert.equal(bar.getAttribute('aria-valuetext'),'80 / 160 PV');
 for(const field of [hp,lvl])assert.equal(field.getAttribute('oninput'),'updateHPBar()');
 w.currentSheetPlayer='bibi';lvl.value=20;hp.value=55;w.updateHPBar();assert(parseFloat(bar.style.width)<50);assert.equal(bar.getAttribute('role'),'progressbar');
 console.log('OK fiches : Greg 60/120 = 50 %, quatre personnages, niveaux, KO, maximum, dépassement et description accessible.');
}finally{dom.window.close()}
