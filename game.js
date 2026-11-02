'use strict';
// Original four-lane rhythm game. The note chart and practice riff share an AudioContext clock.
// This soundtrack is original demo audio; no Runner's High recording or commercial game assets are used.
const canvas = $('#game-canvas'), ctx = canvas.getContext('2d');
const laneColors = ['#9de44e', '#ee4c51', '#f9d34e', '#60a9ff', '#ff963d'];
const laneKeys = ['KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK'];
const riffPattern = [0,0,2,1,0,4,2,-1,1,1,3,2,0,2,1,-1];
const leadNotes = [52,55,57,59,62];
let chart = Array.from({length:128}, (_,i) => ({time:2+i*.25,lane:riffPattern[i%16]})).filter(n=>n.lane>=0);
const practiceChart=chart;
for(let i=0;i<practiceChart.length;i++){const n=practiceChart[i],next=practiceChart.slice(i+1).find(m=>m.lane===n.lane);if(n.lane===4&&(!next||next.time-n.time>1))n.duration=.8;}
for(let i=0;i<4;i++)practiceChart.push({time:2+i*8,lane:3,duration:0});practiceChart.sort((a,b)=>a.time-b.time);
let songLength=36,songTitle='PRACTICE RIFF',chartLabel='ORIGINAL AUDIO',songId='demo',songAudioDuration=34,demoBufferCache;
let rock=60,charge=0,boostUntil=0,lastTick=0;
const travelTime=2.8, hitWindow=.16, targetY=421;
let gameContext, gameSource, gameBuffer, gameStartTime=0, gameOffset=0, gameState='ready', frame=0;
let notes=[], score=0, combo=0, maxCombo=0, hits=0, missed=0, badHits=0, best=Number(storage.get('rh-rhythm-best','0'))||0;
let judgement='', judgementAt=-5, countdownValue=-1, lastNoteIndex=-1;
const pressedLanes=new Set(), laneFlashes=[-5,-5,-5,-5,-5];
const gameTime=()=>gameState==='running'?gameOffset+gameContext.currentTime-gameStartTime:gameOffset;
const timingOffset=()=>Number($('#game-offset').value)/1000||0;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function createPracticeBuffer(){
  const sr=22050,out=gameContext.createBuffer(1,sr*songLength,sr),data=out.getChannelData(0),roots=[40,36,43,38];
  for(let n=0;n<data.length;n++){
    const t=n/sr;
    if(t<2){const p=t%.5;data[n]=Math.sin(2*Math.PI*1000*t)*.10*Math.exp(-p*90);continue;}
    if(t>=34){const tail=Math.exp(-(t-34)*8);data[n]=Math.sin(2*Math.PI*82.407*t)*tail*.12;continue;}
    const s=t-2,step=Math.floor(s/.25),p=s%.25,lane=riffPattern[step%16];
    const root=440*Math.pow(2,(roots[Math.floor(s/2)%4]-69)/12),f=440*Math.pow(2,(leadNotes[Math.max(lane,0)]-69)/12);
    const saw=hz=>2*((t*hz)%1)-1;
    const guitar=Math.tanh((saw(root)+.65*saw(root*1.5)+.35*saw(root*2))*2.8)*.085*Math.exp(-(s%.5)*4);
    const lead=lane<0?0:Math.tanh((saw(f)+.4*saw(f*2))*2)*.085*Math.min(1,p/.004)*Math.exp(-p*12);
    const kp=s%.5,kick=Math.sin(2*Math.PI*(48*kp+2*(1-Math.exp(-kp*35))))*.20*Math.exp(-kp*28);
    const noise=Math.sin(n*1.731)*Math.sin(n*2.311),snarePhase=(s+.5)%1;
    const snare=noise*.17*Math.exp(-snarePhase*30),hat=noise*.035*Math.exp(-p*65);
    data[n]=(guitar+lead+kick+snare+hat)*Math.min(1,s*20+.05,(34-t)*8);
  }
  return out;
}
function disconnectGameAudio(){if(gameSource){gameSource.onended=null;try{gameSource.stop();}catch{}gameSource.disconnect();gameSource=null;}}
function startGameSource(){gameSource=gameContext.createBufferSource();gameSource.buffer=gameBuffer;gameSource.connect(gameContext.destination);gameStartTime=gameContext.currentTime;gameSource.start(0,gameOffset);gameSource.onended=()=>{if(gameState==='running')finishGame();};}
async function startGame(){
  if(gameState==='loading')return;
  cancelAnimationFrame(frame);disconnectGameAudio();gameState='loading';$('#game-start').disabled=true;$('#game-pause').disabled=true;$('#game-boost').disabled=true;
  $('#game-status').textContent='Plugging in…';drawGame();
  try{
    pauseMusic();
    // Reloading the official embed stops its independent playback before the game starts.
    const bandPlayer=$('#bandcamp-player'); if(bandPlayer)bandPlayer.src=bandPlayer.getAttribute('src');
    gameContext??=new(window.AudioContext||window.webkitAudioContext)();await gameContext.resume();
    if(songId==='demo')gameBuffer=demoBufferCache??=createPracticeBuffer();
    if($('#game').hidden||document.hidden){gameState='ready';drawGame();return;}
    notes=chart.map(n=>({...n,state:'pending'}));score=0;combo=0;maxCombo=0;hits=0;missed=0;badHits=0;rock=60;charge=0;boostUntil=0;lastTick=0;gameOffset=0;judgement='';countdownValue=-1;lastNoteIndex=-1;
    laneFlashes.fill(-5);pressedLanes.clear();gameState='running';startGameSource();
    $('#game-start').textContent='RESTART ↺';$('#game-pause').textContent='PAUSE';$('#game-pause').disabled=false;
    $('#game-status').textContent='A / S / D / J / K — hold long notes. SPACE strums in strum mode.';
    canvas.focus({preventScroll:true});frame=requestAnimationFrame(tick);
  }catch{gameState='ready';$('#game-status').textContent='Audio could not start. Press START to try again.';drawGame();}
  finally{$('#game-start').disabled=false;}
}
function pauseGame(){
  if(gameState!=='running')return;
  gameOffset=gameTime();gameState='paused';disconnectGameAudio();cancelAnimationFrame(frame);releaseAllLanes();
  $('#game-pause').textContent='RESUME';$('#game-status').textContent='Paused. The pit can wait.';drawGame();
}
async function resumeGame(){
  if(gameState!=='paused')return;
  try{await gameContext.resume();if(gameState!=='paused'||$('#game').hidden)return;gameState='running';lastTick=gameOffset;startGameSource();$('#game-pause').textContent='PAUSE';$('#game-status').textContent='Back in. Same riff. More feeling.';frame=requestAnimationFrame(tick);}catch{toast('Audio paused. Try RESUME again.');}
}
function finishGame(){
  if(gameState!=='running')return;
  gameOffset=Math.min(songLength,gameTime());gameState='finished';disconnectGameAudio();cancelAnimationFrame(frame);releaseAllLanes();
  score=Math.floor(score);best=Math.max(best,score);storage.set(scoreKey(),String(best));updateBest();$('#game-start').textContent='ENCORE / PLAY AGAIN';$('#game-pause').disabled=true;$('#game-boost').disabled=true;
  $('#game-status').textContent=`${Math.round(hits/chart.length*100)}% NOTES HIT / BEST COMBO ${maxCombo} / ${missed} MISSED`;
  drawGame();
}
function scoreKey(){return 'rh-best-'+songId+'-'+($('#game-style').value||'tap');}
function updateBest(){best=Number(storage.get(scoreKey(),'0'))||0;$('#best-score').textContent=`BEST: ${String(best).padStart(6,'0')}`;}
function multiplier(){return Math.min(4,1+Math.floor(combo/10))*(gameTime()<boostUntil?2:1);}
function hitNote(note,now){const error=Math.abs(note.time-now);note.state=note.duration?'holding':'hit';hits++;combo++;maxCombo=Math.max(maxCombo,combo);score+=(error<=.065?100:70)*multiplier();rock=Math.min(100,rock+2);charge=Math.min(100,charge+3);laneFlashes[note.lane]=gameTime();judgement=error<=.065?'PERFECT':'GOOD';judgementAt=gameTime();}
function badStrum(){combo=0;badHits++;rock=Math.max(0,rock-3);judgement='OFF BEAT';judgementAt=gameTime();}
function hitLane(lane){
  pressedLanes.add(lane);$$('[data-lane]')[lane]?.classList.add('pressed');
  if(gameState!=='running'||$('#game-style').value==='strum')return;
  const now=gameTime()+timingOffset();if(now<1.7)return;
  const note=notes.find(n=>n.lane===lane&&n.state==='pending'&&Math.abs(n.time-now)<=hitWindow);
  if(note)hitNote(note,now);else badStrum();
}
function strum(){
  if(gameState!=='running'||$('#game-style').value!=='strum')return;
  const now=gameTime()+timingOffset();if(now<1.7)return;
  const first=notes.find(n=>n.state==='pending'&&Math.abs(n.time-now)<=hitWindow);
  if(!first){badStrum();return;}
  const group=notes.filter(n=>n.state==='pending'&&Math.abs(n.time-first.time)<.001),lanes=new Set(group.map(n=>n.lane));
  if(lanes.size!==pressedLanes.size||[...lanes].some(l=>!pressedLanes.has(l))){badStrum();return;}group.forEach(n=>hitNote(n,now));
}
function activateBoost(){if(gameState!=='running'||charge<50||gameTime()<boostUntil)return;charge-=50;boostUntil=gameTime()+6;judgement='LIVE WIRE ×2';judgementAt=gameTime();}
function releaseLane(lane){pressedLanes.delete(lane);$$('[data-lane]')[lane]?.classList.remove('pressed');}
function releaseAllLanes(){for(let i=0;i<5;i++)releaseLane(i);}
function tick(){
  if(gameState!=='running')return;const now=gameTime(),adjusted=now+timingOffset(),dt=Math.min(.05,Math.max(0,now-lastTick));lastTick=now;
  for(const note of notes){
    if(note.state==='pending'&&adjusted>note.time+hitWindow){note.state='missed';combo=0;missed++;rock=Math.max(0,rock-5);judgement='MISS';judgementAt=now;}
    else if(note.state==='holding'){
      if(adjusted>=note.time+note.duration-.05)note.state='hit';
      else if(!pressedLanes.has(note.lane)){note.state='broken';combo=0;rock=Math.max(0,rock-2);judgement='HOLD IT';judgementAt=now;}
      else score+=dt*45*multiplier();
    }
  }
  $('#game-boost').disabled=charge<50||now<boostUntil;drawGame();if(now>=songLength)finishGame();else frame=requestAnimationFrame(tick);
}
function drawGame(){
  const t=gameTime();ctx.fillStyle=t<boostUntil&&gameState==='running'?'#121c29':'#111015';ctx.fillRect(0,0,720,500);
  ctx.fillStyle='#292725';for(let i=0;i<12;i++){ctx.fillRect(20+(i%3)*245,58+Math.floor(i/3)*89,225,2);}
  // Amplifier stacks flank a long, receding neck.
  for(let i=0;i<4;i++){const x=i<2?14:635,y=100+(i%2)*110;ctx.fillStyle='#1d1b20';ctx.fillRect(x,y,70,96);ctx.strokeStyle='#514954';ctx.lineWidth=2;ctx.strokeRect(x,y,70,96);ctx.beginPath();ctx.ellipse(x+35,y+52,25,29,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#857c70';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('RH / LOUD',x+35,y+14);}
  ctx.fillStyle='#28242c';ctx.fillRect(18,367,18,92);ctx.fillRect(684,367,18,92);ctx.fillStyle=rock>35?'#9de44e':'#ee4c51';ctx.fillRect(20,457-rock*.88,14,rock*.88);ctx.fillStyle='#60a9ff';ctx.fillRect(686,457-charge*.88,14,charge*.88);ctx.fillStyle='#c0b5a0';ctx.font='8px monospace';ctx.textAlign='left';ctx.fillText('ROCK',12,476);ctx.textAlign='right';ctx.fillText('BOOST',708,476);
  // Perspective fretboard.
  const topX=290,topW=140,bottomX=70,bottomW=580,topY=62,bottomY=480;
  ctx.beginPath();ctx.moveTo(topX,topY);ctx.lineTo(topX+topW,topY);ctx.lineTo(bottomX+bottomW,bottomY);ctx.lineTo(bottomX,bottomY);ctx.closePath();ctx.fillStyle=t<boostUntil&&gameState==='running'?'#182536':'#251d1b';ctx.fill();ctx.strokeStyle='#97806b';ctx.lineWidth=2;ctx.stroke();
  for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(topX+topW*i/5,topY);ctx.lineTo(bottomX+bottomW*i/5,bottomY);ctx.strokeStyle='#343330';ctx.lineWidth=1;ctx.stroke();}
  for(let i=0;i<8;i++){const p=((i/8+(reducedMotion?0:t*.2))%1),y=topY+p*(bottomY-topY),left=topX+(bottomX-topX)*p,width=topW+(bottomW-topW)*p;ctx.fillStyle='#c7af7e29';ctx.fillRect(left,y,width,1+p);}
  ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillStyle='#e6e0d1';ctx.fillText('RAT ARCADE',20,27);ctx.fillStyle='#8f8a7d';ctx.font='9px monospace';ctx.fillText(songTitle.slice(0,27),20,43);
  ctx.textAlign='right';ctx.fillStyle='#e6e0d1';ctx.font='bold 16px monospace';ctx.fillText(String(Math.floor(score)).padStart(6,'0'),700,27);ctx.fillStyle='#ed6555';ctx.font='10px monospace';ctx.fillText(`COMBO ${String(combo).padStart(3,'0')}  /  ×${multiplier()}`,700,45);
  const targetP=(targetY-topY)/(bottomY-topY),targetLeft=topX+(bottomX-topX)*targetP,targetWidth=topW+(bottomW-topW)*targetP;
  ctx.fillStyle='#a7a18d';ctx.fillRect(targetLeft-8,targetY,targetWidth+16,2);
  for(let lane=0;lane<5;lane++){
    const x=targetLeft+targetWidth*(lane+.5)/5,active=pressedLanes.has(lane)||t-laneFlashes[lane]<.10;
    ctx.beginPath();ctx.ellipse(x,targetY,31,12,0,0,Math.PI*2);ctx.fillStyle=active?laneColors[lane]:'#161616';ctx.fill();ctx.strokeStyle=laneColors[lane];ctx.lineWidth=3;ctx.stroke();
    if(t-laneFlashes[lane]<.14&&gameState==='running'&&!reducedMotion){ctx.beginPath();ctx.moveTo(x-15,targetY-8);ctx.lineTo(x-5,targetY-49);ctx.lineTo(x,targetY-24);ctx.lineTo(x+8,targetY-61);ctx.lineTo(x+17,targetY-8);ctx.closePath();ctx.fillStyle=t<boostUntil?'#b6e6ff':'#ffb03c';ctx.fill();}
    ctx.fillStyle=laneColors[lane];ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillText(['A','S','D','J','K'][lane],x,targetY+40);
  }
  for(const note of notes){if(!['pending','holding'].includes(note.state))continue;const ahead=note.time-t;if(ahead>travelTime||ahead+(note.duration||0)<-.2)continue;const progress=1-ahead/travelTime,y=topY+progress*(targetY-topY),p=(y-topY)/(bottomY-topY),left=topX+(bottomX-topX)*p,width=topW+(bottomW-topW)*p,x=left+width*(note.lane+.5)/5,r=13+13*Math.max(0,progress);
    if(note.duration){const endY=Math.max(topY,topY+(1-(note.time+note.duration-t)/travelTime)*(targetY-topY)),p2=(endY-topY)/(bottomY-topY),ex=topX+(bottomX-topX)*p2+(topW+(bottomW-topW)*p2)*(note.lane+.5)/5,hy=note.state==='holding'?targetY:y,hp=(hy-topY)/(bottomY-topY),hx=topX+(bottomX-topX)*hp+(topW+(bottomW-topW)*hp)*(note.lane+.5)/5;ctx.beginPath();ctx.moveTo(hx-5,hy);ctx.lineTo(ex-3,endY);ctx.lineTo(ex+3,endY);ctx.lineTo(hx+5,hy);ctx.fillStyle=laneColors[note.lane];ctx.fill();}if(note.state==='holding'||ahead<-.2)continue;
    ctx.fillStyle='#0008';ctx.fillRect(x-r,y+4,r*2,8);ctx.beginPath();ctx.ellipse(x,y,r,6+4*progress,0,0,Math.PI*2);ctx.fillStyle=laneColors[note.lane];ctx.fill();ctx.strokeStyle='#ffffff70';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ffffff88';ctx.fillRect(x-r/2,y-3,r,2);
  }
  if(gameState==='running'){
    ctx.textAlign='center';if(t<2){ctx.fillStyle='#efe8d9';ctx.font='bold 55px monospace';ctx.fillText(String(Math.max(1,4-Math.floor(t/.5))),360,193);ctx.font='11px monospace';ctx.fillText('COUNT IT IN.',360,222);}
    else if(t-judgementAt<.55){ctx.fillStyle=['MISS','OFF BEAT','HOLD IT'].includes(judgement)?'#f15f63':'#e6e0d1';ctx.font='bold 18px monospace';ctx.fillText(judgement,360,112);}
    ctx.fillStyle='#ed6555';ctx.fillRect(0,497,Math.min(t/songLength,1)*720,3);
  }else{
    ctx.fillStyle='#111111ed';ctx.fillRect(85,106,550,177);ctx.strokeStyle='#a7a18d';ctx.lineWidth=1;ctx.strokeRect(85,106,550,177);ctx.textAlign='center';ctx.fillStyle='#ef5143';ctx.font='bold 39px monospace';
    ctx.fillText(gameState==='finished'?'ENCORE?':gameState==='paused'?'HOLD THAT NOTE.':gameState==='loading'?'PLUGGING IN…':'MAKE SOME NOISE.',360,154);
    ctx.fillStyle='#ded7c6';ctx.font='11px monospace';ctx.fillText(gameState==='finished'?`SCORE ${score}  /  ${Math.round(hits/chart.length*100)}% HIT  /  COMBO ${maxCombo}`:gameState==='paused'?'SAME SONG. RIGHT WHERE YOU LEFT IT.':'FIVE FRETS. LONG NOTES. CHORDS. LOUDER.',360,191);
    ctx.fillStyle='#aaa498';ctx.font='10px monospace';ctx.fillText(gameState==='finished'?'YOUR HIGH SCORE STAYS ON THIS COMPUTER.':gameState==='paused'?'PRESS RESUME OR ESC TO COME BACK IN.':'A / S / D / J / K — HOLD LONG NOTES',360,220);
    ctx.font='8px monospace';ctx.fillText(songId==='demo'?'ORIGINAL PRACTICE RIFF / LOAD YOUR OWN SONG BELOW':chartLabel==='AUTO CHART'?'YOUR LOCAL SONG / APPROXIMATE AUTO CHART':'YOUR LOCAL SONG / HAND-TIMED CHART',360,254);
  }
}
$('#game-start').addEventListener('click',startGame);
$('#game-pause').addEventListener('click',()=>gameState==='paused'?resumeGame():pauseGame());
$$('[data-lane]').forEach(button=>{const lane=Number(button.dataset.lane);button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);hitLane(lane);});button.addEventListener('pointerup',()=>releaseLane(lane));button.addEventListener('pointercancel',()=>releaseLane(lane));});
document.addEventListener('keydown',e=>{
  if($('#game').hidden||!$('#game').classList.contains('active')||e.target.matches('input,textarea,select'))return;
  const lane=laneKeys.indexOf(e.code);if(lane>=0){e.preventDefault();if(!e.repeat)hitLane(lane);}
  if(e.code==='Space'&&$('#game-style').value==='strum'){e.preventDefault();if(!e.repeat)strum();}if(e.code==='ShiftLeft'||e.code==='ShiftRight'){e.preventDefault();if(!e.repeat)activateBoost();}if(e.code==='Escape'){e.preventDefault();gameState==='paused'?resumeGame():pauseGame();}
});
document.addEventListener('keyup',e=>{const lane=laneKeys.indexOf(e.code);if(lane>=0)releaseLane(lane);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('blur',pauseGame);
$('#game-offset').value=storage.get('rh-timing','0');$('#game-offset').addEventListener('change',()=>{const v=Math.max(-200,Math.min(200,Number($('#game-offset').value)||0));$('#game-offset').value=v;storage.set('rh-timing',String(v));});
updateBest();drawGame();
