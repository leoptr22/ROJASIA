import test from 'node:test';
import assert from 'node:assert/strict';
import { improveAnswerPresentation,normalizeAnswerLinks,type AIAnswer } from './RojasAIService.js';

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

test('un top solicitado respeta el umbral y la cantidad de filas',()=>{
 const base:AIAnswer={answer:'Respuesta',table:{title:'',columns:[],rows:[]},findings:[],actions:[],evidence:[],limitations:[]};
 const result=improveAnswerPresentation(base,'público general con facturación menor a $10000, top 3 de solicitudes',{segmentAmountAnalysis:{operator:'lt',threshold:10000,label:'Público general',matchingOperations:232,shareOfSegmentOperations:32.3,totalSegmentOperations:718,matchingCustomers:187,matchingRevenue:1244470,products:[{product:'Servicio de Impresión',operations:73,revenue:337120},{product:'Fotocopias',operations:58,revenue:336760},{product:'Stickers',operations:46,revenue:259080},{product:'Diseño',operations:20,revenue:100000}]}});
 assert.equal(result.table?.rows.length,3);
 assert.match(result.answer,/232 operaciones/);
 assert.match(result.table?.title??'',/Top 3/);
});

test('un producto filtrado muestra las operaciones completas disponibles',()=>{
 const base:AIAnswer={answer:'Respuesta',table:{title:'',columns:[],rows:[]},findings:[],actions:[],evidence:[],limitations:[]};
 const result=improveAnswerPresentation(base,'y en impresion uv? facturacion menores a $10000',{segmentAmountAnalysis:{operator:'lt',threshold:10000,label:'Público general',product:'IMPRESION UV',matchingOperations:2,shareOfSegmentOperations:7.1,totalSegmentOperations:28,matchingCustomers:2,matchingRevenue:13020,operations:[{date:'2026-08-28',order:'7-31948',customer:'GODOY MARIA LUZ',total:7800},{date:'2026-08-27',order:'7-31922',customer:'LOPEZ BRUN EDGARDO DANIEL',total:5220}]}});
 assert.equal(result.table?.rows.length,2);
 assert.deepEqual(result.table?.columns,['Fecha','Orden','Cliente','Importe']);
});
