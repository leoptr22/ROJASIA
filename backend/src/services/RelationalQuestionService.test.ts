import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRelationalQuestionData } from './RelationalQuestionService.js';
import type { SalesRecord } from '../repositories/types.js';

const row=(date:string,total:number,overrides:Partial<SalesRecord>={}):SalesRecord=>({date:new Date(date+'T12:00:00'),pointOfSale:7,number:1,customer:'Cliente A',fantasyName:'Comercial A',deliveryDate:new Date(date+'T12:00:00'),product:'Vinilo',work:'Vinilo impreso',total,balance:0,status:'ENTREGADA',user:'ANA',...overrides});

test('consulta libre recupera meses mencionados aunque no diga comparar',()=>{
 const rows=[row('2026-04-05',100),row('2026-04-10',50),row('2026-05-03',200),row('2026-08-28',10)];
 const result=buildRelationalQuestionData(rows,rows,'Cuánto se recaudó en abril y cuánto en mayo')!;
 assert.equal(result.periods[0]!.label,'abril 2026');
 assert.equal(result.periods[0]!.metrics.revenue,150);
 assert.equal(result.periods[1]!.label,'mayo 2026');
 assert.equal(result.periods[1]!.metrics.revenue,200);
 assert.match(result.limitations[0]!,/no posee una columna de cobros/i);
});

test('interconsulta cruza mes, cliente, producto y columnas de la misma fila',()=>{
 const rows=[row('2026-04-05',100),row('2026-04-06',60,{customer:'Cliente B',fantasyName:'Comercial B',product:'Folletos'}),row('2026-04-07',500,{customer:'Cliente C',fantasyName:'Comercial C',product:'Folletos'}),row('2026-08-28',10)];
 const result=buildRelationalQuestionData(rows,rows,'Cuánto facturó Comercial B en el producto Folletos en abril')!;
 assert.deepEqual(result.interpretation.matchedFilters.fantasyNames,['Comercial B']);
 assert.deepEqual(result.interpretation.matchedFilters.products,['Folletos']);
 assert.equal(result.periods[0]!.metrics.revenue,60);
 assert.equal(result.operations[0]!.product,'Folletos');
 assert.equal((result.periods[0]!.groupedBy.product as any[])[0]!.name,'Folletos');
});
