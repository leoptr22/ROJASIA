import { AlertTriangle,BrainCircuit,OctagonAlert } from 'lucide-react';
import { useEffect,useState } from 'react';
import { rojasAiApi,type AIStatus } from '../services/rojasAiApi';

const levels=[{limit:25,label:'25%',tone:'green'},{limit:50,label:'50%',tone:'yellow'},{limit:75,label:'75%',tone:'orange'},{limit:100,label:'100%',tone:'red'}];

export function AIBudgetWarning(){
  const [status,setStatus]=useState<AIStatus|null>(null);
  useEffect(()=>{const refresh=()=>rojasAiApi.status().then(setStatus).catch(()=>undefined);refresh();window.addEventListener('rojas-ai-usage-updated',refresh);const timer=window.setInterval(refresh,30_000);return()=>{window.removeEventListener('rojas-ai-usage-updated',refresh);window.clearInterval(timer)}},[]);
  if(!status?.configured||!status.budgetUsd)return null;
  const percent=Math.min(100,(status.usage.costUsd/status.budgetUsd)*100);
  const blocked=status.budgetBlocked||percent>=100;
  const totalTokens=status.usage.inputTokens+status.usage.outputTokens;
  const monthLabel=new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${status.usage.month}-01T00:00:00Z`));
  const previous=status.history.filter(item=>item.month<status.usage.month).slice(-1)[0];
  return <section className="ai-budget-meter" aria-label={`Consumo de inteligencia artificial: ${percent.toFixed(1)}%`}>
    <div className="ai-meter-heading"><BrainCircuit/><div><strong>Consumo Rojas IA · {monthLabel}</strong><span>{percent.toFixed(1)}% utilizado · {totalTokens.toLocaleString('es-AR')} tokens</span></div><b>USD {status.usage.costUsd.toFixed(4)} / {status.budgetUsd.toFixed(2)}</b></div>
    <div className="ai-meter-levels">{levels.map((level,index)=>{const start=index*25;const fill=Math.max(0,Math.min(100,((percent-start)/25)*100));return <div className={`ai-meter-level ${level.tone}`} key={level.limit}><span><i style={{width:`${fill}%`}}/></span><small>{level.label}</small></div>})}</div>
    <div className="ai-meter-foot"><span>Entrada: {status.usage.inputTokens.toLocaleString('es-AR')}</span><span>Salida: {status.usage.outputTokens.toLocaleString('es-AR')}</span>{previous&&<span>Mes anterior: USD {previous.costUsd.toFixed(4)} · {(previous.inputTokens+previous.outputTokens).toLocaleString('es-AR')} tokens</span>}{status.contextOptimization.reductionPercent>0&&<span>Contexto ahorrado: {status.contextOptimization.reductionPercent.toFixed(1)}%</span>}<strong>Disponible: USD {status.usage.remainingUsd.toFixed(4)}</strong></div>
    {percent>=80&&<div className={blocked?'ai-budget-alert blocked':'ai-budget-alert'} role="alert">{blocked?<OctagonAlert/>:<AlertTriangle/>}<strong>{blocked?'Presupuesto agotado: las consultas con OpenAI están bloqueadas.':'Aviso: se consumió al menos el 80% del presupuesto mensual.'}</strong></div>}
  </section>
}
