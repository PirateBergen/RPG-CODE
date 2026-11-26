function createDraftGmWorkspace({getDefinition,replaceDefinition,changed,onSave,message,onCreateMap,onEditMap,audioLibrary}) {
  const $=id=>document.getElementById(id),dialog=$('gmWorkspace');let locationId=null,selectedId=null
  const tokens=()=>locationId?draftMapHeroTokens(getDefinition(),locationId):[]
  function status(text,error=false){ $('workspaceStatus').textContent=text; $('workspaceStatus').classList.toggle('workspace-error',error) }
  function guard(fn){return (...args)=>{try{fn(...args)}catch(e){status(e.message,true)}}}
  function commit(value){replaceDefinition(value);changed();status('Campagne modifiée. Enregistrez le brouillon pour la conserver.')}
  const board=createDraftStagingBoard({getDefinition,onSelect:id=>{selectedId=id;board.select(id)},onMove:(id,patch)=>{try{const token=tokens().find(token=>token.id===id);if(!token)return;const saved=getDefinition().staging?.find(item=>item.locationId===locationId)?.tokens || [];const updated={...token,...patch};commit(setDraftBoard(getDefinition(),locationId,saved.some(item=>item.id===id)?saved.map(item=>item.id===id?updated:item):[...saved,updated]));renderMap()}catch(e){status(e.message,true)}}})
  const navigator=createDraftMapNavigator({getDefinition,commit,onSelect:place=>{locationId=place?.id || null;selectedId=null;renderMap()},onCreateMap,onEditMap})
  function renderMap(){const place=navigator.render(locationId);if(locationId!==place?.id)selectedId=null;locationId=place?.id || null;$('prepMapEmpty').hidden=!!place;$('prepMapName').textContent=place?.name || 'Choisissez une carte';board.render(place,selectedId,tokens());audioLibrary.mapChanged(place)}
  $('prepZoom').addEventListener('input',()=>{$('prepBoard').style.width=$('prepZoom').value+'%';$('prepZoomValue').textContent=$('prepZoom').value+' %'})
  $('locationDialog').addEventListener('close',()=>{if(dialog.open){navigator.reveal(locationId);renderMap()}})
  function goTab(key){for(const button of $('workspaceTabs').querySelectorAll('[role=tab]')){const active=button.dataset.workspaceTab===key;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1}for(const panel of $('workspaceBody').children)panel.hidden=panel.id!=='workspace-'+key;$('workspaceBody').scrollTop=0}
  const tabButtons=[...$('workspaceTabs').querySelectorAll('[role=tab]')];for(const [index,button]of tabButtons.entries()){button.addEventListener('click',()=>goTab(button.dataset.workspaceTab));button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabButtons.length;if(event.key==='ArrowLeft')next=(index+tabButtons.length-1)%tabButtons.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabButtons.length-1;if(next!==undefined){event.preventDefault();goTab(tabButtons[next].dataset.workspaceTab);tabButtons[next].focus()}})}
  function backToEditor(id){dialog.close();const panel=$(id);panel.open=true;panel.scrollIntoView({block:'start'});panel.querySelector('summary')?.focus()}
  for(const [button,panel]of [['workspaceEditPlaces','locationPanel'],['workspaceEditHeroes','characterPanel'],['workspaceEditBestiary','bestiaryPanel']])$(button).addEventListener('click',()=>backToEditor(panel))
  $('workspaceClose').addEventListener('click',()=>dialog.close());$('workspaceSave').addEventListener('click',guard(()=>{onSave();status($('error').textContent || $('status').textContent,!!$('error').textContent)}))
  dialog.addEventListener('close',()=>{audioLibrary.setWorkspaceOpen(false);npcPanel.close();board.render(getDefinition().locations?.find(place=>place.id===locationId),selectedId,tokens())})
  $('workspaceNotes').addEventListener('input',()=>{replaceDefinition({...getDefinition(),preparationNotes:$('workspaceNotes').value});changed();status('Notes modifiées. Enregistrez le brouillon pour les conserver.')})
  const npcPanel=createDraftNpcPanel({getDefinition,commit,status,getLocationId:()=>locationId})
  const renderNpcs=()=>npcPanel.render()
  function render(){if(!getDefinition())return;renderMap();renderNpcs();$('workspaceHeroList').textContent=getDefinition().characters.map(actor=>actor.name).join(' · ');$('workspaceEnemyList').textContent=(getDefinition().bestiary || []).map(actor=>actor.name).join(' · ') || 'Aucun ennemi préparé.';$('workspaceNotes').value=getDefinition().preparationNotes || '';}
  $('openGmWorkspace').addEventListener('click',()=>{render();goTab('maps');status('Mode préparation locale. Aucun joueur connecté à cette carte.');dialog.showModal();audioLibrary.setWorkspaceOpen(true);$('workspaceClose').focus({preventScroll:true})})
  return {render}
}
