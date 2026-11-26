function createCampaignAudioTracks(input){
  if(!Array.isArray(input))throw Error('Bibliothèque de sons invalide')
  const ids=new Set()
  return input.map(track=>{
    if(!track||typeof track.id!=='string'||!/^sound-[a-z0-9-]+$/.test(track.id)||ids.has(track.id)||typeof track.name!=='string'||!track.name.trim()||track.name.length>120)throw Error('Nom ou identifiant de son invalide')
    ids.add(track.id)
    if(track.source==='builtin'){
      if(!isCampaignAssetPath(track.path,['mp3','wav','ogg','m4a'])||!track.path.startsWith('audio/'))throw Error('Chemin de son invalide')
      return {id:track.id,name:track.name.trim(),source:'builtin',path:track.path}
    }
    if(track.source!=='custom'||typeof track.sha256!=='string'||!/^[a-f0-9]{64}$/.test(track.sha256)||typeof track.fileName!=='string'||!track.fileName.trim()||track.fileName.length>255||!['audio/mpeg','audio/wav','audio/ogg','audio/mp4'].includes(track.mime)||!Number.isSafeInteger(track.bytes)||track.bytes<1||track.bytes>50*1024*1024)throw Error('Référence de son personnalisé invalide')
    return {id:track.id,name:track.name.trim(),source:'custom',sha256:track.sha256,fileName:track.fileName,mime:track.mime,bytes:track.bytes}
  })
}
function draftAudioTrackKey(track){return track.source==='custom'?'sha256:'+track.sha256:'asset:'+track.path}
function removeDraftAudioTrack(definition,id){return createCampaignDefinition({...definition,audioTracks:(definition.audioTracks || []).filter(track=>track.id!==id),...(definition.locations?{locations:definition.locations.map(place=>{if(place.audioId!==id)return place;const {audioId,...rest}=place;return rest})}:{})})}
