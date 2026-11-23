
## Objetivo de esta bitácora

Este documento recoge la evolución real del proyecto Investment Strategy Lab.

La finalidad es documentar el proceso de trabajo mientras ocurre, evitando tener que reconstruirlo al final.

Aquí se recogerán:

- idea inicial;
    
- cambios de enfoque;
    
- decisiones importantes;
    
- funcionalidades desarrolladas;
    
- errores detectados;
    
- cambios de arquitectura;
    
- uso de herramientas de IA;
    
- validaciones realizadas;
    
- fuentes utilizadas;
    
- aprendizajes;
    
- siguientes pasos.
    

La bitácora no sustituye a los archivos específicos de `Decisiones.md`, `Versiones.md` o `Errores de la IA.md`, sino que resume cronológicamente la evolución general del proyecto.

---

# 1. Idea inicial

La idea inicial del proyecto era analizar el denominado “coste invisible de invertir”.

El objetivo era mostrar cuánto patrimonio podía perder un inversor a largo plazo por elegir productos con mayores costes.

La primera versión planteaba comparar dos alternativas con:

- misma inversión inicial;
    
- mismas aportaciones;
    
- misma rentabilidad bruta;
    
- diferentes costes.
    

El sistema calculaba la diferencia de patrimonio final causada por los costes.

---

# 2. Primera conclusión importante

Durante el desarrollo nos dimos cuenta de que este planteamiento era demasiado limitado.

Si dos inversiones tienen exactamente la misma rentabilidad bruta y una tiene mayores costes, la alternativa más barata siempre tendrá un mejor resultado neto.

Por tanto, aunque el cálculo fuera matemáticamente correcto, la decisión financiera era demasiado obvia.

Esta fue una de las primeras decisiones importantes tomadas por el equipo.

Decidimos ampliar la pregunta del proyecto.

La nueva pregunta pasó a ser:

**¿Qué estrategia de inversión es realmente más eficiente cuando tenemos en cuenta rentabilidad, riesgo, diversificación y todos sus costes?**

---

# 3. Primer prototipo

La primera versión de la aplicación se desarrolló con ayuda de Antigravity.

Se utilizaron inicialmente:

- Python;
    
- Streamlit;
    
- yfinance;
    
- Plotly;
    
- pandas.
    

El prototipo incluía:

- búsqueda de activos;
    
- datos de mercado;
    
- histórico;
    
- gráficos;
    
- comparación básica de costes.
    

Esta versión permitió validar rápidamente la idea, pero también generó varios problemas técnicos y conceptuales.

---

# 4. Problemas detectados en la primera versión

Durante las pruebas aparecieron distintos problemas.

Entre ellos:

- errores de navegación;
    
- problemas con `session_state`;
    
- errores de parámetros;
    
- funcionalidades que Antigravity declaraba corregidas pero que seguían fallando;
    
- dificultades para crear una interfaz visual suficientemente profesional;
    
- aumento excesivo de la complejidad de la aplicación.
    

También se detectó un error financiero importante:

la IA asignó un TER a acciones individuales como TSLA.

Esto se corrigió al comprobar que una acción individual no tiene un TER equivalente al de un ETF o fondo.

---

# 5. Primera reorientación técnica

Debido a los problemas de la arquitectura inicial, se decidió abandonar Streamlit como arquitectura principal.

Se creó una nueva versión con:

Frontend:

- React;
    
- Vite;
    
- React Router;
    
- Recharts.
    

Backend:

- Python;
    
- FastAPI;
    
- yfinance.
    

Esta decisión buscaba mejorar:

- estabilidad;
    
- separación entre interfaz y lógica;
    
- navegación;
    
- escalabilidad;
    
- experiencia de usuario;
    
- estética.
    

---

# 6. V0.1 — Explore Markets

La nueva versión comenzó de forma incremental.

La V0.1 se centró en:

- Home;
    
- Explore Markets.
    

Entre las funcionalidades incluidas:

- búsqueda de acciones y ETFs;
    
- datos de mercado;
    
- históricos;
    
- gráficos;
    
- selección de periodos;
    
- identificación del tipo de activo;
    
- tratamiento correcto del TER.
    

TSLA y VOO se utilizaron como activos de prueba, pero el buscador permite consultar otros activos.

---

# 7. Nueva dirección del producto

Posteriormente se redefinió con mayor precisión el objetivo final de Investment Strategy Lab.

El proyecto pasa a orientarse principalmente a nuevos inversores que quieren invertir su patrimonio a largo plazo pero que todavía no tienen conocimientos financieros avanzados.

La aplicación pretende permitirles:

- explorar mercados;
    
- aprender conceptos financieros;
    
- construir estrategias;
    
- simular cómo se habrían comportado históricamente;
    
- comparar alternativas;
    
- entender rentabilidad y riesgo;
    
- analizar costes;
    
- comprender diversificación;
    
- recibir explicaciones asistidas por IA;
    
- tomar decisiones mejor informadas antes de invertir realmente.
    

La aplicación no pretende ejecutar inversiones reales ni predecir el futuro.

---

# 8. Nueva estructura funcional

Se define la siguiente estructura inicial:

## News / Market News

Noticias económicas y financieras actuales obtenidas mediante fuentes legales y gratuitas.

## Explore Markets

Búsqueda y análisis de acciones y ETFs con datos históricos reales.

## Strategy Builder

Módulo principal de la aplicación.

Permitirá crear múltiples estrategias y asignar activos y pesos.

## Strategy Comparison

Permitirá comparar cómo se habrían comportado históricamente varias estrategias durante un periodo seleccionado.

## Cost Analysis

Permitirá analizar y comparar costes de producto y costes de intermediación.

## AI Strategy Analyst

Permitirá interpretar los resultados y explicar trade-offs, riesgos y diferencias entre las estrategias.

---

# 9. Cambio en el workflow de IA

Inicialmente Antigravity se utilizó como principal herramienta de desarrollo.

Posteriormente se decidió incorporar Claude Code como herramienta principal de razonamiento y construcción.

El nuevo workflow previsto es:

## Claude Code

Responsable principal de:

- arquitectura;
    
- desarrollo;
    
- frontend;
    
- backend;
    
- lógica financiera;
    
- debugging;
    
- UX/UI;
    
- revisión de código.
    

## Obsidian

Responsable de:

- documentación;
    
- decisiones;
    
- versiones;
    
- fuentes;
    
- errores de IA;
    
- bitácora;
    
- trazabilidad.
    

## Equipo humano

Responsable de:

- definir alcance;
    
- aprobar decisiones;
    
- validar funcionalidades;
    
- detectar errores;
    
- contrastar resultados;
    
- decidir cuándo una fase está terminada.
    

Antigravity podrá utilizarse únicamente si aporta una función real y diferenciada, por ejemplo como herramienta independiente de testing o ejecución.

---

# 10. Nueva metodología de desarrollo

Se decide trabajar estrictamente por fases.

Antes de construir una nueva funcionalidad:

1. se analiza;
    
2. se diseña;
    
3. se implementa;
    
4. se ejecuta;
    
5. se prueba;
    
6. se revisa;
    
7. se documenta;
    
8. se aprueba.
    

No se pasa a la siguiente fase hasta que el equipo confirme que la anterior está validada.

---

# 11. Fase 0 — Auditoría con Claude Code (2026-11-11)

Antes de seguir desarrollando, Claude Code auditó el código y la documentación **sin modificar nada**. Además de leer el código, ejecutó el backend contra Yahoo real, pasó la suite de tests existente y probó la interfaz en el navegador.

Principales conclusiones:

- **El stack es adecuado** (React + FastAPI) y el código es pequeño: se decide estabilizar, no rehacer.
- **Errores de datos:** índices, cripto y futuros aparecían como "Stock"; fondos no cotizados como "ETF"; un ticker inexistente se mostraba como una acción válida con "TER: No aplica".
- **Riesgo financiero latente:** un campo de TER de Yahoo viene en puntos porcentuales y el código lo habría multiplicado por 100 (0,03 % → 3 %).
- **Metodología:** el gráfico usaba precios ajustados sin decirlo, "10A" no cubría 10 años y los periodos largos usaban velas semanales o mensuales.
- **Tests:** 3 de los 10 tests de V0.1 no podían fallar y uno dependía del mercado. Lo documentado ("100 % superado") no reflejaba una verificación real completa.
- **Entorno:** `requirements.txt` no coincidía con lo instalado; los `.bat` no entraban en su carpeta; no hay git.
- **Documentación:** varios documentos describían el enfoque antiguo (dos estrategias, cinco módulos, "Coste Invisible").

Detalle de las decisiones: [[Decisiones]] Partes II y III.

---

# 12. Fase 1 — Estabilización de la base (V0.2, 2026-11-11)

Objetivo: corregir lo detectado en la auditoría que afecta a la base, sin añadir funcionalidades nuevas.

Qué se hizo:

- backend separado en acceso a datos, lógica financiera pura, negocio y rutas;
- universo limitado a acciones y ETFs, con mensajes claros para el resto;
- tickers inexistentes → error 404 con mensaje; la interfaz permite seguir usando la app;
- TER con unidades verificadas y sin valores inventados;
- histórico diario para periodos largos y variación sin redondeos previos;
- funciones de rentabilidad, CAGR, volatilidad y máximo drawdown probadas con series sintéticas (aún no visibles en pantalla);
- caché para no repetir llamadas a Yahoo;
- nueva suite de tests en tres niveles (deterministas, integración y E2E);
- navegación con los seis módulos, los futuros marcados como "Próximamente";
- interfaz en español con formato es-ES, nota sobre precios ajustados y aviso educativo en el pie;
- scripts de arranque corregidos y caché de Vite fuera de OneDrive.

Incidencia durante la validación: OneDrive bloqueaba la caché de Vite y el frontend no arrancaba. Se resolvió moviendo esa caché a la carpeta temporal del sistema.

Resultados: ver [[Acceptance tests]] §Fase 1.

Uso de IA en esta fase: Claude Code implementó y probó los cambios. Las decisiones marcadas como ⏳ en [[Decisiones]] quedan pendientes del equipo.

**Resultado:** el equipo revisó la V0.2 y la **APROBÓ**.

---

# 13. Fase 2 — Explore Markets completo + News (V0.3, 2026-11-11)

## Cambios de alcance decididos por el equipo

- **Universo de activos ampliado.** En la Fase 1 se había limitado a acciones y ETFs. Para la Fase 2 el equipo decidió incorporar también índices, criptomonedas, futuros y fondos no cotizados, porque un principiante también quiere consultar "el S&P 500" o "bitcoin".
- **News se adelanta.** Se construye junto con Explore Markets en lugar de en la Fase 6, porque es independiente del resto de módulos.

## Explore Markets

- Periodos predefinidos (1M, 6M, año actual, 1A, 5A, 10A, Máx.) y **fechas personalizadas**.
- **Métricas visibles:** rentabilidad total (y solo por precio), CAGR, volatilidad anualizada y máxima caída, cada una con una explicación breve y su fórmula.
- **Todos los cálculos con datos diarios.** Se eliminan los periodos intradía 1D y 1S (ver [[Decisiones]] D19).
- **Gráfico nuevo:** valor ajustado, zona de máxima caída resaltada y un segundo gráfico de "caída desde máximos".
- Avisos claros para fines de semana, festivos, históricos cortos, periodos sin datos y periodos demasiado cortos para el CAGR.
- Notas metodológicas según el tipo de activo: un índice no incluye dividendos, en cripto la volatilidad se anualiza con 365 días, y los futuros son una serie continua.
- **Nuevo diseño visual:** paleta azul marino e índigo, tipografía Plus Jakarta Sans y **Capi**, una mascota (una moneda con un brote) que explica cada página.

## News

- Investigación previa de fuentes:
  - Google News RSS funciona y permite buscar.
  - Los feeds oficiales del BCE y la Fed son estables.
  - elEconomista bloquea el acceso automático (403).
  - Los feeds de Expansión y Cinco Días mezclan información general o tienen titulares de sección poco útiles.
- **Elección:** Google News RSS (temas en español) + feeds oficiales del BCE y la Fed. No se hace scraping y no se copian artículos.
- Portada, 6 categorías y buscador libre. Caché, timeout, fuentes parciales y estado de error sin contenido inventado.

## Incidencias durante la validación

- **Umbral del CAGR.** El preset "1 año" no mostraba CAGR porque 365 días son 0,9993 años "de 365,25 días". Se cambió el umbral a 365 días naturales.
- **Categoría ETFs.** Estaba dominada por noticias de ETFs de criptomonedas; se excluyeron de la búsqueda temática.
- **Selector de fechas.** Impedía elegir fechas anteriores al histórico disponible sin avisar. Se quitó el límite y ahora el backend explica el caso.
- **Avisos contradictorios.** Con un rango anterior a todo el histórico aparecían a la vez "Solo hay datos desde…" y "No hay datos". Corregido.
- **Procesos huérfanos.** Durante las pruebas quedaron un servidor Vite y un proceso de uvicorn ocupando puertos, lanzados por las herramientas de prueba de Claude Code. No es un fallo de la aplicación.

Resultados: ver [[Acceptance tests]] §Fase 2.

**Resultado:** el equipo revisó la V0.3 y la **APROBÓ**.

---

# 14. Fase 3 — Strategy Builder (V0.4, 2026-11-12)

Es el núcleo del producto: el usuario construye sus estrategias. En esta fase **no** se calcula ningún resultado histórico; eso corresponde a Strategy Comparison.

## Qué se construyó

- **Varias estrategias:**
  - lista lateral (fila desplazable en móvil) con el estado de cada una y una mini barra de composición;
  - crear, renombrar, duplicar («— copia») y eliminar con confirmación.
- **Capital inicial simulado** en euros, con validación (vacío, texto, negativo, cero, demasiado grande, céntimos).
- **Activos** añadidos con el mismo buscador y la misma API de Explore Markets. Al añadir, se consulta la ficha para obtener la divisa. No se permiten duplicados.
- **Pesos objetivo** con validación (vacío, texto, negativo, 0 %, más de 100 %, más de 2 decimales).
  - Medidor del tipo «85 % asignado — queda 15 %» o «108 % asignado — debes reducir 8 %».
  - **La app nunca corrige ni redistribuye pesos por su cuenta.**
- **Composición** en un gráfico donut que se actualiza al instante, con la parte «sin asignar» en gris.
- **Persistencia** en `localStorage`, con versión de formato y recuperación si los datos están dañados. Sin base de datos ni cuentas.
- **Estado compartido** (React Context) para que Strategy Comparison pueda leer las estrategias.
- **Explicaciones breves** de peso, capital, diversificación y divisas, y Capi con un único mensaje discreto.

## Pruebas automatizadas nuevas

- Tests unitarios del modelo y de la persistencia con Vitest.
- Tests E2E en un navegador real con Playwright, usando el Microsoft Edge ya instalado (sin descargar navegadores).

## Incidencias durante la validación

- **Desbordamiento en móvil.** El editor se salía 26 px de la pantalla porque una rejilla CSS no podía encogerse. Lo detectó el test E2E de móvil y se corrigió.
- **OneDrive otra vez.** Bloqueó la carpeta temporal de resultados de Playwright (EPERM). Se movió a la carpeta temporal del sistema, como ya se hizo con la caché de Vite.
- **App ya arrancada por el equipo.** Al validar, la aplicación ya estaba en marcha, lanzada por el equipo con los `.bat`. Claude Code no cerró esos procesos y ejecutó las pruebas contra ellos.

Resultados: ver [[Acceptance tests]] §Fase 3.

**Resultado:** el equipo revisó la V0.4 y la **APROBÓ**.

---

# 15. Fase 4 — Strategy Comparison (V0.5, 2026-11-12)

Es el primer backtest real del proyecto. Responde a una pregunta: ¿cómo se habrían comportado estas estrategias si se hubieran puesto en marcha en este periodo? Es retrospectivo, no predictivo.

## Cómo se fijó la metodología

Las instrucciones del equipo para la Fase 4 ya fijaban las líneas principales:
- buy & hold sin rebalanceo;
- periodo común real sin inventar datos;
- precios ajustados sin contar dos veces dividendos ni TER;
- costes aplazados a Cost Analysis.

Claude Code tomó dos decisiones adicionales, documentadas en [[Decisiones]] D34-D41:
- **Divisas:** como el capital está en euros y no se pueden mezclar USD y EUR, se implementó una conversión sencilla con los tipos de cambio diarios de Yahoo. Queda ⏳ pendiente de validación.
- **Fechas comunes:** se alinean por **intersección**, sin rellenar precios. Es más simple que el forward-fill y no inventa observaciones.

## Qué se construyó

- **Backend:**
  - capa pura `analytics/portfolio.py` (divisas, alineación, buy & hold, pesos finales, base 100);
  - servicio de orquestación;
  - ruta `POST /api/comparison/backtest`.
- **Frontend:**
  - selector de 2 a 6 estrategias (las no válidas explican qué falta);
  - periodos y fechas personalizadas;
  - franja con el periodo común efectivo;
  - gráfico de cada 100 € invertidos y de caída desde máximos;
  - tabla sin rankings y composición inicial frente a final;
  - explicación de la metodología.
- **Tests:**
  - 68 tests de backend nuevos (63 deterministas con resultados conocidos y 5 de integración real);
  - 11 tests E2E en el navegador.

## Comprobaciones relevantes

- Una estrategia de un único activo en euros da **exactamente** las mismas métricas que Explore Markets en el mismo periodo.
- 100 % VOO en euros coincide **exactamente** con la variación de VOO en dólares combinada con la del EUR/USD.
- Con IBIT (cotiza desde enero de 2024), el periodo común empieza en 2024 y la app lo explica.

## Incidencias

No hubo fallos en la primera ejecución de los tests nuevos. Se siguió trabajando contra la aplicación que el equipo tenía arrancada, sin cerrar sus procesos.

Resultados: ver [[Acceptance tests]] §Fase 4.

**Resultado:** el equipo revisó la V0.5 y la **APROBÓ**. Después se preparó la entrega provisional para el profesor: bitácora en MD y PDF, y presentación PPTX en `entrega_provisional/`.

---

# 16. Fase 5 — Cost Analysis (V0.6, 2026-11-12)

La pregunta del módulo: ¿cuánto habría costado de verdad poner en marcha cada estrategia, y cómo cambia el resultado según el intermediario? El objetivo es hacer visibles los costes, no decir qué broker usar.

## Principio que guió la fase

Las instrucciones del equipo marcaban una regla crítica: **no restar el TER otra vez**. Nuestro backtest usa precios reales de los ETF, que ya descuentan su TER. Por eso el TER se muestra solo como información («ya reflejado en el precio histórico») y únicamente se restan los costes del intermediario.

## Investigación de tarifas

Se hizo una investigación limitada, solo con documentos oficiales:
- **ING Broker Naranja:** PDF de tarifas de octubre de 2026. El PDF está cifrado, así que el texto se extrajo con pypdfium2.
- **MyInvestor:** página oficial del bróker.
- **Trade Republic:** lista oficial de precios. Es de 04/2023 y queda señalada como limitación.
- **Revolut:** no se incluyó, porque sus tarifas dependen del plan.

Los comparadores web solo sirvieron para localizar los documentos. Todo quedó en un JSON versionado con fuente y fecha ([[Datos y fuentes]] §7).

## Qué se construyó

- **Backend:**
  - **Motor puro** `analytics/costs.py`: reglas de comisión (fija, porcentual, mínimo, máximo, tope por importe, por mercado o por instrumento), divisa, trimestres naturales, custodia, mantenimiento, resultado neto y salida.
  - **Servicio** que reutiliza exactamente la ventana y los precios de Strategy Comparison. Se refactorizó `backtest_service` sin cambiar su respuesta.
  - **Rutas** `GET /api/costs/brokers` y `POST /api/costs/analyze`.
- **Frontend:**
  - selección de estrategias, periodo e intermediario (con «Tarifas consultadas a…»);
  - formulario de costes personalizados;
  - tabla resumen antes/después;
  - barras de impacto desde 0 €;
  - desglose por estrategia con la salida aparte;
  - una estrategia bajo todos los intermediarios;
  - TER, fuente de la tarifa, metodología, tooltips y aviso breve.

## Comprobaciones relevantes

- **Coherencia con Comparison:** el resultado antes de costes es idéntico al valor final de Strategy Comparison, con datos sintéticos y reales.
- **Cálculo a mano:** «Acciones España» (SAN.MC + ITX.MC, 10.000 €, 5 años) con ING:
  - compras: 2 × (3 € + 5 €) = 16 €;
  - custodia: 19,46 trimestres × 2 valores × 4 € × 1,21 = 188,34 €.
  La app muestra exactamente esas cifras.
- **Hallazgo educativo:** en buy & hold, la **custodia** de un banco puede pesar mucho más que las comisiones de compra, porque se cobra cada trimestre sin operaciones.

## Incidencias

- **Dos fallos de test, no del motor:**
  - un redondeo a céntimos;
  - un test que suponía el tope de 20 € de ING con 100.000 €, cuando la tarifa solo lo aplica por debajo de 50.000 € (el motor daba bien 103 €).
- **Vitest:** se ejecuta en Node, sin `localStorage`; el guardado del módulo admite un almacenamiento inyectable, igual que el del Strategy Builder.
- **Playwright:** un selector de texto no contaba con los espacios entre celdas, y el escenario personalizado siempre está presente (5 filas, no 4). Se corrigieron los tests.

Resultados: ver [[Acceptance tests]] §Fase 5.

---

# 17. Fase 5.1 — Aportaciones periódicas y ampliación de intermediarios (V0.7, 2026-11-12)

Antes de aprobar la Fase 5, el equipo pidió dos ampliaciones:
- que las estrategias puedan tener **aportaciones periódicas**;
- que la comparación de costes incluya los **bancos y brokers** que usa de verdad un inversor español.

## Por qué importa
Con compras mensuales, una comisión por operación se paga muchas veces. Una tarifa que parece barata en buy & hold puede no serlo con aportaciones, y al revés: con ING, aportar cada mes elimina la custodia trimestral. Es el aprendizaje principal de esta ampliación, y ahora se ve en la comparación de intermediarios.

## Metodología (detalle en [[Decisiones]] D50–D58)
- **Aportaciones:** cada una compra solo su activo, el mismo día de cada mes, trimestre o año. Si ese día no hay mercado, se compra el siguiente día común. No se inventan precios y se usan participaciones fraccionarias.
- **Rentabilidad:** una aportación es dinero del usuario, no rentabilidad. Por eso las métricas se calculan sobre la **rentabilidad ponderada por el tiempo (TWR)**, y el dinero aportado, el valor final y la ganancia en euros se muestran aparte.
- **MWR / XIRR:** no se implementó. Se explica en D53.
- **Costes:** el motor se reescribió para trabajar con operaciones fechadas. La custodia se calcula sobre el patrimonio de cada día.

## Investigación de tarifas
Solo con fuentes oficiales:
- **Santander:** web de tarifas y folleto de tarifas **máximas**. La custodia se marca como máxima.
- **CaixaBank:** web de tarifas, perfil estándar sin pack. La custodia va sobre el nominal, así que solo se aplica el mínimo.
- **Bankinter:** webs de acciones y de ETP.
- **BBVA:** web de ETF y nota oficial de la tarifa joven. El folleto de BBVA Trader devolvió 403 y la tarifa de acciones estándar no se incluyó.
- **Revolut:** ayuda oficial de trading y de cambio de divisa, y página de planes.
- **Trade Republic:** web oficial actual. Sustituye a la lista de 2023 como fuente principal.

Algunas webs bloqueaban la descarga automática (403) y se leyeron con el navegador integrado, como lo haría un usuario. Los comparadores solo sirvieron para localizar los documentos.

## Qué se construyó
- **Builder:**
  - panel de aportaciones con validación por fila;
  - capital 0 € permitido solo con aportaciones;
  - eliminar un activo borra sus aportaciones;
  - las estrategias antiguas se cargan sin cambios.
- **Comparison:**
  - tabla «Dinero aportado y resultado»;
  - gráfico TWR con el valor real en euros en el tooltip.
- **Cost Analysis:**
  - selector agrupado (bancos tradicionales, brokers digitales y referencias), sin intermediario por defecto;
  - compras periódicas en el desglose;
  - nota educativa sobre las comisiones repetidas;
  - avisos de estimación.

## Incidencias
- **Fallo del motor (encontrado al revisar las cifras a mano, no por un test):** Bankinter daba 2.222 € en lugar de 2.440 €. La tarifa cobra 20 € por operación internacional aunque el umbral esté en dólares, y el motor convertía los 20 desde dólares. Se separó la divisa del umbral (`tier_ccy`) de la de la comisión (`fee_ccy`) y se corrigió el test, que reproducía el mismo error.
- **Tests con expectativas erróneas:**
  - el periodo termina el día siguiente al último cierre (no el 31-dic);
  - la custodia se calcula sobre lo invertido tras la comisión;
  - en español los números de 4 cifras no llevan punto de miles («1200 €»).
- **E2E:** una ejecución mostró la página en blanco en dos tests. No se reprodujo ni en el navegador ni al repetir la batería (38/38).

Resultados: ver [[Acceptance tests]] §Fase 5.1.

**Resultado:** el equipo validó la Fase 5 completa (Cost Analysis + aportaciones periódicas) y la **APROBÓ**.

---

# 18. Fase 6 — AI Strategy Analyst (V0.8, 2026-11-12)

La última gran fase funcional prevista. El analista convierte los resultados cuantitativos en una explicación educativa, prudente y algo personalizada. La regla central: **la IA interpreta, no calcula.**

## Arquitectura (detalle en [[Decisiones]] D59–D66)

```text
Strategy Builder → Strategy Comparison → Cost Analysis
      → input estructurado (ai/analyst_input.py)
      → proveedor (ai/provider.py, Claude con el SDK oficial) + prompt versionado
      → validación y guardrails (ai/validation.py)
      → página: tarjetas con las cifras de la app + texto del modelo
```

- **Proveedor:** el SDK de Anthropic solo se importa en `ai/provider.py`; el resto de la aplicación no depende de él.
- **Prompt:** está en un archivo versionado (`analyst-v1`), no escondido en React.
- **Cifras:** se pintan desde los datos de la aplicación, no desde el texto generado.

## Qué se construyó
- **Backend:** capa `ai/`, rutas `/api/analyst/status` y `/api/analyst/analyze`, caché de 1 h y errores con mensajes claros.
- **Frontend:**
  - página `/analyst` que reutiliza la selección de Comparison y el intermediario de Cost Analysis;
  - perfil educativo opcional;
  - botón «Generar análisis»;
  - estados de carga, error, reintento, sin estrategias, sin comparación previa y sin API configurada;
  - Capi y un aviso breve.

## Configuración
- En este entorno **no hay `ANTHROPIC_API_KEY`**: la aplicación muestra «El analista IA no está configurado en este entorno» y solo las cifras calculadas, sin inventar texto.
- **Para activarlo:** definir la variable de entorno o crear `backend/.env` a partir de `.env.example`, y reiniciar el backend.
- Se instaló el SDK `anthropic==2.8.0` (añadido a `requirements.txt`).

## Pruebas
- **Backend:** casi todos los tests usan un proveedor falso (sin coste de API): input, parsing, errores, caché, guardrails, prompt y desacoplamiento.
- **Prueba real:** hay una sola, y se omitió por falta de clave.
- **E2E:** simulan la respuesta de la IA interceptando la petición.
- **Regresión:** pasa entera (Playwright 44/44).

## Incidencias
- Un test daba por hecho que el input no podía contener «<»; el nombre del perfil «BBVA · Tarifa joven (<30)» lo contiene sin ser HTML. Se cambió el test para buscar etiquetas HTML.
- En la primera captura, el distintivo «opcional» heredaba el estilo del número de paso y una fila de las tarjetas se partía en dos líneas. Se corrigieron ambos.

Resultados: ver [[Acceptance tests]] §Fase 6.

---

# 19. Fase 6.1 — AI Strategy Analyst local con LM Studio (V0.9, 2026-11-12)

Antes de aprobar la Fase 6, el equipo cambió una decisión importante: **no usar una API de pago ni requerir ninguna clave.** La IA pasa a ejecutarse en local con **LM Studio**, gratis, en el ordenador del usuario. La etapa con Anthropic queda como parte de la historia (§18 y [[Decisiones]] D60, D67).

## Qué cambió
- **Proveedor:** `LMStudioProvider` sustituye al proveedor de Anthropic. Usa la API local compatible de LM Studio con `requests`: sin SDK, sin claves y sin *fallback* a servicios de pago.
- **Estados:** el analista distingue LM Studio no iniciado, sin modelo cargado, modelo configurado no encontrado, desactivado y listo. En todos los casos sin IA se ven las cifras calculadas y nunca un texto inventado.
- **Prompt `analyst-v2`:** añade reglas de JSON estricto, porque los modelos locales cumplen peor el formato. El parsing tolera bloques de código, razonamiento `<think>` y texto alrededor.
- **Frontend:** mensaje e instrucciones de LM Studio y botón «Comprobar de nuevo». El resto de la página no cambia.
- **Dependencias:** se eliminó el SDK `anthropic` de `requirements.txt` y del entorno.

## Preparación para GitHub
- `.gitignore` ampliado y `README.md` profesional en la raíz.
- **Rutas personales en los `.bat`:** tenían la ruta de este ordenador. Ahora usan `%LOCALAPPDATA%`.
- **Alias de la Microsoft Store:** el primer `python` del `PATH` en este equipo es ese alias, que no funciona. El `.bat` prueba primero la instalación de usuario y después el `PATH`. Comprobado en este equipo.

## Pruebas
- Toda la batería pasa; los tests del analista usan proveedores simulados.
- **Detección real en este entorno:** LM Studio no está instalado ni en marcha. `/api/analyst/status` devuelve `server_down` y la página muestra el aviso. **No se instaló LM Studio ni se descargó ningún modelo**, como pidió el equipo.

## Incidencias
- Al reescribir el aviso del frontend, quedó una etiqueta `<div>` cerrada con `</p>`. Se corrigió antes de compilar, y build y E2E pasan.

## Primera prueba real del equipo con LM Studio (añadido en la Fase 8)
*Esta entrada no se registró en su momento; se reconstruye a partir de la transcripción de la sesión.*
- **Contexto:** el equipo instaló LM Studio con `qwen/qwen3-8b`. `/api/analyst/status` respondía 200, pero `POST /api/analyst/analyze` devolvía **504**.
- **Problema 1:** la página decía que el backend estaba apagado. El equipo lo diagnosticó como un timeout esperando al modelo y pidió:
  - un mensaje específico («El modelo local está tardando más de lo esperado») con reintento;
  - un timeout mayor.
  Ver [[Errores de la IA]] E15.
- **Problema 2:** con los logs de LM Studio, el equipo vio que Qwen3 generaba razonamiento interno a ~1,96 tokens/s y no llegaba al JSON antes del corte. Pidió:
  - desactivar el razonamiento (`/no_think`);
  - `max_tokens` 1400 (antes 4096);
  - timeout de 270 s;
  - mantener JSON y guardrails.
  Ver [[Errores de la IA]] E16 y [[Decisiones]] D69.
- **Pruebas:** solo los tests afectados, con proveedores simulados. El equipo interrumpió una prueba de Claude Code contra su modelo real; desde entonces los E2E del analista están totalmente simulados.
- **Pendiente:** validación humana completa con el modelo real (la Fase 6 sigue 🟦).

Resultados: ver [[Acceptance tests]] §Fase 6.1.

---

# 20. Fase 7 — Mejoras según el feedback del profesor (V0.10, 2026-11-18)

El profesor Luis pidió priorizar tres cosas: métricas de riesgo (Sharpe), un benchmark de mercado y mostrar cómo los costes erosionan el interés compuesto según la rotación. El equipo añadió «Mi lista» en Explore Markets. Todo es incremental, sin rediseñar módulos.

- **Sharpe:**
  - antes de implementarlo se planteó al equipo la tasa libre de riesgo;
  - el €STR del BCE es oficial, pero solo existe desde octubre de 2019;
  - el equipo eligió **rf = 0 % explícito** (D71).
- **Benchmark:** se comprobaron en Yahoo las series disponibles. Se eligió `^SP500TR` (índice con dividendos) y `IWDA.AS` como proxy etiquetado del MSCI World, porque el índice MSCI de Yahoo es de solo precio (D72–D73).
- **Sensibilidad a costes:** simulación educativa separada del backtest, con perfiles de rotación de hipótesis visibles (D74–D75).
- **Incidencias:**
  - en Windows, `Favorites.jsx` y `favorites.js` chocaban (nombres que solo difieren en mayúsculas); se renombró el componente a `FavoritesUI.jsx`;
  - en la revisión visual, las frases del benchmark se partían en columnas y el gráfico de valor de la sensibilidad apenas mostraba diferencias; se pasó a la diferencia acumulada, con el eje desde 0 €;
  - dos E2E antiguos contaban 4 métricas en Explore Markets y ahora son 5.

Resultados: ver [[Acceptance tests]] §Fase 7.

---

# 21. Estado actual *(🔁 superado: ver §24)*

- **Fases 0 a 5:** aprobadas.
- **Fase 6 (V0.9, analista local):** completada técnicamente. **Pendiente de validación humana con un modelo real en LM Studio.**
- El proyecto está preparado para publicarse en GitHub, aunque todavía no hay repositorio git.

---

# 22. Próximo paso *(🔁 superado: ver §25)*

1. Instalar LM Studio, descargar y cargar un modelo (elección del equipo) e iniciar el servidor local.
2. En AI Strategy Analyst: «Comprobar de nuevo» → «Generar análisis», con varias estrategias, con y sin aportaciones, con y sin intermediario, y con distintos perfiles.
3. Ejecutar `python -m pytest -m integration tests/test_integration_analyst.py`.
4. Decidir qué se publica en GitHub (`entrega_provisional/` y nombres del equipo, D70).
5. Si todo es correcto: aprobar la Fase 6.

---

# 23. Fase 8 — Investigación principal, trazabilidad, decisiones y auditoría de errores de IA (2026-11-18)

Fase **solo documental**: no se ha modificado código ni añadido funcionalidades.

## Qué se hizo
- **Evidencia reunida:**
  - el enunciado del profesor («El carril abierto»);
  - la transcripción de las sesiones de Claude Code (informe de auditoría de la Fase 0, textos originales de la V0.1, mensajes del equipo);
  - el registro de errores del prototipo en `../Proyecto Coste Invisible/`;
  - el código actual.
- **[[Investigación principal]] (nuevo):**
  - problema, pregunta e hipótesis H1–H4;
  - variables, mecanismo coste–largo plazo y papel de cada módulo;
  - literatura con DOI verificado en Crossref y fuentes institucionales (CNMV, ESMA);
  - experimentos posibles con la app y limitaciones.
  - **No contiene resultados empíricos.**
- **[[Cadena de datos y reproducibilidad]] (nuevo):**
  - definición propia de «cadena de datos trazable y reproducible»;
  - cadenas A–F (mercado, métricas, comparación, costes, benchmark y analista IA) con diagramas Mermaid basados en archivos y funciones reales;
  - distinción entre información externa, derivada y generativa.
- **[[Errores de la IA]] (rehecho, autorizado por el equipo):**
  - matriz de 30 casos: 6 A, 12 B y 12 C, con herramienta, evidencia, fuente primaria y acción humana;
  - incluye errores de Antigravity y de Claude Code;
  - el registro original del equipo se conserva íntegro en un anexo.
- **[[Decisiones]]:**
  - Parte XII: tres decisiones candidatas (D77), con una alternativa propuesta (D42);
  - alternativas realmente descartadas (D78);
  - «Qué haríamos diferente» (D79);
  - D69 se actualiza con la configuración posterior del modelo local.
- **[[Idea del Proyecto]]:** cronología completa (Coste Invisible → comparador → Investment Strategy Lab → evolución) y herramientas utilizadas.
- **[[Datos y fuentes]]:** índice de fuentes con qué aporta cada una, URL, fecha, limitación, módulo y tipo; se comprobó que coincide con el código.
- **[[Checklist entrega Luis]] (nuevo):** requisitos del enunciado con evidencia y estado.
- **`Claude.md`:** reglas prácticas y estado general, manteniéndolo corto.

## Fuentes verificadas en esta fase (18/11/2026)
- CNMV, *Guía rápida: Fondos cotizados (ETF)*: texto extraído del PDF oficial.
- ESMA, nota de prensa del informe de costes de 2025 (03/03/2026).
- Documentación de yfinance (`auto_adjust`, por defecto `True`).
- DOI de Barber y Odean (2000), Carhart (1997), French (2008) y Sharpe (1994), comprobados en Crossref. El primer DOI probado para French era incorrecto y se sustituyó por el que devuelve Crossref.

## Posibles errores para revisión humana (no corregidos)
- **Sensibilidad a costes:** las órdenes de venta de los perfiles de rotación usan la regla de comisión de compra (`analytics/sensitivity.py`). **PENDIENTE DE REVISIÓN.**
- **Limitación frente a la pregunta:** el riesgo (volatilidad, Sharpe) se calcula antes de costes de intermediación; no hay un Sharpe neto. Está documentado en [[Investigación principal]] §11, sin cambios de código.

## Uso de IA en esta fase
- Claude Code reunió la evidencia, verificó fuentes en la web y redactó los documentos.
- La selección de casos, decisiones y redacción final de la bitácora corresponde al equipo.

---

# 24. Estado actual *(🔁 superado: ver §27)*

- **Fases 0 a 5:** aprobadas.
- **Fase 6 (analista local) y Fase 7 (mejoras del feedback):** completadas técnicamente, pendientes de validación humana.
- **Fase 8:** documentación completada por Claude Code, **pendiente de revisión del equipo**.
- Sin repositorio git.

---

# 25. Próximo paso *(🔁 superado: ver §28)*

1. El equipo revisa los documentos de la Fase 8 y elige:
   - los casos de [[Errores de la IA]] para la entrega;
   - las tres decisiones (D77).
2. Validar las Fases 6 y 7 con la aplicación, y el analista con un modelo real.
3. Ejecutar los experimentos de [[Investigación principal]] §10 y guardar parámetros y capturas.
4. Crear el repositorio git y decidir qué se publica (D70).
5. Redactar la bitácora final de 2–4 páginas (no incluida en la Fase 8).

---

# 26. Fase 8.1 — Cierre funcional (V0.11, 2026-11-18)

Fase de cierre antes de los experimentos empíricos. **Sin funcionalidades nuevas.** Tres cuestiones concretas.

## 1. Alerta de Cost Sensitivity: era un error real
- **Pregunta del equipo:** cuando la simulación de sensibilidad hace ventas, ¿usa la comisión de venta o reutiliza la de compra? Había que investigarlo sin dar por hecho el error.
- **Investigación del código:**
  - `analytics/sensitivity.py` calculaba todas las órdenes con `trade_rule(..., "buy", ...)` y `fx_fee(..., "buy", ...)`;
  - el motor (`analytics/costs.py`) sí distingue los lados;
  - en `broker_fees.json` los 10 perfiles usan la misma regla para compra y venta, así que **las cifras mostradas hasta ahora no cambian**;
  - todos los tests existentes usaban comisiones simétricas.
- **Prueba:** un test con compra 1 € y venta 10 € **falló** con el código anterior (cobraba 1 € por cada venta).
- **Corrección:** cada perfil reparte sus órdenes entre ventas y compras, y cada una usa su propia regla y divisa. Ver [[Decisiones]] D81 y [[Errores de la IA]] E31.

## 2. Decisión humana: retirar AI Strategy Analyst
El equipo decidió que AI Strategy Analyst **no forma parte del producto final**. Fundamentación completa en [[Decisiones]] D80; candidata fuerte para la bitácora.

| | |
|---|---|
| **Qué intentamos** | Una capa de IA que interpretase los resultados cuantitativos |
| **Qué construimos** | Proveedor desacoplado, input estructurado, prompts versionados, guardrails, modelo local (LM Studio + Qwen3 8B) y tests simulados |
| **Qué ocurrió** | Funcionaba técnicamente en parte, pero la inferencia local era lenta (timeouts, razonamiento a ~1,96 tokens/s) y poco práctica (§19) |
| **Alternativas** | API de Anthropic, otro proveedor en la nube, LM Studio local o eliminar la funcionalidad |
| **Qué decidimos** | Eliminarla del producto final |
| **Por qué** | Simplicidad, reproducibilidad, rendimiento, distribución pública y coste. Además, el valor incremental era limitado frente a las métricas deterministas |
| **Aprendizaje** | Saber abandonar una funcionalidad técnicamente sofisticada cuando no mejora lo suficiente el producto también es control sobre la tecnología |

**IA como método ≠ IA en el producto.** Retirar el analista no retira la IA del proyecto: Antigravity y Claude Code han sido centrales en el método de desarrollo.

**Retirada técnica:**
- **Backend:** se eliminaron `backend/ai/`, `routers/analyst.py`, los errores del analista, la carga de `.env`, `.env.example` y sus tests.
- **Frontend:** se eliminaron `features/analyst/`, `api/analystApi.js`, la ruta `/analyst`, la entrada de navegación y Home, y su E2E.
- **Sin dependencias huérfanas:** `requests` se queda porque lo usa News.
- **Rastro conservado:** `Histórico/AI Strategy Analyst/` (prompts v1 y v2 y nota del experimento).
- **Comprobación con la app en marcha del equipo:**
  - el backend (con recarga automática) responde 404 en `/api/analyst/status`;
  - el build no contiene ninguna referencia al analista.
- LM Studio seguía abierto en el ordenador del equipo (puerto 1234); no se tocó.

## 3. README y GitHub
- `README.md` describe solo el producto activo:
  - News, Explore Markets con Mi lista, Strategy Builder con aportaciones;
  - Strategy Comparison con métricas de riesgo y benchmark;
  - Cost Analysis y Cost Sensitivity.
- Añade «Metodología» y «Desarrollo asistido por IA»:
  - Antigravity, Claude Code y Obsidian (que no es una IA);
  - LM Studio + Qwen3 8B como experimento descartado.
- `.gitignore` revisado. **No se ha creado el repositorio.**

## Bankinter
Sin trabajo adicional, por instrucción del equipo. E05 se mantiene con su clasificación.

## Pruebas
- **Backend:** 295 tests deterministas y 54 de integración + E2E (red y app en marcha).
- **Frontend:** Vitest 93/93, build correcto y Playwright 45/45 contra la app del equipo.
- Cubren Home, News, Explore Markets, Mi lista, Strategy Builder, aportaciones, Strategy Comparison, benchmark, Sharpe, Cost Analysis y Cost Sensitivity.

---

# 26b. Fase 9 — Investigación empírica con la app (2026-11-19)

Se usó Investment Strategy Lab (V0.11) **como instrumento**, sin tocar código ni interfaz. Detalle completo en [[Experimentos y resultados]].

**Método:**
- **Hipótesis previas:** H-E1 a H-E5, escritas y guardadas **antes** de ejecutar.
- **Estrategias:** cuatro, definidas antes de ver resultados:
  - BASE 70/30 (`IWDA.AS` + `EUNH.DE`);
  - A global 100 % renta variable;
  - B mixta 60/40;
  - C concentrada en tres acciones españolas.
- **Fechas fijas:** del 18/11/2016 al 18/11/2026, y del 18/11/2021 para 5 años.
- **Script reproducible:** `Resultados investigación/experimentos.py`. Solo llama a la API existente y guarda JSON y CSV.
- **Una sola variable por experimento**, y estrategias con los mismos activos en cada petición para no alterar el calendario común.

**Resultados principales** (simulaciones históricas, no predicciones):
- **E1:** con la misma estrategia y aportaciones mensuales, el impacto de los costes fue de 4 € a 13.331 € según el intermediario. Lo explica la estructura de la tarifa: comisión fija por operación internacional, porcentual, plan sin comisión, cuota o custodia.
- **E2:** con la misma cantidad anual, el efecto del momento de entrada (+2.747 € a favor de la mensual) superó al de comisiones con ING (−677 €), pero no con CaixaBank (−11.574 €) ni con Bankinter. La frecuencia «buena» depende de la tarifa.
- **E3:** la estrategia concentrada tuvo la mayor rentabilidad (y superó al S&P 500 TR, contra la hipótesis previa), con mayor volatilidad. Las tres estrategias quedaron casi empatadas en Sharpe (0,82–0,86).
- **E4:** pasar de 10 a 5 años cambió el CAGR (9,3 % → 6,7 %), la peor caída y el signo de la comparación de Sharpe frente al índice.
- **E5:** en la simulación hipotética, la rotación alta restó un 2,5 % (MyInvestor), un 7,6 % (ING) o un 37,3 % (Bankinter) en 10 años.

**Incidencias y correcciones:**
- **Errata propia corregida:** el coste de buy & hold con ING en E3 se había escrito como «0,2–0,6 %» del valor final. Al revisar las cifras resultó ser 0,6–1,8 %, casi todo custodia.
- **Supuestos del motor que condicionan la lectura** (no son errores de cálculo; se documentan como limitaciones):
  - custodia y mantenimiento sin coste de oportunidad;
  - la sensibilidad no incluye la custodia;
  - BBVA ETF no comprueba la selección de ETF;
  - planes sin comisión supuestos para Trade Republic y Revolut.
- **Sin bugs que impidieran los experimentos.**

**Pendiente:** validación manual del equipo ([[Acceptance tests]], «Validación manual durante experimentos») y revisión de los resultados.

---

# 26c. Fase 9.1 — Validación metodológica y congelación de resultados (2026-11-19)

Objetivo: validar los resultados de la Fase 9 antes de usarlos en la bitácora y la presentación. Sin funcionalidades nuevas ni experimentos nuevos.

**Supuestos de E1** contrastados con fuentes oficiales actuales (detalle en [[Experimentos y resultados]], «Validación metodológica»):

| Supuesto | Veredicto |
|---|---|
| BBVA ETF | **No verificable:** la selección de ETF solo se ve con sesión iniciada |
| Trade Republic | **Confirmado** que ambos ETF admiten plan sin comisión; **aproximación** en la fecha de ejecución y sin plan anual (+20 € en E2, irrelevante) |
| Revolut | **Aproximación:** reglas coherentes, pero la lista de ETP elegibles solo está en la app; cuota de Premium imputada entera |
| Santander | **Aproximación (cota superior):** la custodia es la tarifa **máxima** del folleto (1 % anual, mínimo 60 € por clase de valor extranjero) |
| CaixaBank | **Aproximación justificada:** custodia «sobre el importe nominal», no disponible, así que se usa el mínimo |

Ningún supuesto obligó a cambiar datos ni a repetir E1.

**Custodia sin coste de oportunidad:**
- se decide **no** modificar el motor (opción B): habría que cambiar cómo se simula la cartera y revisar el motor aprobado;
- se documenta que, con custodias altas, el impacto está infravalorado (como mucho, del orden del 60 % de la custodia pagada, según una estimación propia).

**Cost Sensitivity:**
- el texto visible pasa a «Sensibilidad a costes de operativa (rotación)», y la nota y el ⓘ explican que no incluye la custodia del intermediario;
- cambio solo de texto en `frontend/src/features/costs/CostSensitivity.jsx` y en el README;
- 19 E2E afectados superados.

**Congelación:** E1, E2 y E3 validados con limitaciones; E4 validado; E5 hipotético. Se añade el grado de certeza (ALTA/MEDIA/BAJA) de cada cifra principal.

**Validación humana:** se priorizan 6 comprobaciones (P1–P6 en [[Acceptance tests]]).

**✅ Validación del equipo (2026-11-19):**
- el equipo realizó en la interfaz las comprobaciones P1–P6 y **todas coinciden** con los valores esperados:
  - P1: ING, 772 € y 83.395,20 €;
  - P2: Bankinter, 4.840 €;
  - P3: valores antes de costes por frecuencia;
  - P4: estrategia C y Sharpe del índice;
  - P5: CAGR y Sharpe a 5 años;
  - P6: título y nota de la sensibilidad, 1.240 €;
- **los resultados de los cinco experimentos quedan definitivamente congelados**, por decisión del equipo;
- no se modificó código, experimentos ni resultados.

---

# 26d. Fase 10 — Bitácora final y publicación en GitHub (2026-11-19 → 2026-11-23)

- **Bitácora final.** Se redactó en `.md` (versión maestra) y `.docx` (derivado), con las tres decisiones (D77-A, D77-B/C y D80), tres errores principales (E01, E02 y E03) y otros siete resumidos.
- **Repositorio.** Se publicó en https://github.com/ceciliapardos/investment-strategy-lab:
  - antes de publicar se revisaron secretos y rutas personales, y se ajustó `.gitignore`;
  - `entrega_provisional/` se excluyó por decisión del equipo;
  - el commit sale con el email anónimo de GitHub, y la autenticación la hizo el equipo en el navegador.

# 26e. Fase 11 — Publicación web: Live Demo (V1.0, 2026-11-23)

**Objetivo.** Que cualquiera pueda usar la aplicación desde el navegador sin instalar nada, sin coste y sin tarjeta.

**Elección de plataforma.** Antes de elegir se comprobaron las condiciones actuales de cada proveedor:
- Fly.io y Google Cloud Run exigen tarjeta, y Koyeb verifica una.
- Render ofrece gratis un servicio web (750 h al mes, 512 MB) y sitios estáticos, sin tarjeta.
- Se eligió Render para las dos piezas, con un único `render.yaml`, para que el equipo necesitara una sola cuenta ([[Decisiones]] D82).

**Cambios.** Solo de despliegue; nada financiero:
- `VITE_API_BASE_URL` en el frontend (`frontend/src/api/config.js`);
- `ALLOWED_ORIGINS` en el CORS del backend, sin `*`;
- un mensaje claro cuando el servidor gratuito está arrancando;
- el Blueprint `render.yaml`.

Antes de subir nada se simuló la producción en local: dos orígenes, CORS aceptado y rechazado, y ruta interna directa.

**Acción del equipo.** El equipo creó la cuenta de Render con GitHub y desplegó el Blueprint. Render asignó exactamente las URL previstas, así que no hubo que corregir ninguna variable.

**Verificación en producción** (detalle en [[Acceptance tests]] §Fase 11):
- Funcionan, probados desde la interfaz pública: Home, navegación, Explore Markets, Mi lista, Strategy Builder (con aportaciones), Strategy Comparison (con benchmark y Sharpe), Cost Analysis (con ING) y la sensibilidad a costes. También la recarga de rutas internas, la página 404 en `/analyst` y la vista móvil.
- Las cifras de la sensibilidad coinciden con las del experimento E5.

**Hallazgo: News queda parcial en producción.** Google News RSS no responde a las peticiones que salen del servidor de Render, aunque desde un ordenador personal sí. El BCE y la Fed sí funcionan.
- No se ha intentado eludir el bloqueo.
- Queda documentado como limitación y como decisión pendiente del equipo.

**URLs:**
- Live Demo: https://investment-strategy-lab.onrender.com
- API: https://investment-strategy-lab-api.onrender.com
- Repositorio: https://github.com/ceciliapardos/investment-strategy-lab

---

# 27. Estado actual

- **Fases 0 a 5:** aprobadas.
- **Fase 6:** experimento AI Strategy Analyst, construido y **descartado por decisión humana**.
- **Fases 7, 8, 8.1, 10 y 11:** pendientes de revisión del equipo. La Fase 9.1 (resultados congelados) está validada.
- **Producto final:** 5 módulos, sin dependencias de IA ni servicios de pago.
- **Publicación:**
  - repositorio público en GitHub;
  - Live Demo en https://investment-strategy-lab.onrender.com.

---

# 28. Próximo paso

1. El equipo revisa la Live Demo y la limitación de News en producción (D82 ⏳).
2. Confirmar con el profesor si basta con el enlace al repositorio o lo quiere en github.com/lgarvia.
3. Preparar la presentación.
