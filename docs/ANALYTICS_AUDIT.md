# Auditoría analítica — antes de Fase A

## Estado actual

| Funcionalidad | Existe | Parcial | Falta | Archivos involucrados | Prioridad |
|---|---:|---:|---:|---|---|
| Login y rutas privadas | Sí |  |  | `routes/auth.ts`, `AuthService.ts`, `App.tsx` | Mantenida |
| Importación XLSX/CSV con preview | Sí |  |  | `ImportService.ts`, `salesWorkbook.ts`, `ImportPage.tsx` | Mantenida |
| Repository Pattern | Sí |  |  | `repositories/*` | Crítica |
| Dashboard con datos reales | Sí |  |  | `AnalyticsService.ts`, `DashboardPage.tsx` | Crítica |
| Ventas, clientes, productos y analítica | Sí | Sí |  | `DataExplorerService.ts`, páginas correspondientes | Alta |
| Filtro global de período |  |  | Sí | Nueva capa frontend/backend | Crítica |
| Comparación configurable |  | Sí |  | `AnalyticsService.ts` | Crítica |
| URL state y persistencia de filtros |  |  | Sí | Nueva capa frontend | Alta |
| Design system reutilizable |  | Sí |  | `KpiCard.tsx`, `styles.css` | Alta |
| Loading, error y empty states |  | Sí |  | Páginas frontend | Alta |
| Cache de datos normalizados |  |  | Sí | `XlsxSalesRepository.ts` | Crítica |
| Validación Zod de filtros API |  |  | Sí | `routes/*` | Crítica |
| Cliente 360, RFM, Pareto, HHI |  |  | Sí | Fase B | Posterior |
| Producto 360 y cross-selling |  |  | Sí | Fase C | Posterior |
| Cobranzas |  | Sí |  | Fase D | Posterior |
| Insights avanzados y anomalías |  | Sí |  | Fase E | Posterior |
| Forecast y escenarios |  |  | Sí | Fase G | Posterior |
| Tools para IA |  |  | Sí | Fase H | Posterior |

## Deuda técnica detectada

- Archivos excesivamente comprimidos en una sola línea, difíciles de revisar y mantener.
- El Excel se normalizaba nuevamente para cada request.
- `AnalyticsService` y `DataExplorerService` repetían agregaciones.
- Los filtros de las pantallas no compartían período.
- La comparación estaba fijada internamente y no era elegible.
- Queries numéricas y textuales no tenían validación Zod.
- Estados de carga y error no estaban consolidados en componentes.
- Algunos controles visuales aún no representaban una acción disponible.

## Arquitectura objetivo

`Xlsx/GoogleSheets Repository → cache normalizado → PeriodService → Analytics/KPI Engine → endpoints analíticos coherentes → GlobalDateContext → componentes del design system`

La importación invalida el cache mediante el cambio de versión/fecha del archivo. OpenAI queda fuera de cálculos y agregaciones.

## Roadmap

1. Fase A: filtros globales, comparación, tipos, URL state, cache, estados UX y validación.
2. Fase B: Client Intelligence y Cliente 360.
3. Fase C: Product Intelligence y Producto 360.
4. Fase D: cobranzas.
5. Fase E: insights, anomalías y explainability.
6. Fase F: cohortes, retención y heatmaps.
7. Fase G: forecasting y resumen gerencial.
8. Fase H: tools gerenciales para Rojas IA.
