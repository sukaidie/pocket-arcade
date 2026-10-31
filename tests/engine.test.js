import {test} from 'node:test';import assert from 'node:assert/strict';import {toggleLights,selectRecord,sudokuConflict,makeSudoku,rotatePiece,pieceFits,clearLines} from '../engine.js';
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
test('方块旋转四次还原，碰壁与堆叠检测',()=>{const m=[[1,0],[1,1]],field=Array.from({length:20},()=>Array(10).fill(0));let r=m;for(let i=0;i<4;i++)r=rotatePiece(r);assert.deepEqual(r,m);assert.equal(pieceFits(field,m,-1,0),false);assert.equal(pieceFits(field,m,9,0),false);assert.equal(pieceFits(field,m,0,19),false);field[1][0]=2;assert.equal(pieceFits(field,m,0,0),false)});
test('消行后保留其余行并补空行',()=>{const field=Array.from({length:20},()=>Array(10).fill(0));field[18].fill(1);field[19].fill(2);field[17][3]=4;const r=clearLines(field);assert.equal(r.lines,2);assert.equal(r.field.length,20);assert.equal(r.field[19][3],4);assert.ok(r.field[0].every(v=>v===0))});
