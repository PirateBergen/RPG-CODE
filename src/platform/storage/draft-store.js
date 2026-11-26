// Espace autonome : aucune clé ni connexion de partie.
function createLocalCampaignDraftStore(storage) {
  const prefix = "rpg-campaign-editor:v1:draft:"
  const key = id => {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw Error("Identifiant de brouillon invalide")
    return prefix + id
  }
  function get(id) {
    const raw = storage.getItem(key(id))
    if (raw === null) return null
    const record = JSON.parse(raw)
    if (!record || record.version !== 1 || record.draftId !== id || !Number.isSafeInteger(record.revision) || record.revision < 1 || !Number.isFinite(record.createdAt) || !Number.isFinite(record.updatedAt)) throw Error("Brouillon local illisible")
    return {...record, definition:createCampaignDefinition(record.definition)}
  }
  return {
    get,
    list() {
      const drafts = [], issues = []
      for (let i=0;i<storage.length;i++) {
        const name=storage.key(i)
        if (!name?.startsWith(prefix)) continue
        try { drafts.push(get(name.slice(prefix.length))) } catch { issues.push(name) }
      }
      return {drafts:drafts.sort((a,b)=>b.updatedAt-a.updatedAt),issues}
    },
    save(record) {
      const definition=createCampaignDefinition(record.definition), previous=get(record.draftId)
      if ((previous?.revision || 0) !== record.revision) throw Error("Ce brouillon a changé dans un autre onglet. Exportez vos modifications avant de le rouvrir.")
      const now=Date.now(), next={version:1,draftId:record.draftId,revision:record.revision+1,createdAt:previous?.createdAt || now,updatedAt:now,definition}
      storage.setItem(key(record.draftId),JSON.stringify(next))
      return next
    },
    remove(record) {
      if (get(record.draftId)?.revision !== record.revision) throw Error("Ce brouillon a changé dans un autre onglet. Rouvrez-le avant de le supprimer.")
      storage.removeItem(key(record.draftId))
    }
  }
}
