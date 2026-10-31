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
