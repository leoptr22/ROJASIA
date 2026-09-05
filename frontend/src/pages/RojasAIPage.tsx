import { FormEvent,useEffect,useMemo,useState } from 'react';
import { AlertTriangle,ArrowRight,BrainCircuit,CheckCircle2,Lightbulb,Link2,Sparkles,X } from 'lucide-react';
import { rojasAiApi,type AIConversationTurn,type DecisionBriefing } from '../services/rojasAiApi';
import { useGlobalDate } from '../contexts/GlobalDateContext';
import { ErrorState,LoadingState } from '../components/states';

const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value);
const conversationKey='rojas-ai-conversation';
const savedConversation=()=>{try{const value=JSON.parse(sessionStorage.getItem(conversationKey)??'[]');return Array.isArray(value)?value.slice(-8) as AIConversationTurn[]:[]}catch{return[]}};
const quick=[
 '¿Qué requiere atención hoy?',
 '¿Por qué cambió la facturación?',
 '¿Qué clientes debería revisar primero?',
 '¿Qué oportunidades comerciales aparecen?',
 '¿Qué clientes explican el crecimiento o la caída?',
 '¿Cuáles son los clientes con mayor facturación?',
 '¿Qué clientes tienen mayor saldo registrado?',
 '¿Qué clientes volvieron después de 90 días y qué compraron?',
 '¿Cuáles son los productos con mayor facturación?',
 '¿Qué trabajos y materiales se solicitaron más?',
 '¿Cómo se distribuyen las ventas entre clientes y productos?',
 '¿Qué acciones comerciales conviene priorizar?',
 '¿Qué información falta para tomar decisiones más confiables?'
];

export function RojasAIPage(){
 const{queryString}=useGlobalDate();
 const[brief,setBrief]=useState<DecisionBriefing|null>(null),[status,setStatus]=useState<any>(null),[turns,setTurns]=useState<AIConversationTurn[]>(savedConversation),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[contextFindingIds,setContextFindingIds]=useState<string[]>([]),[selectedActionId,setSelectedActionId]=useState<string|null>(null);
 const answer=turns.at(-1)?.answer??null;
 const load=()=>Promise.all([rojasAiApi.status(),rojasAiApi.briefing(queryString)]).then(([nextStatus,nextBrief])=>{setStatus(nextStatus);setBrief(nextBrief)}).catch(e=>setError(e.message));
 useEffect(()=>{setBrief(null);setContextFindingIds([]);load()},[queryString]);
 useEffect(()=>{if(turns.length)sessionStorage.setItem(conversationKey,JSON.stringify(turns.slice(-8)));else sessionStorage.removeItem(conversationKey)},[turns]);
 async function ask(event?:FormEvent,preset?:string){event?.preventDefault();const value=preset??question;if(!value.trim())return;setBusy(true);setError('');setContextFindingIds([]);try{const next=await rojasAiApi.ask(value,'general',queryString,turns);setTurns(previous=>[...previous,{question:value,answer:next}]);setQuestion('')}catch(e){setError(e instanceof Error?e.message:'No se pudo analizar')}finally{setBusy(false)}}
 const finishConversation=()=>{setTurns([]);setQuestion('');setContextFindingIds([]);setSelectedActionId(null);setError('')};
 const openFinding=(id:string)=>{setSelectedActionId(null);setContextFindingIds([id])};
 const context=useMemo(()=>{if(!answer||!contextFindingIds.length)return null;const ids=new Set(contextFindingIds),findings=answer.findings.filter(item=>ids.has(item.id)),actions=answer.actions.filter(item=>item.relatedFindingIds.some(id=>ids.has(id))),selectedAction=answer.actions.find(item=>item.id===selectedActionId),labels=new Set(selectedAction?.evidenceLabels??actions.flatMap(item=>item.evidenceLabels)),evidence=answer.evidence.filter(item=>item.relatedFindingIds.some(id=>ids.has(id))||labels.has(item.label));return{findings,actions,evidence}},[answer,contextFindingIds,selectedActionId]);
 const closeContext=()=>{setContextFindingIds([]);setSelectedActionId(null)};

 if(error&&!brief)return <main className="page"><ErrorState message={error} retry={load}/></main>;
 if(!brief)return <main className="page"><LoadingState label="Preparando resumen gerencial…"/></main>;
 return <main className="page ai-page">
  <div className="page-heading"><div><span className="eyebrow">ROJAS IA</span><h1>Asistente para tomar decisiones</h1><p>Interpreta métricas verificadas del Excel; no modifica los cálculos ni inventa datos.</p></div><span className={status?.configured?'ai-status connected':'ai-status'}>{status?.configured?<><CheckCircle2/>OpenAI conectado</>:<><AlertTriangle/>Modo determinístico</>}</span></div>
  <section className="decision-kpis"><article><span>Facturación actual</span><strong>{money(brief.metrics.revenue)}</strong><small>{brief.metrics.revenueChangePercent.toFixed(1)}% frente al período comparado</small></article><article><span>Saldo registrado</span><strong>{money(brief.metrics.outstanding)}</strong><small>Requiere validación de vencimientos</small></article><article><span>Clientes activos</span><strong>{brief.metrics.activeCustomers}</strong><small>{brief.metrics.newCustomers} nuevos · {brief.metrics.returningCustomers} volvieron</small></article></section>
  <section className="decision-grid"><article className="panel"><div className="panel-head"><h2><AlertTriangle/> Riesgos que requieren revisión</h2></div><div className="decision-list">{brief.risks.length?brief.risks.map(item=><div key={item.title}><strong>{item.title}</strong><p>{item.evidence}</p><small>Acción sugerida: {item.action}</small></div>):<p>No se detectaron riesgos relevantes con las reglas actuales.</p>}</div></article><article className="panel"><div className="panel-head"><h2><Lightbulb/> Oportunidades observadas</h2></div><div className="decision-list">{brief.opportunities.map(item=><div key={item.title}><strong>{item.title}</strong><p>{item.evidence}</p><small>Acción sugerida: {item.action}</small></div>)}</div></article></section>
  <section className="ai-workspace"><div className="ai-prompt"><BrainCircuit/><div><h2>Conversación con los datos</h2><p>Podés continuar cada respuesta con nuevas preguntas.</p></div>{turns.length>0&&<button className="secondary-button finish-conversation" onClick={finishConversation}><X/> FINALIZAR CONVERSACIÓN</button>}</div>{turns.length>0&&<div className="conversation-thread">{turns.map((turn,index)=><article key={index}><div className="conversation-user"><strong>Vos</strong><p>{turn.question}</p></div><div className="conversation-ai"><strong>Rojas IA</strong><p>{turn.answer.answer}</p></div></article>)}</div>}<div className="quick-prompts">{quick.map(item=><button key={item} onClick={()=>ask(undefined,item)}>{item}</button>)}</div><form onSubmit={event=>ask(event)}><textarea value={question} onChange={event=>setQuestion(event.target.value)} placeholder={turns.length?'Continuá la conversación…':'Ejemplo: ¿qué clientes explican la caída y qué debería revisar primero?'} maxLength={600}/><button className="primary-button" disabled={busy||question.trim().length<3}>{busy?'ANALIZANDO…':turns.length?'CONTINUAR':'ANALIZAR'}<ArrowRight/></button></form></section>
  {answer&&<section className="ai-answer"><div className="answer-head"><Sparkles/><div><span>{answer.mode==='openai'?'ANÁLISIS CON OPENAI':'ANÁLISIS DETERMINÍSTICO'}</span><h2>Respuesta gerencial</h2></div></div><p className="answer-summary">{answer.answer}</p><div className="answer-columns"><article><h3>Hallazgos</h3>{answer.findings.map(item=><div className="finding linked-card" key={item.id}><b className={item.importance}>{item.importance}</b><strong>{item.title}</strong><p>{item.detail}</p><button className="context-link" onClick={()=>openFinding(item.id)}><Link2/> Ver acciones y evidencia</button></div>)}</article><article><h3>Acciones priorizadas</h3>{[...answer.actions].sort((a,b)=>a.priority-b.priority).map(item=><div className="action linked-card" key={item.id}><span>{item.priority}</span><div><strong>{item.action}</strong><p>{item.reason}</p></div></div>)}</article></div><details><summary>Evidencia utilizada</summary>{answer.evidence.map(item=><button className="evidence-row" key={item.label} onClick={()=>{setSelectedActionId(null);setContextFindingIds(item.relatedFindingIds)}}><span><strong>{item.label}:</strong> {item.value} <small>({item.source})</small></span><ArrowRight/></button>)}</details><details><summary>Limitaciones</summary>{answer.limitations.map(item=><p key={item}>{item}</p>)}</details></section>}
  {context&&<div className="ai-context-overlay" onClick={closeContext}><aside className="ai-context-panel" role="dialog" aria-modal="true" aria-label="Contexto de la decisión" onClick={event=>event.stopPropagation()}><button className="context-close" onClick={closeContext} aria-label="Cerrar"><X/></button><span className="eyebrow">RELACIÓN COMPROBABLE</span><h2>Contexto de la decisión</h2><p className="context-intro">La acción se presenta junto al hallazgo y los datos que la justifican.</p><section><h3>Hallazgos relacionados</h3>{context.findings.map(item=><article className="context-finding" key={item.id}><b className={item.importance}>{item.importance}</b><strong>{item.title}</strong><p>{item.detail}</p></article>)}</section><section><h3>Acciones relacionadas</h3>{context.actions.map(item=><article className={item.id===selectedActionId?'context-action selected':'context-action'} key={item.id}><span>{item.priority}</span><div><strong>{item.action}</strong><p>{item.reason}</p></div></article>)}</section><section><h3>Evidencia utilizada</h3>{context.evidence.map(item=><article className="context-evidence" key={item.label}><strong>{item.label}</strong><b>{item.value}</b><small>{item.source}</small></article>)}</section></aside></div>}
 </main>;
}
