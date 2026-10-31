import {test} from 'node:test';import assert from 'node:assert/strict';import {toggleLights,selectRecord,sudokuConflict,makeSudoku,createMines,revealMines,gomokuWin,gomokuMove,flightDestination,moveFlight} from '../engine.js';
test('纪录保存玩家名字，同分保留原纪录主人',()=>{
 const a=selectRecord(null,32,'小明');assert.deepEqual(a,{value:32,player:'小明'});
 assert.equal(selectRecord(a,32,'小红'),a);assert.equal(selectRecord(a,16,'小红'),a);
 assert.deepEqual(selectRecord(a,64,'小红'),{value:64,player:'小红'});
});
test('记忆翻牌次数越少越好，未完成不记分',()=>{
 assert.equal(selectRecord(null,undefined,'小明',true),null);
 const a=selectRecord(null,12,'小明',true);
 assert.equal(selectRecord(a,14,'小红',true),a);
 assert.equal(selectRecord(a,12,'小红',true),a);
 assert.deepEqual(selectRecord(a,8,'小红',true),{value:8,player:'小红'});
});

test('熄灯角落只切换自身及有效邻居，不跨行',()=>{const b=toggleLights(Array(16).fill(false),3);assert.deepEqual(b.flatMap((v,i)=>v?[i]:[]),[2,3,7])});
test('熄灯同一格操作两次恢复，生成的局面可以逆向解开',()=>{const blank=Array(16).fill(false);let b=blank;for(const i of [0,5,10,15])b=toggleLights(b,i);for(const i of [15,10,5,0])b=toggleLights(b,i);assert.deepEqual(b,blank)});

test('数独检测行、列、宫冲突',()=>{let b=Array(81).fill(0);b[0]=1;b[8]=1;assert.equal(sudokuConflict(b,0),true);b[8]=0;b[18]=1;assert.equal(sudokuConflict(b,0),true);b[18]=0;b[10]=1;assert.equal(sudokuConflict(b,0),true);b[10]=2;assert.equal(sudokuConflict(b,0),false)});
test('随机数独有唯一解且题目无冲突',()=>{for(let k=0;k<12;k++){const b=makeSudoku();assert.equal(b.length,81);assert.equal(b.some((_,i)=>sudokuConflict(b,i)),false);let count=0;function solve(){let i=b.indexOf(0);if(i===-1){count++;return}for(let n=1;n<=9&&count<2;n++){b[i]=n;if(!sudokuConflict(b,i))solve()}b[i]=0}solve();assert.equal(count,1)}});

test('扫雷首击及周围安全，雷数与邻雷数正确',()=>{for(const first of [0,40,80]){const b=createMines(first);assert.equal(b.filter(v=>v===-1).length,10);assert.equal(b[first],0);const opened=revealMines(b,new Set(),new Set(),first);assert.ok(opened.size>1);assert.ok([...opened].every(i=>b[i]>=0))}});
test('扫雷洪水展开保留插旗，点击雷只打开该雷',()=>{const b=Array(81).fill(0);b[80]=-1;const r=revealMines(b,new Set(),new Set([40]),0);assert.equal(r.has(40),false);const f=createMines(0);const i=f.indexOf(-1);assert.deepEqual([...revealMines(f,new Set(),new Set(),i)],[i])});
test('五子棋识别四方向，不把跨行误认连线',()=>{for(const step of [1,15,16,14]){let b=Array(225).fill(0);let start=step===14?20:0;for(let k=0;k<5;k++)b[start+k*step]=1;assert.equal(gomokuWin(b,start),true)}let b=Array(225).fill(0);for(const i of [13,14,15,16,17])b[i]=1;assert.equal(gomokuWin(b,15),false)});
test('五子棋电脑能获胜并阻挡，计算不修改棋盘',()=>{for(const who of [1,2]){const b=Array(225).fill(0);for(let i=0;i<4;i++)b[105+i]=who;const before=b.slice();assert.equal(gomokuMove(b),109);assert.deepEqual(b,before)}});
test('飞行棋起飞、跳格、飞跃、终点反弹与完成后不可移动',()=>{assert.equal(flightDestination(-1,5,0),null);assert.equal(flightDestination(-1,6,0),0);assert.equal(flightDestination(1,3,0),8);assert.equal(flightDestination(10,6,0),28);assert.equal(flightDestination(55,5,0),54);assert.equal(flightDestination(57,6,0),null)});
test('飞行棋撞回对手和胜利，原状态保持不变',()=>{let b=[[7,-1,-1,-1],[0,-1,-1,-1]];const r=moveFlight(b,0,0,6);assert.equal(r.planes[1][0],-1);assert.equal(r.captures,1);assert.equal(b[1][0],0);assert.equal(moveFlight([[57,57,57,56],[-1,-1,-1,-1]],0,3,1).won,true)});

test('飞行棋随机完整对局可结束，始终保持合法位置',()=>{let planes=Array.from({length:4},()=>Array(4).fill(-1)),turn=0,won=false;let seed=7;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}for(let step=0;step<10000&&!won;step++){const die=1+Math.floor(random()*6),legal=planes[turn].flatMap((v,i)=>flightDestination(v,die,turn)===null?[]:[i]);if(legal.length){const result=moveFlight(planes,turn,legal[Math.floor(random()*legal.length)],die);planes=result.planes;won=result.won}assert.ok(planes.flat().every(v=>v>=-1&&v<=57));if(die!==6)turn=(turn+1)%4}assert.equal(won,true)});
