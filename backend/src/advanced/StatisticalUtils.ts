import type { Period,SalesRecord } from '../repositories/types.js';

export const round=(value:number,digits=2)=>{const factor=10**digits;return Math.round(value*factor)/factor};
export const sum=(values:number[])=>values.reduce((total,value)=>total+value,0);
export const mean=(values:number[])=>values.length?sum(values)/values.length:0;
export const median=(values:number[])=>percentile(values,.5);
export const percentile=(values:number[],p:number)=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*Math.min(1,Math.max(0,p)),lower=Math.floor(index),upper=Math.ceil(index);return sorted[lower]!+(sorted[upper]!-sorted[lower]!)*(index-lower)};
export const standardDeviation=(values:number[])=>{if(!values.length)return 0;const average=mean(values);return Math.sqrt(mean(values.map(value=>(value-average)**2)))};
export const coefficientOfVariation=(values:number[])=>{const average=mean(values);return average?standardDeviation(values)/Math.abs(average):null};
export const percentageChange=(current:number,previous:number)=>previous===0?null:(current-previous)/Math.abs(previous)*100;
export const daysBetween=(later:Date,earlier:Date)=>Math.max(0,Math.floor((later.getTime()-earlier.getTime())/86400000));
export const periodDays=(period:Required<Period>)=>daysBetween(new Date(period.to+'T00:00:00'),new Date(period.from+'T00:00:00'))+1;
export const filterPeriod=(rows:SalesRecord[],period:Required<Period>)=>{const from=new Date(period.from+'T00:00:00'),to=new Date(period.to+'T23:59:59');return rows.filter(row=>row.date>=from&&row.date<=to)};
export const percentileRank=(value:number,values:number[],reverse=false)=>{if(!values.length)return 0;const rank=values.filter(item=>item<=value).length/values.length*100;return reverse?100-rank:rank};
export const gini=(values:number[])=>{const sorted=values.filter(value=>value>=0).sort((a,b)=>a-b),total=sum(sorted);if(!sorted.length||!total)return 0;const weighted=sorted.reduce((acc,value,index)=>acc+(index+1)*value,0);return (2*weighted)/(sorted.length*total)-(sorted.length+1)/sorted.length};
export const concentration=(values:number[])=>{const positive=values.filter(value=>value>0).sort((a,b)=>b-a),total=sum(positive),shares=positive.map(value=>value/total),top=(count:number)=>sum(shares.slice(0,count))*100;return{entities:positive.length,total,shares,hhiNormalized:sum(shares.map(share=>share**2)),hhi10000:sum(shares.map(share=>(share*100)**2)),gini:gini(positive),top:{top1:top(1),top5:top(5),top10:top(10),top20:top(20)}}};
export const normalizeWeights=<T extends Record<string,number>>(weights:T)=>{const total=sum(Object.values(weights));if(total<=0)throw new Error('La suma de los pesos debe ser mayor que cero');return Object.fromEntries(Object.entries(weights).map(([key,value])=>[key,value/total])) as T};

