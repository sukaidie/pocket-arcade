import {toggleLights,selectRecord,sudokuConflict,makeSudoku,rotatePiece,pieceFits,clearLines} from './engine.js';
const $=s=>document.querySelector(s),dialog=$('#game-dialog'),board=$('#board'),status=$('#status'),controls=$('#controls');let game='',timer=null,delay=null,state={};
const names={tetris:'俄罗斯方块',lights:'熄灯挑战',memory:'记忆翻牌',sudoku:'数独'};
const rules={tetris:'移动、旋转方块，填满一行即可消除。消行越多，速度越快。',lights:'点击一盏灯会切换它和上下左右邻灯，试着熄灭全部灯！',memory:'每次翻开两张牌，找出全部 8 对相同图案。',sudoku:'在空格填入 1—9，让每行、每列、每个九宫格都不重复。'};
let player='';
const records=new Map();
function clean(){clearInterval(timer);clearTimeout(delay);timer=null;delay=null}
function record(key,value,lower=false){
  if(!records.has(key)){
    let old=null;
    try{const raw=JSON.parse(localStorage.getItem(key));
      if(typeof raw==='number'&&raw>0)old={value:raw,player:'历史玩家'};
      else if(raw&&Number.isFinite(raw.value)&&raw.value>0&&typeof raw.player==='string')old=raw;
    }catch{}
    records.set(key,old);
  }
  const old=records.get(key),next=selectRecord(old,value,player,lower);
  if(next!==old){records.set(key,next);try{localStorage.setItem(key,JSON.stringify(next))}catch{}}
  return next;
}
function best(key,value){const r=record(key,value);return r?`${r.value}（${r.player}）`:'暂无纪录'}
const playerDialog=$('#player-dialog'),nameInput=$('#player-name');
try{nameInput.value=localStorage.getItem('pocket-player')||''}catch{}
$('#cancel-player').onclick=()=>playerDialog.close();
$('#player-form').onsubmit=e=>{
  e.preventDefault();const name=nameInput.value.trim();
  if(!name){nameInput.setCustomValidity('请输入玩家昵称');nameInput.reportValidity();return}
  player=name;try{localStorage.setItem('pocket-player',player)}catch{}
  playerDialog.close();$('#game-title').textContent=names[game];$('#instructions').textContent=`玩家：${player} · ${rules[game]}`;dialog.showModal();start();
};
nameInput.oninput=()=>nameInput.setCustomValidity('');
function cell(text,cls=''){let el=document.createElement('button');el.className='cell '+cls;el.textContent=text;return el}
function start(){clean();board.replaceChildren();controls.replaceChildren();board.className='';$('#hint').textContent='';if(game==='tetris')startTetris();if(game==='lights')startLights();if(game==='memory')startMemory();if(game==='sudoku')startSudoku()}
for(const b of document.querySelectorAll('[data-game]'))b.onclick=()=>{game=b.dataset.game;playerDialog.showModal();nameInput.focus();nameInput.select()};$('#close').onclick=()=>dialog.close();dialog.addEventListener('close',clean);$('#restart').onclick=start;dialog.addEventListener('click',e=>{if(e.target===dialog){let r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
function startMemory(){state={cards:[...'🌵🍋🍄🌼🍒🦋🍀🌈🌵🍋🍄🌼🍒🦋🍀🌈'],open:[],matched:[],moves:0,locked:false};for(let i=15;i>0;i--){let j=Math.floor(Math.random()*(i+1));[state.cards[i],state.cards[j]]=[state.cards[j],state.cards[i]]}board.className='grid4';drawMemory()}
function drawMemory(){board.replaceChildren();const finished=state.matched.length===16;const r=record('pocket-memory',finished?state.moves:undefined,true);status.textContent=(finished?`🎉 全部配对！用了 ${state.moves} 次`:`翻牌 ${state.moves} 次 · 配对 ${state.matched.length/2}/8`)+` · 最佳 ${r?`${r.value} 次（${r.player}）`:'暂无纪录'}`;$('#hint').textContent='每翻开两张计 1 次；完成全部配对后记录，次数越少越好。';state.cards.forEach((v,i)=>{const match=state.matched.includes(i),open=state.open.includes(i);let el=cell(match||open?v:'?',match?'matched':open?'':'card-back');el.setAttribute('aria-label',match||open?v:`第 ${i+1} 张，未翻开`);el.disabled=match||open||state.locked;el.onclick=()=>{state.open.push(i);if(state.open.length===2){state.moves++;state.locked=true;const [a,b]=state.open;if(state.cards[a]===state.cards[b]){state.matched.push(a,b);state.open=[];state.locked=false}else delay=setTimeout(()=>{state.open=[];state.locked=false;drawMemory()},750)}drawMemory()};board.append(el)})}
function startLights(){
  let b=Array(16).fill(false);
  // Build each puzzle by valid moves from the solved board, guaranteeing a solution.
  do {b=Array(16).fill(false);for(let i=0;i<10;i++)b=toggleLights(b,Math.floor(Math.random()*16))}while(!b.some(Boolean));
  state={b,moves:0};board.className='grid4';drawLights();
}
function drawLights(){
  const won=!state.b.some(Boolean),r=record('pocket-lights',won?state.moves:undefined,true);
  status.textContent=`${won?'🎉 全部熄灭！':'挑战中'} · ${state.moves} 步 · 最佳 ${r?`${r.value} 步（${r.player}）`:'暂无纪录'}`;
  $('#hint').textContent='全部熄灭后记录成绩，步数越少越好。每局灯阵随机生成。';
  board.replaceChildren();state.b.forEach((on,i)=>{let el=cell(on?'☀':'·','light-cell '+(on?'lit':''));el.setAttribute('aria-label',`第 ${i+1} 盏灯，${on?'亮':'灭'}`);el.setAttribute('aria-pressed',String(on));el.disabled=won;el.onclick=()=>{state.b=toggleLights(state.b,i);state.moves++;drawLights()};board.append(el)});
}
function formatTime(seconds){return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
function startSudoku(){const given=makeSudoku();state={given,b:given.slice(),selected:given.indexOf(0),notes:Array.from({length:81},()=>new Set()),noteMode:false,start:Date.now(),won:false,seconds:0};board.className='sudoku-grid';for(let n=1;n<=9;n++)control(String(n),()=>enterSudoku(n));control('擦除',()=>enterSudoku(0));control('笔记',()=>{state.noteMode=!state.noteMode;drawSudoku()});drawSudoku();timer=setInterval(updateSudokuStatus,1000);$('#hint').textContent='选中格子后填数字；红色表示行、列或宫内重复。笔记不计作答案。通关用时越短越好。'}
function updateSudokuStatus(){if(!state.won)state.seconds=Math.floor((Date.now()-state.start)/1000);const r=record('pocket-sudoku',state.won?Math.max(1,state.seconds):undefined,true);status.textContent=`${state.won?'🎉 完成！':'用时'} ${formatTime(state.seconds)} · 最快 ${r?`${formatTime(r.value)}（${r.player}）`:'暂无纪录'}${state.noteMode?' · 笔记模式':''}`}
function drawSudoku(){board.replaceChildren();state.b.forEach((v,i)=>{const fixed=!!state.given[i],el=cell(v||[...state.notes[i]].sort().join(' '),'sudoku-cell');el.classList.toggle('given',fixed);el.classList.toggle('selected',i===state.selected);el.classList.toggle('conflict',sudokuConflict(state.b,i));el.classList.toggle('notes',!v);if(i%9===2||i%9===5)el.classList.add('box-right');if(Math.floor(i/9)===2||Math.floor(i/9)===5)el.classList.add('box-bottom');el.setAttribute('aria-label',`第 ${Math.floor(i/9)+1} 行第 ${i%9+1} 列，${v||'空'}${fixed?'，题目数字':''}`);el.setAttribute('aria-pressed',String(i===state.selected));el.onclick=()=>{state.selected=i;drawSudoku()};board.append(el)});updateSudokuStatus()}
function enterSudoku(n){let i=state.selected;if(state.won||i<0||state.given[i])return;if(state.noteMode&&n){if(state.b[i])return;state.notes[i].has(n)?state.notes[i].delete(n):state.notes[i].add(n)}else{state.b[i]=n;state.notes[i].clear()}if(state.b.every(Boolean)&&!state.b.some((_,i)=>sudokuConflict(state.b,i))){state.seconds=Math.floor((Date.now()-state.start)/1000);state.won=true;clearInterval(timer)}drawSudoku()}
function control(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;controls.append(b);return b}
const pieces=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
const pieceColors=['','#82c6d3','#e9ce7c','#ba9ed3','#a7c784','#e59a8b','#8caadd','#edb47b'];
function takePiece(){if(!state.bag.length){state.bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){let j=Math.floor(Math.random()*(i+1));[state.bag[i],state.bag[j]]=[state.bag[j],state.bag[i]]}}return state.bag.pop()}
function spawnTetris(){state.type=state.next;state.next=takePiece();state.piece=pieces[state.type].map(r=>r.slice());state.x=Math.floor((10-state.piece[0].length)/2);state.y=0;if(!pieceFits(state.field,state.piece,state.x,state.y)){state.over=true;clearInterval(timer)}}
function startTetris(){state={field:Array.from({length:20},()=>Array(10).fill(0)),bag:[],score:0,lines:0,started:false,paused:false,over:false,last:Date.now()};state.next=takePiece();spawnTetris();board.className='tetris-board';const canvas=document.createElement('canvas');canvas.width=240;canvas.height=480;canvas.setAttribute('aria-label','俄罗斯方块棋盘');board.append(canvas);control('开始',()=>{if(state.over)return;if(!state.started){state.started=true;state.last=Date.now();timer=setInterval(()=>{if(!state.paused&&Date.now()-state.last>=Math.max(100,800-Math.floor(state.lines/10)*80)){dropTetris();state.last=Date.now()}},40)}else{state.paused=!state.paused;state.last=Date.now()}drawTetris()});for(const [label,action] of [['←','left'],['↻','rotate'],['→','right'],['↓','down'],['落到底','hard']])control(label,()=>actTetris(action));drawTetris();$('#hint').textContent='← → 移动 · ↑ 旋转 · ↓ 加速 · 空格落到底 · P 暂停；手机可用下方按钮。'}
function lockTetris(){state.piece.forEach((row,dy)=>row.forEach((v,dx)=>{if(v)state.field[state.y+dy][state.x+dx]=state.type+1}));const result=clearLines(state.field);state.field=result.field;state.score+=[0,100,300,500,800][result.lines]*(Math.floor(state.lines/10)+1);state.lines+=result.lines;spawnTetris()}
function dropTetris(){if(state.over||state.paused||!state.started)return;if(pieceFits(state.field,state.piece,state.x,state.y+1))state.y++;else lockTetris();drawTetris()}
function actTetris(action){if(!state.started||state.over||state.paused)return;if(action==='left'||action==='right'){const x=state.x+(action==='left'?-1:1);if(pieceFits(state.field,state.piece,x,state.y))state.x=x}else if(action==='rotate'){const m=rotatePiece(state.piece);for(const dx of [0,-1,1,-2,2])if(pieceFits(state.field,m,state.x+dx,state.y)){state.piece=m;state.x+=dx;break}}else if(action==='down'){if(pieceFits(state.field,state.piece,state.x,state.y+1))state.score++;dropTetris()}else if(action==='hard'){while(pieceFits(state.field,state.piece,state.x,state.y+1)){state.y++;state.score+=2}lockTetris();state.last=Date.now()}drawTetris()}
function drawTetris(){const c=board.querySelector('canvas').getContext('2d');c.fillStyle='#202c25';c.fillRect(0,0,240,480);function block(x,y,color){c.fillStyle=color;c.fillRect(x*24+1,y*24+1,22,22)}state.field.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(x,y,pieceColors[v])}));if(!state.over){let ghost=state.y;while(pieceFits(state.field,state.piece,state.x,ghost+1))ghost++;state.piece.forEach((row,dy)=>row.forEach((v,dx)=>{if(v){block(state.x+dx,ghost+dy,'#53604e');block(state.x+dx,state.y+dy,pieceColors[state.type+1])}}))}if(!state.started||state.paused||state.over){c.fillStyle='#132319bb';c.fillRect(0,190,240,80);c.fillStyle='#fff';c.textAlign='center';c.font='20px sans-serif';c.fillText(state.over?'本局结束':state.paused?'已暂停':'点击开始',120,235)}status.textContent=`得分 ${state.score} · 消行 ${state.lines} · 最高 ${best('pocket-tetris',state.score)}`;const nextNames=['长条 I','方块 O','T 形','S 形','Z 形','J 形','L 形'];$('#hint').textContent=`下一个：${nextNames[state.next]}。← → 移动 · ↑ 旋转 · ↓ 加速 · 空格落到底 · P 暂停。`;controls.firstChild.textContent=!state.started?'开始':state.paused?'继续':'暂停';controls.firstChild.disabled=state.over}
window.addEventListener('keydown',e=>{if(!dialog.open||e.target.tagName==='INPUT')return;if(game==='sudoku'){if(/^[1-9]$/.test(e.key)){e.preventDefault();enterSudoku(Number(e.key))}else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();enterSudoku(0)}else{const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9};if(offsets[e.key]){e.preventDefault();state.selected=Math.max(0,Math.min(80,state.selected+offsets[e.key]));drawSudoku()}}}if(game==='tetris'){const action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'down',' ':'hard'}[e.key];if(action){e.preventDefault();if(!e.repeat||!['hard','rotate'].includes(action))actTetris(action)}if(e.key.toLowerCase()==='p'&&!e.repeat){e.preventDefault();controls.firstChild.click()}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open&&game==='tetris'&&state.started&&!state.over){state.paused=true;drawTetris()}});
