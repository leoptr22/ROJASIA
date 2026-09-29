import test from 'node:test';
import assert from 'node:assert/strict';
import { DecisionIntelligenceService } from './DecisionIntelligenceService.js';
import type { Period, SalesRecord, SalesRepository } from '../repositories/types.js';

const row=(number:number,customer:string,balance:number):SalesRecord=>({
 date:new Date('2026-08-01T12:00:00'),pointOfSale:1,number,customer,fantasyName:customer,
 deliveryDate:new Date('2026-08-02T12:00:00'),product:'Producto',work:'Trabajo',
 total:100,balance,status:'ENTREGADA',user:'Usuario'
});
const monthlyRow=(date:string,number:number,customer:string,product:string,total:number):SalesRecord=>({
 date:new Date(date+'T12:00:00'),pointOfSale:1,number,customer,fantasyName:customer,
 deliveryDate:new Date(date+'T12:00:00'),product,work:'Trabajo',total,balance:0,status:'ENTREGADA',user:'Usuario'
});

class Repo implements SalesRepository{
 constructor(private rows:SalesRecord[]){}
 async list(period?:Period){return this.rows.filter(x=>(!period?.from||x.date>=new Date(period.from+'T00:00:00'))&&(!period?.to||x.date<=new Date(period.to+'T23:59:59')))}
 async getLastUpdated(){return new Date('2026-08-01T12:00:00')}
 getSourceLabel(){return 'test.xlsx'}
}

test('saldos por cliente concilian positivos, créditos y total del tablero',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  row(1,'Cliente A',100),row(2,'Cliente A',-20),row(3,'Cliente B',50),row(4,'Cliente C',-10)
 ]));
 const result=await service.overview({period:'all',comparison:'previous_equivalent'},'Agrupar clientes con deudas');
 const balances=result.balanceByCustomer;
 assert.equal(balances.grossPositiveBalance,130);
 assert.equal(balances.creditBalance,-10);
 assert.equal(balances.netBalance,120);
 assert.equal(balances.dashboardBalance,120);
 assert.equal(balances.reconciles,true);
 assert.equal(balances.debtorClients,2);
 assert.equal(balances.creditClients,1);
});

test('comparación mensual agrupa por cliente y producto antes de calcular la variación',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  monthlyRow('2026-07-05',1,'Cliente A','Vinilo',100),
  monthlyRow('2026-07-10',2,'Cliente A','Vinilo',50),
  monthlyRow('2026-07-12',3,'Cliente B','Folletos',80),
  monthlyRow('2026-08-05',4,'Cliente A','Vinilo',90),
  monthlyRow('2026-08-28',5,'Cliente C','Carteles',40)
 ]));
 const result=await service.overview({period:'all',comparison:'previous_equivalent'},'Revisar clientes y productos con variación negativa en agosto en comparación con julio');
 const comparison=result.monthlyComparison!;
 assert.deepEqual(comparison.currentPeriod,{from:'2026-08-01',to:'2026-08-28',complete:false});
 assert.deepEqual(comparison.previousPeriod,{from:'2026-07-01',to:'2026-07-28',complete:false});
 assert.equal(comparison.clients.decliningEntities,2);
	 assert.equal(comparison.clients.declines[0]!.name,'Cliente B');
	 assert.equal(comparison.clients.declines[0]!.difference,-80);
	 assert.equal(comparison.clients.declines[1]!.name,'Cliente A');
	 assert.equal(comparison.clients.declines[1]!.difference,-60);
 assert.equal(comparison.products.declines.find(x=>x.name==='Vinilo')?.variationPercent,-40);
});

test('productos de público general se calculan sólo con operaciones del segmento',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  monthlyRow('2026-08-05',1,'Cliente Particular','Vinilo',300),
  monthlyRow('2026-08-06',2,'Cliente Particular','Folletos',100),
  monthlyRow('2026-08-07',3,'IMPRENTA VENUS','Servicio de Impresión',900)
 ]));
 const result=await service.overview({period:'all',comparison:'previous_equivalent'},'¿Qué productos compra principalmente el público general?');
 assert.equal(result.customerSegments.publicGeneral.orders,2);
 assert.equal(result.customerSegments.publicGeneral.revenue,400);
 assert.deepEqual(result.customerSegments.publicGeneral.products.map(item=>item.name),['Vinilo','Folletos']);
 assert.equal(result.customerSegments.publicGeneral.products[0]!.sharePercent,75);
});

test('cuenta todas las operaciones de un segmento por debajo de un importe',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  monthlyRow('2026-08-05',1,'Cliente Particular','Vinilo',190),
  monthlyRow('2026-08-06',2,'Otro Particular','Folletos',6860),
  monthlyRow('2026-08-07',3,'Otro Particular','Carteles',12000),
  monthlyRow('2026-08-08',4,'IMPRENTA VENUS','Servicio de Impresión',500)
 ]));
 const result=await service.overview({period:'all',comparison:'previous_equivalent'},'cuantas operaciones hay del publico general con facturacion menor a $ 10000');
 assert.equal(result.segmentAmountAnalysis?.matchingOperations,2);
 assert.equal(result.segmentAmountAnalysis?.totalSegmentOperations,3);
 assert.equal(result.segmentAmountAnalysis?.matchingRevenue,7050);
 assert.equal(result.segmentAmountAnalysis?.matchingCustomers,2);
});

test('cuenta operaciones globales por debajo de un importe sin exigir segmento',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  monthlyRow('2026-08-05',1,'Cliente A','Vinilo',5000),
  monthlyRow('2026-08-06',2,'Cliente B','Folletos',9000),
  monthlyRow('2026-08-07',3,'IMPRENTA VENUS','Impresión',12000)
 ]));
 const result=await service.overview({period:'all',comparison:'none'},'cuántas órdenes hay menores a $10000 y cuál fue la facturación total');
 assert.equal(result.segmentAmountAnalysis?.segment,null);
 assert.equal(result.segmentAmountAnalysis?.label,'Todas las operaciones');
 assert.equal(result.segmentAmountAnalysis?.matchingOperations,2);
 assert.equal(result.segmentAmountAnalysis?.matchingRevenue,14000);
 assert.equal(result.segmentAmountAnalysis?.totalSegmentOperations,3);
});

test('los tres segmentos exponen indicadores operativos esenciales',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  monthlyRow('2026-08-05',1,'Cliente Particular','Vinilo',300),
  monthlyRow('2026-08-06',2,'IMPRENTA VENUS','Impresión',600),
  monthlyRow('2026-08-07',3,'MONRROY BELEN','Diseño',900)
 ]));
 const result=await service.overview({period:'all',comparison:'previous_equivalent'},'Comparar operaciones, facturación, clientes, ticket y saldo de cada segmento');
 assert.deepEqual(result.segmentOperations.map(item=>item.segment).sort(),['disenador','imprenta','publico']);
 for(const segment of result.segmentOperations){
  assert.equal(segment.operations,1);
  assert.equal(segment.activeCustomers,1);
  assert.equal(segment.averageTicket,segment.revenue);
  assert.ok(segment.availableMeasures.includes('productos principales'));
  assert.ok(segment.availableMeasures.includes('rangos por importe'));
 }
});

test('los rangos por importe funcionan para imprentas y diseñadores',async()=>{
 const rows=[monthlyRow('2026-08-05',1,'IMPRENTA VENUS','Impresión',500),monthlyRow('2026-08-06',2,'MONRROY BELEN','Diseño',700)];
 const printer=await new DecisionIntelligenceService(new Repo(rows)).overview({period:'all',comparison:'none'},'operaciones de imprentas menores a $1000');
 const designer=await new DecisionIntelligenceService(new Repo(rows)).overview({period:'all',comparison:'none'},'operaciones de diseñadores menores a $1000');
 assert.equal(printer.segmentAmountAnalysis?.matchingOperations,1);
 assert.equal(designer.segmentAmountAnalysis?.matchingOperations,1);
});

test('el umbral se toma de la pregunta actual y no de respuestas anteriores',async()=>{
 const service=new DecisionIntelligenceService(new Repo([monthlyRow('2026-08-05',1,'Cliente Particular','Vinilo',5000)]));
 const result=await service.overview({period:'all',comparison:'none'},'Rojas IA: mayor que $1\npublico general con facturacion menor a $10000, top 3');
 assert.equal(result.segmentAmountAnalysis?.operator,'lt');
 assert.equal(result.segmentAmountAnalysis?.threshold,10000);
 assert.equal(result.segmentAmountAnalysis?.matchingOperations,1);
});

test('combina el segmento declarado con producto y umbral dentro de la misma pregunta',async()=>{
 const service=new DecisionIntelligenceService(new Repo([
  monthlyRow('2026-08-05',1,'Cliente Particular','IMPRESION UV',7800),
  monthlyRow('2026-08-06',2,'Otro Particular','IMPRESION UV',5220),
  monthlyRow('2026-08-07',3,'Otro Particular','Stickers',500),
  monthlyRow('2026-08-08',4,'IMPRENTA VENUS','IMPRESION UV',4000)
 ]));
 const result=await service.overview({period:'all',comparison:'none'},'publico general\ny en impresion uv? facturacion menores a $10000');
 assert.equal(result.segmentAmountAnalysis?.product,'IMPRESION UV');
 assert.equal(result.segmentAmountAnalysis?.matchingOperations,2);
 assert.equal(result.segmentAmountAnalysis?.matchingRevenue,13020);
 assert.equal((result.segmentAmountAnalysis?.operations as unknown[]).length,2);
});
