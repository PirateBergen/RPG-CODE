async function showSaveMenu() {
  if (!isGM || window.__authRole !== "gm") return
  document.getElementById("savePanel")?.remove()
  const panel = document.createElement("div"); panel.id = "savePanel"
  panel.style.cssText = "position:fixed;inset:12% auto auto 50%;transform:translateX(-50%);max-height:75vh;overflow:auto;z-index:2000000000;background:#15110d;border:2px solid gold;border-radius:12px;padding:24px;color:#f5e6c8;width:min(520px,90vw);font:15px Georgia,serif;"
  document.body.appendChild(panel)
  const closeSaveWindow=()=>{panel.remove();window.GameWindows?.closed(panel)}
  window.GameWindows?.register(panel,closeSaveWindow)
  const title = document.createElement("h2"); title.textContent = "Sauvegardes"; panel.appendChild(title)
  const list = document.createElement("div"); list.textContent = "Chargement…"; panel.appendChild(list)
  const button = (label, action) => { const b = document.createElement("button"); b.textContent = label; b.onclick = action; b.style.margin = "6px"; return b }
  panel.appendChild(button("Sauvegarder maintenant", () => { closeSaveWindow(); saveGame() }))
  panel.appendChild(button("Charger la plus récente", loadGame))
  panel.appendChild(button("Importer un fichier", chooseSaveFile))
  const fileHelp=document.createElement("p");fileHelp.textContent="Exportez une sauvegarde pour garder une copie sur votre ordinateur. Un import est vérifié et ne charge pas la partie automatiquement. Les fichiers d’essai et de campagne restent séparés.";panel.appendChild(fileHelp)
  panel.appendChild(button("Fermer", closeSaveWindow))
  try {
    const { entries, local } = await listGameSaves()
    if (!panel.isConnected || window.__authRole !== "gm") return
    list.replaceChildren()
    if (local) { const info = document.createElement("p"); info.textContent = "Serveur indisponible : copies locales uniquement."; list.appendChild(info) }
    if (!entries.length) list.textContent = "Aucune sauvegarde"
    entries.forEach(([id, save]) => {
      const row = document.createElement("div"); row.style.cssText = "padding:10px 0;border-bottom:1px solid #5d5038"
      const label = document.createElement("div"); label.textContent = (save._saveName || id) + " — " + (save._saveDate || "Date inconnue"); row.appendChild(label)
      row.appendChild(button("Charger", () => loadSave(id)))
      row.appendChild(button("Exporter un fichier", () => exportSaveFile(id)))
      row.appendChild(button("Supprimer", () => deleteSave(id)))
      list.appendChild(row)
    })
  } catch (error) { list.textContent = "Impossible de lire les sauvegardes : " + error.message }
}

