import type { Period, SalesRecord, SalesRepository } from '../repositories/types.js';
import { classifyCustomer } from './CustomerSegmentationService.js';

const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const sum=(rows:SalesRecord[],field:'total'|'balance')=>rows.reduce((total,row)=>total+row[field],0);
const includes=(value:string,query:string)=>value.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));
type SalesFilters={search?:string;status?:string;product?:string;user?:string;customerType?:'imprenta'|'disenador'|'publico';minTotal?:number;maxTotal?:number;period?:Period};
const filterSales=(source:SalesRecord[],filters:SalesFilters)=>{let rows=source;if(filters.search){const q=filters.search;rows=rows.filter(r=>includes(r.customer,q)||includes(r.fantasyName??'',q)||includes(r.work,q)||String(r.number).includes(q))}if(filters.status)rows=rows.filter(r=>r.status===filters.status);if(filters.product)rows=rows.filter(r=>r.product===filters.product);if(filters.user)rows=rows.filter(r=>r.user===filters.user);if(filters.customerType)rows=rows.filter(r=>classifyCustomer(r)===filters.customerType);if(filters.minTotal!==undefined)rows=rows.filter(r=>r.total>=filters.minTotal!);if(filters.maxTotal!==undefined)rows=rows.filter(r=>r.total<=filters.maxTotal!);return rows.sort((a,b)=>b.date.getTime()-a.date.getTime())};
const serializeSale=(r:SalesRecord)=>({date:iso(r.date),order:`${r.pointOfSale}-${r.number}`,customer:r.fantasyName||r.customer,legalName:r.customer,customerType:classifyCustomer(r),product:r.product,work:r.work,total:r.total,balance:r.balance,status:r.status,user:r.user,deliveryDate:iso(r.deliveryDate)});

export class DataExplorerService {
 constructor(private sales:SalesRepository){}
 async salesList(filters:SalesFilters&{page?:number;limit?:number}){
  const rows=filterSales(await this.sales.list(filters.period),filters),page=Math.max(1,filters.page??1),limit=Math.min(100,Math.max(10,filters.limit??50)),start=(page-1)*limit;
  return {total:rows.length,page,limit,pages:Math.ceil(rows.length/limit),summary:{revenue:sum(rows,'total'),balance:sum(rows,'balance'),averageTicket:rows.length?sum(rows,'total')/rows.length:0},filters:await this.filterOptions(),rows:rows.slice(start,start+limit).map(serializeSale)};
 }
 async salesExport(filters:SalesFilters){return filterSales(await this.sales.list(filters.period),filters).map(serializeSale)}
 async customers(period?:Period){const rows=await this.sales.list(period);const map=new Map<string,{name:string;fantasyName?:string;orders:number;revenue:number;balance:number;lastPurchase:Date;products:Set<string>}>();
  for(const r of rows){const current=map.get(r.customer)??{name:r.customer,fantasyName:r.fantasyName,orders:0,revenue:0,balance:0,lastPurchase:r.date,products:new Set<string>()};current.orders++;current.revenue+=r.total;current.balance+=r.balance;if(r.date>current.lastPurchase)current.lastPurchase=r.date;current.products.add(r.product);if(!current.fantasyName&&r.fantasyName)current.fantasyName=r.fantasyName;map.set(r.customer,current)}
  const items=[...map.values()].sort((a,b)=>b.revenue-a.revenue).map((c,index)=>({rank:index+1,name:c.fantasyName||c.name,legalName:c.name,orders:c.orders,revenue:c.revenue,balance:c.balance,lastPurchase:iso(c.lastPurchase),products:c.products.size,averageTicket:c.revenue/c.orders}));return {total:items.length,revenue:sum(rows,'total'),withBalance:items.filter(i=>i.balance>0).length,items};
 }
 async products(period?:Period){const rows=await this.sales.list(period);const map=new Map<string,{name:string;orders:number;revenue:number;balance:number;customers:Set<string>}>();for(const r of rows){const current=map.get(r.product)??{name:r.product,orders:0,revenue:0,balance:0,customers:new Set<string>()};current.orders++;current.revenue+=r.total;current.balance+=r.balance;current.customers.add(r.customer);map.set(r.product,current)}const totalRevenue=sum(rows,'total');const items=[...map.values()].sort((a,b)=>b.revenue-a.revenue).map((p,index)=>({rank:index+1,name:p.name,orders:p.orders,revenue:p.revenue,balance:p.balance,customers:p.customers.size,share:totalRevenue?p.revenue/totalRevenue*100:0,averageTicket:p.revenue/p.orders}));return {total:items.length,revenue:totalRevenue,items}}
 async analytics(period?:Period){const rows=await this.sales.list(period);const aggregate=(key:(r:SalesRecord)=>string,value:(r:SalesRecord)=>number=()=>1)=>{const map=new Map<string,number>();for(const r of rows)map.set(key(r),(map.get(key(r))??0)+value(r));return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)};return {source:this.sales.getSourceLabel(),records:rows.length,revenue:sum(rows,'total'),balance:sum(rows,'balance'),monthly:aggregate(r=>`${r.date.getFullYear()}-${String(r.date.getMonth()+1).padStart(2,'0')}`,r=>r.total).sort((a,b)=>a.name.localeCompare(b.name)),status:aggregate(r=>r.status),users:aggregate(r=>r.user,r=>r.total),ordersByUser:aggregate(r=>r.user),products:aggregate(r=>r.product,r=>r.total)}}
 async production(period?:Period,deliveryDate=iso(new Date())){
  const [rows,allRows]=await Promise.all([this.sales.list(period),this.sales.list()]);
  const referenceIso=deliveryDate,isClosed=(status:string)=>/(entreg|finaliz|complet|cancel)/i.test(status);
  const serialize=(r:SalesRecord)=>({order:`${r.pointOfSale}-${r.number}`,customer:r.fantasyName||r.customer,legalName:r.customer,product:r.product,work:r.work,entryDate:iso(r.date),deliveryDate:iso(r.deliveryDate),status:r.status,user:r.user,total:r.total,balance:r.balance,closed:isClosed(r.status)});
  const queue=rows.map(serialize).sort((a,b)=>a.deliveryDate.localeCompare(b.deliveryDate)||a.order.localeCompare(b.order));
  const dueToday=allRows.filter(r=>iso(r.deliveryDate)===referenceIso).map(serialize).sort((a,b)=>Number(a.closed)-Number(b.closed)||a.customer.localeCompare(b.customer));
  const open=queue.filter(r=>!r.closed),overdue=open.filter(r=>r.deliveryDate<referenceIso),withoutDelivery=open.filter(r=>!r.deliveryDate);
  const byStatus=[...new Map(queue.map(r=>r.status).map(status=>[status,queue.filter(r=>r.status===status).length]))].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const byUser=[...new Set(queue.map(r=>r.user))].map(name=>({name,value:queue.filter(r=>r.user===name).length})).sort((a,b)=>b.value-a.value);
  return {source:this.sales.getSourceLabel(),today:referenceIso,summary:{orders:queue.length,open:open.length,closed:queue.length-open.length,overdue:overdue.length,dueToday:dueToday.length,dueTodayOpen:dueToday.filter(r=>!r.closed).length,withoutDelivery:withoutDelivery.length},filters:{statuses:[...new Set(queue.map(r=>r.status))].sort(),users:[...new Set(queue.map(r=>r.user))].sort(),products:[...new Set(queue.map(r=>r.product))].sort()},byStatus,byUser,queue,dueToday};
 }
 private async filterOptions(){const rows=await this.sales.list();return {statuses:[...new Set(rows.map(r=>r.status))].sort(),products:[...new Set(rows.map(r=>r.product))].sort(),users:[...new Set(rows.map(r=>r.user))].sort()}}
}
