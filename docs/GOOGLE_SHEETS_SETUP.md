# Configuración de Google Sheets

Esta integración se activará en la segunda entrega. No envíe credenciales por chat ni las incorpore al repositorio.

1. Cree un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Active **Google Sheets API** en APIs y servicios.
3. Cree una **Service Account** con el mínimo permiso necesario.
4. Copie el email de la cuenta de servicio.
5. Genere una clave JSON y extraiga la `private_key`. Guarde el archivo original fuera del repositorio.
6. Cree un Google Sheet para Rojas Intelligence.
7. Comparta la hoja con el email de la Service Account como editor.
8. Copie el ID de la URL: `docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`.
9. Copie `backend/.env.example` a `backend/.env` y complete:
   - `GOOGLE_SHEET_ID=PEGAR_CREDENCIAL_AQUI`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL=PEGAR_CREDENCIAL_AQUI`
   - `GOOGLE_PRIVATE_KEY="PEGAR_CREDENCIAL_AQUI"`
   - `DATA_SOURCE=google_sheets`
10. En la segunda entrega se agregará una prueba de conexión de solo lectura antes de habilitar escrituras.

## Hojas previstas

`IMPORTACIONES`, `VENTAS`, `CLIENTES`, `PRODUCTOS`, `COSTOS`, `GASTOS`, `PROVEEDORES`, `FACTURAS`, `MATERIALES`, `MAQUINAS`, `EMPLEADOS`, `SECTORES`, `CONFIGURACION`, `LOG_IMPORTACIONES`.

El sistema debe tolerar hojas ausentes y no depender de fórmulas para sus indicadores.
