import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCustomer,DESIGNER_CUSTOMERS,PRINTER_CUSTOMERS } from './CustomerSegmentationService.js';

test('los 70 miembros del catálogo actualizado se clasifican como diseñadores',()=>{
 assert.equal(DESIGNER_CUSTOMERS.length,70);
 for(const customer of DESIGNER_CUSTOMERS)assert.equal(classifyCustomer({customer}), 'disenador',customer);
});

test('los 52 nombres del catálogo ampliado se clasifican como imprentas',()=>{
 assert.equal(PRINTER_CUSTOMERS.length,52);
 for(const customer of PRINTER_CUSTOMERS)assert.equal(classifyCustomer({customer}), 'imprenta',customer);
});

test('la clasificación nominal tolera tildes, mayúsculas y nombre comercial',()=>{
 assert.equal(classifyCustomer({customer:'Consumidor final',fantasyName:'Lemiña Mariana'}),'disenador');
 assert.equal(classifyCustomer({customer:'ZORRO PIÑEYRO   IMPRENTA'}),'imprenta');
 assert.equal(classifyCustomer({customer:'Pipi'}),'imprenta');
 assert.equal(classifyCustomer({customer:'Cliente sin catálogo'}),'publico');
});
