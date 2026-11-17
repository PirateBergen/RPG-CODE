function calculateMinZoom(){const map=document.getElementById("map");minZoom=map?.offsetWidth&&map?.offsetHeight?Math.max(window.innerWidth/map.offsetWidth,window.innerHeight/map.offsetHeight):1}

function clampCamera(){const map=document.getElementById("map");if(!map)return;const scale=cameraZoom||1;cameraX=Math.max(Math.min(0,(window.innerWidth-map.offsetWidth*scale)/scale),Math.min(0,cameraX));cameraY=Math.max(Math.min(0,(window.innerHeight-map.offsetHeight*scale)/scale),Math.min(0,cameraY))}

function updateCamera() {
  clampCamera()
  document.getElementById("camera").style.transform = `scale(${cameraZoom}) translate(${cameraX}px, ${cameraY}px)`
}



/* ========================= */
/* AUDIO                     */
/* ========================= */

