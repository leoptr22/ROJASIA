import type { Period, SalesRecord, SalesRepository } from '../repositories/types.js';

const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const sum=(rows:SalesRecord[],field:'total'|'balance')=>rows.reduce((total,row)=>total+row[field],0);
const includes=(value:string,query:string)=>value.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));

export class DataExplorerService {
 constructor(private sales:SalesRepository){}
 async salesList(filters:{search?:string;status?:string;product?:string;user?:string;page?:number;limit?:number;period?:Period}){
  let rows=await this.sales.list(filters.period);
  if(filters.search){const q=filters.search;rows=rows.filter(r=>includes(r.customer,q)||includes(r.fantasyName??'',q)||includes(r.work,q)||String(r.number).includes(q))}
  if(filters.status)rows=rows.filter(r=>r.status===filters.status);if(filters.product)rows=rows.filter(r=>r.product===filters.product);if(filters.user)rows=rows.filter(r=>r.user===filters.user);
  rows.sort((a,b)=>b.date.getTime()-a.date.getTime());const page=Math.max(1,filters.page??1),limit=Math.min(100,Math.max(10,filters.limit??50)),start=(page-1)*limit;
  return {total:rows.length,page,limit,pages:Math.ceil(rows.length/limit),summary:{revenue:sum(rows,'total'),balance:sum(rows,'balance'),averageTicket:rows.length?sum(rows,'total')/rows.length:0},filters:await this.filterOptions(),rows:rows.slice(start,start+limit).map(r=>({date:iso(r.date),order:`${r.pointOfSale}-${r.number}`,customer:r.fantasyName||r.customer,legalName:r.customer,product:r.product,work:r.work,total:r.total,balance:r.balance,status:r.status,user:r.user,deliveryDate:iso(r.deliveryDate)}))};
 }
 async customers(period?:Period){const rows=await this.sales.list(period);const map=new Map<string,{name:string;fantasyName?:string;orders:number;revenue:number;balance:number;lastPurchase:Date;products:Set<string>}>();
  for(const r of rows){const current=map.get(r.customer)??{name:r.customer,fantasyName:r.fantasyName,orders:0,revenue:0,balance:0,lastPurchase:r.date,products:new Set<string>()};current.orders++;current.revenue+=r.total;current.balance+=r.balance;if(r.date>current.lastPurchase)current.lastPurchase=r.date;current.products.add(r.product);if(!current.fantasyName&&r.fantasyName)current.fantasyName=r.fantasyName;map.set(r.customer,current)}
  const items=[...map.values()].sort((a,b)=>b.revenue-a.revenue).map((c,index)=>({rank:index+1,name:c.fantasyName||c.name,legalName:c.name,orders:c.orders,revenue:c.revenue,balance:c.balance,lastPurchase:iso(c.lastPurchase),products:c.products.size,averageTicket:c.revenue/c.orders}));return {total:items.length,revenue:sum(rows,'total'),withBalance:items.filter(i=>i.balance>0).length,items};
 }
 async products(period?:Period){const rows=await this.sales.list(period);const map=new Map<string,{name:string;orders:number;revenue:number;balance:number;customers:Set<string>}>();for(const r of rows){const current=map.get(r.product)??{name:r.product,orders:0,revenue:0,balance:0,customers:new Set<string>()};current.orders++;current.revenue+=r.total;current.balance+=r.balance;current.customers.add(r.customer);map.set(r.product,current)}const totalRevenue=sum(rows,'total');const items=[...map.values()].sort((a,b)=>b.revenue-a.revenue).map((p,index)=>({rank:index+1,name:p.name,orders:p.orders,revenue:p.revenue,balance:p.balance,customers:p.customers.size,share:totalRevenue?p.revenue/totalRevenue*100:0,averageTicket:p.revenue/p.orders}));return {total:items.length,revenue:totalRevenue,items}}
 async analytics(period?:Period){const rows=await this.sales.list(period);const aggregate=(key:(r:SalesRecord)=>string,value:(r:SalesRecord)=>number=()=>1)=>{const map=new Map<string,number>();for(const r of rows)map.set(key(r),(map.get(key(r))??0)+value(r));return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)};return {source:this.sales.getSourceLabel(),records:rows.length,revenue:sum(rows,'total'),balance:sum(rows,'balance'),monthly:aggregate(r=>`${r.date.getFullYear()}-${String(r.date.getMonth()+1).padStart(2,'0')}`,r=>r.total).sort((a,b)=>a.name.localeCompare(b.name)),status:aggregate(r=>r.status),users:aggregate(r=>r.user,r=>r.total),ordersByUser:aggregate(r=>r.user),products:aggregate(r=>r.product,r=>r.total)}}
 private async filterOptions(){const rows=await this.sales.list();return {statuses:[...new Set(rows.map(r=>r.status))].sort(),products:[...new Set(rows.map(r=>r.product))].sort(),users:[...new Set(rows.map(r=>r.user))].sort()}}
}
