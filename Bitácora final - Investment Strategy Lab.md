# Investment Strategy Lab

**Bitácora final del proyecto**

El carril abierto · Análisis de Servicios Financieros (ICADE E2A) · Nivel 2: Construir

Cecilia Pardos · Almudena López · Covadonga López-Belmonte

19 de noviembre de 2026

Código, documentación y resultados reproducibles disponibles en el repositorio público del proyecto.

---

## 1. De «Coste Invisible» a Investment Strategy Lab

**Qué queríamos hacer.** En la propuesta del 24 de septiembre planteamos *El coste invisible de invertir*: cuánto patrimonio pierde a largo plazo un inversor minorista por elegir productos o plataformas más caros. El primer prototipo, construido con Antigravity en Streamlit, comparaba dos alternativas con el mismo capital, las mismas aportaciones y **la misma rentabilidad bruta**. Solo cambiaba el coste.

**El problema fue conceptual.** Si todo lo demás es igual, la alternativa más barata siempre gana: el cálculo era correcto, pero la conclusión estaba decidida de antemano. Un inversor acepta pagar más cuando espera algo a cambio, y ese *trade-off* no aparecía. Además, el prototipo se volvía más frágil con cada funcionalidad.

**Qué terminamos haciendo.** Lo reformulamos como **Investment Strategy Lab**, una aplicación educativa de **simulación histórica**. Un inversor principiante construye estrategias de largo plazo y ve cómo se habrían comportado en cuanto a rentabilidad, riesgo y diversificación, frente a un *benchmark* y con distintos horizontes, aportaciones, intermediarios y frecuencias de operativa. No predice ni asesora.

Nada de esto estaba planificado; cada cambio de rumbo está fechado en el registro de decisiones.

## 2. Qué construimos y qué pieza financiera analizamos

El producto final tiene cinco módulos:

- **News:** actualidad financiera.
- **Explore Markets:** seis tipos de activo con rentabilidad, CAGR, volatilidad, máxima caída, Sharpe y TER, y una lista de favoritos.
- **Strategy Builder:** estrategias con pesos, capital inicial y **aportaciones periódicas**.
- **Strategy Comparison:** backtest *buy & hold* en euros sobre el periodo común real de los activos. Mide la rentabilidad ponderada por el tiempo (TWR), muestra métricas de riesgo y permite añadir un *benchmark* (S&P 500 Total Return o MSCI World vía ETF).
- **Cost Analysis:** aplica a cada operación del backtest las tarifas oficiales de 10 perfiles de bancos y brokers que operan en España. Incluye una **sensibilidad a costes de operativa (rotación)**, que es hipotética.

Construimos además un **AI Strategy Analyst**, que después retiramos (decisión 3).

**Cómo sabemos que funciona.** La aplicación tiene:
- en el backend, 295 tests deterministas con resultados conocidos y 54 de integración y extremo a extremo con datos reales;
- en el frontend, 93 tests unitarios y 45 pruebas en navegador real.

Además, el equipo comprobó a mano en la interfaz las seis cifras principales de la investigación, y todas coincidieron.

**Ancla financiera.** Analizamos la inversión minorista a largo plazo: carteras reales, comportamiento histórico, riesgo y la intermediación necesaria para invertir. La base del proyecto es separar dos tipos de coste:

- **El coste del producto (TER):** la gestora lo descuenta del valor liquidativo, así que ya está en el precio y no debe restarse otra vez.
- **El coste del intermediario:** comisiones, custodia y divisa, que dependen de cómo y dónde se opera.

## 3. Tres decisiones que cambiaron el proyecto

**Decisión 1 — Abandonar el comparador trivial y reformular la pregunta.** Descartamos tres alternativas:
- mejorar la interfaz del mismo comparador;
- suponer rentabilidades distintas sin datos, contrario a nuestra regla de no inventar;
- mantener un A/B de dos estrategias.

Decidimos comparar de 2 a 6 estrategias completas con precios históricos reales en el mismo periodo. Así los costes compiten con otras variables, y la pregunta pasa de «¿cuánto cuestan?» a «¿cuándo importan?». Esta decisión convirtió una calculadora en un laboratorio.

**Decisión 2 — Separar el cálculo de la interpretación y validar módulo a módulo.** Con Antigravity pedíamos mucho a la vez y aceptábamos resúmenes del tipo «funciona» o «tested», lo que produjo errores encadenados y documentación de cosas inexistentes. Descartamos seguir parcheando el prototipo, como proponía la IA, y también rehacerlo todo sin método. En su lugar:
- **Arquitectura.** Elegimos React + FastAPI, con la lógica financiera en funciones puras probadas con series de resultado conocido. Por ejemplo, la serie 100 → 120 → 90 → 110 debe dar una máxima caída del −25 %.
- **Fases.** Cada fase pasa por auditoría, implementación, tests (deterministas, con datos reales y en navegador), documentación y revisión del equipo. Las fases de la base (0 a 5) se cerraron con un «APROBADO» escrito antes de continuar.
- **Interpretación.** Toda interpretación se apoya en cifras ya calculadas, nunca las sustituye.

**Decisión 3 — Retirar el AI Strategy Analyst del producto final.**

**Qué construimos.** Queríamos que una IA explicara las diferencias entre estrategias, sin recomendar ni predecir. Construimos un proveedor desacoplado, un *prompt* versionado, una entrada con solo cifras ya calculadas, una salida JSON validada y *guardrails* contra recomendaciones, predicciones y porcentajes inventados. Funcionó primero con la API de pago de Claude y después con un modelo local, LM Studio con Qwen3 8B.

**Por qué lo retiramos.**
- **Rendimiento:** el modelo local razonaba a unos 1,96 *tokens*/s y acababa en *timeout*.
- **Distribución:** cada usuario tendría que instalar LM Studio, descargar varios gigabytes y mantener un servidor, algo incompatible con un repositorio público reproducible.
- **Coste:** la nube volvía a exigir una API de pago.
- **Valor añadido escaso:** la aplicación ya calcula y explica rentabilidad, riesgo, costes, *benchmark* y sensibilidad.

Entre mantener la API de pago, cambiar a otro proveedor en la nube, mantener LM Studio o eliminar la funcionalidad, elegimos eliminarla. Conservamos los *prompts* y las decisiones como rastro.

**Usar IA como método de desarrollo no obliga a meter IA en el producto.** Abandonar algo sofisticado que no mejora la herramienta también es control sobre la tecnología.

## 4. Cuando la IA se equivocó

Registramos **31 errores e incidencias** de las herramientas de IA, cada uno con su evidencia, su fuente de contraste y la acción humana que provocó:

- **Por herramienta:** 18 de Antigravity, 12 de Claude Code y 1 compartido.
- **Por gravedad:** 6 muy fuertes, 13 relevantes y 12 menores.

El registro completo está en `Errores de la IA.md`. Estos son los tres casos más sólidos.

**Caso 1 — Un TER asignado a acciones individuales.**
- **Qué hizo la IA.** En el módulo de costes del prototipo, Antigravity asignó un TER del 0,20 % a Tesla e IonQ y aplicaba ese «coste estimado» por defecto a cada activo nuevo.
- **Por qué era incorrecto.** El TER es el gasto corriente que cobra la gestora de un fondo o ETF. Una acción no tiene gestora: sus costes son de intermediación y dependen del bróker. Mezclarlos falsea la comparación entre inversión directa e indexada.
- **Cómo lo detectamos.** Por razonamiento financiero propio. Lo comprobamos en Yahoo Finance, que clasifica TSLA como `EQUITY`, sin *expense ratio*.
- **Fuentes primarias.**
  - CNMV, *Guía rápida: Fondos cotizados (ETF)*: un ETF implica «dos fuentes de gastos», las del fondo, que «se deducen diariamente del valor liquidativo», y las del intermediario.
  - Ficha oficial de Vanguard VOO, con un TER del 0,03 %.
- **Corrección.** Separamos los costes del producto y del intermediario. Una acción muestra «TER: No aplica», y de ahí salió también la regla de no restar el TER en el backtest.
- **Aprendizaje.** Un número plausible no es un dato.

**Caso 2 — «Superados al 100 %» con un arnés de tests que no podía fallar.**
- **Qué afirmó la IA.** Al cerrar la V0.1, la documentación generada decía: «Todos los acceptance tests obligatorios fueron ejecutados y superados al 100%».
- **Por qué era incorrecto.** El arnés solo marcaba un fallo si había una excepción, así que una comprobación que devolvía `False` contaba como superada. Tres de los diez tests no podían fallar, y otro dependía de si TSLA había bajado en el año.
- **Cómo lo detectamos.** Antes de seguir construyendo, encargamos una auditoría (Fase 0, 11 de noviembre) en la que Claude Code leyó y ejecutó el arnés. Ya desconfiábamos de los resúmenes: en Streamlit, la IA había dado por corregida una navegación que no funcionaba.
- **Fuente primaria.** En un error técnico, el propio código y su ejecución reproducible (`test_suite.py` y su salida).
- **Corrección.** Una suite en tres niveles (deterministas, integración con datos reales y navegador), en la que un `False` cuenta como fallo, y la regla de que nada está terminado hasta que lo probamos nosotras.
- **Aprendizaje.** Un «10/10» solo vale si cada test puede fallar. Si la misma IA escribe el código y el test, ambos pueden compartir el error, como pasó después con Bankinter.

**Caso 3 — Precio ajustado presentado como «precio histórico».**
- **Qué hizo la IA.** En la V0.1, el gráfico de Explore Markets decía «Precio histórico», pero mostraba una serie ajustada por dividendos y *splits* (`auto_adjust=True`, el valor por defecto de `yfinance`). El porcentaje era, en realidad, una rentabilidad total aproximada. El mismo fallo ya se había corregido en el prototipo y reapareció.
- **Por qué era incorrecto.** La rentabilidad de precio y la rentabilidad total son medidas distintas. Confundirlas engaña sobre el precio pagado y sesga la comparación con índices de solo precio.
- **Cómo lo detectamos.** En la auditoría de la Fase 0, comparando el cierre cotizado (`Close`) con el ajustado (`Adj Close`).
- **Fuentes primarias.** La documentación de `yfinance`, donde `history()` define `auto_adjust` («Adjust all OHLC automatically?») con valor por defecto `True`, y las propias series de Yahoo Finance.
- **Corrección.** Se muestran por separado el «valor ajustado» y el «cierre cotizado». Por coherencia, el *benchmark* también es de rentabilidad total, y descartamos `^GSPC`, que es solo precio.
- **Aprendizaje.** Un valor por defecto es una decisión metodológica.

**Otros errores detectados durante el proceso**

| Error | Herramienta · fase | Consecuencia | Resolución |
|---|---|---|---|
| Índices, cripto y futuros clasificados como «acción» | Antigravity · V0.1 | `^GSPC` y `BTC-USD` como acciones | Clasificación por `quoteType` |
| TER de `netExpenseRatio` multiplicado por 100 | Antigravity · V0.1 | Latente: 0,03 % mostrado como 3,00 % | Unidades contrastadas con Vanguard |
| Documentación de funciones inexistentes | Antigravity · V0.1 | Documentación no fiable | Rehecha y contrastada con el código |
| Comisión de Bankinter convertida desde dólares | Claude Code · Fase 5.1 | 2.222 € en vez de 2.440 €; el test repetía el error | Revisión a mano con la tarifa oficial |
| El preset «1 año» nunca mostraba CAGR | Claude Code · Fases 1–2 | Umbral de 365,25 días | 365 días naturales |
| *Timeout* del modelo local mostrado como «backend apagado» | Claude Code · Fase 6.1 | Diagnóstico erróneo | El equipo halló la causa en los *logs* |
| La sensibilidad cobraba las ventas con la regla de compra | Claude Code · Fase 7 | Latente | Test con compra 1 € / venta 10 € |

Casi todos parecían correctos porque los tests usaban casos simétricos, valores por defecto o solo los activos del enunciado.

## 5. Cómo controlamos la máquina

En septiembre y octubre, Antigravity construyó, ejecutó y probó el prototipo y la V0.1. Fue rápido, pero aceptamos demasiadas afirmaciones («funciona», «tested», «100 %») sin comprobarlas.

Desde la auditoría de noviembre, Claude Code pasó a ser la herramienta principal y cambiamos el método. Trabajamos por fases, con criterios de aceptación escritos antes de empezar. Lo verificamos todo con tests deterministas, datos reales, pruebas en navegador y validación humana. La IA debía marcar los fallos como «posible error para revisión humana», no corregirlos ni darlos por buenos. Y separamos lo verificado de lo solo documentado.

| Herramienta | Uso |
|---|---|
| **Antigravity** | Prototipo, ejecución, navegador, terminal y primeras pruebas; dejó de ser la principal tras la V0.1 |
| **Claude Code** | Auditoría, arquitectura, programación, *debugging*, tests, investigación y documentación |
| **Obsidian** (no es una IA) | Bóveda común: decisiones, versiones, fuentes, errores, *acceptance tests* y bitácora |
| **LM Studio + Qwen3 8B** | Solo en el experimento descartado del AI Strategy Analyst |
| **Sin IA** | Yahoo Finance (`yfinance`), React, FastAPI, pytest, Vitest y Playwright |

Las IA aceleraron, investigaron, propusieron, programaron, probaron y documentaron, pero no fueron la autoridad final. Nosotras decidimos el alcance, la metodología, la interpretación financiera, qué se aceptaba y qué se descartaba.

**Rastro del proceso:**
- 81 decisiones fechadas;
- versiones V0.1 a V0.11 y *acceptance tests* por fase;
- registros de errores y *prompts* del analista retirado;
- transcripciones de las sesiones con la IA, conservadas en local.

## 6. Cadena de datos y reproducibilidad

Queríamos una **cadena de datos trazable y reproducible**, en la que cualquier cifra pueda seguirse hasta su origen:

> Fuente externa → adquisición con caché → alineación de fechas → cálculo → backtest → costes → métricas → API → interfaz → tests → resultados.

Distinguimos tres tipos de información:
- **Datos externos:** precios y tipos de cambio de Yahoo Finance, tarifas oficiales con URL y fecha, y noticias.
- **Datos derivados:** rentabilidad, CAGR, volatilidad, máxima caída, Sharpe, TWR, *benchmark* y costes, calculados por funciones probadas.
- **Interpretación:** nuestras conclusiones, que se apoyan en los datos y nunca los sustituyen.

Un único módulo accede a Yahoo. Las fechas se alinean sin inventar precios y todo se convierte a euros con el tipo de cambio del día. Los experimentos se ejecutaron con un script que llama a la API de la aplicación con fechas fijas y guarda las respuestas.

La trazabilidad es completa; la reproducibilidad, *razonable*, porque Yahoo puede corregir datos y las tarifas cambian. El detalle está en `Cadena de datos y reproducibilidad.md`.

## 7. Investigación y experimentos

> **Pregunta:** ¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y *benchmark*, en simulaciones históricas?

**Por qué importa.** El inversor minorista paga costes de intermediación muy distintos según el canal. ESMA, en su informe de costes de marzo de 2026, recuerda que los rendimientos brutos de algunos productos no reflejan los costes que soporta el inversor. Barber y Odean (2000) encontraron que los hogares que más operaban obtenían menor rentabilidad neta. Son otro mercado y otra época, así que este resultado motiva nuestra pregunta, pero no la responde.

**Método.**
- **Hipótesis.** Las escribimos antes de ejecutar y no las cambiamos después.
- **Diseño.** Una sola variable por experimento y fechas fijas: del 18/11/2016 al 18/11/2026, o desde el 18/11/2021 para el horizonte de 5 años.
- **Cartera base.** Es ilustrativa: 70 % iShares Core MSCI World (`IWDA.AS`) y 30 % deuda pública euro (`EUNH.DE`), con 10.000 € iniciales y 300 € al mes.
- **Validación.** Antes de congelar los resultados, contrastamos los supuestos tarifarios con las webs oficiales y comprobamos a mano en la interfaz las seis cifras principales. Todas coincidieron.

| Exp. | Qué cambia | Resultado principal | Estado |
|---|---|---|---|
| **E1** | Intermediario (misma cartera, 242 compras en 10 años) | Con ING, 772 € de costes y 83.395 € netos sobre 84.541 € brutos. Con comisión fija internacional (20 € en Bankinter y Santander, 36 € en CaixaBank), las compras suman 4.840–8.712 €. El impacto va de unos pocos euros a 13.331 € | Validado con limitaciones |
| **E2** | Frecuencia (mensual, trimestral o anual, con los mismos 3.600 € al año) | Antes de costes, aportar cada mes da **+2.747 €** frente a hacerlo una vez al año, por el momento de entrada en un periodo alcista. Con ING, la mensual cuesta 677 € más y sigue por delante; con CaixaBank cuesta 11.574 € más y el orden se invierte | Validado con limitaciones |
| **E3** | Composición: global 100 % RV, mixta 60/40 o tres acciones españolas, frente al S&P 500 TR | La concentrada fue la más rentable (316,7 %, frente al 282,0 % del índice), con más volatilidad (18,4 %) y una caída del −34,4 %. El Sharpe de las tres quedó casi empatado (0,82–0,86) | Validado con limitaciones |
| **E4** | Horizonte: 10 o 5 años | El CAGR baja del 9,26 % al 6,69 % y la máxima caída, del −25,6 % al −16,7 %. El Sharpe frente al índice **se invierte**: 0,82 frente a 0,79 a 10 años, y 0,65 frente a 0,675 a 5 | Validado |
| **E5** | Rotación (**simulación hipotética**: 5 % anual supuesto, sin custodia) | La rotación alta (24 órdenes al año) resta en 10 años un 2,5 % con MyInvestor, un 7,6 % con ING y un 37,3 % con Bankinter; comprar y mantener, un 0,1–0,2 % | Hipotético |

**Qué observamos:**
- **La estructura de la tarifa importa más que la etiqueta de «barato».** Una comisión fija castiga las operaciones pequeñas y repetidas (E1, E5).
- **La frecuencia mezcla el momento de entrada y las comisiones** (E2).
- **Más rentabilidad no es más eficiencia** (E3).
- **El periodo puede cambiar la conclusión** (E4).

**No todas las hipótesis se cumplieron.** Esperábamos que ninguna estrategia superara al S&P 500 TR, y la concentrada lo hizo. Lo leemos con su **sesgo de selección**: son tres grandes empresas que hoy sabemos que sobrevivieron. Y nuestra hipótesis sobre la frecuencia era demasiado general: el momento de entrada dominó con ING, pero no con comisiones fijas altas.

## 8. Limitaciones y qué haríamos diferente

**Limitaciones:**
- **Datos de mercado.** `yfinance` no es una API oficial y no controla el sesgo de supervivencia.
- **Tarifas.** Las de noviembre de 2026 se aplican a todo el periodo, y algunas son aproximaciones: la custodia de Santander es la máxima de su folleto, la de CaixaBank usa el mínimo (se calcula sobre el nominal) y la elegibilidad de los ETF en BBVA y Revolut no es verificable públicamente.
- **Custodia y mantenimiento.** Se restan sin coste de oportunidad y la sensibilidad no los incluye.
- **Riesgo.** Se mide antes de costes, con un Sharpe de tasa libre de riesgo del 0 %.
- **Fuera del modelo.** No hay fiscalidad, spreads ni XIRR, y nada es predicción ni asesoramiento.

**Qué haríamos diferente:**
1. **Escribir la pregunta, las hipótesis y el «cómo sabremos si ha salido bien» antes de programar.** Nuestra pregunta definitiva llegó tarde.
2. **Construir primero un arnés de tests que pueda fallar** y leer qué comprueba cada test antes de creernos un «100 %».
3. **Contrastar cada concepto y cada tarifa con su fuente oficial antes de modelarlos.** Así se habrían evitado el TER de las acciones y el error de divisa de Bankinter.
4. **Usar Git y guardar *prompts* y capturas desde el primer día.** De los errores de Antigravity solo conservamos registros escritos.
5. **Medir el valor añadido de una funcionalidad antes de ampliarla.** Con el AI Strategy Analyst confundimos lo construido con lo necesario.

## Conclusión

En nuestras simulaciones históricas, los costes de intermediación y la frecuencia de operativa **pueden cambiar de forma material** el resultado de una estrategia a largo plazo. Ocurre sobre todo cuando la tarifa tiene componentes fijos y se opera a menudo con importes pequeños. Con tarifas porcentuales bajas o planes sin comisión, su efecto fue pequeño frente al de la composición de la cartera y el periodo elegido. La respuesta es «depende de la estructura de costes y del patrón de operativa», pero ahora sabemos cuantificarlo y separarlo del efecto del mercado.

El principal aprendizaje no es técnico. La IA nos permitió construir mucho más de lo que habríamos podido solas, pero cada vez que la tratamos como autoridad se equivocó de formas plausibles. El valor del trabajo está en las decisiones sobre lo que construía: qué aceptar, qué contrastar y qué retirar.

## Fuentes principales

- CNMV — *Guía rápida: Fondos cotizados (ETF)*. https://www.cnmv.es/DocPortal/Publicaciones/Fichas/FondosCotizados(ETF).pdf (consulta: 18/11/2026).
- Vanguard — *Vanguard S&P 500 ETF (VOO) Fact sheet*, datos a 30/09/2026. https://fund-docs.vanguard.com/F0968.pdf
- yfinance — `Ticker.history()`, parámetro `auto_adjust`. https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/history.py (consulta: 18/11/2026).
- ESMA — *Market report on Costs and performance of EU retail investment products 2025*, nota de prensa del 03/03/2026. https://www.esma.europa.eu/press-news/esma-news/new-investment-funds-drive-reduction-costs-investors
- Barber, B. M. y Odean, T. (2000). «Trading Is Hazardous to Your Wealth». *The Journal of Finance*, 55(2), 773–806. https://doi.org/10.1111/0022-1082.00226
- Sharpe, W. F. (1994). «The Sharpe Ratio». *The Journal of Portfolio Management*, 21(1), 49–58. https://doi.org/10.3905/jpm.1994.409501
- Tarifas oficiales de ING, Bankinter, Santander (incluido su folleto de tarifas máximas), CaixaBank, BBVA, MyInvestor, Trade Republic y Revolut: URL y fecha de consulta en `Datos y fuentes.md`.
- Yahoo Finance mediante `yfinance` 1.7.0: precios, tipos de cambio y *benchmarks* (`^SP500TR`, `IWDA.AS`).
