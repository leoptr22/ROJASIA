import type { SalesRecord,SalesRepository } from '../repositories/types.js';
import type { PeriodQuery } from '../utils/period.js';
import type { AdvancedComparisonMode,ContributionDimension,MetricEvidence } from './AdvancedAnalyticsTypes.js';
import { ComparisonAnalyticsService,type CustomComparison } from './ComparisonAnalyticsService.js';
import { filterPeriod,percentageChange,round } from './StatisticalUtils.js';

const dimensionValue=(row:SalesRecord,dimension:ContributionDimension)=>dimension==='customer'?row.customer:dimension==='product'?row.product:dimension==='user'?row.user:dimension==='status'?row.status:String(row.pointOfSale);
const dimensionLabel=(row:SalesRecord,dimension:ContributionDimension)=>dimension==='customer'?(row.fantasyName||row.customer):dimensionValue(row,dimension);

export class ContributionAnalyticsService{
 private comparisons:ComparisonAnalyticsService;
 constructor(private sales:SalesRepository){this.comparisons=new ComparisonAnalyticsService(sales)}

 async analyze(query:PeriodQuery,dimension:ContributionDimension,mode:AdvancedComparisonMode='existing',custom:CustomComparison={},limit=100):Promise<MetricEvidence<{dimension:ContributionDimension;currentValue:number;previousValue:number;totalChange:number;positiveContributions:number;negativeContributions:number;positive:unknown[];negative:unknown[]}>>{
  const rows=await this.sales.list(),periods=this.comparisons.resolvePeriods(rows,query,mode,custom),current=filterPeriod(rows,periods.current),previous=filterPeriod(rows,periods.comparison),map=new Map<string,{key:string;name:string;currentValue:number;previousValue:number}>();
  for(const [period,periodRows] of [['current',current],['previous',previous]] as const)for(const row of periodRows){const key=dimensionValue(row,dimension),item=map.get(key)??{key,name:dimensionLabel(row,dimension),currentValue:0,previousValue:0};item[period==='current'?'currentValue':'previousValue']+=row.total;map.set(key,item)}
  const currentValue=current.reduce((total,row)=>total+row.total,0),previousValue=previous.reduce((total,row)=>total+row.total,0),totalChange=currentValue-previousValue,items=[...map.values()].map(item=>{const absoluteContribution=item.currentValue-item.previousValue;return{...item,currentValue:round(item.currentValue),previousValue:round(item.previousValue),absoluteContribution:round(absoluteContribution),percentageChange:percentageChange(item.currentValue,item.previousValue)===null?null:round(percentageChange(item.currentValue,item.previousValue)!),contributionToTotalChange:totalChange===0?null:round(absoluteContribution/totalChange*100)}}),positive=items.filter(item=>item.absoluteContribution>0).sort((a,b)=>b.absoluteContribution-a.absoluteContribution),negative=items.filter(item=>item.absoluteContribution<0).sort((a,b)=>a.absoluteContribution-b.absoluteContribution);
  return{value:{dimension,currentValue:round(currentValue),previousValue:round(previousValue),totalChange:round(totalChange),positiveContributions:positive.length,negativeContributions:negative.length,positive:positive.slice(0,limit),negative:negative.slice(0,limit)},period:periods.current,comparisonPeriod:periods.comparison,filters:{dimension,mode,...query,...custom,limit},recordsUsed:current.length,comparisonRecordsUsed:previous.length,sourceFields:['Fecha','Total',dimension==='pointOfSale'?'PV':dimension==='customer'?'Cliente':dimension==='product'?'Producto':dimension==='user'?'Usuario':'Estado'],formula:'absoluteContribution = currentValue - previousValue; percentageChange = absoluteContribution / abs(previousValue) * 100; contributionToTotalChange = absoluteContribution / totalChange * 100',method:'Se agrupa la facturación de cada período por la dimensión elegida y se concilian los aportes contra el cambio neto.',limitations:['Una contribución describe composición matemática, no causalidad.','El porcentaje de contribución puede superar 100% cuando existen aportes de signos opuestos.']};
 }
}

