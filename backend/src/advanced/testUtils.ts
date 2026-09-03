import type { Period,SalesRecord,SalesRepository } from '../repositories/types.js';

export const record=(date:string,total:number,overrides:Partial<SalesRecord>={}):SalesRecord=>({date:new Date(date+'T12:00:00'),pointOfSale:1,number:1,customer:'Cliente A',fantasyName:'Cliente A',deliveryDate:new Date(date+'T12:00:00'),product:'Producto A',work:'Trabajo',total,balance:0,status:'ENTREGADA',user:'USUARIO',...overrides});
export class TestSalesRepository implements SalesRepository{
 constructor(private rows:SalesRecord[]){}
 async list(period?:Period){return this.rows.filter(row=>(!period?.from||row.date>=new Date(period.from+'T00:00:00'))&&(!period?.to||row.date<=new Date(period.to+'T23:59:59')))}
 async getLastUpdated(){return new Date(Math.max(...this.rows.map(row=>row.date.getTime())))}
 getSourceLabel(){return 'test.xlsx'}
}

