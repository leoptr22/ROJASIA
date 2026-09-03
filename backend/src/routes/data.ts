import { Router } from 'express';
import { z } from 'zod';
import { salesRepository } from '../repositories/index.js';
import { DataExplorerService } from '../services/DataExplorerService.js';
import { ClientIntelligenceService } from '../services/ClientIntelligenceService.js';
import { ForecastService } from '../services/ForecastService.js';
import { ReportService } from '../services/ReportService.js';
import { periodQuerySchema, resolvePeriod } from '../utils/period.js';

const service=new DataExplorerService(salesRepository);
const clientIntelligence=new ClientIntelligenceService(salesRepository);
const forecasts=new ForecastService(salesRepository);
const reports=new ReportService(salesRepository);
const salesQuerySchema=periodQuerySchema.extend({search:z.string().optional().default(''),status:z.string().optional().default(''),product:z.string().optional().default(''),user:z.string().optional().default(''),page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().min(10).max(100).default(50)});
const currentPeriod=async(query:unknown)=>resolvePeriod(await salesRepository.list(),periodQuerySchema.parse(query)).current;
export const dataRouter=Router();

dataRouter.get('/sales',async(req,res,next)=>{try{const query=salesQuerySchema.parse(req.query);const period=resolvePeriod(await salesRepository.list(),query).current;res.json(await service.salesList({...query,period}))}catch(error){next(error)}});
dataRouter.get('/customers',async(req,res,next)=>{try{res.json(await service.customers(await currentPeriod(req.query)))}catch(error){next(error)}});
dataRouter.get('/products',async(req,res,next)=>{try{res.json(await service.products(await currentPeriod(req.query)))}catch(error){next(error)}});
dataRouter.get('/analytics',async(req,res,next)=>{try{res.json(await service.analytics(await currentPeriod(req.query)))}catch(error){next(error)}});
dataRouter.get('/forecasts',async(req,res,next)=>{try{const horizon=z.coerce.number().int().min(1).max(6).default(3).parse(req.query.horizon);res.json(await forecasts.forecast(horizon))}catch(error){next(error)}});
dataRouter.get('/reports/executive.pdf',async(req,res,next)=>{try{const query=periodQuerySchema.parse(req.query),pdf=await reports.executive(query);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="rojas-informe-${query.period}.pdf"`);res.setHeader('Content-Length',pdf.length);res.end(pdf)}catch(error){next(error)}});
dataRouter.get('/analytics/clients',async(req,res,next)=>{try{const query=periodQuerySchema.parse(req.query);const inactiveDays=z.coerce.number().int().min(1).max(730).default(90).parse(req.query.inactiveDays);res.json(await clientIntelligence.summary(query,inactiveDays))}catch(error){next(error)}});
dataRouter.get('/analytics/clients/:name',async(req,res,next)=>{try{const result=await clientIntelligence.detail(req.params.name,periodQuerySchema.parse(req.query));if(!result)return res.status(404).json({message:'Cliente no encontrado'});res.json(result)}catch(error){next(error)}});
