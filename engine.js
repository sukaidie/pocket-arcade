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
export function rotatePiece(m){return m[0].map((_,x)=>m.map(row=>row[x]).reverse())}
export function pieceFits(field,m,x,y){return m.every((row,dy)=>row.every((v,dx)=>!v||(x+dx>=0&&x+dx<10&&y+dy>=0&&y+dy<20&&!field[y+dy][x+dx])))}
export function clearLines(field){let rows=field.filter(row=>!row.every(Boolean));return {lines:20-rows.length,field:[...Array.from({length:20-rows.length},()=>Array(10).fill(0)),...rows]}}
