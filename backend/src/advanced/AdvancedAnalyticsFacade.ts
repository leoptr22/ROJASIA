import type { SalesRepository } from '../repositories/types.js';
import type { PeriodQuery } from '../utils/period.js';
import { additionalMetricRegistry } from './AdditionalMetricRegistry.js';
import { AdvancedCustomerAnalyticsService } from './AdvancedCustomerAnalyticsService.js';
import type { AdvancedComparisonMode,ContributionDimension } from './AdvancedAnalyticsTypes.js';
import { ComparisonAnalyticsService,type CustomComparison } from './ComparisonAnalyticsService.js';
import { ConcentrationAnalyticsService } from './ConcentrationAnalyticsService.js';
import { ContributionAnalyticsService } from './ContributionAnalyticsService.js';

export class AdvancedAnalyticsFacade{
 private comparisons:ComparisonAnalyticsService;private contributions:ContributionAnalyticsService;private customers:AdvancedCustomerAnalyticsService;private concentration:ConcentrationAnalyticsService;
 constructor(sales:SalesRepository){this.comparisons=new ComparisonAnalyticsService(sales);this.contributions=new ContributionAnalyticsService(sales);this.customers=new AdvancedCustomerAnalyticsService(sales);this.concentration=new ConcentrationAnalyticsService(sales)}
 metricCatalog(){return{scope:'Sólo métricas adicionales; no migra ni sustituye métricas existentes.',metrics:additionalMetricRegistry}}
 comparison(query:PeriodQuery,mode:AdvancedComparisonMode,custom:CustomComparison){return this.comparisons.compare(query,mode,custom)}
 contribution(query:PeriodQuery,dimension:ContributionDimension,mode:AdvancedComparisonMode,custom:CustomComparison,limit:number){return this.contributions.analyze(query,dimension,mode,custom,limit)}
 customerAnalytics(query:PeriodQuery,options:Parameters<AdvancedCustomerAnalyticsService['analyze']>[1]){return this.customers.analyze(query,options)}
 concentrationAnalytics(query:PeriodQuery,limit:number){return this.concentration.analyze(query,limit)}
}

