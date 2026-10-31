// Keep the original record holder on ties; legacy numeric scores have no known owner.
export function selectRecord(previous,value,player,lower=false){
  if(!Number.isFinite(value)||value<=0)return previous;
  if(!previous||(lower?value<previous.value:value>previous.value))return {value,player};
  return previous;
}

export function toggleLights(board,index){return board.map((on,i)=>Math.abs(Math.floor(i/4)-Math.floor(index/4))+Math.abs(i%4-index%4)<=1?!on:on)}

export function sudokuConflict(b,i){if(!b[i])return false;let r=Math.floor(i/9),c=i%9;return b.some((v,j)=>j!==i&&v===b[i]&&(Math.floor(j/9)===r||j%9===c||(Math.floor(j/27)===Math.floor(r/3)&&Math.floor((j%9)/3)===Math.floor(c/3))))}
export function makeSudoku(random=Math.random){
 const source='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
 const digits=[1,2,3,4,5,6,7,8,9];for(let i=8;i>0;i--){let j=Math.floor(random()*(i+1));[digits[i],digits[j]]=[digits[j],digits[i]]}
 const transpose=random()<.5;
 return Array.from({length:81},(_,i)=>{const n=Number(source[transpose?(i%9)*9+Math.floor(i/9):i]);return n?digits[n-1]:0});
}

export function mineNeighbors(i){const out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let x=i%9+dx,y=Math.floor(i/9)+dy;if((dx||dy)&&x>=0&&x<9&&y>=0&&y<9)out.push(y*9+x)}return out}
export function createMines(first,random=Math.random){const safe=new Set([first,...mineNeighbors(first)]),free=Array.from({length:81},(_,i)=>i).filter(i=>!safe.has(i));for(let i=free.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[free[i],free[j]]=[free[j],free[i]]}const mines=new Set(free.slice(0,10));return Array.from({length:81},(_,i)=>mines.has(i)?-1:mineNeighbors(i).filter(j=>mines.has(j)).length)}
export function revealMines(field,open,flags,index){const next=new Set(open),queue=[index];while(queue.length){const i=queue.pop();if(next.has(i)||flags.has(i))continue;next.add(i);if(field[i]===0)queue.push(...mineNeighbors(i))}return next}
export function gomokuWin(b,i){const who=b[i];if(!who)return false;const x=i%15,y=Math.floor(i/15);return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy])=>{let count=1;for(const sign of [-1,1])for(let n=1;n<15;n++){const xx=x+dx*n*sign,yy=y+dy*n*sign;if(xx<0||xx>=15||yy<0||yy>=15||b[yy*15+xx]!==who)break;count++}return count>=5})}
export function gomokuMove(b){const free=b.flatMap((v,i)=>v?[]:[i]);if(free.length===225)return 112;for(const who of [2,1])for(const i of free){b[i]=who;const win=gomokuWin(b,i);b[i]=0;if(win)return i}let best=-Infinity,move=free[0];for(const i of free){let score=0,x=i%15,y=Math.floor(i/15);for(const who of [2,1])for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){let count=0,ends=0;for(const sign of [-1,1])for(let n=1;n<=5;n++){let xx=x+dx*n*sign,yy=y+dy*n*sign;if(xx<0||xx>=15||yy<0||yy>=15)break;const v=b[yy*15+xx];if(v===who)count++;else{if(!v)ends++;break}}score+=([0,4,30,250,2000][Math.min(count,4)])*(ends+1)*(who===2?1.1:1)}score-=Math.abs(x-7)+Math.abs(y-7);if(score>best){best=score;move=i}}return move}

export function makeDeck(random=Math.random){const deck=[];for(const suit of ['♠','♥','♣','♦'])for(let rank=1;rank<=13;rank++)deck.push({rank,suit});for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}return deck}
export function handValue(hand){let total=0,aces=0;for(const c of hand){total+=c.rank===1?11:Math.min(10,c.rank);if(c.rank===1)aces++}while(total>21&&aces){total-=10;aces--}return total}
export function blackjackResult(player,dealer){const p=handValue(player),d=handValue(dealer),pn=p===21&&player.length===2,dn=d===21&&dealer.length===2;if(p>21)return 'lose';if(d>21)return 'win';if(pn||dn)return pn&&dn?'draw':pn?'win':'lose';return p===d?'draw':p>d?'win':'lose'}
