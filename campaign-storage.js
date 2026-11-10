"use strict"

// Virtual database root: live state is scoped; archives keep their stable address.
function createCampaignDatabase(raw) {
 let layout=null,known=false,resolveReady
 const ready=new Promise(resolve=>{resolveReady=resolve}),listeners=new Set()
 const normalize=path=>String(path||"").replace(/^\/+|\/+$/g,"")
 const rawRef=path=>path?raw.ref(path):raw.ref()
 const physical=path=>layout===2&&!/^saves(?:\/|$)|^\.info(?:\/|$)/.test(path)?"active"+(path?"/"+path:""):path
 const select=snapshot=>{
  const next=snapshot.val()===2?2:1
  if(known&&layout!==next){window.__sessionBusy=true;window.__campaignStorageChanged=true;setTimeout(()=>window.location.reload(),500);return}
  layout=next;known=true;resolveReady()
 }
 raw.ref("storageLayout").on("value",select,()=>{if(!known){layout=1;resolveReady()}})
 function reference(path="",queries=[]){
  path=normalize(path)
  const target=()=>queries.reduce((r,[method,args])=>r[method](...args),rawRef(physical(path)))
  const run=fn=>ready.then(()=>{if(window.__campaignStorageChanged)throw Error("La partie a été optimisée. Rechargez cette page.");return fn(target())})
  return new Proxy({}, {get(_,key){
   if(key==="key")return path.split("/").at(-1)||null
   if(key==="parent")return path?reference(path.split("/").slice(0,-1).join("/")):null
   if(key==="root")return reference()
   if(key==="ref")return reference(path)
   if(key==="toString"||key==="toJSON")return()=>rawRef(physical(path)).toString()
   if(key==="child")return child=>reference(path+(path?"/":"")+normalize(child),queries)
   if(["orderByChild","orderByKey","orderByValue","orderByPriority","startAt","endAt","equalTo","limitToFirst","limitToLast"].includes(key))return(...args)=>reference(path,[...queries,[key,args]])
   if(key==="on")return(event,callback,...args)=>{const item={path,queries,event,callback,cancelled:false,ref:null};listeners.add(item);run(ref=>{if(!item.cancelled){item.ref=ref;ref.on(event,callback,...args)}}).catch(error=>{const cancel=args.find(a=>typeof a==="function");if(cancel)cancel(error);else console.warn("Abonnement interrompu",error.message)});return callback}
   if(key==="off")return(event,callback)=>{for(const item of listeners)if(item.path===path&&JSON.stringify(item.queries)===JSON.stringify(queries)&&(!event||item.event===event)&&(!callback||item.callback===callback)){item.cancelled=true;item.ref?.off(item.event,item.callback);listeners.delete(item)}}
   if(key==="push")return(value,callback)=>{const id=rawRef(path).push().key,child=reference(path+(path?"/":"")+id);if(value===undefined)return child;const promise=child.set(value,callback);return new Proxy(child,{get:(object,name)=>name==="then"||name==="catch"?promise[name].bind(promise):object[name]})}
   if(key==="onDisconnect")return()=>Object.fromEntries(["set","update","remove","cancel"].map(method=>[method,(...args)=>run(ref=>ref.onDisconnect()[method](...args))]))
   if(["once","set","update","remove","transaction"].includes(key))return(...args)=>run(ref=>ref[key](...args))
   return undefined
  }})
 }
 return {ref:reference,app:raw.app,goOnline:()=>raw.goOnline(),goOffline:()=>raw.goOffline(),__campaignReady:ready,__campaignLayout:()=>layout,__campaignLayoutKnown:()=>known}
}

async function optimizeCampaignStorage(){
 try{
  requirePersistenceGM();requireExplorationConnection()
  if(db.__isolatedTest){showNotification("L’essai est déjà séparé de la campagne ; cette optimisation concerne la vraie partie.");return false}
  await db.__campaignReady
  if(!db.__campaignLayoutKnown())throw Error("La préparation du serveur n’est pas encore disponible.")
  if(db.__campaignLayout()===2){showNotification("Les sauvegardes sont déjà séparées des actions de la partie.");return true}
  return await withSessionOperation("migrating",async operation=>{
   const result=await reliableRootTransaction(root=>{
    if(root?.sessionControl?.id!==operation.id||root.storageLayout===2)throw Error("La partie a changé. Réessayez après rechargement.")
    for(const [uid,tabs] of Object.entries(root.sessionClients||{}))for(const [tab,connected] of Object.entries(tabs||{}))if(connected&&(()=>{const m=String(root.profiles?.[uid]?.clientVersions?.[tab]||"").match(/^(\d{8})\.(\d+)$/);return !m||+m[1]<20261110||(+m[1]===20261110&&+m[2]<21)})())throw Error("Un écran utilise encore une ancienne version. Rechargez tous les écrans avant de réessayer.")
    const {saves,...active}=root
    active.sessionClients={};active.sessionAcks={};for(const profile of Object.values(active.profiles||{}))delete profile.clientVersions;active.sessionControl={revision:operation.id,action:"storage-migration",changedAt:Date.now()}
    return {storageLayout:2,active,roles:root.roles,profiles:root.profiles,...(saves?{saves}:{})}
   },true)
   if(!result.committed)throw Error("Optimisation non confirmée")
   operation.markCommitted();showNotification("Partie optimisée. Rechargement des écrans…");setTimeout(()=>window.location.reload(),500);return true
  })
 }catch(error){showNotification("Optimisation non effectuée : "+error.message);return false}
}
