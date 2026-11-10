const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),{release}=require('../tools/release.cjs'),{verify}=require('../tools/verify-release.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rpg-release-')),root=path.join(temp,'source'),out=path.join(temp,'site'),sha='a'.repeat(40);let checks=0;
function put(name,text){const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text)}
(async()=>{try{
 for(const n of ['config.js','game.js','ui.js','reading.js','ally-discovery.js'])put(n,'"use strict";');
 put('index.html','<script>window.GAME_V = "test.1"</script><script src="config.js?v=1"></script>');put('sw.js','const CACHE="rpg-code-test.1"');put('style.css','body{}');put('manifest.json','{}');put('fonts/fonts.css','');put('images/rune-mysterieuse.png','image');put('audio/pika-special-music.wav','audio');put('images/other.png','other');put('.env','private');put('firebase.database.rules.json','private');put('tests/private.cjs','private');
 const manifest=release(root,out,sha);assert.equal(manifest.commit,sha);assert.equal(manifest.version,'test.1');for(const n of ['.env','tests','firebase.database.rules.json'])assert(!fs.existsSync(path.join(out,n)));assert(fs.existsSync(path.join(out,'.nojekyll')));checks++;
 const mock=async url=>{const name=decodeURIComponent(new URL(url).pathname).slice('/game/'.length),file=path.join(out,name);return fs.existsSync(file)?new Response(fs.readFileSync(file),{status:200}):new Response('',{status:404})};
 const r=await verify('https://example.test/game/',manifest,{fetcher:mock});assert.equal(r.checked,manifest.critical.length);checks++;
 await assert.rejects(verify('https://example.test/game/',{...manifest,commit:'b'.repeat(40)},{fetcher:mock}),/autre version/);checks++;
 fs.appendFileSync(path.join(out,'ui.js'),'changed');await assert.rejects(verify('https://example.test/game/',manifest,{fetcher:mock}),/ui.js.*Contenu publié différent/);checks++;
 fs.copyFileSync(path.join(root,'ui.js'),path.join(out,'ui.js'));fs.unlinkSync(path.join(out,'reading.js'));await assert.rejects(verify('https://example.test/game/',manifest,{fetcher:mock}),/reading.js.*404/);checks++;
 fs.copyFileSync(path.join(root,'reading.js'),path.join(out,'reading.js'));await verify('https://example.test/game/',manifest,{fetcher:mock,all:true});checks++;
 put('sw.js','const CACHE="rpg-code-other"');assert.throws(()=>release(root,path.join(temp,'bad'),sha),/Versions/);checks++;
 put('sw.js','const CACHE="rpg-code-test.1"');put('game.js','function {');assert.throws(()=>release(root,path.join(temp,'syntax'),sha),SyntaxError);checks++;
 put('game.js','');fs.unlinkSync(path.join(root,'reading.js'));assert.throws(()=>release(root,path.join(temp,'missing'),sha),/essentiel absent/);checks++;
 await assert.rejects(verify('https://example.test/game/',manifest,{fetcher:async()=>{throw Error('offline')}}),/offline/);checks++;
 console.log('OK '+checks+' contrôles : version exacte, empreintes, fichier absent, erreur réseau, code invalide et exclusion des fichiers privés.');
}finally{const resolved=path.resolve(temp);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('rpg-release-'))throw Error('Nettoyage temporaire refusé');fs.rmSync(resolved,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
