const fs=require('fs'),path=require('path');
function browserScripts(root=path.resolve(__dirname,'..')){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),files=[...html.matchAll(/src="([\w-]+\.js)\?v=/g)].map(m=>m[1]);
 if(!files.length)throw Error('Aucun script du jeu trouvé');
 if(new Set(files).size!==files.length)throw Error('Script chargé plusieurs fois');
 for(const file of files)if(!fs.existsSync(path.join(root,file)))throw Error('Script du jeu absent : '+file);
 return files;
}
module.exports={browserScripts};
