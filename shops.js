"use strict"

// Catalogue partagé et outils de gestion des boutiques.
function shopTypeKey(type){return type==="armurerie"?"armurerie":"marche"}
function shopImageBank(type=null){
  const items=type==="marche"?shopItems:type==="armurerie"?shopItemsArmurerie:[...shopItems,...shopItemsArmurerie]
  return [...new Map(items.filter(x=>x.img).map(x=>[x.img,{img:x.img,name:x.name}])).values()]
}
function validateShopItem(item){
  const name=String(item.name||"").trim(),baseStats=String(item.baseStats||"").trim(),basePrix=Number(item.basePrix)
  if(!name||name.length>80)throw Error("Nom requis, limité à 80 caractères")
  if(baseStats.length>300)throw Error("Description limitée à 300 caractères")
  if(!Number.isInteger(basePrix)||basePrix<0||basePrix>1000000)throw Error("Prix entier entre 0 et 1 000 000")
  if(!Object.hasOwn(categoryLabels,item.category))throw Error("Catégorie inconnue")
  if(!shopImageBank().some(x=>x.img===item.img))throw Error("Choisissez une image de la banque")
  return {id:String(item.id||""),name,baseStats,basePrix,category:item.category,img:item.img,scaling:0}
}
function getShopCatalog(state,type){
  const key=shopTypeKey(type),catalog=state?.catalogs?.[key]
  const source=catalog?.initialized===true?Object.values(catalog.items||{}):(key==="armurerie"?shopItemsArmurerie:shopItems)
  return source.filter(item=>item&&typeof item.id==="string"&&typeof item.name==="string"&&Object.hasOwn(categoryLabels,item.category))
}
async function openShop(type){
  if(!isGM||window.__authRole!=="gm")return
  try{
    requireExplorationConnection()
    await reliableRootTransaction(root=>{
      if(!root||root.sessionControl?.phase)throw Error("La partie se synchronise")
      const levels=PLAYABLE_HEROES.map(id=>Math.max(1,Number(root.characters?.[id]?.lvl)||1)),partyLvl=Math.round(levels.reduce((a,b)=>a+b,0)/levels.length)
      root.game||={};root.game.shop={...root.game.shop,open:true,type:shopTypeKey(type),partyLvl,time:Date.now()};return root
    })
  }catch(error){showNotification("Ouverture impossible : "+error.message)}
}
async function closeShop(){
  if(!isGM||window.__authRole!=="gm")return
  try{requireExplorationConnection();await reliablePut("game/shop/open",false)}catch(error){showNotification(error.message)}
}
async function changeShopCatalog(type,action,item){
  if(!isGM||window.__authRole!=="gm")throw Error("Cette action est réservée au MJ")
  requireExplorationConnection()
  const key=shopTypeKey(type),validated=action==="add"?validateShopItem(item):null
  if(action!=="add"&&action!=="remove")throw Error("Action inconnue")
  if(validated&&(!/^[A-Za-z0-9_-]{1,100}$/.test(validated.id)||["__proto__","prototype","constructor"].includes(validated.id)))throw Error("Identifiant invalide")
  const result=await reliableRootTransaction(root=>{
    if(root?.sessionControl?.phase)throw Error("La partie se synchronise")
    const shop=root?.game?.shop
    if(!shop?.open||shopTypeKey(shop.type)!==key)throw Error("La boutique a été fermée ou changée")
    const items=Object.fromEntries(getShopCatalog(shop,key).map(x=>[x.id,x]))
    if(action==="add"){if(Object.keys(items).length>=200)throw Error("Maximum de 200 articles par boutique");if(items[validated.id])throw Error("Cet article a déjà été ajouté");items[validated.id]=validated}
    else {const id=String(item?.id||"");if(!Object.hasOwn(items,id))throw Error("Cet article a déjà été retiré");delete items[id]}
    shop.catalogs||={};shop.catalogs[key]={initialized:true,items};return root
  })
  if(!result.committed)throw Error("Modification non confirmée")
  return true
}
function shopButton(label,action){const button=document.createElement("button");button.type="button";button.textContent=label;button.className="shopButton";button.onclick=action;return button}
function renderShop(partyLvl,shopType,state=window.__shopState||{},playOpeningSound=true){
  const key=shopTypeKey(shopType)
  window.__shopState=state;window.__shopType=key
  if(playOpeningSound){const sound=new Audio(typeof resolveAudioPath==="function"?resolveAudioPath("shop.mp3"):"audio/shop.mp3");setManagedAudioBaseVolume(sound,.82,"effects");sound.play().catch(()=>{})}
  _buildShop(partyLvl,null,getShopCatalog(state,key),key==="armurerie"?"⚔ Armurerie":"🛒 Marché")
}
function _buildShop(partyLvl,runeCard,items,title){
  const type=window.__shopType||"marche",overlay=document.createElement("div");overlay.id="shopOverlay";overlay.className="shopOverlay"
  const box=document.createElement("section");box.className="shopBox";box.setAttribute("role","dialog");box.setAttribute("aria-label",title)
  const heading=document.createElement("h2");heading.textContent=title;box.appendChild(heading)
  const sub=document.createElement("p");sub.textContent="Niveau du groupe : "+partyLvl;box.appendChild(sub)
  if(isGM){const tools=document.createElement("div");tools.className="shopTools";tools.appendChild(shopButton("＋ Ajouter un article",()=>openShopItemEditor(type,partyLvl)));tools.appendChild(shopButton("Fermer la boutique",closeShop));box.appendChild(tools)}
  const cats=[...new Set(items.map(x=>x.category))],nav=document.createElement("div");nav.className="shopTools";box.appendChild(nav)
  const zone=document.createElement("div");zone.id="shopItemsZone";zone.className="shopGrid";box.appendChild(zone)
  const active=window.__shopCategory?.[type],initial=cats.includes(active)?active:cats[0]
  function show(category){
    window.__shopCategory||={};window.__shopCategory[type]=category;zone.replaceChildren()
    nav.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.category===category)))
    const selection=items.filter(x=>x.category===category)
    if(!selection.length){const empty=document.createElement("p");empty.textContent="Aucun article dans cette boutique.";zone.appendChild(empty)}
    for(const item of selection){
      const card=document.createElement("article");card.className="shopItem";card.dataset.itemId=item.id
      const img=document.createElement("img");img.alt="";img.src="images/"+(shopImageBank().some(x=>x.img===item.img)?item.img:"bag.png");card.appendChild(img)
      const name=document.createElement("h3");name.textContent=item.name;card.appendChild(name)
      const desc=document.createElement("p");desc.textContent=getShopStats(item,partyLvl);card.appendChild(desc)
      const price=document.createElement("strong");price.textContent="💰 "+getShopPrice(item,partyLvl)+" po";card.appendChild(price)
      if(isGM)card.appendChild(shopButton("Retirer de la boutique",async()=>{if(!confirm("Retirer « "+item.name+" » de cette boutique ?"))return;try{await changeShopCatalog(type,"remove",item)}catch(error){showNotification(error.message)}}))
      zone.appendChild(card)
    }
  }
  for(const category of cats){const button=shopButton(categoryLabels[category],()=>show(category));button.dataset.category=category;nav.appendChild(button)}
  overlay.appendChild(box);document.body.appendChild(overlay);show(initial)
}
function openShopItemEditor(type,partyLvl){
  if(!isGM||window.__authRole!=="gm")return
  document.getElementById("shopItemEditor")?.remove()
  const overlay=document.createElement("div");overlay.id="shopItemEditor";overlay.className="shopOverlay shopEditorOverlay";overlay.dataset.type=type
  const form=document.createElement("form");form.className="shopBox shopEditor";form.setAttribute("aria-label","Ajouter un article")
  const title=document.createElement("h2");title.textContent="Ajouter un article";form.appendChild(title)
  function field(label,node){const wrap=document.createElement("label");wrap.className="shopField";wrap.append(document.createTextNode(label),node);form.appendChild(wrap);return node}
  const templates=field("Partir d’un article existant",document.createElement("select"));templates.appendChild(new Option("Article personnalisé",""))
  const defaults=type==="armurerie"?shopItemsArmurerie:shopItems
  defaults.forEach((item,index)=>templates.appendChild(new Option(item.name,String(index))))
  const name=field("Nom",document.createElement("input"));name.required=true;name.maxLength=80
  const category=field("Catégorie",document.createElement("select"));Object.entries(categoryLabels).forEach(([key,label])=>category.appendChild(new Option(label,key)))
  const price=field("Prix affiché en pièces d’or",document.createElement("input"));price.type="number";price.required=true;price.min="0";price.max="1000000";price.step="1";price.value="0"
  const desc=field("Description / effets",document.createElement("textarea"));desc.maxLength=300;desc.rows=3
  let image=shopImageBank(type)[0]?.img||"bag.png"
  const bank=document.createElement("fieldset");const legend=document.createElement("legend");legend.textContent="Image de l’article";bank.appendChild(legend)
  const filters=document.createElement("div");filters.className="shopTools";bank.appendChild(filters)
  const gallery=document.createElement("div");gallery.className="shopImageBank";bank.appendChild(gallery)
  function images(filter){gallery.replaceChildren();for(const asset of shopImageBank(filter)){const button=shopButton("",()=>{image=asset.img;gallery.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.image===image)))});button.dataset.image=asset.img;button.title=asset.name;button.setAttribute("aria-label",asset.name);button.setAttribute("aria-pressed",String(asset.img===image));const img=document.createElement("img");img.src="images/"+asset.img;img.alt="";button.appendChild(img);gallery.appendChild(button)}}
  for(const [label,key]of [["Marché","marche"],["Armurerie","armurerie"],["Toutes",null]])filters.appendChild(shopButton(label,()=>images(key)))
  form.appendChild(bank);images(type)
  templates.onchange=()=>{if(templates.value==="")return;const item=defaults[Number(templates.value)];name.value=item.name;category.value=item.category;price.value=getShopPrice(item,partyLvl);desc.value=getShopStats(item,partyLvl);image=item.img;images(type)}
  const message=document.createElement("p");message.setAttribute("role","status");form.appendChild(message)
  const actions=document.createElement("div");actions.className="shopTools"
  const submit=shopButton("Ajouter à la boutique",null);submit.type="submit";actions.appendChild(submit);actions.appendChild(shopButton("Annuler",()=>overlay.remove()));form.appendChild(actions)
  form.onsubmit=async event=>{
    event.preventDefault();if(submit.disabled)return;submit.disabled=true;message.textContent="Ajout en cours…"
    try{const item={id:db.ref("game/shop").push().key,name:name.value,category:category.value,basePrix:price.value,baseStats:desc.value,img:image};await changeShopCatalog(type,"add",item);overlay.remove();showNotification("Article ajouté à la boutique.")}
    catch(error){message.textContent=error.message;submit.disabled=false}
  }
  overlay.appendChild(form);document.body.appendChild(overlay);name.focus()
}
