'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const storage = { get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }, set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private mode can disable storage. */ } } };
let topLayer = 10;
const apps = { welcome: '✳ welcome.txt', player: '♫ rhTunes', game: '✚ RUNNER_01', zine: '▰ the good stuff', about: '▤ read_me.txt' };
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
function updatePlayer() { $('#track-title').textContent=tracks[currentTrack].title; $('#track-subtitle').textContent=tracks[currentTrack].subtitle || 'Runners High'; $('#center-play span').textContent=playing?'Ⅱ':'▶'; $('#player-status').textContent=loading?'Loading audio…':playing?'Now playing':offset>0?'Paused':tracks[currentTrack].demo!==undefined?'Demo audio loaded':'Ready to play'; $('#center-play').setAttribute('aria-label',playing?'Pause music':'Play music'); }
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

// Original endless runner: bounded physics, consistent obstacle spacing, local high scores.
const canvas=$('#game-canvas'), ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
let gameState='ready',score=0,best=Number(storage.get('rh-best','0'))||0,runnerY=276,velocity=0,obstacles=[],spawnTimer=1.5,lastFrame=0,frame=0,distance=0;
const ground=310,runnerHeight=34;
function updateBest(){ $('#best-score').textContent=`BEST: ${String(best).padStart(4,'0')}`; }updateBest();
function startGame(){score=0;runnerY=ground-runnerHeight;velocity=0;obstacles=[];spawnTimer=1.5;distance=0;gameState='running';$('#game-start').textContent='RESTART';$('#game-pause').textContent='PAUSE';$('#game-status').textContent='Go find your high.';canvas.focus({preventScroll:true});lastFrame=0;cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);}
function pauseGame(){if(gameState==='running'){gameState='paused';$('#game-pause').textContent='RESUME';$('#game-status').textContent='Paused. Take a breath.';cancelAnimationFrame(frame);drawGame();}}
function jump(){if(gameState==='ready'||gameState==='over'){startGame();return;}if(gameState==='running'&&runnerY>=ground-runnerHeight-.1)velocity=-570;}
function drawGame(){
  ctx.fillStyle='#b9c591';ctx.fillRect(0,0,720,360);ctx.fillStyle='#a4b37b';
  for(let i=0;i<15;i++){const x=((i*67-distance*.12)%1005+1005)%1005-70,h=32+(i*29%73);ctx.fillRect(x,ground-h,46,h);ctx.fillRect(x+15,ground-h-12,5,12);}
  ctx.fillStyle='#849763';for(let i=0;i<7;i++){const x=((i*150-distance*.3)%1050+1050)%1050-100;ctx.fillRect(x,210,8,100);ctx.fillRect(x-20,211,48,7);ctx.fillRect(x-12,203,32,7);}
  ctx.strokeStyle='#6b8053';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,ground);ctx.lineTo(720,ground);ctx.stroke();
  ctx.fillStyle='#8b9d65';for(let i=0;i<24;i++)ctx.fillRect(((i*39-distance)%936+936)%936,328+(i%3)*8,13,3);
  const x=90,y=Math.round(runnerY),stride=gameState==='running'&&runnerY>=276?Math.floor(distance/30)%2:0;
  ctx.fillStyle='#303f2d';ctx.fillRect(x+9,y,15,13);ctx.fillRect(x+5,y+13,19,14);ctx.fillRect(x,y+16,8,5);ctx.fillRect(x+22,y+13,9,5);ctx.fillRect(x+6,y+26,7,8-stride*5);ctx.fillRect(x+18,y+26,7,3+stride*5);ctx.fillStyle='#b9c591';ctx.fillRect(x+20,y+4,3,3);
  for(const o of obstacles){ctx.fillStyle='#303f2d';ctx.fillRect(o.x,ground-o.h,o.w,o.h);ctx.strokeStyle='#92a36e';ctx.lineWidth=2;ctx.strokeRect(o.x+4,ground-o.h+4,o.w-8,o.h-8);ctx.beginPath();ctx.arc(o.x+o.w/2,ground-o.h/2,6,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#303f2d';ctx.font='bold 13px monospace';ctx.textAlign='left';ctx.fillText('RUNNER_01',22,29);ctx.textAlign='right';ctx.fillText('SCORE '+String(Math.floor(score)).padStart(4,'0'),698,29);
  if(gameState!=='running'){ctx.fillStyle='#b9c591e8';ctx.fillRect(125,90,470,154);ctx.strokeStyle='#303f2d';ctx.strokeRect(125,90,470,154);ctx.fillStyle='#303f2d';ctx.textAlign='center';ctx.font='bold 37px monospace';ctx.fillText(gameState==='over'?'ONE MORE RUN?':gameState==='paused'?'TAKE A BREATH.':'CHASE THE HIGH.',360,144);ctx.font='12px monospace';ctx.fillText(gameState==='over'?`SCORE ${Math.floor(score)} / BEST ${best}`:gameState==='paused'?'PRESS RESUME TO KEEP GOING':'JACKSONVILLE → ANYWHERE',360,178);ctx.fillText(gameState==='paused'?'THE HIGH CAN WAIT.':'PRESS START, SPACE, OR TAP',360,209);}
}
function tick(time){if(gameState!=='running')return;const dt=lastFrame?Math.min((time-lastFrame)/1000,.035):0;lastFrame=time;const speed=230+Math.min(score*.23,150);distance+=speed*dt;score+=dt*10;velocity+=1500*dt;runnerY=Math.min(ground-runnerHeight,runnerY+velocity*dt);if(runnerY>=ground-runnerHeight)velocity=0;spawnTimer-=dt;
  if(spawnTimer<=0){obstacles.push({x:730,w:23+Math.random()*12,h:27+Math.random()*13});spawnTimer=1.25+Math.random()*.65;}
  obstacles=obstacles.filter(o=>o.x+o.w>0);for(const o of obstacles){o.x-=speed*dt;if(90+25>o.x+3&&95<o.x+o.w-3&&runnerY+runnerHeight-3>ground-o.h){gameState='over';best=Math.max(best,Math.floor(score));storage.set('rh-best',String(best));updateBest();$('#game-status').textContent='Good run. You’ve got another one in you.';$('#game-start').textContent='TRY AGAIN ↺';}}
  drawGame();if(gameState==='running')frame=requestAnimationFrame(tick);
}
$('#game-start').addEventListener('click',startGame);$('#game-jump').addEventListener('click',jump);canvas.addEventListener('pointerdown',jump);
$('#game-pause').addEventListener('click',()=>{if(gameState==='paused'){gameState='running';lastFrame=0;$('#game-pause').textContent='PAUSE';$('#game-status').textContent='Back in the game.';frame=requestAnimationFrame(tick);}else pauseGame();});
document.addEventListener('keydown',e=>{if($('#game').hidden||!$('#game').classList.contains('active')||e.target.matches('input,textarea,button'))return;if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)jump();}if(e.code==='Escape')pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('blur',pauseGame);drawGame();

const pages=[
  `<div class="zine-kicker"><span>RH FIELD NOTES</span><span>VOL. 01 / CONCEPT EDITION</span></div><div class="zine-title">the good<span>stuff.</span></div><div class="zine-art"><b>RH®</b><span>JACKSONVILLE, FLORIDA / 904</span></div><div class="zine-bottom"><strong>FOR THE<br>LOVE OF<br>THE NOISE.</strong><span>A folder full of things worth keeping.<br>Little moments. Loud ideas. Margins.<br>A Runners High digital zine.</span></div>`,
  `<div class="zine-kicker"><span>RH FIELD NOTES</span><span>02 / A NOTE FROM THIS COMPUTER</span></div><h2>Less scrolling.<br>More feeling.</h2><div class="zine-columns">Remember when the internet felt like a place you could find? A strange little room someone made, just because they wanted it to exist.<br><br>This is one of those rooms. A desktop you can poke around in. A game you can lose ten minutes to. A song you can take the long way home with.</div><div class="zine-quote">“Keep the things that make you feel something.”</div><div class="zine-bottom"><span>EDITORIAL CONCEPT / NOT A BAND QUOTE</span><span>MADE TO BE EXPLORED ↗</span></div>`,
  `<div class="zine-kicker"><span>RH FIELD NOTES</span><span>03 / SIDE B</span></div><h2>Make a little<br>room for noise.</h2><div class="zine-checklist">□ Take the scenic route.<br>□ Burn a mix for a friend.<br>□ Go to a local show.<br>□ Put your phone in your pocket.<br>□ Start something, even if it’s weird.</div><div class="zine-quote">You made it to the end.<br>Now go make a good memory.</div><div class="zine-bottom"><span>YOUR PHOTOS, SHOW FLYERS & STORIES GO HERE.<br>THIS IS A CONCEPT EDITION. THE REST IS YOURS.</span><span>RH® / END OF FILE</span></div>`
];
let page=0;function renderZine(){$('#zine-paper').innerHTML=pages[page];$('#zine-count').textContent=`0${page+1} / 03`;$('#zine-prev').disabled=page===0;$('#zine-next').disabled=page===pages.length-1;}$('#zine-prev').addEventListener('click',()=>{if(page>0)page--;renderZine();});$('#zine-next').addEventListener('click',()=>{if(page<pages.length-1)page++;renderZine();});renderZine();
