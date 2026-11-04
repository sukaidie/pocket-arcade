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
  ui.run("board.className='online-lobby'");
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
 host.run("handleOnlineMessage(onlineSession,{type:'hello',name:'重连',protocol:ONLINE_PROTOCOL})");assert.equal(host.run('onlineSession.ready'),false);
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

test('联机从大厅进入棋局时恢复十五列棋盘布局，双方均生成225个落点',()=>{
 const {host,guest}=onlinePair();
 for(const ui of [host,guest]){
  assert.equal(ui.elements.get('#board').className,'gomoku-grid');
  assert.equal(ui.elements.get('#board').children.length,225);
 }
});

test('不同版本客户端握手失败并明确提示，禁止继续落子',()=>{
 const {host}=onlinePair();host.run("onlineSession.ready=false;handleOnlineMessage(onlineSession,{type:'hello',name:'旧版朋友'})");
 assert.equal(host.run('onlineSession.versionMismatch'),true);
 assert.equal(host.run('onlineSession.ready'),false);
 assert.ok(host.elements.get('#status').textContent.includes('版本不同'));
});
test('重连握手保留棋局，并向另一端同步现有落子',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 host.run('playOnlineMove(112)');pair.flush();guest.run('playOnlineMove(113)');pair.flush();
 host.run("onlineSession.ready=false;onlineSession.failed=false;onlineSession.pending=null;handleOnlineMessage(onlineSession,{type:'hello',name:'小红',protocol:ONLINE_PROTOCOL})");pair.flush();
 assert.equal(host.run('onlineSession.ready'),true);
 assert.equal(host.run('onlineSession.moves.length'),2);
 assert.equal(host.run('JSON.stringify(state.b)'),guest.run('JSON.stringify(state.b)'));
});
test('信令断开不把正常数据连接标记为失败，后台尝试恢复信令',()=>{
 const {host}=onlinePair();host.run("onlineSession.peer={disconnected:true,destroyed:false,reconnect(){}};recoverOnlineSignaling(onlineSession)");
 assert.equal(host.run('onlineSession.ready'),true);
 assert.notEqual(host.run('onlineSession.failed'),true);
 assert.equal(host.pending.size,1);
});

test('房间聊天双向送达，显示昵称，消息确认不改变棋盘或轮次',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 assert.equal(host.run("sendRoomChat('你好，一起下棋！')"),true);pair.flush();
 assert.equal(host.run('onlineSession.chat[0].acked'),true);
 assert.equal(guest.run('onlineSession.chat[0].text'),'你好，一起下棋！');
 assert.equal(guest.run('onlineSession.chatUnread'),1);
 assert.ok(guest.elements.get('#chat-messages').children[0].children[0].textContent.includes('小明'));
 guest.elements.get('#chat-toggle').onclick();assert.equal(guest.run('onlineSession.chatUnread'),0);
 guest.run("sendRoomChat('好的！')");pair.flush();
 assert.equal(host.run('onlineSession.chat.length'),2);
 assert.equal(host.run('onlineSession.moves.length'),0);assert.equal(guest.run('state.turn'),1);
});
test('聊天去重，拒绝空消息、超长消息、伪造发送方，按文本显示标签',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 assert.equal(host.run("sendRoomChat('   ')"),false);
 assert.equal(host.run("sendRoomChat('x'.repeat(201))"),false);
 host.run("sendRoomChat('<img src=x onerror=alert(1)>')");pair.flush();
 assert.equal(guest.elements.get('#chat-messages').children[0].children[1].textContent,'<img src=x onerror=alert(1)>');
 guest.run("receiveRoomChat(onlineSession,{id:'1-1',text:'重复'})");pair.flush();
 assert.equal(guest.run('onlineSession.chat.length'),1);
 guest.run("receiveRoomChat(onlineSession,{id:'2-2',text:'伪造'})");assert.equal(guest.run('onlineSession.chat.length'),1);
});
test('聊天独立于重开和悔棋，断线禁发、待确认消息重试不重复显示',()=>{
 const pair=onlinePair(),{host,guest}=pair;
 host.run("sendRoomChat('这条等待确认')");
 host.run('retryRoomChat(onlineSession)');pair.flush();
 assert.equal(guest.run('onlineSession.chat.length'),1);assert.equal(host.run('onlineSession.chat[0].acked'),true);
 host.run("requestOnlineAction('rematch')");pair.flush();guest.run('replyOnlineRequest(true)');pair.flush();
 assert.equal(host.run('onlineSession.chat.length'),1);assert.equal(guest.run('onlineSession.chat.length'),1);
 host.run("failOnline(onlineSession,'断线')");assert.equal(host.run("sendRoomChat('不能发送')"),false);
 assert.equal(host.elements.get('#chat-input').disabled,true);
 host.run('closeOnlineGomoku()');assert.equal(host.elements.get('#room-chat').hidden,true);
 assert.equal(host.elements.get('#chat-messages').children.length,0);
});
test('聊天列表限制200条，防止长时间对局无限增加页面内容',()=>{
 const {guest}=onlinePair();
 guest.run("for(let i=1;i<=205;i++)receiveRoomChat(onlineSession,{id:'1-'+i,text:'消息'+i})");
 assert.equal(guest.run('onlineSession.chat.length'),200);
 assert.equal(guest.run('onlineSession.chat[0].text'),'消息6');
});
