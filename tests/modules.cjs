const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),base=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const files=[...html.matchAll(/(?:src=["']|src=\\["'])([^"'?<>]+\.js)/g)].map(x=>x[1]).filter(x=>fs.existsSync(path.join(base,x))),results=[];
function test(name,fn){fn();results.push({name,ok:true})}
test('Les modules sont chargés une seule fois avant leur interface',()=>{for(const name of ['character-sheet.js','shops.js','wanted.js','rune-challenge.js']){assert.equal(files.filter(x=>x===name).length,1);assert(files.indexOf(name)<files.indexOf('ui.js'))}assert(files.indexOf('rune-challenge.js')<files.indexOf('game.js'))});
test('Les modules sont inclus dans le cache de cette version',()=>{const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');for(const name of ['character-sheet.js','shops.js','wanted.js','rune-challenge.js'])assert(sw.includes('"'+name+'"'));const version=html.match(/GAME_V\s*=\s*"([^"]+)"/)?.[1];assert(version);assert(sw.includes('rpg-code-'+version))});
test('Tous les scripts chargés sont valides ensemble',()=>new vm.Script(files.map(name=>fs.readFileSync(path.join(base,name),'utf8')).join('\n;\n')));
test('Aucune fonction globale définie plusieurs fois',()=>{const names=new Set();for(const file of files)for(const match of fs.readFileSync(path.join(base,file),'utf8').matchAll(/^(?:async )?function (\w+)\(/gm)){assert(!names.has(match[1]),match[1]);names.add(match[1])}});
console.log(JSON.stringify({passed:results.length,results},null,2));
