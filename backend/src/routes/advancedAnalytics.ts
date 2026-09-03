import { Router } from 'express';
import { z } from 'zod';
import { AdvancedAnalyticsFacade } from '../advanced/AdvancedAnalyticsFacade.js';
import { salesRepository } from '../repositories/index.js';
import { periodQuerySchema } from '../utils/period.js';

const facade=new AdvancedAnalyticsFacade(salesRepository);
const mode=z.enum(['existing','previous_week','previous_quarter','previous_calendar_year','custom']).default('existing');
const customFields={currentFrom:z.string().optional(),currentTo:z.string().optional(),comparisonFrom:z.string().optional(),comparisonTo:z.string().optional()};
const comparisonSchema=periodQuerySchema.extend({mode,...customFields});
const contributionSchema=comparisonSchema.extend({dimension:z.enum(['customer','product','user','status','pointOfSale']).default('customer'),limit:z.coerce.number().int().min(1).max(500).default(100)});
const optionalWeight=z.coerce.number().min(0).max(100).optional();
const customerSchema=periodQuerySchema.extend({limit:z.coerce.number().int().min(1).max(1000).default(100),search:z.string().trim().max(120).optional(),inactiveDays:z.coerce.number().int().min(1).max(730).default(90),valueRevenueWeight:optionalWeight,valueFrequencyWeight:optionalWeight,valueTicketWeight:optionalWeight,valueRecencyWeight:optionalWeight,attentionHistoricalWeight:optionalWeight,attentionDeclineWeight:optionalWeight,attentionRecencyWeight:optionalWeight,attentionFrequencyWeight:optionalWeight,attentionBalanceWeight:optionalWeight});
const concentrationSchema=periodQuerySchema.extend({limit:z.coerce.number().int().min(1).max(1000).default(100)});
const custom=(query:z.infer<typeof comparisonSchema>)=>({currentFrom:query.currentFrom,currentTo:query.currentTo,comparisonFrom:query.comparisonFrom,comparisonTo:query.comparisonTo});
const defined=<T extends Record<string,number|undefined>>(values:T)=>Object.fromEntries(Object.entries(values).filter(([,value])=>value!==undefined));

export const advancedAnalyticsRouter=Router();
advancedAnalyticsRouter.get('/metrics',(_req,res)=>res.json(facade.metricCatalog()));
advancedAnalyticsRouter.get('/block-a/comparison',async(req,res,next)=>{try{const query=comparisonSchema.parse(req.query);res.json(await facade.comparison(query,query.mode,custom(query)))}catch(error){next(error)}});
advancedAnalyticsRouter.get('/block-a/contribution',async(req,res,next)=>{try{const query=contributionSchema.parse(req.query);res.json(await facade.contribution(query,query.dimension,query.mode,custom(query),query.limit))}catch(error){next(error)}});
advancedAnalyticsRouter.get('/block-a/customers',async(req,res,next)=>{try{const query=customerSchema.parse(req.query),valueWeights=defined({revenue:query.valueRevenueWeight,frequency:query.valueFrequencyWeight,ticket:query.valueTicketWeight,recency:query.valueRecencyWeight}),attentionWeights=defined({historicalImportance:query.attentionHistoricalWeight,recentDecline:query.attentionDeclineWeight,relativeRecency:query.attentionRecencyWeight,frequencyDecline:query.attentionFrequencyWeight,positiveBalance:query.attentionBalanceWeight});res.json(await facade.customerAnalytics(query,{limit:query.limit,search:query.search,inactiveDays:query.inactiveDays,valueWeights,attentionWeights}))}catch(error){next(error)}});
advancedAnalyticsRouter.get('/block-a/concentration',async(req,res,next)=>{try{const query=concentrationSchema.parse(req.query);res.json(await facade.concentrationAnalytics(query,query.limit))}catch(error){next(error)}});
