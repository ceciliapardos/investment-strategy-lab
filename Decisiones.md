# Registro de decisiones

Cada decisión indica fecha/fase, contexto, decisión y motivo. Las decisiones históricas se conservan aunque hayan sido superadas; en ese caso se indica qué las sustituye.

**Estado:** ✅ vigente · 🔁 sustituida · ⏳ pendiente de validación por el equipo

---

## Parte I — Decisiones de V0.1 (arquitectura inicial con Antigravity)

### D1. Separar frontend React y backend Python ✅
**Contexto:** el prototipo en Streamlit se volvió frágil (navegación, `session_state`, errores encadenados).
**Decisión:** frontend React (Vite, React Router, Recharts) + backend FastAPI con yfinance, comunicados por API REST.
**Motivo:** separar interfaz y lógica, mejor UX, y aprovechar el ecosistema numérico de Python.
**Revisión en la auditoría (Fase 0):** se confirma. El stack es adecuado; no se rehace.

### D2. Empezar solo por Home + Explore Markets ✅
**Motivo:** validar la capa de datos de un activo individual antes de construir carteras.

### D3. Congelar Strategy Builder y fases posteriores ✅
**Motivo:** no añadir complejidad sobre una base no validada. Se mantiene: se avanza fase a fase con aprobación humana.

### D4. TER según el tipo de activo ✅ (reforzada en D9)
- **Acción individual:** `TER: No aplica`. Una acción no es un vehículo de inversión colectiva.
- **ETF con dato válido:** se muestra el dato de la fuente.
- **ETF sin dato:** `No disponible`. Nunca se inventa ni se estima.

---

## Parte II — Fase 0: auditoría (2026-11-11)

### D5. Mantener la arquitectura y estabilizarla en lugar de rehacerla ✅
**Contexto:** la auditoría encontró un código pequeño y razonable, pero con errores de base (clasificación de activos, tickers inválidos tratados como válidos, tests que no podían fallar, entorno no reproducible).
**Decisión:** conservar React + FastAPI y corregir/reorganizar, sin empezar de cero.
**Motivo:** el coste de corregir era bajo y rehacer no aportaba valor.

---

## Parte III — Fase 1: estabilización de la base (2026-11-11)

### D6. Backend en tres capas ✅
| Capa | Archivo | Responsabilidad |
|---|---|---|
| Acceso a datos | `backend/services/data_provider.py` | Único módulo que usa yfinance. Con caché. |
| Lógica financiera | `backend/analytics/metrics.py` | Funciones puras (sin red) |
| Lógica de negocio | `backend/services/market_service.py` | Clasificación, TER, histórico |
| Rutas API | `backend/routers/markets.py` | Solo validan y delegan |

**Motivo:** poder probar la lógica sin internet y poder cambiar de fuente de datos sin tocar el resto.

### D7. Universo soportado: solo acciones y ETFs 🔁 sustituida por D18
**Decisión:** se aceptan únicamente los `quoteType` de Yahoo `EQUITY` (→ Acción) y `ETF` (→ ETF). Índices, criptomonedas, futuros, divisas y fondos no cotizados (`MUTUALFUND`) se rechazan con un mensaje claro y no aparecen en el buscador.
**Motivo:** antes todo lo que no era ETF se etiquetaba "Stock" (p. ej. `^GSPC`, `BTC-USD`) y los fondos de inversión como "ETF" (`VFIAX`).

### D8. Ticker inexistente = error, no activo vacío ✅
**Decisión:** si Yahoo no devuelve `quoteType`, el ticker se considera inexistente → HTTP 404 con mensaje para el usuario. Tipo no soportado → 422. Formato inválido → 400. Fallo de Yahoo → 502. Error inesperado → 500 sin detalles técnicos.
**Limitación:** si Yahoo responde vacío por un fallo temporal, el usuario verá "no encontrado".

### D9. Fuentes y unidades del TER ⏳
1. `funds_data.fund_operations`, fila *Annual Report Expense Ratio*, **columna del propio fondo** (nunca *Category Average*). Viene como fracción (VOO: 0.0003 = 0,03 %).
2. Si no existe: `info["netExpenseRatio"]`, que viene en **puntos porcentuales** (VOO: 0.03 = 0,03 %) → se divide entre 100. Comprobado comparándolo con la fuente 1.
3. Otros campos de `info` no se usan porque no hemos verificado sus unidades.
4. **Rango de plausibilidad:** solo se acepta un valor en (0 %, 5 %]. Fuera de ese rango se muestra "No disponible".

**Pendiente de validar por el equipo:** el rango (0 %, 5 %]. Hay ETFs con comisión 0 % (temporal o permanente) que hoy saldrían como "No disponible".

### D10. Histórico: precios ajustados y datos diarios 🔁 ampliada por D19
- Se usa el **cierre ajustado por dividendos y splits** (`auto_adjust=True`). Se indica bajo el gráfico.
- 1D y 1S son intradía (5 y 30 minutos). **1M, 1A, 5A, 10A y Máx. usan siempre datos diarios** (antes 5A era semanal y 10A/Máx. mensual, y "10A" empezaba casi un mes tarde).
- La variación se calcula con precios **sin redondear**.
- Para dibujar se reduce la serie a 800 puntos como máximo; los cálculos usan la serie completa.

### D11. Convenciones de las métricas financieras 🔁 sustituida por D20
Implementadas y probadas, **todavía no se muestran en la interfaz** (se usarán desde la Fase 2):

| Métrica | Fórmula | Convención |
|---|---|---|
| Rentabilidad acumulada | P_final / P_inicial − 1 | — |
| CAGR | (P_final / P_inicial)^(1/años) − 1 | años = días naturales / 365,25. **No se calcula si el periodo < 1 año** |
| Volatilidad anualizada | desv. típica muestral de rentabilidades simples × √252 | supone datos diarios |
| Máximo drawdown | mín(P_t / máx(P_0..P_t) − 1) | el máximo debe ser **anterior** al mínimo |

Valores ausentes: se eliminan, no se rellenan. Precios ≤ 0: error.
**Pendiente de validar:** rentabilidades simples frente a logarítmicas; umbral de 1 año para el CAGR.

### D12. Caché en memoria ✅
TTL por tipo de dato: búsqueda 10 min, metadatos 1 h, último precio 60 s, histórico diario completo 1 h, TER 24 h. En la Fase 2 se añaden las noticias (10 min, ver D25) y desaparece el intradía (ver D19). Los errores no se cachean. Se consulta en `GET /api/health`.
**Motivo:** antes cada ficha hacía 3-4 llamadas a Yahoo, con `info` repetido.

### D13. Tests en tres niveles ✅
| Nivel | Comando (desde `backend/`) | Depende de |
|---|---|---|
| Deterministas (por defecto) | `python -m pytest` | Nada: series sintéticas y proveedor falso |
| Integración Yahoo | `python -m pytest -m integration` | Internet |
| E2E app en marcha | `python -m pytest -m e2e` | Backend + frontend arrancados |

Ningún test depende de si un activo ha subido o bajado. Sustituye a `test_suite.py`.

### D14. Navegación con los 6 módulos ✅
Los 6 módulos aparecen en la barra superior y en Home. Los no desarrollados abren una página "Próximamente" (en pantallas grandes la barra muestra además la etiqueta "Pronto"). Rutas: `/news`, `/markets`, `/strategy-builder`, `/comparison`, `/costs`, `/analyst`. Las rutas desconocidas muestran una página 404.

### D15. Explore Markets: activo en la URL y peticiones cancelables ✅
`/markets?ticker=VOO` abre directamente la ficha; se puede recargar y usar "atrás". Las peticiones obsoletas se cancelan (antes, cambiar rápido de periodo podía mostrar datos del periodo anterior).

### D16. Interfaz en español y formato único es-ES ✅
"Acción" en lugar de "Stock"; periodos 1D, 1S, 1M, 1A, 5A, 10A, Máx.; precios y porcentajes con formato español ("0,03 %"). Los nombres de los módulos se mantienen en inglés como nombres propios del producto.

### D17. Caché de Vite fuera de OneDrive ✅
**Contexto:** OneDrive bloqueaba `frontend/node_modules/.vite` y el servidor no arrancaba (EPERM).
**Decisión:** `cacheDir` en la carpeta temporal del sistema.

---

## Parte IV — Fase 2: Explore Markets completo + News (2026-11-11)

### D18. Universo ampliado a seis tipos de activo ✅ (decisión del equipo)
| quoteType de Yahoo | Tipo en la app | TER |
|---|---|---|
| EQUITY | Acción | No aplica |
| ETF | ETF | Dato real o "No disponible" |
| MUTUALFUND | Fondo | Dato real o "No disponible" |
| INDEX | Índice | No aplica: no se puede comprar directamente |
| CRYPTOCURRENCY | Cripto | No aplica: no es un fondo |
| FUTURE | Futuro | No aplica: es un derivado |

Siguen sin soporte: divisas (CURRENCY), opciones y fondos monetarios. Cada "No aplica" muestra una frase que explica por qué.

Además, cada tipo con particularidades muestra una **nota metodológica**:
- **Índice:** los índices de Yahoo suelen ser de precios, sin dividendos.
- **Cripto:** la volatilidad se anualiza con 365 días.
- **Futuro:** es una serie continua, con saltos en cada cambio de contrato y sin garantías ni intereses.
- **Fondo:** el precio es el valor liquidativo.

### D19. Ventana de análisis y datos diarios ✅
- **Solo datos diarios.** Se eliminan los periodos intradía 1D y 1S: la metodología pide cálculos diarios y el usuario objetivo invierte a largo plazo.
- **Periodos:** 1M, 6M, año actual (desde el 1 de enero), 1A, 5A, 10A, Máx., y fechas personalizadas.
- **Una descarga por activo.** Se descarga una vez el histórico diario completo (`period=max`, `auto_adjust=False`) y cada periodo es un recorte de esa serie.
- **Inicio y fin del análisis:** se usa el **primer cierre disponible en o después** de la fecha inicial y el **último cierre en o antes** de la final. Nunca se crean observaciones para fines de semana o festivos.
- **Fechas:** se usa la fecha local del mercado. Un cierre de Tokio no "salta" al día anterior.
- **Validaciones:**
  - Fecha inicial ≥ final, fecha imposible o fecha inicial futura → error 400 con mensaje.
  - Fecha final futura → se recorta a hoy, con aviso.
  - Fecha inicial anterior al histórico → el análisis empieza el primer día disponible, con aviso.
  - Sin sesiones en el rango, o con 1 sola → estado "sin datos" con explicación, sin métricas.

### D20. Definición de las métricas (mostradas en pantalla) ⏳
Implementadas en `backend/analytics/metrics.py` y probadas con series sintéticas.

| Métrica | Serie | Fórmula | Cuándo no se calcula |
|---|---|---|---|
| Rentabilidad total | Cierre ajustado (dividendos reinvertidos) | P_fin / P_ini − 1 | Menos de 2 cierres |
| Rentabilidad solo por precio | Cierre cotizado (ajustado solo por splits) | P_fin / P_ini − 1 | Menos de 2 cierres |
| CAGR | Cierre ajustado | (P_fin / P_ini)^(1/años) − 1, años = días naturales / 365,25 | **Menos de 365 días naturales** entre el primer y el último cierre |
| Volatilidad anualizada | Rentabilidades simples diarias | desviación típica muestral × √252 (√365 en cripto) | **Menos de 20 rentabilidades diarias** |
| Máximo drawdown | Cierre ajustado | mín(P_t / máx(P_0..P_t) − 1) | Menos de 2 cierres |

Cambio respecto a D11: el umbral del CAGR pasa de "1 año de 365,25 días" a "365 días naturales". Con el anterior, el preset 1A nunca mostraba CAGR.

**Pendiente de validar por el equipo:**
- el mínimo de 20 rentabilidades para la volatilidad;
- rentabilidades simples frente a logarítmicas;
- que un preset 1A cuyo primer día sea festivo (364 días) no muestre CAGR.

### D21. Presentación de las métricas ✅
- Cada métrica tiene un icono **ⓘ** con una explicación sencilla y su fórmula.
- Cuando una métrica no se calcula, se muestra "—" con el motivo.
- La interfaz dice "valor ajustado" y "cierre cotizado", nunca "precio histórico" a secas. Un bloque desplegable explica qué es el ajuste por dividendos y splits.

### D22. Sistema visual y mascota ✅
- **Paleta:** azul marino (#0B1330) e índigo eléctrico (#4B5BF6 → violeta #8B5CF6). Menta (#0E9F6E) para subidas y coral (#E5484D) para bajadas.
- **Tipografía:** Plus Jakarta Sans con cifras tabulares.
- **Cabeceras oscuras** en cada módulo.
- **Capi:** mascota original en SVG (una moneda con un brote, que simboliza el ahorro que crece con paciencia). Explica cada página y respeta `prefers-reduced-motion`.

### D23. Fuente de noticias: Google News RSS + feeds oficiales ⏳
**Alternativas estudiadas** (comprobadas el 2026-11-11):

| Fuente | Resultado |
|---|---|
| Google News RSS (búsqueda, edición España) | ✅ Funciona sin clave; da titular, medio y fecha; permite búsqueda libre |
| BCE (`ecb.europa.eu/rss/press.html`) | ✅ RSS oficial |
| Fed (`federalreserve.gov/feeds/press_monetary.xml`) | ✅ RSS oficial |
| Expansión RSS | ⚠ Funciona, pero los titulares son de sección ("EMPRESAS") |
| Cinco Días RSS | ⚠ La portada mezcla noticias generales de El País |
| elEconomista RSS | ❌ HTTP 403 (bloquea lectores automáticos) |
| Scraping de webs | ❌ Descartado por la regla del proyecto |

**Decisión:** Google News RSS para la portada, las categorías y el buscador, más los feeds oficiales del BCE y la Fed para "Bancos centrales".

**Qué se muestra:** solo titular, medio, fecha y enlace. La descripción de Google News no se usa porque es HTML sin resumen. Las descripciones de los feeds oficiales se muestran recortadas a 220 caracteres.

**Pendiente de validar por el equipo:**
- **Condiciones de uso:** no hemos encontrado unos términos oficiales actuales de Google sobre su RSS. Fuentes secundarias indican uso no comercial y con atribución a Google News y al medio, que es lo que hace la app.
- **Consentimiento de Google:** en la UE, los enlaces de Google News pasan antes por su pantalla de consentimiento de cookies. Se avisa en la página.

### D24. Categorías por búsqueda temática ✅
Cada categoría (Mercados, Economía, Bancos centrales, Empresas, Inversión, ETFs) es una búsqueda de Google News con palabras clave de la última semana. La categoría es "de qué búsqueda viene", **no una clasificación del texto**: es simple y explicable, pero puede colar alguna noticia poco relacionada.

En la categoría ETFs se excluyen las noticias de criptomonedas, que dominaban los resultados.

### D25. Robustez de News ✅
- Timeout de 4 s de conexión y 6 s de lectura, y descargas en paralelo.
- Caché de 10 minutos por fuente.
- Si una fuente falla, se sirve su **último contenido real descargado** (máx. 6 h), marcado como no actualizado.
- Si fallan todas, el backend devuelve un 503 y la interfaz muestra un mensaje claro con "Reintentar".
- Nunca se muestran noticias inventadas ni de relleno.
- Solo se aceptan enlaces http/https y se descartan las noticias sin fecha válida.

---

## Parte V — Fase 3: Strategy Builder (2026-11-12)

### D26. Modelo de datos de una estrategia ✅
```text
strategy
- id               identificador único (UUID); una copia tiene su propio id
- name             1-40 caracteres, único sin distinguir mayúsculas
- initialCapital   número > 0 y ≤ 1.000.000.000, máx. 2 decimales (null = vacío o no válido)
- baseCurrency     'EUR' (divisa del capital; preparado para convertir divisas)
- assets[]
    - ticker, name, assetType, currency, exchange
    - weight       PESO OBJETIVO en % (12,5 = 12,5 %), máx. 2 decimales (null = vacío o texto)
- createdAt, updatedAt
```
- **Motivo:** es lo mínimo que necesitan Strategy Comparison (tickers, pesos, capital, divisas) y Cost Analysis (tipo de activo para saber si tiene TER). No se guardan precios ni métricas: se calcularán en su fase.
- **Pesos en % y no en fracción:** coinciden con lo que escribe el usuario.
- **Sumas en centésimas enteras:** con números decimales, 33,33 + 33,33 + 33,34 da 99,99999… en JavaScript; en centésimas, la suma es exactamente 100.
- **Aportaciones periódicas y rebalanceo:** no se incluyen todavía. El formato guardado lleva un número de versión, así que podrán añadirse migrando los datos, sin rehacer el modelo.

### D27. Reglas de validación ✅ (sin correcciones automáticas)

| Campo | Válido | Mensajes de error |
|---|---|---|
| Peso | > 0 %, ≤ 100 %, máx. 2 decimales | vacío, texto, negativo, 0 %, > 100 %, demasiados decimales |
| Suma de pesos | exactamente 100 % | «85 % asignado — queda 15 %» / «108 % asignado — debes reducir 8 %» |
| Capital | > 0 € y ≤ 1.000 millones, máx. 2 decimales | vacío, texto, negativo, cero, demasiado grande, decimales |
| Nombre | 1-40 caracteres | vacío, demasiado largo, duplicado |

- **Formato español:** se acepta «12,5», «10.000» y «10.000,50». Ojo: «10.000» se interpreta como diez mil, no como diez.
- **El usuario mantiene el control:** la app nunca corrige, redondea ni redistribuye pesos. Al eliminar un activo, los demás pesos no cambian.
- **Una estrategia está «lista para comparar»** solo si tiene activos, todos los pesos son válidos, suman 100 % y el capital es válido.
- **Nombres duplicados: no se permiten.** Hay que distinguir cada estrategia al compararlas. Las copias se llaman «X — copia», «X — copia 2»…
- **Límites:** 20 estrategias y 25 activos por estrategia, para que la interfaz siga siendo legible y las comparaciones razonables.

### D28. Capital por defecto de 10.000 € ⏳
Las estrategias nuevas empiezan con 10.000 € para que el usuario vea enseguida el reparto en euros de cada peso. Es un valor de partida editable, no una recomendación. **Pendiente de validar por el equipo.**

### D29. Añadir activos reutilizando Explore Markets ✅
- Se usan la misma búsqueda (`/api/markets/search`), la misma clasificación de tipos y el mismo tratamiento de errores.
- Al pulsar «Añadir» se hace **una** llamada a `/api/markets/quote/{ticker}`, porque la búsqueda de Yahoo no devuelve la divisa. Esa llamada también confirma que el activo existe y está soportado. El backend la tiene en caché.
- Se admiten los 6 tipos de activo. Índices y futuros llevan la etiqueta «No invertible directamente» con su explicación; cómo tratarlos en la simulación se decidirá en Strategy Comparison.

### D30. Persistencia en localStorage ✅
- Clave `isl.strategies`, con formato `{ version: 1, activeId, strategies }`.
- Se guarda tras cada cambio.
- Al leer se validan los datos: se descartan entradas dañadas o duplicadas y se respetan los límites.
- Si los datos no se pueden leer, se guarda una copia en `isl.strategies.corrupt`, se empieza de cero y se avisa al usuario.
- Si el navegador bloquea el almacenamiento, la app funciona igualmente y avisa de que no se guardará nada.
- Sin base de datos, sin login y sin cuentas. Las estrategias **solo existen en ese navegador**.

### D31. Estado compartido con React Context ✅
Las estrategias viven en `StrategiesProvider`, que envuelve toda la aplicación. Cualquier módulo puede leerlas con `useStrategies()`. No se añade Redux ni otras dependencias.

### D32. Interfaz del Strategy Builder ✅
- **Navegación entre estrategias:** lista lateral de tarjetas con nombre, nº de activos, capital, punto de estado y mini barra de composición. En móvil se convierte en una fila desplazable.
- **Editor:** muestra siempre «Estás editando» y el nombre de la estrategia.
- **Composición:** gráfico donut con la parte sin asignar en gris. Si la suma supera el 100 %, el gráfico muestra proporciones relativas y lo indica.
- **Sin métricas inventadas:** solo el número de activos, la composición y las divisas. No hay «puntuación de diversificación».
- **Capi:** un único mensaje en la cabecera.
- **Borrado:** eliminar una estrategia pide confirmación; eliminar un activo es inmediato.

### D33. Herramientas de test del frontend ✅
- **Vitest** para los tests unitarios del modelo y la persistencia.
- **Playwright** para los E2E, usando el **Microsoft Edge ya instalado** (`channel: 'msedge'`), sin descargar navegadores.
- Las carpetas temporales de ambas herramientas están fuera de OneDrive.

---

## Parte VI — Fase 4: Strategy Comparison (2026-11-12)

### D34. Divisa base EUR con tipos de cambio diarios de Yahoo ⏳
**Contexto:** las estrategias tienen el capital en euros y pueden mezclar activos en EUR, USD, GBP… Mezclar rentabilidades en distintas monedas como si fueran equivalentes es incorrecto.

**Decisión:** todo el backtest se hace en **euros**.
- **Fuente FX:** Yahoo Finance, pares `EUR{DIVISA}=X` (p. ej. `EURUSD=X` = dólares por 1 €), cierre diario.
- **Fórmula:** precio_EUR(t) = precio_local(t) × factor ÷ EUR/divisa(t). El factor es 0,01 para cotizaciones en céntimos (peniques `GBp`).
- **Fecha:** se usa el tipo de cambio del mismo día que el precio. Si ese día no hay tipo de cambio, el día no se usa.
- **Impacto:** el resultado incluye el **efecto divisa** que vive un inversor en euros. Por eso puede diferir de la rentabilidad en dólares de Explore Markets, y la interfaz lo explica.
- **Limitaciones:**
  - El tipo de cambio de Yahoo es del cierre de Londres y la bolsa de EE. UU. cierra más tarde; es un desfase pequeño.
  - `EURUSD=X` empieza el 01/12/2003, así que una cartera con activos en USD no puede empezar antes.
  - Si no existe el par de una divisa, el activo no se puede comparar y se avisa.

**Comprobación:** en un test de integración, 100 % VOO en euros coincide exactamente con (variación de VOO en USD) × (variación inversa del EUR/USD).

**Pendiente de validar por el equipo:** usar EUR como base fija y Yahoo como fuente FX.

### D35. Periodo común e intersección de fechas ✅
- Solo se usan los días en los que **todos** los activos de **todas** las estrategias seleccionadas, y sus tipos de cambio, tienen cierre: una intersección de fechas.
- **Nunca se rellenan precios** (sin forward-fill) ni rentabilidades.
- Un festivo de un mercado elimina ese día para todas las estrategias. La variación hasta el siguiente día común recoge todo lo ocurrido, así que la rentabilidad total no cambia.
- El inicio es la fecha más tardía en la que empiezan los datos de cualquier activo o tipo de cambio. La app indica **qué activo lo limita** (p. ej. «IBIT no tiene datos antes» o «el tipo de cambio EUR/USD»).
- **Todas las estrategias se comparan exactamente en las mismas fechas.** Comparar con más estrategias puede acortar el periodo común.
- **Periodos:** 1A, 3A, 5A, 10A, máximo común o fechas personalizadas, con las mismas validaciones que Explore Markets (D19).
- **Anualización de la volatilidad:** √365 si el calendario común incluye fines de semana (solo cripto en euros); si no, √252.

### D36. Buy & hold sin rebalanceo ✅
- **Inicio:** participaciones_i = capital × peso_i ÷ precio_i(t₀).
- **Evolución:** valor(t) = Σ participaciones_i × precio_i(t).
- **Se trabaja con participaciones teóricas** (pueden ser fraccionarias). No se modelan títulos enteros.
- **Los pesos derivan con el mercado.** Se muestran los pesos finales junto a los iniciales.
- El rebalanceo periódico queda como ampliación futura.

### D37. Precios ajustados, dividendos y costes ✅
- Se usa el cierre ajustado, como en Explore Markets: incluye splits y dividendos reinvertidos. **No se suman dividendos aparte.**
- **No se resta el TER:** el precio o valor liquidativo de un ETF o fondo ya lo descuenta.
- **No se aplican comisiones** del intermediario: quedan para Cost Analysis.
- Así se evita contar dos veces los dividendos o el TER.

### D38. Métricas de la comparación ✅
Son las mismas funciones que en Explore Markets (D20), aplicadas al valor diario de cada estrategia:
- rentabilidad acumulada;
- CAGR (solo con al menos 365 días);
- volatilidad anualizada (con al menos 20 variaciones);
- máximo drawdown (con fechas);
- valor final en euros;
- número de activos;
- **mayor peso inicial**, como medida objetiva de concentración.

Por activo se muestran el peso inicial, el peso final y la rentabilidad en euros.

**No se calculan** correlaciones ni un índice de diversificación, ni mejor o peor año: añadirían complejidad sin aportar claridad en esta fase.

**Coherencia comprobada:** una estrategia con un único activo en euros da exactamente las mismas métricas que Explore Markets en el mismo periodo.

### D39. Presentación sin rankings ✅
- El gráfico principal muestra la **evolución de cada 100 € invertidos** (base 100), porque las estrategias pueden tener capitales distintos. El tooltip muestra también el valor real en euros.
- Debajo, un gráfico sincronizado de caída desde máximos.
- La leyenda permite ocultar estrategias.
- La tabla respeta el orden de las estrategias del Strategy Builder: **no se ordena por resultado ni se marca ninguna como «mejor» o «recomendada»**. La interpretación corresponde al AI Strategy Analyst.

### D40. Selección de estrategias ✅
- Se pueden comparar de **2 a 6 estrategias** a la vez, para que el gráfico siga siendo legible con colores distinguibles.
- Las estrategias no válidas (sin activos, pesos que no suman 100 % o capital no válido) no se pueden seleccionar: se explica qué falta y se ofrece «Editar», que abre el Strategy Builder con esa estrategia.
- La selección y el periodo se recuerdan en el navegador (`isl.comparison`). **Las estrategias siguen viviendo solo en el Strategy Builder:** la comparación siempre usa su versión actual.
- El backend vuelve a validar todo: pesos, capital, activos y datos.

### D41. Arquitectura del backtest ✅
| Capa | Archivo |
|---|---|
| Datos | `services/data_provider.py` (sin cambios; caché) |
| Cálculo puro | `analytics/portfolio.py` (divisas, alineación, buy & hold, pesos finales, base 100) + `analytics/metrics.py` |
| Orquestación | `services/backtest_service.py` (validación, FX, periodo común, respuesta) |
| Ruta | `routers/comparison.py`: `POST /api/comparison/backtest` |

---

## Parte VII — Fase 5: Cost Analysis (2026-11-12)

### D42. Separar costes del producto y costes del intermediario; el TER no se resta ✅
- **Costes del producto (TER):** se muestran como información, con la etiqueta «ya reflejados en el precio histórico». El precio ajustado de un ETF o fondo ya descuenta su TER cada día, así que **restarlo otra vez sería contarlo dos veces**.
- **TER:** dato de Yahoo Finance si es válido; si no, «No disponible»; para acciones, cripto, índices y futuros, «No aplica» con su explicación (reglas de D9). No se ha incorporado ninguna fuente oficial de emisor en esta fase.
- **Costes del intermediario:** comisión de compra, comisión de venta, cambio de divisa, custodia y mantenimiento. Son los únicos que se restan.
- **Terminología:** «Resultado histórico antes / después de costes del intermediario». No se usa «rentabilidad bruta», porque el precio ya es neto de TER.

### D43. Coherencia con buy & hold: una compra por activo ✅
- Mismo backtest y misma ventana que Strategy Comparison (se reutiliza `backtest_service.prepare_window`). El «resultado antes de costes» coincide con el valor final de la comparación; lo comprueba un test.
- Una única compra inicial por activo. Sin rebalanceos, aportaciones ni ventas intermedias.
- **Compra y divisa iniciales se pagan con el capital:** se invierte capital × peso − costes, y esa diferencia tampoco se revaloriza. Por eso el «impacto» (antes − después) es algo mayor que lo pagado, y la interfaz lo explica.
- **Custodia y mantenimiento** se restan del resultado final por su importe nominal. No se modela el coste de oportunidad de lo que se va pagando: es una simplificación.

### D44. Costes durante la inversión y coste estimado de salida, por separado ✅
- «Costes durante la inversión» = compras + divisa de compra + custodia + mantenimiento.
- «Coste estimado de salida» = comisión de venta + divisa de venta, calculado sobre el valor final de cada posición. Se muestra aparte, con su «resultado tras la salida». Nunca se suma sin avisar a lo ya incurrido.

### D45. Dataset de tarifas versionado, sin scraping ⏳ (ampliado en D57)
- `backend/data/broker_fees.json` (versión 2026-11-12). Cada intermediario lleva fuente, URL, fecha del documento, fecha de consulta, plan modelado, notas y lo que **no** se modela. Detalle en [[Datos y fuentes]] §7.
- **Incluidos:**
  - ING Broker Naranja, Tarifa Base (PDF oficial de 10/2026);
  - MyInvestor, tarifa estándar (página oficial);
  - Trade Republic, órdenes individuales (lista de precios oficial 04/2023).
- **Excluido:** Revolut, porque sus tarifas dependen del plan y del volumen mensual y no se pudieron fijar con una fuente oficial clara.
- Las tarifas no están en el código ni en React; el frontend las pide a `GET /api/costs/brokers`.
- **Pendiente de validar por el equipo:** la selección de intermediarios y que la lista de Trade Republic (04/2023) sea aceptable como fuente.

### D46. Modelo de comisiones flexible pero sencillo ✅
- **Regla de comisión:** fijo + porcentaje × importe, y después mínimo, máximo y un **tope condicionado al importe** (ING: «no supera 20 € si la operación es de menos de 50.000 €»).
- **Divisa de los importes fijos:** los importes fijos en otra divisa (3 $, 3 £) se convierten con el tipo de cambio de ese día.
- **Cómo se elige la regla:** igual para todo (`flat`), por tipo de instrumento (`by_instrument`), por mercado (`by_market`) o distinta para compra y venta.
- **Mercado:** se deduce del sufijo de Yahoo y de la divisa:
  - `.MC` → España;
  - `.DE .PA .AS .MI…` → zona euro;
  - `.L` → Reino Unido;
  - `.ST` → Suecia;
  - sin sufijo y en USD → EE. UU.;
  - cualquier otro caso → «otros mercados».
- **Instrumentos sin tarifa:** si un intermediario no cubre un tipo de activo (cripto, índices, futuros, fondos), su coste no se calcula y el escenario se marca **«Datos incompletos»**. No se inventa.

### D47. Divisa y custodia con su regla real ⏳
- **Cambio de divisa:** se cobra solo si el activo no cotiza en euros **y** la tarifa del intermediario lo publica. Se aplica al importe convertido en la compra y en la venta estimada. Trade Republic no publica comisión de cambio en su lista, así que no se aplica ninguna.
- **Custodia de ING (por trimestre natural):**
  - 4 € por valor + IVA (21 %) en cada trimestre natural **sin operaciones**, prorrateado por días;
  - máximo de 49,59 € + IVA por cuenta;
  - el trimestre de la compra inicial no se cobra, porque hubo operación;
  - con buy & hold no hay más operaciones, así que se cobran todos los demás trimestres, incluido el último (prorrateado).
- **Custodia personalizada:** porcentaje anual sobre el valor de la cartera al cierre de cada trimestre, cobrado por cuartos y prorrateado por días. Un año completo equivale exactamente al porcentaje anual.
- **Mantenimiento personalizado:** cuota anual repartida por trimestres y prorrateada.
- **Pendiente de validar por el equipo:** la interpretación de la custodia de ING, sobre todo cobrar el último trimestre aunque una venta al final lo dejaría a 0 € y aplicar el IVA al máximo por cuenta.

### D48. Escenarios y presentación sin «mejor» ✅
- **Escenarios:** sin costes de intermediación (referencia), cada intermediario del dataset y «Costes personalizados» (datos del usuario, validados: 0–10 % y 0–1.000 €; mantenimiento hasta 10.000 €/año).
- **Orden fijo:** referencia, intermediarios por orden alfabético y personalizado. Nada se ordena por coste ni se marca como mejor o recomendado.
- **Escenario inicial:** 🔁 sustituido en D58 (ahora no hay ninguno por defecto: «Selecciona intermediario»).
- **Cifras:** en € y en % del capital; en el desglose, también en % del valor final.
- **Gráfico de impacto:** barras horizontales en una escala común que **empieza en 0 €**, para no exagerar diferencias pequeñas, con la cifra exacta al lado.
- **Comparación de intermediarios:** una estrategia elegida se muestra bajo todos los escenarios.
- **Configuración guardada:** selección, periodo, escenario y costes personalizados se recuerdan en `isl.costs`.

### D49. Arquitectura de Cost Analysis ✅
| Capa | Archivo |
|---|---|
| Datos | `backend/data/broker_fees.json` |
| Cálculo puro | `analytics/costs.py` (reglas de comisión, mercado, divisa, trimestres, custodia, mantenimiento, resultado neto y salida) |
| Orquestación | `services/cost_service.py` (reutiliza la ventana de `backtest_service`, tipos de cambio, escenario personalizado, TER) |
| Rutas | `routers/costs.py`: `GET /api/costs/brokers`, `POST /api/costs/analyze` |
| Frontend | `features/costs/` (`CostAnalysis`, `ScenarioPicker`, `CostResults`, `model.js`, `tips.jsx`) y `api/costsApi.js` |

---

## Parte VIII — Fase 5.1: aportaciones periódicas y ampliación de intermediarios (2026-11-12)

### D50. Aportaciones periódicas por activo, opcionales ✅
- **Modelo:** cada estrategia tiene `recurringContributions: [{ id, ticker, amount, frequency }]`. El campo es opcional: las estrategias guardadas antes se cargan con `[]` y no cambian.
- **Activo:** cada aportación compra **solo** el activo elegido, que debe formar parte de la estrategia. No se reparte según los pesos iniciales, así que los pesos efectivos evolucionan.
- **Varias aportaciones:** se permiten varias por estrategia, también al mismo activo con frecuencias distintas (p. ej. 100 €/mes y 1.000 €/año). Repetir activo y frecuencia se rechaza, porque se puede cambiar el importe.
- **Capital inicial 0:** se admite solo si hay alguna aportación. La estrategia empieza a existir con la primera aportación ejecutada.
- **Eliminar un activo** elimina también sus aportaciones. Si llega una aportación a un activo que no está (datos antiguos o la API), se marca como no válida.
- **Validaciones:**
  - importe mayor que 0 € y como máximo 1.000.000 €, con 2 decimales;
  - número (no vacío ni texto);
  - frecuencia válida;
  - activo existente;
  - como máximo 25 aportaciones.
  El backend vuelve a validarlo todo.

### D51. Frecuencias: mensual, trimestral y anual ✅
Se ofrecen las tres que pedía la especificación. No se añaden frecuencias más complejas (semanal, días concretos): aportarían poco y complicarían el calendario.

### D52. Calendario de ejecución sin inventar precios ✅
- La primera aportación es **un periodo después** del primer día común; el capital inicial se invierte el día 0.
- **Fechas teóricas:** la misma fecha cada 1, 3 o 12 meses desde el inicio. Si ese día no existe en el mes, se usa el último día del mes (31-ene → 28/29-feb).
- **Días sin mercado:** si la fecha teórica no es día de cotización común, se ejecuta el **primer día común posterior**. Si ya no queda ninguno dentro del periodo, no se ejecuta.
- **Precio:** se compra al cierre ajustado en euros de ese día. Nunca se rellena ni se interpola un precio.
- **Participaciones:** teóricas y fraccionarias, igual que en D36. No se redondea a títulos enteros.
- **Periodo demasiado corto:** si ninguna aportación cae dentro, se avisa. Si además el capital es 0, la estrategia no se puede simular y se explica por qué.

### D53. Rentabilidad con aportaciones: TWR, nunca valor final ÷ capital ✅
- Una aportación es un **flujo externo**, no rentabilidad. Con aportaciones, «valor final ÷ capital inicial» sería incorrecto.
- **Rentabilidad ponderada por el tiempo (TWR, cartera unitizada):**
  - cada día, r_t = (V_t − aportación_t) / V_{t−1} − 1;
  - el índice encadena esas variaciones en base 100.
- **Métricas sobre el índice TWR:** rentabilidad acumulada, CAGR, volatilidad y máxima caída. El gráfico de «cada 100 € invertidos» también es este índice.
- **Sin aportaciones** coincide exactamente con el método anterior; lo comprueba un test.
- **Cifras en euros que se muestran aparte:** capital inicial, aportaciones (número e importe), total aportado, valor final y ganancia o pérdida (valor final − total aportado).
- **Comprobaciones:**
  - con precio plano y aportaciones, el valor sube pero la rentabilidad es 0 %;
  - con +10 %, una aportación y otro +10 %, la TWR es 21 %.
- **MWR / XIRR:** no se implementa. Necesitaría resolver una ecuación iterativa con casos sin solución única, y añadiría complejidad sin hacer falta para no confundir aportaciones con rentabilidad. Queda como posible ampliación.

### D54. Cada aportación es una operación con su coste ✅
- El motor de costes trabaja con **operaciones fechadas**: la compra inicial de cada activo y cada aportación ejecutada.
- **Comisión y divisa:** cada compra paga su comisión y, si el activo no cotiza en euros y la tarifa lo publica, su cambio de divisa. Ese dinero no se invierte. Por ejemplo, 300 €/mes durante 5 años son 60 compras, y con 1 € por compra, 60 €.
- **Reglas propias de las tarifas oficiales:**
  - franquicia de órdenes gratuitas al mes (Revolut Premium: 5);
  - compras de planes de inversión sin comisión (Trade Republic en acciones y ETF; Revolut en ETF);
  - franquicia mensual de cambio de divisa (Revolut Estándar: 1.000 €).
- **Custodia:** se calcula sobre el patrimonio de cada día, que crece con las aportaciones:
  - **ING:** el trimestre con alguna compra no paga custodia. Con aportaciones mensuales o trimestrales, la custodia desaparece.
  - **Bancos con porcentaje:** % sobre la media del valor de cada clase de valor en el periodo, con mínimo, prorrateado por los días en cartera.
  - **Bankinter:** sin mínimo para ETF con compra periódica, como indica su tarifa.
- **Resultado antes de costes:** coincide con el valor final de Strategy Comparison, también con aportaciones; lo comprueba un test.

### D55. Tramos por importe, mercado internacional y cobertura ✅
- **Tramos:** el motor admite tramos de comisión por importe, cada uno con fijo, porcentaje y máximo. La divisa del **umbral** (p. ej. 40.000 $ en Bankinter) va separada de la de la **comisión** (20 €). El límite de cada tramo es inclusivo («hasta 2.000 €»).
- **Reglas por mercado:**
  - una regla «INTERNATIONAL» para todo lo que no es España (Santander, CaixaBank);
  - reglas por mercado concreto (Bankinter, ING).
- **Cobertura:** si un intermediario no cubre el tipo de activo o el mercado, la estrategia se marca **«Datos incompletos»** con el motivo.

### D56. Entidad + perfil tarifario ⏳
- El dataset representa **entidad + perfil** y no mezcla perfiles. Por ejemplo, BBVA tiene dos registros: «Tarifa ETF 0,15 %» y «Tarifa joven <30».
- **Revolut:** no hay una tarifa genérica «Revolut». Se incluyen los planes Estándar y Premium.
- **Cuota del plan Premium:** 9,99 €/mes se cuenta entera como mantenimiento, aunque incluye otros servicios bancarios.
- **Pendiente de validar por el equipo:** los perfiles elegidos y el tratamiento de la cuota de Premium.

### D57. Intermediarios incorporados y aproximaciones ⏳
Diez perfiles con fuente oficial y fecha de consulta 12/11/2026 (detalle en [[Datos y fuentes]] §7):
- **Santander, «Tarifa online»:** compraventa de la web oficial. La custodia es la del folleto de **tarifas máximas** y se indica así en la app. Los impuestos sobre la custodia no se modelan.
- **CaixaBank, tarifa estándar sin pack:** la custodia se calcula sobre el **valor nominal**, que no está disponible, así que solo se aplica el mínimo por clase de valor y semestre. Es una estimación por defecto y la app lo indica.
- **Bankinter, tarifa sin Bróker Cero:** acciones y ETF no promocionados, cambio de divisa ±1 %, y custodia trimestral con mínimo, sin mínimo para ETF con compra periódica.
- **ING Broker Naranja:** sin cambios.
- **BBVA, dos perfiles:** «Tarifa ETF 0,15 %» (solo ETF) y «Tarifa joven» (<30 años, 0,99 €). La tarifa de acciones del perfil estándar (folleto de BBVA Trader) no se pudo consultar: el PDF oficial devuelve 403.
- **MyInvestor:** sin cambios.
- **Trade Republic:** fuente actualizada a la web oficial (es-es):
  - 1 € por operación;
  - planes de inversión sin cargo;
  - la lista de 04/2023 queda como fuente secundaria.
- **Revolut, plan Estándar:** 1 € por orden; ETF en planes sin comisión; divisa 1 % por encima de 1.000 €/mes.
- **Revolut, plan Premium:** 5 órdenes gratuitas al mes; sin comisión de divisa; cuota como mantenimiento.

**No incluidos:**
- packs de CaixaBank;
- Servicio Bróker Cero y ETF promocionados de Bankinter;
- tarifa reducida de ING;
- Premium de MyInvestor.

**Pendiente de validar por el equipo:**
- la tarifa máxima de custodia de Santander;
- la estimación mínima de CaixaBank;
- que el cambio de divisa de Bankinter («diferencial ±1 %») se trate como comisión;
- que las aportaciones a ETF en Revolut cuenten como plan de inversión.

### D58. Selector sin intermediario por defecto y agrupado ✅
- **Estado inicial:** «Selecciona intermediario». No se calcula ningún coste hasta que el usuario elige; sustituye a D48.
- **Grupos:**
  - «Bancos tradicionales»;
  - «Brokers y bancos digitales»;
  - «Referencia y datos propios»: sin costes de intermediación y costes personalizados.
- **Orden:** alfabético dentro de cada grupo. Ningún grupo ni intermediario se marca como mejor.
- **Comparación de intermediarios:** muestra el número de compras de la estrategia y las comisiones de compra. Así se ve que una comisión por operación pesa poco en buy & hold y mucho más con aportaciones; la interfaz lo explica con una nota.

---

## Parte IX — Fase 6: AI Strategy Analyst (2026-11-12)

> 🔁 **Experimento construido y posteriormente descartado por decisión humana** (Fase 8.1, D80). Las decisiones D59–D69 se conservan como historia; su código ya no forma parte del producto.

### D59. Función del analista: interpretar, no calcular ✅
- La IA no es fuente de datos.
- **Todas las cifras** (rentabilidad TWR, CAGR, volatilidad, máxima caída, valores, aportaciones, costes, TER) salen de los motores existentes: `backtest_service.run_comparison` y `cost_service.analyze`, con la misma ventana y los mismos datos que ve el usuario.
- **Lo que hace el modelo:** explica diferencias, riesgos, costes y trade-offs, y no declara un ganador.
- **Lo que no hace:**
  - no predice;
  - no recomienda instrumentos ni da órdenes;
  - no usa noticias ni datos externos (News queda fuera, a propósito).

### D60. Proveedor desacoplado: Claude con el SDK oficial 🔁 (sustituida por D67)
- **Interfaz única:** `AIProvider.generate(system, user, schema) -> texto`.
- **Implementación:** `AnthropicProvider` en `ai/provider.py`, el **único** archivo que importa el SDK `anthropic` (un test lo comprueba).
- **Petición:**
  - modelo por defecto `claude-opus-5-5` (cambiable con `AI_MODEL`);
  - salida estructurada con esquema JSON;
  - `effort: medium`;
  - *fallback* automático del servidor si el modelo declina por sus filtros de seguridad.
- **Cambiar de proveedor** = añadir otra clase con la misma interfaz y elegirla con `AI_PROVIDER`.
- **Pendiente de validar por el equipo:** el modelo por defecto (afecta al coste por análisis).

### D61. API key solo por variable de entorno 🔁 (ya no hace falta ninguna clave: D67)
- `ANTHROPIC_API_KEY`, en el entorno del servidor o en `backend/.env`. `.env` está en `.gitignore`; `.env.example` va sin clave.
- La clave nunca está en el frontend, en el código, en el repositorio ni en Obsidian. `/api/analyst/status` nunca la devuelve.
- **Sin clave:** la app muestra «El analista IA no está configurado en este entorno», enseña solo las cifras calculadas y **no genera ningún texto de análisis falso**.

### D62. Input estructurado y mínimo ✅
- `ai/analyst_input.py` construye un JSON compacto:
  - periodo efectivo y notas de metodología;
  - por estrategia: capital, aportaciones, total aportado, valor final, ganancia, métricas, número de activos, mayor peso y composición;
  - costes del intermediario elegido (compras iniciales y periódicas, divisa, custodia, mantenimiento, salida, avisos) y un resumen del resto de intermediarios;
  - TER por activo;
  - perfil.
- **No se envía:** HTML, páginas, archivos del proyecto, documentación, historial ni datos personales. Solo cifras de la simulación, los nombres de estrategia y activo, y el perfil educativo.
- **Datos ausentes** (p. ej. CAGR en periodos de menos de un año) van como `null` con su motivo. El prompt obliga a decir que no están disponibles.

### D63. Prompt versionado y respuesta estructurada ✅
- **Prompt:** archivo `ai/prompts/analyst_system_v1.md` (`PROMPT_VERSION = analyst-v1`). Incluye rol, datos disponibles, reglas (no inventar, no recalcular, no predecir, no asesorar, explicar trade-offs, TER ya reflejado, aportaciones ≠ rentabilidad, sin noticias) y respuesta en español y texto plano.
- **Respuesta (JSON con esquema fijo):** `summary`, `key_tradeoffs` (3-5), `risk_analysis`, `cost_analysis`, `contributions_note`, `profile_context`, `educational_notes` (≤ 3), `limitations`, `strategy_notes`.
- **Presentación:** la controla el frontend. El texto se muestra como texto plano: nunca se renderiza HTML del modelo.

### D64. Guardrails y seguridad de cifras ⏳
- Se **rechaza** la respuesta (con opción de reintentar) si:
  - no es JSON válido, le faltan apartados o los tipos no son los esperados;
  - menciona estrategias que no existen;
  - contiene recomendaciones directas («debes comprar», «te recomiendo», «deberías», imperativos como «Compra…» al inicio de frase, «la mejor opción»);
  - contiene predicciones («subirá», «va a subir», «rendirá»…).
- **Porcentajes no verificados:** los porcentajes del texto se contrastan con los datos enviados (tolerancia de 0,06 puntos). Si alguno no coincide, se avisa: «las cifras fiables son las de las tarjetas».
- **Cifras principales:** se pintan siempre desde los datos, en tarjetas, fuera del texto generativo.
- **Limitación:** los patrones son una red de seguridad, no una garantía, porque el modelo es probabilístico.
- **Pendiente de validar por el equipo:** la lista de expresiones prohibidas y la tolerancia de cifras.

### D65. Perfil educativo opcional ✅
- **Tres campos opcionales:**
  - horizonte: corto <3 años, medio 3-10, largo >10;
  - tolerancia a caídas: baja, media, alta;
  - prioridad: preservar capital, equilibrio, crecimiento, minimizar costes.
- No es un test MiFID ni de idoneidad. Solo contextualiza («Has indicado una tolerancia baja a caídas; durante el periodo analizado, X tuvo una caída máxima menor»), nunca recomienda.
- Se recuerda en el navegador (`isl.analyst`).

### D66. Generación bajo demanda, caché y errores ✅
- **Bajo demanda:** la API se llama solo al pulsar «Generar análisis». Cambiar un dato marca el análisis como desactualizado, sin llamar.
- **Caché:**
  - en el servidor: 1 h, 50 entradas, con clave = datos + perfil + versión del prompt + modelo;
  - en el navegador: para la sesión.
  - Los errores no se cachean.
- **Errores:**
  - tiempo agotado → 504;
  - red, límite de uso, error del servicio o rechazo del modelo → 502 «ai_unavailable»;
  - respuesta no válida o bloqueada → 502 «ai_invalid_response».
  - En todos los casos, mensaje claro y botón «Reintentar»; nunca una página en blanco.
- **Estrategias:** se admite analizar 1 sola (Comparison sigue exigiendo 2).

---

## Parte X — Fase 6.1: AI Strategy Analyst local con LM Studio (2026-11-12)

### D67. Anthropic API → LM Studio local ✅ (decisión del equipo)
- **Contexto:** la Fase 6 se construyó con la API de Claude (D60–D61), que es de pago y necesita una API key. Antes de aprobarla, el equipo decidió no depender de ninguna API de pago.
- **Decisión:** el proveedor activo es **LM Studio**, que ejecuta un modelo local en el ordenador del usuario y expone una API compatible de chat completions. Es gratuito y no necesita API key.
- **Motivos:**
  - evitar costes de API;
  - no requerir claves;
  - más privacidad;
  - mantener la arquitectura desacoplada;
  - facilitar un desarrollo académico gratuito.
- **Qué se mantiene:** la función del analista (D59), el input estructurado (D62), la respuesta estructurada (D63), los guardrails (D64), el perfil (D65) y la generación bajo demanda con caché (D66).
- **Historia:** la etapa con Anthropic (V0.8) queda documentada como parte de la evolución del proyecto.

### D68. Proveedor desacoplado y sin *fallback* de pago ✅
- **Interfaz `AIProvider`:** `status()` y `generate(system, user, schema)`. `LMStudioProvider` es la única clase que conoce LM Studio (un test lo comprueba).
- **Sin *fallback*:** no existe ningún *fallback* automático a Anthropic, OpenAI, Groq, Gemini ni otro servicio en la nube. Si LM Studio falla, se muestra un error con «Reintentar».
- **Ampliación futura:** un `CloudProvider` se añadiría con la misma interfaz y se elegiría con `AI_PROVIDER`, sin tocar Strategy Comparison, Cost Analysis, los modelos financieros ni el frontend.

### D69. Estados del analista local y modelo configurable ✅
- **Estados:**
  - `ready`;
  - `server_down`: «Inicia LM Studio y su servidor local»;
  - `no_model`: LM Studio en marcha sin modelo cargado;
  - `model_not_found`: `LMSTUDIO_MODEL` no está en LM Studio;
  - `disabled`: `AI_PROVIDER=none`.
  El estado se comprueba con `GET /v1/models` (3 s de espera máxima).
- **Modelo:**
  - no hay ninguno fijado en el código: `LMSTUDIO_MODEL` o, si está vacío, el primero disponible (sin contar los de *embeddings*);
  - no se descarga ni se incluye ningún modelo en el repositorio.
- **Petición:** `temperature` 0,2, salida estructurada con el esquema JSON y un tiempo máximo de 180 s, configurable porque los modelos locales pueden tardar.
  - **🔁 Actualizado tras la Fase 6.1, a petición del equipo, que diagnosticó el problema con los logs de LM Studio:**
    - `/no_think` para los modelos Qwen3;
    - `max_tokens` 1400 (antes 4096);
    - tiempo máximo de 270 s (`AI_TIMEOUT_SECONDS`);
    - un 504 se muestra como «El modelo local está tardando más de lo esperado…» y no como «backend apagado».
  - Ver [[Errores de la IA]] E15–E16 y [[Bitácora]] §19.
- **Prompt v2:** añade reglas de JSON estricto sin cambiar los principios. El parsing tolera bloques de código, `<think>` y texto alrededor; si aun así el JSON no es válido, error controlado con reintento.

### D70. Preparación para GitHub ✅
- **`.gitignore`:** `.env*` (salvo `.env.example`), entornos virtuales, `node_modules`, `dist`, cachés, logs, temporales, resultados de tests, modelos locales y configuración de editores.
- **Fuera del repositorio:** LM Studio y sus modelos.
- **`.bat`:** usan `%LOCALAPPDATA%` en lugar de rutas personales.
- **`README.md`:** qué es, funcionalidades, arquitectura, instalación, ejecución, cómo activar el analista con LM Studio, tests, limitaciones y carácter académico.
- **Pendiente de decidir por el equipo:** si se publican también `entrega_provisional/` (PDF, PPTX y capturas) y los nombres del equipo que aparecen en la documentación. No se ha tocado nada de eso.

---

## Parte XI — Fase 7: mejoras según el feedback del profesor (2026-11-18)

### D71. Ratio de Sharpe con tasa libre de riesgo del 0 % ✅ (decisión del equipo)
- **Fórmula:** Sharpe = (media de las rentabilidades diarias simples × N − rf) ÷ (desviación típica muestral × √N).
  - N = 252, o 365 si la serie cotiza todos los días;
  - son las mismas rentabilidades que la volatilidad anualizada (D20).
- **rf = 0 %:**
  - se muestra como «Sharpe (rf 0 %)» y se explica que, con tipos positivos, el Sharpe frente a un activo sin riesgo sería menor;
  - el €STR oficial del BCE se descartó porque solo existe desde el 01/10/2019 y no cubre periodos largos.
- **Cuándo no se calcula:** «No disponible» con menos de 20 rentabilidades o con volatilidad 0.
- **Explore Markets:** «No aplica» en futuros, porque su precio no es el capital invertido.
- **Strategy Comparison:** se calcula sobre el índice TWR, así que las aportaciones no cuentan como rentabilidad.

### D72. Benchmarks: S&P 500 TR (índice) y MSCI World (proxy ETF) ✅
- **S&P 500:** `^SP500TR`, índice directo con dividendos reinvertidos, coherente con los precios ajustados.
- **MSCI World:** `IWDA.AS`, proxy ETF de acumulación en EUR, etiquetado «ETF proxy, no es el índice» (incluye TER y error de seguimiento).
- **Descartados:** `^GSPC` y el MSCI World de Yahoo, porque son de solo precio (detalle en [[Datos y fuentes]] §9).

### D73. Benchmark: solo contexto, mismo periodo y sin aportaciones ✅
- **Periodo:** el mismo que las estrategias (primer cierre en o después del inicio y último en o antes del final), sin rellenar precios.
- **No condiciona a las estrategias:** si su histórico no cubre el inicio, se muestra «no disponible» y no se acorta su periodo.
- **No es una estrategia:** no recibe aportaciones ni paga costes; es comprar y mantener en euros.
- **Presentación:**
  - sección separada «Tus estrategias vs. referencia de mercado» y línea discontinua en el gráfico;
  - frases del tipo «Del X al Y, A obtuvo… frente a… de la referencia», sin «batió al mercado»;
  - con aportaciones, la rentabilidad de la estrategia es TWR.
- **Limitación:** no se hace una comparación con flujos replicados, porque requeriría una decisión metodológica nueva.

### D74. Sensibilidad a costes: simulación educativa separada ⏳
- **Ubicación:** sección de Cost Analysis con la etiqueta «Escenario de sensibilidad · simulación educativa». Nunca modifica ni se mezcla con el resultado histórico real.
- **Modelo anual:**
  - una compra inicial;
  - crecimiento a la rentabilidad anual **supuesta** (entrada del usuario, por defecto 5 %, no es una previsión);
  - coste recurrente opcional (% anual sobre el valor; ejemplo de custodia o de coste interno, nunca restado del backtest real porque el TER ya está en el precio);
  - costes de operativa según el perfil.
- **Visualización:** tabla (costes de operativa y recurrentes pagados, valor final y diferencia frente a sin costes) y gráfico de la diferencia acumulada, con el eje desde 0 €.
- **Pendiente de validar por el equipo:** la rentabilidad supuesta por defecto (5 %) y la sencillez del modelo anual.

### D75. Perfiles de rotación con hipótesis cuantitativas visibles ⏳

| Perfil | Rotación anual | Órdenes al año |
|---|---|---|
| Comprar y mantener | 0 % | 0 (solo la compra inicial) |
| Baja | 20 % de la cartera | 4 (2 ventas + 2 compras) |
| Media | 50 % | 12 (6 + 6) |
| Alta | 100 % | 24 (una venta y una compra al mes) |

- **Cálculo:** volumen negociado = 2 × rotación × valor; importe por orden = volumen ÷ órdenes; cada orden paga la comisión de la tarifa (más divisa si aplica).
- **Pendiente de validar por el equipo:** los porcentajes y el número de órdenes de cada perfil.

### D76. «Mi lista» (favoritos) en Explore Markets ✅
- **Almacenamiento:** `localStorage` (`isl.favorites`, formato versionado), sin usuarios ni servidor.
- **Funciones:** añadir o quitar desde la ficha del activo (estrella discreta), lista al entrar en Explore Markets y abrir un favorito con un clic.
- **Reglas:** sin duplicados (el ticker se normaliza a mayúsculas) y como máximo 50.
- **Fuera de alcance:** no es una watchlist de trading (sin alertas, precios objetivo ni órdenes).

---

## Parte XII — Fase 8: decisiones principales, alternativas descartadas y aprendizajes (2026-11-18)

> Síntesis para la bitácora. **Propuesta de Claude Code, pendiente de revisión del equipo.** Las decisiones son del equipo; aquí solo se ordenan con su evidencia.

### D77. Las tres decisiones importantes (candidatas para la bitácora) ⏳
> **Actualización Fase 8.1:** la retirada de AI Strategy Analyst (D80) es otra candidata fuerte.

| | Decisión | Qué descartamos | Evidencia de que fue humana |
|---|---|---|---|
| **A** | **Abandonar el comparador trivial y reformular la pregunta.** De «¿cuánto pierdes por pagar más comisiones?» a una pregunta con trade-offs reales (rentabilidad, riesgo, diversificación y costes) | El comparador de dos productos con la misma rentabilidad bruta y distinto coste, que propuso la IA | [[Bitácora]] §2: «Esta fue una de las primeras decisiones importantes tomadas por el equipo»; [[Errores de la IA]] E10 |
| **B** | **Separar el cálculo determinista de la interpretación generativa.** Las cifras salen de motores con tests; la IA solo interpreta | Que la IA calcule o recalcule cifras, o que su texto sea la fuente de las cifras mostradas | D59; al pasar a LM Studio, el equipo pidió «mantener la arquitectura desacoplada» (mensaje de la Fase 6.1, D67) |
| **C** | **Trabajar módulo a módulo con puntos de control humanos.** Ninguna fase avanza sin la aprobación escrita del equipo | Construir todo a la vez sobre una base no validada (como en Streamlit) | [[Bitácora]] §10; reglas 3-4 de `Claude.md`; aprobaciones en [[Fases del proyecto]] |

**Revisión crítica (alternativas, sin sustituir las anteriores):**
- **Alternativa a C — D42: separar costes del producto (TER) y de intermediación, sin restar el TER dos veces.**
  - Es la decisión con más contenido financiero, y conecta con la investigación ([[Investigación principal]] §6).
  - Su origen es humano: la regla «no restar el TER otra vez» estaba en las instrucciones del equipo para la Fase 5. La auditoría de la Fase 0 ya lo había señalado como riesgo.
  - Si el equipo quiere reforzar el criterio «ancla financiera» (20 %), puede ser mejor candidata que C.
- **D67 (API de pago → modelo local)** es real y del equipo, pero tiene menos peso financiero. Mejor como decisión secundaria.

### D78. Alternativas realmente descartadas (con su decisión) ✅

| Alternativa | Por qué se descartó | Decisión |
|---|---|---|
| Streamlit como arquitectura | Fragilidad (`session_state`, navegación, errores encadenados) | D1 |
| Comparador A/B de solo dos estrategias | El objetivo pasó a N estrategias (2 a 6 en Comparison) | [[Idea del Proyecto]] |
| Construir todos los módulos a la vez | Base no validada; esqueletos a medio hacer | D2, D3, D5 |
| API de pago de Claude (Anthropic) | Coste, claves y dependencia externa | D60 → D67 |
| *Fallback* a un proveedor en la nube | Coste y privacidad; si LM Studio falla, error con reintento | D68 |
| Asesoramiento o recomendaciones personalizadas | Frontera del asesoramiento en materia de inversión (MiFID II); la app explica, no recomienda | D59, D64, D65 |
| Predicciones y Monte Carlo | La app es retrospectiva: «cómo se habría comportado» | [[Idea del Proyecto]], principio 1 |
| MWR / XIRR | Se eligió TWR para que las aportaciones no cuenten como rentabilidad; XIRR exigía otra decisión metodológica | D53 |
| €STR como tasa libre de riesgo | Solo existe desde el 01/10/2019 | D71 |
| `^GSPC` y MSCI World de Yahoo como benchmark | Solo precio, sin dividendos | D72 |
| *Scraping* de tarifas | Regla del proyecto: dataset versionado con fuente y fecha | D45 |

### D79. Qué haríamos diferente ⏳

1. **Escribir antes la pregunta, las hipótesis y el «cómo sabremos si ha salido bien».** La pregunta de investigación definitiva se ha formalizado al final, en la Fase 8, aunque el enunciado pedía fijar ese punto antes de empezar.
2. **Definir criterios verificables y un arnés de tests que pueda fallar antes de pedir funcionalidades a la IA.** El «100 % superado» de la V0.1 (E02) y las correcciones declaradas en Streamlit (E09) se habrían evitado.
3. **Guardar el rastro desde el primer día: git, prompts y capturas.** Hoy no hay cita literal ni captura de los errores de Antigravity (E01, E09), y el proyecto aún no está bajo git.
4. **Contrastar a mano cada cifra financiera nueva contra la fuente oficial, además de los tests.** Los tests escritos por la misma IA reprodujeron su error (E05, E17).
5. **Diagnosticar con evidencia propia antes de aceptar un arreglo.** Con el modelo local, subir el timeout trataba el síntoma; los logs de LM Studio mostraron la causa (E16).

---

## Parte XIII — Fase 8.1: cierre funcional (2026-11-18)

### D80. Retirar AI Strategy Analyst del producto final ✅ (decisión del equipo) — **candidata fuerte para la bitácora**

> Decisión humana y definitiva. No es un fallo accidental ni una funcionalidad pendiente: es una funcionalidad que se construyó, se probó y se decidió retirar.

**Qué intentamos.** Incorporar una capa de IA que interpretase en lenguaje sencillo los resultados cuantitativos de Strategy Comparison y Cost Analysis.

**Qué construimos** (Fases 6 y 6.1, D59–D69):
- proveedor desacoplado (`AIProvider`), primero con la API de Claude y después con LM Studio en local;
- input estructurado y mínimo;
- prompt versionado (`analyst-v1`, `analyst-v2`);
- respuesta JSON con esquema;
- guardrails contra recomendaciones, predicciones y cifras no verificadas;
- perfil educativo opcional y caché;
- estados de LM Studio;
- tests con proveedor simulado.

**Qué ocurrió.** Funcionaba técnicamente en parte, pero la inferencia local era lenta y poco práctica:
- con LM Studio y Qwen3 8B hubo tiempos largos de generación y timeouts (504);
- el razonamiento interno del modelo, a ~1,96 tokens/s, era costoso para una tarea solo interpretativa ([[Bitácora]] §19, [[Errores de la IA]] E15–E16).

**Alternativas consideradas:**

| Alternativa | Por qué no |
|---|---|
| API de Anthropic (Claude) | De pago y con API key (D60 → D67) |
| Otro proveedor en la nube | Coste y dependencia de un servicio externo (D68) |
| LM Studio local | Lento y exige que cada usuario instale y mantenga un modelo de varios GB |
| **Eliminar la funcionalidad** | **Elegida** |

**Motivos:**
- **A. Rendimiento.** La inferencia local (LM Studio + Qwen3 8B) era demasiado lenta para el flujo normal de la aplicación: generaciones largas, timeouts y un razonamiento innecesariamente costoso para una tarea interpretativa.
- **B. Valor incremental limitado.** La aplicación ya calcula de forma determinista rentabilidad, riesgo, máxima caída, Sharpe, costes, benchmark y sensibilidad. La capa generativa añadía sobre todo una explicación textual de información que el usuario ya puede interpretar con una interfaz educativa bien diseñada. El valor no justificaba la complejidad.
- **C. Distribución.** El proyecto debe poder publicarse en GitHub y usarse por otras personas. El analista local exigía instalar LM Studio, descargar un modelo de varios GB, cargarlo, iniciar un servidor local y mantenerlo en marcha. Eso perjudica la facilidad de uso y la reproducibilidad.
- **D. Coste.** La alternativa en la nube necesitaba una API y, potencialmente, pago. El equipo decidió no depender de servicios de pago en un proyecto académico.
- **E. Principio de diseño.** Más complejidad técnica no implica un producto mejor. Preferimos una herramienta más rápida, reproducible, transparente, fácil de defender y sencilla de ejecutar.

**Qué decidimos.** Eliminar AI Strategy Analyst del producto final:
- se retiran código, ruta, navegación, endpoints, configuración de LM Studio y tests;
- la evidencia se conserva en Obsidian: D59–D69, V0.8–V0.9 y `Histórico/AI Strategy Analyst/` con los prompts.

**IA como método ≠ IA en el producto.** Retirar el analista **no** retira la IA del proyecto. La IA ha sido central en el **método** de desarrollo:
- Antigravity en las primeras fases;
- Claude Code en auditoría, construcción, debugging, testing, investigación y documentación.

Usar IA para construir no obliga a que el producto final tenga una funcionalidad generativa.

**Aprendizaje.** Saber abandonar una funcionalidad técnicamente sofisticada cuando no mejora lo suficiente el producto también es control sobre la tecnología.

**Relación con D77:** es una candidata fuerte a sustituir a una de las tres decisiones principales. La elección es del equipo.

### D81. Cost Sensitivity: cada orden de rotación paga la comisión de su lado (compra o venta) ✅
- **Revisión** de la alerta de la Fase 8: en `analytics/sensitivity.py`, todas las órdenes de rotación, incluidas las ventas, usaban `trade_rule(schedule, "buy", …)` y `fx_fee(schedule, "buy", …)`. **Era un error real** ([[Errores de la IA]] E31).
- **Corrección:** cada perfil divide sus órdenes a partes iguales en ventas y compras, como ya decía D75. Las ventas usan la regla y el cambio de divisa de venta; las compras, los de compra.
- **Efecto en las tarifas actuales:** ninguno. Los 10 perfiles de `broker_fees.json` aplican la misma regla a compra y venta (`applies_to: ["buy", "sell"]`), así que las cifras mostradas hasta ahora no cambian. Sí cambiaría con una tarifa de comisiones asimétricas.
- **Tests:**
  - `test_sens_venta_usa_su_propia_comision`: compra 1 €, venta 10 €;
  - `test_sens_divisa_solo_en_el_lado_que_la_cobra`.
  Ambos fallan con la implementación anterior y pasan con la nueva.