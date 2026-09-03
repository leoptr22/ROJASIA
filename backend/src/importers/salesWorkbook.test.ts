import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseSalesWorkbook,requiredColumns } from './salesWorkbook.js';

test('large XLSX validates every row and preserves totals without copying empty formatted columns',async t=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Datos');
 sheet.addRow(requiredColumns);
 const count=10000;
 for(let i=0;i<count;i++)sheet.addRow([new Date('2026-04-01'),1,i,'Cliente',new Date('2026-04-02'),'Vinilo','Vinilo impreso',12.5,2.5,'entregada','Ana']);
 sheet.getCell('ZZ1').font={bold:true};
 const buffer=Buffer.from(await workbook.xlsx.writeBuffer());
 const started=performance.now(),result=await parseSalesWorkbook(buffer);
 t.diagnostic(`Validación local de ${count} filas: ${Math.round(performance.now()-started)} ms; no incluye red ni Blob`);
 assert.equal(result.records.length,count);assert.equal(result.errors.length,0);assert.equal(result.duplicates,0);
 assert.equal(result.records.reduce((sum,row)=>sum+row.total,0),125000);
 assert.equal(result.records.reduce((sum,row)=>sum+row.balance,0),25000);
 assert.equal(result.records[count-1]!.number,count-1);
});

test('reports actual Excel row numbers, duplicates and formula values',async()=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Datos');
 sheet.addRow(['Informe']);sheet.getRow(3).values=requiredColumns;
 const row=['2026-04-01',1,1,'Cliente','2026-04-02','Vinilo','Trabajo',10,0,'entregada','Ana'];
 sheet.getRow(5).values=row;sheet.getRow(6).values=row;
 sheet.getCell('H6').value={formula:'5+5',result:10};
 sheet.getRow(8).values=['fecha inválida',...row.slice(1)];
 const result=await parseSalesWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
 assert.equal(result.headerRow,3);assert.equal(result.records.length,2);assert.equal(result.duplicates,1);
 assert.match(result.errors[0]!,/^Fila 8:/);assert.equal(result.records[1]!.total,10);
});
