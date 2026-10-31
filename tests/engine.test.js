import {test} from 'node:test';import assert from 'node:assert/strict';import {toggleLights,selectRecord,sudokuConflict,makeSudoku,createMines,revealMines,gomokuWin,gomokuMove,makeDeck,handValue,blackjackResult} from '../engine.js';
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

const cards=(...ranks)=>ranks.map(rank=>({rank,suit:'♠'}));
test('21点 A 自动降为 1，花牌计 10',()=>{assert.equal(handValue(cards(1,13)),21);assert.equal(handValue(cards(1,1,9)),21);assert.equal(handValue(cards(1,1,13)),12);assert.equal(handValue(cards(11,12,5)),25)});
test('21点天生牌优先，爆牌、庄家爆牌、平局正确结算',()=>{assert.equal(blackjackResult(cards(1,13),cards(7,7,7)),'win');assert.equal(blackjackResult(cards(7,7,7),cards(1,13)),'lose');assert.equal(blackjackResult(cards(1,13),cards(1,12)),'draw');assert.equal(blackjackResult(cards(10,10,3),cards(10,8)),'lose');assert.equal(blackjackResult(cards(10,9),cards(10,8,6)),'win');assert.equal(blackjackResult(cards(10,8),cards(9,9)),'draw')});
test('牌组为不重复的 52 张牌',()=>{const deck=makeDeck();assert.equal(deck.length,52);assert.equal(new Set(deck.map(c=>c.suit+c.rank)).size,52);assert.ok(deck.every(c=>c.rank>=1&&c.rank<=13))});
