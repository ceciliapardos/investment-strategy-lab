# Investigación principal

Ancla financiera del proyecto: qué problema estudiamos, con qué pregunta, qué hipótesis y qué podemos contrastar realmente con **Investment Strategy Lab**.

**Estado:**
- Redactado en la Fase 8 (2026-11-18). **Pendiente de revisión y aprobación del equipo.**
- No contiene resultados empíricos: los resultados se producirán con la aplicación y se documentarán aparte.
- Lo que aquí aparece como hipótesis **no es una conclusión**.

---

## 1. Problema financiero

Un inversor minorista que empieza a invertir a largo plazo tiene que decidir, a la vez:
- **qué** comprar: activos, pesos y diversificación;
- **cómo** comprarlo: intermediario, tarifa, aportaciones periódicas, frecuencia de operativa.

Los costes del segundo bloque son pequeños en cada operación, pero:
- **se repiten** con cada compra, aportación, custodia trimestral o cambio de divisa;
- **dejan de capitalizarse**: lo pagado no crece en los años siguientes;
- **son difíciles de comparar**, porque cada intermediario combina comisiones fijas, porcentuales, mínimos, tramos, custodia y divisa de forma distinta;
- **se confunden** con los costes internos del producto (TER), que ya están dentro del precio de un ETF o fondo.

La CNMV lo resume así para los ETF:
- invertir implica «dos fuentes de gastos»: las del propio fondo y las del intermediario;
- el inversor debe analizar los gastos directos e indirectos, porque todos ellos «inciden en la rentabilidad final de la inversión» (ver §9, [F1]).

## 2. Pregunta de investigación

> **¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y benchmark, en simulaciones históricas?**

- La pregunta se mantiene tal como la propuso el equipo.

**Términos operativos** (cómo los mide la aplicación):

| Término | Definición en el proyecto |
|---|---|
| Costes de intermediación | Comisiones de compra y venta, custodia, mantenimiento y cambio de divisa de un perfil tarifario oficial y fechado (`backend/data/broker_fees.json`) |
| Frecuencia de operativa | En el backtest histórico: número de compras (inicial + aportaciones periódicas mensuales, trimestrales o anuales). En la simulación de sensibilidad: perfiles de rotación hipotéticos (0, 4, 12 y 24 órdenes al año) |
| Eficiencia real | Resultado en euros y en % **después** de costes de intermediación, puesto en relación con el riesgo asumido (volatilidad, máxima caída, Sharpe con rf = 0 %) y con un benchmark del mismo periodo |
| Largo plazo | Periodos de varios años (presets de 1, 3, 5 y 10 años, máximo común o fechas personalizadas) |
| Inversor minorista | Persona residente en España que invierte en euros a través de un banco o broker con tarifa estándar publicada |

## 3. Motivación

- **Evolución del propio proyecto.**
  - La primera idea («coste invisible») comparaba productos con la misma rentabilidad bruta y distinto coste. El resultado estaba decidido de antemano: el más barato siempre gana ([[Errores de la IA]] E10, [[Bitácora]] §2).
  - La pregunta interesante aparece cuando los costes **interactúan** con otras decisiones: diversificar con más activos o aportar cada mes multiplica las operaciones; una tarifa barata por operación puede tener custodia cara; una estrategia con más rentabilidad bruta puede perder ventaja tras costes.
- **Relevancia regulatoria.** ESMA publica cada año un informe sobre costes y rentabilidad de los productos minoristas en la UE. En el último (03/03/2026) advierte de que algunos rendimientos brutos «no reflejan los costes pagados por los inversores» ([F2]).
- **Relevancia académica.**
  - Barber y Odean (2000) documentan que, en su muestra de hogares estadounidenses, quienes más operaban obtenían menor rentabilidad neta ([F4]).
  - French (2008) estima el coste agregado de la inversión activa en EE. UU. ([F6]).
  - Son contextos distintos al nuestro, pero motivan la pregunta: no la responden por nosotras.

## 4. Hipótesis de trabajo

Planteadas **antes** de obtener resultados. Pueden confirmarse, matizarse o rechazarse.

- **H1 — Frecuencia.** A igualdad de activos y periodo, más operaciones (aportaciones más frecuentes o más activos) aumentan los costes de intermediación acumulados. El impacto depende de la **estructura** de la tarifa (fija, porcentual, mínimos, órdenes gratuitas), no solo de su nivel.
- **H2 — Estructura frente a nivel.** El intermediario más barato no es el mismo para todas las estrategias: depende del número de operaciones, del tamaño de cada una, del mercado y de la custodia.
- **H3 — Orden de magnitud.** En estrategias buy & hold diversificadas, los costes de intermediación pueden ser pequeños frente a las diferencias de rentabilidad y riesgo entre estrategias. Con mucha operativa o con custodias altas pueden dejar de serlo.
- **H4 — Benchmark.** Una parte de las estrategias construidas por un principiante puede quedar por detrás de un índice amplio de referencia en el mismo periodo, una vez descontados los costes. *Es una hipótesis a contrastar caso a caso, no una afirmación general.*

**Lo que NO pretendemos demostrar:** que los bancos sean «malos», que los brokers digitales sean «mejores», que exista una estrategia óptima o que el pasado se repita.

## 5. Variables relevantes

| Variable | Tipo | Dónde se obtiene | Módulo |
|---|---|---|---|
| Activos y pesos | Decisión del usuario | Strategy Builder | 3 |
| Capital inicial y aportaciones (importe, frecuencia) | Decisión del usuario | Strategy Builder | 3 |
| Precio ajustado diario (dividendos reinvertidos) | Dato externo | Yahoo Finance (yfinance) | 2, 4 |
| Tipo de cambio diario EUR/divisa | Dato externo | Yahoo Finance (`EUR{CCY}=X`) | 4 |
| Rentabilidad total y TWR | Derivada | `analytics/metrics.py`, `analytics/portfolio.py` | 2, 4 |
| CAGR, volatilidad, máxima caída, Sharpe (rf = 0 %) | Derivada | `analytics/metrics.py` | 2, 4 |
| Benchmark (S&P 500 TR, MSCI World vía ETF) | Dato externo + derivada | Yahoo Finance; `backtest_service.benchmark_result` | 4 |
| Comisiones, custodia, divisa | Dato externo fechado | Tarifas oficiales → `broker_fees.json` | 5 |
| Costes acumulados y resultado neto | Derivada | `analytics/costs.py` | 5 |
| TER | Dato externo (informativo) | Yahoo Finance; contraste puntual con la ficha del emisor | 2, 5 |
| Rentabilidad supuesta y perfil de rotación | Supuesto del usuario | Sensibilidad a costes | 5 |
| ~~Interpretación textual~~ | ~~Generativa~~ | ~~Modelo local en LM Studio~~ | 🔁 Retirada en la Fase 8.1 (D80) |

## 6. Relación entre costes y largo plazo

**Mecanismo** (implementado de forma transparente en la sensibilidad a costes, `analytics/sensitivity.py`):
- un coste pagado en el año *t* reduce el capital que se capitaliza desde *t* hasta el final;
- por eso la **diferencia final** frente a un escenario sin costes es **mayor que la suma de costes pagados**.

**Distinción clave del proyecto:**
- **Costes del producto (TER):** la gestora los descuenta del valor liquidativo. La CNMV indica que las comisiones de gestión y depósito «se deducen diariamente del valor liquidativo» ([F1]). Como el backtest usa precios reales, la rentabilidad histórica **ya es neta de TER** y no se vuelve a restar (D42).
- **Costes de intermediación:** no están en el precio. La aplicación los resta operación a operación.

## 7. Qué permite estudiar Investment Strategy Lab (y por qué existe cada módulo)

| Módulo | Por qué existe en la investigación |
|---|---|
| **News** | Contexto: muestra que el mercado se mueve por noticias que no se pueden anticipar. No interviene en los cálculos |
| **Explore Markets** | Conocer cada activo por separado (tipo, rentabilidad, riesgo, TER) antes de combinarlo. Valida la capa de datos |
| **Strategy Builder** | Define las alternativas que se comparan: activos, pesos, capital y aportaciones. Es donde el usuario fija la **frecuencia** de compra |
| **Strategy Comparison** | Mide rentabilidad y riesgo de cada estrategia en el **mismo periodo común**, en euros, y frente a un **benchmark** opcional |
| **Cost Analysis** | Aplica tarifas oficiales a las operaciones reales del backtest: resultado antes y después de costes, por intermediario. La **sensibilidad** aísla el efecto de la rotación con supuestos visibles |
| ~~AI Strategy Analyst~~ | 🔁 **Retirado del producto en la Fase 8.1** por decisión del equipo (D80). Interpretaba cifras ya calculadas, sin calcular nada, así que su retirada no afecta a ninguna variable de la investigación |

## 8. Evidencia y literatura encontrada

Pocas fuentes, verificadas (DOI comprobado en Crossref el 18/11/2026). **Lo que cada fuente respalda está acotado**: no extrapolamos sus resultados a nuestro caso.

| Ref. | Qué aporta a la investigación | Límite para nuestro caso |
|---|---|---|
| [F1] CNMV, guía de ETF | Dos fuentes de gastos en un ETF; las comisiones de gestión y depósito se deducen del valor liquidativo; hay que analizar gastos directos e indirectos | Divulgativa, no normativa (la propia guía lo advierte) |
| [F2] ESMA, informe de costes 2025 | Los costes corrientes de los UCITS siguen bajando, sobre todo por la entrada de fondos nuevos; el rendimiento bruto no refleja los costes del inversor | Se centra en costes del producto, no en tarifas de brokers españoles |
| [F3] CNMV, asesoramiento | El asesoramiento consiste en ofrecer «recomendaciones personalizadas sobre productos» → límite de lo que la app puede decir (y del antiguo AI Analyst) | — |
| [F4] Barber y Odean (2000) | Más operativa se asocia a menor rentabilidad neta en hogares de EE. UU. (1991–1996) | Mercado, época y costes distintos; acciones individuales |
| [F5] Carhart (1997) | Los gastos y la rotación de los fondos se asocian negativamente con su rentabilidad | Fondos de inversión de EE. UU., no inversores minoristas |
| [F6] French (2008) | Estima el coste agregado de intentar batir al mercado (inversión activa) en EE. UU. | Agregado de mercado, no decisiones individuales |
| [F7] Sharpe (1994) | Definición del ratio de Sharpe usado en la aplicación | Con rf = 0 %, el ratio es una simplificación declarada (D71) |

## 9. Fuentes

| Ref. | Autor / institución | Título | Año | URL / DOI | Consulta | Tipo |
|---|---|---|---|---|---|---|
| F1 | CNMV | *Guía rápida: Fondos cotizados (ETF)* | Sin fecha visible | https://www.cnmv.es/DocPortal/Publicaciones/Fichas/FondosCotizados(ETF).pdf | 18/11/2026 | Institucional (regulador) |
| F2 | ESMA | *Market report on Costs and performance of EU retail investment products 2025* (nota de prensa «New investment funds drive reduction in costs to investors») | 03/03/2026 | https://www.esma.europa.eu/press-news/esma-news/new-investment-funds-drive-reduction-costs-investors | 18/11/2026 | Institucional (supervisor UE) |
| F3 | CNMV | «Asesoramiento en materia de inversión», Portal del Inversor | Sin fecha | https://www.cnmv.es/Portal/Inversor/Asesoramiento?lang=es | 18/11/2026 (vía buscador) | Institucional |
| F4 | Barber, B. M. y Odean, T. | «Trading Is Hazardous to Your Wealth: The Common Stock Investment Performance of Individual Investors», *The Journal of Finance*, 55(2), 773–806 | 2000 | https://doi.org/10.1111/0022-1082.00226 | 18/11/2026 | Académica |
| F5 | Carhart, M. M. | «On Persistence in Mutual Fund Performance», *The Journal of Finance*, 52(1), 57–82 | 1997 | https://doi.org/10.1111/j.1540-6261.1997.tb03808.x | 18/11/2026 | Académica |
| F6 | French, K. R. | «Presidential Address: The Cost of Active Investing», *The Journal of Finance*, 63(4), 1537–1573 | 2008 | https://doi.org/10.1111/j.1540-6261.2008.01368.x | 18/11/2026 | Académica |
| F7 | Sharpe, W. F. | «The Sharpe Ratio», *The Journal of Portfolio Management*, 21(1), 49–58 | 1994 | https://doi.org/10.3905/jpm.1994.409501 | 18/11/2026 | Académica |

**Notas sobre las fuentes:**
- Las fuentes de **datos** (Yahoo Finance, tarifas oficiales de cada intermediario, fichas de emisores, BCE) están en [[Datos y fuentes]].
- Para F4–F6 **solo se ha verificado la referencia bibliográfica y el resumen**. El equipo debe leer al menos el resumen antes de citarlas en la bitácora.
- F3 se localizó con un buscador y se cita por su frase descriptiva. La definición legal es la de la Directiva 2014/65/UE (MiFID II), art. 4.1.4, **no verificada literalmente en esta fase**.

## 10. Qué podremos contrastar empíricamente con la aplicación

Todo es **simulación histórica**: sirve para describir qué habría pasado, no qué pasará.

| Hipótesis | Experimento posible con la app | Salida que lo responde |
|---|---|---|
| H1 | Misma estrategia con aportación mensual, trimestral y anual (mismo importe anual) bajo varios intermediarios | Costes durante la inversión y nº de operaciones (Cost Analysis) |
| H2 | Una estrategia bajo los 10 perfiles tarifarios | Tabla «una estrategia bajo todos los intermediarios» |
| H3 | Comparar la diferencia de resultado entre estrategias (Comparison) con la diferencia de costes entre intermediarios (Cost Analysis) | Valor final antes y después de costes |
| H4 | Activar el benchmark en Comparison y aplicar costes en Cost Analysis | Diferencia frente a benchmark; resultado neto |
| Rotación | Perfiles de rotación con supuestos visibles | Diferencia acumulada frente a «sin costes» (hipotética, no histórica) |

**Cómo sabremos si ha salido bien** (formulado antes de los resultados, como pide el enunciado):
- Las cifras de costes de al menos un caso por intermediario coinciden con un cálculo a mano sobre la tarifa oficial.
- Cada conclusión se apoya en una salida concreta de la app (captura y parámetros) y no se generaliza fuera del periodo y la tarifa usados.

## 11. Limitaciones de la investigación

- **Retrospectiva, no predictiva.** Los resultados dependen del periodo elegido; otro periodo puede invertir las conclusiones.
- **Riesgo antes de costes.** Volatilidad, máxima caída y Sharpe se calculan en Strategy Comparison sobre la rentabilidad **antes** de costes de intermediación. Cost Analysis da el resultado neto en € y %, pero **no** un Sharpe o un CAGR netos. La «eficiencia real» se evalúa combinando ambas salidas. Es la limitación más importante frente a la pregunta.
- **Frecuencia de operativa.** En el backtest histórico solo existen compras (inicial y aportaciones, buy & hold sin rebalanceo). La rotación con ventas solo está en la simulación hipotética de sensibilidad.
- **Datos.** yfinance no es una API oficial; sin control del sesgo de supervivencia; el TER de muchos UCITS no está disponible.
- **Tarifas.** Consultadas a 12/11/2026. Algunas son interpretaciones marcadas ⏳: tarifa máxima de Santander, mínimo de CaixaBank, custodia de ING. Se aplican hacia atrás a periodos en los que la tarifa real pudo ser otra.
- **No modelado:** impuestos, spreads, slippage, cánones de bolsa, rentabilidad ponderada por el dinero (XIRR), promociones y packs.
- **Benchmark MSCI World:** es un proxy ETF (IWDA.AS) que ya descuenta su TER; el S&P 500 TR está en USD y se convierte a euros.
- **Sharpe con rf = 0 %:** simplificación declarada (D71). El €STR solo existe desde 2019.
- ~~**Interpretación generativa:** el texto del AI Analyst puede equivocarse.~~ 🔁 Ya no aplica: el AI Analyst se retiró en la Fase 8.1 (D80). Todas las salidas de la app son deterministas.
- **Literatura:** de mercados y periodos distintos; motiva la pregunta, no la responde.

## 12. Contraste con los resultados empíricos (Fase 9, 2026-11-19)

> Las hipótesis H1–H4 de §4 **no se han modificado**. Este apartado solo las contrasta con los experimentos de [[Experimentos y resultados]]. Son resultados de simulaciones históricas del proyecto (y una hipotética, E5), no evidencia predictiva, y muestran asociaciones dentro de escenarios concretos, no relaciones causales generales.

| Hipótesis | Evidencia | Lectura |
|---|---|---|
| **H1 — Frecuencia** | E2: con la misma cantidad anual, mensual 240 compras frente a 20 anuales. Las comisiones de compra suben con la frecuencia en todos los intermediarios con coste por orden. Con ING el coste total no sube igual, porque la aportación anual paga custodia por trimestres sin operaciones. E5: la diferencia frente a sin costes crece con la rotación | **Se sostiene, con matices.** El impacto depende de la estructura de la tarifa (fija, porcentual, plan sin comisión, custodia condicionada) |
| **H2 — Estructura frente a nivel** | E1–E3: el orden intermedio de los intermediarios cambia con la frecuencia y la cartera (p. ej. con acciones españolas CaixaBank resulta más barato que ING). Los perfiles de menor impacto (Trade Republic y Revolut Estándar) fueron los mismos en todos los escenarios probados | **Se sostiene en parte.** La estructura cambia el orden de la mayoría, pero en estos escenarios el «más barato» no cambió |
| **H3 — Orden de magnitud** | E3: en buy & hold, costes con ING de 204–593 € frente a más de 19.000 € de diferencia entre estrategias. E1/E2: con aportaciones mensuales y comisión fija alta, impactos de 7.808–13.331 € (17–29 % de lo aportado) | **Se sostiene.** Pequeños en buy & hold con tarifas bajas; materiales con mucha operativa y comisiones fijas o custodias altas |
| **H4 — Benchmark** | E3: A y B quedaron por debajo del S&P 500 TR en rentabilidad total y C por encima; las tres, con Sharpe algo mayor que el índice. E4: BASE quedó por debajo del índice en CAGR en 5 y 10 años, pero por encima en Sharpe a 10 años y por debajo a 5 años | **Se sostiene en parte.** Algunas estrategias quedan por detrás del índice en rentabilidad, pero la conclusión cambia al ajustar por riesgo y al cambiar el periodo |

**Limitación añadida tras los experimentos:**
- la custodia y el mantenimiento se restan al final sin coste de oportunidad, así que su impacto está ligeramente infravalorado ([[Experimentos y resultados]] §0.5);
- la simulación de sensibilidad no incluye la custodia de cada intermediario.