import {test} from 'node:test';import assert from 'node:assert/strict';import {toggleLights,winner,bestMove,selectRecord} from '../engine.js';
test('井字棋识别胜负与平局',()=>{assert.equal(winner(['X','X','X','','','','','','']),'X');assert.equal(winner(['X','O','X','X','O','O','O','X','X']),'draw')});
test('电脑会获胜和阻挡',()=>{assert.equal(bestMove(['O','O','','X','X','','','','']),2);assert.equal(bestMove(['X','X','','','O','','','','']),2)});
test('穷举人类所有落子，电脑不会输',()=>{function play(b){let w=winner(b);assert.notEqual(w,'X');if(w)return;for(let i=0;i<9;i++)if(!b[i]){let n=b.slice();n[i]='X';assert.notEqual(winner(n),'X');if(winner(n))continue;n[bestMove(n)]='O';play(n)}}play(Array(9).fill(''))});

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
