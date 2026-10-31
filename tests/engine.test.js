import {test} from 'node:test';import assert from 'node:assert/strict';import {slide,winner,bestMove} from '../engine.js';
test('2048 每个方块一回合只合并一次',()=>{const r=slide([2,2,2,2,...Array(12).fill(0)],'left');assert.deepEqual(r.board.slice(0,4),[4,4,0,0]);assert.equal(r.score,8)});
test('2048 四个方向和无效移动',()=>{let b=[2,0,0,0,...Array(12).fill(0)];assert.equal(slide(b,'left').changed,false);assert.equal(slide(b,'right').board[3],2);assert.equal(slide(b,'down').board[12],2);assert.equal(slide(slide(b,'down').board,'up').board[0],2)});
test('井字棋识别胜负与平局',()=>{assert.equal(winner(['X','X','X','','','','','','']),'X');assert.equal(winner(['X','O','X','X','O','O','O','X','X']),'draw')});
test('电脑会获胜和阻挡',()=>{assert.equal(bestMove(['O','O','','X','X','','','','']),2);assert.equal(bestMove(['X','X','','','O','','','','']),2)});
test('穷举人类所有落子，电脑不会输',()=>{function play(b){let w=winner(b);assert.notEqual(w,'X');if(w)return;for(let i=0;i<9;i++)if(!b[i]){let n=b.slice();n[i]='X';assert.notEqual(winner(n),'X');if(winner(n))continue;n[bestMove(n)]='O';play(n)}}play(Array(9).fill(''))});
