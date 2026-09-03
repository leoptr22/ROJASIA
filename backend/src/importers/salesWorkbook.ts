import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import type { SalesRecord } from '../repositories/types.js';

export const requiredColumns=['Fecha','PV','Número','Cliente','Fecha Entrega','Producto','Trabajo','Total','Saldo','Estado','Usuario'];
const aliases:Record<keyof SalesRecord,string[]>={date:['fecha'],pointOfSale:['pv','punto de venta','punto_venta'],number:['numero','número'],customer:['cliente'],fantasyName:['nombre fantasia','nombre fantasía'],deliveryDate:['fecha entrega','fecha_entrega'],product:['producto'],work:['trabajo','descripcion','descripción'],total:['total','importe'],balance:['saldo'],status:['estado'],user:['usuario']};
const normalizeHeader=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const excelDate=(value:unknown)=>{if(value instanceof Date)return value;if(typeof value==='number'){const epoch=new Date(1899,11,30);return new Date(epoch.getTime()+value*86400000)}const parsed=new Date(String(value));if(Number.isNaN(parsed.getTime()))throw new Error(`Fecha inválida: ${String(value)}`);return parsed};
const amount=(value:unknown)=>{if(typeof value==='number')return value;const normalized=String(value??'0').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const parsed=Number(normalized);if(!Number.isFinite(parsed))throw new Error(`Importe inválido: ${String(value)}`);return parsed};
const plainValue=(value:ExcelJS.CellValue):unknown=>{if(value===null||value===undefined||typeof value!=='object'||value instanceof Date)return value;if('result'in value)return value.result;if('richText'in value)return value.richText.map(part=>part.text).join('');if('text'in value)return value.text;return String(value)};
export const hashBuffer=(buffer:Buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');

export async function parseSalesWorkbook(buffer:Buffer){
 const workbook=new ExcelJS.Workbook(),isXlsx=buffer[0]===0x50&&buffer[1]===0x4b;
 if(isXlsx)await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
 else{const firstLine=buffer.toString('utf8',0,Math.min(buffer.length,4096)).split(/\r?\n/,1)[0]??'',delimiter=(firstLine.match(/;/g)?.length??0)>(firstLine.match(/,/g)?.length??0)?';':',';await workbook.csv.read(Readable.from(buffer),{parserOptions:{delimiter}})}
 const sheet=workbook.worksheets[0];if(!sheet)throw new Error('El archivo no contiene hojas');
 const errors:string[]=[],records:SalesRecord[]=[],keys=new Set<string>();
 let headers:string[]=[],headerRow=0,duplicates=0;
 let columns:Record<keyof SalesRecord,number>;
 sheet.eachRow({includeEmpty:false},(row,rowNumber)=>{
  if(!headerRow){
   const values=(row.values as ExcelJS.CellValue[]).slice(1).map(plainValue);
   if(!values.some(value=>normalizeHeader(value)==='fecha'))return;
   headers=Array.from(values,value=>String(value??'').trim());
   const normalized=headers.map(normalizeHeader),missing=requiredColumns.filter(column=>!normalized.includes(normalizeHeader(column)));
   if(missing.length)throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`);
   columns=Object.fromEntries(Object.entries(aliases).map(([field,names])=>[field,normalized.findIndex(header=>names.includes(header))+1])) as Record<keyof SalesRecord,number>;
   headerRow=rowNumber;return;
  }
  // Read only the required columns; do not copy the entire sheet or formatted empty cells.
  let hasData=false;row.eachCell({includeEmpty:false},cell=>{const value=plainValue(cell.value);if(value!=null&&String(value).trim()!=='')hasData=true});
  if(!hasData)return;
  const valueFor=(key:keyof SalesRecord)=>columns[key]?plainValue(row.getCell(columns[key]).value):undefined;
  try{
   const record:SalesRecord={date:excelDate(valueFor('date')),pointOfSale:Number(valueFor('pointOfSale')),number:Number(valueFor('number')),customer:String(valueFor('customer')??'').trim(),fantasyName:String(valueFor('fantasyName')??'').trim()||undefined,deliveryDate:excelDate(valueFor('deliveryDate')),product:String(valueFor('product')??'Sin producto').trim(),work:String(valueFor('work')??'').replace(/_x000D_/g,'\n').trim(),total:amount(valueFor('total')),balance:amount(valueFor('balance')),status:String(valueFor('status')??'SIN ESTADO').trim().toUpperCase(),user:String(valueFor('user')??'SIN USUARIO').trim().toUpperCase()};
   const key=`${record.pointOfSale}:${record.number}`;if(keys.has(key))duplicates++;else keys.add(key);records.push(record);
  }catch(error){errors.push(`Fila ${rowNumber}: ${error instanceof Error?error.message:'error desconocido'}`)}
 });
 if(!headerRow)throw new Error('No se encontró una fila de encabezados con la columna Fecha');
 return{sheetName:sheet.name,headers,records,errors,duplicates,headerRow};
}
