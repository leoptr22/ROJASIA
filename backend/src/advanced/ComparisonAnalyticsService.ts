import type { SalesRecord,SalesRepository } from '../repositories/types.js';
import { resolvePeriod,type PeriodQuery } from '../utils/period.js';
import type { AdvancedComparisonMode,AdvancedPeriods,MetricEvidence } from './AdvancedAnalyticsTypes.js';
import { filterPeriod,percentageChange,round } from './StatisticalUtils.js';

export type CustomComparison={currentFrom?:string;currentTo?:string;comparisonFrom?:string;comparisonTo?:string};
const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const latestDate=(rows:SalesRecord[])=>new Date(Math.max(...rows.map(row=>row.date.getTime())));
const monday=(date:Date)=>{const value=new Date(date.getFullYear(),date.getMonth(),date.getDate()),day=(value.getDay()+6)%7;value.setDate(value.getDate()-day);return value};
const shiftDays=(date:Date,days:number)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()+days);

export class ComparisonAnalyticsService{
 constructor(private sales:SalesRepository){}

 resolvePeriods(rows:SalesRecord[],query:PeriodQuery,mode:AdvancedComparisonMode='existing',custom:CustomComparison={}):AdvancedPeriods{
  if(!rows.length)throw new Error('No hay operaciones para comparar');
  if(mode==='existing'){const periods=resolvePeriod(rows,query);if(!periods.comparison)throw new Error('La comparación seleccionada es "none"');return{current:{from:periods.current.from!,to:periods.current.to!},comparison:{from:periods.comparison.from!,to:periods.comparison.to!}}}
  if(mode==='custom'){
   const{currentFrom,currentTo,comparisonFrom,comparisonTo}=custom;
   if(!currentFrom||!currentTo||!comparisonFrom||!comparisonTo)throw new Error('La comparación personalizada requiere cuatro fechas');
   if(currentFrom>currentTo||comparisonFrom>comparisonTo)throw new Error('Las fechas desde deben ser anteriores o iguales a las fechas hasta');
   return{current:{from:currentFrom,to:currentTo},comparison:{from:comparisonFrom,to:comparisonTo}};
  }
  const latest=latestDate(rows);
  if(mode==='previous_week'){const currentFrom=monday(latest),elapsed=Math.floor((latest.getTime()-currentFrom.getTime())/86400000),comparisonFrom=shiftDays(currentFrom,-7);return{current:{from:iso(currentFrom),to:iso(latest)},comparison:{from:iso(comparisonFrom),to:iso(shiftDays(comparisonFrom,elapsed))}}}
  if(mode==='previous_quarter'){const quarterStartMonth=Math.floor(latest.getMonth()/3)*3,currentFrom=new Date(latest.getFullYear(),quarterStartMonth,1),elapsed=Math.floor((latest.getTime()-currentFrom.getTime())/86400000),comparisonFrom=new Date(latest.getFullYear(),quarterStartMonth-3,1),comparisonEnd=new Date(latest.getFullYear(),quarterStartMonth,0),candidate=shiftDays(comparisonFrom,elapsed),comparisonTo=candidate>comparisonEnd?comparisonEnd:candidate;return{current:{from:iso(currentFrom),to:iso(latest)},comparison:{from:iso(comparisonFrom),to:iso(comparisonTo)}}}
  const currentFrom=new Date(latest.getFullYear(),0,1),comparisonFrom=new Date(latest.getFullYear()-1,0,1),comparisonTo=new Date(latest.getFullYear()-1,latest.getMonth(),latest.getDate());return{current:{from:iso(currentFrom),to:iso(latest)},comparison:{from:iso(comparisonFrom),to:iso(comparisonTo)}};
 }

 async compare(query:PeriodQuery,mode:AdvancedComparisonMode='existing',custom:CustomComparison={}){
  const rows=await this.sales.list(),periods=this.resolvePeriods(rows,query,mode,custom),current=filterPeriod(rows,periods.current),previous=filterPeriod(rows,periods.comparison),filters={mode,...query,...custom};
  const values=(periodRows:SalesRecord[])=>{const revenue=periodRows.reduce((total,row)=>total+row.total,0),orders=periodRows.length,balance=periodRows.reduce((total,row)=>total+row.balance,0);return{revenue,orders,averageTicket:orders?revenue/orders:0,balance,activeCustomers:new Set(periodRows.map(row=>row.customer)).size}};
  const currentValues=values(current),previousValues=values(previous),metric=<T extends keyof typeof currentValues>(key:T,sourceFields:string[],formula:string):MetricEvidence<{current:number;previous:number;absoluteChange:number;percentageChange:number|null}>=>({value:{current:round(currentValues[key]),previous:round(previousValues[key]),absoluteChange:round(currentValues[key]-previousValues[key]),percentageChange:percentageChange(currentValues[key],previousValues[key])===null?null:round(percentageChange(currentValues[key],previousValues[key])!)},period:periods.current,comparisonPeriod:periods.comparison,filters,recordsUsed:current.length,comparisonRecordsUsed:previous.length,sourceFields,formula,method:'Agregación determinística de operaciones dentro de dos rangos explícitos.',limitations:['Las operaciones representan registros comerciales, no unidades físicas.']});
  return{source:this.sales.getSourceLabel(),mode,periods,metrics:{revenue:metric('revenue',['Fecha','Total'],'SUM(Total); change = current - previous; change% = change / abs(previous) * 100'),orders:metric('orders',['Fecha','PV','Número'],'COUNT(operaciones); change = current - previous; change% = change / abs(previous) * 100'),averageTicket:metric('averageTicket',['Fecha','Total','PV','Número'],'SUM(Total) / COUNT(operaciones)'),balance:metric('balance',['Fecha','Saldo'],'SUM(Saldo); saldo registrado, no deuda vencida'),activeCustomers:metric('activeCustomers',['Fecha','Cliente'],'COUNT(DISTINCT Cliente)')}};
 }
}

