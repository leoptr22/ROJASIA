import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { parseSalesWorkbook } from '../importers/salesWorkbook.js';
import { persistentStorage } from '../services/PersistentStorageService.js';
import type { Period,SalesRecord,SalesRepository } from './types.js';

type Manifest={originalName?:string;importedAt?:string};

export class XlsxSalesRepository implements SalesRepository{
 private lastSourceLabel='Sin archivo';
 private cachedVersion='';
 private cachedRecords:SalesRecord[]=[];
 private updatedAt=new Date(0);
 private async loadCurrent(){
  const stored=await persistentStorage.read('current.xlsx');
  if(stored){
   const manifest=await persistentStorage.readJson<Manifest>('current.json').catch(()=>null);this.lastSourceLabel=manifest?.originalName||'current.xlsx';
   return{buffer:stored.data,version:stored.version,updatedAt:stored.updatedAt};
  }
  if(!env.EXCEL_FILE_PATH)throw new Error('Todavía no se cargó un archivo Excel');
  const stats=await fs.stat(env.EXCEL_FILE_PATH);this.lastSourceLabel=path.basename(env.EXCEL_FILE_PATH);return{buffer:await fs.readFile(env.EXCEL_FILE_PATH),version:`${env.EXCEL_FILE_PATH}:${stats.mtimeMs}`,updatedAt:stats.mtime};
 }
 async list(period?:Period):Promise<SalesRecord[]>{
  const current=await this.loadCurrent();
  if(this.cachedVersion!==current.version){this.cachedRecords=(await parseSalesWorkbook(current.buffer)).records;this.cachedVersion=current.version;this.updatedAt=current.updatedAt}
  if(!period?.from&&!period?.to)return this.cachedRecords;
  const from=period.from?new Date(`${period.from}T00:00:00`):new Date(-8640000000000000),to=period.to?new Date(`${period.to}T23:59:59`):new Date(8640000000000000);return this.cachedRecords.filter(record=>record.date>=from&&record.date<=to);
 }
 async getLastUpdated(){if(!this.cachedVersion)await this.list();return this.updatedAt}
 getSourceLabel(){return this.lastSourceLabel}
}
