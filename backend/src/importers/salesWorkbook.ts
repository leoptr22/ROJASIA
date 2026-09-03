import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import type { SalesRecord } from '../repositories/types.js';

export const requiredColumns=['Fecha','PV','Número','Cliente','Fecha Entrega','Producto','Trabajo','Total','Saldo','Estado','Usuario'];
const aliases:Record<keyof SalesRecord,string[]>={date:['fecha'],pointOfSale:['pv','punto de venta','punto_venta'],number:['numero','número'],customer:['cliente'],fantasyName:['nombre fantasia','nombre fantasía'],deliveryDate:['fecha entrega','fecha_entrega'],product:['producto'],work:['trabajo','descripcion','descripción'],total:['total','importe'],balance:['saldo'],status:['estado'],user:['usuario']};
const normalizeHeader=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const valueFor=(row:Record<string,unknown>,key:keyof SalesRecord)=>{const match=Object.keys(row).find(header=>aliases[key].includes(normalizeHeader(header)));return match?row[match]:undefined};
const excelDate=(value:unknown)=>{if(value instanceof Date)return value;if(typeof value==='number'){const epoch=new Date(1899,11,30);return new Date(epoch.getTime()+value*86400000)}const parsed=new Date(String(value));if(Number.isNaN(parsed.getTime()))throw new Error(`Fecha inválida: ${String(value)}`);return parsed};
const amount=(value:unknown)=>{if(typeof value==='number')return value;const normalized=String(value??'0').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const parsed=Number(normalized);if(!Number.isFinite(parsed))throw new Error(`Importe inválido: ${String(value)}`);return parsed};
const plainValue=(value:ExcelJS.CellValue):unknown=>{if(value===null||value===undefined||typeof value!=='object'||value instanceof Date)return value;if('result'in value)return value.result;if('richText'in value)return value.richText.map(part=>part.text).join('');if('text'in value)return value.text;return String(value)};
export const hashBuffer=(buffer:Buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');

export async function parseSalesWorkbook(buffer:Buffer){
 const workbook=new ExcelJS.Workbook(),isXlsx=buffer[0]===0x50&&buffer[1]===0x4b;
 if(isXlsx)await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
 else{const firstLine=buffer.toString('utf8',0,Math.min(buffer.length,4096)).split(/\r?\n/,1)[0]??'',delimiter=(firstLine.match(/;/g)?.length??0)>(firstLine.match(/,/g)?.length??0)?';':',';await workbook.csv.read(Readable.from(buffer),{parserOptions:{delimiter}})}
 const sheet=workbook.worksheets[0];if(!sheet)throw new Error('El archivo no contiene hojas');
 const matrix:unknown[][]=[];sheet.eachRow({includeEmpty:false},row=>{const values:unknown[]=[];for(let column=1;column<=sheet.columnCount;column++)values.push(plainValue(row.getCell(column).value));matrix.push(values)});
 const headerIndex=matrix.findIndex(row=>row.some(cell=>normalizeHeader(cell)==='fecha'));if(headerIndex<0)throw new Error('No se encontró una fila de encabezados con la columna Fecha');
 const headers=matrix[headerIndex]!.map(value=>String(value??'').trim()),normalized=headers.map(normalizeHeader),missing=requiredColumns.filter(column=>!normalized.includes(normalizeHeader(column)));if(missing.length)throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`);
 const rawRows=matrix.slice(headerIndex+1).filter(row=>row.some(value=>value!==null&&value!==undefined&&String(value).trim()!=='')),errors:string[]=[],records:SalesRecord[]=[];
 rawRows.forEach((values,index)=>{try{const row=Object.fromEntries(headers.map((header,column)=>[header,values[column]]));records.push({date:excelDate(valueFor(row,'date')),pointOfSale:Number(valueFor(row,'pointOfSale')),number:Number(valueFor(row,'number')),customer:String(valueFor(row,'customer')??'').trim(),fantasyName:String(valueFor(row,'fantasyName')??'').trim()||undefined,deliveryDate:excelDate(valueFor(row,'deliveryDate')),product:String(valueFor(row,'product')??'Sin producto').trim(),work:String(valueFor(row,'work')??'').replace(/_x000D_/g,'\n').trim(),total:amount(valueFor(row,'total')),balance:amount(valueFor(row,'balance')),status:String(valueFor(row,'status')??'SIN ESTADO').trim().toUpperCase(),user:String(valueFor(row,'user')??'SIN USUARIO').trim().toUpperCase()})}catch(error){errors.push(`Fila ${headerIndex+index+2}: ${error instanceof Error?error.message:'error desconocido'}`)}});
 const keys=records.map(record=>`${record.pointOfSale}:${record.number}`),duplicates=keys.length-new Set(keys).size;return{sheetName:sheet.name,headers,records,errors,duplicates,headerRow:headerIndex+1};
}
