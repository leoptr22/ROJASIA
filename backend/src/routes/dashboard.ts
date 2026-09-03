import { Router } from 'express'; import { salesRepository } from '../repositories/index.js'; import { AnalyticsService } from '../services/AnalyticsService.js';import { periodQuerySchema } from '../utils/period.js';
const analyticsService=new AnalyticsService(salesRepository);
export const dashboardRouter=Router(); dashboardRouter.get('/',async(req,res,next)=>{try{res.json(await analyticsService.getDashboard(periodQuerySchema.parse(req.query)));}catch(error){next(error);}});
