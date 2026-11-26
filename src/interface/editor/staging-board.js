function draftTokenName(definition,token){const actor=draftStagingActor(definition,token);return token.label || actor?.name || 'Pion'}
function createDraftStagingBoard({getDefinition,onSelect,onMove,onRemove}) {
  const board=document.getElementById('prepBoard'),layer=document.getElementById('prepTokenLayer'),image=document.getElementById('prepMapImage');let locationId=null,drag=null
  function select(id){for(const button of layer.querySelectorAll('button')){const active=button.dataset.tokenId===id;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))}}
  function render(place,selectedId,displayTokens) {
    locationId=place?.id || null;drag=null;layer.replaceChildren();board.hidden=!place
    if(!place)return
    image.onload=()=>{if(locationId===place.id&&image.naturalWidth)board.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight}
    image.hidden=!place.background;if(place.background){if(image.getAttribute('src')!==place.background)image.src=place.background;if(image.complete&&image.naturalWidth)board.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight}else{image.removeAttribute('src');board.style.aspectRatio='16/9'}
    const definition=getDefinition(),tokens=displayTokens ?? definition.staging?.find(item=>item.locationId===place.id)?.tokens ?? []
    for(const token of tokens) {
      const actor=draftStagingActor(definition,token);if(!actor)continue
      const button=document.createElement('button'),caption=document.createElement('span'),art=document.createElement('img');button.type='button';button.className='prep-token';button.dataset.tokenId=token.id;button.style.left=token.x+'%';button.style.top=token.y+'%';button.setAttribute('aria-label','Pion '+draftTokenName(definition,token));button.title=draftTokenName(definition,token);caption.className='prep-token-name';caption.textContent=draftTokenName(definition,token);art.src=actor.appearance?.portrait || actor.image || actor.portrait || 'images/draft-hero.svg';art.alt='';art.draggable=false;art.addEventListener('error',()=>{art.remove();button.classList.add('no-portrait')});button.append(art,caption)
      button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();button.focus({preventScroll:true});onSelect(token.id);select(token.id);drag={id:token.id,button,startX:event.clientX,startY:event.clientY,x:token.x,y:token.y};button.setPointerCapture(event.pointerId)})
      button.addEventListener('pointermove',event=>{if(drag?.id!==token.id)return;const rect=board.getBoundingClientRect();drag.x=Math.round(Math.min(98,Math.max(2,token.x+(event.clientX-drag.startX)*100/rect.width))*100)/100;drag.y=Math.round(Math.min(98,Math.max(2,token.y+(event.clientY-drag.startY)*100/rect.height))*100)/100;button.style.left=drag.x+'%';button.style.top=drag.y+'%'})
      button.addEventListener('pointerup',event=>{if(drag?.id!==token.id)return;const state=drag;drag=null;if(Math.abs(event.clientX-state.startX)+Math.abs(event.clientY-state.startY)>2)onMove(token.id,{x:state.x,y:state.y});else{button.style.left=token.x+'%';button.style.top=token.y+'%'}})
      button.addEventListener('pointercancel',()=>{drag=null;button.style.left=token.x+'%';button.style.top=token.y+'%'})
      button.addEventListener('click',()=>{onSelect(token.id);select(token.id)})
      button.addEventListener('keydown',event=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[event.key]){event.preventDefault();onSelect(token.id);const factor=event.shiftKey?5:1;onMove(token.id,{x:Math.max(2,Math.min(98,token.x+moves[event.key][0]*factor)),y:Math.max(2,Math.min(98,token.y+moves[event.key][1]*factor))});layer.querySelector('[data-token-id="'+token.id+'"]')?.focus({preventScroll:true})}else if(event.key==='Delete'&&onRemove){event.preventDefault();onRemove(token.id)}})
      layer.append(button)
    }
    select(selectedId)
  }
  return {render,select}
}
