export function slide(board,direction){let next=board.slice(),score=0;for(let i=0;i<4;i++){let ids=Array.from({length:4},(_,j)=>direction==='left'?i*4+j:direction==='right'?i*4+3-j:direction==='up'?j*4+i:(3-j)*4+i);let row=ids.map(k=>board[k]).filter(Boolean),out=[];for(let j=0;j<row.length;j++){if(row[j]===row[j+1]){out.push(row[j]*2);score+=row[j]*2;j++}else out.push(row[j])}ids.forEach((k,j)=>next[k]=out[j]||0)}return {board:next,score,changed:next.some((v,i)=>v!==board[i])}}
export function winner(b){for(const [a,c,d] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(b[a]&&b[a]===b[c]&&b[a]===b[d])return b[a];return b.every(Boolean)?'draw':null}
export function bestMove(b){function minimax(turn){const w=winner(b);if(w)return w==='O'?10:w==='X'?-10:0;let values=[];b.forEach((v,i)=>{if(!v){b[i]=turn;values.push(minimax(turn==='O'?'X':'O'));b[i]=''}});return turn==='O'?Math.max(...values):Math.min(...values)}let best=-Infinity,move; b.forEach((v,i)=>{if(!v){b[i]='O';let value=minimax('X');b[i]='';if(value>best){best=value;move=i}}});return move}

// Keep the original record holder on ties; legacy numeric scores have no known owner.
export function selectRecord(previous,value,player,lower=false){
  if(!Number.isFinite(value)||value<=0)return previous;
  if(!previous||(lower?value<previous.value:value>previous.value))return {value,player};
  return previous;
}
