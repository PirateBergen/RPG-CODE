function createDraftAudioStore(){
  let opening=null
  function database(){if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open('rpg-campaign-editor-audio-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};request.onerror=()=>{opening=null;reject(Error('Le stockage audio du navigateur est indisponible. Conservez vos fichiers originaux.'))};request.onblocked=()=>{opening=null;reject(Error('Fermez les autres onglets de l’éditeur pour ouvrir le stockage audio.'))}});return opening}
  async function run(mode,action){const db=await database();return new Promise((resolve,reject)=>{const transaction=db.transaction('files',mode),request=action(transaction.objectStore('files'));transaction.oncomplete=()=>resolve(request.result);transaction.onerror=transaction.onabort=()=>reject(Error('Impossible de conserver ce son dans le navigateur. Vérifiez l’espace disponible et gardez le fichier original.'))})}
  return {get:hash=>run('readonly',store=>store.get(hash)),put:(hash,blob)=>run('readwrite',store=>store.put(blob,hash))}
}
async function readDraftAudioFile(file){
  const extension=file.name.split('.').pop().toLowerCase(),mime={mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'}[extension]
  if(!mime||file.size<1||file.size>50*1024*1024)throw Error('Choisissez un fichier MP3, WAV, OGG ou M4A de 50 Mo maximum.')
  const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join(''),blob=new Blob([bytes],{type:mime})
  const url=URL.createObjectURL(blob),test=new Audio();test.preload='metadata'
  try{await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Ce fichier audio ne peut pas être lu par ce navigateur.')),15000);test.onloadedmetadata=()=>{clearTimeout(timeout);resolve()};test.onerror=()=>{clearTimeout(timeout);reject(Error('Fichier audio illisible ou format non pris en charge.'))};test.src=url})}finally{test.onloadedmetadata=test.onerror=null;test.pause();test.removeAttribute('src');test.load();URL.revokeObjectURL(url)}
  return {sha256,mime,blob,fileName:file.name,bytes:file.size}
}
