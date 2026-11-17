"use strict"

// Épreuve runique : interface, indices, animations et nettoyage.
function encodeToRunes(text, rev) { const r=rev||[]; return text.split("").map(c=>{ if(r.includes(c.toUpperCase())) return c; return runeAlphabet[c]||(c===" "?" ":c===","?"᛫":c==="."?"᛬":c==="'"?"'":c) }).join("") }

function openRuneChallenge() {
  if(!isGM) return
  _state.runeJustOpened=false
  const existing = window.activeRuneChallengeData
  if (existing && existing.active) {
    renderRuneChallenge(existing)
    document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
    return
  }
  db.ref("game/runeChallenge").set({ active:true, unlockedHints:[], revealedLetters:[], time:Date.now() })
  document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
}

function decodeRuneProgress(text, rev) {
  const revealed = rev || []
  return String(text || "").split("").map(c => {
    const up = c.toUpperCase()
    if (/[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸÆŒ]/i.test(c)) return revealed.includes(up) ? c : "·"
    if (c === " " || c === "," || c === "." || c === "'") return c
    return c
  }).join("")
}

function closeRuneChallenge() {
  const ov=document.getElementById("runeChallengeOverlay")
  if(ov) ov.remove()
  _state.runeJustOpened = false
}

function endRuneChallenge() {
  db.ref("game/runeChallenge").remove()
  closeRuneChallenge()
  const btn=document.getElementById("playerCodeBtn")
  if(btn) btn.remove()
}

function toggleRuneOverlay(data) { const ov=document.getElementById("runeChallengeOverlay"); if(ov) ov.remove(); else renderRuneChallenge(data) }

function updateRuneMenuBtn(active) { const l=document.getElementById("runeLaunchBtn"),c=document.getElementById("runeContinueBtn"); if(!l) return; if(active){ l.style.display="none"; if(c) c.style.display="block" } else { l.style.display="block"; if(c) c.style.display="none"; _state.runeJustOpened=false } }

function renderRuneChallenge(data) {
  document.getElementById("runeChallengeOverlay")?.remove()
  const uh=data.unlockedHints||[], rev=data.revealedLetters||[], enc=encodeToRunes(secretMessage,rev), dec=decodeRuneProgress(secretMessage,rev)
  const ov=document.createElement("div"); ov.id="runeChallengeOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,5,2,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.6s ease;overflow-y:auto;padding:20px 0;"
  const t=document.createElement("div"); t.style.cssText="font-family:'Cinzel Decorative','Cinzel',serif;font-size:26px;color:#c8a050;letter-spacing:6px;margin-bottom:6px;text-shadow:0 0 20px gold;"; t.innerText="ᚱᚢᚾᛖᛊ ᛞᛖ ᛚ'ᚨᚾᚲᛁᛖᚾ"; ov.appendChild(t)
  const st=document.createElement("div"); st.style.cssText="font-family:'IM Fell English',serif;font-size:14px;color:#8a6830;margin-bottom:24px;letter-spacing:2px;"; st.innerText="Déchiffrez le message des anciens..."; ov.appendChild(st)
  const mb=document.createElement("div"); mb.style.cssText="background:url('images/roc.png') center/100% 100% no-repeat;padding:50px 70px;max-width:700px;width:90vw;text-align:center;margin-bottom:24px;border-radius:4px;"
  const rt=document.createElement("div"); rt.style.cssText="font-size:32px;color:#ffe8a0;line-height:2.2;letter-spacing:6px;font-family:serif;word-break:break-word;font-weight:bold;"; rt.innerText=enc; mb.appendChild(rt); ov.appendChild(mb)
  const dbx=document.createElement("div"); dbx.style.cssText="max-width:720px;width:90vw;text-align:center;margin:-6px 0 20px;"
  const dtitle=document.createElement("div"); dtitle.style.cssText="font-family:Cinzel,serif;font-size:11px;color:#8a6830;letter-spacing:3px;margin-bottom:8px;"; dtitle.innerText="— TRADUCTION EN COURS —"
  const dline=document.createElement("div"); dline.style.cssText="font-family:'Cinzel',serif;font-size:24px;color:#f5e6c8;line-height:1.8;letter-spacing:4px;word-break:break-word;text-shadow:0 0 10px rgba(0,0,0,0.8);"
  dline.innerText=dec
  dbx.appendChild(dtitle)
  dbx.appendChild(dline)
  ov.appendChild(dbx)
  if(uh.length){ const hb=document.createElement("div"); hb.style.cssText="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:700px;margin-bottom:16px;"; uh.forEach(hid=>{ const h=runeHints.find(x=>x.id===hid); if(!h) return; const card=document.createElement("div"); card.style.cssText="background:rgba(200,160,80,0.12);border:1px solid rgba(200,160,80,0.4);border-radius:6px;padding:8px 16px;font-family:serif;font-size:16px;color:#c8a050;letter-spacing:2px;"; card.innerHTML=`<div style="font-size:10px;color:#8a6830;font-family:Cinzel;margin-bottom:4px;">${h.desc}</div>${h.runes}`; hb.appendChild(card) }); ov.appendChild(hb) }
  if(rev.length){ const rb=document.createElement("div"); rb.style.cssText="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:700px;margin-bottom:16px;"; const revT=document.createElement("div"); revT.style.cssText="width:100%;text-align:center;font-family:Cinzel;font-size:11px;color:#8a6830;letter-spacing:2px;margin-bottom:4px;"; revT.innerText="— LETTRES RÉVÉLÉES —"; rb.appendChild(revT); rev.forEach(l=>{ const r=runeAlphabet[l]||"?"; const p=document.createElement("div"); p.style.cssText="background:rgba(200,160,80,0.2);border:1px solid gold;border-radius:20px;padding:4px 12px;font-size:18px;color:#f5e6c8;"; p.innerHTML=`<span style="font-family:serif;">${r}</span> <span style="font-family:Cinzel;font-size:12px;color:#c8a050;">${l}</span>`; rb.appendChild(p) }); ov.appendChild(rb) }
  if(isGM){ const as=document.createElement("div"); as.style.cssText="display:flex;flex-direction:column;align-items:center;gap:10px;width:90vw;max-width:600px;"; const ai=document.createElement("input"); ai.placeholder="Tapez votre réponse ici..."; ai.style.cssText="width:100%;padding:12px 20px;font-family:'Cinzel',serif;font-size:14px;background:rgba(200,160,80,0.1);border:1px solid rgba(200,160,80,0.4);border-radius:4px;color:#f5e6c8;text-align:center;outline:none;"; const sb=document.createElement("button"); sb.innerText="⚔ Valider la réponse"; sb.style.cssText="padding:10px 30px;font-family:'Cinzel',serif;font-size:14px;background:linear-gradient(#7a5520,#3a2508);color:#c8a050;border:1px solid #c8a050;border-radius:4px;cursor:pointer;"; sb.onclick=()=>{ const ans=ai.value.toLowerCase().replace(/[^a-zéèàâêôîûçœ ]/g,"").replace(/\s+/g," ").trim(), tgt=secretAnswer.replace(/[^a-zéèàâêôîûçœ ]/g,"").replace(/\s+/g," ").trim(); if(ans===tgt) showRuneVictory(); else{ ai.style.borderColor="red"; setTimeout(()=>ai.style.borderColor="rgba(200,160,80,0.4)",1000); screenShakeHard() } }; as.appendChild(ai); as.appendChild(sb); ov.appendChild(as)
    const br=document.createElement("div"); br.style.cssText="display:flex;gap:10px;margin-top:16px;"; const xb=document.createElement("button"); xb.innerText="✕ Quitter"; xb.style.cssText="padding:8px 24px;font-family:'Cinzel',serif;font-size:12px;background:rgba(80,20,20,0.4);color:#ff8080;border:1px solid rgba(180,40,40,0.4);border-radius:4px;cursor:pointer;"; xb.onclick=closeRuneChallenge; br.appendChild(xb); ov.appendChild(br) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",20)
}

function unlockRuneHint(hintId) { if(!isGM)return; db.ref("game/runeChallenge/unlockedHints").once("value",snap=>{ const c=snap.val()||[]; if(!c.includes(hintId)){ c.push(hintId); db.ref("game/runeChallenge/unlockedHints").set(c); showNotification("Fragment runique découvert !"); flashGold() } }) }

function revealRuneLetter(letter) { if(!isGM) return; db.ref("game/runeChallenge/revealedLetters").once("value",snap=>{ const c=snap.val()||[], u=letter.toUpperCase(); if(!c.includes(u)){ c.push(u); db.ref("game/runeChallenge/revealedLetters").set(c); showNotification("Lettre révélée : "+u+" = "+(runeAlphabet[u]||"?")) } }) }

function _showRuneVictoryNow() { playSound("critSound"); flashGold(); flashGold(); screenShakeHard(); powerExplosion(); const w=document.createElement("div"); w.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:40px;color:gold;text-shadow:0 0 20px gold;text-align:center;pointer-events:none;z-index:99999999;"; const title=document.createElement("div"); title.innerText="⚔ MESSAGE DÉCHIFFRÉ ⚔"; const sub=document.createElement("span"); sub.style.cssText="font-size:18px;color:#c8a050;"; sub.innerText="Les runes révèlent leur secret !"; w.appendChild(title); w.appendChild(sub); document.body.appendChild(w); setTimeout(()=>{ w.style.transition="opacity 1s"; w.style.opacity="0"; setTimeout(()=>w.remove(),1000) },4000) }

async function tryRuneEventOnDice(eventId) {
  if(!isGM || !eventId || window.__sessionBusy)return
  const box=document.getElementById("storyImage")
  if(!box || box.style.display!=="flex")return
  try {
    const claim=await db.ref("game/runeDiceClaims/"+eventId).transaction(value=>value?undefined:true)
    if(!claim.committed)return
    const data=(await db.ref("game/runeChallenge").once("value")).val()
    if(!data?.active || Math.random()>0.25)return
    const revealed=data.revealedLetters||[],letters=[...new Set("ALUERDSBVTIN OPQCM".split("").filter(c=>c.trim()))].filter(c=>!revealed.includes(c))
    if(!letters.length)return
    const letter=letters[Math.floor(Math.random()*letters.length)]
    await db.ref("game/runeDiceEvent").set({id:eventId,letter,rune:runeAlphabet[letter]||"?",dialogue:runeEventDialogues[Math.floor(Math.random()*runeEventDialogues.length)],time:Date.now()})
    setTimeout(()=>revealRuneLetter(letter),3000)
  }catch(error){console.warn("Événement de rune non confirmé",error)}
}

function showRuneBubble(dialogue, letter, rune) { const ex=document.getElementById("runeBubble"); if(ex) ex.remove(); const b=document.createElement("div"); b.id="runeBubble"; b.style.cssText="position:fixed;bottom:30%;left:55%;max-width:320px;background:url('images/paper.png') center/100% 100% no-repeat;padding:24px 30px;font-family:'IM Fell English',serif;font-size:15px;color:#2b1a10;line-height:1.6;z-index:9999999;opacity:0;transition:opacity 0.6s ease;pointer-events:none;"; const tx=document.createElement("div"); tx.innerText=dialogue; tx.style.cssText="margin-bottom:12px;font-style:italic;"; b.appendChild(tx); const rd=document.createElement("div"); rd.style.cssText="text-align:center;font-size:32px;color:#c8a050;text-shadow:0 0 10px gold;font-family:serif;margin:8px 0 4px;"; rd.innerText=rune; b.appendChild(rd); const ld=document.createElement("div"); ld.style.cssText="text-align:center;font-family:'Cinzel',serif;font-size:14px;color:#8b4000;letter-spacing:2px;"; ld.innerText="= "+letter; b.appendChild(ld); document.body.appendChild(b); setTimeout(()=>b.style.opacity="1",50); playSound("parcheminSound"); setTimeout(()=>{ b.style.opacity="0"; setTimeout(()=>b.remove(),600) },6000) }

function showRuneVictory(){if(isGM)db.ref("game/runeVictory").set({time:Date.now(),id:db.ref("game/runeVictory").push().key})}

function cleanupRuneChallengeUI() {
  const overlay = document.getElementById("runeChallengeOverlay")
  if (overlay) overlay.remove()
  const playerBtn = document.getElementById("playerCodeBtn")
  if (playerBtn) playerBtn.remove()
  window.activeRuneChallengeData = null
  _state.runeJustOpened = false
}
