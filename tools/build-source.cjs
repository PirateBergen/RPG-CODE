const fs=require('fs'),path=require('path');

const HEADER='/* Generated from src/source-map.json by tools/build-source.cjs. Edit the source files, then rebuild. */\n';
const normalize=text=>text.replace(/\r\n?/g,'\n');

function assemble(root){
 root=path.resolve(root);
 const sourceRoot=path.join(root,'src'),manifest=JSON.parse(fs.readFileSync(path.join(sourceRoot,'source-map.json'),'utf8'));
 if(manifest.format!==1||!manifest.bundles||typeof manifest.bundles!=='object')throw Error('Invalid source manifest');
 const outputs=new Map(),used=new Set();
 for(const [output,parts]of Object.entries(manifest.bundles)){
  if(!/^[\w-]+\.(js|css)$/.test(output)||!Array.isArray(parts)||!parts.length)throw Error('Invalid bundle: '+output);
  let body='';
  for(const part of parts){
   if(typeof part!=='string'||part.includes('\\')||part.split('/').some(p=>!p||p==='.'||p==='..')||!(part.endsWith(path.extname(output))||output.endsWith('.js')&&part.endsWith('.jsfrag')))throw Error('Invalid source path: '+part);
   const file=path.resolve(sourceRoot,part);
   if(!file.startsWith(sourceRoot+path.sep)||!fs.realpathSync(file).startsWith(fs.realpathSync(sourceRoot)+path.sep)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error('Invalid source file: '+part);
   if(used.has(part))throw Error('Source used twice: '+part);used.add(part);
   body+=normalize(fs.readFileSync(file,'utf8'));
  }
  outputs.set(output,HEADER+body);
 }
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(js|jsfrag|css)$/.test(entry.name)){const rel=path.relative(sourceRoot,file).split(path.sep).join('/');if(!used.has(rel))throw Error('Source missing from manifest: '+rel)}}};walk(sourceRoot);
 return {outputs,manifest,sourceCount:used.size};
}

function build(root,{check=false}={}){
 const result=assemble(root),drift=[];
 for(const [name,text]of result.outputs){const file=path.join(root,name);if(!fs.existsSync(file)||normalize(fs.readFileSync(file,'utf8'))!==text){if(check)drift.push(name);else fs.writeFileSync(file,text)}}
 if(drift.length)throw Error('Generated files out of date: '+drift.join(', ')+'. Run node tools/build-source.cjs');
 return result;
}

module.exports={HEADER,normalize,assemble,build};
if(require.main===module){try{const args=process.argv.slice(2);if(args.some(arg=>arg!=='--check'))throw Error('Usage: node tools/build-source.cjs [--check]');const result=build(path.resolve(__dirname,'..'),{check:args.includes('--check')});console.log(result.sourceCount+' sources · '+result.outputs.size+' public files '+(args.includes('--check')?'verified':'assembled'));}catch(error){console.error(error.message);process.exitCode=1}}
