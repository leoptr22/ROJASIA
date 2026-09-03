import type { SalesRecord,SalesRepository } from '../repositories/types.js';
import { ClientIntelligenceService } from '../services/ClientIntelligenceService.js';
import { resolvePeriod,type PeriodQuery } from '../utils/period.js';
import { concentration,filterPeriod,round } from './StatisticalUtils.js';

const groupedValues=(rows:SalesRecord[],key:(row:SalesRecord)=>string,value:(row:SalesRecord)=>number)=>{const map=new Map<string,number>();for(const row of rows)map.set(key(row),(map.get(key(row))??0)+value(row));return[...map].map(([name,amount])=>({name,value:amount})).sort((a,b)=>b.value-a.value)};
const withShares=(items:{name:string;value:number}[])=>{const total=items.reduce((sum,item)=>sum+Math.max(0,item.value),0),stats=concentration(items.map(item=>item.value)),ranked=items.filter(item=>item.value>0).map((item,index)=>({rank:index+1,name:item.name,value:round(item.value),share:total?round(item.value/total*100):0,cumulative:total?round(items.slice(0,index+1).reduce((sum,current)=>sum+Math.max(0,current.value),0)/total*100):0})),reach=(percentage:number)=>ranked.find(item=>item.cumulative>=percentage)?.rank??0;return{entities:stats.entities,total:round(stats.total),hhiNormalized:round(stats.hhiNormalized,6),hhi10000:round(stats.hhi10000),gini:round(stats.gini,6),thresholds:{p50:reach(50),p80:reach(80),p90:reach(90),p95:reach(95)},top:{top1:round(stats.top.top1),top5:round(stats.top.top5),top10:round(stats.top.top10),top20:round(stats.top.top20)},ranking:ranked}};

export class ConcentrationAnalyticsService{
 private existing:ClientIntelligenceService;
 constructor(private sales:SalesRepository){this.existing=new ClientIntelligenceService(sales)}

 async analyze(query:PeriodQuery,rankingLimit=100){
  const all=await this.sales.list(),periods=resolvePeriod(all,query),current=filterPeriod(all,{from:periods.current.from!,to:periods.current.to!}),existing=await this.existing.summary(query),customers=withShares(groupedValues(current,row=>row.customer,row=>row.total)),products=withShares(groupedValues(current,row=>row.product,row=>row.total)),customerBalances=groupedValues(current,row=>row.customer,row=>row.balance),positiveBalance=withShares(customerBalances.filter(item=>item.value>0));
  const limit=Math.min(1000,Math.max(1,rankingLimit));
  return{source:this.sales.getSourceLabel(),period:{from:periods.current.from!,to:periods.current.to!},comparisonPeriod:periods.comparison?{from:periods.comparison.from!,to:periods.comparison.to!}:null,filters:{...query,rankingLimit:limit},recordsUsed:current.length,customers:{...customers,ranking:customers.ranking.slice(0,limit),reusedExisting:{hhi10000:round(existing.totals.hhi),thresholds:existing.pareto.thresholds,top:existing.pareto.top},evidence:{sourceFields:['Cliente','Total'],formula:'HHI = SUM(share_i²); Gini sobre facturación no negativa; Pareto sobre participación acumulada.',method:'El HHI y Pareto existentes se conservan; se agrega Gini y P95.',limitations:['No constituye un diagnóstico automático.']}},products:{...products,ranking:products.ranking.slice(0,limit),evidence:{sourceFields:['Producto','Total'],formula:'HHI = SUM(productRevenueShare²); Gini sobre facturación no negativa.',method:'Concentración determinística por producto.',limitations:['No constituye un diagnóstico automático.']}},positiveBalance:{...positiveBalance,ranking:positiveBalance.ranking.slice(0,limit),evidence:{sourceFields:['Cliente','Saldo'],formula:'Primero SUM(Saldo) por cliente; luego se conservan saldos netos positivos y se calcula HHI/Gini.',method:'Concentración del saldo registrado positivo neto por cliente.',limitations:['Saldo positivo no implica mora ni vencimiento.']}}};
 }
}

