import test from 'node:test';
import assert from 'node:assert/strict';
import { AdvancedCustomerAnalyticsService } from './AdvancedCustomerAnalyticsService.js';
import { record,TestSalesRepository } from './testUtils.js';

test('clientes avanzados calculan recencia relativa, frecuencia, mediana y scores explicables',async()=>{
 const service=new AdvancedCustomerAnalyticsService(new TestSalesRepository([
  record('2026-01-01',50,{number:1}),record('2026-01-11',50,{number:2}),record('2026-02-10',100,{number:3,balance:20})
 ]));
 const result=await service.analyze({period:'custom',from:'2026-02-01',to:'2026-02-28',comparison:'previous_month'}),customer=result.customers[0]!;
 assert.equal(customer.daysSinceLastPurchase,18);
 assert.equal(customer.averagePurchaseIntervalDays,20);
 assert.equal(customer.medianPurchaseIntervalDays,20);
 assert.equal(customer.recencyRatio,.9);
 assert.equal(customer.medianTicket,100);
 assert.ok(customer.customerValueScore.value>=0&&customer.customerValueScore.value<=100);
 assert.ok(customer.customerAttentionScore.value>=0&&customer.customerAttentionScore.value<=100);
 assert.match(customer.customerAttentionScore.warning,/no es riesgo crediticio/i);
});

test('clientes nuevos y recuperados incluyen métricas previas y posteriores',async()=>{
 const service=new AdvancedCustomerAnalyticsService(new TestSalesRepository([
  record('2025-12-01',50,{customer:'A',product:'Anterior'}),
  record('2026-04-05',100,{customer:'A',product:'Regreso'}),
  record('2026-04-06',80,{customer:'B',product:'Primera compra'})
 ]));
 const result=await service.analyze({period:'custom',from:'2026-04-01',to:'2026-04-30',comparison:'previous_month'},{inactiveDays:90});
 assert.equal(result.newCustomers.count,1);
 assert.equal(result.newCustomers.revenue,80);
 assert.equal(result.recoveredCustomers.count,1);
 assert.equal(result.recoveredCustomers.details[0]!.revenueBeforeReturn,50);
 assert.equal(result.recoveredCustomers.details[0]!.revenueAfterReturn,100);
 assert.deepEqual(result.recoveredCustomers.details[0]!.productsAfterReturn,['Regreso']);
});
