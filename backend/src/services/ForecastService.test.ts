import test from 'node:test';
import assert from 'node:assert/strict';
import { ForecastService } from './ForecastService.js';
import { TestSalesRepository,record } from '../advanced/testUtils.js';

test('proyecta cada cliente por su propio patrón y no por un factor proporcional común',async()=>{
 const rows=[];
 for(let month=1;month<=6;month++){const date=`2026-${String(month).padStart(2,'0')}-28`;rows.push(record(date,month*100,{customer:'A',fantasyName:'A'}));rows.push(record(date,month%2?400:0,{customer:'B',fantasyName:'B'}))}
 const result=await new ForecastService(new TestSalesRepository(rows)).forecast(1),a=result.customers.find(item=>item.name==='A')!,b=result.customers.find(item=>item.name==='B')!;
 assert.notEqual(Number((a.projectedRevenue/a.revenue).toFixed(4)),Number((b.projectedRevenue/b.revenue).toFixed(4)));
 assert.ok(['promedio_movil_3','promedio_ponderado','tendencia_lineal'].includes(a.projectionMethod));
 assert.equal(result.individualProjection.reconciledToGeneralForecast,false);
});

test('incluye meses sin compras y marca baja confianza con cinco meses',async()=>{
 const rows=[record('2026-01-28',100,{customer:'A',fantasyName:'A'}),record('2026-02-28',10,{customer:'B',fantasyName:'B'}),record('2026-03-28',10,{customer:'B',fantasyName:'B'}),record('2026-04-28',10,{customer:'B',fantasyName:'B'}),record('2026-05-31',10,{customer:'B',fantasyName:'B'})];
 const result=await new ForecastService(new TestSalesRepository(rows)).forecast(1),a=result.customers.find(item=>item.name==='A')!;
 assert.equal(a.historyMonths,5);assert.equal(a.activeMonths,1);assert.equal(a.projectionConfidence,'baja');assert.equal(a.projectionMethod,'promedio_mensual_con_ceros');assert.equal(a.projectedRevenue,20);
});
