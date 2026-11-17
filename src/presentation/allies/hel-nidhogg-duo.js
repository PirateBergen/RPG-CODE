function presentHelNidhoggDuo(result){
 const overlay=document.createElement("div"),stage=document.createElement("section"),canvas=document.createElement("canvas"),outcome=document.createElement("p"),close=document.createElement("button")
 overlay.id="helNidhoggDuoScene";overlay.className="helModal helDuoScene";overlay.setAttribute("aria-label","Le Jugement de la Couronne creuse — Hel et Nidhogg")
 stage.className="helDuoStage";canvas.width=1440;canvas.height=900;canvas.setAttribute("role","img");canvas.setAttribute("aria-label","Hel extrait le double spectral du Roi et Nidhogg frappe sa couronne, parmi les racines et la brume.")
 outcome.textContent=result.fail?"Le Roi résiste. Aucun dégât ni effet ; les deux interventions sont consommées.":(result.crit?"Jugement critique — ":"")+result.amount+" PV retirés au Roi · Sa prochaine attaque inflige 50 % de dégâts en moins."
 close.type="button";close.textContent="Fermer — Échap";close.onclick=()=>scope.cancel();stage.append(canvas,outcome,close);overlay.appendChild(stage)
 let finish=()=>{};const scope=createPresentationScope("__cancelHelNidhoggDuo",()=>finish());scope.node(overlay);finish=helModal(overlay,scope.cancel)
 scope.later(scope.cancel,15000)
 const files={hel:"hel.png",dragon:"nhiddog.png",king:"roi.png"}
 Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src="images/"+file}))).then(entries=>{
  if(scope.cancelled)return
  const images=Object.fromEntries(entries.map(([key,image])=>[key,cropHelDuoPortrait(image)])),draw=createHelNidhoggRenderer(canvas,images,result),started=performance.now()
  const rumble=scope.audio(new Audio("audio/tremblement.mp3"));setManagedAudioBaseVolume(rumble,.35);rumble.play().catch(()=>{})
  const pow=document.getElementById("powSound");if(pow)scope.audio(pow)
  let impact=false
  const tick=now=>{if(scope.cancelled)return;const t=Math.min(13.5,(now-started)/1000);draw(t);if(t>=8.35&&!impact){impact=true;playSound("powSound",result.fail?.4:.84,true)}if(t<13.5)scope.frame(tick);else scope.later(scope.cancel,350)}
  scope.frame(tick)
 }).catch(()=>{if(!scope.cancelled){showNotification("L’animation du duo ne peut pas être chargée. Le résultat du combat est conservé.");scope.cancel()}})
}
function cropHelDuoPortrait(image){
 const original=document.createElement("canvas");original.width=image.naturalWidth||image.width;original.height=image.naturalHeight||image.height;const oc=original.getContext("2d");oc.drawImage(image,0,0)
 const pixels=oc.getImageData(0,0,original.width,original.height).data;let left=original.width,right=0,top=original.height,bottom=0
 for(let y=0;y<original.height;y++)for(let x=0;x<original.width;x++)if(pixels[(y*original.width+x)*4+3]>10){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 if(right<left)return original
 left=Math.max(0,left-5);top=Math.max(0,top-5);right=Math.min(original.width-1,right+5);bottom=Math.min(original.height-1,bottom+5)
 const cropped=document.createElement("canvas");cropped.width=right-left+1;cropped.height=bottom-top+1;cropped.getContext("2d").drawImage(original,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);return cropped
}
function createHelNidhoggRenderer(canvas,images,result){
 const c=canvas.getContext('2d'),W=1440,H=900,failed=!!result.fail,reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,ready=true
 const ghost=document.createElement('canvas');ghost.width=images.king.width;ghost.height=images.king.height;const gc=ghost.getContext('2d');gc.filter='grayscale(1) brightness(2)';gc.drawImage(images.king,0,0);gc.filter='none';gc.globalCompositeOperation='source-atop';gc.fillStyle='rgba(188,153,245,.46)';gc.fillRect(0,0,ghost.width,ghost.height)
   const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},ease=x=>1-Math.pow(1-clamp(x),3),lerp=(a,b,t)=>a+(b-a)*t;
  let seed=381924;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const dust=Array.from({length:110},()=>({x:random()*W,y:random()*H,r:random()*2+.5,speed:random()*20+7,a:random()*.5+.1}));
  const particles=Array.from({length:85},()=>({angle:random()*Math.PI*2,speed:random()*290+65,turn:random()*8-4,size:random()*11+3,life:random()*1.2+.8}));
  const roots=Array.from({length:12},(_,i)=>{const side=i%2?1:-1;return {x0:side>0?W+random()*100:-random()*100,y0:H*.9+random()*120,x1:W*.5+side*(250+random()*250),y1:H*(.45+random()*.4),x2:W*.5-side*(70+random()*160),y2:H*(.63+random()*.2),x3:W*(.44+random()*.17),y3:H*(.56+random()*.28),width:random()*15+8,delay:i*.065}});
  const fog=Array.from({length:15},()=>({x:random()*W,y:H*(.5+random()*.55),r:random()*160+90,s:random()*20+10,p:random()*6.28}));
  function textLabel(text,x,y,size=25,color='#e6d6ef',alpha=1,tracking=0){c.save();size=Math.max(size,11*W/Math.max(1,canvas.getBoundingClientRect().width));c.globalAlpha=alpha;c.fillStyle=color;c.textAlign='center';c.font=`${size}px Georgia,serif`;c.shadowColor='#000';c.shadowBlur=10;if(tracking&&'letterSpacing'in c)c.letterSpacing=tracking+'px';const words=text.split(' '),lines=[];let line='';for(const word of words){const candidate=line?line+' '+word:word;if(c.measureText(candidate).width>W*.9&&line){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);lines.forEach((value,i)=>c.fillText(value,x,y-(lines.length-1-i)*size*1.18));c.restore()}
  function sprite(img,x,bottom,h,alpha=1,rotation=0,glow=0,glowColor='#a887eb',filter='none'){
    if(alpha<=0)return;const w=h*img.width/img.height;c.save();c.globalAlpha=clamp(alpha);c.translate(x,bottom);c.rotate(rotation);c.filter=filter;if(glow){c.shadowColor=glowColor;c.shadowBlur=glow}c.drawImage(img,-w/2,-h,w,h);c.restore();
  }
  function curve(root,u){const v=1-u;return {x:v*v*v*root.x0+3*v*v*u*root.x1+3*v*u*u*root.x2+u*u*u*root.x3,y:v*v*v*root.y0+3*v*v*u*root.y1+3*v*u*u*root.y2+u*u*u*root.y3}}
  function drawRoots(t,front){
    const reveal=smooth((t-2.5)/1.65),fade=(1-.6*smooth((t-10.8)/2.7))*(failed?1-smooth((t-7.9)/1):1);if(!reveal)return;
    c.save();c.lineCap='round';
    roots.forEach((root,i)=>{if((i%3===0)!==front)return;const growth=smooth((t-2.5-root.delay)/1.3);if(!growth)return;
      const tip=clamp(growth);c.beginPath();for(let j=0;j<=60;j++){const u=j/60*tip,p=curve(root,u);p.y+=Math.sin(u*18+i*2.2)*7*Math.sin(u*Math.PI);j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)}c.globalAlpha=.9*fade;c.strokeStyle='#100c18';c.lineWidth=root.width+5;c.shadowColor='#9c72c9';c.shadowBlur=4;c.stroke();c.shadowBlur=0;c.strokeStyle='#09070d';c.lineWidth=root.width;c.stroke();
      c.globalAlpha=.17*fade;c.strokeStyle='#89759e';c.lineWidth=1.2;c.stroke();
      for(let k=0;k<5;k++){const u=(k+1)/7;if(u>tip)continue;const p=curve(root,u),side=(i+k)%2?1:-1;c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(p.x+side*30,p.y-25,p.x+side*58,p.y-34);c.lineWidth=Math.max(1,root.width*.2);c.strokeStyle='#1b1225';c.globalAlpha=.75*fade;c.stroke()}
    });c.restore();
  }
  function drawMist(t,front=false){
    c.save();for(let i=0;i<fog.length;i++){if((i%3===0)!==front)continue;const f=fog[i],x=f.x+Math.sin(t*.2+f.p)*45,y=f.y+Math.cos(t*.15+f.p)*22,alpha=(.045+.045*smooth((t-1)/3))*(front?.9:1);const g=c.createRadialGradient(x,y,0,x,y,f.r);g.addColorStop(0,`rgba(136,95,172,${alpha})`);g.addColorStop(.55,`rgba(61,44,91,${alpha*.5})`);g.addColorStop(1,'rgba(20,10,34,0)');c.fillStyle=g;c.fillRect(x-f.r,y-f.r,f.r*2,f.r*2)}c.restore();
  }
  function energy(t,x,y,strength){
    c.save();c.globalCompositeOperation='screen';for(let i=0;i<5;i++){const offset=Math.sin(t*1.8+i*1.7)*24;c.beginPath();c.moveTo(W*.193,H*.4+i*4);c.bezierCurveTo(W*.3,H*.27+offset,W*.36,H*.5-offset,x,y+offset*.4);c.lineWidth=i===0?3:1.1;c.strokeStyle=`rgba(185,151,247,${strength*(i===0?.7:.3)})`;c.shadowColor='#af7fff';c.shadowBlur=17;c.stroke()}c.restore();
  }
  function crown(x,y,size,split=0){
    c.save();c.translate(x,y);c.globalAlpha=1-clamp(split/1.4);c.shadowColor='#f1bb67';c.shadowBlur=22;c.strokeStyle='#f1d18d';c.lineWidth=2.2;
    const pts=[[-1,.35],[-1,-.55],[-.45,-.05],[0,-.85],[.45,-.05],[1,-.55],[1,.35],[-1,.35]];c.beginPath();pts.forEach(([a,b],i)=>{const xx=a*size+(a>=0?1:-1)*split*18,yy=b*size;i?c.lineTo(xx,yy):c.moveTo(xx,yy)});c.stroke();c.restore();
  }
  function drawImpact(t,x,y){const age=t-8.35;if(age<0||age>2.5)return;
    c.save();c.globalCompositeOperation='screen';if(failed){c.save();c.strokeStyle="rgba(198,94,123,"+Math.max(0,.7-age/2)+")";c.lineWidth=3;c.beginPath();c.ellipse(x,y,40+age*160,20+age*80,0,0,Math.PI*2);c.stroke();c.restore();c.restore();return}
    const r=40+age*130;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,228,171,${Math.max(0,.65-age*1.1)})`);g.addColorStop(.4,`rgba(194,151,244,${Math.max(0,.3-age*.3)})`);g.addColorStop(1,'rgba(120,80,190,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    for(const p of particles){if(age>p.life)continue;const distance=p.speed*age,px=x+Math.cos(p.angle)*distance,py=y+Math.sin(p.angle)*distance+age*age*55;c.save();c.translate(px,py);c.rotate(p.angle+p.turn*age);c.globalAlpha=clamp(1-age/p.life);c.fillStyle=p.angle>3?'#dfc89c':'#cdb3ff';c.shadowColor='#d6a6ff';c.shadowBlur=12;c.beginPath();c.moveTo(0,-p.size);c.lineTo(p.size*.3,p.size*.8);c.lineTo(-p.size*.4,p.size*.4);c.closePath();c.fill();c.restore()}
    c.strokeStyle=`rgba(225,195,255,${Math.max(0,.7-age)})`;c.lineWidth=2;c.beginPath();c.ellipse(x,y,30+age*230,10+age*90,0,0,Math.PI*2);c.stroke();c.restore();
  }
  function draw(t){
    if(!ready)return;c.clearRect(0,0,W,H);
    const bg=c.createRadialGradient(W*.52,H*.48,15,W*.5,H*.5,W*.75);bg.addColorStop(0,'#20172c');bg.addColorStop(.45,'#0b0911');bg.addColorStop(1,'#030305');c.fillStyle=bg;c.fillRect(0,0,W,H);
    c.save();const hitAge=t-8.35,shake=!reduced&&hitAge>=0&&hitAge<.65?(1-hitAge/.65)*8:0;c.translate(Math.sin(t*95)*shake,Math.cos(t*117)*shake*.5);
    const halo=c.createRadialGradient(W*.52,H*.76,0,W*.52,H*.76,W*.4);halo.addColorStop(0,'#382640');halo.addColorStop(1,'#08070c00');c.fillStyle=halo;c.fillRect(0,H*.3,W,H*.7);
    c.save();c.globalAlpha=.18;c.strokeStyle='#8b7399';c.lineWidth=1;c.beginPath();c.ellipse(W*.52,H*.85,W*.3,H*.075,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(W*.52,H*.85,W*.25,H*.055,0,0,Math.PI*2);c.stroke();c.restore();
    drawMist(t,false);
    const helIn=smooth((t-.3)/1.5),helOut=1-.6*smooth((t-11)/2.5),dragonIn=smooth((t-3.4)/1.6),lunge=Math.sin(clamp((t-7.1)/1.9)*Math.PI)*.055;
    sprite(images.hel,W*.17,H*.84,H*.70,helIn*helOut,0,22,'#b08bd7','brightness(1.25)');
    const dragonX=W*(.82-lunge),dragonY=H*(.68+(reduced?0:Math.sin(t*.8)*.007));
    sprite(images.dragon,dragonX,dragonY,H*.66,dragonIn*(1-.65*smooth((t-10)/3.5)), -.025+lunge*.25,18,'#704e91','brightness(1.5)');
    drawRoots(t,false);
    const recoil=smooth((t-8.35)/.2)*(1-smooth((t-8.7)/1.3)),kingBottom=H*.855;
    sprite(images.king,W*(.52-recoil*.006),kingBottom,H*.57,1,recoil*-.035,12,'#807087','brightness(1.25)');
    const lift=smooth((t-4.5)/3.6),devour=smooth((t-8.35)/.65),soulX=W*lerp(.52,.72,lift),soulBottom=H*lerp(.855,.53,lift),soulHeight=H*lerp(.57,.34,lift);
    const soulAlpha=(failed?0:1)*smooth((t-4.5)/.9)*(.5+.12*Math.sin(t*4))*(1-devour);
    if(soulAlpha>0){energy(t,soulX,soulBottom-soulHeight*.5,clamp(soulAlpha*1.5));for(let i=3;i>0;i--)sprite(ghost,soulX-i*8,soulBottom+i*8,soulHeight, soulAlpha*.12,0,20,'#a97bea');sprite(ghost,soulX,soulBottom,soulHeight,soulAlpha,0,30,'#c3a8ff');
      for(let i=0;i<3;i++){c.save();c.globalAlpha=soulAlpha*.6;c.strokeStyle='#c1a4ee';c.lineWidth=1.2;c.beginPath();c.ellipse(soulX,soulBottom-soulHeight*.48,soulHeight*(.25+i*.018),soulHeight*.07,Math.sin(t+i)*.5,0,Math.PI*2);c.stroke();c.restore()}
      crown(soulX,soulBottom-soulHeight*.94,24+lift*9,smooth((t-8.1)/.35));
    }
    drawRoots(t,true);drawMist(t,true);
    c.save();c.globalCompositeOperation='screen';for(const p of dust){const y=(p.y-t*p.speed+H*3)%H,alpha=p.a*(.1+.25*helIn);c.globalAlpha=alpha;c.fillStyle=p.x<W*.4?'#c4a8e9':'#bdadc9';c.beginPath();c.arc(p.x+Math.sin(t*.4+p.x)*5,y,p.r,0,Math.PI*2);c.fill()}c.restore();
    drawImpact(t,W*.72,H*(.53-.34*.94));
    const vignette=c.createRadialGradient(W*.5,H*.5,H*.2,W*.5,H*.5,W*.62);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#000b');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    c.restore();
    textLabel('HEL  ×  NIDHOGG',W*.5,H*.09,22,'#bfa6cd',.8,3);
    const titleIn=t===0?1:smooth((t-.5)/.8)*(1-smooth((t-4)/.7));textLabel('LE JUGEMENT DE LA COURONNE CREUSE',W*.5,H*.94,25,'#e3c99e',titleIn,1);
    const quote=smooth((t-3)/.8)*(1-smooth((t-7)/.5));textLabel('« Tu portes une couronne. Tu n’en restes pas moins mortel. »',W*.5,H*.94,23,'#e1d3ea',quote);
    if(t>10.5)textLabel(failed?'Le Roi résiste au jugement.':'Le jugement frappe. Le combat continue.',W*.5,H*.94,25,'#d5bfdc',smooth((t-10.5)/1));
  }

 return draw
}
