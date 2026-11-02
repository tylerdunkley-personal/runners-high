'use strict';
// Song import is local-only. Hosted tracks are opt-in via content.json.
let loadGeneration=0,gameTracks=[];
function cancelRun(){if(gameState==='running')gameOffset=gameTime();gameState='ready';disconnectGameAudio();cancelAnimationFrame(frame);releaseAllLanes();$('#game-pause').disabled=true;$('#game-boost').disabled=true;}
function refreshSong(){gameOffset=0;notes=[];score=0;combo=0;rock=60;charge=0;boostUntil=0;$('#game-song-label').textContent=songTitle+' / '+chartLabel;$('#game-song-info').textContent=songId==='demo'?'Original practice riff. LOAD SONG creates an approximate chart from your audio; LOAD CHART replaces it with authored notes. Local files stay on this device.':chartLabel==='AUTO CHART'?'Your audio is loaded. These automatically generated notes approximate strong attacks, not the actual guitar melody. Import a hand-timed chart for closer matching.':'Your audio with a hand-timed chart. Hold sustains; hit the frets together for chords. The band’s song audio is not available from its Bandcamp embed.';$('#game-status').textContent='Ready: '+songTitle;updateBest();drawGame();}
function validateChart(raw,duration){
  const list=Array.isArray(raw)?raw:raw.notes;if(!Array.isArray(list)||list.length===0||list.length>10000)throw Error('Chart needs 1–10,000 notes.');
  const seen=new Set(),result=list.map(n=>{const time=Number(n.time),lane=Number(n.lane),hold=Number(n.duration??0);if(!Number.isFinite(time)||time<0||time>duration||!Number.isInteger(lane)||lane<0||lane>4||!Number.isFinite(hold)||hold<0||time+hold>duration+.02)throw Error('Chart has invalid times, lanes (0–4), or hold lengths.');const key=time+':'+lane;if(seen.has(key))throw Error('Duplicate chart note.');seen.add(key);return{time:time+2,lane,duration:hold};}).sort((a,b)=>a.time-b.time);
  for(let i=0;i<5;i++){const lane=result.filter(n=>n.lane===i);for(let j=1;j<lane.length;j++)if(lane[j].time<lane[j-1].time+lane[j-1].duration-.001)throw Error('A note overlaps a sustain in the same lane.');}
  return result;
}
function autoChart(decoded){
  const data=decoded.getChannelData(0),hop=Math.max(1,Math.floor(decoded.sampleRate*.02)),energy=[];
  for(let n=0;n<data.length;n+=hop){let sum=0;for(let j=n;j<Math.min(n+hop,data.length);j++)sum+=data[j]*data[j];energy.push(Math.sqrt(sum/hop));}
  const result=[];let last=-1;for(let i=2;i<energy.length-2;i++){let sum=0,count=0;for(let j=Math.max(0,i-20);j<i;j++){sum+=energy[j];count++;}const avg=sum/Math.max(1,count),time=i*hop/decoded.sampleRate;if(time<.2||time>decoded.duration-.3)continue;if(energy[i]>.012&&energy[i]>avg*1.35&&energy[i]>=energy[i-1]&&energy[i]>=energy[i+1]&&time-last>.20){result.push({time:time+2,lane:result.length%5,duration:0});last=time;}}
  if(result.length<Math.min(12,decoded.duration)){result.length=0;for(let t=.5;t<decoded.duration-.4;t+=.5)result.push({time:t+2,lane:result.length%5,duration:0});}
  return result;
}
function padAudio(decoded){
  if(decoded.duration>360||decoded.duration<1)throw Error('Choose a song between 1 second and 6 minutes.');
  const sr=22050,out=gameContext.createBuffer(1,Math.ceil((decoded.duration+3)*sr),sr),data=out.getChannelData(0),channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i));
  for(let i=0;i<2*sr;i++){const t=i/sr;data[i]=Math.sin(2*Math.PI*1000*t)*.08*Math.exp(-(t%.5)*90);}
  for(let i=0;i<Math.floor(decoded.duration*sr);i++){const x=i*decoded.sampleRate/sr,j=Math.floor(x),mix=x-j;let sum=0;for(const c of channels)sum+=(c[j]||0)*(1-mix)+(c[j+1]||0)*mix;data[i+2*sr]=sum/channels.length;}
  return out;
}
async function loadSongFile(file,authoredChart=null,title=null){
  if(!file)return;const generation=++loadGeneration;cancelRun();gameState='loading';$('#game-start').disabled=true;$('#game-status').textContent='Loading your audio and finding notes…';drawGame();
  try{if(file.size>40*1024*1024)throw Error('Choose an audio file smaller than 40 MB.');gameContext??=new(window.AudioContext||window.webkitAudioContext)();const decoded=await gameContext.decodeAudioData(await file.arrayBuffer());if(generation!==loadGeneration)return;const padded=padAudio(decoded),generated=authoredChart?validateChart(authoredChart,decoded.duration):autoChart(decoded);if(!generated.length)throw Error('No playable notes found. Try another song.');gameBuffer=padded;chart=generated;songLength=padded.duration;songAudioDuration=decoded.duration;songTitle=title||file.name.replace(/\.[^.]+$/,'');songId='song-'+file.name+'-'+file.size;chartLabel=authoredChart?'TIMED CHART':'AUTO CHART';gameState='ready';refreshSong();}
  catch(e){if(generation===loadGeneration){gameState='ready';$('#game-status').textContent=e.message||'Audio could not load. Try MP3 or WAV.';drawGame();}}
  finally{if(generation===loadGeneration)$('#game-start').disabled=false;}
}
async function loadChartFile(file){if(!file)return;if(gameState==='loading'){toast('Wait for the song to finish loading.');return;}const originalSong=songId;if(songId==='demo'){toast('Load the matching audio file first.');return;}try{if(file.size>2*1024*1024)throw Error('Chart file is too large.');const raw=JSON.parse(await file.text());if(songId!==originalSong)return;const imported=validateChart(raw,songAudioDuration);cancelRun();chart=imported;chartLabel='TIMED CHART';songId=songId.split('-chart-')[0]+'-chart-'+file.name+'-'+file.size;refreshSong();}catch(e){toast(e.message||'Could not read chart JSON.');}}
function resetDemo(){selectionGeneration++;loadGeneration++;cancelRun();songId='demo';songTitle='PRACTICE RIFF';chartLabel='ORIGINAL AUDIO';songLength=36;songAudioDuration=34;chart=practiceChart;gameBuffer=demoBufferCache;$('#game-start').disabled=false;$('#game-song-select').value='demo';refreshSong();}
$('#game-audio').addEventListener('change',e=>{const file=e.target.files[0];if(file){selectionGeneration++;$('#game-song-select').value='local';loadSongFile(file);}e.target.value='';});
$('#game-chart').addEventListener('change',e=>{loadChartFile(e.target.files[0]);e.target.value='';});$('#game-demo').addEventListener('click',resetDemo);$('#game-boost').addEventListener('click',activateBoost);
$('#game-style').addEventListener('change',()=>{cancelRun();$('#game-instructions').textContent=$('#game-style').value==='strum'?'HOLD A / S / D / J / K + SPACE TO STRUM · SHIFT FOR BOOST':'A / S / D / J / K · HOLD LONG NOTES · SHIFT FOR BOOST';$('#game-strum').hidden=$('#game-style').value!=='strum';updateBest();drawGame();});
$('#game-strum').addEventListener('click',strum);
contentReady.then(content=>{gameTracks=Array.isArray(content.gameTracks)?content.gameTracks.filter(t=>t.title&&t.audio):[];for(let i=0;i<gameTracks.length;i++){const option=document.createElement('option');option.value=String(i);option.textContent=gameTracks[i].title;$('#game-song-select').appendChild(option);}});
let selectionGeneration=0;
$('#game-song-select').addEventListener('change',async e=>{
  const selected=e.target.value,generation=++selectionGeneration;loadGeneration++;
  if(selected==='demo'){resetDemo();return;}if(selected==='local')return;
  const track=gameTracks[Number(selected)];if(!track)return;cancelRun();$('#game-start').disabled=true;$('#game-status').textContent='Fetching '+track.title+'…';
  try{const audioResponse=await fetch(track.audio);if(!audioResponse.ok)throw Error('Song audio is missing. Check the file path.');const blob=await audioResponse.blob();let authored=null;if(track.chart){const chartResponse=await fetch(track.chart);if(!chartResponse.ok)throw Error('Song chart is missing. Check the file path.');authored=await chartResponse.json();}if(generation!==selectionGeneration)return;await loadSongFile(new File([blob],track.audio.split('/').pop(),{type:blob.type}),authored,track.title);}
  catch(err){if(generation===selectionGeneration){$('#game-status').textContent=err.message;$('#game-start').disabled=false;}}
});
refreshSong();
