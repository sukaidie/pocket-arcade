import {toggleLights,selectRecord,sudokuConflict,makeSudoku,createMines,revealMines,gomokuWin,gomokuMove,makeDeck,handValue,blackjackResult} from './engine.js';
const $=s=>document.querySelector(s),dialog=$('#game-dialog'),board=$('#board'),status=$('#status'),controls=$('#controls');let game='',timer=null,delay=null,state={};
const names={mines:'扫雷',gomoku:'五子棋',blackjack:'21点',lights:'熄灯挑战',memory:'记忆翻牌',sudoku:'数独'};
const rules={mines:'9×9 棋盘藏着 10 颗雷。数字表示周围雷数；首次开格及周围安全。',gomoku:'你执黑先手，与电脑对战。横、竖或斜线连成五子即获胜（自由规则，无禁手）。',blackjack:'与庄家比点数，尽量接近 21 点；超过 21 点即爆牌。A 自动计作 1 或 11，J/Q/K 计 10。',lights:'点击一盏灯会切换它和上下左右邻灯，试着熄灭全部灯！',memory:'每次翻开两张牌，找出全部 8 对相同图案。',sudoku:'在空格填入 1—9，让每行、每列、每个九宫格都不重复。'};
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
const playerDialog=$('#player-dialog'),nameInput=$('#player-name');
// Mobile keyboards can shrink or pan the visual viewport without changing layout height.
function fitPlayerDialog(){
  if(!playerDialog.open)return;
  const viewport=window.visualViewport;
  const height=viewport?viewport.height:window.innerHeight;
  const gap=Math.min(32,Math.max(8,height*.04));
  playerDialog.style.setProperty('--player-top',`${(viewport?.offsetTop||0)+gap}px`);
  playerDialog.style.setProperty('--player-height',`${Math.max(0,height-gap*2)}px`);
}
window.visualViewport?.addEventListener('resize',fitPlayerDialog);
window.visualViewport?.addEventListener('scroll',fitPlayerDialog);
window.addEventListener('resize',fitPlayerDialog);
nameInput.addEventListener('focus',fitPlayerDialog);

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
function start(){clean();board.replaceChildren();controls.replaceChildren();board.className='';$('#hint').textContent='';if(game==='mines')startMines();if(game==='gomoku')startGomoku();if(game==='blackjack')startBlackjack();if(game==='lights')startLights();if(game==='memory')startMemory();if(game==='sudoku')startSudoku()}
for(const b of document.querySelectorAll('[data-game]'))b.onclick=()=>{game=b.dataset.game;playerDialog.showModal();fitPlayerDialog();$('#player-title').focus({preventScroll:true})};$('#close').onclick=()=>dialog.close();dialog.addEventListener('close',clean);$('#restart').onclick=start;dialog.addEventListener('click',e=>{if(e.target===dialog){let r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
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
function startSudoku(){const given=makeSudoku();state={given,b:given.slice(),selected:given.indexOf(0),notes:Array.from({length:81},()=>new Set()),noteMode:false,start:Date.now(),won:false,seconds:0};board.className='sudoku-grid';for(let n=1;n<=9;n++)control(String(n),()=>enterSudoku(n));control('擦除',()=>enterSudoku(0));control('笔记',()=>{state.noteMode=!state.noteMode;drawSudoku()});drawSudoku();timer=setInterval(updateSudokuStatus,1000);$('#hint').textContent='点击数字会高亮所有相同数字；选中空格后填数字。红色表示重复。笔记不计作答案。通关用时越短越好。'}
function updateSudokuStatus(){if(!state.won)state.seconds=Math.floor((Date.now()-state.start)/1000);const r=record('pocket-sudoku',state.won?Math.max(1,state.seconds):undefined,true);status.textContent=`${state.won?'🎉 完成！':'用时'} ${formatTime(state.seconds)} · 最快 ${r?`${formatTime(r.value)}（${r.player}）`:'暂无纪录'}${state.noteMode?' · 笔记模式':''}`}
function drawSudoku(){board.replaceChildren();state.b.forEach((v,i)=>{const fixed=!!state.given[i],el=cell(v||[...state.notes[i]].sort().join(' '),'sudoku-cell');el.classList.toggle('given',fixed);el.classList.toggle('selected',i===state.selected);el.classList.toggle('same-number',!!v&&v===state.b[state.selected]);el.classList.toggle('conflict',sudokuConflict(state.b,i));el.classList.toggle('notes',!v);if(i%9===2||i%9===5)el.classList.add('box-right');if(Math.floor(i/9)===2||Math.floor(i/9)===5)el.classList.add('box-bottom');el.setAttribute('aria-label',`第 ${Math.floor(i/9)+1} 行第 ${i%9+1} 列，${v||'空'}${fixed?'，题目数字':''}`);el.setAttribute('aria-pressed',String(i===state.selected));el.onclick=()=>{state.selected=i;drawSudoku()};board.append(el)});updateSudokuStatus()}
function enterSudoku(n){let i=state.selected;if(state.won||i<0||state.given[i])return;if(state.noteMode&&n){if(state.b[i])return;state.notes[i].has(n)?state.notes[i].delete(n):state.notes[i].add(n)}else{state.b[i]=n;state.notes[i].clear()}if(state.b.every(Boolean)&&!state.b.some((_,i)=>sudokuConflict(state.b,i))){state.seconds=Math.floor((Date.now()-state.start)/1000);state.won=true;clearInterval(timer)}drawSudoku()}
function control(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;controls.append(b);return b}
window.addEventListener('keydown',e=>{if(!dialog.open||e.target.tagName==='INPUT'||game!=='sudoku')return;if(/^[1-9]$/.test(e.key)){e.preventDefault();enterSudoku(Number(e.key))}else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();enterSudoku(0)}else{const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9};if(offsets[e.key]){e.preventDefault();state.selected=Math.max(0,Math.min(80,state.selected+offsets[e.key]));drawSudoku()}}});
function startMines(){state={field:null,open:new Set(),flags:new Set(),flagMode:false,over:false,won:false,seconds:0,start:0};board.className='mines-grid';control('🚩 插旗模式：关',()=>{state.flagMode=!state.flagMode;controls.firstChild.textContent=`🚩 插旗模式：${state.flagMode?'开':'关'}`;drawMines()});$('#hint').textContent='点击开格；右键插旗。手机先切换插旗模式再点击。标旗不是通关条件，打开全部安全格即可。';drawMines()}
function updateMinesStatus(){if(state.start&&!state.over)state.seconds=Math.floor((Date.now()-state.start)/1000);const r=record('pocket-mines',state.won?Math.max(1,state.seconds):undefined,true);status.textContent=`${state.won?'🎉 排雷成功':state.over?'💥 踩到雷了':'剩余雷 '+(10-state.flags.size)} · ${formatTime(state.seconds)} · 最快 ${r?`${formatTime(r.value)}（${r.player}）`:'暂无纪录'}`}
function mineClick(i,flag=false){if(state.over||state.open.has(i))return;if(flag||state.flagMode){if(state.flags.has(i))state.flags.delete(i);else if(state.flags.size<10)state.flags.add(i);drawMines();return}if(state.flags.has(i))return;if(!state.field){state.field=createMines(i);state.start=Date.now();timer=setInterval(updateMinesStatus,1000)}state.open=revealMines(state.field,state.open,state.flags,i);if(state.field[i]===-1)state.over=true;else if(state.open.size===71){state.over=true;state.won=true}if(state.over){state.seconds=Math.floor((Date.now()-state.start)/1000);clearInterval(timer)}drawMines()}
function drawMines(){board.replaceChildren();for(let i=0;i<81;i++){const v=state.field?.[i],open=state.open.has(i),showMine=state.over&&v===-1;const el=cell(showMine?'💣':state.flags.has(i)?'🚩':open?(v||''):'','mine-cell');el.classList.toggle('revealed',open);el.classList.toggle('exploded',open&&v===-1);el.dataset.number=v;el.setAttribute('aria-label',`第 ${Math.floor(i/9)+1} 行第 ${i%9+1} 列，${showMine?'雷':state.flags.has(i)?'旗帜':open?`${v} 颗邻雷`:'未打开'}`);el.disabled=state.over||open;el.onclick=()=>mineClick(i);el.oncontextmenu=e=>{e.preventDefault();mineClick(i,true)};board.append(el)}updateMinesStatus()}
function startGomoku(){state={b:Array(225).fill(0),busy:false,over:false,last:-1,moves:0,result:'',history:[]};board.className='gomoku-grid';drawGomoku();$('#hint').textContent='你执黑，电脑执白；黑点标记上一步落子。黑棋获胜时记录最少落子次数。悔棋会撤回最近一轮双方落子，可连续使用。'}
function checkGomoku(i){if(gomokuWin(state.b,i)){state.over=true;state.result=state.b[i]===1?'🎉 你赢了！':'电脑获胜，再来一局？'}else if(state.b.every(Boolean)){state.over=true;state.result='棋盘已满，平局！'}}
function undoGomoku(){if(!state.history.length)return;clearTimeout(delay);delay=null;const previous=state.history.pop();state.b=previous.b;state.last=previous.last;state.moves=previous.moves;state.busy=false;state.over=false;state.result='';drawGomoku()}
function drawGomoku(){controls.replaceChildren();const undo=control('悔棋 ↶',undoGomoku);undo.disabled=!state.history.length;const r=record('pocket-gomoku',state.result==='🎉 你赢了！'?state.moves:undefined,true);status.textContent=`${state.over?state.result:state.busy?'电脑思考中…':'轮到你了 · 黑棋'} · 最佳 ${r?`${r.value} 手（${r.player}）`:'暂无纪录'}`;board.replaceChildren();state.b.forEach((v,i)=>{const el=cell('','gomoku-cell');if(v){const stone=document.createElement('span');stone.className='stone '+(v===1?'black':'white')+(state.last===i?' last':'');el.append(stone)}el.setAttribute('aria-label',`第 ${Math.floor(i/15)+1} 行第 ${i%15+1} 列，${v===1?'黑棋':v===2?'白棋':'空'}`);el.disabled=!!v||state.busy||state.over;el.onclick=()=>{if(state.busy||state.over||state.b[i])return;state.history.push({b:state.b.slice(),last:state.last,moves:state.moves});state.b[i]=1;state.moves++;state.last=i;checkGomoku(i);state.busy=!state.over;drawGomoku();if(state.over)return;delay=setTimeout(()=>{const move=gomokuMove(state.b);state.b[move]=2;state.last=move;state.busy=false;checkGomoku(move);drawGomoku()},250)};board.append(el)})}
function startBlackjack(){state={streak:0};dealBlackjack()}
function dealBlackjack(){const streak=state.streak;state={streak,deck:makeDeck(),hand:[],dealer:[],over:false,result:''};for(let i=0;i<2;i++){state.hand.push(state.deck.pop());state.dealer.push(state.deck.pop())}board.className='blackjack-table';if(handValue(state.hand)===21||handValue(state.dealer)===21)finishBlackjack();else drawBlackjack()}
function finishBlackjack(){if(state.over)return;state.over=true;state.result=blackjackResult(state.hand,state.dealer);if(state.result==='win')state.streak++;else if(state.result==='lose')state.streak=0;drawBlackjack()}
function hitBlackjack(){if(state.over)return;state.hand.push(state.deck.pop());const value=handValue(state.hand);if(value>21)finishBlackjack();else if(value===21)standBlackjack();else drawBlackjack()}
function standBlackjack(){if(state.over)return;while(handValue(state.dealer)<17)state.dealer.push(state.deck.pop());finishBlackjack()}
function drawBlackjack(){board.replaceChildren();controls.replaceChildren();function handSection(title,hand,hidden){const section=document.createElement('section'),heading=document.createElement('h3');heading.textContent=title+' · '+(hidden?`明牌 ${handValue([hand[0]])} 点`:`${handValue(hand)} 点`);section.append(heading);const cards=document.createElement('div');cards.className='playing-hand';hand.forEach((c,i)=>{const card=document.createElement('div');card.className='playing-card';if(hidden&&i===1){card.classList.add('card-hidden');card.textContent='✳';card.setAttribute('aria-label','庄家暗牌')}else{if(c.suit==='♥'||c.suit==='♦')card.classList.add('red-suit');const rank=c.rank===1?'A':c.rank===11?'J':c.rank===12?'Q':c.rank===13?'K':String(c.rank);const corner=document.createElement('span');corner.textContent=rank;const suit=document.createElement('strong');suit.textContent=c.suit;card.append(corner,suit);card.setAttribute('aria-label',`${c.suit} ${rank}`)}cards.append(card)});section.append(cards);board.append(section)}handSection('庄家',state.dealer,!state.over);handSection(player,state.hand,false);
const r=record('pocket-blackjack',state.streak);const message=state.over?state.result==='win'?(state.hand.length===2&&handValue(state.hand)===21?'🎉 天生 21 点！你赢了':'🎉 你赢了！'):state.result==='draw'?'平局，连胜保留':handValue(state.hand)>21?'爆牌了，本局庄家获胜':'庄家获胜，再试一局？':'轮到你了：要牌还是停牌？';status.textContent=`${message} · 连胜 ${state.streak} · 最佳 ${r?`${r.value} 连胜（${r.player}）`:'暂无纪录'}`;const hit=control('要牌 ＋',hitBlackjack),stand=control('停牌 ✓',standBlackjack);hit.disabled=stand.disabled=state.over;const next=control('下一局 →',dealBlackjack);next.disabled=!state.over;$('#hint').textContent='庄家不足 17 点必须要牌，达到 17 点停牌（含软 17）。两张牌的天生 21 点优先于普通 21 点。胜局累计连胜，平局保留，败局归零；重新开始重置本轮连胜。'}
