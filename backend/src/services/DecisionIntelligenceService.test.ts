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
