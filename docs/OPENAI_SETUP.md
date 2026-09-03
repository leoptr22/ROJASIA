# Configuración de OpenAI

Rojas IA ya está integrada sobre los cálculos verificados del sistema. Sin una clave funciona en modo determinístico; con una clave habilita interpretación en lenguaje natural mediante la Responses API.

1. Configure una cuenta de API en la [plataforma de OpenAI](https://platform.openai.com/).
2. Configure facturación y límites cuando corresponda.
3. Cree una API key destinada a este backend.
4. Guárdela exclusivamente en `backend/.env`: `OPENAI_API_KEY=PEGAR_CREDENCIAL_AQUI`.
5. Defina `OPENAI_MODEL=gpt-5.6-luna`, `AI_ENABLED=true` y `AI_MONTHLY_BUDGET_USD=2`.
6. Reinicie el backend y confirme que Rojas IA muestre “OpenAI conectado”.

El backend envía únicamente un contexto resumido de métricas, rankings, riesgos y oportunidades ya calculados. No envía el archivo Excel completo. Las respuestas usan una estructura validada, incluyen evidencia y limitaciones, y se solicitan con almacenamiento desactivado (`store: false`).

`AI_MONTHLY_BUDGET_USD` es un límite interno mensual. El backend registra tokens y costo estimado de Luna en `backend/data/ai-usage.json`; antes de cada consulta reserva el máximo posible de esa respuesta y la bloquea si podría superar el límite. También conviene configurar un límite de facturación en la plataforma de OpenAI como protección independiente.

La clave nunca debe llegar al frontend ni exponerse mediante endpoints. No la pegue en el chat ni la incluya en Git.
