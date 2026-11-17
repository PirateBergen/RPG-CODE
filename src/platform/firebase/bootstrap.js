"use strict"

/* ========================= */
/* FIREBASE INIT             */
/* ========================= */

const firebaseConfig = {
  apiKey:            "AIzaSyCRdh9-vOZn-u-FrVwkCX8uE3jHZ9q9ppY",
  authDomain:        "la-prophetie-des-mouches.firebaseapp.com",
  databaseURL:       "https://la-prophetie-des-mouches-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "la-prophetie-des-mouches",
  storageBucket:     "la-prophetie-des-mouches.firebasestorage.app",
  messagingSenderId: "61052402165",
  appId:             "1:61052402165:web:376cb5aa9a156bc02cc8bc"
}

firebase.initializeApp(firebaseConfig)
firebase.database().goOnline()
const db   = typeof createIsolatedTestDatabase === "function" && window.__isolatedTestMode ? createIsolatedTestDatabase(createCampaignDatabase(firebase.database())) : createCampaignDatabase(firebase.database())
installSessionWriteTracking(db)
const auth = typeof firebase.auth === "function" ? firebase.auth() : null

window.__authReady        = false
window.__authUid          = null
window.__authLoginStarted = false
window.__authLoginPromise = null
window.__authRole         = null
window.__authPlayerId     = null
window.__authRoleRef      = null
window.__authRoleCb       = null
window.__authProfileRef   = null
window.__authProfileCb    = null
window.__gmAuthBusy       = false
window.__playerAuthBusy   = false

function detachFirebaseAccessSync() {
  if (window.__authRoleRef && window.__authRoleCb) window.__authRoleRef.off("value", window.__authRoleCb)
  if (window.__authProfileRef && window.__authProfileCb) window.__authProfileRef.off("value", window.__authProfileCb)
  window.__authRoleRef = null; window.__authRoleCb = null
  window.__authProfileRef = null; window.__authProfileCb = null
  window.__authRole = null; window.__authPlayerId = null
  if (typeof syncCombatCoordinator === "function") syncCombatCoordinator()
  if(typeof syncGMArbitration === "function")syncGMArbitration()
  if(typeof syncCombatExitCoordinator==="function")syncCombatExitCoordinator()
  if(typeof syncCharacterEffects==="function")syncCharacterEffects()
  if(typeof syncExplorationCoordinator === "function") syncExplorationCoordinator()
  stopCharacterSubscriptions()
  if(typeof stopCombatStatsSubscription==="function")stopCombatStatsSubscription()
  stopPersistenceSync()
}

function syncFirebaseAccessForUser(uid) {
  detachFirebaseAccessSync()
  if (!uid) return
  startPersistenceSync(uid)
  const roleRef = db.ref("roles/" + uid)
  const roleCb = snap => {
    const role = snap.val()
    const previousRole = window.__authRole
    window.__authRole = typeof role === "string" ? role : null
    if(typeof syncExplorationCoordinator === "function")syncExplorationCoordinator()
    if (typeof syncCombatCoordinator === "function") syncCombatCoordinator()
  if(typeof syncGMArbitration === "function")syncGMArbitration()
    if(typeof syncCombatExitCoordinator==="function")syncCombatExitCoordinator()
  if(typeof syncCharacterEffects==="function")syncCharacterEffects()
    if (window.__sessionBusy) recoverExpiredSessionLock().catch(error => console.warn(error))
    if (previousRole === "gm" && window.__authRole !== "gm") resetLocalCharacterAccess()
    syncCharacterSubscriptions()
    if (window.__authRole === "gm" && !isGM) activateGM(true)
    if(window.__authRole==="gm" && typeof cleanupLegacyWantedElements==="function")cleanupLegacyWantedElements().catch(error=>console.warn(error))
    updateIntroLogoutBtn()
  }
  const profileRef = db.ref("profiles/" + uid + "/playerId")
  const profileCb = snap => {
    const playerId = snap.val()
    const previousPlayer = window.__authPlayerId
    const nextPlayer = typeof playerId === "string" ? playerId : null
    if (previousPlayer && previousPlayer !== nextPlayer && window.__authRole !== "gm") resetLocalCharacterAccess()
    window.__authPlayerId = nextPlayer
    syncCharacterSubscriptions()
    updatePlayerAuthMenuState()
    if (window.__authPlayerId) setTimeout(() => { tryAutoSelectAuthenticatedPlayer() }, 60)
  }
  window.__authRoleRef = roleRef; window.__authRoleCb = roleCb
  window.__authProfileRef = profileRef; window.__authProfileCb = profileCb
  roleRef.on("value", roleCb)
  profileRef.on("value", profileCb)
}

function initFirebaseAnonymousAuth() {
  if (!auth) return Promise.resolve(null)
  if (auth.currentUser && window.__authReady) return Promise.resolve(auth.currentUser)
  if (window.__authLoginPromise) return window.__authLoginPromise
  window.__authLoginPromise = new Promise(resolve => {
    let resolved = false
    const finish = user => { if (resolved) return; resolved = true; resolve(user || null) }
    auth.onAuthStateChanged(user => {
      if (window.__authUid !== (user?.uid || null)) resetLocalCharacterAccess()
      window.__authReady = !!user
      window.__authUid = user?.uid || null
      syncFirebaseAccessForUser(window.__authUid)
      if (user) finish(user)
    }, error => { console.warn("Firebase auth state error:", error); detachFirebaseAccessSync(); finish(null) })
    if (auth.currentUser) {
      window.__authReady = true; window.__authUid = auth.currentUser.uid
      syncFirebaseAccessForUser(window.__authUid); finish(auth.currentUser); return
    }
    window.__authLoginStarted = true
    auth.signInAnonymously().catch(error => { console.warn("Firebase anonymous auth failed:", error); finish(null) })
  })
  return window.__authLoginPromise
}

/* ========================= */
/* AUTH MJ                   */
/* ========================= */

