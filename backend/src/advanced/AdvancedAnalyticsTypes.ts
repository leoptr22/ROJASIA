import type { Period } from '../repositories/types.js';

export type AdvancedComparisonMode='existing'|'previous_week'|'previous_quarter'|'previous_calendar_year'|'custom';
export type ContributionDimension='customer'|'product'|'user'|'status'|'pointOfSale';
export type AdvancedPeriods={current:Required<Period>;comparison:Required<Period>};

export type MetricEvidence<T>={
 value:T;
 period:Required<Period>;
 comparisonPeriod:Required<Period>|null;
 filters:Record<string,unknown>;
 recordsUsed:number;
 comparisonRecordsUsed:number;
 sourceFields:string[];
 formula:string;
 method:string;
 limitations:string[];
};

export type ScoreWeights={revenue:number;frequency:number;ticket:number;recency:number};
export type AttentionWeights={historicalImportance:number;recentDecline:number;relativeRecency:number;frequencyDecline:number;positiveBalance:number};

export const defaultValueWeights:ScoreWeights={revenue:.35,frequency:.25,ticket:.2,recency:.2};
export const defaultAttentionWeights:AttentionWeights={historicalImportance:.3,recentDecline:.25,relativeRecency:.2,frequencyDecline:.15,positiveBalance:.1};

