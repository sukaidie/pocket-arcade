import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../engine.js';

function setup(){
  class Element{
    constructor(){this.children=[];this.classList={toggle(){},add(){}};this.dataset={};this.value='';}
    replaceChildren(){this.children=[];}
    append(...nodes){this.children.push(...nodes);}
    setAttribute(){}
    addEventListener(){}
  }
  const elements=new Map();
  const document={querySelector(s){if(!elements.has(s))elements.set(s,new Element());return elements.get(s)},querySelectorAll(){return []},createElement(){return new Element()},addEventListener(){}};
  const pending=new Map();let next=0;
  const context=vm.createContext({...engine,document,window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},setTimeout(fn){pending.set(++next,fn);return next},clearTimeout(id){pending.delete(id)},clearInterval(){},setInterval(){}});
  const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/,'');
  vm.runInContext(source,context);
  vm.runInContext('startGomoku()',context);
  return {context,elements,pending,run(code){return vm.runInContext(code,context)},reply(){const [id,fn]=pending.entries().next().value;pending.delete(id);fn()}};
}

test('电脑思考时悔棋取消回调，恢复空棋盘并禁用按钮',()=>{
 const ui=setup(),board=ui.elements.get('#board'),controls=ui.elements.get('#controls');
 assert.equal(controls.children[0].disabled,true);
 board.children[112].onclick();assert.equal(ui.pending.size,1);
 controls.children[0].onclick();assert.equal(ui.pending.size,0);
 assert.equal(ui.run('state.b.filter(Boolean).length'),0);
 assert.equal(ui.run('state.moves'),0);assert.equal(ui.run('state.busy'),false);
 assert.equal(controls.children[0].disabled,true);
});

test('完整回合可连续撤回，恢复此前棋盘、计数和最后落子',()=>{
 const ui=setup(),board=ui.elements.get('#board'),controls=ui.elements.get('#controls');
 board.children[112].onclick();ui.reply();
 const first=ui.run('JSON.stringify(state.b)'),last=ui.run('state.last');
 const free=ui.run('state.b.indexOf(0)');board.children[free].onclick();ui.reply();
 controls.children[0].onclick();assert.equal(ui.run('JSON.stringify(state.b)'),first);
 assert.equal(ui.run('state.last'),last);assert.equal(ui.run('state.moves'),1);
 controls.children[0].onclick();assert.equal(ui.run('state.b.filter(Boolean).length'),0);
 board.children[100].onclick();assert.equal(ui.pending.size,1);
});

test('终局后悔棋恢复可下棋状态',()=>{
 const ui=setup();ui.elements.get('#board').children[112].onclick();ui.reply();
 ui.run("state.over=true;state.result='电脑获胜，再来一局？';drawGomoku()");
 ui.elements.get('#controls').children[0].onclick();
 assert.equal(ui.run('state.over'),false);assert.equal(ui.run('state.result'),'');
 assert.equal(ui.elements.get('#board').children[0].disabled,false);
});

test('玩家连成五子触发庆祝，悔棋和重新开始清除特效',()=>{
 const ui=setup();
 ui.run("for(let i=0;i<4;i++)state.b[105+i]=1;state.moves=4;drawGomoku()");
 ui.elements.get('#board').children[109].onclick();
 assert.equal(ui.run('state.over'),true);
 assert.equal(ui.elements.get('#win-effects').children.length,37);
 assert.equal(ui.run('gomokuWinningCells().length'),5);
 ui.elements.get('#controls').children[0].onclick();
 assert.equal(ui.elements.get('#win-effects').children.length,0);
 assert.equal(ui.run('state.over'),false);
 ui.elements.get('#board').children[109].onclick();
 ui.run("game='gomoku';start()");
 assert.equal(ui.elements.get('#win-effects').children.length,0);
});

function onlinePair(){
 const host=setup(),guest=setup(),queue=[];
 for(const [ui,hostSide] of [[host,true],[guest,false]]){
  ui.context.transmit=message=>queue.push({to:hostSide?guest:host,message:JSON.stringify(message)});
  ui.run(`onlineSession={host:${hostSide},color:${hostSide?1:2},code:'ABC234',names:['小明','小红'],moves:[],revision:0,ready:true,pending:null,conn:{send:transmit,close(){}},peer:{destroy(){}},notice:''};applyOnlineState(onlineSession)`);
 }
 return {host,guest,flush(){let limit=100;while(queue.length){assert.ok(limit-->0,'消息不得无限循环');const {to,message}=queue.shift();to.run(`handleOnlineMessage(onlineSession,${message})`)}}};
}

test('联机双方同步轮流落子，阻止抢下、重复和非法落子',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 guest.run('playOnlineMove(113)');pair.flush();assert.equal(host.run('onlineSession.moves.length'),0);
 host.run('playOnlineMove(112)');pair.flush();
 assert.equal(host.run('JSON.stringify(state.b)'),guest.run('JSON.stringify(state.b)'));
 host.run('playOnlineMove(113)');pair.flush();assert.equal(host.run('onlineSession.moves.length'),1);
 guest.run('playOnlineMove(113)');pair.flush();
 assert.equal(host.run('onlineSession.moves.length'),2);
 assert.equal(host.run('JSON.stringify(state.b)'),guest.run('JSON.stringify(state.b)'));
 guest.run('onlineSession.conn.send({type:"move",index:999,revision:onlineSession.revision})');pair.flush();
 assert.equal(host.run('onlineSession.moves.length'),2);
 assert.equal(host.run('validOnlineMoves([{index:1,color:1},{index:1,color:2}])'),false);
});

test('联机悔棋须同意，拒绝不改盘，重新开局同步清盘',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 host.run('playOnlineMove(112)');pair.flush();guest.run('playOnlineMove(113)');pair.flush();
 guest.run("requestOnlineAction('undo')");pair.flush();
 assert.equal(host.run('onlineSession.pending.incoming'),true);
 host.run('replyOnlineRequest(false)');pair.flush();assert.equal(host.run('onlineSession.moves.length'),2);
 guest.run("requestOnlineAction('undo')");pair.flush();host.run('replyOnlineRequest(true)');pair.flush();
 assert.equal(host.run('onlineSession.moves.length'),1);assert.equal(guest.run('onlineSession.moves.length'),1);
 guest.run('playOnlineMove(114)');pair.flush();
 host.run("requestOnlineAction('rematch')");pair.flush();guest.run('replyOnlineRequest(true)');pair.flush();
 assert.equal(host.run('state.b.filter(Boolean).length'),0);assert.equal(guest.run('state.b.filter(Boolean).length'),0);
 assert.equal(host.run('onlineSession.pending'),null);assert.equal(guest.run('onlineSession.pending'),null);
});

test('双方同时请求不会锁死，断线后双方禁止继续落子',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 host.run('playOnlineMove(112)');pair.flush();
 host.run("requestOnlineAction('rematch')");guest.run("requestOnlineAction('rematch')");pair.flush();
 assert.equal(host.run('onlineSession.pending'),null);assert.equal(guest.run('onlineSession.pending'),null);
 host.run("failOnline(onlineSession,'断线')");
 host.run('playOnlineMove(114)');assert.equal(host.run('onlineSession.moves.length'),1);
 assert.equal(host.elements.get('#board').children[114].disabled,true);
 host.run("handleOnlineMessage(onlineSession,{type:'hello',name:'重连'})");assert.equal(host.run('onlineSession.ready'),false);
});

test('联机白棋获胜也庆祝，不写入人机纪录，终局后禁止再下',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 for(let i=0;i<5;i++){
  host.run(`playOnlineMove(${i*2})`);pair.flush();guest.run(`playOnlineMove(${105+i})`);pair.flush();
 }
 assert.equal(host.run('state.over'),true);assert.equal(guest.run('state.over'),true);
 assert.equal(host.run('state.b[state.last]'),2);
 assert.equal(host.elements.get('#win-effects').children.length,37);
 assert.equal(guest.elements.get('#win-effects').children.length,37);
 assert.equal(host.run("records.get('pocket-gomoku')"),null);
 host.run('playOnlineMove(150)');assert.equal(host.run('onlineSession.moves.length'),10);
});
