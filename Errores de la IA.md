# Errores de la IA

Auditoría de los errores reales de las herramientas de IA durante el desarrollo de **Investment Strategy Lab** (Fase 8, 2026-11-18).

**Para qué sirve:**
- Este documento **no elige** los casos de la entrega. Los ordena por fuerza para que el equipo humano escoja los tres (o más) que defenderá en la bitácora.
- Exigencia del enunciado: «tres casos concretos en los que la máquina se equivocó: qué te dijo, cómo detectaste que estaba mal, y contra qué fuente primaria lo comprobaste».

**Reglas de la auditoría:**
- **Solo casos con evidencia real**, verificable en el código, en la documentación histórica, en la transcripción de las sesiones de Claude Code o en el registro escrito por el equipo.
- No se ha inventado ningún caso, cita ni cifra.
- Cuando no hay cita literal, se dice.
- **No se cuentan como errores de la IA:** cambios de gusto, funcionalidades aún no pedidas, decisiones humanas, mejoras voluntarias, fallos del entorno no causados por la IA ni hipótesis que ya estaban marcadas como hipótesis. Los incidentes relacionados que no son errores van en la Parte III.B.
- **Se incluyen también los errores de Claude Code**, no solo los de Antigravity. El objetivo es mostrar el control sobre la máquina, no culpar a una herramienta.

**Herramientas:**
- **Antigravity:** prototipo en Streamlit y V0.1.
- **Claude Code:** desde la Fase 0.
- **Modelo local en LM Studio** (qwen/qwen3-8b): AI Strategy Analyst.
- Obsidian **no es una IA**: es la memoria y la trazabilidad del proyecto.

**Fuerza:**
- **A — muy fuerte.** Error real con consecuencia financiera o de credibilidad, evidencia documental o literal y una fuente primaria que lo refuta.
- **B — buen caso secundario.** Error real y demostrable, pero con menos peso financiero, sin cita literal o sin fuente primaria externa.
- **C — menor.** Incidencia real de poco alcance; sirve como aprendizaje.

**Fuentes de evidencia** (citadas abreviadas en la matriz):
- **[AUD0]** Informe de auditoría de la Fase 0 (Claude Code, 2026-11-11), conservado en la transcripción de la sesión. Resumen en [[Bitácora]] §11 y [[Versiones]] V0.1.
- **[V01]** Texto original de `Versiones.md` de la V0.1, escrito con Antigravity. Leído literalmente en la transcripción de la Fase 0 y resumido hoy en [[Versiones]] §V0.1.
- **[TS]** Código original de `backend/test_suite.py` de la V0.1, leído literalmente en la transcripción de la Fase 0. El archivo se sustituyó en la V0.2 (D13).
- **[EQ]** Registro escrito por el equipo en este documento antes de la Fase 8. Se conserva en el Anexo.
- **[BIT]** [[Bitácora]]; **[DEC]** [[Decisiones]].
- **[USR]** Mensajes del equipo a Claude Code, conservados en la transcripción.
- **[CI]** `Errores de la IA.md` del prototipo anterior, en la carpeta hermana `../Proyecto Coste Invisible/` (fuera de este proyecto). Se redactó durante la etapa de Antigravity; por su estilo parece generado por la propia IA (**el equipo debe confirmarlo**). Es evidencia de la época, aunque no independiente.

---

## Matriz de casos

| # | Caso | Categoría | Herramienta | Evidencia | Fuente primaria | Acción humana | Fuerza |
|---|---|---|---|---|---|---|---|
| E01 | TER del 0,20 % asignado a acciones (TSLA, IONQ) | financiero | Antigravity | [EQ] Error 1; [CI] Error 6; [BIT] §4 | CNMV, *Guía rápida: Fondos cotizados (ETF)*; ficha oficial de Vanguard VOO | Detectado por el equipo; separación coste de producto / intermediación (D4, D42) | **A** |
| E02 | «Acceptance tests superados al 100 %» con tests que no podían fallar | testing | Antigravity | [V01] cita literal; [TS] código; [AUD0] | El propio código del arnés y su ejecución | El equipo encarga una auditoría antes de seguir (Fase 0); suite nueva en 3 niveles (D13) | **A** |
| E03 | Precio ajustado presentado como «Precio histórico» (error **repetido**: ya había ocurrido en Streamlit) | datos / financiero | Antigravity | [AUD0] D.2 (verificado ejecutando); [CI] Limitación 1 | Documentación de yfinance (`auto_adjust`, por defecto `True`); S&P DJI: índice de precio frente a *total return* | Se muestran «valor ajustado» y «cierre cotizado» por separado (D10, D21) | **A** |
| E04 | Índices, cripto y futuros como «Stock»; fondo como «ETF» | datos / financiero | Antigravity | [AUD0] D.1 (verificado: `^GSPC`, `BTC-USD`, `ES=F`, `VFIAX`) | `quoteType` de Yahoo; CNMV, guía de ETF (un ETF cotiza en bolsa, un fondo tradicional no) | Primero se restringe el universo (D7); después el equipo decide ampliarlo a seis tipos con notas (D18) | **A** |
| E05 | Comisión internacional de Bankinter convertida desde dólares (2.222 € en vez de 2.440 €) | financiero | Claude Code | [BIT] §17; test corregido | Web oficial de tarifas de Bankinter (acciones, pestaña internacional) | Fase 5.1 revisada y aprobada por el equipo; divisa de Bankinter en D57 | **A** (ver nota) |
| E06 | Lectura ×100 de `netExpenseRatio` (0,03 % → 3 %) | datos / financiero | Antigravity | [AUD0] D.5 (verificado: 0.0003 frente a 0.03 para VOO) | Ficha oficial de Vanguard VOO (TER 0,03 %) | Unidades fijadas y rango de plausibilidad (D9) | **A** (error potencial) |
| E07 | Periodos inconsistentes (velas semanales/mensuales, «10Y» que no cubre 10 años, 1D desde la primera vela) | metodológico | Antigravity | [AUD0] D.3 (verificado) | Serie diaria de Yahoo (VOO «10Y» empezaba el 2016-12-01) | Solo datos diarios y ventana común (D10, D19) | **B** |
| E08 | Ticker inexistente → HTTP 200 con tipo «Stock» | datos / arquitectura | Antigravity | [AUD0] Backend (verificado) | Respuesta real de la API | Tickers inexistentes → 404 (D8) | **B** |
| E09 | Afirmar que la navegación de Streamlit estaba corregida | integración IA / testing | Antigravity | [EQ] Error 2; [CI] Errores 3 y 7 (sin cita literal de la afirmación) | Ejecución real de la aplicación (capturas del equipo, no incluidas en el repositorio) | Regla: nada está terminado hasta probarlo en la interfaz | **B** |
| E10 | Comparador de costes financieramente trivial | metodológico | Antigravity (propuesta inicial) | [EQ] Error 3; [BIT] §1–2 | Lógica del modelo (no requiere fuente externa) | Reformulación de la pregunta → Investment Strategy Lab | **B** |
| E11 | Arquitectura Streamlit que se volvió frágil | arquitectura | Antigravity | [EQ] Error 4; [BIT] §4–5 | Ejecución real (`session_state`, claves inexistentes) | React + FastAPI e iteraciones pequeñas (D1) | **B** |
| E12 | Documentación que describía cosas inexistentes | documentación | Antigravity | [V01] citas literales; [AUD0] §H | El propio código (`lucide-react` sin usar, `.bat` sin `cd`, Home) | Documentación rehecha en la Fase 1 | **B** |
| E13 | Entorno no reproducible (`requirements.txt`, `.bat` con rutas personales) | reproducibilidad | Antigravity | [AUD0] (versiones comparadas); `.bat` originales en la transcripción | `pip` instalado frente a `requirements.txt` | `requirements.txt` real (V0.2); `.bat` portables (Fase 6.1, D70) | **B** |
| E14 | El preset «1 año» nunca mostraba CAGR | metodológico | Claude Code | [BIT] §13; [DEC] D11 → D20 | Definición del propio umbral: 365 días son 0,9993 años de 365,25 días | Cambio a 365 días naturales; caso de 364 días ⏳ pendiente del equipo | **B** |
| E15 | Un 504 del analista se mostraba como «backend apagado» | UX / integración IA | Claude Code | [USR] mensaje del equipo; `frontend/src/api/marketApi.js` | `/api/analyst/status` 200 y `/analyze` 504, comprobado por el equipo | El equipo diagnosticó la causa y pidió el mensaje correcto | **B** |
| E16 | Configuración del modelo local sin contar con el razonamiento de Qwen3 | integración IA | Claude Code | [USR] logs de LM Studio aportados por el equipo | Logs de LM Studio (~1,96 tokens/s de razonamiento; corte a ~180 s) | El equipo diagnosticó y fijó la solución (`/no_think`, `max_tokens`, timeout) | **B** |
| E17 | Tests que confirman el código, no la realidad financiera | testing (transversal) | Antigravity y Claude Code | [TS] test 8; [BIT] §17 (el test de Bankinter reproducía el error) | Tarifa oficial de Bankinter; lógica del test | Verificación manual de cifras contra la fuente oficial | **B** |
| E28 | Registro de errores de la etapa Antigravity con afirmaciones sobreconfiadas y fuentes genéricas | fuentes / documentación | Antigravity | [CI] Error 7 y Limitación 5, citas literales | [AUD0]: la V0.1 aún tenía condiciones de carrera y estados de error sin salida | Fuentes concretas con URL y fecha en la Fase 8 | **B** |
| E31 | Cost Sensitivity cobraba las ventas con la regla de compra | financiero / metodológico | Claude Code | `analytics/sensitivity.py` antes de la V0.11; 2 tests que fallan con el código anterior | Estructura de `broker_fees.json` y del motor (`trade_rule` por lado) | Alerta de la Fase 8 → el equipo pidió verificarla sin dar por hecho el error (Fase 8.1) | **B** |
| E18 | Condición de carrera al cambiar rápido de periodo | frontend | Antigravity | [AUD0] (visto en código, no ejecutado) | — | Peticiones cancelables (D15) | **C** |
| E19 | Enter lanzaba dos búsquedas (`onKeyDown` + `onSubmit`) | frontend | Antigravity | [AUD0] (visto en código) | — | Corregido en la Fase 1 | **C** |
| E20 | Variación calculada sobre cierres redondeados a 2 decimales | financiero (numérico) | Antigravity | [AUD0] D.4 (verificado) | — | Cálculo sin redondeos (D10) | **C** |
| E21 | El selector de fechas bloqueaba en silencio fechas válidas (atributo `min`) | UX | Claude Code | [BIT] §13 | — | Se quita el límite; el backend explica el caso | **C** |
| E22 | Avisos contradictorios («Solo hay datos desde…» y «No hay datos») | UX | Claude Code | [BIT] §13 | — | Corregido | **C** |
| E23 | Test que suponía el tope de 20 € de ING con 100.000 € | testing / tarifas | Claude Code | [BIT] §16 | PDF oficial de tarifas de ING (tope solo por debajo de 50.000 €) | Se corrige el test; el motor era correcto | **C** |
| E24 | Categoría «ETFs» de News dominada por ETFs de cripto | fuentes | Claude Code | [BIT] §13 | Resultados reales de Google News RSS | Exclusión temática | **C** |
| E25 | `Favorites.jsx` y `favorites.js` chocaban en Windows | arquitectura | Claude Code | [BIT] §20 | Sistema de archivos sin distinción de mayúsculas | Renombrado a `FavoritesUI.jsx` | **C** |
| E26 | Procesos huérfanos de las herramientas de prueba | reproducibilidad | Claude Code | [BIT] §13 | — | Desde entonces no se cierran los procesos del equipo y se trabaja contra ellos | **C** |
| E27 | Editor del Builder 26 px más ancho que la pantalla en móvil | frontend | Claude Code | [BIT] §14 | Test E2E a 375 px | Corregido | **C** |
| E29 | `unsafe_allow_html=True` en `st.info`, que no lo admite (TypeError) | frontend | Antigravity | [CI] Error 2 (traceback descrito) | Documentación de Streamlit; traceback | Parámetro eliminado | **C** |
| E30 | f-strings con comillas anidadas, inválidas en Python 3.11 (SyntaxError) | arquitectura | Antigravity | [CI] Error 4 | PEP 701 (solo Python 3.12+); `py_compile` | Formato numérico nativo | **C** |

**Totales:** 31 casos · **A: 6** · **B: 13** · **C: 12**.
**Por herramienta:** Antigravity 18 · Claude Code 12 · ambas 1 (E17).

**Los cinco más fuertes para la entrega** (propuesta, la elección es del equipo):
1. **E01** — TER asignado a acciones.
2. **E02** — «100 % superado» con tests que no podían fallar.
3. **E03** — precio ajustado presentado como «precio histórico».
4. **E05** — divisa de la comisión de Bankinter.
5. **E04** — clasificación de activos.

E06 es igual de sólido en fuentes, pero es un error **potencial**: nunca llegó a verse en la interfaz.

---

# PARTE I — Candidatos fuertes (A)

## E01 — TER del 0,20 % asignado a acciones individuales

- **Herramienta:** Antigravity.
- **Momento:** prototipo inicial (antes de la V0.1).
- **Qué hizo la IA:** según el registro del equipo [EQ], asignó un **TER del 0,20 %** a Tesla (TSLA) e IonQ (IONQ) y lo trató como coste propio del activo.
  - El registro de la época [CI] lo confirma: la IA «asigno ratios de gastos (TER) o costos recurrentes por defecto a acciones individuales» y fijó «un coste estimado de 0.20% al anadir tickers adicionales de forma rapida en el Constructor».
  - *No hay captura en el repositorio; el `app.py` del prototipo ya está corregido.*
- **Por qué podía parecer correcto:** el TER es el coste más conocido de la inversión pasiva, y aplicar un porcentaje genérico a todos los activos da una cifra plausible.
- **Cómo nos dimos cuenta:** el equipo se preguntó qué representaba ese porcentaje en una acción y vio que se mezclaban costes del vehículo y costes del intermediario.
- **Evidencia:** [EQ] Error 1; [BIT] §4.
- **Fuentes primarias:**
  - CNMV, *Guía rápida: Fondos cotizados (ETF)*, https://www.cnmv.es/DocPortal/Publicaciones/Fichas/FondosCotizados(ETF).pdf (sin fecha visible; consultada el 18/11/2026). Dice que invertir en ETF implica «dos fuentes de gastos»: las comisiones de gestión y depósito del propio fondo, y los gastos que el inversor paga al intermediario. Añade que las comisiones de gestión y depósito «se deducen diariamente del valor liquidativo».
  - Vanguard, ficha de VOO (https://fund-docs.vanguard.com/F0968.pdf, datos a 30/09/2026): TER 0,03 %, consultada en la Fase 5.
- **Qué decían:** el TER es un gasto del vehículo de inversión colectiva. Una acción no tiene gestora ni comisión de gestión; sus costes son de intermediación.
- **Causa:** se aplicó un atributo de fondos a todo activo sin distinguir el tipo de instrumento.
- **Qué corregimos:** TER «No aplica» para acciones (D4); separación entre costes del producto y del intermediario (D42).
- **Decisión humana:** separar los dos tipos de coste. Es el origen de la arquitectura de Cost Analysis.
- **Qué cambió en el proceso:** cada dato financiero que muestra la app debe tener un significado definido por tipo de activo.
- **Aprendizaje:** un número plausible no es un dato. Antes de mostrar un coste hay que saber a qué instrumento corresponde.
- **⚠ Para la entrega:** conviene adjuntar una captura del prototipo, si se conserva. En el repositorio no hay ninguna.

## E02 — «Acceptance tests superados al 100 %» con un arnés que no podía fallar

- **Herramienta:** Antigravity.
- **Momento:** cierre de la V0.1.
- **Qué afirmó la IA (cita literal de [V01]):** «Todos los acceptance tests obligatorios fueron ejecutados y superados al 100%». La salida del script decía «Results: 10/10 Acceptance Tests PASSED».
- **Por qué podía parecer correcto:** había un script, se ejecutaba y daba 10/10.
- **Cómo nos dimos cuenta:** el equipo encargó a Claude Code una auditoría antes de seguir (Fase 0). Al leer el arnés [TS], la función `test` solo marcaba FAIL si había una **excepción**. Una `lambda` que devolvía `False` se contaba como PASS. Los tests 1, 2 y 10 no podían fallar, y el test 8 («TSLA 1Y negativo → rojo») dependía del mercado, no de la lógica de color.
- **Evidencia:**
  - [TS], código literal: `res = fn()` → `print(f"[PASS] ...")` → `return True`, sin comprobar `res`.
  - [AUD0] §D, «Tests y mantenibilidad».
- **Fuente primaria:** el propio código del arnés y su ejecución.
- **Causa:** se confundió «el script no lanza errores» con «la condición se cumple».
- **Qué corregimos:** suite pytest en tres niveles: deterministas con resultados conocidos, integración y E2E (D13). Se añadió el criterio de aceptación «un test que devuelve `False` aparece como FAIL».
- **Decisión humana:** auditar antes de construir más; aprobar la V0.2 solo tras probarla.
- **Qué cambió en el proceso:** ningún test depende de si un activo ha subido o bajado; cada test debe poder fallar.
- **Aprendizaje:** «10/10» solo vale si cada test puede fallar.
- **Nota de honestidad:** quien detectó el defecto fue otra IA (Claude Code), dentro de una auditoría que pidió el equipo.

## E03 — Precio ajustado presentado como «Precio histórico»

- **Herramienta:** Antigravity.
- **Momento:** V0.1.
- **Qué hizo la IA:** el gráfico se titulaba «Precio histórico», pero mostraba precios **ajustados por dividendos y splits** (`auto_adjust=True`) sin decirlo. El % mostrado era, en realidad, una rentabilidad total aproximada con dividendos reinvertidos [AUD0] D.2.
- **Por qué podía parecer correcto:** las cifras salen de Yahoo y el gráfico tiene buen aspecto. Además, `auto_adjust=True` es el valor por defecto de yfinance.
- **Cómo nos dimos cuenta:** la auditoría de la Fase 0 lo verificó comparando con el cierre cotizado.
- **Error repetido:**
  - en el prototipo Streamlit ya se había detectado y corregido la misma ambigüedad: una «Rentabilidad (1 año)» calculada con `auto_adjust=True` sin decirlo [CI] Limitación 1;
  - la V0.1 volvió a cometerlo;
  - las correcciones que no quedan como regla documentada se pierden al cambiar de base de código.
- **Evidencia:** [AUD0] D.2, marcado como «verificado ejecutando»; [CI] Limitación 1.
- **Fuentes primarias:**
  - yfinance, docstring de `history()` (https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/history.py, consultado el 18/11/2026): `auto_adjust` = «Adjust all OHLC automatically?», con valor por defecto `True`.
  - S&P Dow Jones Indices, material educativo sobre tipos de rentabilidad (consultado el 18/11/2026): un índice de precio no incluye dividendos; la versión *total return* los reinvierte.
- **Causa:** se usó el valor por defecto de la librería sin documentar su significado financiero.
- **Qué corregimos:**
  - se muestran dos series, «valor ajustado» y «cierre cotizado», con explicación (D10, D21);
  - después, una sola descarga con `auto_adjust=False` y uso explícito de `Adj Close` y `Close` (D19).
- **Decisión humana:** usar la rentabilidad total (dividendos reinvertidos) como métrica principal, y declararlo.
- **Qué cambió en el proceso:** cada serie de datos lleva su definición en [[Datos y fuentes]].
- **Aprendizaje:** los valores por defecto de una librería son decisiones metodológicas que alguien tiene que asumir.

## E04 — Índices, cripto y futuros clasificados como «Stock»; un fondo como «ETF»

- **Herramienta:** Antigravity.
- **Momento:** V0.1.
- **Qué hizo la IA:** todo lo que no era ETF o fondo se etiquetaba «Stock». `^GSPC` (índice), `BTC-USD` (cripto) y `ES=F` (futuro) aparecían como acciones con «TER: No aplica». `VFIAX` (fondo de inversión) aparecía como «ETF», porque el código comprobaba `"FUND" in "MUTUALFUND"` [AUD0] D.1.
- **Por qué podía parecer correcto:** TSLA y VOO, los dos activos de prueba, salían bien.
- **Cómo nos dimos cuenta:** la auditoría probó tickers fuera del caso feliz.
- **Evidencia:** [AUD0] D.1 (verificado); [DEC] D7.
- **Fuentes primarias:**
  - el campo `quoteType` de Yahoo (`INDEX`, `CRYPTOCURRENCY`, `FUTURE`, `MUTUALFUND`);
  - CNMV, *Guía rápida: Fondos cotizados (ETF)*: un ETF se negocia en bolsa «igual que si se tratara de acciones», a diferencia de un fondo tradicional.
- **Causa:** clasificación por exclusión y comparación de subcadenas.
- **Qué corregimos:** primero, universo limitado a acciones y ETF (D7). Después, por decisión del equipo, seis tipos con su TER y su nota metodológica (D18).
- **Decisión humana:** ampliar el universo, porque «un principiante también quiere consultar "el S&P 500" o "bitcoin"» ([BIT] §13).
- **Aprendizaje:** probar solo los ejemplos del enunciado esconde los errores de clasificación.

## E05 — Comisión internacional de Bankinter convertida desde dólares

- **Herramienta:** Claude Code.
- **Momento:** Fase 5.1 (2026-11-12).
- **Qué hizo la IA:** en un caso de prueba, 122 operaciones internacionales, la app mostraba **2.222 €** de comisiones en lugar de **2.440 €** (122 × 20 €). El motor trataba los 20 € como 20 $ porque el umbral del tramo de la tarifa está en dólares.
- **Por qué podía parecer correcto:** el dato estaba en el JSON con su fuente, y el test automático **pasaba**, porque esperaba el mismo valor erróneo (20 ÷ tipo de cambio).
- **Cómo nos dimos cuenta:** al revisar a mano las cifras contra la tarifa oficial, no por un test ([BIT] §17). La revisión la hizo Claude Code en su verificación de fase.
- **Fuente primaria:** web oficial «Tarifas y comisiones de acciones» de Bankinter (`bankinter.com/broker/tarifas-comisiones/acciones`, pestaña internacional, consultada el 12/11/2026). El tramo es «hasta 40.000 € / 40.000 $» con comisión de **20 €**.
- **Causa:** el modelo suponía que el umbral y la comisión estaban en la misma divisa.
- **Qué corregimos:** se separaron la divisa del umbral (`tier_ccy`) y la de la comisión (`fee_ccy`), y se corrigió el test.
- **Decisión humana:** el equipo revisó y aprobó la Fase 5 completa. La divisa de Bankinter figura en D57.
- **Qué cambió en el proceso:** las cifras de costes se contrastan a mano con al menos un caso calculado sobre la tarifa oficial.
- **Aprendizaje:** un test escrito por la misma IA que escribió el código puede reproducir el mismo error (ver E17).
- **⚠ Nota para el equipo:** es el caso financiero más claro, pero lo **detectó la propia IA**. Para presentarlo como control humano, conviene que una de vosotras repita hoy el cálculo con la web de Bankinter y lo deje anotado.

## E06 — Lectura ×100 del TER en el código de respaldo (error potencial)

- **Herramienta:** Antigravity.
- **Momento:** V0.1.
- **Qué hizo la IA:** cuando no había `fund_operations`, el código de respaldo leía `info["netExpenseRatio"]` y lo multiplicaba por 100. Yahoo devuelve ese campo ya en puntos porcentuales (VOO: `0.03` = 0,03 %), así que habría mostrado **3,00 %**.
- **Estado:** **error potencial detectado antes de manifestarse en la interfaz.** Con VOO no se disparaba, porque antes encontraba `fund_operations = 0.0003`.
- **Cómo nos dimos cuenta:** la auditoría comparó los dos campos para el mismo ETF.
- **Evidencia:** [AUD0] D.5 («[V/C]»); [DEC] D9; [[Datos y fuentes]] §1, «Verificación de unidades del TER».
- **Fuente primaria:** ficha oficial de Vanguard VOO (https://fund-docs.vanguard.com/F0968.pdf, datos a 30/09/2026): TER **0,03 %**.
- **Causa:** se supusieron las unidades de un campo sin comprobarlas.
- **Qué corregimos:** unidades documentadas por campo, división entre 100 y rango de plausibilidad (0 %, 5 %] (D9).
- **Decisión humana:** el rango (0 %, 5 %] sigue ⏳ pendiente de validación del equipo.
- **Aprendizaje:** un factor de 100 en una comisión convierte un ETF barato en uno caro. Las unidades se verifican con dos fuentes.

---

# PARTE II — Otros errores relevantes (B)

## E07 — Periodos inconsistentes (Antigravity, V0.1)
- **Qué hizo:**
  - «5Y» usaba velas semanales; «10Y» y «MAX», mensuales;
  - «10Y» de VOO empezaba el 2016-12-01, menos de 10 años;
  - la última vela mensual era un mes incompleto;
  - «1D» se medía desde la primera vela de 5 minutos;
  - las horas intradía de Nueva York se mostraban como locales.
- **Evidencia:** [AUD0] D.3, verificado ejecutando.
- **Fuente primaria:** la serie diaria de Yahoo para el mismo ticker. Que «1D» se mida desde el cierre anterior se describió como convención habitual; **no se ha contrastado con una fuente primaria**.
- **Corrección y decisión humana:**
  - solo datos diarios para periodos largos (D10);
  - después, el equipo eliminó el intradía por coherencia con el inversor a largo plazo (D19).
- **Aprendizaje:** comparar periodos con resoluciones distintas compara cosas distintas.

## E08 — Ticker inexistente tratado como acción válida (Antigravity, V0.1)
- **Qué hizo:** un ticker inválido devolvía **HTTP 200** con `type: Stock`, `price: null` y «TER: No aplica» [AUD0]. Además, el test 9 de [TS] daba por bueno que «All endpoints return HTTP 200».
- **Corrección:** inexistente → 404; no soportado → 422; formato inválido → 400; fallo de Yahoo → 502 (D8).
- **Aprendizaje:** un 200 no significa «correcto»; un error tiene que parecer un error.

## E09 — Funcionalidades declaradas corregidas que seguían fallando (Antigravity, Streamlit)
- **Qué afirmó:** que la navegación y la transferencia de estrategias entre constructor y comparador estaban corregidas [EQ]. **No se conserva la cita literal.**
- **Cómo lo detectamos:** al ejecutar la aplicación aparecieron errores de `session_state`, botones que no navegaban y tracebacks de Python.
- **Evidencia de la época [CI]:**
  - Error 3: botones que actualizaban `st.session_state.nav_page` mientras `st.sidebar.radio` mantenía su propia `key`, así que la app no cambiaba de pantalla al primer clic;
  - Error 7: la IA «continuo proponiendo parches locales» sobre Streamlit.
- **Fuente primaria:** la ejecución real. El equipo indica que conserva capturas, pero no están en el repositorio.
- **Decisión humana:** la regla «Ninguna funcionalidad se considera terminada hasta que la probemos nosotras directamente desde la interfaz» [EQ], y acceptance tests antes de cada iteración.
- **Fuerza:** B por falta de cita literal. **Sube a A** si se adjuntan las capturas con el mensaje de Antigravity.

## E10 — Comparador de costes financieramente trivial (planificación)
- **Qué hizo:** comparar dos productos con la misma rentabilidad bruta y distinto coste, con lo que el más barato gana siempre [EQ] Error 3.
- **Por qué podía parecer correcto:** el cálculo era matemáticamente correcto.
- **Decisión humana:** reformular la pregunta (ver [[Investigación principal]]). Es la decisión más importante del proyecto.
- **Matiz:** es más un error de planteamiento aceptado inicialmente por el equipo que un error de cálculo. Por eso queda en B como error de la IA, y como decisión principal en [[Decisiones]] Parte XII.

## E11 — Arquitectura Streamlit que se volvió frágil (Antigravity)
- **Qué pasó:** se fueron añadiendo capas sobre Streamlit hasta que aparecieron errores encadenados [EQ] Error 4.
- **Causa compartida:** el propio equipo reconoce que «le pedíamos demasiadas funcionalidades antes de haber validado correctamente las anteriores».
- **Decisión humana:** React + FastAPI e iteraciones pequeñas (D1–D3).

## E12 — Documentación que describía cosas que no existían (Antigravity, V0.1)
- **Citas literales de [V01]:**
  - «Lucide React para iconografía»: `lucide-react` estaba instalado, pero no se usaba;
  - «Scripts `start_backend.bat` y `start_frontend.bat` adaptados al entorno local para despliegue en un clic»: no hacían `cd` a su carpeta y tenían rutas de este ordenador.
- **Además:** la Home prometía «Correlación entre activos» y «TER, comisiones y spread», que no existían [AUD0] §C.
- **Fuente primaria:** el código, comparado línea a línea con el documento [AUD0] §H.
- **Aprendizaje:** la documentación generada por IA describe la intención, no siempre el resultado.

## E13 — Entorno no reproducible (Antigravity, V0.1)
- **Qué pasó:** `requirements.txt` pedía yfinance 0.2.40, pandas 2.2.2 y fastapi 0.111; estaban instalados yfinance 1.7.0, pandas 3.0.6 y fastapi 0.156 [AUD0]. Los `.bat` tenían rutas absolutas de este ordenador.
- **Corrección:**
  - `requirements.txt` con las versiones reales (V0.2);
  - `.bat` con `%LOCALAPPDATA%` y detección del alias de la Microsoft Store (Fase 6.1, D70).
- **Por qué importa:** sin entorno reproducible no hay «cadena de datos trazable y reproducible» (ver [[Cadena de datos y reproducibilidad]]).

## E14 — El preset «1 año» nunca mostraba CAGR (Claude Code, Fase 1 → Fase 2)
- **Qué hizo:** Claude fijó en D11 el umbral «1 año = 365,25 días». Un preset de 1 año tiene 365 días = 0,9993 años, así que el CAGR **nunca** se mostraba.
- **Cómo se detectó:** en la validación de la Fase 2 con datos reales, por la propia Claude Code ([BIT] §13).
- **Corrección:** umbral de 365 días naturales (D20).
- **Decisión humana pendiente:** si el preset empieza en festivo (364 días), sigue sin mostrarse CAGR. Está ⏳ en D20.
- **Aprendizaje:** un umbral razonable en abstracto puede vaciar de contenido el caso de uso más habitual.

## E15 — El timeout del analista se mostraba como «backend apagado» (Claude Code, tras la Fase 6.1)
- **Qué hizo:** con LM Studio activo, `POST /api/analyst/analyze` devolvía 504. La página mostraba el mensaje genérico de `getErrorMessage` (`frontend/src/api/marketApi.js`): «No se puede conectar con el servidor de datos. Comprueba que el backend está en ejecución (start_backend.bat).»
- **Por qué podía parecer correcto:** ese mensaje es acertado en Explore Markets cuando el backend no responde. Todo 5xx sin el formato de error de la API se interpretaba igual.
- **Cómo nos dimos cuenta:** el equipo comprobó que `/api/analyst/status` devolvía 200 y escribió: «Por tanto, NO es un fallo de conexión con el backend sino un timeout esperando al modelo local» [USR].
- **Fuente primaria:** códigos HTTP reales observados por el equipo.
- **Corrección:** `analystErrorMessage` convierte un 504 o una espera agotada en «El modelo local está tardando más de lo esperado…» y permite reintentar (`frontend/src/api/analystApi.js`, test en `profile.test.js`). *Ambos archivos se eliminaron al retirar el analista en la Fase 8.1 (D80); la evidencia queda en este documento, en [[Bitácora]] §19 y en la transcripción.*
- **Decisión humana:** diagnóstico y especificación del mensaje, ambos del equipo.
- **Aprendizaje:** un mensaje de error equivocado hace que el usuario busque el fallo donde no está.

## E16 — Configuración del modelo local sin contar con el modo de razonamiento (Claude Code)
- **Qué hizo:** la configuración inicial del proveedor (`max_tokens` 4096, timeout de 180 s tras la primera corrección) no tenía en cuenta que Qwen3 genera un razonamiento interno largo antes del JSON.
- **Cómo nos dimos cuenta:** el equipo leyó los logs de LM Studio: el modelo generaba razonamiento a «~1,96 tokens/s» y el cliente cortaba a ~180 s [USR].
- **Corrección, especificada por el equipo:** `/no_think` para la familia Qwen3, `max_tokens` 1400 y timeout de 270 s, manteniendo JSON y guardrails (`backend/ai/provider.py`).
- **Matiz para no inflarlo:** no hubo una afirmación falsa de la IA. Fue una configuración no adaptada, y la primera corrección (subir el timeout) trataba el síntoma, no la causa. El mérito del diagnóstico es del equipo.

## E17 — Tests que confirman el código, no la realidad financiera (transversal)
- **Ejemplos reales:**
  - test 8 de la V0.1, que dependía del mercado [TS];
  - test de Bankinter que esperaba el mismo valor erróneo que el motor (E05);
  - test de ING con una lectura errónea de la tarifa (E23).
- **Aprendizaje:** un test verifica lo que su autor cree. Si el autor es la misma IA, comparte sus supuestos. Por eso los casos financieros clave se calculan a mano contra la fuente oficial ([[Acceptance tests]]).

## E28 — Afirmaciones sobreconfiadas y fuentes genéricas en el registro de la etapa Antigravity
- **Qué afirmó (citas literales de [CI]):**
  - sobre el paso a React + FastAPI: «Esta separacion resolvio al instante el 100% de los problemas de estado y navegacion»;
  - como «fuente primaria» del comparador trivial: «Literatura financiera fundamental sobre eficiencia de mercado, frontera media-varianza de Markowitz, ratio de Sharpe, drawdowns y los informes SPIVA», sin ningún documento concreto;
  - para el TER: «Ley 35/2003… normativa MiFID II / PRIIPs», sin artículo ni documento.
- **Por qué es un error:**
  - la auditoría de la Fase 0 [AUD0] encontró en la V0.1 condiciones de carrera al cambiar de periodo (E18) y estados de error que bloqueaban al usuario, así que el «100 %» no era cierto;
  - una lista de temas no es una fuente primaria que se pueda comprobar.
- **Cómo nos dimos cuenta:** al revisar en la Fase 8 la trazabilidad del rastro de IA.
- **Corrección:** las fuentes del proyecto se citan con autor o institución, título, fecha, URL y la afirmación concreta que respaldan ([[Investigación principal]] §9).
- **Matiz:** la autoría de [CI] (IA o equipo) debe confirmarla el equipo. Si la redactó el equipo con ayuda de la IA, el caso sigue siendo útil como aprendizaje sobre fuentes.

## E31 — Cost Sensitivity cobraba las ventas con la regla de compra (Claude Code, Fase 7 → corregido en la Fase 8.1)
- **Herramienta y momento:** Claude Code, al construir la sensibilidad a costes (Fase 7, D74–D75).
- **Qué hacía el código:**
  - los perfiles de rotación describen ventas y compras (p. ej. «24 órdenes: una venta y una compra al mes»);
  - pero `_order_costs` en `analytics/sensitivity.py` calculaba **todas** las órdenes con `trade_rule(schedule, "buy", …)` y `fx_fee(schedule, "buy", …)`;
  - el motor de costes sí admite reglas distintas por lado (`trade["sell"]`, usado por los costes personalizados), y la simulación lo ignoraba.
- **Por qué podía parecer correcto:**
  - con las tarifas actuales el resultado era idéntico, porque los 10 perfiles de `broker_fees.json` aplican la misma regla a compra y venta (`applies_to: ["buy", "sell"]`);
  - todos los tests existentes usaban comisiones de compra y venta iguales (otro ejemplo de E17).
- **Cómo apareció:**
  - Claude Code lo señaló como «posible error para revisión humana» en la auditoría documental de la Fase 8, al leer el código para la [[Cadena de datos y reproducibilidad]];
  - el equipo pidió en la Fase 8.1 investigarlo **sin dar por hecho que fuera un error**;
  - se escribió primero un test con compra 1 € y venta 10 €, que **falló** con el código anterior (cobraba 1 € también por cada venta).
- **Riesgo:**
  - con una tarifa de comisiones asimétricas (más cara al vender, o con cambio de divisa solo en un lado), la simulación habría infravalorado o sobrevalorado el coste de la rotación;
  - el error era latente: no afectaba a ninguna cifra mostrada hasta ahora.
- **Fuente de verificación:** la propia estructura de la tarifa (`broker_fees.json`, bloques `trade` y `fx` con `applies_to`) y el motor (`analytics/costs.py`, `trade_rule` por lado). No intervienen tarifas nuevas ni inventadas.
- **Corrección:** cada perfil reparte sus órdenes a partes iguales entre ventas y compras, por el mismo importe; las ventas usan la regla y la divisa de venta (D81).
- **Tests de regresión** (`backend/tests/test_phase7.py`):
  - `test_sens_venta_usa_su_propia_comision`: compra 1 €, venta 10 €; rotación alta = 1 + 12 × 10 + 12 × 1 = 133 €;
  - `test_sens_divisa_solo_en_el_lado_que_la_cobra`: cambio de divisa solo al comprar.
  Ambos fallaban antes y pasan ahora.
- **Aprendizaje:** un caso de prueba con valores simétricos no puede distinguir dos reglas distintas. Los tests deben incluir el caso que separaría una implementación correcta de una incorrecta.

---

# PARTE III — Incidentes menores y aprendizajes

## III.A — Errores menores (C)

| # | Qué pasó | Corrección |
|---|---|---|
| E18 | Al cambiar rápido de periodo podía quedar pintada una respuesta anterior (visto en código, no reproducido) | Peticiones cancelables (D15) |
| E19 | Enter lanzaba la búsqueda dos veces (`onKeyDown` y `onSubmit`) | Un solo manejador (Fase 1) |
| E20 | La variación se calculaba sobre cierres redondeados a 2 decimales, con error en activos baratos | Cálculo con precios sin redondear (D10) |
| E21 | El atributo `min` del selector de fechas impedía enviar fechas anteriores al histórico sin avisar | Se quitó; el backend explica el caso (D19) |
| E22 | Con un rango anterior al histórico aparecían a la vez «Solo hay datos desde…» y «No hay datos» | Un único aviso coherente |
| E23 | Un test suponía el tope de 20 € de ING con 100.000 €, pero la tarifa solo lo aplica por debajo de 50.000 € (el motor daba bien 103 €) | Test corregido contra el PDF oficial de ING |
| E24 | La categoría «ETFs» de News estaba dominada por ETFs de cripto | Términos de cripto excluidos de esa búsqueda |
| E25 | `Favorites.jsx` y `favorites.js` chocaban en Windows (nombres que solo difieren en mayúsculas) | `FavoritesUI.jsx` |
| E26 | Las herramientas de prueba de Claude dejaron un Vite y un uvicorn ocupando puertos | No se cierran ni duplican los procesos del equipo |
| E27 | El editor del Builder se salía 26 px a 375 px de ancho | Detectado por E2E y corregido |
| E29 | (Streamlit) `st.info(..., unsafe_allow_html=True)` lanzaba `TypeError` al abrir la pantalla [CI] | Parámetro eliminado; estilos con `st.markdown` |
| E30 | (Streamlit) f-strings con comillas anidadas, válidas solo desde Python 3.12 (PEP 701), en un entorno 3.11 [CI] | Detectado con `py_compile`; formato `{valor:+.2f}` |

## III.B — Lo que NO contamos como error de la IA (y por qué)

- **Doble cómputo del TER: riesgo detectado y evitado.**
  - La auditoría de la Fase 0 lo señaló como «la decisión metodológica más delicada» [AUD0] §K.1, y las instrucciones del equipo para la Fase 5 lo exigieron («no restar el TER otra vez»).
  - **Nunca se implementó mal** (D42). La CNMV confirma que las comisiones de gestión y depósito «se deducen diariamente del valor liquidativo».
  - Es un buen ejemplo de anticipación, no un error.
- **Trade Republic, lista de 2023:** en la Fase 5 se usó y se marcó como limitación. En la 5.1 se sustituyó por la web oficial actual. Es una mejora de fuente.
- **Interpretaciones tarifarias marcadas ⏳:** custodia de ING (D47), tarifa máxima de Santander, mínimo de CaixaBank sobre nominal, planes de Revolut (D56–D57) y supuestos de sensibilidad (D74–D75). Son hipótesis declaradas, pendientes de revisión humana, no errores demostrados.
- **OneDrive bloqueando la caché de Vite y los resultados de Playwright (EPERM):** incidencia del entorno, no causada por la IA (D17).
- **Página en blanco en una ejecución E2E (Fase 5.1):** no se pudo reproducir. Sin evidencia suficiente para clasificarla.
- **Ajustes visuales de la Fase 7** (frases del benchmark en columnas, gráfico de sensibilidad poco legible): iteraciones de diseño.
- **Tests con expectativas de formato** («1200 €» sin punto de miles, el carácter «<» en «BBVA joven (<30)»): erratas de test sin consecuencia financiera.

## III.C — Aprendizajes transversales

1. **Las afirmaciones de la IA sobre su propio trabajo no son evidencia** (E02, E09, E12). Hay que pedir el arnés, ejecutar y mirar.
2. **Los valores por defecto y las unidades son decisiones financieras** (E03, E06, E14).
3. **Probar solo el caso feliz esconde errores** (E04, E08).
4. **Los tests escritos por la misma IA heredan sus supuestos** (E05, E17, E23).
5. **El diagnóstico humano con evidencia propia (logs, códigos HTTP) fue decisivo** en la integración del modelo local (E15, E16).

---

## Cómo usar este documento en la entrega

- El enunciado exige **tres** casos con: qué dijo la máquina, cómo se detectó y fuente primaria.
- Los casos **A** cumplen los tres requisitos. E01 y E09 ganarían con capturas.
- Para cada caso elegido, el equipo debe poder defender oralmente la fuente primaria («Lo que firmas, lo defiendes»).
- Este documento no se ha simplificado para la bitácora final: la selección es del equipo.

---

# Anexo — Registro original del equipo (conservado sin cambios)

> Texto escrito por el equipo antes de la Fase 8. Se conserva íntegro como historia.
> Correspondencia con la auditoría: Error 1 → **E01**, Error 2 → **E09**, Error 3 → **E10**, Error 4 → **E11**.
> La sección final «Estado de los errores para la entrega final» queda **superada** por la matriz de arriba.


Este documento recoge errores y limitaciones reales detectados durante el desarrollo de **Investment Strategy Lab**.

El objetivo no es registrar cualquier pequeño bug de programación, sino identificar situaciones en las que la IA produjo una respuesta, cálculo o implementación aparentemente válida que posteriormente tuvimos que cuestionar, comprobar y corregir.

Para cada caso registramos:

1. qué hizo o afirmó la IA;
    
2. cómo detectamos el problema;
    
3. por qué era incorrecto o insuficiente;
    
4. cómo lo corregimos;
    
5. contra qué fuente primaria lo contrastamos.
    

---

## Error 1 — Asignar TER a acciones individuales

### Qué hizo la IA

En una de las primeras versiones de la aplicación, Antigravity asignó automáticamente un **TER del 0,20%** a activos como **Tesla (TSLA)** e **IonQ (IONQ)**.

La aplicación trataba ese porcentaje como si fuese un coste propio del activo.

### Cómo detectamos que podía estar mal

Al revisar la aplicación nos planteamos qué representaba realmente ese TER.

Nos dimos cuenta de que estábamos mezclando dos conceptos distintos:

- los **costes internos de un fondo o ETF**;
    
- las **comisiones que cobra un broker por comprar, vender o custodiar acciones**.
    

Una acción individual como Tesla no es un vehículo de inversión colectiva y, por tanto, no tiene un TER comparable al de un ETF.

### Por qué estaba mal

El **TER / expense ratio** corresponde a fondos y ETFs y representa los gastos recurrentes soportados internamente por el vehículo.

En una acción individual pueden existir otros costes para el inversor, como:

- comisión de compraventa;
    
- custodia;
    
- cambio de divisa;
    
- otros costes del intermediario.
    

Pero esos costes dependen fundamentalmente de la plataforma o broker utilizado y **no constituyen un TER de la acción**.

### Corrección aplicada

Decidimos separar completamente:

**Costes del producto**

- TER / expense ratio cuando se trate de un ETF o fondo.
    

**Costes de intermediación**

- compraventa;
    
- custodia;
    
- cambio de divisa;
    
- otros costes de plataforma.
    

En la nueva V0.1:

- `TSLA` → **TER: No aplica**
    
- `VOO` → muestra el expense ratio únicamente si existe un dato válido.
    

### Fuente primaria

**Pendiente de incorporar a la bitácora final:** documentación/factsheet oficial del ETF utilizado y documentación oficial de la plataforma o regulador donde se defina el concepto de gastos del fondo.

---

## Error 2 — La IA afirmó que funcionalidades estaban corregidas cuando en la práctica seguían fallando

### Qué hizo la IA

Durante el desarrollo de la primera aplicación en Streamlit, Antigravity afirmó haber corregido completamente la navegación y la transferencia de datos entre el constructor y el comparador.

Llegó a indicar que la navegación funcionaba correctamente y que la pantalla de comparación utilizaba las estrategias configuradas por el usuario.

### Cómo detectamos que estaba mal

No aceptamos el resumen de la IA como prueba y ejecutamos la aplicación nosotras mismas.

Al probarla aparecieron diferentes errores, entre ellos:

- botones que no navegaban correctamente;
    
- necesidad de pulsar algunas acciones más de una vez;
    
- errores de `session_state`;
    
- pantallas que no recibían correctamente la información de las estrategias;
    
- errores visibles de Python/Streamlit.
    

Por tanto, la descripción de Antigravity sobre el estado del proyecto no coincidía con el funcionamiento real.

### Por qué es relevante

Este error nos hizo ver que:

> **Que la IA afirme que ha probado una funcionalidad no significa que debamos considerarla validada.**

La IA puede generar código, ejecutarlo parcialmente y concluir erróneamente que una funcionalidad está terminada.

### Corrección aplicada

Adoptamos una nueva regla de trabajo:

> **Ninguna funcionalidad se considera terminada hasta que la probemos nosotras directamente desde la interfaz.**

A partir de este punto comenzamos a definir **acceptance tests** antes de cada iteración.

Por ejemplo, para V0.1:

- Home debe abrir correctamente.
    
- Explore Markets debe abrir a la primera.
    
- TSLA debe identificarse correctamente como acción.
    
- VOO debe identificarse como ETF.
    
- Los periodos temporales deben modificar realmente el gráfico.
    
- No debe haber errores visibles.
    

### Fuente primaria / evidencia

La fuente primaria en este caso es la **ejecución real del propio código generado**, incluidos los mensajes de error y tracebacks mostrados por la aplicación.

Conservamos capturas del funcionamiento real como evidencia frente a la afirmación realizada por la IA.

---

## Error 3 — Construir inicialmente un análisis financieramente trivial

### Qué hizo la IA

La primera versión del proyecto comparaba dos productos que tenían:

- la misma inversión inicial;
    
- las mismas aportaciones;
    
- la misma rentabilidad bruta esperada;
    
- pero distintos costes.
    

La aplicación calculaba cuánto patrimonio terminaba acumulando cada uno.

### Cómo detectamos la limitación

Al utilizar el simulador nos dimos cuenta de que la conclusión estaba determinada de antemano:

> Si dos inversiones ofrecen exactamente la misma rentabilidad antes de costes y una cobra más que la otra, la de menor coste necesariamente termina con mayor patrimonio.

Por tanto, aunque el cálculo matemático pudiera ser correcto, **la pregunta financiera era demasiado trivial**.

### Por qué era un problema

El proyecto pretendía ayudar a un inversor a tomar una decisión.

Pero ese modelo no planteaba un verdadero trade-off financiero, ya que mantenía constantes prácticamente todas las variables excepto el coste.

No permitía responder preguntas más interesantes como:

- ¿compensa una estrategia más cara si genera más rentabilidad?
    
- ¿qué estrategia asume más riesgo?
    
- ¿qué grado de diversificación tiene cada cartera?
    
- ¿qué impacto tienen los diferentes activos?
    
- ¿qué costes reales genera cada forma de invertir?
    

### Decisión y corrección

Esta limitación fue la que nos llevó a **reenfocar el proyecto**.

Pasamos de:

> “¿Cuánto dinero pierdes por pagar mayores comisiones?”

a:

> **“¿Qué estrategia de inversión es realmente más eficiente cuando tenemos en cuenta rentabilidad, riesgo, diversificación y todos sus costes?”**

Así nació el concepto de **Investment Strategy Lab**.

### Fuente / comprobación

Este caso no surgió porque una fórmula fuese matemáticamente incorrecta, sino porque nosotras analizamos la lógica del modelo y concluimos que no respondía a una decisión financiera suficientemente interesante.

Por ello lo consideramos principalmente una **limitación del enfoque propuesto por la IA** y una decisión humana de diseño del proyecto.

---

## Error 4 — La primera arquitectura se volvió demasiado frágil

### Qué hizo la IA

Antigravity fue ampliando progresivamente una aplicación inicialmente construida en Streamlit.

Sobre la misma base se fueron incorporando:

- buscador de activos;
    
- comparador;
    
- break-even;
    
- navegación;
    
- estados entre pantallas;
    
- constructor de estrategias;
    
- costes;
    
- cambios visuales.
    

### Qué ocurrió

A medida que aumentaba el número de funcionalidades comenzaron a aparecer errores encadenados:

- problemas con `session_state`;
    
- navegación que no funcionaba;
    
- claves inexistentes;
    
- parámetros incompatibles entre funciones;
    
- comparaciones que no utilizaban correctamente la estrategia configurada;
    
- dificultad para conseguir la experiencia visual que queríamos.
    

### Qué aprendimos

Nos dimos cuenta de que estábamos permitiendo que la IA continuase añadiendo capas sobre una arquitectura que ya había empezado a mostrar problemas estructurales.

El error no fue únicamente técnico.

También fue una limitación de nuestra forma inicial de trabajar con la IA: **le pedíamos demasiadas funcionalidades antes de haber validado correctamente las anteriores**.

### Decisión y corrección

Tomamos dos decisiones:

1. abandonar esa implementación como versión de prueba;
    
2. comenzar una arquitectura nueva y trabajar por iteraciones pequeñas.
    

La nueva arquitectura utiliza:

- **React** para el frontend;
    
- **FastAPI/Python** para el backend;
    
- iteraciones independientes y verificables.
    

La primera iteración, V0.1, se limita deliberadamente a:

- Home;
    
- Explore Markets.
    

No avanzaremos a Strategy Builder hasta comprobar que esta base funciona correctamente.

### Aprendizaje

La principal lección fue:

> La capacidad de una IA para añadir rápidamente funcionalidades puede convertirse en un problema si no existe una validación humana entre iteraciones.

---

# Estado de los errores para la entrega final

Para la bitácora final debemos seleccionar al menos **tres casos concretos** y completar para cada uno:

- qué hizo la máquina;
    
- cómo descubrimos el error;
    
- por qué estaba mal;
    
- qué cambiamos;
    
- fuente primaria utilizada para comprobarlo.
    

Los candidatos más claros actualmente son:

1. **Asignación incorrecta de TER a acciones individuales.**
    
2. **Afirmar que determinadas funcionalidades estaban validadas cuando fallaban al ejecutarlas.**
    
3. **Proponer un comparador financieramente demasiado trivial.**
    
4. **Construir sucesivamente sobre una arquitectura que se volvió frágil.**
    

Este documento seguirá actualizándose a medida que aparezcan errores o limitaciones relevantes durante las siguientes iteraciones.