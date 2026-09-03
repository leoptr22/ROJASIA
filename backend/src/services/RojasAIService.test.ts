import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswerLinks,type AIAnswer } from './RojasAIService.js';

test('hallazgos, acciones y evidencias quedan vinculados con identificadores válidos',()=>{
 const answer:AIAnswer={answer:'Resumen',findings:[{id:'f-original',title:'Caída',detail:'Bajó 10%',importance:'alta'}],actions:[{id:'a-original',action:'Revisar cliente',reason:'Explica la caída',priority:1,relatedFindingIds:['f-original','inexistente'],evidenceLabels:['Facturación']}],evidence:[{label:'Facturación',value:'-$100',source:'Excel',relatedFindingIds:['f-original']}],limitations:[]};
 const linked=normalizeAnswerLinks(answer);
 assert.equal(linked.findings[0]!.id,'hallazgo-1');
 assert.deepEqual(linked.actions[0]!.relatedFindingIds,['hallazgo-1']);
 assert.deepEqual(linked.actions[0]!.evidenceLabels,['Facturación']);
 assert.deepEqual(linked.evidence[0]!.relatedFindingIds,['hallazgo-1']);
});

test('una acción sin referencias recibe un contexto navegable de respaldo',()=>{
 const answer:AIAnswer={answer:'Resumen',findings:[{id:'f',title:'Hallazgo',detail:'Detalle',importance:'media'}],actions:[{id:'a',action:'Actuar',reason:'Motivo',priority:1,relatedFindingIds:[],evidenceLabels:[]}],evidence:[{label:'Dato',value:'1',source:'Excel',relatedFindingIds:[]}],limitations:[]};
 const linked=normalizeAnswerLinks(answer);
 assert.deepEqual(linked.actions[0]!.relatedFindingIds,['hallazgo-1']);
 assert.deepEqual(linked.actions[0]!.evidenceLabels,['Dato']);
 assert.deepEqual(linked.evidence[0]!.relatedFindingIds,['hallazgo-1']);
});
