'use strict';
const discoveries=new Set();
function found(item){discoveries.add(item);$('#lost-count').textContent=`${discoveries.size} strange thing${discoveries.size===1?'':'s'} / still here`;}
let glitchTimer;
function glitch(){found('signal');document.body.classList.remove('signal-slip');void document.body.offsetWidth;document.body.classList.add('signal-slip');clearTimeout(glitchTimer);glitchTimer=setTimeout(()=>document.body.classList.remove('signal-slip'),650);}
let paletteIndex=0;
function changeWallpaper(){paletteIndex=(paletteIndex+1)%4;document.body.dataset.wallpaper=String(paletteIndex);storage.set('rh-wallpaper',String(paletteIndex));found('wallpaper');}
document.body.dataset.wallpaper=storage.get('rh-wallpaper','0');
function releaseRats(){
  found('rats');for(let i=0;i<6;i++){const rat=document.createElement('button');rat.className='desktop-rat';rat.textContent='ʕ•ᴥ•ʔ';rat.setAttribute('aria-label','Catch the rat');rat.style.left=(12+Math.random()*73)+'%';rat.style.top=(15+Math.random()*66)+'%';rat.style.setProperty('--rat-speed',(3+Math.random()*5)+'s');rat.style.setProperty('--rat-turn',Math.random()>.5?'1':'-1');rat.addEventListener('click',()=>{rat.remove();found('caught one');});$('#desktop').appendChild(rat);setTimeout(()=>rat.remove(),25000);}
}
$$('[data-effect]').forEach(button=>button.addEventListener('click',()=>{switch(button.dataset.effect){case'glitch':glitch();break;case'palette':changeWallpaper();break;case'rats':releaseRats();break;case'peel':button.classList.toggle('peeled');found('under the tape');if(button.classList.contains('peeled')){openWindow('lost');}break;}}));
$('#found-cassette').addEventListener('click',()=>{openWindow('player');setMusicMode('mixtape');$('#track-list').hidden=false;found('side b');});
$('#lucky-file').addEventListener('click',()=>{const actions=[()=>openWindow('motel'),releaseRats,glitch,changeWallpaper,()=>openWindow('doodle')];actions[Math.floor(Math.random()*actions.length)]();found('nothing');});
// Room 303: a little imaginary room, not a band biography.
let channel=0,phoneCall=0,underPillow=0;
$('#room-lamp').addEventListener('click',()=>{$('#motel-room').classList.toggle('lamp-on');$('#room-message').textContent=$('#motel-room').classList.contains('lamp-on')?'someone left the light on.':'the parking lot glows through the blinds.';found('lamp');});
$('#room-window').addEventListener('click',()=>{$('#motel-room').classList.toggle('rainy');$('#room-message').textContent=$('#motel-room').classList.contains('rainy')?'rain on the windshield. the long way home.':'a red light. a car that never turns.';found('window');});
$('#room-tv').addEventListener('click',()=>{channel=(channel+1)%4;$('#room-tv span').textContent='CH. 0'+(channel+1);$('#room-tv b').textContent=['NO SIGNAL','LATE NIGHT','LIVE / 303','••••••••'][channel];$('#room-tv').dataset.channel=String(channel);if(channel===2)openWindow('game');if(channel===3)glitch();found('television');});
$('#room-bed').addEventListener('click',()=>{const scraps=['a key with no door.','a receipt. someone wrote on the back.','a cassette marked DO NOT ERASE.'];$('#room-message').textContent=scraps[underPillow%3];if(underPillow%3===1)openWindow('notes');if(underPillow%3===2){openWindow('player');setMusicMode('mixtape');}underPillow++;$('#room-bed').classList.toggle('unmade');found('pillow');});
$('#room-phone').addEventListener('click',()=>{const messages=['nothing but the ocean.','three rings. then a song through the wall.','wrong number. right place.','the line is still warm.'];$('#room-message').textContent=messages[phoneCall++%messages.length];found('phone');ringPhone();});
let roomAudio;
function ringPhone(){try{roomAudio??=new(window.AudioContext||window.webkitAudioContext)();roomAudio.resume().catch(()=>{});const now=roomAudio.currentTime;for(const freq of[440,480]){const osc=roomAudio.createOscillator(),gain=roomAudio.createGain();osc.frequency.value=freq;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.025,now+.01);gain.gain.setValueAtTime(.025,now+.14);gain.gain.linearRampToValueAtTime(0,now+.18);osc.connect(gain);gain.connect(roomAudio.destination);osc.start(now);osc.stop(now+.2);osc.onended=()=>{osc.disconnect();gain.disconnect();};}}catch{/* Silence is fine, too. */}}
// The receipt belongs to this browser. Nothing is sent anywhere.
const receipt=$('#receipt-note');receipt.value=storage.get('rh-receipt','');
receipt.addEventListener('input',()=>{storage.set('rh-receipt',receipt.value);$('#receipt-status').textContent='303 / '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});});
const wordPool=['rat','motel','stay','loud','after','hours','no','vacancy','take','the','long','way','home','again','noise','summer','static','904'];
function shuffleWords(){const words=[...wordPool].sort(()=>Math.random()-.5).slice(0,9);$('#receipt-words').replaceChildren(...words.map(word=>{const b=document.createElement('button');b.textContent=word;b.addEventListener('click',()=>{const start=receipt.selectionStart??receipt.value.length,end=receipt.selectionEnd??start;receipt.value=(receipt.value.slice(0,start)+word+' '+receipt.value.slice(end)).slice(0,2000);storage.set('rh-receipt',receipt.value);receipt.focus();receipt.setSelectionRange(Math.min(start+word.length+1,receipt.value.length),Math.min(start+word.length+1,receipt.value.length));b.classList.toggle('used');found('scraps');});return b;}));}
$('#receipt-shuffle').addEventListener('click',shuffleWords);shuffleWords();
// A small paint program: pen, eraser, undo, local restore, PNG export.
const pad=$('#doodle-canvas'),pen=pad.getContext('2d');let ink='#25211d',stroke=null;const undo=[];
function fillPaper(){pen.fillStyle='#e4dfc6';pen.fillRect(0,0,pad.width,pad.height);}
fillPaper();
const savedDrawing=storage.get('rh-drawing','');
let drawingTouched=false;
if(savedDrawing){const saved=new Image();saved.onload=()=>{if(!drawingTouched)pen.drawImage(saved,0,0,pad.width,pad.height);};saved.src=savedDrawing;}
function savePad(){try{storage.set('rh-drawing',pad.toDataURL('image/png'));}catch{}}
function snapshot(){drawingTouched=true;undo.push(pen.getImageData(0,0,pad.width,pad.height));if(undo.length>12)undo.shift();}
function point(e){const r=pad.getBoundingClientRect();return{x:(e.clientX-r.left)*pad.width/r.width,y:(e.clientY-r.top)*pad.height/r.height};}
pad.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();snapshot();pad.setPointerCapture(e.pointerId);stroke={...point(e),id:e.pointerId};pen.fillStyle=ink;pen.beginPath();pen.arc(stroke.x,stroke.y,Number($('#draw-width').value)/2,0,Math.PI*2);pen.fill();found('vandalism');});
pad.addEventListener('pointermove',e=>{if(!stroke||e.pointerId!==stroke.id)return;const p=point(e);pen.strokeStyle=ink;pen.lineWidth=Number($('#draw-width').value);pen.lineCap='round';pen.lineJoin='round';pen.beginPath();pen.moveTo(stroke.x,stroke.y);pen.lineTo(p.x,p.y);pen.stroke();stroke={...p,id:e.pointerId};});
function stopStroke(){if(stroke){stroke=null;savePad();}}
pad.addEventListener('pointerup',stopStroke);pad.addEventListener('pointercancel',stopStroke);
$$('[data-ink]').forEach(button=>button.addEventListener('click',()=>{ink=button.dataset.ink;$$('[data-ink]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
$('#draw-undo').addEventListener('click',()=>{const previous=undo.pop();if(previous){pen.putImageData(previous,0,0);savePad();}});
$('#draw-clear').addEventListener('click',()=>{snapshot();fillPaper();savePad();});
$('#draw-save').addEventListener('click',()=>{const a=document.createElement('a');a.download='room-303.png';a.href=pad.toDataURL('image/png');a.click();found('souvenir');});
let secret='';document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.length!==1)return;secret=(secret+e.key.toLowerCase()).slice(-8);if(secret==='ratmotel'){openWindow('motel');$('#motel-room').classList.add('lamp-on');found('303');secret='';}});
