import test from 'node:test';
import assert from 'node:assert/strict';
import { ComparisonAnalyticsService } from './ComparisonAnalyticsService.js';
import { record,TestSalesRepository } from './testUtils.js';

test('comparación personalizada devuelve cambio absoluto y porcentual conciliados',async()=>{
 const service=new ComparisonAnalyticsService(new TestSalesRepository([
  record('2026-01-05',100),record('2026-02-05',150),record('2026-02-06',50,{customer:'Cliente B'})
 ]));
 const result=await service.compare({period:'all',comparison:'none'},'custom',{currentFrom:'2026-02-01',currentTo:'2026-02-28',comparisonFrom:'2026-01-01',comparisonTo:'2026-01-31'});
 assert.deepEqual(result.metrics.revenue.value,{current:200,previous:100,absoluteChange:100,percentageChange:100});
 assert.deepEqual(result.metrics.orders.value,{current:2,previous:1,absoluteChange:1,percentageChange:100});
 assert.equal(result.metrics.activeCustomers.value.current,2);
});

test('semana contra semana usa días equivalentes hasta la última fecha disponible',async()=>{
 const service=new ComparisonAnalyticsService(new TestSalesRepository([record('2026-08-17',10),record('2026-08-24',20),record('2026-08-26',30)]));
 const result=await service.compare({period:'all',comparison:'none'},'previous_week');
 assert.deepEqual(result.periods.current,{from:'2026-08-24',to:'2026-08-26'});
 assert.deepEqual(result.periods.comparison,{from:'2026-08-17',to:'2026-08-19'});
});

test('trimestre y año calendario respetan cortes equivalentes',async()=>{
 const service=new ComparisonAnalyticsService(new TestSalesRepository([record('2025-01-01',10),record('2025-04-01',10),record('2026-05-15',20)]));
 const quarter=await service.compare({period:'all',comparison:'none'},'previous_quarter');
 assert.deepEqual(quarter.periods.current,{from:'2026-04-01',to:'2026-05-15'});
 assert.deepEqual(quarter.periods.comparison,{from:'2026-01-01',to:'2026-02-14'});
 const year=await service.compare({period:'all',comparison:'none'},'previous_calendar_year');
 assert.deepEqual(year.periods.current,{from:'2026-01-01',to:'2026-05-15'});
 assert.deepEqual(year.periods.comparison,{from:'2025-01-01',to:'2025-05-15'});
});
