# PROMPT MAESTRO
## Plataforma SaaS de Control Operativo, Flota, Tráfico, Documentación, Finanzas e Inteligencia Artificial para Empresas de Transporte de Cargas

---

## 1. VISIÓN DEL PRODUCTO

Diseñar y construir una plataforma SaaS B2B destinada a empresas argentinas de transporte de cargas que administren aproximadamente entre 5 y 500+ vehículos.

El producto NO debe posicionarse como:

- un simple GPS;
- una aplicación para camioneros;
- una bolsa de cargas;
- un sistema contable;
- un TMS tradicional;
- un simple software de mantenimiento.

Debe posicionarse como:

> **El Centro de Control Operativo y Financiero de la empresa de transporte.**

El objetivo principal es que el propietario, gerente, jefe de tráfico o responsable de operaciones pueda conocer en tiempo real:

- dónde está cada unidad;
- qué viaje está realizando;
- qué carga transporta;
- quién conduce;
- cuándo salió;
- cuándo debería llegar;
- cuándo probablemente llegará;
- si existe tráfico o demora;
- si existe una parada no prevista;
- si existe un incidente;
- qué documentación está vigente;
- cuánto cuesta cada viaje;
- cuánto factura;
- cuánto margen genera;
- qué unidades están improductivas;
- qué problemas requieren atención inmediata.

El sistema debe transformar información operacional dispersa en una única fuente de verdad para la empresa.

---

# 2. PRINCIPIO FUNDAMENTAL

El producto debe responder permanentemente a cinco preguntas:

1. ¿QUÉ ESTÁ PASANDO AHORA?
2. ¿DÓNDE ESTÁ PASANDO?
3. ¿QUÉ VA A PASAR?
4. ¿CUÁNTO DINERO ESTÁ EN JUEGO?
5. ¿QUÉ DEBE HACER EL RESPONSABLE?

La plataforma no debe limitarse a mostrar datos.

Debe:

> **detectar → interpretar → alertar → priorizar → recomendar → registrar la acción.**

---

# 3. USUARIO PRINCIPAL

El usuario económico principal es:

### Dueño / propietario de la empresa de transporte

Pero el sistema debe contemplar distintos perfiles:

- propietario;
- director;
- gerente general;
- jefe de tráfico;
- jefe de operaciones;
- despachante;
- administrativo;
- responsable de flota;
- responsable de mantenimiento;
- responsable financiero;
- conductor;
- cliente/dador de carga.

Cada usuario debe tener permisos diferentes.

---

# 4. DASHBOARD PRINCIPAL — CONTROL TOWER

La pantalla principal debe mostrar en tiempo real:

### FLOTA

- unidades totales;
- unidades en ruta;
- unidades cargando;
- unidades descargando;
- unidades detenidas;
- unidades en base;
- unidades en mantenimiento;
- unidades con incidentes.

### OPERACIÓN

- viajes activos;
- viajes programados;
- viajes demorados;
- viajes próximos a vencer;
- viajes completados;
- entregas pendientes.

### TRÁFICO

- zonas congestionadas;
- rutas afectadas;
- demoras;
- ETA modificadas;
- viajes en riesgo.

### ALERTAS

Clasificación:

- CRÍTICA;
- ALTA;
- MEDIA;
- INFORMATIVA.

### FINANZAS

- facturación del día;
- facturación del mes;
- cuentas por cobrar;
- cuentas vencidas;
- costo por kilómetro;
- rentabilidad por viaje;
- rentabilidad por cliente;
- rentabilidad por unidad.

---

# 5. MAPA OPERATIVO

El mapa debe representar:

- vehículos;
- rutas;
- origen;
- destino;
- posición actual;
- recorrido realizado;
- recorrido pendiente;
- paradas;
- zonas de riesgo;
- incidentes;
- tráfico;
- ETA.

Cada vehículo debe poder seleccionarse desde el mapa.

Al seleccionarlo se debe mostrar una ficha resumida:

- patente;
- unidad;
- chofer;
- viaje;
- cliente;
- origen;
- destino;
- velocidad;
- última posición;
- hora de salida;
- ETA;
- estado;
- demora;
- combustible;
- alertas.

---

# 6. GESTIÓN DE VIAJES

Cada viaje debe tener un ciclo completo:

PEDIDO

↓

PRESUPUESTO / TARIFA

↓

ASIGNACIÓN DE UNIDAD

↓

ASIGNACIÓN DE CHOFER

↓

CARGA

↓

SALIDA

↓

EN RUTA

↓

CONTROL DE TRÁFICO

↓

LLEGADA

↓

DESCARGA

↓

PRESENTACIÓN DE REMITO / POD

↓

FACTURACIÓN

↓

COBRO

↓

CIERRE DEL VIAJE

El sistema debe registrar automáticamente cada cambio de estado.

---

# 7. CONTROL DE TRÁFICO Y ETA

El sistema debe integrar, cuando sea técnicamente viable, fuentes externas de mapas, tráfico y geolocalización.

Debe calcular:

- ETA inicial;
- ETA actual;
- diferencia entre ambas;
- tiempo estimado restante;
- distancia restante;
- demora acumulada;
- causas probables de demora.

El sistema debe generar alertas cuando un viaje tenga una alta probabilidad de incumplir su ventana de entrega.

Ejemplo:

> ⚠️ VIAJE #482 EN RIESGO

> ETA original: 17:20  
> ETA actual: 18:47  
> Demora estimada: 1h 27m  
> Causa probable: congestión  
> Cliente afectado: XXXXX  
> Acción recomendada: informar nueva ETA.

---

# 8. CHOFERES

Cada conductor debe tener una ficha con:

- identidad;
- contacto;
- unidad asignada;
- documentación;
- vencimientos;
- viajes realizados;
- incidentes;
- kilometraje;
- consumo asociado;
- historial operativo.

El sistema NO debe reemplazar sistemas oficiales ni determinar por sí mismo la habilitación legal de una persona.

Debe funcionar como:

> **sistema interno de control y recordatorio documental.**

---

# 9. WHATSAPP COMO INTERFAZ OPERATIVA

El conductor debe poder interactuar mediante WhatsApp.

Ejemplos:

> "Salí."

> "Llegué."

> "Estoy cargando."

> "Estoy descargando."

> "Tengo una demora."

> "Se rompió una cubierta."

> "Tuve un accidente."

También debe poder enviar:

- fotografías;
- documentos;
- remitos;
- comprobantes;
- audios;
- ubicación.

La IA debe interpretar estos mensajes y convertirlos en eventos estructurados.

---

# 10. DOCUMENTOS

Permitir cargar y controlar:

- RUTA;
- RTO;
- seguros;
- licencias;
- documentación del vehículo;
- documentación del conductor;
- remitos;
- cartas de porte;
- comprobantes;
- documentación de carga;
- permisos especiales cuando correspondan.

El sistema debe generar alertas de vencimiento.

IMPORTANTE:

El software debe informar que el control documental es una herramienta de gestión y no constituye certificación oficial de cumplimiento legal.

---

# 11. COMBUSTIBLE

Registrar:

- litros;
- importe;
- precio por litro;
- estación;
- vehículo;
- fecha;
- kilometraje;
- viaje.

Permitir ingresar información mediante:

- formulario;
- WhatsApp;
- fotografía del ticket;
- integración externa.

La IA debe poder leer tickets y extraer:

- litros;
- importe;
- fecha;
- estación;
- patente;
- tipo de combustible.

Debe detectar anomalías.

Ejemplo:

> ⚠️ Consumo anormal.

> La unidad 284 consumió 13% más combustible que su promedio histórico para una ruta comparable.

---

# 12. MANTENIMIENTO

Registrar:

- mantenimiento preventivo;
- mantenimiento correctivo;
- service;
- aceite;
- filtros;
- neumáticos;
- frenos;
- reparaciones;
- talleres;
- costos;
- kilometraje.

Generar mantenimiento preventivo basado en:

- kilometraje;
- tiempo;
- uso;
- historial.

---

# 13. NEUMÁTICOS

Gestionar:

- neumático;
- posición;
- marca;
- modelo;
- fecha;
- kilometraje;
- costo;
- reparaciones;
- rotaciones;
- vida útil.

El sistema debe permitir calcular costo por kilómetro.

---

# 14. RENTABILIDAD

Cada viaje debe poder calcular:

### INGRESOS

- tarifa;
- adicionales;
- extras.

### COSTOS DIRECTOS

- combustible;
- peajes;
- chofer;
- viáticos;
- neumáticos;
- mantenimiento;
- otros.

### COSTOS INDIRECTOS

- seguros;
- administración;
- estructura;
- amortización;
- costos generales.

Resultado:

> INGRESO  
> - COSTO  
> = RESULTADO

Mostrar:

- margen bruto;
- margen estimado;
- margen real;
- costo/km;
- ingreso/km.

---

# 15. RENTABILIDAD POR CLIENTE

El sistema debe permitir conocer:

- facturación por cliente;
- cantidad de viajes;
- kilómetros;
- costos;
- margen;
- días de cobro;
- rentabilidad histórica.

La IA debe poder detectar:

> "Cliente X representa el 32% de tu facturación pero genera un margen inferior al promedio."

---

# 16. RENTABILIDAD POR UNIDAD

Para cada camión:

- facturación;
- kilómetros;
- viajes;
- combustible;
- mantenimiento;
- neumáticos;
- costos;
- días activos;
- días improductivos;
- margen.

El sistema debe detectar unidades con bajo rendimiento.

---

# 17. INTELIGENCIA ARTIFICIAL — ALEX CONTROL

Alex debe actuar como un copiloto de dirección.

Debe responder preguntas como:

> "¿Cómo estamos?"

> "¿Qué camiones están demorados?"

> "¿Qué viajes están en riesgo?"

> "¿Cuánto facturamos hoy?"

> "¿Qué cliente nos deja más margen?"

> "¿Qué camiones están gastando demasiado?"

> "¿Qué documentación vence este mes?"

> "¿Cuánto tenemos para cobrar?"

> "¿Cuánto nos costó Córdoba?"

> "¿Qué problemas tengo ahora?"

Alex debe responder exclusivamente utilizando datos disponibles en el sistema y fuentes autorizadas.

No debe inventar información.

Cuando no exista información suficiente debe indicarlo.

---

# 18. ALERTAS INTELIGENTES

El sistema debe detectar:

- demora;
- desvío de ruta;
- parada no prevista;
- exceso de tiempo detenido;
- consumo anormal;
- mantenimiento próximo;
- documentación próxima a vencer;
- viaje en riesgo;
- cliente con atraso de pago;
- unidad improductiva;
- rentabilidad anormalmente baja;
- diferencia entre costo previsto y real.

---

# 19. INFORME AUTOMÁTICO DEL DÍA

Enviar al propietario o responsable:

## INFORME OPERATIVO

- unidades activas;
- viajes activos;
- demoras;
- incidentes;
- mantenimiento;
- documentación;
- facturación;
- cuentas por cobrar;
- principales riesgos.

Debe existir versión:

- WhatsApp;
- web;
- email;
- PDF.

---

# 20. CENTRO DE INCIDENTES

Cada incidente debe registrar:

- fecha;
- hora;
- unidad;
- conductor;
- ubicación;
- tipo;
- descripción;
- fotografías;
- audio;
- documentos;
- estado;
- responsable;
- resolución;
- costo.

Tipos:

- accidente;
- avería;
- demora;
- neumático;
- combustible;
- documentación;
- carga;
- cliente;
- seguridad.

---

# 21. PORTAL PARA CLIENTES

En una segunda etapa permitir que el dador de carga pueda consultar:

- viaje;
- ubicación;
- estado;
- ETA;
- llegada;
- prueba de entrega;
- documentación.

Sin acceder a información interna de la empresa transportista.

---

# 22. ARQUITECTURA TECNOLÓGICA

Priorizar tecnologías que permitan desarrollar rápidamente y con bajo costo inicial.

Arquitectura sugerida:

- Frontend web;
- Backend API;
- PostgreSQL;
- n8n;
- WhatsApp Business;
- APIs de mapas;
- APIs de tráfico;
- proveedores GPS/telemática;
- almacenamiento documental;
- IA;
- sistema de autenticación;
- sistema de roles;
- sistema de auditoría.

La plataforma debe diseñarse como SaaS multiempresa.

Cada empresa debe tener aislamiento lógico de sus datos.

---

# 23. SEGURIDAD Y PRIVACIDAD

Implementar:

- autenticación segura;
- roles y permisos;
- registro de actividad;
- backups;
- cifrado en tránsito;
- protección de credenciales;
- separación de tenants;
- políticas de retención;
- recuperación ante incidentes.

La geolocalización de personas y sus desplazamientos constituye información alcanzada por la normativa argentina de protección de datos personales, por lo que deben contemplarse base legal, información/consentimiento cuando corresponda y controles de acceso. 

No utilizar datos de clientes para otros fines sin autorización contractual y base legal correspondiente.

---

# 24. RESPALDO NECESARIO PARA VENDER EL PRODUCTO

Antes de vender a empresas medianas o grandes, construir:

### RESPALDO COMERCIAL

- sociedad o estructura fiscal adecuada;
- CUIT;
- facturación;
- términos y condiciones;
- contrato SaaS;
- política de privacidad;
- política de tratamiento de datos;
- SLA;
- política de soporte;
- política de backups.

### RESPALDO TECNOLÓGICO

- dominio propio;
- SSL;
- infraestructura estable;
- backups automáticos;
- monitoreo;
- logs;
- recuperación ante fallos;
- documentación técnica.

### RESPALDO CONTRACTUAL

El contrato debe establecer claramente:

- qué proporciona el software;
- disponibilidad;
- soporte;
- límites de responsabilidad;
- propiedad de los datos;
- tratamiento de datos;
- confidencialidad;
- cancelación;
- exportación de información;
- servicios de terceros;
- dependencia de GPS/APIs;
- condiciones ante caída de servicios externos.

### RESPALDO DE SEGURIDAD

Para clientes grandes, preparar progresivamente:

- políticas de seguridad;
- control de accesos;
- MFA;
- backups;
- plan de contingencia;
- registro de incidentes;
- procedimiento de recuperación.

No afirmar certificaciones que todavía no se posean.

---

# 25. SEGUROS Y RESPONSABILIDAD

El proveedor del software NO debe presentarse como:

- transportista;
- asegurador;
- operador logístico;
- autoridad regulatoria;
- certificador;
- responsable de la carga.

Debe quedar contractualmente establecido que:

> La plataforma es una herramienta tecnológica de gestión, monitoreo, análisis y asistencia operativa.

La empresa transportista continúa siendo responsable de sus operaciones, vehículos, conductores, cargas, documentación y cumplimiento normativo.

Evaluar con un abogado y un productor/asesor de seguros si corresponde contratar:

- responsabilidad civil tecnológica;
- cyber insurance;
- responsabilidad profesional;
- cobertura por incidentes de seguridad.

---

# 26. INTEGRACIONES GPS

NO obligar inicialmente al cliente a comprar un GPS específico.

La plataforma debe aspirar a trabajar con múltiples proveedores mediante una capa de integración.

Modelo:

GPS proveedor A
+
GPS proveedor B
+
GPS proveedor C
+
API propia
↓
Capa de normalización
↓
CONTROL TOWER

Esto evita quedar atado a un único proveedor.

---

# 27. MODELO DE NEGOCIO

No competir por precio con sistemas básicos.

Posicionamiento:

> **Software de control y rentabilidad para empresas de transporte.**

Modelo mensual SaaS.

Rango inicial a validar comercialmente:

### 5–10 unidades
$150.000–$250.000/mes

### 11–30 unidades
$300.000–$500.000/mes

### 31–75 unidades
$600.000–$1.000.000/mes

### 76–150 unidades
$1.000.000–$1.800.000/mes

### 151–300 unidades
$1.800.000–$3.000.000/mes

### 300–500+
Plan Enterprise personalizado.

Estos valores deben validarse mediante entrevistas y pilotos antes de convertirse en tarifario definitivo.

---

# 28. COBRO DE IMPLEMENTACIÓN

No regalar la implementación.

Cobrar:

- configuración;
- migración de datos;
- capacitación;
- integración GPS;
- configuración WhatsApp;
- parametrización;
- dashboards;
- usuarios;
- carga inicial.

La implementación puede representar aproximadamente:

> 1 a 3 meses del valor mensual del SaaS

dependiendo del tamaño y complejidad.

---

# 29. ESTRATEGIA DE VENTA

NO vender:

> "Tenemos un software para camiones."

Vender:

> **"Le damos al dueño de la empresa una torre de control desde la cual puede saber qué está pasando con toda su operación y cuánto dinero está generando."**

La demostración debe comenzar con una situación real:

> "Tiene 150 camiones. Son las 14:30. Muéstreme qué está pasando."

Después mostrar:

1. mapa;
2. viajes;
3. demoras;
4. alertas;
5. incidentes;
6. costos;
7. rentabilidad;
8. IA.

---

# 30. ESTRATEGIA DE VALIDACIÓN

Antes de construir todo:

Conseguir 5–10 empresas piloto.

Buscar:

- 10 camiones;
- 30 camiones;
- 50 camiones;
- 100 camiones;
- 300+ camiones.

Preguntar:

> "¿Cómo saben hoy dónde está cada unidad?"

> "¿Cómo controlan las demoras?"

> "¿Cómo calculan el costo real de cada viaje?"

> "¿Cómo controlan combustible?"

> "¿Cómo controlan mantenimiento?"

> "¿Cómo saben qué camión está perdiendo dinero?"

> "¿Cómo reciben información de los choferes?"

> "¿Cuánto tiempo dedica personal administrativo a perseguir información?"

> "¿Cuánto les cuesta un viaje demorado?"

> "¿Qué información necesitan para tomar decisiones que hoy no tienen?"

No vender inicialmente el producto.

Descubrir primero el problema.

---

# 31. MVP

La primera versión NO debe intentar construir todo.

Debe incluir:

### 1. Empresas
### 2. Usuarios
### 3. Camiones
### 4. Choferes
### 5. Clientes
### 6. Viajes
### 7. Mapa
### 8. GPS
### 9. Estados del viaje
### 10. ETA
### 11. Alertas
### 12. WhatsApp
### 13. Documentos
### 14. Combustible
### 15. Costos
### 16. Dashboard
### 17. Alex Control

Después incorporar:

- mantenimiento;
- neumáticos;
- portal de clientes;
- facturación;
- cuentas por cobrar;
- análisis predictivo;
- marketplace de servicios;
- financiamiento.

---

# 32. OBJETIVO ECONÓMICO

El objetivo no es conseguir miles de pequeños clientes.

El objetivo es construir una cartera de empresas con alto valor mensual.

Ejemplo:

100 empresas × $650.000 promedio

= $65.000.000 mensuales de facturación recurrente.

250 empresas × $650.000 promedio

= $162.500.000 mensuales.

Estos valores son escenarios matemáticos, NO proyecciones garantizadas.

---

# 33. SEGUNDA ETAPA — ECOSISTEMA

Cuando exista una base significativa de clientes:

Integrar proveedores de:

- combustible;
- neumáticos;
- talleres;
- GPS;
- seguros;
- repuestos;
- financiación;
- factoring;
- servicios para conductores.

El SaaS se convierte progresivamente en:

> **Infraestructura digital para empresas de transporte.**

Los ingresos adicionales podrían provenir de:

- comisiones;
- servicios premium;
- integraciones;
- marketplace;
- servicios financieros mediante partners autorizados;
- hardware;
- instalación;
- consultoría;
- analítica avanzada.

---

# 34. POSICIONAMIENTO FINAL

La propuesta de valor debe resumirse en:

> ### "Toda su empresa de transporte bajo control."

Y una segunda frase:

> **"Sepa dónde está cada unidad, qué está pasando con cada viaje, qué problemas están por ocurrir y cuánto dinero está generando realmente su flota."**

No vender tecnología.

Vender:

### CONTROL

### PREVISIBILIDAD

### RENTABILIDAD

### TIEMPO

### INFORMACIÓN

### DECISIONES

---

# 35. REGLA DE ORO DEL PRODUCTO

Si una funcionalidad no ayuda al responsable a:

- ahorrar;
- controlar;
- anticipar;
- facturar;
- cobrar;
- reducir errores;
- aumentar utilización;
- mejorar rentabilidad;

no debe ser prioritaria.

El producto debe evitar convertirse en otro ERP gigantesco lleno de pantallas que nadie utiliza.

Debe ser:

> **simple para el usuario, poderoso por detrás.**

---

# 36. VISIÓN A LARGO PLAZO

La visión final es construir:

> ## EL SISTEMA OPERATIVO DIGITAL DE LA EMPRESA DE TRANSPORTE

Con:

**Operación**
+
**Flota**
+
**Tráfico**
+
**GPS**
+
**Conductores**
+
**Documentación**
+
**Mantenimiento**
+
**Combustible**
+
**Clientes**
+
**Finanzas**
+
**IA**
+
**WhatsApp**

todo conectado en una única plataforma.

El dueño debe poder abrir su teléfono y preguntar:

> **"¿Cómo está mi empresa?"**

Y recibir una respuesta basada en datos reales, actuales y auditables.