const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({window:{}});for(const file of ['config.js','src/presentation/audio/draft-map-audio.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const a={id:'sound-a',name:'Personnalisé',source:'custom',sha256:'a'.repeat(64),fileName:'ambiance.wav',mime:'audio/wav',bytes:100},b={...a,id:'sound-b',sha256:'b'.repeat(64)};
function fakeAudio(){return {paused:true,currentTime:0,assignments:0,playCalls:0,_src:'',set src(value){this._src=value;this.currentTime=0;this.assignments++},get src(){return this._src},play(){this.paused=false;this.playCalls++;return Promise.resolve()},pause(){this.paused=true},removeAttribute(){this._src=''},load(){this.currentTime=0}}}
(async()=>{
 const audio=fakeAudio(),revoked=[],player=ctx.createDraftMapAudioPlayer({createAudio:()=>audio,resolveSource:async track=>({url:'blob:'+track.sha256,disposable:true}),revoke:url=>revoked.push(url)});
 player.setVolume(.35);await player.play(a);audio.currentTime=12.5;await player.play({...a,id:'sound-another',name:'Renommé'});assert.equal(audio.currentTime,12.5);assert.equal(audio.assignments,1);assert.equal(audio.playCalls,1);assert.equal(audio.volume,.35);
 player.pause();assert(audio.paused);assert.equal(audio.currentTime,12.5);await player.play(a);assert(!audio.paused);assert.equal(audio.currentTime,12.5);assert.equal(audio.assignments,1);
 await player.play(b);assert.equal(audio.currentTime,0);assert.equal(audio.assignments,2);assert(revoked.includes('blob:'+a.sha256));assert.equal(audio.volume,.35);player.stop();assert(audio.paused);assert.equal(player.currentKey(),null);
 let resolvePending;const other=fakeAudio(),disposed=[],race=ctx.createDraftMapAudioPlayer({createAudio:()=>other,resolveSource:track=>track.id===b.id?new Promise(resolve=>resolvePending=resolve):Promise.resolve({url:'blob:a',disposable:true}),revoke:url=>disposed.push(url)});
 await race.play(a);other.currentTime=8;const pending=race.play(b);await race.play(a);resolvePending({url:'blob:late-b',disposable:true});await pending;assert.equal(other.src,'blob:a');assert.equal(other.currentTime,8);assert(disposed.includes('blob:late-b'));assert.equal(other.assignments,1);
 const missing=ctx.createDraftMapAudioPlayer({createAudio:()=>fakeAudio(),resolveSource:async()=>{throw Error('Fichier absent')},revoke:()=>{}});await assert.rejects(()=>missing.play(a),/absent/);assert.equal(missing.currentKey(),null);
 ctx.a=a;vm.runInContext(`
 const before=JSON.stringify(ACTIVE_CAMPAIGN),definition=createCampaignDefinition({...ACTIVE_CAMPAIGN,audioTracks:[a],locations:[{id:'lieu-audio',name:'Carte',type:'other',description:'',gmNotes:'',audioId:a.id}]})
 const roundtrip=importCampaignDraft(exportCampaignDraft(definition));if(roundtrip.locations[0].audioId!==a.id||roundtrip.audioTracks[0].fileName!=='ambiance.wav'||JSON.stringify(ACTIVE_CAMPAIGN)!==before)throw Error('Références audio non isolées')
 if(removeDraftAudioTrack(definition,a.id).locations[0].audioId!==undefined)throw Error('Référence supprimée non nettoyée')
 `,ctx);
 for(const patch of ["sha256:'wrong'","bytes:0","source:'builtin',path:'https://bad/file.mp3'"]){assert.throws(()=>vm.runInContext(`createCampaignAudioTracks([{...a,${patch}}])`,ctx));}
 assert.throws(()=>vm.runInContext("createCampaignDefinition({...ACTIVE_CAMPAIGN,locations:[{id:'lieu-audio',name:'Carte',type:'other',description:'',gmNotes:'',audioId:'sound-missing'}]})",ctx),/introuvable/);
 console.log('OK audio : même fichier sans redémarrage, transitions, volume, annulation des chargements tardifs, références exportées et campagne active préservée.');
})().catch(error=>{console.error(error);process.exitCode=1});
