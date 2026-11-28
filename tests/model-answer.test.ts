import test from 'node:test';
import assert from 'node:assert/strict';
import {modelAnswer} from '../lib/server/model-answer.ts';
test('final structured answers support text blocks and parsed JSON without executing reasoning',()=>{
 const wrap=(message:any)=>({choices:[{message}]});
 assert.equal(modelAnswer(wrap({content:' {"operations":[]} '})),'{"operations":[]}');
 assert.equal(modelAnswer(wrap({content:[{type:'reasoning',text:'ignore this'},{type:'text',text:'{"operations":'},{type:'text',text:'[]}'}]})),'{"operations":[]}');
 assert.equal(modelAnswer(wrap({parsed:{operations:[]}})),'{"operations":[]}');
 assert.equal(modelAnswer(wrap({content:null,reasoning:'private thoughts'})),undefined);
 assert.equal(modelAnswer(wrap({content:'{}',refusal:'Cannot comply'})),undefined);
});
