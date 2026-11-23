# Investment Strategy Lab — Bitácora final

Cecilia Pardos · Almudena López · Covadonga López-Belmonte · Análisis de Servicios Financieros (ICADE E2A) · El carril abierto · Nivel 2: Construir · Entrega: 26 de noviembre de 2026

Repositorio: https://github.com/ceciliapardos/investment-strategy-lab · Live Demo: https://investment-strategy-lab.onrender.com

## 1. De «Coste Invisible» a Investment Strategy Lab

En la propuesta del 24 de septiembre queríamos medir el «coste invisible» de invertir: cuánto patrimonio pierde a largo plazo un inversor minorista por elegir productos o plataformas más caros. El primer prototipo, construido con Antigravity en Streamlit, comparaba dos alternativas con el mismo capital, las mismas aportaciones y **la misma rentabilidad bruta**; solo cambiaba el coste.

Al usarlo vimos que la conclusión estaba decidida por construcción: si se supone la misma rentabilidad y solo cambia el coste, el producto barato gana siempre. El cálculo era correcto, pero no ayudaba a decidir nada, porque un inversor acepta pagar más cuando espera algo a cambio (rentabilidad, menos riesgo, diversificación) y ese *trade-off* no aparecía.

Decidimos abandonar esa formulación. No fue un fracaso: fue la primera decisión importante del proyecto, y la que le dio una pregunta real.

> ¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y *benchmark*, en simulaciones históricas?

La pregunta tiene respaldo: ESMA recuerda en su informe de costes de 2026 que los rendimientos brutos de algunos productos no reflejan lo que paga el inversor, y Barber y Odean (2000) encontraron que los hogares que más operaban obtenían menor rentabilidad neta. Son otro mercado y otra época: motivan la pregunta, no la responden.

## 2. Qué construimos y qué problema financiero analizamos

Investment Strategy Lab es una aplicación educativa de **simulación histórica**: no predice ni asesora. En **Explore Markets** se estudian activos reales (CAGR, volatilidad, máxima caída, Sharpe y TER) y se guardan favoritos. En **Strategy Builder** se construyen estrategias con pesos, capital y aportaciones periódicas. **Strategy Comparison** las simula en euros sobre el periodo común de sus activos, frente a un *benchmark* opcional (S&P 500 Total Return o MSCI World). **Cost Analysis** aplica a cada operación las tarifas oficiales de 10 perfiles de bancos y brokers que operan en España, con estructuras muy distintas, e incluye una sensibilidad a costes de operativa. Un módulo de **News** completa la aplicación.

La pieza financiera que analizamos es la intermediación en la inversión minorista. La aplicación separa dos costes que a menudo se confunden: el **coste del producto** (TER), que la gestora descuenta del valor liquidativo y por tanto ya está en el precio, y el **coste del intermediario** (comisiones, custodia y divisa), que depende de dónde y cómo se opera. Esa separación permite preguntarse qué estrategia es realmente más eficiente cuando se miran juntos la rentabilidad, el riesgo, la diversificación, el horizonte, la operativa y los costes. El código, los tests y la documentación completa están en el repositorio, y la aplicación está publicada en la Live Demo.

## 3. Tres decisiones humanas que cambiaron el proyecto

**Decisión 1 — Abandonar el comparador trivial y reformular la pregunta.**
- **Alternativas descartadas:** pulir la interfaz del mismo comparador o suponer rentabilidades distintas sin datos. La segunda contradecía nuestra regla de no inventar cifras.
- **Qué decidimos:** comparar de 2 a 6 estrategias completas con precios históricos reales, en el mismo periodo.
- **Qué cambió:** los costes pasaron a competir con el riesgo, la composición y el horizonte. Una calculadora se convirtió en un laboratorio, y todos los módulos posteriores salen de esta decisión.

**Decisión 2 — Separar el cálculo determinista de la interpretación y validar módulo a módulo.** Con Antigravity pedíamos muchas funciones a la vez y aceptábamos resúmenes como «funciona» o «tested». El resultado fueron errores encadenados y documentación que describía cosas que no existían.
- **Alternativas descartadas:** seguir parcheando el prototipo, que era lo que proponía la IA, o rehacerlo todo sin método.
- **Qué decidimos:**
  - toda la lógica financiera en funciones puras, probadas con series de resultado conocido;
  - una auditoría antes de construir;
  - trabajo por fases, cada una con tests automáticos y una comprobación humana en la interfaz antes de pasar a la siguiente;
  - ninguna afirmación de la IA sobre su propio trabajo se aceptaba sin una prueba que pudiera fallar.
- **Qué ganamos:** control. Cada cifra que mostramos puede rastrearse hasta un cálculo probado.

**Decisión 3 — Retirar el AI Strategy Analyst del producto final.** Quisimos añadir una capa de IA que explicara en lenguaje sencillo las diferencias entre estrategias.
- **Qué construimos:** un proveedor desacoplado, *prompts* versionados, una entrada con solo cifras ya calculadas, una respuesta validada y *guardrails* contra recomendaciones y predicciones. Lo probamos primero con la API de pago de Claude y después con un modelo local (LM Studio con Qwen3 8B).
- **Qué nos hizo decidir:**
  - en nuestras pruebas, el modelo local generaba unos 1,96 *tokens*/s y acababa en *timeout*;
  - en una aplicación pública, el usuario o el servidor tendría que depender de un modelo adicional: una API de pago o varios gigabytes instalados y en marcha;
  - la herramienta ya calcula y explica de forma determinista y verificable todo lo que el texto generado repetía.
- **Qué decidimos:** entre mantener la API, cambiar de proveedor, mantener el modelo local o eliminar la funcionalidad, la retiramos conscientemente. Conservamos sus *prompts* y decisiones como rastro.

Para nosotras es la prueba más clara de control: **usar IA como método de trabajo no obliga a meter IA en el producto**.

## 4. Dónde se equivocó la máquina

Durante el proyecto registramos **31 incidencias** atribuibles a respuestas, supuestos o implementaciones generadas con IA, tanto de Antigravity como de Claude Code. Desarrollamos las tres mejor contrastadas.

**Caso 1 — Un TER asignado a acciones individuales.**
- **Qué hizo la IA:** en el prototipo, Antigravity asignó un TER del 0,20 % a Tesla e IonQ y aplicaba ese «coste estimado» por defecto a cada activo nuevo. Parecía razonable porque cada activo «tenía su coste», y el TER es el coste más conocido de la inversión indexada.
- **Cómo lo detectamos:** al revisarlo, nos preguntamos qué era ese 0,20 % en una acción. Una acción no tiene gestora ni comisión de gestión: sus costes son la compraventa, la custodia y la divisa del intermediario. Lo comprobamos en Yahoo Finance, que clasifica TSLA como `EQUITY`, sin *expense ratio*.
- **Fuentes primarias:**
  - la guía de ETF de la CNMV explica que invertir en un ETF implica «dos fuentes de gastos»: las comisiones del fondo, que «se deducen diariamente del valor liquidativo», y las del intermediario;
  - la ficha oficial de Vanguard VOO da un TER del 0,03 %, el mismo que mostraba la aplicación para ese ETF.
- **Corrección:** separamos los costes del producto y del intermediario. Una acción muestra «TER: No aplica». De ahí salió también la regla de no restar el TER en el backtest, porque ya está en el precio.
- **Aprendizaje:** un número plausible no es un dato.

**Caso 2 — «Superados al 100 %» con un arnés de tests que no podía fallar.**
- **Qué afirmó la IA:** al cerrar la V0.1, la documentación generada decía que «todos los acceptance tests obligatorios fueron ejecutados y superados al 100%». Parecía razonable porque existía un script y su salida era «10/10 PASSED».
- **Cómo lo detectamos:** antes de seguir construyendo, encargamos una auditoría (Fase 0), en la que Claude Code leyó y ejecutó el propio arnés. Ya desconfiábamos de los resúmenes: en Streamlit, la IA había dado por corregida una navegación que, al probarla nosotras, seguía fallando.
- **Qué encontramos:**
  - el arnés solo marcaba un fallo ante una excepción, así que una comprobación que devolvía `False` contaba como superada;
  - tres de los diez tests no podían fallar;
  - otro dependía de si TSLA había bajado en el año, es decir, del mercado y no del código.
- **Fuente primaria:** en un error técnico, el propio código del arnés y su ejecución reproducible.
- **Corrección:** nuevos tests deterministas con resultados conocidos, tests de integración y pruebas en navegador, más la comprobación humana de cada fase.
- **Aprendizaje:** la seguridad con la que una IA afirma algo no es evidencia.

**Caso 3 — Precio ajustado presentado como «precio histórico».**
- **Qué hizo la IA:** en la V0.1, el gráfico de Explore Markets se titulaba «Precio histórico». Pero la serie venía de `yfinance` con `auto_adjust=True`, su valor por defecto, que ajusta los precios por dividendos y *splits*. La auditoría verificó que el porcentaje mostrado era, en realidad, una rentabilidad total aproximada y no la variación del precio de cotización. Parecía razonable porque los datos eran reales y el gráfico, coherente.
- **Cómo lo detectamos:** en la auditoría, comparando para los mismos activos el cierre cotizado (`Close`) con el ajustado (`Adj Close`). El mismo fallo ya se había corregido una vez en el prototipo y volvió a aparecer.
- **Fuentes primarias:** la documentación de `yfinance`, donde `history()` define `auto_adjust` («Adjust all OHLC automatically?») con valor por defecto `True`, y las propias series de Yahoo Finance.
- **Corrección:**
  - la aplicación muestra por separado el «valor ajustado» y el «cierre cotizado»;
  - declara que la rentabilidad principal es total, con dividendos reinvertidos;
  - por coherencia, el *benchmark* también es de rentabilidad total, y descartamos el S&P 500 de solo precio.
- **Aprendizaje:** un valor por defecto de una librería es una decisión metodológica.

**Otros errores registrados.** Entre ellos:
- índices y criptomonedas clasificados como acciones;
- un TER que el código habría multiplicado por 100;
- la comisión internacional de Bankinter, que está en euros, tratada como si estuviera en dólares (la detectó la propia IA al revisar las cifras a mano, y el test que había escrito repetía el error);
- un periodo de 1 año que nunca mostraba CAGR;
- un *timeout* del modelo local presentado como «backend apagado»;
- las ventas de la sensibilidad, calculadas con la comisión de compra.

El registro completo, con evidencia y fuente, está en `Errores de la IA.md`.

## 5. Cómo controlamos la máquina

**Antigravity** construyó y probó la primera etapa. Desde la auditoría, **Claude Code** fue el agente principal: arquitectura, programación, tests, investigación de fuentes y documentación. **Obsidian** no es una IA, sino nuestra bóveda de documentación, donde registramos decisiones fechadas, versiones, fuentes, pruebas y errores. Las fuentes las consultamos directamente en las webs oficiales (CNMV, ESMA, BCE, intermediarios y emisores), y **Git y GitHub** guardan el historial del código.

El método importó más que las herramientas. Cada fase empezaba con criterios de aceptación escritos y terminaba con tests y una comprobación nuestra en la interfaz. La IA debía señalar los posibles fallos como «posible error para revisión humana», no corregirlos por su cuenta. Durante casi todo el proyecto tampoco podía añadir casos a `Errores de la IA.md`: queríamos decidir nosotras qué era realmente un error relevante. Las interpretaciones de tarifas que propuso quedaron marcadas como pendientes hasta contrastarlas con la fuente oficial.

## 6. Cadena de datos y reproducibilidad

Queríamos que cualquier cifra pudiera seguirse hasta su origen:

> Fuente externa → adquisición → limpieza y alineación de fechas → cálculo → API → interfaz → tests → resultados.

Separamos tres tipos de información: **datos externos** (precios y tipos de cambio de Yahoo Finance, tarifas oficiales con URL y fecha), **cálculos derivados** (rentabilidad, CAGR, volatilidad, máxima caída, Sharpe y costes, hechos por funciones probadas) y **texto generado por IA**, que tras retirar el analista ya no existe en el producto.

La reproducibilidad se apoya en dependencias con versión fijada, el repositorio público, un script de experimentos que llama a la propia API con fechas fijas, hipótesis registradas antes de ejecutar, resultados guardados en CSV y JSON, y fuentes y limitaciones documentadas.

El detalle, con diagramas, está en `Cadena de datos y reproducibilidad.md`.

## 7. Investigación y experimentos

Escribimos las hipótesis antes de ejecutar los experimentos y no las cambiamos después. Usamos una cartera base ilustrativa (70 % iShares Core MSCI World y 30 % deuda pública euro, 10.000 € más 300 € al mes) con fechas fijas del 18/11/2016 al 18/11/2026. Comprobamos a mano en la interfaz las seis cifras principales antes de congelar los resultados.

| Exp. | Qué cambia | Qué encontramos |
|---|---|---|
| E1 | Intermediario | Con 242 compras pequeñas, la estructura de la tarifa pesó más que su apariencia: con ING, 772 € de costes; con una comisión fija de 20 € por operación internacional (Bankinter), 4.840 € solo en compras |
| E2 | Frecuencia (mismos 3.600 € al año) | Aportar cada mes dio +2.747 € antes de costes frente a hacerlo una vez al año, por el **momento de entrada** en un periodo alcista, no por los costes. Con ING la mensual pagó 677 € más y siguió por delante; con CaixaBank, de comisión fija alta, el orden se invirtió |
| E3 | Composición, frente al S&P 500 TR | La cartera concentrada en tres acciones españolas fue la más rentable (316,7 % frente al 282,0 % del índice), pero con más volatilidad y una caída del −34,4 %, y el Sharpe de las tres estrategias quedó casi empatado (0,82–0,86). Hay un fuerte sesgo de selección retrospectiva: no es una recomendación |
| E4 | Horizonte | De 10 a 5 años, el CAGR pasó del 9,26 % al 6,69 %, la peor caída del −25,6 % al −16,7 %, y el Sharpe frente al índice se invirtió (0,82 frente a 0,79; 0,65 frente a 0,675) |
| E5 | Rotación (**simulación hipotética**, no histórica: 5 % anual supuesto, sin custodia) | La misma rotación alta restó en 10 años un 2,5 % con MyInvestor, un 7,6 % con ING y un 37,3 % con Bankinter: el impacto depende casi por completo de la tarifa |

No todas las hipótesis se cumplieron: esperábamos que ninguna estrategia superara al índice, y la concentrada lo hizo; y nuestra hipótesis sobre la frecuencia era demasiado general. Lo dejamos escrito tal como salió.

## 8. Limitaciones y qué haríamos diferente

**Limitaciones del modelo financiero.** Aplicamos las tarifas de noviembre de 2026 a todo el periodo histórico. Algunas reglas son aproximaciones documentadas: la custodia de Santander es la tarifa máxima de su folleto y la elegibilidad de algunos ETF no es verificable públicamente. La custodia y el mantenimiento se restan sin coste de oportunidad, `yfinance` no es una API oficial, las estrategias ilustrativas tienen sesgo de selección y E5 es hipotético. Ningún resultado histórico es una predicción ni un consejo.

**Limitaciones del despliegue.** El servidor gratuito de Render tarda alrededor de un minuto en arrancar tras 15 minutos sin uso. En producción, News solo muestra los *feeds* del BCE y la Fed, porque Google News RSS no responde a las peticiones del servidor.

**Qué haríamos diferente.** Definiríamos la pregunta y los criterios de éxito antes de programar, y escribiríamos *acceptance tests* que puedan fallar antes de pedir código. Fijaríamos desde el principio la separación entre costes del producto y del intermediario, y la política de precios ajustados. Empezaríamos antes por las fuentes primarias y reduciríamos pronto el alcance. Y mediríamos el valor añadido de una funcionalidad generativa antes de integrarla, en lugar de después.

## Conclusión

En nuestras simulaciones, los costes de intermediación sí pueden cambiar de forma importante el resultado de una estrategia, pero «el coste» no se puede analizar aislado. Su efecto depende de la frecuencia de operativa, de la estructura de la tarifa, del horizonte, de la composición y del riesgo asumido. Con muchas operaciones pequeñas y comisiones fijas puede pesar más que la elección de cartera; en *buy & hold* con tarifas bajas, mucho menos.

Sobre el método, el aprendizaje principal no es que la IA haga aplicaciones rápido. Es que puede acelerar mucho la construcción y, a la vez, producir resultados plausibles pero conceptualmente incorrectos. Por eso hay que diseñar formas de cuestionarla, probarla y contrastarla con fuentes. Saber cambiar de dirección o descartar una funcionalidad construida también forma parte del control sobre la máquina.

## Fuentes principales

- CNMV, *Guía rápida: Fondos cotizados (ETF)*. https://www.cnmv.es/DocPortal/Publicaciones/Fichas/FondosCotizados(ETF).pdf
- Vanguard, *Vanguard S&P 500 ETF (VOO) Fact sheet*, datos a 30/09/2026. https://fund-docs.vanguard.com/F0968.pdf
- yfinance, `Ticker.history()`, parámetro `auto_adjust`. https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/history.py
- ESMA, *Costs and performance of EU retail investment products 2025* (03/03/2026). https://www.esma.europa.eu/press-news/esma-news/new-investment-funds-drive-reduction-costs-investors
- Barber, B. M. y Odean, T. (2000). «Trading Is Hazardous to Your Wealth». *The Journal of Finance*, 55(2), 773–806. https://doi.org/10.1111/0022-1082.00226
- Sharpe, W. F. (1994). «The Sharpe Ratio». *The Journal of Portfolio Management*, 21(1), 49–58. https://doi.org/10.3905/jpm.1994.409501
- Tarifas oficiales de cada intermediario, con URL y fecha de consulta, en `Datos y fuentes.md` del repositorio.
