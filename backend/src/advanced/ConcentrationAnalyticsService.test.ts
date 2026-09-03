import test from 'node:test';
import assert from 'node:assert/strict';
import { ConcentrationAnalyticsService } from './ConcentrationAnalyticsService.js';
import { record,TestSalesRepository } from './testUtils.js';

test('concentración conserva HHI/Pareto y agrega Gini y P95',async()=>{
 const service=new ConcentrationAnalyticsService(new TestSalesRepository([
  record('2026-01-05',80,{customer:'A',product:'X',balance:50}),record('2026-01-06',20,{customer:'B',product:'Y',balance:50})
 ]));
 const result=await service.analyze({period:'custom',from:'2026-01-01',to:'2026-01-31',comparison:'none'});
 assert.equal(result.customers.hhi10000,6800);
 assert.equal(result.customers.reusedExisting.hhi10000,6800);
 assert.equal(result.customers.gini,.3);
 assert.equal(result.customers.thresholds.p95,2);
 assert.equal(result.positiveBalance.hhi10000,5000);
});

