function createDraftMapAudioPlayer({resolveSource,createAudio=()=>new Audio(),revoke=url=>URL.revokeObjectURL(url)}){
  const audio=createAudio();audio.loop=true;audio.volume=.5;let key=null,url=null,disposable=false,generation=0
  function release(){audio.pause();audio.removeAttribute('src');audio.load();if(url&&disposable)revoke(url);key=null;url=null;disposable=false}
  return {
    async play(track){const token=++generation;if(!track){release();return}const next=draftAudioTrackKey(track);if(key===next&&url){if(audio.paused)try{await audio.play()}catch(error){if(token===generation)throw error}return}let source;try{source=await resolveSource(track)}catch(error){if(token===generation)release();if(token===generation)throw error;return}if(token!==generation){if(source.disposable)revoke(source.url);return}release();key=next;url=source.url;disposable=!!source.disposable;audio.src=url;try{await audio.play()}catch(error){if(token===generation)throw error}},
    stop(){generation++;release()},setVolume(value){audio.volume=Math.min(1,Math.max(0,Number(value)||0))},currentKey:()=>key
  }
}
