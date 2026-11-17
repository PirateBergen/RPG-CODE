"use strict"

/* ========================= */
/* ÉTAT INTERNE CENTRALISÉ   */
/* Remplace tous les window._ */
/* ========================= */

const _state = {
  pendingExtraMobs: {},   // { mob2: "loup", mob3: null }
  pendingMob:       null,
  pendingTier:      null,
  tokenDragging:    false,
  tokenDragStart:   null,
  mobDiffPending:   null,
  runeJustOpened:   false,
  bibiData:         {}
}

/* ========================= */
/* VARIABLES DE JEU          */
/* ========================= */

let gameState       = GAME_STATE.MENU
let gameStarted     = false
let gameStartTime   = Date.now()
let dialogueLock    = false
let index           = 0       // index dialogue

/* ========================= */
/* JOUEUR                    */
/* ========================= */

let myToken            = null
let isGM              = false
let currentSheetPlayer = null
let curseLevel         = 0
let corruptionLevel    = 0
let powerModeActive    = false
let pendingLevelUp     = {}
let lastLevel          = {}
let deadPlayers        = {}

/* ========================= */
/* TOKENS / DRAG             */
/* ========================= */

let selected      = null
let lastX         = 0
let grid          = 80
let lastClickTime = 0
let lastHP        = {}
let lastSend      = 0
let sendDelay     = 80
let lastSentX     = null
let lastSentY     = null
let bibiMoved     = false
let _dragOffsetX  = 0
let _dragOffsetY  = 0
let lastBarkTime  = 0
let barkCooldown  = 10000

/* ========================= */
/* CAMÉRA                    */
/* ========================= */

let cameraX        = 0
let cameraY        = 0
let cameraZoom     = 1
let minZoom        = 1
let cameraDragging = false
let cameraStartX   = 0
let cameraStartY   = 0

/* ========================= */
/* CARTE                     */
/* ========================= */

let currentMap  = null
let firstMapLoad = true
let storyType   = null

/* ========================= */
/* AUDIO                     */
/* ========================= */

let musicFadeInterval   = null
let currentMusic        = "A"
let _musicTransitioning = false
let _pendingMusic       = null
let auroraActive        = false

/* ========================= */
/* COMBAT                    */
/* ========================= */

let combatActive   = false
let combatStarting = false
let currentMob     = null
let lastMobHP      = null
let activeMobSlots = { mob: false, mob2: false, mob3: false }

/* ========================= */
/* PNJ                       */
/* ========================= */

let currentPNJSlot = 1
let pnjSlotOrder   = []

/* ========================= */
/* EFFETS                    */
/* ========================= */

let bloodIntervals = {}

/* ========================= */
/* ÉVÉNEMENTS                */
/* ========================= */

let cemeteryEventDone = false
let odinVisionShown   = false