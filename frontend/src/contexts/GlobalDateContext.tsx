import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';

export type PeriodPreset='today'|'yesterday'|'last7'|'last30'|'this_month'|'previous_month'|'last3'|'last6'|'this_year'|'previous_year'|'all'|'custom';
export type ComparisonMode='none'|'previous_equivalent'|'previous_month'|'previous_year';
type DateState={period:PeriodPreset;comparison:ComparisonMode;from:string;to:string};
type DateContextValue=DateState&{setPeriod:(v:PeriodPreset)=>void;setComparison:(v:ComparisonMode)=>void;setFrom:(v:string)=>void;setTo:(v:string)=>void;queryString:string};
const Context=createContext<DateContextValue|null>(null);
const key='rojas-global-period';
const defaults:DateState={period:'this_month',comparison:'previous_equivalent',from:'',to:''};

export function GlobalDateProvider({children}:{children:ReactNode}){
 const location=useLocation(),navigate=useNavigate();
 const initial=useMemo(()=>{const saved=JSON.parse(sessionStorage.getItem(key)??'null') as DateState|null;const q=new URLSearchParams(location.search);return {period:(q.get('period')??saved?.period??defaults.period) as PeriodPreset,comparison:(q.get('comparison')??saved?.comparison??defaults.comparison) as ComparisonMode,from:q.get('from')??saved?.from??'',to:q.get('to')??saved?.to??''}},[]);
 const[period,setPeriod]=useState(initial.period);const[comparison,setComparison]=useState(initial.comparison);const[from,setFrom]=useState(initial.from);const[to,setTo]=useState(initial.to);
 const queryString=useMemo(()=>{const q=new URLSearchParams({period,comparison});if(period==='custom'&&from&&to){q.set('from',from);q.set('to',to)}return q.toString()},[period,comparison,from,to]);
 useEffect(()=>{sessionStorage.setItem(key,JSON.stringify({period,comparison,from,to}));if(location.search.slice(1)!==queryString)navigate({pathname:location.pathname,search:queryString},{replace:true})},[queryString,location.pathname]);
 return <Context.Provider value={{period,comparison,from,to,setPeriod,setComparison,setFrom,setTo,queryString}}>{children}</Context.Provider>;
}
export function useGlobalDate(){const value=useContext(Context);if(!value)throw new Error('GlobalDateProvider requerido');return value}
