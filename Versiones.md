# Historial de versiones

| Versión | Fase | Fecha | Estado |
|---|---|---|---|
| Prototipo Streamlit | — | antes de V0.1 | Abandonado (ver [[Bitácora]] §3-5) |
| V0.1 | Home + Explore Markets | — | Sustituida por V0.2 |
| — | Fase 0: auditoría | 2026-11-11 | Completada (sin cambios de código) |
| V0.2 | Fase 1: estabilización de la base | 2026-11-11 | **APROBADA** por el equipo |
| V0.3 | Fase 2: Explore Markets completo + News | 2026-11-11 | **APROBADA** por el equipo |
| V0.4 | Fase 3: Strategy Builder | 2026-11-12 | **APROBADA** por el equipo |
| V0.5 | Fase 4: Strategy Comparison | 2026-11-12 | **APROBADA** por el equipo |
| V0.6 | Fase 5: Cost Analysis | 2026-11-12 | Ampliada por la V0.7 antes de su aprobación |
| V0.7 | Fase 5.1: aportaciones periódicas + ampliación de intermediarios | 2026-11-12 | **APROBADA** por el equipo (Fase 5 completa) |
| V0.8 | Fase 6: AI Strategy Analyst (con la API de Anthropic) | 2026-11-12 | Sustituida por la V0.9 antes de su aprobación |
| V0.9 | Fase 6.1: AI Strategy Analyst local con LM Studio + preparación para GitHub | 2026-11-12 | 🔁 Experimento retirado del producto en la V0.11 (decisión del equipo, D80) |
| V0.10 | Fase 7: Sharpe, benchmark, sensibilidad a costes y favoritos | 2026-11-18 | Completada técnicamente, pendiente de validación |
| — | Fase 8: investigación, trazabilidad y auditoría documental | 2026-11-18 | Sin cambios de código; en revisión |
| **V0.11** | **Fase 8.1: cierre funcional — corrección de Cost Sensitivity, retirada de AI Strategy Analyst y README** | 2026-11-18 | **Completada técnicamente, pendiente de revisión del equipo** |

Roadmap y estado de cada fase: [[Fases del proyecto]]. No se empieza una fase hasta que la anterior esté **APROBADA**.

---

## V0.11 — Fase 8.1: cierre funcional

### Corrección
- **Cost Sensitivity** (`backend/analytics/sensitivity.py`):
  - las órdenes de venta de los perfiles de rotación usaban la regla de compra; ahora cada orden paga la comisión y el cambio de divisa de su lado (D81, [[Errores de la IA]] E31);
  - sin efecto en los 10 perfiles actuales, que tienen la misma regla para compra y venta;
  - 2 tests de regresión nuevos en `test_phase7.py`.

### Retirada de AI Strategy Analyst (D80)
- **Backend eliminado:**
  - `backend/ai/` (proveedor, prompts, input, validación y servicio);
  - `routers/analyst.py`;
  - errores `InvalidAnalystRequest`, `AnalystUnavailable`, `AnalystTimeout` y `AnalystInvalidResponse`;
  - carga de `backend/.env` en `main.py` y `backend/.env.example`;
  - `tests/test_analyst.py` y `tests/test_integration_analyst.py`.
- **Frontend eliminado:**
  - `features/analyst/` (página, resultados, perfil y su test);
  - `api/analystApi.js`;
  - ruta `/analyst` y entrada del menú y de la Home (`modules.js`);
  - `e2e/ai-analyst.spec.js`.
- **Sin dependencias huérfanas:** `requests` se mantiene porque lo usa News; el frontend no tenía dependencias exclusivas del analista.
- **Evidencia conservada:** `Histórico/AI Strategy Analyst/` (prompts v1 y v2 y una nota), D59–D69, V0.8–V0.9 y [[Bitácora]] §18–19.

### README y GitHub
- `README.md` describe solo el producto activo y añade «Metodología» y «Desarrollo asistido por IA».
- `.gitignore`:
  - fuera la excepción `!.env.example`;
  - se añaden `.claude/` y cachés locales de pip.

### Tests
- Backend: 295 deterministas, 54 de integración y E2E.
- Frontend: Vitest 93/93, build correcto y Playwright 45/45.

---

## V0.10 — Fase 7: mejoras según el feedback del profesor

### Funcionalidad
- **Sharpe:**
  - calculado en `analytics/metrics.py` (`sharpe_ratio`), con las mismas rentabilidades diarias que la volatilidad;
  - en Explore Markets (tarjeta, «No aplica» en futuros) y en Strategy Comparison (columna, sobre la rentabilidad TWR);
  - tasa libre de riesgo del 0 %, indicada junto a la métrica (D71).
- **Benchmark:**
  - selector «Referencia de mercado (opcional)» en Strategy Comparison: `^SP500TR` (índice directo) o `IWDA.AS` (proxy ETF del MSCI World);
  - línea discontinua en el gráfico, sección «Tus estrategias vs. referencia de mercado» y frases con periodo y métricas, sin declarar ganadores;
  - nueva ruta `GET /api/comparison/benchmarks`; parámetro `benchmark` en el backtest (D72–D73).
- **Sensibilidad a costes:**
  - sección en Cost Analysis (`analytics/sensitivity.py`, `POST /api/costs/sensitivity`);
  - cuatro perfiles de rotación con hipótesis visibles, intermediario real, coste recurrente opcional y rentabilidad supuesta;
  - tabla y gráfico de diferencia acumulada frente a sin costes, con el eje desde 0 (D74–D75).
- **Mi lista:** favoritos en Explore Markets (`features/favorites/`, `localStorage` `isl.favorites`): añadir, quitar, abrir y persistencia (D76).

### Qué NO cambia
News, AI Strategy Analyst, aportaciones, sistema de intermediarios, metodología del backtest (el benchmark no altera el periodo ni los resultados de las estrategias) y diseño general.

---

## V0.9 — Fase 6.1: AI Strategy Analyst local con LM Studio

> 🔁 **Experimento construido y posteriormente descartado por decisión humana** (V0.11, D80). Se conserva como historia.

### Cambios
- **Proveedor:**
  - `LMStudioProvider` (`backend/ai/provider.py`) sustituye a `AnthropicProvider`;
  - usa la API local compatible de LM Studio (`/v1/models` y `/v1/chat/completions`) con `requests`, sin SDK ni API key;
  - pide salida estructurada (`response_format` con esquema JSON).
- **Estados del analista:** listo, LM Studio no iniciado, sin modelo cargado, modelo configurado no encontrado y desactivado. La respuesta `not_available` lleva el estado, un mensaje y las cifras calculadas: nunca un análisis inventado.
- **Configuración** (variables no sensibles, `backend/.env.example`): `AI_PROVIDER=lmstudio`, `LMSTUDIO_BASE_URL`, `LMSTUDIO_MODEL` (vacío = primer modelo disponible; se ignoran los de *embeddings*) y `AI_TIMEOUT_SECONDS=180`.
- **Prompt `analyst-v2`:** mismo método que v1, más reglas de JSON estricto para modelos locales. v1 se conserva.
- **Parsing robusto:** acepta JSON con bloques de código, con razonamiento `<think>` o con texto alrededor. La validación y los guardrails no cambian.
- **Anthropic eliminado del flujo:**
  - fuera el SDK (`requirements.txt` y entorno), `ANTHROPIC_API_KEY`, el *fallback* automático y la lógica de Claude;
  - no hay ningún *fallback* a servicios de pago.
- **Frontend:** mensaje e instrucciones de LM Studio (abrir, cargar modelo, iniciar servidor) y botón «Comprobar de nuevo». El diseño se mantiene.
- **GitHub:**
  - `.gitignore` ampliado: `.env*` salvo `.env.example`, cachés, logs, temporales, resultados de tests, modelos locales (`*.gguf`, `*.safetensors`…) y editores;
  - `README.md` en la raíz;
  - `.bat` sin rutas personales (`%LOCALAPPDATA%`).
- **Tests:**
  - `test_analyst.py` con 54 tests: servidor LM Studio simulado, estados, timeout, conexión, HTTP 4xx/5xx, respuesta incompleta, modelo inexistente y JSON envuelto;
  - integración real que se omite si LM Studio no tiene modelo;
  - E2E `ai-analyst.spec.js` con 7 tests.

---

## V0.8 — Fase 6: AI Strategy Analyst (sustituida por la V0.9)

### Funcionalidad
- **Página `/analyst`:**
  - selección de estrategias, periodo e intermediario, que reutiliza lo elegido en Strategy Comparison y Cost Analysis;
  - perfil educativo opcional: horizonte, tolerancia a caídas y prioridad;
  - botón «Generar análisis».
- **Resultado:**
  - tarjetas de cifras pintadas desde los datos de la aplicación;
  - texto de la IA: resumen, trade-offs, riesgo, costes, aportaciones, contexto del perfil, notas por estrategia, conceptos y limitaciones;
  - avisos de cifras no verificadas;
  - modelo y versión del prompt.
- **Estados:** carga, error con reintento, sin estrategias, sin comparación previa, sin datos en el periodo, sin API configurada (muestra solo las cifras) y análisis desactualizado.
- **Caché:** en el servidor (1 h) y en la sesión del navegador. La API nunca se llama sin pulsar el botón.
- Ver [[Decisiones]] D59–D66 y [[Datos y fuentes]] §8.

### Código nuevo
- **Backend `ai/`:**
  - `provider.py`: interfaz y `AnthropicProvider`; es el único archivo que importa el SDK;
  - `prompts.py` y `prompts/analyst_system_v1.md`: prompt versionado;
  - `analyst_input.py`: input estructurado y perfil;
  - `validation.py`: esquema JSON, parsing y guardrails;
  - `analyst_service.py`: orquestación y caché.
- **Backend, resto:**
  - `routers/analyst.py`: `GET /api/analyst/status` y `POST /api/analyst/analyze`;
  - errores `AnalystUnavailable` (502), `AnalystTimeout` (504), `AnalystInvalidResponse` (502) e `InvalidAnalystRequest` (400);
  - `main.py` carga `backend/.env` si existe; `.env.example` sin clave;
  - dependencia `anthropic==2.8.0`;
  - `run_comparison` admite 1 estrategia (parámetro `min_count`).
- **Frontend:**
  - `features/analyst/` (`AIStrategyAnalyst`, `AnalystResults`, `profile.js`, CSS) y `api/analystApi.js`;
  - módulo activado en la navegación.
- **Tests:**
  - `test_analyst.py` (40, con proveedor falso);
  - `test_integration_analyst.py` (1 llamada real, se omite sin clave);
  - `profile.test.js` (5);
  - `e2e/ai-analyst.spec.js` (6, con la respuesta de IA simulada).

### Qué NO incluye
Predicciones, recomendaciones, optimización de carteras, conexión con News, órdenes reales, asesoramiento regulado y conversación libre (chat).

---

## V0.7 — Fase 5.1: aportaciones periódicas + ampliación de intermediarios

### Funcionalidad
- **Strategy Builder:**
  - panel «Aportaciones periódicas» (opcional): añadir, modificar y eliminar aportaciones;
  - cada aportación tiene activo de la estrategia, importe y frecuencia mensual, trimestral o anual;
  - validación por fila y total anual orientativo;
  - capital inicial 0 € permitido solo con aportaciones.
- **Strategy Comparison:**
  - simulación de cada aportación como compra de su activo en la fecha programada (o el siguiente día común);
  - rentabilidad, CAGR, volatilidad y máxima caída sobre la **rentabilidad ponderada por el tiempo (TWR)**;
  - tabla «Dinero aportado y resultado»: capital inicial, aportaciones, total aportado, valor final, ganancia o pérdida y TWR;
  - el tooltip del gráfico muestra el valor real en euros.
- **Cost Analysis:**
  - una operación por cada aportación, con su comisión y su divisa;
  - franquicias de órdenes gratuitas, planes de inversión sin comisión, tramos por importe y custodia sobre el patrimonio de cada momento;
  - 10 perfiles tarifarios oficiales en dos grupos;
  - sin intermediario por defecto («Selecciona intermediario»);
  - nota educativa sobre comisiones repetidas y avisos de estimación (tarifa máxima, nominal).
- Ver [[Decisiones]] D50–D58 y [[Datos y fuentes]] §7.

### Código nuevo o modificado
- **Backend:**
  - `analytics/portfolio.py`: `contribution_flows`, `simulate`, `twr_index` y `money_summary`;
  - `analytics/costs.py`, reescrito para operaciones fechadas;
  - `services/backtest_service.py`: validación de aportaciones, `simulate_strategy`, métricas TWR y serie en euros;
  - `services/cost_service.py`;
  - `routers/comparison.py`: `recurringContributions`;
  - `data/broker_fees.json`: versión 2026-11-12b, 10 perfiles.
- **Frontend:**
  - `features/strategies/`: modelo, almacenamiento, contexto, `ContributionsPanel` y `CapitalField`;
  - `features/comparison/`: `ContributionsTable` y tooltip en euros;
  - `features/costs/`: selector agrupado, desglose de compras periódicas y comparación por grupos.
- **Tests:**
  - `test_contributions.py` (31) y `test_costs.py` (37, reescrito);
  - integración (+1);
  - `contributions.test.js` (11);
  - `e2e/contributions.spec.js` (7).

### Qué NO incluye
Rentabilidad ponderada por el dinero (MWR/XIRR), rebalanceo, frecuencias distintas de mensual, trimestral y anual, packs bancarios, promociones y tarifas negociadas.

---

## V0.6 — Fase 5: Cost Analysis

### Funcionalidad
- **Qué se analiza:** de 1 a 6 estrategias del Strategy Builder, sobre el mismo backtest y periodo común que Strategy Comparison.
- **Escenarios de intermediación:**
  - sin costes de intermediación (referencia);
  - ING Broker Naranja, MyInvestor y Trade Republic, con tarifas oficiales consultadas el 12/11/2026;
  - costes personalizados introducidos por el usuario.
- **Costes modelados:**
  - compra inicial por activo;
  - cambio de divisa, solo si aplica;
  - custodia con su periodicidad real;
  - mantenimiento;
  - venta, como «coste estimado de salida», aparte.
- **Resultados:**
  - franja con el periodo, el intermediario y la fecha de las tarifas;
  - tabla resumen con el resultado antes y después de costes del intermediario, en € y %, coste de salida y resultado tras la salida;
  - barras antes/después desde 0 €;
  - desglose por estrategia, con el detalle por activo;
  - una estrategia bajo todos los escenarios;
  - TER como información, ya reflejado en el precio;
  - fuente y condiciones de la tarifa, metodología y aviso breve.
- **Avisos:** «Datos incompletos» cuando la tarifa no cubre un activo, por ejemplo cripto.
- La configuración se recuerda al recargar.
- Ver [[Decisiones]] D42–D49 y [[Datos y fuentes]] §6–7.

### Código nuevo
- **Backend:**
  - `data/broker_fees.json`, `analytics/costs.py`, `services/cost_service.py` y `routers/costs.py`;
  - error `InvalidCostScenario` (400);
  - `backtest_service` refactorizado: `prepare_window` y `window_summary` son reutilizables y la respuesta de Comparison no cambia.
- **Frontend:**
  - `features/costs/` (`CostAnalysis`, `ScenarioPicker`, `CostResults`, `model.js`, `tips.jsx`, CSS) y `api/costsApi.js`;
  - módulo «Cost Analysis» activado en la navegación.
- **Tests:**
  - `test_costs.py` (37), `test_cost_service.py` (26) y `test_integration_costs.py` (3);
  - `model.test.js` (10);
  - `e2e/cost-analysis.spec.js` (12).

### Qué NO incluye
Impuestos, cánones de mercado, spreads, slippage, rebalanceos, aportaciones periódicas, rankings de brokers, recomendaciones y asesoramiento.

---

## V0.5 — Fase 4: Strategy Comparison (APROBADA)

### Funcionalidad
- **Qué se compara:** de 2 a 6 estrategias del Strategy Builder, leídas directamente de su estado compartido. No hay una segunda estructura de datos.
- **Periodo:** 1A, 3A, 5A, 10A, máximo común o fechas personalizadas.
- **Backtest:** buy & hold, en euros con tipos de cambio diarios, sobre el periodo común de todos los activos, con precios ajustados y sin costes ([[Decisiones]] D34-D41).
- **Resultados:**
  - franja con el periodo común efectivo, el método y la divisa;
  - avisos sobre qué activo limita el periodo;
  - gráfico de cada 100 € invertidos y gráfico de caída desde máximos, con leyenda que oculta y muestra estrategias;
  - tabla comparativa sin rankings;
  - composición inicial y final con la rentabilidad de cada activo en euros;
  - explicación de la metodología.
- **Estados:** menos de dos estrategias, estrategias no válidas (con «Editar»), periodo sin datos, errores de activos y de fechas.
- La selección y el periodo se recuerdan al recargar.

### Código nuevo
- **Backend:**
  - `analytics/portfolio.py`, `services/backtest_service.py`, `routers/comparison.py`;
  - nuevos errores `InvalidComparison` (400) y `UnusableAsset` (422);
  - preset 3Y.
- **Frontend:**
  - `features/comparison/`: `StrategyComparison`, `ComparisonPicker`, `ComparisonChart`, `ComparisonTable`, `CompositionCompare`, `selection.js`;
  - `api/comparisonApi.js`;
  - `PeriodControls` admite presets propios.
- **Tests:** `test_portfolio.py` (29), `test_backtest.py` (34), `test_integration_backtest.py` (5) y `e2e/strategy-comparison.spec.js` (11).

### Qué NO incluye
Rebalanceo, aportaciones periódicas, costes de intermediación, correlaciones, rankings, recomendaciones y predicciones.

---

## V0.4 — Fase 3: Strategy Builder (APROBADA)

### Funcionalidad
- **Estrategias:** crear, renombrar, duplicar, eliminar (con confirmación) y cambiar entre ellas. Hasta 20 estrategias.
- **Capital inicial simulado** en euros, con validación.
- **Activos:** buscador de Explore Markets reutilizado, 6 tipos de activo, sin duplicados, hasta 25 por estrategia.
- **Pesos objetivo:** validación completa, medidor de asignación y reparto aproximado en euros de cada activo. Nunca se corrigen automáticamente.
- **Composición:** gráfico donut que se actualiza al instante.
- **Estado de la estrategia** («Lista para comparar» / «Incompleta») con la lista de lo que falta.
- **Persistencia** en `localStorage` con formato versionado. Estado compartido mediante React Context.
- **Estado vacío** guiado en tres pasos.
- Ver [[Decisiones]] D26-D33.

### Código nuevo
- `frontend/src/features/strategies/`:
  - `model.js` (modelo y validaciones puras);
  - `storage.js`;
  - `StrategiesContext.jsx`;
  - `StrategyBuilder.jsx` y sus componentes: `StrategyList`, `StrategyHeader`, `CapitalField`, `AssetPicker`, `AssetRow`, `AllocationMeter`, `CompositionChart`, `StrategySummary`.
- `components/ConfirmDialog.jsx`.
- Variantes nuevas de `SearchBar` (versión clara) y de `PageHero` (versión compacta).
- **Tests:**
  - `model.test.js` y `storage.test.js` (Vitest);
  - `e2e/strategy-builder.spec.js` (Playwright);
  - comandos `npm test` y `npm run test:e2e`.

### Qué NO incluye
Rendimiento histórico de la cartera, rebalanceo, aportaciones periódicas, correlaciones, costes, recomendaciones y conversión de divisas.

### Tests
65 unitarios y 8 E2E en el navegador, más la regresión del backend: ver [[Acceptance tests]] §Fase 3.

---

## V0.3 — Fase 2: Explore Markets completo + News (APROBADA)

### Explore Markets
- **Tipos de activo:** acciones, ETFs, índices, criptomonedas, futuros y fondos, con una regla de TER y una nota metodológica por tipo ([[Decisiones]] D18).
- **Periodos:** 1M, 6M, año actual, 1A, 5A, 10A, Máx., y **fechas personalizadas**. Todo con datos diarios; se eliminan 1D y 1S (D19).
- **Métricas:** rentabilidad total (y solo por precio), CAGR, volatilidad y máxima caída, con explicación y fórmula (D20, D21).
- **Periodo:** fechas reales del análisis, número de sesiones y cierre cotizado inicial y final.
- **Avisos:** fines de semana o festivos, histórico más corto, fecha futura, sin datos y 1 solo cierre.
- **Gráfico:** valor ajustado con la zona de máxima caída resaltada, más un gráfico sincronizado de caída desde máximos. El tooltip muestra el valor ajustado, el cierre cotizado y la caída.
- **Explicación desplegable:** qué datos se usan y cómo se calcula cada métrica.
- **API:** `GET /api/markets/performance/{ticker}?period=…` o `?start=…&end=…`, que sustituye a `/history`.

### News
- **Fuentes:** Google News RSS + feeds oficiales del BCE y la Fed (D23).
- **Contenido:** portada equilibrada, 6 categorías y buscador libre del último mes (D24).
- **Formato:** tarjetas editoriales con titular, medio, hora relativa (fecha completa al pasar el ratón), categoría y enlace a la fuente en una pestaña nueva.
- **Robustez:** caché, timeout, fuentes parciales, contenido anterior si una fuente cae, y estado de error o vacío sin contenido inventado (D25).
- **API:** `GET /api/news?category=…`, `GET /api/news/search?q=…`, `GET /api/news/categories`.

### Diseño
- Nuevo sistema visual: paleta, tipografía y cabeceras oscuras (D22).
- Mascota **Capi** en Explore Markets y News.
- Componentes nuevos: `PageHero`, `Mascot`, `InfoTip`, `TypeBadge`, `PeriodControls`, `MetricsPanel`, `PerformanceChart`, `NewsCard`.

### Tests
124 deterministas, 32 de integración y 13 E2E, todos superados: ver [[Acceptance tests]] §Fase 2.

### Qué NO incluye
Strategy Builder y módulos posteriores; conversión de divisas; TER de ETFs UCITS no publicados por Yahoo (pendiente para Cost Analysis).

---

## V0.2 — Fase 1: estabilización de la base (APROBADA)

- **Backend en capas:** acceso a datos, lógica financiera pura, negocio y rutas.
- **Errores corregidos:** clasificación de activos, ticker inválido (404), TER con unidades verificadas (posible error ×100) y caché.
- **Tests y entorno:** suite pytest en tres niveles, `requirements.txt` reproducible, `.bat` corregidos y caché de Vite fuera de OneDrive.
- **Interfaz:** navegación con los 6 módulos, páginas "Próximamente" y 404, español y formato es-ES.
- **Resultado:** 57 tests deterministas, 16 de integración y 11 E2E superados. Aprobada por el equipo.

---

## V0.1 — Home & Explore Markets (histórico)

Construida con Antigravity. Incluía Home, buscador de acciones y ETFs, ficha con precio y TER, y gráfico con 7 periodos coloreado en verde o rojo.

**Lo que se documentó entonces:** "10/10 acceptance tests superados al 100 %".

**Lo que encontró la auditoría (Fase 0):**
- 3 de los 10 tests no podían fallar.
- El test de colores dependía del mercado.
- Se clasificaban mal índices, cripto, futuros y fondos, y un ticker inexistente se trataba como una acción válida.
- Se afirmaba el uso de Lucide React (no se usaba) y que los `.bat` funcionaban "en un clic" (no entraban en la carpeta correcta).
- `requirements.txt` no coincidía con lo instalado.

Todo ello se corrigió en V0.2.
