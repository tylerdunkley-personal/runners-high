'use strict';
// Original four-lane rhythm game. The note chart and practice riff share an AudioContext clock.
// This soundtrack is original demo audio; no Runner's High recording or commercial game assets are used.
const canvas = $('#game-canvas'), ctx = canvas.getContext('2d');
const laneColors = ['#b4e966', '#f15f63', '#f3d55c', '#7aaef5'];
const laneKeys = ['KeyA', 'KeyS', 'KeyK', 'KeyL'];
const riffPattern = [0,0,2,1,0,3,2,-1,1,1,3,2,0,2,1,-1];
const leadNotes = [52,55,57,59];
const chart = Array.from({length:128}, (_,i) => ({time:2+i*.25,lane:riffPattern[i%16]})).filter(n=>n.lane>=0);
const songLength=36, travelTime=2, hitWindow=.16, targetY=355;
let gameContext, gameSource, gameBuffer, gameStartTime=0, gameOffset=0, gameState='ready', frame=0;
let notes=[], score=0, combo=0, maxCombo=0, hits=0, missed=0, badHits=0, best=Number(storage.get('rh-rhythm-best','0'))||0;
let judgement='', judgementAt=-5, countdownValue=-1, lastNoteIndex=-1;
const pressedLanes=new Set(), laneFlashes=[-5,-5,-5,-5];
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
  cancelAnimationFrame(frame);disconnectGameAudio();gameState='loading';$('#game-start').disabled=true;$('#game-pause').disabled=true;
  $('#game-status').textContent='Plugging in…';drawGame();
  try{
    pauseMusic();
    // Reloading the official embed stops its independent playback before the game starts.
    const bandPlayer=$('#bandcamp-player'); if(bandPlayer)bandPlayer.src=bandPlayer.getAttribute('src');
    gameContext??=new(window.AudioContext||window.webkitAudioContext)();await gameContext.resume();
    gameBuffer??=createPracticeBuffer();
    if($('#game').hidden||document.hidden){gameState='ready';drawGame();return;}
    notes=chart.map(n=>({...n,state:'pending'}));score=0;combo=0;maxCombo=0;hits=0;missed=0;badHits=0;gameOffset=0;judgement='';countdownValue=-1;lastNoteIndex=-1;
    laneFlashes.fill(-5);pressedLanes.clear();gameState='running';startGameSource();
    $('#game-start').textContent='RESTART ↺';$('#game-pause').textContent='PAUSE';$('#game-pause').disabled=false;
    $('#game-status').textContent='A / S / K / L — your neighbors will understand.';
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
  try{await gameContext.resume();if(gameState!=='paused'||$('#game').hidden)return;gameState='running';startGameSource();$('#game-pause').textContent='PAUSE';$('#game-status').textContent='Back in. Same riff. More feeling.';frame=requestAnimationFrame(tick);}catch{toast('Audio paused. Try RESUME again.');}
}
function finishGame(){
  if(gameState!=='running')return;
  gameOffset=Math.min(songLength,gameTime());gameState='finished';disconnectGameAudio();cancelAnimationFrame(frame);releaseAllLanes();
  best=Math.max(best,score);storage.set('rh-rhythm-best',String(best));updateBest();$('#game-start').textContent='ENCORE / PLAY AGAIN';$('#game-pause').disabled=true;
  $('#game-status').textContent=`${Math.round(hits/chart.length*100)}% NOTES HIT / BEST COMBO ${maxCombo} / ${missed} MISSED`;
  drawGame();
}
function updateBest(){$('#best-score').textContent=`BEST: ${String(best).padStart(5,'0')}`;}
function hitLane(lane){
  pressedLanes.add(lane);$$('[data-lane]')[lane]?.classList.add('pressed');
  if(gameState!=='running')return;
  const now=gameTime()+timingOffset();laneFlashes[lane]=gameTime();
  if(now<1.7)return;
  const note=notes.find(n=>n.lane===lane&&n.state==='pending'&&Math.abs(n.time-now)<=hitWindow);
  if(note){const error=Math.abs(note.time-now);note.state='hit';hits++;combo++;maxCombo=Math.max(maxCombo,combo);const multiplier=Math.min(4,1+Math.floor(combo/10));score+=(error<=.065?100:70)*multiplier;judgement=error<=.065?'DEAD ON.':'NICE.';judgementAt=gameTime();}
  else{combo=0;badHits++;judgement='TOO EAGER.';judgementAt=gameTime();}
}
function releaseLane(lane){pressedLanes.delete(lane);$$('[data-lane]')[lane]?.classList.remove('pressed');}
function releaseAllLanes(){for(let i=0;i<4;i++)releaseLane(i);}
function tick(){
  if(gameState!=='running')return;
  const now=gameTime();
  for(const note of notes){if(note.state==='pending'&&now+timingOffset()>note.time+hitWindow){note.state='missed';combo=0;missed++;judgement='MISSED.';judgementAt=now;}}
  drawGame();if(now>=songLength)finishGame();else frame=requestAnimationFrame(tick);
}
function drawGame(){
  const t=gameTime();ctx.fillStyle='#171717';ctx.fillRect(0,0,720,440);
  ctx.fillStyle='#292725';for(let i=0;i<12;i++){ctx.fillRect(20+(i%3)*245,58+Math.floor(i/3)*89,225,2);}
  // Perspective fretboard.
  const topX=200,topW=320,bottomX=105,bottomW=510,topY=67,bottomY=425;
  ctx.beginPath();ctx.moveTo(topX,topY);ctx.lineTo(topX+topW,topY);ctx.lineTo(bottomX+bottomW,bottomY);ctx.lineTo(bottomX,bottomY);ctx.closePath();ctx.fillStyle='#0d0d0d';ctx.fill();ctx.strokeStyle='#79756a';ctx.lineWidth=2;ctx.stroke();
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(topX+topW*i/4,topY);ctx.lineTo(bottomX+bottomW*i/4,bottomY);ctx.strokeStyle='#343330';ctx.lineWidth=1;ctx.stroke();}
  for(let i=0;i<8;i++){const p=((i/8+(reducedMotion?0:t*.2))%1),y=topY+p*(bottomY-topY),left=topX+(bottomX-topX)*p,width=topW+(bottomW-topW)*p;ctx.fillStyle='#22211d';ctx.fillRect(left,y,width,1);}
  ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillStyle='#e6e0d1';ctx.fillText('RAT ARCADE',20,27);ctx.fillStyle='#8f8a7d';ctx.font='9px monospace';ctx.fillText('RHYTHM DEPT. / 120 BPM',20,43);
  ctx.textAlign='right';ctx.fillStyle='#e6e0d1';ctx.font='bold 16px monospace';ctx.fillText(String(score).padStart(6,'0'),700,27);ctx.fillStyle='#ed6555';ctx.font='10px monospace';ctx.fillText(`COMBO ${String(combo).padStart(3,'0')}  /  ×${Math.min(4,1+Math.floor(combo/10))}`,700,45);
  const targetP=(targetY-topY)/(bottomY-topY),targetLeft=topX+(bottomX-topX)*targetP,targetWidth=topW+(bottomW-topW)*targetP;
  ctx.fillStyle='#a7a18d';ctx.fillRect(targetLeft-8,targetY,targetWidth+16,2);
  for(let lane=0;lane<4;lane++){
    const x=targetLeft+targetWidth*(lane+.5)/4,active=pressedLanes.has(lane)||t-laneFlashes[lane]<.10;
    ctx.beginPath();ctx.ellipse(x,targetY,31,12,0,0,Math.PI*2);ctx.fillStyle=active?laneColors[lane]:'#161616';ctx.fill();ctx.strokeStyle=laneColors[lane];ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle=laneColors[lane];ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillText(['A','S','K','L'][lane],x,targetY+40);
  }
  for(const note of notes){if(note.state!=='pending')continue;const ahead=note.time-t;if(ahead>travelTime||ahead<-.2)continue;const progress=1-ahead/travelTime,y=topY+progress*(targetY-topY),p=(y-topY)/(bottomY-topY),left=topX+(bottomX-topX)*p,width=topW+(bottomW-topW)*p,x=left+width*(note.lane+.5)/4,r=13+13*Math.max(0,progress);
    ctx.fillStyle='#0008';ctx.fillRect(x-r,y+4,r*2,8);ctx.beginPath();ctx.ellipse(x,y,r,6+4*progress,0,0,Math.PI*2);ctx.fillStyle=laneColors[note.lane];ctx.fill();ctx.strokeStyle='#ffffff70';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ffffff88';ctx.fillRect(x-r/2,y-3,r,2);
  }
  if(gameState==='running'){
    ctx.textAlign='center';if(t<2){ctx.fillStyle='#efe8d9';ctx.font='bold 55px monospace';ctx.fillText(String(Math.max(1,4-Math.floor(t/.5))),360,193);ctx.font='11px monospace';ctx.fillText('COUNT IT IN.',360,222);}
    else if(t-judgementAt<.55){ctx.fillStyle=judgement==='MISSED.'||judgement==='TOO EAGER.'?'#f15f63':'#e6e0d1';ctx.font='bold 18px monospace';ctx.fillText(judgement,360,112);}
    ctx.fillStyle='#ed6555';ctx.fillRect(0,437,Math.min(t/songLength,1)*720,3);
  }else{
    ctx.fillStyle='#111111ed';ctx.fillRect(85,106,550,177);ctx.strokeStyle='#a7a18d';ctx.lineWidth=1;ctx.strokeRect(85,106,550,177);ctx.textAlign='center';ctx.fillStyle='#ef5143';ctx.font='bold 39px monospace';
    ctx.fillText(gameState==='finished'?'ENCORE?':gameState==='paused'?'HOLD THAT NOTE.':gameState==='loading'?'PLUGGING IN…':'MAKE SOME NOISE.',360,154);
    ctx.fillStyle='#ded7c6';ctx.font='11px monospace';ctx.fillText(gameState==='finished'?`SCORE ${score}  /  ${Math.round(hits/chart.length*100)}% HIT  /  COMBO ${maxCombo}`:gameState==='paused'?'SAME SONG. RIGHT WHERE YOU LEFT IT.':'FOUR LANES. TWO HANDS. ZERO EXCUSES.',360,191);
    ctx.fillStyle='#aaa498';ctx.font='10px monospace';ctx.fillText(gameState==='finished'?'YOUR HIGH SCORE STAYS ON THIS COMPUTER.':gameState==='paused'?'PRESS RESUME OR ESC TO COME BACK IN.':'A / S / K / L  —  OR TAP THE COLORED FRETS',360,220);
    ctx.font='8px monospace';ctx.fillText('ORIGINAL PRACTICE RIFF / NOT A RUNNER’S HIGH RECORDING',360,254);
  }
}
$('#game-start').addEventListener('click',startGame);
$('#game-pause').addEventListener('click',()=>gameState==='paused'?resumeGame():pauseGame());
$$('[data-lane]').forEach(button=>{const lane=Number(button.dataset.lane);button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);hitLane(lane);});button.addEventListener('pointerup',()=>releaseLane(lane));button.addEventListener('pointercancel',()=>releaseLane(lane));});
document.addEventListener('keydown',e=>{
  if($('#game').hidden||!$('#game').classList.contains('active')||e.target.matches('input,textarea'))return;
  const lane=laneKeys.indexOf(e.code);if(lane>=0){e.preventDefault();if(!e.repeat)hitLane(lane);}
  if(e.code==='Escape'){e.preventDefault();gameState==='paused'?resumeGame():pauseGame();}
});
document.addEventListener('keyup',e=>{const lane=laneKeys.indexOf(e.code);if(lane>=0)releaseLane(lane);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('blur',pauseGame);
$('#game-offset').value=storage.get('rh-timing','0');$('#game-offset').addEventListener('change',()=>{const v=Math.max(-200,Math.min(200,Number($('#game-offset').value)||0));$('#game-offset').value=v;storage.set('rh-timing',String(v));});
updateBest();drawGame();
