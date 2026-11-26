const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),vm=require('vm'),{HEADER,normalize,assemble,build}=require('../tools/build-source.cjs');
const root=path.resolve(__dirname,'..'),result=build(root,{check:true});let checks=0;
function test(name,fn){fn();checks++;console.log('OK '+name)}
test('Tous les points d’entrée restent disponibles, sans ajout de script public',()=>{
 const actual=fs.readdirSync(root).filter(name=>name.endsWith('.js')||name.endsWith('.css')).sort();assert.deepEqual([...result.outputs.keys()].sort(),actual);
 const scripts=require('./browser-scripts.cjs').browserScripts(root);for(const name of scripts)assert(result.outputs.has(name));assert(result.outputs.has('sw.js'));
});
test('Les sources de campagne, règles, interface, présentation et infrastructure sont distinctes',()=>{
 const sources=Object.values(result.manifest.bundles).flat();for(const prefix of ['campaigns/prophetie-des-mouches/','engine/','interface/','presentation/','platform/','runtime/'])assert(sources.some(name=>name.startsWith(prefix)),prefix);
 assert(sources.includes('campaigns/prophetie-des-mouches/characters/base-stats.js'));assert(sources.includes('engine/characters/progression.js'));assert(sources.includes('interface/combat/player-hud.js'));assert.equal(new Set(sources).size,sources.length);
});
test('Assemblage déterministe ; chaque JavaScript garde sa syntaxe et son contenu source',()=>{
 for(const [name,text]of result.outputs){assert.equal(normalize(fs.readFileSync(path.join(root,name),'utf8')),text);assert(text.startsWith(HEADER));if(name.endsWith('.js'))new vm.Script(text,{filename:name})}
 assert.deepEqual([...assemble(root).outputs],[...result.outputs]);
});
test('Sources JavaScript complètes et enveloppe d’initialisation explicite',()=>{
 const parts=Object.values(result.manifest.bundles).flat(),wrappers=parts.filter(name=>name.endsWith('.jsfrag'));
 assert.deepEqual(wrappers,['runtime/session/bootstrap.open.jsfrag','runtime/session/bootstrap.close.jsfrag']);
 for(const name of parts.filter(name=>name.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,'src',name),'utf8'),{filename:name});
 assert(fs.readFileSync(path.join(root,'src',wrappers[0]),'utf8').includes('document.addEventListener("DOMContentLoaded"'));
});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rpg-source-layout-'));
function put(name,text){const file=path.join(temp,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text)}
function manifest(bundles){put('src/source-map.json',JSON.stringify({format:1,bundles}))}
try{
 test('Contrôle strict : une source modifiée exige un nouvel assemblage',()=>{
  put('src/engine/rules.js','const RULE=1\n');manifest({'config.js':['engine/rules.js']});build(temp);build(temp,{check:true});put('src/engine/rules.js','const RULE=2\n');assert.throws(()=>build(temp,{check:true}),/out of date/);assert(fs.readFileSync(path.join(temp,'config.js'),'utf8').includes('RULE=1'));build(temp);assert(fs.readFileSync(path.join(temp,'config.js'),'utf8').includes('RULE=2'));
 });
 test('Source absente, doublonnée ou oubliée refusée',()=>{
  manifest({'config.js':['engine/missing.js']});assert.throws(()=>assemble(temp));manifest({'config.js':['engine/rules.js'],'game.js':['engine/rules.js']});assert.throws(()=>assemble(temp),/twice/);manifest({'config.js':['engine/rules.js']});put('src/orphan.css','body{}');assert.throws(()=>assemble(temp),/missing from manifest/);fs.unlinkSync(path.join(temp,'src/orphan.css'));
 });
 test('Chemins et sorties restent limités aux sources prévues',()=>{
  for(const part of ['../secret.js','/outside.js','engine/../rules.js','engine\\rules.js']){manifest({'config.js':[part]});assert.throws(()=>assemble(temp),/Invalid source path/)}
  manifest({'../outside.js':['engine/rules.js']});assert.throws(()=>assemble(temp),/Invalid bundle/);
 });
}finally{const resolved=path.resolve(temp);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('rpg-source-layout-'))throw Error('Invalid temporary cleanup target');fs.rmSync(resolved,{recursive:true,force:true})}
console.log(checks+' contrôles de séparation réussis');
