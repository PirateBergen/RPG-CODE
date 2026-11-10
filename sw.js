const CACHE="rpg-code-20261110.15"
const BASE=new URL("./",self.location.href)
const PRECACHE=["./","index.html","style.css","config.js","state.js","utils.js","access.js","persistence.js","presentation.js","shortcuts.js","game.js","reading.js","celestial-events.js","wanted.js","rune-challenge.js","ui.js","character-sheet.js","shops.js","combat.js","combat-core.js","pika-combat.js","combat-runtime.js","exploration-core.js","exploration.js","oregon-voyage.js","ally-discovery.js","balrog-sword.js","antre-event.js","combat-exit.js","character-effects-core.js","character-effects.js","session-view.js","gm-arbitration.js","entrance.js","reliability.js","gm-diagnostics.js","local-test-mode.js","manifest.json","fonts/fonts.css"].map(file=>new URL(file,BASE).href)
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(PRECACHE.map(url=>cache.add(url)))).then(()=>self.skipWaiting())))
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith("rpg-code-")||k==="rpg-v1")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())))
self.addEventListener("fetch",e=>{
 const url=new URL(e.request.url)
 if(e.request.method!=="GET"||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return
 const ext=url.pathname.split(".").pop().toLowerCase()
 if(["mp3","ogg","wav","mp4","m4a","webm"].includes(ext))return
 const store=async response=>{if(response.ok&&response.status===200){const cache=await caches.open(CACHE);await cache.put(e.request,response.clone())}return response}
 if(e.request.mode==="navigate"||url.pathname===BASE.pathname||["html","js","css","json"].includes(ext)){
  e.respondWith(fetch(e.request).then(store).catch(async()=>await (await caches.open(CACHE)).match(e.request,{ignoreSearch:["js","css"].includes(ext)})||new Response("Connexion nécessaire pour ouvrir cette version du jeu.",{status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}})));return
 }
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(store).catch(()=>new Response("Ressource indisponible hors connexion",{status:503}))))
})
