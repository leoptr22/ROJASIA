import { Bell,BrainCircuit,LogOut,Menu,Search } from 'lucide-react';
import { useState } from 'react';
import { NavLink,Outlet,useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { GlobalFilterBar } from '../components/GlobalFilterBar';
import { AIBudgetWarning } from '../components/AIBudgetWarning';
import { BrandLogo } from '../components/BrandLogo';

export function AppLayout({onLogout}:{onLogout:()=>void}){
  const [open,setOpen]=useState(false);
  const location=useLocation();
  return <div className="app-shell">
    <Sidebar open={open} close={()=>setOpen(false)}/>
    <div className="app-main">
      <header className="topbar">
        <button className="mobile-menu" onClick={()=>setOpen(true)} aria-label="Abrir menú"><Menu/></button>
        <div className="search search-disabled" title="Búsqueda disponible desde Ventas"><Search/><span>Buscar clientes, órdenes, productos…</span></div>
        <div className="top-actions"><span className="demo-badge real">DATOS REALES</span><span className="icon-button disabled-control" title="No hay notificaciones pendientes"><Bell/></span><div className="avatar brand-avatar"><BrandLogo/></div><div className="user-meta"><strong>Administrador</strong><small>Gerencia</small></div><button className="icon-button" onClick={onLogout} aria-label="Cerrar sesión"><LogOut/></button></div>
      </header>
      <AIBudgetWarning/>
      <GlobalFilterBar/>
      <Outlet/>
      {location.pathname!=='/ia'&&<NavLink className="decision-dock" to="/ia" state={{from:location.pathname}} aria-label="Consultar Rojas IA"><BrainCircuit/><span><strong>Rojas IA</strong><small>Analizar decisiones</small></span></NavLink>}
    </div>
  </div>
}
