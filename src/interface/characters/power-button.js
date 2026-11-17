function showUsePowerBtn(playerID) { const ex=document.getElementById("usePowerBtn"); if(ex) ex.remove(); const btn=document.createElement("button"); btn.id="usePowerBtn"; btn.dataset.playerId=playerID; btn.innerText=playerID==="ju"?"APPÉTIT ABYSSAL":"LIBERER LE POUVOIR"; btn.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:14px 40px;font-family:Cinzel;font-size:20px;letter-spacing:2px;background:linear-gradient(180deg,#8a6000,#4a3000);color:gold;border:2px solid gold;border-radius:10px;cursor:pointer;z-index:999999999;box-shadow:0 0 20px gold,0 0 40px orange;animation:powerBtnPulse 1s ease-in-out infinite alternate;text-shadow:0 0 10px gold;"; btn.onclick=()=>usePower(playerID); document.body.appendChild(btn) }


/* ========================= */
/* ÉLÉMENTS MAP              */
/* ========================= */

