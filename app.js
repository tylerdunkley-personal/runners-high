'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const storage = { get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }, set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private mode can disable storage. */ } } };
let topLayer = 10;
const apps = { welcome: '✳ welcome.txt', player: '♫ rhTunes', game: '✚ RAT ARCADE', zine: '▰ xerox files', about: '▤ read_me.txt' };
const opened = new Set(['welcome', 'player']);
function focusWindow(id) { const win = document.getElementById(id); $$('.window').forEach(w => w.classList.remove('active')); win.style.zIndex = ++topLayer; win.classList.add('active'); renderTasks(); }
function openWindow(id) { const win = document.getElementById(id); if (!win) return; opened.add(id); win.hidden = false; focusWindow(id); $('#start-menu').hidden = true; $('#start-button').setAttribute('aria-expanded', 'false'); if(id === 'game') drawGame(); }
function hideWindow(id, close = false) { document.getElementById(id).hidden = true; if (close) opened.delete(id); if (id === 'game') pauseGame(); renderTasks(); }
function renderTasks() { $('#task-buttons').replaceChildren(...[...opened].map(id => { const b = document.createElement('button'); b.textContent = apps[id]; b.classList.toggle('selected', !document.getElementById(id).hidden && document.getElementById(id).classList.contains('active')); b.addEventListener('click', () => openWindow(id)); return b; })); }
$$('[data-open]').forEach(b => b.addEventListener('click', () => openWindow(b.dataset.open)));
$$('[data-close]').forEach(b => b.addEventListener('click', () => hideWindow(b.dataset.close, true)));
$$('[data-minimize]').forEach(b => b.addEventListener('click', () => hideWindow(b.dataset.minimize)));
$$('.window').forEach(win => {
  win.addEventListener('pointerdown', () => focusWindow(win.id));
  const bar = win.querySelector('.titlebar'); let drag;
  bar.addEventListener('pointerdown', e => { if(e.target.closest('button') || innerWidth <= 760) return; const r = win.getBoundingClientRect(), desktop = $('#desktop').getBoundingClientRect(); drag = { x: e.clientX-r.left, y: e.clientY-r.top, desktop }; win.style.transform = 'none'; bar.setPointerCapture(e.pointerId); });
  bar.addEventListener('pointermove', e => { if(!drag) return; win.style.left = Math.min(Math.max(0,e.clientX-drag.x),innerWidth-win.offsetWidth)+'px'; win.style.top = Math.min(Math.max(0,e.clientY-drag.y-drag.desktop.top),drag.desktop.height-40)+'px'; win.style.right = 'auto'; });
  const stop = () => { drag = null; }; bar.addEventListener('pointerup', stop); bar.addEventListener('pointercancel', stop);
});
$('#reset-layout').addEventListener('click', () => { $$('.window').forEach(w => { ['left','right','top','transform'].forEach(p => w.style.removeProperty(p)); }); toast('Desktop restored. Fresh start.'); });
$('#start-button').addEventListener('click', () => { const menu = $('#start-menu'); menu.hidden = !menu.hidden; $('#start-button').setAttribute('aria-expanded', String(!menu.hidden)); });
document.addEventListener('pointerdown', e => { if(!e.target.closest('.start-menu, .start-button')) { $('#start-menu').hidden = true; $('#start-button').setAttribute('aria-expanded','false'); } });
$('#fx').addEventListener('click', () => { const off = document.body.classList.toggle('fx-off'); $('#fx span').textContent = off ? 'OFF' : 'ON'; $('#fx').setAttribute('aria-pressed',String(!off)); storage.set('rh-crt',off?'off':'on'); });
if(storage.get('rh-crt','on') === 'off') $('#fx').click();
const updateClock = () => { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); $('#clock').dateTime = d.toISOString(); }; updateClock(); setInterval(updateClock,1000);
let toastTimer; function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
focusWindow('welcome');

// Two original procedural demo tracks, generated locally. Replace with band audio in content.json.
let tracks = [{title:'After Hours', subtitle:'OS demo • original chiptune loop', demo:0}, {title:'Dial-up Daydream', subtitle:'OS demo • original chiptune loop', demo:1}];
let musicMode = 'band';
let currentTrack = 0, playing = false, loading = false, context, source, buffer, offset = 0, startedAt = 0, loadToken = 0;
const audio = new Audio(); audio.preload = 'metadata';
const duration = () => tracks[currentTrack].demo !== undefined ? 32 : Number.isFinite(audio.duration) ? audio.duration : 0;
const position = () => playing && tracks[currentTrack].demo !== undefined ? Math.min(32,offset + context.currentTime-startedAt) : tracks[currentTrack].demo !== undefined ? offset : audio.currentTime;
const timeLabel = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function demoBuffer(index) {
  const sr = 22050, out = context.createBuffer(1,sr*32,sr), data = out.getChannelData(0), step = .25;
  const melodies = [[64,67,71,74,71,67,64,62,60,64,67,71,67,64,60,62],[69,72,76,79,76,72,69,67,65,69,72,76,72,69,65,67]];
  const melody = melodies[index], roots = index ? [45,41,48,43] : [40,36,43,38];
  for(let n=0;n<data.length;n++) { const t=n/sr, beat=Math.floor(t/step), p=t%step, note=melody[beat%16], f=440*Math.pow(2,(note-69)/12), root=440*Math.pow(2,(roots[Math.floor(t/2)%4]-69)/12); const envelope=Math.min(1,p/.008)*Math.exp(-p*14); const lead=(Math.sin(2*Math.PI*f*t)>0?1:-1)*.065*envelope; const bass=Math.sin(2*Math.PI*root*t)*.10*Math.exp(-(t%.5)*6); const kickPhase=t%.5; const kick=Math.sin(2*Math.PI*(50*kickPhase+2*(1-Math.exp(-kickPhase*40))))*.16*Math.exp(-kickPhase*26); const hatPhase=t%.25; const hat=(Math.sin(n*1.73)*Math.sin(n*2.31))*.025*Math.exp(-hatPhase*75); data[n]=(lead+bass+kick+hat)*Math.min(1,t*10,(32-t)*10); }
  return out;
}
function updatePlayer() { $('#track-title').textContent=tracks[currentTrack].title; $('#track-subtitle').textContent=tracks[currentTrack].subtitle || 'Runners High'; $('#center-play span').textContent=playing?'Ⅱ':'▶'; $('#player-status').textContent=musicMode==='band'?'Official Bandcamp stream':loading?'Loading audio…':playing?'Now playing':offset>0?'Paused':tracks[currentTrack].demo!==undefined?'Demo audio loaded':'Ready to play'; $('#center-play').setAttribute('aria-label',playing?'Pause music':'Play music'); }
function stopSource() { if(source) { source.onended=null; try { source.stop(); } catch {} source.disconnect(); source=null; } }
function pauseMusic() { offset=position(); playing=false; stopSource(); audio.pause(); updatePlayer(); }
async function playMusic() {
  if(playing) { pauseMusic(); return; } if(loading) return;
  const token=loadToken; loading=true; updatePlayer();
  try {
    if(tracks[currentTrack].demo!==undefined) { context ??= new (window.AudioContext || window.webkitAudioContext)(); await context.resume(); if(token!==loadToken)return; buffer ??= demoBuffer(tracks[currentTrack].demo); if(offset>=32)offset=0; source=context.createBufferSource(); source.buffer=buffer; source.connect(context.destination); startedAt=context.currentTime; source.start(0,offset); source.onended=()=>{playing=false;offset=0;updatePlayer();}; }
    else { await audio.play(); if(token!==loadToken){audio.pause();return;} }
    playing=true;
  } catch { toast('Could not play that audio file. Try another MP3.'); } finally { loading=false; updatePlayer(); }
}
function selectTrack(index, auto = false) { loadToken++; pauseMusic(); currentTrack=(index+tracks.length)%tracks.length; buffer=null; offset=0; audio.removeAttribute('src'); if(tracks[currentTrack].src)audio.src=tracks[currentTrack].src; updatePlayer(); renderTrackList(); if(auto)playMusic(); }
['#play-track','#center-play'].forEach(s=>$(s).addEventListener('click',playMusic));
$('#prev-track').addEventListener('click',()=>selectTrack(currentTrack-1,playing)); $('#next-track').addEventListener('click',()=>selectTrack(currentTrack+1,playing));
$('#menu-track').addEventListener('click',()=>{ $('#track-list').hidden=!$('#track-list').hidden; });
function renderTrackList() { $('#track-list').replaceChildren(...tracks.map((track,i)=>{const b=document.createElement('button'); b.textContent=`${i===currentTrack?'▶':'○'} ${track.title}`; b.addEventListener('click',()=>selectTrack(i,true));return b;})); }
$('#music-files').addEventListener('change',e=>{ const files=[...e.target.files]; if(!files.length)return; const old=tracks; pauseMusic(); tracks=files.map(file=>({title:file.name.replace(/\.[^.]+$/,''),subtitle:'Local mixtape • on your device',src:URL.createObjectURL(file),local:true})); selectTrack(0); old.filter(t=>t.local).forEach(t=>URL.revokeObjectURL(t.src)); toast(`${files.length} track${files.length===1?'':'s'} loaded. Hit play.`); e.target.value=''; });
$('#scrubber').addEventListener('input',e=>{const wasPlaying=playing;pauseMusic();offset=Number(e.target.value)/100*duration();if(tracks[currentTrack].demo===undefined)audio.currentTime=offset; if(wasPlaying)playMusic();});
audio.addEventListener('ended',()=>selectTrack(currentTrack+1,true)); audio.addEventListener('error',()=>{playing=false;updatePlayer();toast('Audio unavailable. Load another file to keep listening.');});
setInterval(()=>{const p=position(),d=duration();$('#elapsed').textContent=timeLabel(p);$('#duration').textContent=timeLabel(d);$('#scrubber').value=d?p/d*100:0;},250);
renderTrackList();updatePlayer();
fetch('content.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(content=>{if(Array.isArray(content.tracks)&&content.tracks.length){const valid=content.tracks.filter(t=>t.title&&t.src).map(t=>({title:t.title,src:t.src,subtitle:t.subtitle||'Runners High'}));if(valid.length){tracks=valid;selectTrack(0);}} }).catch(()=>{});

const pages=[
  `<div class="zine-kicker"><span>RUNNER’S HIGH / THE XEROX FILES</span><span>ISSUE 001 / JACKSONVILLE, FL</span></div><div class="zine-title">RAT<span>MOTEL.</span></div><div class="zine-art"><img src="https://f4.bcbits.com/img/a4169676350_10.jpg" alt="Gone Fishin’ album artwork" width="200" height="160"><b>GONE<br>FISHIN’<br>2020</b><span>TRACK 03 / 03:11</span></div><div class="zine-bottom"><strong>FOUR SONGS.<br>ONE LIVING<br>ROOM.</strong><span>Gone Fishin’ was recorded in Liam and Carson’s living room.<br><a href="https://runnershigh.bandcamp.com/track/rat-motel" target="_blank" rel="noopener noreferrer">PLAY RAT MOTEL ↗</a></span></div><a class="zine-source" href="https://runnershigh.bandcamp.com/album/gone-fishin" target="_blank" rel="noopener noreferrer">SOURCE: GONE FISHIN’ / OFFICIAL BANDCAMP LINER NOTES ↗</a>`,
  `<div class="zine-kicker"><span>THE XEROX FILES</span><span>02 / LINER NOTES</span></div><h2>A living room.<br>A record.<br>A rat motel.</h2><div class="zine-columns">Released January 1, 2020, Gone Fishin’ packs four tracks into one release: SUPERHYDRATION, Car Bomb, Rat Motel, and Spring Cleaning.<br><br>Taylor Paul Neal produced and mixed it. Brok Mende mastered it. EJ Hervey is credited with the synth on Rat Motel.<br><br>The band’s tags put emo, lo-fi, popgaze, shoegaze, and synth in the same pile. Turn it up and pick your own label.</div><div class="zine-quote">RECORDED IN A LIVING ROOM.<br>BEST PLAYED VERY LOUD.</div><a class="zine-source" href="https://runnershigh.bandcamp.com/album/gone-fishin" target="_blank" rel="noopener noreferrer">CREDITS & TRACKLIST: RUNNER’S HIGH / GONE FISHIN’ ↗</a>`,
  `<div class="zine-kicker"><span>THE XEROX FILES</span><span>03 / THE RECORD CRATE</span></div><h2>KEEP<br>DIGGING.</h2><ul class="record-list"><li><a href="https://runnershigh.bandcamp.com/track/im-at-the-park" target="_blank" rel="noopener noreferrer">I’m at the Park ↗</a><time>APR 2026</time></li><li><a href="https://runnershigh.bandcamp.com/track/what-else-could-i-be-doin" target="_blank" rel="noopener noreferrer">what else could i be doin? ↗</a><time>FEB 2026</time></li><li><a href="https://runnershigh.bandcamp.com/album/grass-fed" target="_blank" rel="noopener noreferrer">GRASS-FED ↗</a><time>NOV 2021</time></li><li><a href="https://runnershigh.bandcamp.com/album/gone-fishin" target="_blank" rel="noopener noreferrer">Gone Fishin’ ↗</a><time>JAN 2020</time></li><li><a href="https://runnershigh.bandcamp.com/" target="_blank" rel="noopener noreferrer">Dress Code ↗</a><time>MAY 2019</time></li><li><a href="https://runnershigh.bandcamp.com/" target="_blank" rel="noopener noreferrer">Update Me ↗</a><time>SEP 2017</time></li></ul><a class="zine-source" href="https://runnershigh.bandcamp.com/" target="_blank" rel="noopener noreferrer">RELEASE ARCHIVE: RUNNER’S HIGH ON BANDCAMP ↗</a><div class="zine-bottom"><strong>BUY MUSIC.<br>GO TO SHOWS.</strong><span>SMALL SCENE. BIG SOUND.<br>JACKSONVILLE, FLORIDA / 904</span></div>`
];
let page=0;function renderZine(){$('#zine-paper').innerHTML=pages[page];$('#zine-count').textContent=`0${page+1} / 03`;$('#zine-prev').disabled=page===0;$('#zine-next').disabled=page===pages.length-1;}$('#zine-prev').addEventListener('click',()=>{if(page>0)page--;renderZine();});$('#zine-next').addEventListener('click',()=>{if(page<pages.length-1)page++;renderZine();});renderZine();

// The official stream and local mixtape are separate audio sources.
function setMusicMode(mode){
  musicMode=mode;
  const band=mode==='band';
  if(band)pauseMusic();
  else {const player=$('#bandcamp-player');player.src=player.getAttribute('src');}
  $('#official-music').hidden=!band;$('#mixtape-player').hidden=band;
  $('.import-music').hidden=band;$('.bandcamp-link').hidden=!band;
  $('.player-surround').classList.toggle('band-mode',band);
  $('#band-mode').setAttribute('aria-pressed',String(band));$('#mixtape-mode').setAttribute('aria-pressed',String(!band));
  $('.player-note').textContent=band?'OFFICIAL STREAM / SUPPORT THE BAND':'LOCAL FILES / YOUR COMPUTER ONLY';
  if(band)$('#player-status').textContent='Official Bandcamp stream';else updatePlayer();
}
$('#band-mode').addEventListener('click',()=>setMusicMode('band'));
$('#mixtape-mode').addEventListener('click',()=>setMusicMode('mixtape'));
setMusicMode('band');
