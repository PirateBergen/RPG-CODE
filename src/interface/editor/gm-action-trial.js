// Temporary sessions belong to local draft IDs, never campaign definitions.
function createDraftGmTrialSession({getDefinition,getDraftId,status}){
  const $=id=>document.getElementById(id),sessions=new Map()
  function trialState(){const key=getDraftId();const state=reconcileCampaignActionSession(getDefinition(),sessions.get(key) || createCampaignActionSession(getDefinition()));sessions.set(key,state);return state}
  function renderTrial(){renderDraftActionState($('gmActionTrialState'),getDefinition(),trialState());$('gmActionTrialEnd').hidden=!trialState().combat?.active}
  $('gmActionTrialReset').addEventListener('click',()=>{if(!window.confirm('Réinitialiser uniquement les PV et le combat de cette partie d’essai ?'))return;sessions.set(getDraftId(),createCampaignActionSession(getDefinition()));renderTrial();status('Partie d’essai réinitialisée. Le brouillon reste inchangé.')})
  $('gmActionTrialEnd').addEventListener('click',()=>{const state=trialState();sessions.set(getDraftId(),{...state,combat:null});renderTrial();status('Combat d’essai terminé.')})
  $('gmActionTrialRound').addEventListener('click',()=>{sessions.set(getDraftId(),advanceCampaignActionRound(trialState()));renderTrial();status('Round d’essai avancé. Les effets arrivés à leur terme sont levés.')})
  return {get:trialState,render:renderTrial,set(value){sessions.set(getDraftId(),value);renderTrial()}}
}
