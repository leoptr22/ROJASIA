import test from 'node:test';
import assert from 'node:assert/strict';
import { concentration,gini,median,percentageChange,percentile } from './StatisticalUtils.js';

test('percentiles y variaciones controlan casos límite',()=>{
 assert.equal(median([1,2,3,4]),2.5);
 assert.equal(percentile([0,10,20,30],.75),22.5);
 assert.equal(percentageChange(80,100),-20);
 assert.equal(percentageChange(10,0),null);
 assert.equal(percentageChange(-50,-100),50);
});

test('HHI y Gini describen concentración sin diagnosticar',()=>{
 const result=concentration([80,20]);
 assert.ok(Math.abs(result.hhiNormalized-.68)<1e-12);
 assert.equal(result.hhi10000,6800);
 assert.ok(Math.abs(gini([20,80])-.3)<1e-12);
 assert.equal(result.top.top1,80);
});
