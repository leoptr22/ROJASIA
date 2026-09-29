import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { parseSalesWorkbook } from '../importers/salesWorkbook.js';
import { persistentStorage } from '../services/PersistentStorageService.js';
import type { Period,SalesRecord,SalesRepository } from './types.js';

type Manifest={originalName?:string;importedAt?:string;hash?:string;normalizedKey?:string};
type Prepared={schemaVersion:number;hash:string;records:(Omit<SalesRecord,'date'|'deliveryDate'>&{date:string;deliveryDate:string})[]};

export class XlsxSalesRepository implements SalesRepository{
 private lastSourceLabel='Sin archivo';
 private cachedVersion='';
 private cachedRecords:SalesRecord[]=[];
 private updatedAt=new Date(0);
 private loading:Promise<void>|null=null;
 private async refresh(){
  const manifest=await persistentStorage.readJson<Manifest>('current.json');
  if(manifest?.hash&&this.cachedVersion===manifest.hash)return;
  if(manifest?.normalizedKey){
   const prepared=await persistentStorage.readJson<Prepared>(manifest.normalizedKey);
   if(prepared?.schemaVersion===1&&prepared.hash===manifest.hash){
    this.cachedRecords=prepared.records.map(record=>({...record,date:new Date(record.date),deliveryDate:new Date(record.deliveryDate)}));
    this.cachedVersion=prepared.hash;this.updatedAt=new Date(manifest.importedAt??0);this.lastSourceLabel=manifest.originalName||'current.xlsx';return;
   }
  }
  const current=await this.loadCurrent();
  const version=manifest?.hash??current.version;
  if(this.cachedVersion!==version){this.cachedRecords=(await parseSalesWorkbook(current.buffer)).records;this.cachedVersion=version;this.updatedAt=current.updatedAt}
 }
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
  if(!this.loading)this.loading=this.refresh().finally(()=>{this.loading=null});
  await this.loading;
  if(!period?.from&&!period?.to)return this.cachedRecords;
  const from=period.from?new Date(`${period.from}T00:00:00`):new Date(-8640000000000000),to=period.to?new Date(`${period.to}T23:59:59`):new Date(8640000000000000);return this.cachedRecords.filter(record=>record.date>=from&&record.date<=to);
 }
 async getLastUpdated(){if(!this.cachedVersion)await this.list();return this.updatedAt}
 getSourceLabel(){return this.lastSourceLabel}
}
