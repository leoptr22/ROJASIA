import { env } from '../config/env.js';
import { XlsxSalesRepository } from './XlsxSalesRepository.js';
import type { Period, SalesRecord, SalesRepository } from './types.js';
class UnconfiguredSalesRepository implements SalesRepository{
 async list(_period?:Period):Promise<SalesRecord[]>{throw new Error(`La fuente ${env.DATA_SOURCE} todavía no está configurada para análisis real`)}
 async getLastUpdated(){return new Date()}
 getSourceLabel(){return env.DATA_SOURCE}
}
export const salesRepository:SalesRepository=env.DATA_SOURCE==='xlsx'?new XlsxSalesRepository():new UnconfiguredSalesRepository();
