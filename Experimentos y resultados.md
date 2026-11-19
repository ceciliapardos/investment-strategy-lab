# Experimentos y resultados

Registro de la investigación empírica de la Fase 9 (2026-11-19). Se usa **Investment Strategy Lab (V0.11) como instrumento**, sin modificar código ni interfaz.

> **Resultados de simulaciones históricas del proyecto, no evidencia predictiva del comportamiento futuro.** Ninguna estrategia ni intermediario de este documento es una recomendación.

**Pregunta de investigación** ([[Investigación principal]]):
> ¿Hasta qué punto los costes de intermediación y la frecuencia de operativa pueden cambiar la eficiencia real de una estrategia de inversión a largo plazo para un inversor minorista, una vez considerados rentabilidad, riesgo y benchmark, en simulaciones históricas?

---

## Validación metodológica y congelación (Fase 9.1, 2026-11-19)

### Estado de los experimentos (congelados)

| Experimento | Tipo | Estado |
|---|---|---|
| E1 · Intermediarios | Simulación histórica | **VALIDADO CON LIMITACIONES** (supuestos tarifarios de BBVA ETF, Revolut, Santander y CaixaBank; ver abajo) |
| E2 · Frecuencia de aportaciones | Simulación histórica | **VALIDADO CON LIMITACIONES** (signo del efecto de entrada propio del periodo; la aportación anual en Trade Republic no sería un plan) |
| E3 · Estrategias frente al benchmark | Simulación histórica | **VALIDADO CON LIMITACIONES** (sesgo de selección en C; Sharpe con rf = 0 %) |
| E4 · Horizonte | Simulación histórica | **VALIDADO** (dos periodos con el mismo final; limitaciones generales del backtest) |
| E5 · Sensibilidad a la rotación | Simulación **hipotética** | **HIPOTÉTICO** (rentabilidad constante supuesta del 5 %; sin custodia) |

- E1–E4 son **simulaciones históricas**; E5 es una **simulación hipotética de sensibilidad**. **Ninguna constituye una predicción.**
- Las hipótesis previas (§0.1) **no se han modificado**.
- No ha sido necesario repetir ningún experimento ni cambiar el código de cálculo: ningún supuesto revisado resultó incorrecto de forma que cambie E1.

### Supuestos materiales de E1 contrastados con fuentes oficiales (consulta del 19/11/2026)

| Supuesto | Fuente oficial consultada | Qué dice | Veredicto | ¿Cambia E1? |
|---|---|---|---|---|
| **BBVA · Tarifa ETF (0,15 %)** aplicada a `IWDA.AS` y `EUNH.DE` | bbva.es, «Inversión y trading…» y «Invertir en ETF» | «Solo 0,15 % por operación en ETF. Sin comisión mínima ni comisión de custodia. Elige entre una amplia selección de ETF de las principales gestoras». La lista concreta solo se ve tras iniciar sesión en la banca online | **No verificable con los datos disponibles.** iShares es una de las principales gestoras, pero no se puede confirmar que estos dos ETF estén en la selección | No se puede saber. Si no estuvieran, ese perfil **no sería aplicable** a esta estrategia (no se sustituye por otra tarifa inventada) |
| **Trade Republic:** aportaciones con plan de inversión sin comisión | Catálogo público `app.traderepublic.com` con el filtro «Plan de inversión»; ayuda oficial (support.traderepublic.com, leída por fragmentos del buscador porque redirige) | `IWDA` (IE00B4L5Y983, «Core MSCI World USD (Acc)») y `EUNH` (IE00B4WXJJ64, «Core Euro Gov Bond EUR (Dist)») aparecen como aptos para plan de inversión. La ayuda indica que la ejecución de planes **no tiene comisión** y que los intervalos son semanal, quincenal, mensual o trimestral, con ejecución los días 2 y 16 | **Confirmado** para mensual y trimestral. **Aproximación** en la fecha (la app usa el día 18) y en el centro de ejecución (Trade Republic no ejecuta en Ámsterdam ni en Xetra) | No en E1 (mensual). En E2, la **aportación anual no existe como plan**: serían órdenes de 1 € → +20 € en 10 años (0,02 % del valor). Irrelevante |
| **Revolut Estándar / Premium:** compras periódicas de ETF sin comisión; Premium con cuota | help.revolut.com/es-ES, «Las comisiones de trading de Revolut» y «Planes de inversión» | Las comisiones «no se aplicarán a las órdenes de compras periódicas o compras puntuales de ETP seleccionados» con planes de inversión; Estándar 0 órdenes gratis al mes, Premium 5; 1 € por orden extra; sin custodia. La lista de ETP elegibles solo está en la app | **Aproximación.** Las reglas coinciden con el modelo, pero no se puede verificar que `IWDA`/`EUNH` sean «ETP seleccionados». La cuota de Premium (9,99 €/mes) se imputa entera a la inversión, aunque el plan incluye otros servicios | No para Estándar si son elegibles. Si no lo fueran: 1 € por orden → hasta 242 € en E1 (0,3 %). El orden del grupo de bajo coste no cambiaría |
| **Santander:** custodia de 3.726,22 € | Folleto oficial de tarifas máximas (en vigor desde 10-02-2025, apdo. 2.1) y web «Tarifas» | El folleto fija, «por cada clase de valor», un 1,00 % anual (mínimo 60 €) para valores negociables en mercados extranjeros, sobre la «media de los saldos efectivos diarios», prorrateado. La web comercial publica la compraventa (20 € por operación internacional ≤ 15.000 €, **confirmado**), pero **no** publica la custodia | **Aproximación (cota superior):** es la tarifa **máxima** registrada, no necesariamente la que se cobra a cada cliente | La custodia puede estar **sobrevalorada**. Aun sin custodia, Santander tendría 4.840 € en compras (5,7 % del valor bruto): sigue en el grupo de coste alto |
| **CaixaBank:** solo el mínimo de custodia (600,16 €) | caixabank.es, «Tarifas» de Bolsa y mercados | Renta variable (acciones, ETF y warrants): 0,40 % semestral internacional, mínimo 15 €, **calculado «sobre el importe nominal»** | **Aproximación justificada:** la base (nominal) no está disponible en los datos de mercado y en los ETF suele ser muy pequeña frente al valor de mercado, así que aplicar el mínimo por clase y semestre es la estimación defendible | Pequeño. Las compras (8.712 €) explican el 94 % de sus costes |

### Custodia y mantenimiento sin coste de oportunidad — decisión **B** (no se modifica el motor)

- **Qué pasa:** `analytics/costs.py` resta la custodia y el mantenimiento del valor final, sin descontarlos de la cartera durante el periodo. El dinero de esas comisiones no deja de crecer en la simulación. Las comisiones de compra sí incluyen el crecimiento perdido.
- **Por qué no se corrige ahora:**
  - habría que vender participaciones o crear un saldo de efectivo en cada fecha de cobro;
  - eso cambia la simulación de la cartera, su TWR y su coherencia con Strategy Comparison, y obliga a revisar los tests del motor aprobado en la Fase 5;
  - la complejidad es desproporcionada para lo que cambiaría.
- **Orden de magnitud (estimación propia, no calculada por la app):**
  - si la custodia se pagara de forma uniforme durante 10 años con un crecimiento del 9,3 % anual (CAGR de BASE), el crecimiento perdido sería como mucho de un **60 % de la custodia pagada**;
  - en la realidad la custodia se concentra en los últimos años (la cartera crece), así que probablemente sería menos;
  - por ejemplo, Santander: hasta unos +2.200 € de impacto sobre 10.799 €.
- **Conclusión:** los escenarios con custodia elevada **pueden infravalorar el impacto económico real** de esos costes, sin cambiar el orden de los grupos de coste ni las conclusiones de E1–E4.

### Cost Sensitivity: denominación revisada
- El texto visible pasa a «**Sensibilidad a costes de operativa (rotación)**».
- Se aclara en la nota y en el ⓘ que, del intermediario, solo usa las comisiones de compraventa y de divisa, y que **la custodia de su tarifa no se incluye** (Cost Analysis sí la incluye).
- No cambia el cálculo.

### Grado de certeza de las cifras principales (para la presentación)

- **ALTA:** fuente y metodología suficientemente verificadas.
- **MEDIA:** depende de una aproximación documentada.
- **BAJA:** no usar como cifra principal.

| Cifra o hallazgo | Exp. | Certeza | Motivo |
|---|---|---|---|
| ING, aportación mensual: 772 € de costes y 83.395 € netos (impacto del 2,5 % de lo aportado) | E1 | **ALTA** | Tarifa oficial de ING (PDF de 10/2026) y cálculo verificable |
| Bankinter: 242 × 20 € = 4.840 € en compras | E1 | **ALTA** | Tarifa oficial verificada; operación aritmética directa |
| CaixaBank: 242 × 36 € = 8.712 € en compras | E1 | **ALTA** (compras) / **MEDIA** (custodia) | Compraventa oficial; custodia estimada con el mínimo |
| Santander: impacto de 10.799 € | E1 | **MEDIA** | Incluye la custodia **máxima** (cota superior) |
| Rango de impacto «4 € – 13.331 €» según el intermediario | E1 | **MEDIA** | El extremo bajo depende de la elegibilidad de los ETF en Trade Republic y Revolut (Trade Republic confirmada, Revolut no verificable) |
| BBVA ETF: 69 € | E1 | **BAJA** | Elegibilidad de los ETF no verificable |
| Revolut Premium: 1.199 € (cuota del plan) | E1 | **MEDIA** | Toda la cuota imputada a la inversión |
| Efecto del momento de entrada, mensual frente a anual: +2.747 € | E2 | **ALTA** (como cifra del periodo) | Calculado sin costes con precios reales. Su signo es propio de 2016–2026 |
| ING: efecto de costes −677 € frente a +2.747 € de entrada | E2 | **ALTA** | Tarifa oficial |
| CaixaBank: efecto de costes −11.574 € (la frecuencia se invierte) | E2 | **ALTA** en el sentido / **MEDIA** en la cifra exacta | Las compras dominan; custodia estimada |
| Métricas de A, B, C y benchmark (CAGR, volatilidad, máxima caída, Sharpe) | E3 | **ALTA** | Metodología probada y datos de mercado; Sharpe con rf = 0 % declarado |
| «C superó al S&P 500 TR» | E3 | **ALTA** como dato / con advertencia | El dato es correcto, pero no debe presentarse sin el sesgo de selección |
| Sharpe de BASE frente al índice: 0,82/0,79 (10 años) frente a 0,65/0,675 (5 años) | E4 | **ALTA** | Mismas fuentes y metodología; diferencias pequeñas, presentarlas como tales |
| CAGR 9,26 % → 6,69 % y máxima caída −25,6 % → −16,7 % | E4 | **ALTA** | Ídem |
| Rotación alta: −2,5 % (MyInvestor), −7,6 % (ING), −37,3 % (Bankinter) | E5 | **MEDIA** | Comisiones oficiales, pero escenario **hipotético** (5 % constante, sin custodia). Presentar siempre como hipotético |

---

## 0. Diseño común

### 0.1 Hipótesis previas (registradas ANTES de ejecutar)

Esta sección se escribió y guardó antes de lanzar ningún experimento. No se ha modificado después. Los resultados se contrastan con ella en cada experimento.

- **H-E1 (intermediarios).** Con la misma estrategia y aportaciones mensuales a dos ETF, la dispersión de costes entre intermediarios será grande y dependerá sobre todo de la **estructura** de la tarifa:
  - en los perfiles con comisión fija alta por operación internacional, los costes acumulados superarán el 5 % del valor final;
  - en los brokers digitales serán inferiores al 1 %.
  - *Se refuta si* la dispersión es pequeña (todos por debajo del 2 %) o si el orden no se explica por la estructura de la tarifa.
- **H-E2 (frecuencia).** Con el mismo intermediario y la misma cantidad anual:
  - la aportación mensual tendrá más compras y más comisiones que la trimestral y la anual;
  - la diferencia de valor final **antes de costes** (efecto del momento de entrada) puede ser del mismo orden o mayor que la diferencia de comisiones, y no anticipamos su signo.
  - *Se refuta si* la diferencia de comisiones domina claramente sobre el efecto del momento de entrada.
- **H-E3 (estrategias y benchmark).**
  - La estrategia concentrada en tres acciones españolas tendrá mayor volatilidad y mayor máxima caída que la global y la mixta.
  - La mixta 60/40 tendrá la menor volatilidad, pero no necesariamente el mayor Sharpe.
  - Ninguna de las tres superará al S&P 500 TR en rentabilidad acumulada en el periodo.
  - *Cada parte se refuta por separado* con los datos.
- **H-E4 (horizonte).**
  - Las métricas de la misma estrategia (CAGR, volatilidad, máxima caída, Sharpe) cambiarán de forma apreciable entre 5 y 10 años;
  - la lectura frente al benchmark también puede cambiar;
  - el coste de intermediación en % de lo aportado será parecido en ambos horizontes, porque la tarifa y la frecuencia son las mismas.
- **H-E5 (rotación).**
  - En la simulación de sensibilidad, la diferencia frente a «sin costes» crecerá con la rotación;
  - con rotación alta superará claramente a la de comprar y mantener;
  - el orden de magnitud dependerá del intermediario.

### 0.2 Estrategias (definidas antes de ejecutar)

**Activos** (todos cotizan en euros, así que no hay efecto divisa en el backtest):

| Ticker | Qué es | Histórico diario disponible (consultado el 19/11/2026) |
|---|---|---|
| `IWDA.AS` | iShares Core MSCI World UCITS ETF (Acc), Euronext Ámsterdam | desde 25/09/2009 |
| `EUNH.DE` | iShares Core € Govt Bond UCITS ETF (Dist), Xetra | desde 17/04/2009 |
| `SAN.MC`, `ITX.MC`, `IBE.MC` | Banco Santander, Inditex e Iberdrola, Bolsa de Madrid | desde 2000–2002 |

**Estrategias:**

| Id | Estrategia | Composición | Por qué sirve |
|---|---|---|---|
| **BASE** | Cartera global 70/30 | 70 % `IWDA.AS` + 30 % `EUNH.DE` | Cartera sencilla y diversificada (renta variable global + deuda pública euro), con más de 10 años de datos. Base de E1, E2 y E4 |
| **A** | Global 100 % renta variable | 100 % `IWDA.AS` | Máxima diversificación geográfica en renta variable |
| **B** | Mixta 60/40 | 60 % `IWDA.AS` + 40 % `EUNH.DE` | Menos exposición a renta variable |
| **C** | Concentrada España | 33,34 % `SAN.MC` + 33,33 % `ITX.MC` + 33,33 % `IBE.MC` | Alta concentración en tres empresas de un país y de tres sectores |

- Las estrategias son **ilustrativas y no recomendaciones**.
- Se eligieron por histórico suficiente y por diferencias claras de concentración y exposición, **sin mirar antes sus resultados**.

### 0.3 Parámetros comunes

- **Periodo principal:** fechas fijas del **18/11/2016 al 18/11/2026** (10 años).
  - Fechas fijas en lugar del botón «10A» para que el escenario sea repetible: el botón usa «hoy».
  - Se termina el 18/11 porque el S&P 500 TR aún no tenía el cierre del 19/11 al ejecutar.
- **Periodo corto (E4):** del 18/11/2021 al 18/11/2026.
- **Capital inicial:** 10.000 €.
- **Aportación de referencia:** 3.600 € al año, repartidos 70/30 entre `IWDA.AS` y `EUNH.DE`:
  - mensual: 210 € + 90 €;
  - trimestral: 630 € + 270 €;
  - anual: 2.520 € + 1.080 €.
  
  Cada aportación es una compra por activo: con aportación mensual, **2 órdenes al mes**.
- **Benchmark:** S&P 500 Total Return (`^SP500TR`, convertido a euros).
  - Se descarta el MSCI World porque su proxy es `IWDA.AS`: coincidiría exactamente con la estrategia A.
- **Intermediario principal** (E2, E4 y E5): **ING · Broker Naranja**. Se eligió antes de ver resultados por ser un bróker muy usado en España con una tarifa mixta (fija + %), que permite ver tanto el efecto del número de órdenes como el del importe.
- **Metodología:** la de la app (buy & hold, precios ajustados, fechas comunes, TWR, TER ya en el precio; ver [[Decisiones]] D35–D58).

### 0.4 Cómo se ejecutan

- Script reproducible `Resultados investigación/experimentos.py`. Llama a la **API existente** de la app en marcha; no añade lógica de cálculo:
  - `POST /api/comparison/backtest`;
  - `POST /api/costs/analyze`;
  - `POST /api/costs/sensitivity`.
- Guarda las respuestas en `Resultados investigación/` (JSON completos y CSV resumidos).
- Origen de cada cifra: [[Cadena de datos y reproducibilidad]] (cadenas A–E).
- Las mismas configuraciones pueden reproducirse a mano en la interfaz (ver «Reproducibilidad» de cada experimento).

### 0.5 Cómo leer las cifras de coste

| Cifra de la app | Significado |
|---|---|
| **Valor bruto** | Valor final **antes** de costes de intermediación (escenario «sin costes»). Ya es neto de TER |
| **Costes durante** | Suma pagada en compras, cambio de divisa, custodia y mantenimiento |
| **Impacto** | Valor bruto − valor neto. En las **comisiones de compra** incluye el crecimiento perdido: el dinero de la comisión no se invierte. En **custodia y mantenimiento**, el motor los resta al final sin coste de oportunidad (`analytics/costs.py`), así que el impacto real de esos conceptos está ligeramente infravalorado |
| **Salida estimada** | Coste de vender todo al final; va aparte y no se incluye en el impacto |

**Descomposición usada en E2 (exacta):**
- valor neto A − valor neto B = (valor bruto A − valor bruto B) − (impacto A − impacto B);
- el primer término es el **efecto del momento de entrada / mercado**; el segundo, el **efecto de los costes**.

---

## Experimento 1 — Misma estrategia, distintos intermediarios

> **Estado: VALIDADO CON LIMITACIONES** · simulación histórica (Fase 9.1).

**Pregunta concreta.** Con la misma cartera, las mismas aportaciones y el mismo periodo, ¿cuánto cambia el resultado según el perfil tarifario?

**Hipótesis previa:** H-E1 (§0.1).

**Variables controladas:**
- estrategia BASE 70/30;
- capital 10.000 €;
- aportación mensual de 300 € (210 € + 90 €);
- periodo del 18/11/2016 al 18/11/2026;
- precios, metodología y dataset de tarifas (versión 2026-11-12b).

**Variable independiente:** intermediario. Los 10 perfiles, más «sin costes» como referencia.

**Métricas observadas:** costes por tipo, costes totales, impacto en € y en % de lo aportado, valor neto, número de compras y salida estimada.

**Configuración exacta:**
- `POST /api/costs/analyze`, estrategia `base_mensual`, `start=2016-11-18`, `end=2026-11-18`;
- **aportado total:** 46.000 € (10.000 € + 120 meses × 300 €);
- **compras:** 2 iniciales + 240 periódicas (2 por mes);
- todos los perfiles cubren ambos ETF (`completo = True`).

### Resultado

Valor bruto común a todos: **84.540,67 €**.

| Intermediario | Compras | Custodia | Mantenimiento | **Costes durante** | **Impacto** | Impacto / aportado | Costes / valor bruto | **Valor neto** | Salida estimada |
|---|---|---|---|---|---|---|---|---|---|
| Sin costes | 0 | 0 | 0 | 0 | 0 | 0 % | 0 % | 84.540,67 | 0 |
| Santander · online ⚠ | 4.840,00 | 3.726,22 (tarifa máxima) | 0 | **8.566,22** | **10.799,06** | 23,5 % | 10,1 % | **73.741,61** | 253,05 |
| CaixaBank · estándar ⚠ | 8.712,00 | 600,16 (solo mínimo) | 0 | **9.312,16** | **13.331,27** | 29,0 % | 11,0 % | **71.209,40** | 192,94 |
| Bankinter · estándar | 4.840,00 | 734,98 | 0 | **5.574,98** | **7.807,82** | 17,0 % | 6,6 % | **76.732,85** | 153,17 |
| ING · Broker Naranja | 772,00 | 0 | 0 | **772,00** | **1.145,47** | 2,5 % | 0,9 % | **83.395,20** | 89,40 |
| BBVA · Tarifa ETF ⚠ | 69,00 | 0 | 0 | **69,00** | **126,81** | 0,3 % | 0,1 % | **84.413,86** | 126,62 |
| BBVA · joven | 239,58 | 0 | 0 | **239,58** | **350,11** | 0,8 % | 0,3 % | **84.190,56** | 1,98 |
| MyInvestor | 252,00 | 0 | 0 | **252,00** | **379,40** | 0,8 % | 0,3 % | **84.161,27** | 40,69 |
| Trade Republic ⚠ | 2,00 | 0 | 0 | **2,00** | **4,10** | 0,01 % | 0,002 % | **84.536,57** | 2,00 |
| Revolut · Estándar ⚠ | 2,00 | 0 | 0 | **2,00** | **4,10** | 0,01 % | 0,002 % | **84.536,57** | 2,00 |
| Revolut · Premium | 0 | 0 | 1.199,13 (cuota del plan) | **1.199,13** | **1.199,13** | 2,6 % | 1,4 % | **83.341,54** | 2,00 |

⚠ = supuestos que condicionan el resultado (ver «Limitaciones»).

**⭐ CANDIDATO PPT** — barras horizontales del **impacto en €** por intermediario, con el eje desde 0 y sin ordenar como ranking (orden del selector de la app), más una línea de referencia en «sin costes». Datos en `e1_e2_costes_10a.csv`.

### Interpretación
- **Dispersión alta.** El valor neto va de 71.209 € a 84.537 €: **13.327 € de diferencia** (15,8 % del valor bruto) con la misma estrategia, el mismo dinero y el mismo periodo.
- **La estructura de la tarifa explica el orden:**
  - Con 242 compras de importe pequeño (210 € y 90 €), una comisión **fija por operación internacional** domina: 20 € en Santander y Bankinter, 36 € en CaixaBank. 242 × 20 € = 4.840 €.
  - Una comisión **porcentual sin mínimo alto** apenas pesa: BBVA ETF, MyInvestor, BBVA joven.
  - **Los planes de inversión sin comisión** (Trade Republic, Revolut Estándar) dejan el coste en las dos compras iniciales.
- **La custodia** es el segundo factor en los bancos: en Santander, con la tarifa **máxima**, supone 3.726 €.
- **Una cuota fija de plan** (Revolut Premium) cuesta lo mismo con 240 operaciones o con 20.
- **Contraste con H-E1:**
  - se cumple en los perfiles con comisión fija internacional (6,6 % a 11,0 % del valor bruto, más del 5 % previsto);
  - se cumple en casi todos los brokers digitales (menos del 1 %);
  - **excepción:** Revolut Premium (1,4 %), por su cuota fija. H-E1 no la anticipaba.

- **¿Cambia el orden con otro escenario?** Se comprobó en los mismos JSON con E2 (otras frecuencias) y E3 (buy & hold, otras carteras):
  - el orden **intermedio** sí cambia: Revolut Premium pasa de 7.º con aportación mensual a 9.º sin aportaciones; CaixaBank y Santander se intercambian; con la cartera de acciones españolas (C), CaixaBank resulta más barato que ING;
  - los perfiles de **menor** impacto (Trade Republic y Revolut Estándar, con BBVA joven empatado en buy & hold) fueron los mismos en todos los escenarios probados.

**⭐ CANDIDATO BITÁCORA** — «Con aportaciones mensuales pequeñas, lo que determina el coste no es el nivel aparente de la tarifa sino su **estructura** (fija por operación, porcentual, plan sin comisión o cuota): la misma estrategia pierde entre 4 € y 13.331 € según el perfil, en este periodo».

### Relación con la pregunta
- Responde directamente a «hasta qué punto los costes de intermediación pueden cambiar el resultado»: en este escenario, **mucho o casi nada según el intermediario**.
- No mide el riesgo, que no cambia con el intermediario (E3 y E4).

### Limitaciones
- **Tarifas consultadas el 12/11/2026** y aplicadas a todo el periodo desde 2016. Las tarifas reales de 2016–2025 pudieron ser otras.
- **Supuestos del dataset** ([[Datos y fuentes]] §7, D57 ⏳):
  - Santander: custodia **máxima** del folleto;
  - CaixaBank: solo el **mínimo** de custodia (se calcula sobre el nominal);
  - BBVA ETF: no se comprueba que `IWDA.AS` y `EUNH.DE` estén en la selección de BBVA;
  - Trade Republic y Revolut: se supone que ambos ETF admiten planes de inversión sin comisión.
- **Custodia y mantenimiento** se restan sin coste de oportunidad (§0.5).
- **No incluye** impuestos, cánones de bolsa ni spreads.
- **No es un ranking de intermediarios:** otra estrategia, otro tamaño de aportación u otro mercado cambiaría el orden.

### Reproducibilidad
- **Script:** `python "Resultados investigación/experimentos.py"`, con el backend arrancado. Salida en `e1_e2_costes_10a.json` y `.csv`, filas «BASE 70/30 · mensual 300 €».
- **En la interfaz:**
  1. Strategy Builder: crea BASE con 10.000 €, `IWDA.AS` 70 % y `EUNH.DE` 30 %, y aportaciones mensuales de 210 € a `IWDA.AS` y 90 € a `EUNH.DE`.
  2. Cost Analysis: fechas personalizadas del 18/11/2016 al 18/11/2026; tabla «una estrategia bajo todos los intermediarios».
- **Cadena de datos:** cadenas A (precios), C (ventana común y aportaciones) y D (tarifas y motor de costes) en [[Cadena de datos y reproducibilidad]].

---

## Experimento 2 — Frecuencia de aportaciones (misma cantidad anual)

> **Estado: VALIDADO CON LIMITACIONES** · simulación histórica (Fase 9.1).

**Pregunta concreta.** Con la misma cantidad anual (3.600 €), ¿cómo cambian las compras, los costes y el resultado al aportar cada mes, cada trimestre o cada año? ¿Qué parte de la diferencia se debe a las comisiones y qué parte al momento en que entra el dinero?

**Hipótesis previa:** H-E2 (§0.1).

**Variables controladas:**
- estrategia BASE 70/30;
- capital 10.000 €;
- 3.600 € al año repartidos 70/30;
- periodo del 18/11/2016 al 18/11/2026;
- intermediario principal ING;
- precios y metodología.

**Variable independiente:** frecuencia de la aportación (mensual 300 €, trimestral 900 €, anual 3.600 €).

**Métricas observadas:** número de compras, aportado total, valor bruto, TWR, costes, impacto y valor neto.

**Configuración exacta:**
- estrategias `base_mensual`, `base_trimestral` y `base_anual`;
- `POST /api/costs/analyze` y `POST /api/comparison/backtest` (benchmark `sp500tr`);
- primera aportación: 19/12/2016 (mensual), 20/02/2017 (trimestral) y 20/11/2017 (anual). Según D52, la primera aportación llega un periodo después del inicio, en el siguiente día con mercado;
- **aportado total idéntico:** 46.000 € en los tres casos (36.000 € de aportaciones).

### Resultado (intermediario principal: ING)

| Frecuencia | Compras periódicas | Valor bruto | TWR | Costes (compras + custodia) | Impacto | **Valor neto** |
|---|---|---|---|---|---|---|
| Mensual 300 € | 240 | 84.540,67 | 142,37 % | 772,00 + 0 | 1.145,47 | **83.395,20** |
| Trimestral 900 € | 80 | 83.741,65 | 142,22 % | 292,00 + 0 | 441,78 | **83.299,87** |
| Anual 3.600 € | 20 | 81.793,44 | 142,04 % | 112,00 + 290,40 | 468,61 | **81.324,83** |

**Descomposición, mensual frente a anual (ING):**
- **efecto del momento de entrada** (diferencia de valor bruto): **+2.747,23 €** a favor de la mensual;
- **efecto de los costes** (diferencia de impacto): **−676,86 €** en contra de la mensual;
- **diferencia neta:** **+2.070,37 €** a favor de la mensual.

**Mismo ejercicio con otros intermediarios** (complementario; misma estrategia y mismos datos):

| Intermediario | Valor neto mensual | Valor neto trimestral | Valor neto anual | Efecto costes, mensual frente a anual (Δ impacto) |
|---|---|---|---|---|
| ING | 83.395,20 | 83.299,87 | 81.324,83 | −676,86 |
| MyInvestor | 84.161,27 | 83.596,54 | 81.695,29 | −281,25 |
| Bankinter | 76.732,85 | **80.591,37** | 80.413,80 | −6.428,18 |
| CaixaBank | 71.209,40 | 78.844,98 | **80.036,22** | −11.574,05 |
| Trade Republic | 84.536,57 | 83.737,55 | 81.789,34 | 0 |

**⭐ CANDIDATO PPT** — barras apiladas del efecto del momento de entrada (+2.747 €, igual para todos) frente al efecto de costes de cada intermediario (ING −677 €, CaixaBank −11.574 €). Muestran que **el signo del resultado neto cambia según la tarifa**. Datos en `e1_e2_costes_10a.csv`.

### Interpretación
- **Momento de entrada.**
  - La TWR es casi idéntica (142,0–142,4 %): la cartera se comportó igual.
  - La diferencia de valor bruto (2.747 €) existe porque, con aportación mensual, el dinero entra de media antes. En un periodo mayoritariamente alcista eso favoreció a la mensual.
  - **No es un efecto de las comisiones** y en otro periodo podría tener el signo contrario.
- **Comisiones.**
  - Con ING, aportar cada mes multiplica las compras (240 frente a 20), pero el coste extra (+660 € en compras) se compensa en parte: con aportación anual hay trimestres sin operaciones y ING cobra **custodia** (290,40 €).
  - El efecto neto de costes es pequeño (−677 €) frente al de entrada (+2.747 €).
- **Depende del intermediario:**
  - con comisión fija alta por operación (CaixaBank 36 €, Bankinter 20 €), el efecto de costes **supera** al de entrada y la frecuencia mensual queda la última en valor neto;
  - en Bankinter el mejor valor neto es el trimestral; en CaixaBank, el anual.
- **Contraste con H-E2:**
  - **se cumple** que la mensual tiene más compras y, salvo por la custodia de ING, más comisiones;
  - **se cumple con ING** (y MyInvestor y Trade Republic) que el efecto de entrada es mayor que el de comisiones;
  - **no se cumple** con CaixaBank y Bankinter, donde dominan las comisiones. La hipótesis era demasiado general: el resultado depende de la estructura de la tarifa.

**⭐ CANDIDATO BITÁCORA** — «La frecuencia de operativa no tiene un efecto único. Con la misma cantidad anual, aportar cada mes fue mejor con brokers de comisión baja (por el momento de entrada en un mercado alcista) y peor con tarifas de comisión fija alta (por las comisiones). Separar el efecto de mercado del efecto de costes evita atribuir a las comisiones lo que es timing».

### Relación con la pregunta
- Es el experimento que mejor responde a «frecuencia de operativa». La frecuencia importa a través de la estructura de costes, y su efecto se mezcla con el momento de entrada en el mercado.

### Limitaciones
- **Signo del efecto de entrada:** se debe a este periodo, mayoritariamente alcista. No se puede generalizar.
- **Calendario de aportaciones:** la primera aportación llega un periodo después del inicio (D52), así que la aportación anual empieza 11 meses más tarde que la mensual. Es parte del efecto de entrada.
- **Tarifas:** las mismas que en E1, con sus supuestos.
- **Vista individual:** cada aportación es una compra por activo, así que las órdenes por aportación se duplican (2 ETF).

### Reproducibilidad
- **Script:** salida en `e1_e2_costes_10a.csv` y `e2_metricas_10a.csv`.
- **En la interfaz:**
  1. Duplica BASE dos veces en el Strategy Builder y cambia las aportaciones a trimestral (630 € + 270 €) y anual (2.520 € + 1.080 €).
  2. Compara las tres en Strategy Comparison y Cost Analysis con las mismas fechas.
- **Cadena de datos:** cadenas C (calendario de aportaciones, `portfolio.contribution_flows`) y D.

---

## Experimento 3 — Estrategias diferentes frente al mismo benchmark

> **Estado: VALIDADO CON LIMITACIONES** · simulación histórica (Fase 9.1).

**Pregunta concreta.** Con el mismo periodo y el mismo benchmark, ¿qué añade mirar riesgo y rentabilidad ajustada al riesgo en lugar de solo rentabilidad?

**Hipótesis previa:** H-E3 (§0.1).

**Variables controladas:**
- periodo del 18/11/2016 al 18/11/2026;
- capital 10.000 €, sin aportaciones (buy & hold puro);
- benchmark S&P 500 TR en EUR;
- metodología.

**Variable independiente:** composición de la estrategia (A, B o C).

**Métricas observadas:** valor final, rentabilidad total, CAGR, volatilidad, máxima caída, Sharpe (rf 0 %) y benchmark. Además, costes con ING.

**Configuración exacta:**
- `POST /api/comparison/backtest` con A, B y C en la **misma petición**, `benchmark=sp500tr`;
- ventana común efectiva del 18/11/2016 al 18/11/2026, con 2.540 sesiones comunes a Ámsterdam, Xetra y Madrid.

### Resultado

| Estrategia | Valor final | Rentabilidad total | CAGR | Volatilidad | Máxima caída (fechas) | Sharpe (rf 0 %) |
|---|---|---|---|---|---|---|
| A · Global 100 % RV | 31.433 € | 214,3 % | 12,14 % | 15,02 % | −33,6 % (19/02 → 23/03/2020) | 0,83 |
| B · Mixta 60/40 | 22.703 € | 127,0 % | 8,55 % | 10,65 % | −23,1 % (19/02 → 23/03/2020) | 0,82 |
| C · Concentrada España | 41.673 € | 316,7 % | 15,34 % | 18,42 % | −34,4 % (19/02 → 16/03/2020) | 0,86 |
| *Benchmark S&P 500 TR (EUR)* | — | 282,0 % | 14,34 % | 19,39 % | −33,2 % (19/02 → 23/03/2020) | 0,79 |

**Costes buy & hold con ING** (complementario): A 204 € (custodia 191 €), B 399 € (custodia 383 €) y C 593 € (custodia 574 €).
- Sin aportaciones hay trimestres sin operaciones, y ING cobra custodia **por cada valor**.
- Por eso el coste crece con el número de activos: impacto del 2,3 %, 4,2 % y 6,5 % del capital.

**⭐ CANDIDATO PPT** — tabla rentabilidad / volatilidad / máxima caída / Sharpe de A, B, C y benchmark, o un gráfico de dispersión rentabilidad (CAGR) frente a volatilidad con los cuatro puntos. Datos en `e3_metricas_10a.csv`.

### Interpretación
- **Rentabilidad y riesgo.**
  - Durante este periodo, C obtuvo la mayor rentabilidad (316,7 %), pero también tuvo la mayor volatilidad de las tres estrategias (18,4 %) y la mayor caída (−34,4 %).
  - B obtuvo la menor rentabilidad (127,0 %) con la menor volatilidad (10,7 %) y una caída claramente menor (−23,1 %).
- **Sharpe.**
  - Los ratios de las tres estrategias quedan muy juntos (0,82–0,86) y por encima del benchmark (0,79).
  - En este periodo, las diferencias de rentabilidad se explican sobre todo por **cuánto riesgo se asumió**, no por una eficiencia muy distinta por unidad de riesgo.
- **Benchmark.**
  - A y B quedaron por debajo del S&P 500 TR en rentabilidad total; C quedó por encima.
  - Las tres tuvieron menor volatilidad que el benchmark y un Sharpe algo mayor.
- **Contraste con H-E3:**
  - **C más volátil y con mayor caída que A y B:** se cumple, aunque la caída de C (−34,4 %) es casi igual a la de A (−33,6 %);
  - **B con la menor volatilidad:** se cumple;
  - **B sin necesariamente el mayor Sharpe:** se cumple (tiene el menor, aunque por poco);
  - **«Ninguna supera al S&P 500 TR»:** **no se cumple**. C lo superó en rentabilidad total.

**⭐ CANDIDATO BITÁCORA** — «La rentabilidad sola no ordena las estrategias. Durante 2016–2026, la cartera concentrada en tres acciones obtuvo más rentabilidad, pero con más volatilidad y caídas similares a las de la global. En rentabilidad ajustada al riesgo, las tres quedaron casi empatadas».

### Relación con la pregunta
- Muestra que la «eficiencia real» necesita riesgo y benchmark.
- Muestra también que, en buy & hold sin aportaciones, el coste de intermediación con ING (204–593 €, entre el 0,6 % y el 1,8 % del valor final, casi todo custodia) es pequeño frente a las diferencias de rentabilidad entre estrategias (más de 19.000 € entre B y C).

### Limitaciones
- **Sesgo de selección en C:** son tres grandes empresas españolas que hoy conocemos como supervivientes y líderes. Su resultado **no** describe el riesgo de concentrarse en tres acciones elegidas en 2016 sin saber el futuro.
- **Riesgo antes de costes:** las métricas se calculan antes de costes de intermediación.
- **Sharpe con rf = 0 %:** con un tipo libre de riesgo positivo, todos los Sharpe serían menores.
- **Benchmark:** un índice de EE. UU. convertido a euros; no es la referencia natural de B ni de C.
- **Un solo periodo:** ver E4.
- **Calendario común:** las tres estrategias comparten la intersección de calendarios (2.540 sesiones frente a 2.541 en E4). Sus métricas pueden diferir mínimamente de un cálculo con cada estrategia por separado.

### Reproducibilidad
- **Script:** salida en `e3_backtest_10a.json`, `e3_metricas_10a.csv` y `e3_costes_10a.csv`.
- **En la interfaz:**
  1. Crea A, B y C en el Strategy Builder.
  2. En Strategy Comparison: fechas personalizadas del 18/11/2016 al 18/11/2026 y referencia «S&P 500 (Total Return)».
- **Cadena de datos:** cadenas A, B (métricas), C y E (benchmark).

---

## Experimento 4 — Efecto del horizonte (5 frente a 10 años)

> **Estado: VALIDADO** · simulación histórica (Fase 9.1).

**Pregunta concreta.** ¿Cambia la lectura de la misma estrategia si el periodo es de 5 o de 10 años?

**Hipótesis previa:** H-E4 (§0.1).

**Variables controladas:**
- estrategia BASE 70/30;
- 10.000 € más 300 €/mes;
- intermediario ING;
- benchmark S&P 500 TR;
- metodología.

**Variable independiente:** periodo, del 18/11/2016 o del 18/11/2021 hasta el 18/11/2026.

**Métricas observadas:** valor, TWR, CAGR, volatilidad, máxima caída, Sharpe, costes y benchmark.

**Configuración exacta:**
- `POST /api/comparison/backtest` con `base_mensual` y `base_sin_aport`, mismos activos y calendario;
- `POST /api/costs/analyze` con las mismas estrategias y fechas.

### Resultado (BASE con aportación mensual)

| Métrica | 10 años (2016–2026) | 5 años (2021–2026) |
|---|---|---|
| Aportado total | 46.000 € | 28.000 € |
| Valor final bruto | 84.541 € | 37.301 € |
| Rentabilidad total (TWR) | 142,4 % | 38,3 % |
| CAGR | 9,26 % | 6,69 % |
| Volatilidad | 11,51 % | 10,75 % |
| Máxima caída | −25,6 % (19/02 → 23/03/2020) | −16,7 % (10/02 → 09/04/2025) |
| Sharpe (rf 0 %) | **0,82** | **0,65** |
| *Benchmark CAGR* | 14,34 % | 11,47 % |
| *Benchmark volatilidad* | 19,39 % | 18,79 % |
| *Benchmark máxima caída* | −33,2 % | −22,3 % |
| *Benchmark Sharpe* | **0,79** | **0,675** |
| Costes ING (compras) | 772 € (240 compras) | 394 € (120 compras) |
| Impacto ING / aportado | 2,49 % | 1,72 % |
| Costes ING / valor bruto | 0,91 % | 1,06 % |

Sin aportaciones (complementario):
- **10 años:** CAGR 9,55 %, Sharpe 0,83, máxima caída −26,0 %; con ING, impacto del 4,2 % del capital (custodia 383 €).
- **5 años:** CAGR 6,87 %, Sharpe 0,66; impacto del 2,1 %.

**⭐ CANDIDATO PPT** — tabla 10 frente a 5 años con el Sharpe de la estrategia y del benchmark resaltado: la comparación ajustada al riesgo **se invierte** con el periodo. Datos en `e4_metricas_10a.csv` y `e4_metricas_5a.csv`.

### Interpretación
- **Métricas de la misma estrategia:** cambian de forma apreciable. CAGR de 9,3 % frente a 6,7 %, máxima caída de −25,6 % (COVID-19) frente a −16,7 % (2025), Sharpe de 0,82 frente a 0,65.
- **Frente al benchmark:**
  - en ambos periodos BASE tuvo menos rentabilidad que el S&P 500 TR (unos 5 puntos de CAGR menos) y menos volatilidad;
  - en Sharpe, BASE quedó **por encima** a 10 años (0,82 frente a 0,79) y **por debajo** a 5 años (0,65 frente a 0,675).
  
  Cambiar solo el periodo invierte la conclusión ajustada al riesgo frente al benchmark.
- **Costes:**
  - en % del valor final son parecidos (0,9 % y 1,1 %);
  - en % de lo aportado, el impacto es mayor a 10 años (2,5 % frente a 1,7 %), porque el dinero de las comisiones deja de crecer durante más tiempo.
- **Contraste con H-E4:**
  - **cambio apreciable de métricas:** se cumple;
  - **la lectura frente al benchmark puede cambiar:** se cumple, en el Sharpe;
  - **coste en % parecido:** se cumple medido sobre el valor final, pero no sobre lo aportado, donde se nota el efecto acumulado.

**⭐ CANDIDATO BITÁCORA** — «Con la misma estrategia, el mismo intermediario y el mismo benchmark, pasar de 10 a 5 años cambió el CAGR, la peor caída y hasta el signo de la comparación ajustada al riesgo frente al índice. Una simulación histórica describe un periodo concreto; no predice el siguiente».

### Relación con la pregunta
- La «eficiencia real» depende del periodo de observación.
- Los costes acumulados pesan más cuanto más largo es el horizonte.

### Limitaciones
- Solo dos periodos que terminan en la misma fecha; no son ventanas independientes.
- El periodo de 10 años incluye la caída de 2020; el de 5 años, no.
- Mismas tarifas actuales aplicadas a ambos periodos.

### Reproducibilidad
- **Script:** salida en `e4_*_10a.*` y `e4_*_5a.*`.
- **En la interfaz:** Strategy Comparison y Cost Analysis con BASE, cambiando solo las fechas (del 18/11/2016 o del 18/11/2021 al 18/11/2026).
- **Cadena de datos:** cadenas B, C, D y E.

---

## Experimento 5 — Sensibilidad a costes y rotación

> **Estado: HIPOTÉTICO** · simulación de sensibilidad, no histórica (Fase 9.1). En la app, la sección se llama ahora «Sensibilidad a costes de operativa (rotación)».

**Pregunta concreta.** En la simulación educativa de Cost Sensitivity, ¿cuánto crece el efecto acumulado de los costes cuando aumenta la operativa, y cuánto depende del intermediario?

**Hipótesis previa:** H-E5 (§0.1).

**Variables controladas:**
- capital 10.000 €;
- rentabilidad anual **supuesta** del 5 % (valor por defecto de la app; no es una previsión);
- coste recurrente del 0 %;
- ETF genérico de la zona euro.

**Variable independiente:** perfil de rotación. Como contraste, el intermediario (ING, MyInvestor, Bankinter) y el horizonte (10 o 20 años con ING).

**Qué significa cada perfil** (D75; la mitad de las órdenes son ventas y la otra mitad compras, cada una con su comisión, D81):

| Perfil | Rotación anual | Órdenes al año | Órdenes en 10 años (con la compra inicial) |
|---|---|---|---|
| Comprar y mantener | 0 % | 0 | 1 |
| Baja | 20 % de la cartera | 4 | 41 |
| Media | 50 % | 12 | 121 |
| Alta | 100 % | 24 | 241 |

**Configuración exacta:** `POST /api/costs/sensitivity` con `capital=10000`, `annual_return_pct=5`, `recurring_pct=0`, `market=EUROZONE`, `broker ∈ {ing, myinvestor, bankinter_std}` y `years ∈ {10, 20}`.

### Resultado

Valor sin costes: 16.288,95 € a 10 años y 26.532,98 € a 20 años.

| Intermediario · horizonte | Comprar y mantener | Baja | Media | Alta |
|---|---|---|---|---|
| **ING · 10 años:** diferencia frente a sin costes (pagado) | 21 € (13 €) · 0,1 % | 237 € (185 €) · 1,5 % | 634 € (502 €) · 3,9 % | **1.240 € (986 €) · 7,6 %** |
| ING · 20 años | 34 € · 0,1 % | 641 € · 2,4 % | 1.737 € · 6,5 % | **3.403 € · 12,8 %** |
| MyInvestor · 10 años | 20 € · 0,1 % | 97 € · 0,6 % | 214 € · 1,3 % | **406 € · 2,5 %** |
| Bankinter · 10 años | 33 € · 0,2 % | 1.039 € · 6,4 % | 3.051 € · 18,7 % | **6.070 € · 37,3 %** |

El porcentaje es la diferencia sobre el valor sin costes.

**⭐ CANDIDATO PPT** — gráfico de líneas o barras agrupadas de la **diferencia en % frente a sin costes** por perfil, con una serie por intermediario y el eje desde 0 %. Hay que indicar en la diapositiva que es una **simulación hipotética** con rentabilidad constante del 5 %. Datos en `e5_sensibilidad.csv`.

### Interpretación
- **Rotación.**
  - Con comprar y mantener, el efecto es despreciable (0,1–0,2 %) en los tres intermediarios.
  - Con rotación alta, la diferencia va del 2,5 % (MyInvestor) al 37,3 % (Bankinter) en 10 años.
- **Crecimiento compuesto.**
  - La diferencia final supera lo pagado (ING alta: 1.240 € frente a 986 € pagados), porque lo pagado deja de crecer.
  - Duplicar el horizonte casi triplica la diferencia en euros (ING alta: 1.240 € → 3.403 €).
- **Intermediario.**
  - En Bankinter cada orden de unos 800 € paga 20 € fijos (alrededor del 2,4 % por orden), así que la rotación es muy cara.
  - En MyInvestor (0,12 %) el efecto sigue siendo moderado.
- **Contraste con H-E5:** **se cumple** en las tres partes (crece con la rotación, alta muy por encima de comprar y mantener, y depende del intermediario). Lo que la hipótesis no cuantificaba es la magnitud de la dependencia del intermediario: la diferencia entre ellos es de unas 15 veces.

**⭐ CANDIDATO BITÁCORA** — «La operativa frecuente solo es muy cara si la tarifa cobra una parte fija relevante por orden. En la simulación (10.000 €, 10 años, 5 % supuesto), el mismo perfil de rotación alta restó un 2,5 % del resultado con MyInvestor, un 7,6 % con ING y un 37,3 % con Bankinter».

### Relación con la pregunta
- Aísla el componente «frecuencia de operativa» con ventas y compras, que el backtest histórico no tiene (solo compras).
- Es la parte de la investigación donde los costes pueden «cambiar la eficiencia» de forma más clara.

### Limitaciones
- **Hipotética:** rentabilidad constante del 5 %, sin volatilidad ni precios reales. **No es un resultado histórico.**
- **Sin custodia:** no incluye la custodia de cada intermediario (solo el coste recurrente que introduce el usuario, aquí 0 %). Con ING, por ejemplo, comprar y mantener pagaría custodia por trimestres sin operaciones (ver E3).
- **Perfiles definidos por el proyecto** (D75 ⏳); el importe por orden depende del capital (10.000 €).
- **Sin impuestos:** vender genera plusvalías tributables, que no se modelan. En la realidad la rotación costaría más.

### Reproducibilidad
- **Script:** salida en `e5_sensibilidad.csv` y `e5_sensibilidad_*.json`.
- **En la interfaz:** Cost Analysis → «Escenario de sensibilidad», con capital 10.000 €, 10 años, rentabilidad del 5 %, coste recurrente del 0 %, mercado zona euro y el intermediario correspondiente.
- **Cadena de datos:** cadena D (`analytics/sensitivity.py`, tras la corrección D81).

---

## Conclusiones provisionales

> **Resultados de simulaciones históricas del proyecto (E1–E4) y de una simulación hipotética (E5), no evidencia predictiva del comportamiento futuro.** Dependen de las estrategias, del periodo de 2016 a 2026 y de las tarifas consultadas en noviembre de 2026.

**Qué hemos observado:**
- Con la misma estrategia y aportaciones mensuales pequeñas, el intermediario cambió el valor neto entre 4 € y 13.331 € (E1).
- La frecuencia de aportación cambió el resultado en ambos sentidos según la tarifa (E2).
- Tres estrategias distintas quedaron casi empatadas en rentabilidad ajustada al riesgo pese a rentabilidades muy diferentes (E3).
- El periodo cambió las métricas y la comparación con el benchmark (E4).
- La rotación solo fue muy cara con comisiones fijas altas (E5).

**Qué parece importar más:**
- Entre estrategias distintas, la **composición** (exposición y riesgo asumido) y el **periodo** explican diferencias mayores que los costes, en buy & hold con brokers de comisión baja (E3 y E4).
- Para una misma estrategia con aportaciones, la **estructura de la tarifa** puede ser tan importante como la estrategia (E1 y E2).

**Cuándo importan los costes:**
- Con **muchas operaciones de importe pequeño** (aportaciones mensuales a varios activos, rotación) y **comisiones fijas por operación** relevantes (20–36 € por orden internacional).
- Con **custodias altas** (tarifa máxima de Santander).
- Con **horizontes largos**, porque lo pagado deja de capitalizarse.

**Cuándo parecen menos relevantes:**
- En buy & hold con pocas compras.
- Con brokers de comisión porcentual baja o con planes sin comisión.
- En esos casos el impacto de las **comisiones de compra** quedó por debajo del 1 % del valor final (E1, E5).
- Matiz: en buy & hold puede aparecer otro coste. Con ING, la custodia por trimestres sin operaciones llegó al 0,6–1,8 % del valor final y creció con el número de activos (E3).

**Cómo influye la operativa:**
- Más operaciones no siempre cuestan más. Con ING, la aportación anual pagó custodia por trimestres sin operaciones.
- El efecto de la frecuencia se mezcla con el momento de entrada en el mercado, que en este periodo alcista favoreció a la aportación mensual (E2).

**Qué papel juega el horizonte:**
- Cambia el CAGR, la peor caída y la comparación frente al benchmark (E4).
- Amplifica los costes acumulados (E4 y E5).

**Qué aprendemos al incorporar riesgo y benchmark:**
- La rentabilidad sola habría señalado a la estrategia concentrada; con volatilidad, máxima caída y Sharpe la lectura es mucho más matizada (E3).
- La comparación con el índice puede invertirse cambiando solo el periodo (E4).

**Respuesta provisional a la pregunta de investigación:**
- En estas simulaciones, los costes de intermediación y la frecuencia de operativa **pueden cambiar de forma material** el resultado de una estrategia a largo plazo, **sobre todo** cuando la tarifa tiene componentes fijos y la operativa es frecuente.
- Con tarifas porcentuales bajas o planes sin comisión, su efecto fue pequeño frente a las diferencias debidas a la composición de la cartera y al periodo.
- La respuesta es «depende de la estructura de costes y de la operativa», con magnitudes concretas para este escenario.
