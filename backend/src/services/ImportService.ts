import crypto from 'node:crypto';
import { hashBuffer,parseSalesWorkbook } from '../importers/salesWorkbook.js';
import { persistentStorage } from './PersistentStorageService.js';
import type { SalesRecord } from '../repositories/types.js';

type Summary={sheetName:string;headers:string[];records:number;validRecords:number;errors:string[];errorCount:number;duplicates:number;dateFrom:string|null;dateTo:string|null;sample:{fecha:string;pv:number;numero:number;cliente:string;producto:string;total:number;saldo:number;estado:string;usuario:string}[]};
type PreviewMeta={hash:string;originalName:string;size:number;createdAt:number;summary:Summary;normalizedRecords?:SalesRecord[]};
type Preview=PreviewMeta&{buffer:Buffer};
type Manifest={hash?:string;normalizedKey?:string};

export class ImportService{
 private previews=new Map<string,Preview>();
 private lastCleanup=0;
 private summaryFor(parsed:Awaited<ReturnType<typeof parseSalesWorkbook>>):Summary{let min=Infinity,max=-Infinity;for(const record of parsed.records){const date=record.date.getTime();min=Math.min(min,date);max=Math.max(max,date)}return{sheetName:parsed.sheetName??'Hoja 1',headers:parsed.headers,records:parsed.records.length+parsed.errors.length,validRecords:parsed.records.length,errors:parsed.errors.slice(0,20),errorCount:parsed.errors.length,duplicates:parsed.duplicates,dateFrom:parsed.records.length?new Date(min).toISOString().slice(0,10):null,dateTo:parsed.records.length?new Date(max).toISOString().slice(0,10):null,sample:parsed.records.slice(0,5).map(record=>({fecha:record.date.toISOString().slice(0,10),pv:record.pointOfSale,numero:record.number,cliente:record.customer,producto:record.product,total:record.total,saldo:record.balance,estado:record.status,usuario:record.user}))}}
 async preview(buffer:Buffer,originalName:string,size:number){
  const [parsed,manifest]=await Promise.all([parseSalesWorkbook(buffer),persistentStorage.readJson<Manifest>('current.json').catch(()=>null),this.cleanup()]);if(!parsed.records.length)throw new Error('No se encontraron registros válidos');
  const token=crypto.randomUUID(),hash=hashBuffer(buffer),alreadyImported=manifest?.hash===hash,summary=this.summaryFor(parsed),meta={hash,originalName,size,createdAt:Date.now(),summary};
  const prepared={...meta,normalizedRecords:parsed.records};
  if(persistentStorage.isCloud())await Promise.all([persistentStorage.write(`previews/${token}.xlsx`,buffer,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),persistentStorage.writeJson(`previews/${token}.json`,prepared)]);else this.previews.set(token,{buffer,...prepared});
  return{token,hash,originalName,size,alreadyImported,...summary};
 }
 async confirm(token:string,username:string){
  await this.cleanup();let preview:Preview|undefined;
  if(persistentStorage.isCloud()){
   const [meta,file]=await Promise.all([persistentStorage.readJson<PreviewMeta>(`previews/${token}.json`),persistentStorage.read(`previews/${token}.xlsx`)]);if(meta&&file)preview={...meta,buffer:file.data};
  }else preview=this.previews.get(token);
  if(!preview)throw new Error('La previsualización venció. Volvé a seleccionar el archivo.');
  const normalizedKey=`datasets/${preview.hash}.json`;
  const records=preview.normalizedRecords??(await parseSalesWorkbook(preview.buffer)).records;
  const previous=await persistentStorage.readJson<Manifest>('current.json');
  await Promise.all([persistentStorage.write('current.xlsx',preview.buffer,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),persistentStorage.writeJson(normalizedKey,{schemaVersion:1,hash:preview.hash,records})]);
  await persistentStorage.writeJson('current.json',{hash:preview.hash,normalizedKey,originalName:preview.originalName,size:preview.size,records:preview.summary.validRecords,importedAt:new Date().toISOString(),username});
  if(previous?.normalizedKey&&previous.normalizedKey!==normalizedKey)await persistentStorage.remove(previous.normalizedKey).catch(()=>undefined);
  if(persistentStorage.isCloud())await persistentStorage.remove([`previews/${token}.xlsx`,`previews/${token}.json`]);else this.previews.delete(token);
  return{message:'Archivo importado y análisis actualizado',records:preview.summary.validRecords,originalName:preview.originalName};
 }
 private async cleanup(){
  const limit=Date.now()-15*60*1000;
  for(const[token,preview]of this.previews)if(preview.createdAt<limit)this.previews.delete(token);
  if(!persistentStorage.isCloud()||Date.now()-this.lastCleanup<5*60*1000)return;
  this.lastCleanup=Date.now();
  const files=await persistentStorage.list('previews/'),jsonFiles=files.filter(file=>file.key.endsWith('.json'));
  await Promise.all(jsonFiles.filter(file=>file.updatedAt.getTime()<limit).map(async file=>{const base=file.key.slice(0,-5);await persistentStorage.remove([file.key,`${base}.xlsx`])}));
 }
}

export const importService=new ImportService();
