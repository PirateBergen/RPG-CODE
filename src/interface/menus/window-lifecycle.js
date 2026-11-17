"use strict"

/* ========================= */
/* HELPERS GÉNÉRAUX         */
/* ========================= */

// Shared lifecycle for local windows. Closing delegates to each window's save/cleanup rules.
window.GameWindows=(()=>{
 const entries=new Map();let order=0
 const visible=el=>{if(!el?.isConnected)return false;for(let node=el;node&&node.nodeType===1;node=node.parentElement){const css=getComputedStyle(node);if(node.hidden||css.display==="none"||css.visibility==="hidden")return false}return true}
 const prune=()=>{for(const el of entries.keys())if(!el.isConnected)entries.delete(el)}
 const top=()=>{prune();return [...entries.values()].filter(e=>visible(e.element)).sort((a,b)=>(parseInt(getComputedStyle(b.element).zIndex)||0)-(parseInt(getComputedStyle(a.element).zIndex)||0)||b.order-a.order)[0]}
 const focus=el=>{if(!visible(el)||el.disabled)return false;if(!el.matches("button,input,select,textarea,a[href],[tabindex]"))el.tabIndex=-1;el.focus({preventScroll:true});return document.activeElement===el}
 return {
  register(element,close,{returnFocus=document.activeElement,focusOnOpen=true}={}){if(!element)return;prune();const previous=entries.get(element);entries.set(element,{element,close,returnFocus:previous?.returnFocus||returnFocus,order:++order});element.__windowReturnFocus=previous?.returnFocus||returnFocus;if(focusOnOpen)focus(element)},
  closed(element,{restoreFocus=true}={}){const entry=entries.get(element);entries.delete(element);prune();if(!restoreFocus||!entry)return;const active=document.activeElement;if(active&&active!==document.body&&active.isConnected&&!element.contains(active))return;if(!focus(entry.returnFocus))focus(top()?.element)},
  closeTop(){const entry=top();if(!entry)return false;entry.close();return true}
 }
})()

