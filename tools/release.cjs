const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function release(root,out,commit){
 root=path.resolve(root);out=path.resolve(out);
 if(out===root||root.startsWith(out+path.sep))throw Error('Destination de publication invalide');
 if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Destination non vide : choisissez un nouveau dossier de publication');
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Commit de publication absent ou invalide');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),version=html.match(/window\.GAME_V\s*=\s*"([\w.-]+)"/)?.[1];
 if(!version||!fs.readFileSync(path.join(root,'sw.js'),'utf8').includes('rpg-code-'+version+'"'))throw Error('Versions page/cache différentes');
 const entries=[];
 for(const name of fs.readdirSync(root)){
  if(/\.(js|css|html|png|jpg|jpeg|svg|ico|webp)$/i.test(name)||name==='manifest.json'||name==='CNAME')entries.push(name);
 }
 for(const dir of ['images','audio','fonts']){
  const walk=base=>{for(const name of fs.readdirSync(path.join(root,base))){const rel=base+'/'+name,stat=fs.lstatSync(path.join(root,rel));if(stat.isSymbolicLink())throw Error('Lien interdit : '+rel);if(stat.isDirectory())walk(rel);else entries.push(rel)}};walk(dir);
 }
 const required=['index.html','style.css','sw.js','config.js','game.js','ui.js','reading.js','ally-discovery.js','manifest.json'];
 for(const name of required)if(!entries.includes(name))throw Error('Fichier essentiel absent : '+name);
 const scriptNames=[...html.matchAll(/src="([\w-]+\.js)\?v=/g)].map(m=>m[1]);
 for(const name of scriptNames)if(!entries.includes(name))throw Error('Script référencé absent : '+name);
 for(const name of entries.filter(n=>n.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
 const files={};
 for(const name of entries.sort()){
  const from=path.join(root,name),target=path.join(out,name),stat=fs.lstatSync(from);if(!stat.isFile())throw Error('Fichier invalide : '+name);
  const bytes=fs.readFileSync(from);files[name]={bytes:bytes.length,sha256:digest(bytes)};fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
 }
 const critical=entries.filter(n=>/^[^/]+\.(js|css|html|json)$/.test(n)||n==='fonts/fonts.css'||['audio/pika-special-music.wav','images/rune-mysterieuse.png'].includes(n)).sort();
 const manifest={format:1,version,commit,files,critical};fs.writeFileSync(path.join(out,'release.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(out,'.nojekyll'),'');
 return manifest;
}
module.exports={release,digest};
if(require.main===module){try{const root=path.resolve(__dirname,'..'),out=process.argv[2]||path.join(root,'_site'),commit=process.env.GITHUB_SHA||require('child_process').execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();const m=release(root,out,commit);console.log('Version '+m.version+' · '+m.commit.slice(0,7)+' · '+Object.keys(m.files).length+' fichiers préparés, '+m.critical.length+' contrôlés après publication.')}catch(e){console.error(e.message);process.exitCode=1}}
