function parseInventoryWeight(text) {
  const warnings = [], entries = []; let total = 0
  String(text || "").split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return
    const warn = message => warnings.push({ line:index + 1, message })
    const groups = [...line.matchAll(/\(([^)]*)\)/g)].map(m => m[1].trim())
    const candidates = groups.map(value => value.match(/^(?:poids\s*[:=]?\s*)?([+-]?\d+(?:[.,]\d+)?)\s*(kg|g)?$/i)).filter(Boolean)
    if (candidates.length !== 1) { warn(candidates.length ? "Plusieurs poids sur la même ligne : séparez les objets." : "Poids manquant ou invalide. Exemple : Épée (3). Utilisez (0) pour un objet sans poids."); return }
    let weight = Number(candidates[0][1].replace(",", "."))
    if (candidates[0][2]?.toLowerCase() === "g") weight /= 1000
    const quantityText = line.replace(/\([^)]*\)/g, " ")
    const quantities = [...quantityText.matchAll(/(?:^|\s)[x×]\s*([+-]?\d+(?:[.,]\d+)?)(?=\s|$)/gi)]
    if (quantities.length > 1) { warn("Plusieurs quantités sur la même ligne : séparez les objets."); return }
    const quantityMatch = quantities[0]
    const quantity = quantityMatch ? Number(quantityMatch[1].replace(",", ".")) : 1
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000000) { warn("Le poids doit être un nombre positif ou zéro."); return }
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) { warn("La quantité doit être un nombre entier positif ou zéro."); return }
    if (!quantityMatch && /(?:^|\s)[x×](?=\s|[+\-\d])\s*(?=\S)/i.test(quantityText)) { warn("Quantité invalide. Exemple : Potion x3 (0,5)."); return }
    total += weight * quantity
    entries.push({line:index+1,weight,quantity,total:weight*quantity})
  })
  return { total:Math.round(total * 1000) / 1000, warnings, entries }
}

mobSpecialAttacks["ju pion"]={name:"Rappel tonitruant",icon:"🎭",dmgMin:10,dmgMax:16,effect:"all",animation:"arcane",flavor:"Pika conclut son spectacle par un accord magique qui frappe tout le groupe. Une seule fois par combat."};

