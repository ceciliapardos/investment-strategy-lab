# Datos y fuentes

Resumen de todas las fuentes de datos externas que usa la aplicación, cómo se usan y sus limitaciones. Las decisiones correspondientes están en [[Decisiones]].
- Cómo fluye cada dato hasta la pantalla: [[Cadena de datos y reproducibilidad]].
- Fuentes regulatorias y académicas de la investigación: [[Investigación principal]] §9.

## Índice de fuentes (auditoría de la Fase 8, 2026-11-18)

| Fuente | Qué aporta | URL / acceso | Fecha de consulta o del documento | Limitaciones | Módulos | Tipo |
|---|---|---|---|---|---|---|
| Yahoo Finance (yfinance 1.7.0) | Búsqueda, tipo de activo, divisa, precios diarios (`Adj Close`, `Close`), TER | finance.yahoo.com, vía la librería yfinance | En cada petición (con caché); cobertura observada el 11/11/2026 | No oficial; puede cambiar; sin sesgo de supervivencia; TER ausente en muchos UCITS | Explore Markets, Builder, Comparison, Cost Analysis | Proveedor de datos (secundario) |
| Yahoo Finance: `EUR{CCY}=X` | Tipos de cambio diarios | Ídem | Disponibilidad observada el 12/11/2026 | Cierre de Londres; tipo de mercado, no el del banco | Comparison, Cost Analysis | Proveedor de datos |
| Yahoo Finance: `^SP500TR`, `IWDA.AS` | Benchmarks | Ídem (§9) | 18/11/2026 | IWDA.AS es un proxy ETF con TER | Comparison | Proveedor de datos |
| Tarifas oficiales de 10 perfiles | Comisiones, custodia, divisa | Webs y PDFs de cada entidad (§7) | 12/11/2026 (fecha de cada documento en §7) | Interpretaciones ⏳; tarifa actual aplicada al pasado | Cost Analysis | **Primaria** (emisor de la tarifa) |
| Vanguard, ficha de VOO | Contraste del TER (0,03 %) | https://fund-docs.vanguard.com/F0968.pdf | Datos a 30/09/2026 | Solo se contrastó VOO; no está en el código | Verificación (Explore, Cost Analysis) | **Primaria** (emisor) |
| CNMV, *Guía rápida: Fondos cotizados (ETF)* | Gastos del fondo dentro del valor liquidativo frente a gastos del intermediario | https://www.cnmv.es/DocPortal/Publicaciones/Fichas/FondosCotizados(ETF).pdf | 18/11/2026 (sin fecha visible) | Divulgativa, no normativa | Fundamento de D42 (Cost Analysis) | Institucional |
| Documentación de yfinance | `auto_adjust` (por defecto `True`) | https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/history.py | 18/11/2026 | Documentación de la librería, no de Yahoo | Fundamento de D10/D19 | Documentación técnica |
| BCE, €STR (`EST.B.EU000A2X2A25.WT`) | Alternativa estudiada para la tasa libre de riesgo (no usada) | https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT | 18/11/2026 | Solo desde 01/10/2019 | Ninguno (descartado, D71) | **Primaria** (banco central) |
| Google News RSS; feeds del BCE y la Fed | Titulares con enlace | §2 | 11/11/2026 | Condiciones del RSS de Google no verificadas (⏳ D23) | News | Agregador / institucional |
| ~~LM Studio (API local)~~ | ~~Texto del AI Analyst~~ | — | — | 🔁 Retirado en la Fase 8.1 (D80) | Ninguno | No es una fuente de datos |

**Resultado de la auditoría:**
- **Sin contradicciones con el código** en §1–§9:
  - campos, unidades y caché coinciden con `services/data_provider.py`, `services/market_service.py` y `services/cache.py`;
  - el dataset de tarifas coincide con `data/broker_fees.json` (versión 2026-11-12b);
  - los benchmarks coinciden con `backtest_service.BENCHMARKS`.
- **Matiz añadido a §1:** la tabla «Cobertura observada» es una foto del 11/11/2026 y puede haber cambiado.
- **Contenido superado que se conserva:**
  - §8 sigue mencionando la etapa con Anthropic como historia;
  - la lista de Trade Republic de 04/2023 queda como fuente secundaria (§7).

---

## 1. Datos de mercado — Yahoo Finance (vía yfinance)

| Aspecto | Detalle |
|---|---|
| Fuente | Yahoo Finance, a través de la librería **yfinance 1.7.0** (no oficial) |
| Uso | Búsqueda, metadatos, último precio, histórico diario y TER |
| Condiciones | yfinance no es una API oficial de Yahoo. Uso académico y personal. Puede dejar de funcionar si Yahoo cambia su web |
| Retraso | Los precios pueden tener retraso; no son cotizaciones en tiempo real garantizadas |
| Acceso en el código | Solo `backend/services/data_provider.py` |

### Campos utilizados

| Dato | Origen en yfinance | Notas |
|---|---|---|
| Tipo de activo | `info["quoteType"]` | EQUITY, ETF, MUTUALFUND, INDEX, CRYPTOCURRENCY, FUTURE. Si falta, el ticker se considera inexistente |
| Nombre | `info["longName"]` (o `shortName`) | |
| Divisa | `info["currency"]` | La búsqueda de Yahoo **no** devuelve la divisa |
| Mercado | `info["fullExchangeName"]` | p. ej. NYSEArca, NasdaqGS, XETRA |
| Último precio | `fast_info["lastPrice"]` (o `info["regularMarketPrice"]`) | |
| Histórico diario | `history(period="max", interval="1d", auto_adjust=False)` | Columnas `Adj Close` y `Close` |
| TER (1ª opción) | `funds_data.fund_operations`, fila *Annual Report Expense Ratio*, columna del fondo | **Fracción**: 0.0003 = 0,03 % |
| TER (2ª opción) | `info["netExpenseRatio"]` | **Puntos porcentuales**: 0.03 = 0,03 % |

### Las dos series de precio

| Serie | Qué es | Dónde se usa |
|---|---|---|
| `Adj Close` → **valor ajustado** | Ajustado por splits **y** dividendos (dividendos reinvertidos) | Gráfico, rentabilidad total, CAGR, volatilidad, drawdown |
| `Close` → **cierre cotizado** | Ajustado **solo por splits** (Yahoo ya lo corrige) | Rentabilidad "solo por precio", precio inicial y final, tooltip |

En índices, criptomonedas y futuros no hay dividendos, así que las dos series coinciden. Los índices de Yahoo (p. ej. ^GSPC) son índices de precios: **no incluyen dividendos**.

### Verificación de unidades del TER (2026-11-11)
Para VOO, Yahoo devolvía a la vez `fund_operations` = 0.0003 e `info["netExpenseRatio"]` = 0.03. Ambos corresponden a 0,03 %, lo que confirma que las unidades son distintas.

**Contrastado (Fase 5):** la ficha oficial de Vanguard confirma el 0,03 % (ver §6).

### Cobertura observada (2026-11-11)

| Ticker | Tipo | TER mostrado | Histórico diario desde |
|---|---|---|---|
| VOO | ETF EE. UU. | 0,03 % | 09/09/2010 |
| VFIAX | Fondo | 0,04 % | 13/11/2000 |
| IWDA.AS | ETF UCITS | 0,20 % | — |
| VWCE.DE, VUSA.L | ETF UCITS | No disponible | — |
| TSLA, SAN.MC | Acciones | No aplica | TSLA: 29/06/2010 |
| ^GSPC | Índice | No aplica | 30/12/1927 |
| BTC-USD | Cripto | No aplica | 17/09/2014 |
| ES=F | Futuro | No aplica | 18/09/2000 |

**Limitación importante:** para muchos ETFs UCITS europeos, que son los habituales para un inversor en España, Yahoo no publica el TER. Se tratará en Cost Analysis.

### Periodos y fechas

| Botón | Ventana |
|---|---|
| 1M, 6M, 1A, 5A, 10A | Del último cierre disponible hacia atrás 1 mes / 6 meses / 1, 5 o 10 años |
| Año actual | Desde el 1 de enero del año del último cierre |
| Máx. | Todo el histórico |
| Fechas | Rango elegido por el usuario |

- El análisis empieza en el primer cierre **en o después** de la fecha inicial y termina en el último **en o antes** de la final.
- No se crean observaciones en fines de semana ni festivos.
- Se usa la fecha local de cada mercado.

---

## 2. Noticias

### Fuentes utilizadas

| Fuente | URL | Uso | Contenido mostrado |
|---|---|---|---|
| Google News RSS (edición España, español) | `news.google.com/rss/search?q=…&hl=es&gl=ES&ceid=ES:es` | Portada, 6 categorías (búsquedas temáticas de la última semana) y buscador (último mes) | Titular, medio, fecha y enlace |
| Banco Central Europeo | `www.ecb.europa.eu/rss/press.html` | Bancos centrales | Titular, fecha, enlace y descripción breve (≤ 220 caracteres), en inglés |
| Reserva Federal | `www.federalreserve.gov/feeds/press_monetary.xml` | Bancos centrales | Titular, fecha, enlace y descripción breve, en inglés |

- **Atribución:** cada noticia muestra su medio. La página indica que los titulares proceden de Google News y de los feeds oficiales.
- **Enlaces:** los de Google News llevan a `news.google.com`, que redirige al medio original. En la UE, Google puede mostrar antes su pantalla de consentimiento de cookies (comprobado el 2026-11-11).
- **Condiciones de uso de Google News RSS:** no hemos encontrado unos términos oficiales actuales sobre el RSS. Fuentes secundarias indican uso no comercial y con atribución a Google News y al medio. **Pendiente de revisión del equipo** ([[Decisiones]] D23).

### Acceso a las fuentes desde la versión pública (Render, comprobado el 2026-11-23)

| Fuente | Desde el servidor público | Efecto en la app |
|---|---|---|
| Yahoo Finance (`yfinance`) | Responde: búsqueda, cotización, histórico, TER y benchmarks en torno a 1 s | Explore Markets, Comparison y Cost Analysis completos |
| BCE y Reserva Federal (RSS) | Responden | La portada de News y «Bancos centrales» muestran sus titulares |
| Google News RSS | **No responde.** Las 6 consultas temáticas fallan desde el servidor y funcionan desde un ordenador personal | Las categorías temáticas y el buscador de News muestran el aviso de error |

No se ha cambiado ninguna fuente ni se ha intentado eludir el bloqueo. La decisión sobre una alternativa queda pendiente del equipo ([[Decisiones]] D82).

### Fuentes descartadas (comprobadas el 2026-11-11)

| Fuente | Motivo |
|---|---|
| elEconomista RSS | HTTP 403: bloquea lectores automáticos |
| Expansión RSS | Titulares de sección ("EMPRESAS", "CRÓNICA DE BOLSA") en lugar del titular real |
| Cinco Días RSS (portada) | Mezcla noticias generales de El País |
| Banco de España (RSS probado) | La URL devolvió 404 |
| Scraping de páginas web | Descartado por la regla del proyecto |

### Robustez y caché

| Elemento | Valor |
|---|---|
| Timeout por fuente | 4 s de conexión + 6 s de lectura |
| Caché por fuente | 10 min |
| Contenido anterior si la fuente cae | Hasta 6 h, marcado como no actualizado |
| Antigüedad máxima | 8 días (Google News), 45 días (feeds oficiales), 31 días (buscador) |
| Tamaño máximo de un feed | 3 MB |

---

## 3. Caché de datos de mercado

| Dato | Caducidad |
|---|---|
| Búsqueda de activos | 10 min |
| Metadatos (`info`) | 1 h |
| Último precio | 60 s |
| Histórico diario completo | 1 h |
| TER (`fund_operations`) | 24 h |

La caché vive en memoria y se borra al reiniciar el backend. Estadísticas en `http://localhost:8000/api/health`.

---

## 4. Tipos de cambio (Fase 4 — Strategy Comparison)

| Aspecto | Detalle |
|---|---|
| Fuente | Yahoo Finance vía yfinance: pares `EUR{DIVISA}=X` (p. ej. `EURUSD=X`, `EURGBP=X`, `EURCHF=X`) |
| Significado | Unidades de la divisa por 1 € (EURUSD = 1,11 → 1 € = 1,11 $) |
| Serie | Cierre diario (hora de Londres), sin fines de semana |
| Uso | Convertir a euros el precio ajustado de cada activo: precio_EUR = precio_local × factor ÷ EUR/divisa del mismo día |
| Cotizaciones en céntimos | `GBp`/`GBX` (peniques), `ZAc`, `ILA` → factor 0,01 y divisa principal |
| Caché | 1 h (igual que el histórico diario) |

**Disponibilidad observada (2026-11-12):**

| Par | Desde |
|---|---|
| EURUSD=X | 01/12/2003 |
| EURGBP=X | 04/01/1999 |
| EURCHF=X y EURJPY=X | 23/01/2003 |
| EURSEK=X | 18/11/1998 |

Una cartera con activos en USD no puede empezar antes del 01/12/2003.

**Limitaciones:**
- El tipo de cambio es el cierre de Londres y el precio de las acciones de EE. UU. es el cierre de Nueva York: hay un pequeño desfase horario.
- Es un tipo de cambio de mercado, no el que aplicaría un banco o broker. Ese coste es de intermediación: Cost Analysis lo añade como porcentaje según la tarifa de cada intermediario (§7).

---

## 5. Datos del usuario: estrategias (Fase 3, ampliado en 5.1)

| Aspecto | Detalle |
|---|---|
| Dónde se guardan | `localStorage` del navegador, clave `isl.strategies` |
| Qué se guarda | Nombre, capital inicial, divisa base (EUR), activos (ticker, nombre, tipo, divisa, mercado y peso objetivo) y aportaciones periódicas opcionales (activo, importe y frecuencia) |
| Qué NO se guarda | Precios, métricas, datos personales o cuentas |
| Alcance | Solo ese navegador en ese ordenador: si se borra la caché o se usa otro navegador, no aparecen |
| Copia de seguridad | Si los datos se dañan, se conservan en `isl.strategies.corrupt` |
| Origen de los datos de cada activo | Búsqueda + ficha de Yahoo Finance en el momento de añadirlo (nombre, tipo, divisa, mercado) |

Ver [[Decisiones]] D26 y D30.

---

Strategy Comparison lee estas mismas estrategias. Además recuerda la selección y el periodo en `isl.comparison` (solo identificadores y periodo, no copia las estrategias).

---

## 6. Costes internos del producto: TER (Fase 5)

**Regla: el TER no se resta de la rentabilidad histórica.**

- El TER es un coste interno anual del fondo o ETF. La gestora lo descuenta día a día del patrimonio del fondo, así que **ya está dentro de su valor liquidativo y de su precio**.
- Nuestro backtest usa los precios ajustados reales del ETF o fondo. Por tanto, la rentabilidad histórica que calculamos **ya es neta de TER**.
- Restarlo otra vez sería **contarlo dos veces**.

En Cost Analysis el TER aparece solo como información, con el texto «Ya reflejados en el precio histórico… no se vuelve a restar».

| Caso | Qué se muestra |
|---|---|
| ETF o fondo con dato válido en Yahoo (0 % < TER ≤ 5 %) | El valor, con la fuente «Yahoo Finance» y la recomendación de consultar la ficha del emisor |
| ETF o fondo sin dato fiable | «No disponible» (nunca se estima) |
| Acción, cripto, índice o futuro | «No aplica», con la explicación |

**Contraste con fuente oficial:**
- VOO: la ficha oficial de Vanguard (fund-docs.vanguard.com/F0968.pdf, datos a 30/09/2026) indica un TER del 0,03 %, que coincide con Yahoo.
- No se ha incorporado ninguna fuente de emisor al código: el dato mostrado sigue siendo el de Yahoo.

---

## 7. Tarifas de intermediarios (Fase 5 y 5.1)

**Dataset:** `backend/data/broker_fees.json`, versión **2026-11-12b**.
- **Qué representa cada registro:** una **entidad + perfil tarifario**. No se mezclan perfiles: estándar, joven, planes y promociones van por separado.
- **Fuentes:** solo webs, PDFs y folletos oficiales. Los comparadores solo sirvieron para localizar los documentos, nunca como dato.
- **Tarifas consultadas a fecha de 12/11/2026.** No hay scraping: cuando cambie una tarifa, se edita el JSON con la nueva fuente y fecha.

### Bancos tradicionales

| Entidad · perfil | Fuente oficial | Fecha doc. | Compraventa modelada | Custodia | Divisa |
|---|---|---|---|---|---|
| **Santander · Tarifa online** (nueva cuenta de valores, web/app) | Web «Tarifas» de Bolsa e inversión (`bancosantander.es/particulares/ahorro-inversion/bolsa-inversion/tarifas/`) + «Folleto de tarifas máximas en operaciones y servicios del mercado de valores» (`wcm.bancosantander.es/...folleto_de_tarifas_maximas...pdf`) | Folleto en vigor desde 10-02-2025; web sin fecha | Nacional: 3 € ≤ 2.000 €; 6 € ≤ 15.000 €; 0,25 % por encima. Internacional: 20 € ≤ 15.000 €; 0,35 % por encima | **Tarifa MÁXIMA**: 0,25 % anual (mín. 24 €) por clase de valor nacional; 1 % (mín. 60 €) internacional; sobre la media de saldos diarios; prorrateada | No publicada → no se aplica |
| **CaixaBank · Ocean Bróker estándar (sin pack)** | Web «Tarifas» de Bolsa y mercados (`caixabank.es/particular/bolsa-mercados/tarifas.html`, NRI 50182-2026/09542) | Sin fecha | Nacional: 0,65 % (mín. 10 €). Internacional: 36 € < 15.000 €; 0,25 % desde 15.000 € | 0,10 % semestral sobre **nominal** (mín. 6 €) nacional; 0,40 % (mín. 15 €) internacional → **solo se aplica el mínimo** (el nominal no está disponible) | No publicada → no se aplica |
| **Bankinter · sin Servicio Bróker Cero** | Webs «Tarifas y comisiones de acciones» y «de ETPs» (`bankinter.com/broker/tarifas-comisiones/acciones` y `/etfs`) | Sin fecha | Nacional: 3,95 € ≤ 2.000 €; 8 € ≤ 60.000 €; 0,07 % (máx. 200 €) por encima. Internacional (principales mercados): 20 € hasta 40.000 € / $ (30.000 £, 425.000 SEK); 0,20 % por encima | 0,04 % trimestral nacional y 0,05 % internacional sobre el valor medio de cada clase, mín. 6 €, prorrateada; **sin mínimo para ETF con compra periódica** | Diferencial ±1 % |
| **ING · Broker Naranja, Tarifa Base** | PDF «Tarifas Aplicables Broker NARANJA (LT A BRN OL 10/26)» (`ing.es/sobre-ing/pdf/TarifasApliBroker.pdf`) | 22/10/2026 | 3 € / $ / £ + 0,10 % (tope 20 si < 50.000); otros mercados 40 € + 0,45 % | 4 € por valor + IVA en cada trimestre **sin operaciones**; máx. 49,59 € + IVA | 0,50 % |
| **BBVA · Tarifa ETF (0,15 %)** | Web «Inversión y trading con acciones, ETF y más» (`bbva.es/personas/productos/bolsa/inversion-y-trading-en-acciones.html`) | Sin fecha | Solo ETF de la selección de BBVA: 0,15 %, sin mínimo | Sin custodia | No publicada |
| **BBVA · Tarifa joven (<30 años)** | Nota oficial en bbva.com «Los jóvenes podrán invertir en bolsa a través de BBVA…» | 28/04/2026 (aplica desde 13/04/2026) | Acciones y ETF, nacional e internacional: 0,99 € por operación | Sin custodia | No publicada |

### Brokers y bancos digitales

| Entidad · perfil | Fuente oficial | Fecha doc. | Compraventa modelada | Custodia / mantenimiento | Divisa |
|---|---|---|---|---|---|
| **MyInvestor · estándar** | Web oficial del bróker (`myinvestor.es/inversion/broker/`) | Sin fecha | Acciones 0,12 % (mín. 3 €, máx. 25 €); ETF 0,12 % (mín. 1 €, máx. 25 €) | 0 € | 0,30 % |
| **Trade Republic** | Web oficial (`traderepublic.com/es-es`, apartado «Fijación de precios»); lista de precios ES 04/2023 como fuente secundaria | Web sin fecha | Orden sin cargo + **1,00 € de liquidación por operación**; **planes de inversión sin cargo** (aportaciones a acciones y ETF) | Sin cargo | No publicada → no se aplica |
| **Revolut · plan Estándar** | Ayuda oficial «Las comisiones de trading de Revolut» y «Comisiones y límites de cambio de divisas» (`help.revolut.com/es-ES/...`); «Ver planes de Revolut» | Sin fecha | 0 órdenes gratuitas; 1 € por orden; **compras periódicas de ETP seleccionados con planes: sin comisión** | Sin custodia | 1 % sobre lo que supere 1.000 € al mes |
| **Revolut · plan Premium** | Mismas fuentes | Sin fecha | **5 órdenes gratuitas al mes**, después 1 €; planes de ETP sin comisión | Cuota del plan 9,99 €/mes (119,88 €/año) contada como mantenimiento | Sin comisión adicional |

### Verificación de supuestos (Fase 9.1, consulta del 19/11/2026)

| Perfil | Supuesto | Veredicto | Fuente |
|---|---|---|---|
| BBVA · Tarifa ETF | Se aplica a cualquier ETF | **No verificable:** la «amplia selección de ETF de las principales gestoras» solo se ve tras iniciar sesión | bbva.es, páginas de ETF |
| Trade Republic | Aportaciones periódicas sin comisión | **Confirmado** (ejecución de planes sin comisión; `IE00B4L5Y983` e `IE00B4WXJJ64` aptos para plan). **Aproximación:** intervalos semanal, quincenal, mensual o trimestral (no anual) y ejecución los días 2 y 16 | app.traderepublic.com (catálogo con filtro «Plan de inversión»); support.traderepublic.com (por fragmentos del buscador) |
| Revolut Estándar / Premium | Planes de inversión sin comisión; Premium con cuota | **Aproximación:** las reglas coinciden, pero la lista de «ETP seleccionados» solo está en la app; la cuota de Premium se imputa entera a la inversión | help.revolut.com/es-ES |
| Santander | Custodia del 1 % anual (mínimo 60 €) en valores extranjeros | **Aproximación (cota superior):** es la tarifa **máxima** del folleto (apdo. 2.1, en vigor desde 10-02-2025); la web comercial no publica la custodia | Folleto de tarifas máximas; web «Tarifas» |
| CaixaBank | Solo el mínimo de custodia | **Aproximación justificada:** la tarifa se calcula «sobre el importe nominal», que no está disponible | caixabank.es, «Tarifas» |

Ninguno obliga a cambiar el dataset (detalle e impacto en [[Experimentos y resultados]], «Validación metodológica»).

### Qué no se ha podido incorporar
- **BBVA, tarifa de acciones del perfil estándar:** depende de tres perfiles de BBVA Trader según el número de órdenes. El folleto oficial (PDF) devolvió error 403 y no se pudo verificar, así que no se incluye.
- **CaixaBank, packs de bolsa:** Iniciación, Avanzado, Experto y Experto Plus, con cuota mensual y custodia gratuita con 12 operaciones al semestre. No se modelan para mantener un perfil explicable.
- **Bankinter, Servicio Bróker Cero y ETF promocionados a 0 €:** dependen de un servicio contratado y de una lista de ETF que cambia.
- **Santander, tarifa de custodia comercial:** solo se ha encontrado la tarifa **máxima** del folleto. La app lo indica en cada resultado.

### Cómo se aplican (detalle en [[Decisiones]] D43–D47 y D50–D58)
- **Compras:**
  - una compra inicial por activo;
  - **una compra más por cada aportación periódica ejecutada**, con su comisión y, si aplica, su cambio de divisa.
- **Reglas de cada tarifa:** tramos por importe, mínimos, máximos y topes condicionados; órdenes gratuitas al mes; planes de inversión sin comisión; franquicia mensual de cambio de divisa.
- **Custodia:** con la periodicidad real de cada tarifa (trimestral, semestral o anual), prorrateada por días, sobre el patrimonio de cada momento (crece con las aportaciones).
  - **Limitación:** la custodia y el mantenimiento se restan del valor final sin coste de oportunidad, así que con custodias altas el impacto real está infravalorado.
  - No se corrige (decisión de la Fase 9.1; ver [[Experimentos y resultados]]).
  - Hay tres tipos:
  - por clase de valor con mínimo;
  - por trimestre sin operaciones (ING);
  - % sobre el valor de la cartera (escenario personalizado).
- **Venta:** solo como «coste estimado de salida», al final, sobre el valor final de cada posición.
- **Importes fijos y umbrales en otra divisa** (3 $, 40.000 $…): se convierten con el tipo de cambio de Yahoo del día de la operación.
- **Activos o mercados que la tarifa no cubre** (cripto, índices, futuros, fondos; mercados secundarios de Bankinter; acciones en BBVA ETF): se marcan como «Datos incompletos», con el motivo.

### Costes personalizados
- Los introduce el usuario y no se guardan en ningún servidor: solo en el navegador, clave `isl.costs`.
- Se muestran siempre como «introducidos por ti».
- La comisión de compra se aplica también a cada aportación periódica.

### Aviso que muestra la app
Las tarifas pueden cambiar y algunas dependen del tipo de cuenta, del plan o de la edad. Los resultados son simulaciones históricas: hay que consultar siempre la tarifa oficial antes de invertir.

---

## 8. AI Strategy Analyst: proveedor de IA y datos enviados (Fase 6 y 6.1) — 🔁 histórico

> **Retirado del producto en la Fase 8.1** por decisión del equipo ([[Decisiones]] D80). La aplicación ya no envía datos a ningún modelo de IA ni necesita LM Studio. Esta sección se conserva como historia.

| Aspecto | Detalle |
|---|---|
| Proveedor actual | **LM Studio local**, mediante su API compatible de chat completions (por defecto `http://127.0.0.1:1234/v1`) |
| Modelo | El que el usuario descargue y cargue en LM Studio. No hay ninguno obligatorio ni se incluye en el repositorio. `LMSTUDIO_MODEL` vacío = el primero disponible |
| Credencial | **Ninguna.** No hace falta API key ni hay costes por uso |
| Cuándo se llama | Solo al pulsar «Generar análisis»; las peticiones repetidas usan la caché (1 h en el servidor) |
| Prompt | `backend/ai/prompts/analyst_system_v2.md` (versión `analyst-v2`). La v1 se conserva |
| Historia | En la Fase 6 (V0.8) se usó la API de Anthropic (Claude) con API key. Se sustituyó en la 6.1 por LM Studio local. Ver [[Decisiones]] D67 |

**Privacidad:**
- Con LM Studio en local, los datos de las estrategias que se envían al modelo pueden quedarse en el ordenador del usuario.
- Depende de la configuración: si `LMSTUDIO_BASE_URL` apunta a otra máquina, los datos viajan a ella.
- No se presenta como una garantía absoluta.

**Despliegue web:** una aplicación desplegada en un servidor remoto no puede acceder al LM Studio del `localhost` de cada usuario. El analista local está pensado para ejecución local. Un despliegue necesitaría otro proveedor que implemente `AIProvider` (no incluido).
**Qué recibe el modelo:**
- el periodo efectivo y las notas de metodología;
- por estrategia: nombre, capital inicial, aportaciones periódicas, total aportado, valor final, ganancia, rentabilidad TWR, CAGR, volatilidad, máxima caída, número de activos, mayor peso y composición (ticker, nombre, tipo, divisa y pesos);
- los costes del intermediario elegido y un resumen de los demás;
- el TER por activo;
- el perfil educativo, si se indicó.

Todo sale de los resultados que ya calcula la aplicación.

**Qué NO recibe el modelo:** HTML ni páginas, archivos del proyecto, documentación de Obsidian, noticias, historial de uso, claves ni datos personales.

**Fuente de verdad de las cifras:** los motores de Strategy Comparison y Cost Analysis. Las tarjetas de la página se pintan con esos datos, no con el texto del modelo.

---

## 9. Benchmarks, tasa libre de riesgo y supuestos de sensibilidad (Fase 7)

### Índices de referencia (benchmark), consultados el 18/11/2026 en Yahoo Finance vía yfinance

| Benchmark | Serie (ticker) | Qué representa | Tipo | Divisa | Histórico diario |
|---|---|---|---|---|---|
| S&P 500 (Total Return) | `^SP500TR` (https://finance.yahoo.com/quote/%5ESP500TR/) | Índice S&P 500 con dividendos reinvertidos (Yahoo: «S&P 500 (TR)», quoteType INDEX) | **Índice directo** | USD → EUR con `EURUSD=X` | Desde 04/01/1988 |
| MSCI World | `IWDA.AS` (https://finance.yahoo.com/quote/IWDA.AS/) | iShares Core MSCI World UCITS ETF USD (Acc), cotizado en Ámsterdam (quoteType ETF) | **Proxy ETF, no es el índice**: su precio ya descuenta su TER y tiene error de seguimiento | EUR | Desde 25/09/2009 |

**Descartados:**
- `^GSPC`: S&P 500 solo precio, sin dividendos. No es coherente con nuestros precios ajustados.
- `^990100-USD-STRD`: índice MSCI World de solo precio; Yahoo no declara su divisa.
- `URTH`: ETF en USD con menos historia.

**Cómo se usa:**
- El benchmark se calcula como comprar y mantener en euros, en exactamente la ventana de las estrategias: primer cierre en o después del inicio y último en o antes del final, sin rellenar precios.
- No recibe aportaciones y no paga costes.
- Si su histórico no cubre el inicio del periodo, se muestra «no disponible» y no se acorta el periodo de las estrategias.

### Tasa libre de riesgo del Sharpe
- **Decisión del equipo:** **0 %**, indicada junto a la métrica (D71).
- **Alternativa estudiada:** el €STR oficial del BCE (`EST.B.EU000A2X2A25.WT`, https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT, consultado el 18/11/2026). Solo existe desde el 01/10/2019 (−0,549 % ese día; 2,441 % el 17/11/2026), así que no cubre periodos largos.

### Sensibilidad a costes de operativa (supuestos visibles en la interfaz)
- En la interfaz se llama «Sensibilidad a costes de operativa (rotación)» desde la Fase 9.1.
- Es una simulación educativa hipotética, separada del backtest. **No usa datos históricos de precios.**
- **Del intermediario solo usa las comisiones de compraventa y de divisa; no incluye su custodia.** Cost Analysis sí la incluye.
- **Comisiones:** las de la tarifa oficial del intermediario elegido (§7), para un ETF genérico del mercado elegido.
- **Comisiones fijas en dólares:** se convierten con el último `EURUSD=X` de Yahoo.
- **Entradas del usuario:** la rentabilidad anual y el coste recurrente.

---

## 10. Datos que NO se usan
- Impuestos, cánones de mercado, spreads, slippage e impacto de mercado.
- Fuentes oficiales de TER de emisores dentro del código (posible ampliación).
