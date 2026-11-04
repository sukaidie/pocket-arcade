import {toggleLights,selectRecord,sudokuConflict,makeSudoku,createMines,revealMines,gomokuWin,gomokuMove,makeDeck,handValue,blackjackResult} from './engine.js';
const $=s=>document.querySelector(s),dialog=$('#game-dialog'),board=$('#board'),status=$('#status'),controls=$('#controls');let game='',timer=null,delay=null,state={};
const names={mines:'扫雷',gomoku:'五子棋',blackjack:'21点',lights:'熄灯挑战',memory:'记忆翻牌',sudoku:'数独'};
const rules={mines:'9×9 棋盘藏着 10 颗雷。数字表示周围雷数；首次开格及周围安全。',gomoku:'你执黑先手，与电脑对战。横、竖或斜线连成五子即获胜（自由规则，无禁手）。',blackjack:'与庄家比点数，尽量接近 21 点；超过 21 点即爆牌。A 自动计作 1 或 11，J/Q/K 计 10。',lights:'点击一盏灯会切换它和上下左右邻灯，试着熄灭全部灯！',memory:'每次翻开两张牌，找出全部 8 对相同图案。',sudoku:'在空格填入 1—9，让每行、每列、每个九宫格都不重复。'};
let player='';
let onlineSession=null;
const records=new Map();
function clean(){$('#restart').disabled=false;closeOnlineGomoku();clearGomokuEffects();clearInterval(timer);clearTimeout(delay);timer=null;delay=null}
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
function start(){$('#restart').disabled=false;clean();board.replaceChildren();controls.replaceChildren();board.className='';$('#hint').textContent='';if(game==='mines')startMines();if(game==='gomoku')startGomoku();if(game==='blackjack')startBlackjack();if(game==='lights')startLights();if(game==='memory')startMemory();if(game==='sudoku')startSudoku()}
for(const b of document.querySelectorAll('[data-game]'))b.onclick=()=>{game=b.dataset.game;playerDialog.showModal();fitPlayerDialog();$('#player-title').focus({preventScroll:true})};$('#close').onclick=()=>dialog.close();dialog.addEventListener('close',clean);$('#restart').onclick=()=>{if(game==='gomoku'&&onlineSession)requestOnlineAction('rematch');else start()};dialog.addEventListener('click',e=>{if(e.target===dialog){let r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
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
function startGomoku(){$('#instructions').textContent=`玩家：${player} · ${rules.gomoku}`;state={b:Array(225).fill(0),busy:false,over:false,last:-1,moves:0,result:'',history:[]};board.className='gomoku-grid';drawGomoku();$('#hint').textContent='你执黑，电脑执白；黑点标记上一步落子。黑棋获胜时记录最少落子次数。悔棋会撤回最近一轮双方落子，可连续使用。'}
function checkGomoku(i){if(gomokuWin(state.b,i)){state.over=true;state.result=state.b[i]===1?'🎉 你赢了！':'电脑获胜，再来一局？'}else if(state.b.every(Boolean)){state.over=true;state.result='棋盘已满，平局！'}}
function undoGomoku(){if(!state.history.length)return;clearTimeout(delay);delay=null;const previous=state.history.pop();state.b=previous.b;state.last=previous.last;state.moves=previous.moves;state.busy=false;state.over=false;state.result='';clearGomokuEffects();drawGomoku()}
function drawGomoku(){const online=state.mode==='online';const winning=gomokuWinningCells();drawGomokuEffects(winning);controls.replaceChildren();const undo=control('悔棋 ↶',online?()=>requestOnlineAction('undo'):undoGomoku);undo.disabled=online?(!onlineSession?.ready||!!onlineSession?.pending||!onlineSession?.moves.some(m=>m.color===onlineSession.color)):!state.history.length;if(!online)control('联机对战 ⇄',setupOnlineGomoku);const r=record('pocket-gomoku',!online&&state.result==='🎉 你赢了！'?state.moves:undefined,true);status.textContent=`${state.over?state.result:state.busy?'电脑思考中…':'轮到你了 · 黑棋'} · 最佳 ${r?`${r.value} 手（${r.player}）`:'暂无纪录'}`;if(online){renderOnlineControls();status.textContent=onlineStatus()}board.replaceChildren();state.b.forEach((v,i)=>{const el=cell('','gomoku-cell');if(v){const stone=document.createElement('span');stone.className='stone '+(v===1?'black':'white')+(state.last===i?' last':'')+(winning.includes(i)?' winning-stone':'');el.append(stone)}el.setAttribute('aria-label',`第 ${Math.floor(i/15)+1} 行第 ${i%15+1} 列，${v===1?'黑棋':v===2?'白棋':'空'}`);el.disabled=!!v||state.busy||state.over||(online&&(!onlineSession?.ready||!!onlineSession?.pending||state.turn!==onlineSession.color));el.onclick=()=>{if(online){playOnlineMove(i);return}if(state.busy||state.over||state.b[i])return;state.history.push({b:state.b.slice(),last:state.last,moves:state.moves});state.b[i]=1;state.moves++;state.last=i;checkGomoku(i);state.busy=!state.over;drawGomoku();if(state.over)return;delay=setTimeout(()=>{const move=gomokuMove(state.b);state.b[move]=2;state.last=move;state.busy=false;checkGomoku(move);drawGomoku()},250)};board.append(el)})}
function startBlackjack(){state={streak:0};dealBlackjack()}
function dealBlackjack(){const streak=state.streak;state={streak,deck:makeDeck(),hand:[],dealer:[],over:false,result:''};for(let i=0;i<2;i++){state.hand.push(state.deck.pop());state.dealer.push(state.deck.pop())}board.className='blackjack-table';if(handValue(state.hand)===21||handValue(state.dealer)===21)finishBlackjack();else drawBlackjack()}
function finishBlackjack(){if(state.over)return;state.over=true;state.result=blackjackResult(state.hand,state.dealer);if(state.result==='win')state.streak++;else if(state.result==='lose')state.streak=0;drawBlackjack()}
function hitBlackjack(){if(state.over)return;state.hand.push(state.deck.pop());const value=handValue(state.hand);if(value>21)finishBlackjack();else if(value===21)standBlackjack();else drawBlackjack()}
function standBlackjack(){if(state.over)return;while(handValue(state.dealer)<17)state.dealer.push(state.deck.pop());finishBlackjack()}
function drawBlackjack(){board.replaceChildren();controls.replaceChildren();function handSection(title,hand,hidden){const section=document.createElement('section'),heading=document.createElement('h3');heading.textContent=title+' · '+(hidden?`明牌 ${handValue([hand[0]])} 点`:`${handValue(hand)} 点`);section.append(heading);const cards=document.createElement('div');cards.className='playing-hand';hand.forEach((c,i)=>{const card=document.createElement('div');card.className='playing-card';if(hidden&&i===1){card.classList.add('card-hidden');card.textContent='✳';card.setAttribute('aria-label','庄家暗牌')}else{if(c.suit==='♥'||c.suit==='♦')card.classList.add('red-suit');const rank=c.rank===1?'A':c.rank===11?'J':c.rank===12?'Q':c.rank===13?'K':String(c.rank);const corner=document.createElement('span');corner.textContent=rank;const suit=document.createElement('strong');suit.textContent=c.suit;card.append(corner,suit);card.setAttribute('aria-label',`${c.suit} ${rank}`)}cards.append(card)});section.append(cards);board.append(section)}handSection('庄家',state.dealer,!state.over);handSection(player,state.hand,false);
const r=record('pocket-blackjack',state.streak);const message=state.over?state.result==='win'?(state.hand.length===2&&handValue(state.hand)===21?'🎉 天生 21 点！你赢了':'🎉 你赢了！'):state.result==='draw'?'平局，连胜保留':handValue(state.hand)>21?'爆牌了，本局庄家获胜':'庄家获胜，再试一局？':'轮到你了：要牌还是停牌？';status.textContent=`${message} · 连胜 ${state.streak} · 最佳 ${r?`${r.value} 连胜（${r.player}）`:'暂无纪录'}`;const hit=control('要牌 ＋',hitBlackjack),stand=control('停牌 ✓',standBlackjack);hit.disabled=stand.disabled=state.over;const next=control('下一局 →',dealBlackjack);next.disabled=!state.over;$('#hint').textContent='庄家不足 17 点必须要牌，达到 17 点停牌（含软 17）。两张牌的天生 21 点优先于普通 21 点。胜局累计连胜，平局保留，败局归零；重新开始重置本轮连胜。'}

function clearGomokuEffects(){
  $('#win-effects').replaceChildren();
  board.classList.toggle('gomoku-victory',false);
}
function gomokuWinningCells(){
  if(!state.over||state.last<0||!gomokuWin(state.b,state.last))return [];
  const x=state.last%15,y=Math.floor(state.last/15),who=state.b[state.last];
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
    const line=[state.last];
    for(const sign of [-1,1])for(let n=1;n<15;n++){
      const xx=x+dx*n*sign,yy=y+dy*n*sign;
      if(xx<0||xx>=15||yy<0||yy>=15||state.b[yy*15+xx]!==who)break;
      line.push(yy*15+xx);
    }
    if(line.length>=5)return line;
  }
  return [];
}
function drawGomokuEffects(winning){
  clearGomokuEffects();
  if(!winning.length||(state.b[state.last]!==1&&state.mode!=='online'))return;
  board.classList.toggle('gomoku-victory',true);
  const effects=$('#win-effects'),banner=document.createElement('div');
  banner.className='victory-banner';banner.textContent=state.mode==='online'?`✦ ${onlineSession.names[state.b[state.last]-1]}获胜！ ✦`:'✦ 五子连珠 · 你赢了！ ✦';effects.append(banner);
  const colors=['#e6b94f','#7f9b61','#cb8cb2','#74acb8','#e3a16e'];
  for(let i=0;i<36;i++){
    const confetti=document.createElement('span');confetti.className='win-confetti';
    confetti.setAttribute('style',`--x:${(i*37)%100}%;--delay:${(i%9)*.07}s;--drift:${(i%2?1:-1)*(20+i%7*8)}px;--turn:${(i%2?1:-1)*(180+i*19)}deg;background:${colors[i%colors.length]}`);
    effects.append(confetti);
  }
}

function closeOnlineGomoku(){const session=onlineSession;onlineSession=null;if(!session)return;clearTimeout(session.timeout);session.conn?.close();session.peer?.destroy()}
function setupOnlineGomoku(){$('#restart').disabled=false;clean();state={};board.replaceChildren();board.className='online-lobby';controls.replaceChildren();status.textContent='邀请朋友，各用自己的设备一起下棋';$('#hint').textContent='双方保持页面打开。通过公共信令服务连接，再使用点对点连接同步棋局；部分公司或校园网络可能无法连接，可切换网络重试。';
 const title=document.createElement('h3');title.textContent='五子棋 · 联机对战';board.append(title);const desc=document.createElement('p');desc.textContent='一人创建房间，把 6 位房间码发给朋友；另一人输入房间码加入。房主执黑先手。';board.append(desc);
 control('创建房间',()=>connectGomokuRoom(true));
 const form=document.createElement('form');form.className='room-join';const input=document.createElement('input');input.id='room-code';input.placeholder='输入 6 位房间码';input.maxLength=6;input.autocomplete='off';input.setAttribute('aria-label','房间码');const button=document.createElement('button');button.type='submit';button.textContent='加入房间';form.append(input,button);form.onsubmit=e=>{e.preventDefault();const code=input.value.trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code)){input.setCustomValidity('请输入 6 位字母或数字房间码');input.reportValidity();return}connectGomokuRoom(false,code)};input.oninput=()=>input.setCustomValidity('');board.append(form);control('返回人机模式',start);
}
function newRoomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>alphabet[v%alphabet.length]).join('')}
function connectGomokuRoom(host,code=newRoomCode()){
 closeOnlineGomoku();if(typeof Peer==='undefined'){status.textContent='联机组件加载失败，请刷新页面重试';return}
 const session={host,code,color:host?1:2,names:host?[player,'朋友']:[ '房主',player],moves:[],revision:0,ready:false,pending:null,conn:null,peer:null,timeout:null,notice:host?'正在创建房间…':'正在加入房间…'};onlineSession=session;
 $('#restart').disabled=true;board.className='online-lobby';board.replaceChildren();controls.replaceChildren();status.textContent=session.notice;
 const heading=document.createElement('h3');heading.textContent=`房间码：${code}`;board.append(heading);const tip=document.createElement('p');tip.textContent=host?'把房间码发给朋友，等待对方加入。':'正在连接房主，请稍候…';board.append(tip);control('返回大厅',setupOnlineGomoku);
 if(host)control('复制房间码',async()=>{try{await navigator.clipboard.writeText(code);status.textContent='房间码已复制'}catch{status.textContent=`请手动复制：${code}`}});
 const id=host?`pocket-gomoku-v1-${code}`:`pocket-guest-${newRoomCode()}-${newRoomCode()}`;
 try{session.peer=new Peer(id,{debug:0});}catch{failOnline(session,'无法启动连接，请换一个浏览器重试');return}
 session.timeout=setTimeout(()=>failOnline(session,'连接超时，请确认房间码、房主页面和网络后重试'),25000);
 session.peer.on('open',()=>{if(onlineSession!==session)return;clearTimeout(session.timeout);if(host){status.textContent=`房间 ${code} 已创建，等待朋友加入`}else{const conn=session.peer.connect(`pocket-gomoku-v1-${code}`,{reliable:true,serialization:'json'});attachGomokuConnection(session,conn);session.timeout=setTimeout(()=>failOnline(session,'未能连上房主，请检查房间码或切换网络'),25000)}});
 session.peer.on('connection',conn=>{if(onlineSession!==session||!host||session.conn){conn.on('open',()=>{conn.send({type:'busy'});setTimeout(()=>conn.close(),300)});return}attachGomokuConnection(session,conn)});
 session.peer.on('error',error=>{if(onlineSession!==session)return;const messages={'unavailable-id':'房间码已被使用，请返回大厅重新创建','peer-unavailable':'找不到房间，请确认房主已创建并保持页面打开','network':'网络连接中断，请切换网络后重试','server-error':'联机服务暂时不可用，请稍后重试'};failOnline(session,messages[error.type]||'无法建立联机连接，请切换网络后重试')});
 session.peer.on('disconnected',()=>{if(onlineSession===session&&!session.ready)failOnline(session,'与联机服务断开，请重新创建或加入房间')});
}
function attachGomokuConnection(session,conn){session.conn=conn;conn.on('open',()=>{if(onlineSession!==session)return;clearTimeout(session.timeout);session.timeout=setTimeout(()=>failOnline(session,'对方未完成连接，请重新加入房间'),15000);if(!session.host)conn.send({type:'hello',name:player})});conn.on('data',message=>{if(onlineSession!==session)return;handleOnlineMessage(session,message)});conn.on('close',()=>{if(onlineSession===session)failOnline(session,'对方已离开或连接中断。棋局已暂停，请返回大厅重新连接')});conn.on('error',()=>{if(onlineSession===session)failOnline(session,'对战连接失败，棋局已暂停，请返回大厅重试')})}
function failOnline(session,message){if(onlineSession!==session)return;clearTimeout(session.timeout);session.failed=true;session.ready=false;session.notice=message;session.pending=null;if(state.mode==='online')drawGomoku();else status.textContent=message;}
function validOnlineMoves(moves){if(!Array.isArray(moves)||moves.length>225)return false;const b=Array(225).fill(0);for(let n=0;n<moves.length;n++){const m=moves[n];if(!m||!Number.isInteger(m.index)||m.index<0||m.index>=225||m.color!==(n%2+1)||b[m.index])return false;b[m.index]=m.color;if(gomokuWin(b,m.index)&&n!==moves.length-1)return false}return true}
function applyOnlineState(session){board.className='gomoku-grid';$('#instructions').textContent=`联机对战 · ${session.names[0]}执黑，${session.names[1]}执白；五子连线获胜。`;clearGomokuEffects();state={mode:'online',b:Array(225).fill(0),last:-1,moves:0,history:[],busy:false,over:false,result:'',turn:session.moves.length%2+1};for(const m of session.moves){state.b[m.index]=m.color;state.last=m.index;if(m.color===1)state.moves++}if(state.last>=0)checkGomoku(state.last);drawGomoku();$('#hint').textContent=`房间 ${session.code} · ${session.names[0]}执黑，${session.names[1]}执白。悔棋和重新开局需对方同意。`}
function sendOnlineState(session){session.revision++;session.conn.send({type:'state',revision:session.revision,moves:session.moves,names:session.names});applyOnlineState(session)}
function handleOnlineMessage(session,message){if(session.failed||!message||typeof message!=='object')return;
 if(message.type==='busy'){failOnline(session,'房间已满，请重新创建或加入其他房间');return}
 if(message.type==='hello'&&session.host&&!session.ready){if(typeof message.name!=='string'||!message.name.trim())return;session.names[1]=message.name.trim().slice(0,20);session.ready=true;session.notice='';clearTimeout(session.timeout);sendOnlineState(session);return}
 if(message.type==='state'&&!session.host){if(!Number.isInteger(message.revision)||message.revision<=session.revision||!validOnlineMoves(message.moves)||!Array.isArray(message.names)||message.names.length!==2||!message.names.every(n=>typeof n==='string'&&n.length>0&&n.length<=20))return;session.revision=message.revision;session.moves=message.moves.map(m=>({index:m.index,color:m.color}));session.names=message.names;session.ready=true;session.notice='';session.pending=null;clearTimeout(session.timeout);applyOnlineState(session);return}
 if(!session.ready)return;
 if(message.type==='move'&&session.host){if(message.revision!==session.revision||session.pending)return;hostOnlineMove(session,message.index,2);return}
 if(message.type==='request'&&['undo','rematch'].includes(message.action)){if(session.pending||message.revision!==session.revision||(message.action==='undo'&&!session.moves.some(m=>m.color===(session.host?2:1)))){session.conn.send({type:'reply',action:message.action,accept:false});return;}session.pending={action:message.action,from:session.host?2:1,incoming:true};drawGomoku();return}
 if(message.type==='reply'&&session.pending&&!session.pending.incoming){const pending=session.pending;if(message.action!==pending.action)return;if(message.accept){if(session.host)commitOnlineRequest(session,pending);else{session.pending={...pending,waiting:true};drawGomoku()}}else{session.pending=null;session.notice='对方拒绝了请求';drawGomoku()}return}
}
function playOnlineMove(index){const session=onlineSession;if(!session?.ready||session.pending||state.over||state.turn!==session.color||state.b[index])return;if(session.host)hostOnlineMove(session,index,1);else{session.conn.send({type:'move',index,revision:session.revision});state.busy=true;drawGomoku()}}
function hostOnlineMove(session,index,color){if(state.over||state.turn!==color||!Number.isInteger(index)||index<0||index>=225||state.b[index])return;session.notice='';session.moves.push({index,color});sendOnlineState(session)}
function requestOnlineAction(action){const session=onlineSession;if(!session?.ready||session.pending)return;if(action==='undo'&&!session.moves.some(m=>m.color===session.color))return;session.pending={action,from:session.color,incoming:false};session.conn.send({type:'request',action,revision:session.revision});drawGomoku()}
function replyOnlineRequest(accept){const session=onlineSession,pending=session?.pending;if(!session?.ready||!pending?.incoming)return;session.conn.send({type:'reply',action:pending.action,accept});if(accept){if(session.host)commitOnlineRequest(session,pending);else{session.pending={...pending,waiting:true};drawGomoku()}}else{session.pending=null;drawGomoku()}}
function commitOnlineRequest(session,pending){if(pending.action==='rematch')session.moves=[];else{let index=session.moves.length-1;while(index>=0&&session.moves[index].color!==pending.from)index--;if(index>=0)session.moves=session.moves.slice(0,index)}session.pending=null;session.notice='';sendOnlineState(session)}
function renderOnlineControls(){const session=onlineSession;if(!session)return;if(session.pending?.incoming&&!session.pending.waiting){control('同意',()=>replyOnlineRequest(true));control('拒绝',()=>replyOnlineRequest(false))}control('离开房间',setupOnlineGomoku);$('#restart').disabled=!session.ready||!!session.pending}
function onlineStatus(){const session=onlineSession;if(!session)return '';if(!session.ready)return session.notice||'连接中断，棋局已暂停';if(session.pending)return session.pending.waiting?'正在同步棋局…':`${session.pending.incoming?'对方请求':'等待对方同意'}${session.pending.action==='undo'?'悔棋':'重新开局'}`;if(state.over)return gomokuWin(state.b,state.last)?`🎉 ${session.names[state.b[state.last]-1]}获胜！`:'棋盘已满，平局！';return `房间 ${session.code} · 你执${session.color===1?'黑':'白'} · 轮到 ${session.names[state.turn-1]}（${state.turn===1?'黑棋':'白棋'}）${session.notice?' · '+session.notice:''}`}
