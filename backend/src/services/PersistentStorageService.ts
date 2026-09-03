import fs from 'node:fs/promises';
import path from 'node:path';
import { del,get,list,put } from '@vercel/blob';

export type StoredObject={data:Buffer;version:string;updatedAt:Date};

const blobEnabled=()=>Boolean(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID);
const safeKey=(key:string)=>{
 const normalized=key.replaceAll('\\','/').replace(/^\/+/, '');
 if(!normalized||normalized.split('/').some(part=>part==='..'))throw new Error('Clave de almacenamiento inválida');
 return normalized;
};
const localPath=(key:string)=>path.resolve(process.cwd(),'data',safeKey(key));

export class PersistentStorageService{
 isCloud(){return blobEnabled()}
 async read(key:string):Promise<StoredObject|null>{
  const normalized=safeKey(key);
  if(blobEnabled()){
   const result=await get(`rojas-intelligence/${normalized}`,{access:'private',useCache:false});
   if(!result||result.statusCode!==200)return null;
   return{data:Buffer.from(await new Response(result.stream).arrayBuffer()),version:result.blob.etag,updatedAt:result.blob.uploadedAt};
  }
  try{const file=localPath(normalized),[data,stats]=await Promise.all([fs.readFile(file),fs.stat(file)]);return{data,version:String(stats.mtimeMs),updatedAt:stats.mtime}}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error}
 }
 async write(key:string,data:Buffer|string,contentType?:string){
  const normalized=safeKey(key);
  if(blobEnabled()){await put(`rojas-intelligence/${normalized}`,data,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType,cacheControlMaxAge:60});return}
  const file=localPath(normalized);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);
 }
 async remove(keys:string|string[]){
  const normalized=(Array.isArray(keys)?keys:[keys]).map(safeKey);
  if(blobEnabled()){await del(normalized.map(key=>`rojas-intelligence/${key}`));return}
  await Promise.all(normalized.map(key=>fs.rm(localPath(key),{force:true})));
 }
 async list(prefix:string){
  const normalized=safeKey(prefix);
  if(blobEnabled()){const result=await list({prefix:`rojas-intelligence/${normalized}`,limit:1000});return result.blobs.map(blob=>({key:blob.pathname.replace(/^rojas-intelligence\//,''),updatedAt:blob.uploadedAt}))}
  const folder=localPath(normalized);try{return(await fs.readdir(folder,{withFileTypes:true})).filter(entry=>entry.isFile()).map(entry=>({key:`${normalized.replace(/\/$/,'')}/${entry.name}`,updatedAt:new Date(0)}))}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return[];throw error}
 }
 async readJson<T>(key:string):Promise<T|null>{const stored=await this.read(key);if(!stored)return null;return JSON.parse(stored.data.toString('utf8')) as T}
 async writeJson(key:string,value:unknown){await this.write(key,JSON.stringify(value,null,2),'application/json')}
}

export const persistentStorage=new PersistentStorageService();
