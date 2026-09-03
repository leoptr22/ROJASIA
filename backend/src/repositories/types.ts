export type Period = { from?: string; to?: string };
export interface SalesRecord { date:Date; pointOfSale:number; number:number; customer:string; fantasyName?:string; deliveryDate:Date; product:string; work:string; total:number; balance:number; status:string; user:string }
export interface ManagerialInsight { type:'positive'|'alert'|'opportunity'; title:string; detail:string }
export interface DashboardData { updatedAt:string; dataSource:'demo'|'xlsx'|'google_sheets'; sourceLabel:string; period:{from:string;to:string;previousFrom:string;previousTo:string}; recordCount:number; kpis:{ revenue:number; orders:number; averageTicket:number; outstanding:number; activeCustomers:number; revenueVariation:number; ordersVariation:number; averageTicketVariation:number; outstandingVariation:number; activeCustomersVariation:number }; salesTrend:{label:string;value:number}[]; topCustomers:{name:string;value:number}[]; topProducts:{name:string;value:number}[]; orderStatus:{name:string;value:number}[]; insights:ManagerialInsight[] }
export interface AnalyticsRepository { getDashboard(period?:Period):Promise<DashboardData> }
export interface SalesRepository { list(period?:Period):Promise<SalesRecord[]>; getLastUpdated():Promise<Date>; getSourceLabel():string }
export interface CustomerRepository { list():Promise<unknown[]> }
export interface ProductRepository { list():Promise<unknown[]> }
export interface InvoiceRepository { list():Promise<unknown[]> }
export interface ConfigurationRepository { get(key:string):Promise<string|undefined> }
