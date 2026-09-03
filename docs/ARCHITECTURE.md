# Arquitectura inicial

`React → API Express → Services → Repository → Data source`

El frontend desconoce Google Sheets. `AnalyticsRepository` define el contrato del tablero; `DemoRepository` permite trabajar hoy y `GoogleSheetsRepository` reserva el adaptador de la segunda entrega. Una futura implementación SQL podrá respetar el mismo contrato sin modificar React.

Las rutas privadas pasan por `authMiddleware`. El token JWT se entrega en una cookie `HttpOnly`, no en `localStorage`. La contraseña se compara mediante bcrypt y sólo existe como hash en el entorno del backend.
