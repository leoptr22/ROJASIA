import test from 'node:test';
import assert from 'node:assert/strict';
import { ContributionAnalyticsService } from './ContributionAnalyticsService.js';
import { record,TestSalesRepository } from './testUtils.js';

test('contribuciones positivas y negativas explican el cambio neto',async()=>{
 const service=new ContributionAnalyticsService(new TestSalesRepository([
  record('2026-01-05',100,{customer:'A'}),record('2026-02-05',50,{customer:'A'}),record('2026-02-06',100,{customer:'B'})
 ]));
 const result=await service.analyze({period:'all',comparison:'none'},'customer','custom',{currentFrom:'2026-02-01',currentTo:'2026-02-28',comparisonFrom:'2026-01-01',comparisonTo:'2026-01-31'});
 assert.equal(result.value.totalChange,50);
 assert.equal((result.value.positive[0] as any).absoluteContribution,100);
 assert.equal((result.value.positive[0] as any).contributionToTotalChange,200);
 assert.equal((result.value.negative[0] as any).absoluteContribution,-50);
 assert.equal((result.value.negative[0] as any).contributionToTotalChange,-100);
});

