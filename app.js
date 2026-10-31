import {toggleLights,winner,bestMove,selectRecord} from './engine.js';
const $=s=>document.querySelector(s),dialog=$('#game-dialog'),board=$('#board'),status=$('#status'),controls=$('#controls');let game='',timer=null,delay=null,state={};
const names={mole:'打地鼠',lights:'熄灯挑战',memory:'记忆翻牌',ttt:'井字棋'};
const rules={mole:'30 秒内点击冒出的地鼠，每次命中得 10 分。点击开始后计时。',lights:'点击一盏灯会切换它和上下左右邻灯，试着熄灭全部灯！',memory:'每次翻开两张牌，找出全部 8 对相同图案。',ttt:'你执 ×，电脑执 ○。横、竖或斜线率先连成三个即获胜。'};
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
function start(){clean();board.replaceChildren();controls.replaceChildren();board.className='';$('#hint').textContent='';if(game==='mole')startMole();if(game==='lights')startLights();if(game==='memory')startMemory();if(game==='ttt')startTTT()}
for(const b of document.querySelectorAll('[data-game]'))b.onclick=()=>{game=b.dataset.game;playerDialog.showModal();nameInput.focus();nameInput.select()};$('#close').onclick=()=>dialog.close();dialog.addEventListener('close',clean);$('#restart').onclick=start;dialog.addEventListener('click',e=>{if(e.target===dialog){let r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
function startMemory(){state={cards:[...'🌵🍋🍄🌼🍒🦋🍀🌈🌵🍋🍄🌼🍒🦋🍀🌈'],open:[],matched:[],moves:0,locked:false};for(let i=15;i>0;i--){let j=Math.floor(Math.random()*(i+1));[state.cards[i],state.cards[j]]=[state.cards[j],state.cards[i]]}board.className='grid4';drawMemory()}
function drawMemory(){board.replaceChildren();const finished=state.matched.length===16;const r=record('pocket-memory',finished?state.moves:undefined,true);status.textContent=(finished?`🎉 全部配对！用了 ${state.moves} 次`:`翻牌 ${state.moves} 次 · 配对 ${state.matched.length/2}/8`)+` · 最佳 ${r?`${r.value} 次（${r.player}）`:'暂无纪录'}`;$('#hint').textContent='每翻开两张计 1 次；完成全部配对后记录，次数越少越好。';state.cards.forEach((v,i)=>{const match=state.matched.includes(i),open=state.open.includes(i);let el=cell(match||open?v:'?',match?'matched':open?'':'card-back');el.setAttribute('aria-label',match||open?v:`第 ${i+1} 张，未翻开`);el.disabled=match||open||state.locked;el.onclick=()=>{state.open.push(i);if(state.open.length===2){state.moves++;state.locked=true;const [a,b]=state.open;if(state.cards[a]===state.cards[b]){state.matched.push(a,b);state.open=[];state.locked=false}else delay=setTimeout(()=>{state.open=[];state.locked=false;drawMemory()},750)}drawMemory()};board.append(el)})}
function startTTT(){state={b:Array(9).fill(''),busy:false};board.className='grid3';drawTTT()}
function drawTTT(){const w=winner(state.b);status.textContent=w?(w==='draw'?'势均力敌，平局！':w==='X'?'🎉 你赢了！':'电脑获胜，再来一局？'):state.busy?'电脑思考中…':'轮到你了 · ×';board.replaceChildren();state.b.forEach((v,i)=>{let el=cell(v==='X'?'×':v==='O'?'○':'');el.setAttribute('aria-label',`第 ${i+1} 格 ${v||'空'}`);el.disabled=!!v||state.busy||!!w;el.onclick=()=>{state.b[i]='X';state.busy=true;drawTTT();if(winner(state.b))return;delay=setTimeout(()=>{const m=bestMove(state.b);if(m!==undefined)state.b[m]='O';state.busy=false;drawTTT()},320)};board.append(el)})}
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
function startMole(){state={score:0,active:-1,started:false,over:false,end:0,next:0};board.className='grid3';drawMole();let b=document.createElement('button');b.textContent='开始挑战';b.onclick=()=>{if(state.started)return;state.started=true;state.end=Date.now()+30000;state.next=0;b.disabled=true;b.textContent='挑战进行中';tickMole();timer=setInterval(tickMole,100)};controls.append(b);$('#hint').textContent='支持鼠标、触屏，或键盘数字 1—9（从左到右、从上到下）。'}
function tickMole(){const now=Date.now();if(now>=state.end){state.over=true;state.active=-1;clearInterval(timer);drawMole();return}if(now>=state.next){const old=state.active;do{state.active=Math.floor(Math.random()*9)}while(state.active===old);state.next=now+Math.max(450,900-state.score)}drawMole()}
function hitMole(i){if(!state.started||state.over)return;if(Date.now()>=state.end){tickMole();return}if(i===state.active){state.score+=10;state.active=-1;drawMole()}}
function drawMole(){
  const remaining=state.started?Math.max(0,Math.ceil((state.end-Date.now())/1000)):30;
  status.textContent=`${state.over?'本局结束':`剩余 ${remaining} 秒`} · 得分 ${state.score} · 最高 ${best('pocket-mole',state.score)}`;
  if(!board.children.length){for(let i=0;i<9;i++){let el=cell('','mole-hole');el.onclick=()=>hitMole(i);board.append(el)}}
  [...board.children].forEach((el,i)=>{el.textContent=state.active===i?'🐹':'·';el.classList.toggle('mole-up',state.active===i);el.setAttribute('aria-label',`洞口 ${i+1}${state.active===i?'，地鼠出现':''}`);el.disabled=!state.started||state.over});
}
window.addEventListener('keydown',e=>{if(dialog.open&&game==='mole'&&!e.repeat&&/^[1-9]$/.test(e.key)){e.preventDefault();hitMole(Number(e.key)-1)}});
