import { Router } from 'express';import { z } from 'zod';import { salesRepository } from '../repositories/index.js';import { RojasAIService } from '../services/RojasAIService.js';import { periodQuerySchema } from '../utils/period.js';
const service=new RojasAIService(salesRepository),querySchema=periodQuerySchema.extend({question:z.string().trim().min(3).max(600),section:z.enum(['general','dashboard','ventas','clientes','productos','analitica','cobranzas','proyecciones']).default('general')});
export const aiRouter=Router();
aiRouter.get('/status',async(_req,res,next)=>{try{res.json(await service.status())}catch(error){next(error)}});
aiRouter.get('/briefing',async(req,res,next)=>{try{res.json(await service.briefing(periodQuerySchema.parse(req.query)))}catch(e){next(e)}});
aiRouter.post('/query',async(req,res,next)=>{try{const parsed=querySchema.parse({...req.query,...req.body});res.json(await service.ask(parsed.question,parsed.section,parsed,req.user?.username??'usuario'))}catch(e){next(e)}});
