# Acceptance tests

Una fase no está terminada hasta que el equipo la prueba desde la interfaz y la marca como **APROBADA**. Los resultados automáticos los ejecutó Claude Code; la columna "Equipo" la rellenáis vosotras.

**Cómo ejecutar los tests** (desde la carpeta `backend/`):

| Suite | Comando | Depende de |
|---|---|---|
| Deterministas | `python -m pytest` | Nada: series y feeds sintéticos |
| Integración | `python -m pytest -m integration` | Internet (Yahoo Finance, Google News, BCE, Fed) |
| E2E | `python -m pytest -m e2e` | App arrancada con los `.bat` |

**Desde la carpeta `frontend/`:**

| Suite | Comando | Depende de |
|---|---|---|
| Unitarios del frontend (Vitest) | `npm test` | Nada |
| E2E en el navegador (Playwright + Edge) | `npm run test:e2e` | App arrancada con los `.bat`; los tests «Yahoo» necesitan internet |

---

## Fase 11 — Publicación web (V1.0, 2026-11-23)

**A. Antes del despliegue (local):**
- Tests deterministas del backend: 295 superados.
- Vitest: 93/93.
- Build de producción correcto.
- Simulación de producción con dos orígenes (frontend en 4173 con `VITE_API_BASE_URL`, backend en 8001 con `ALLOWED_ORIGINS`):
  - CORS acepta el frontend declarado y rechaza un origen ajeno;
  - `/markets?ticker=VOO` se abre directamente;
  - con el backend parado aparece el nuevo aviso.
- **No ejecutado:** Playwright local, porque la app local no estaba arrancada.

**B. Comprobación en producción** (Claude Code, con navegador y peticiones HTTP a las URL públicas, 23/11/2026):

| # | Comprobación | Tipo | Resultado |
|---|---|---|---|
| 1 | Home carga con los 5 módulos | Interfaz pública | ✅ |
| 2 | News carga | Interfaz y API | ⚠ Parcial: portada con 10 titulares del BCE y la Fed; «Mercados» y el buscador muestran el aviso de error (Google News no responde al servidor) |
| 3 | Explore Markets: buscar «iShares Core MSCI World» y abrir IWDA.AS | Interfaz pública | ✅ |
| 4 | Datos históricos reales | Interfaz pública | ✅ 254 sesiones; rentabilidad, volatilidad, Sharpe y máxima caída. El CAGR sale «—» en 1 año porque dura 364 días (limitación conocida, D20) |
| 5 | Favoritos («Mi lista») | Interfaz pública | ✅ Se añade y se mantiene al recargar |
| 6–7 | Strategy Builder: crear, añadir activo y peso, duplicar, aportación de 300 €/mes; guardado | Interfaz pública | ✅ Guardado en `localStorage` |
| 8 | Strategy Comparison con 2 estrategias, 5 años | Interfaz pública | ✅ Periodo común real, métricas y tabla de aportaciones |
| 9 | Benchmark S&P 500 TR | Interfaz pública | ✅ Sección de referencia, con Sharpe del índice 0,61 |
| 10 | Sharpe en Explore Markets y Comparison | Interfaz pública | ✅ 1,14 y 0,71 |
| 11–12 | Cost Analysis seleccionando ING | Interfaz pública | ✅ Antes y después de costes, impacto y desglose |
| 13 | Sensibilidad a costes de operativa con ING | Interfaz pública | ✅ Mismas cifras que E5 a 20 años (−34 € a −3.403 €) |
| 14 | Navegación entre módulos y recarga directa de rutas internas | Interfaz y HTTP | ✅ `/markets`, `/costs` y `/comparison` responden 200 |
| 15 | Errores de JavaScript | Consola | ✅ Ninguno. Solo aparece el 503 de red de News «Mercados» (punto 2) |
| 16 | Ninguna referencia al AI Strategy Analyst | Bundle e interfaz | ✅ 0 coincidencias; `/analyst` muestra la 404 de la app |
| 17 | Sin dependencia de LM Studio | Bundle y API | ✅ 0 coincidencias |
| 18 | Sin claves ni secretos en el código servido | Bundle | ✅ Solo contiene la URL pública de la API |
| — | CORS en producción | HTTP | ✅ `access-control-allow-origin` solo para el frontend público |
| — | Vista móvil (375 px) | Interfaz pública | ✅ Sin desbordamiento horizontal en Home, Explore, Comparison y Cost Analysis |
| — | Arranque en frío tras 15 minutos | — | ⬜ **No comprobado** en esta sesión (el servicio estaba activo); comportamiento documentado por Render |

**C. Validación del equipo** (pendiente; no marcada):

| ✔ | Comprobación | Esperado |
|---|---|---|
| [ ] | Abrir la Live Demo desde otro dispositivo o red | La app carga |
| [ ] | Volver a abrirla tras más de 15 minutos sin uso | El primer dato tarda alrededor de un minuto y después funciona |
| [x] | Revisar la limitación de News y decidir (D82) | Decidido por el equipo (2026-11-23): dejarlo documentado |

---

## Validación manual durante experimentos (Fase 9)

Para comprobar a la vez la app y los resultados de [[Experimentos y resultados]].
- Claude Code **no ha marcado ninguna casilla**: obtuvo las cifras por la API, no por la interfaz.
- Configuración de referencia: estrategias BASE, A, B y C (§0.2) y fechas del 18/11/2016 al 18/11/2026.

### ⭐ Prioritarias antes de cerrar el trabajo (Fase 9.1)

Si solo hay tiempo para unas pocas, estas 6 cubren las cifras que irán a la presentación y la bitácora.

> ✅ **Validadas por el equipo (2026-11-19):** el equipo comprobó P1–P6 en la interfaz y todas coinciden con los valores esperados. Con ello, los resultados de [[Experimentos y resultados]] quedan **definitivamente congelados**. La «Lista completa (opcional)» de abajo no se ha marcado: el equipo no ha informado de esas comprobaciones.

| ✔ | Comprobación | Valor esperado |
|---|---|---|
| [x] | **P1.** Cost Analysis, BASE con aportación mensual (210 € + 90 €), fechas fijas, **ING**: costes y valor neto | 772 € · 83.395,20 € |
| [x] | **P2.** Cálculo a mano de la compraventa de **Bankinter** en ese escenario contra su web oficial: 242 compras × 20 € | 4.840 € |
| [x] | **P3.** Strategy Comparison con BASE mensual, BASE trimestral (630 € + 270 €) y BASE anual (2.520 € + 1.080 €): valor final antes de costes | 84.540,67 € · 83.741,65 € · 81.793,44 € |
| [x] | **P4.** Strategy Comparison con A, B y C (10.000 €, sin aportaciones) y referencia S&P 500 TR: rentabilidad total y máxima caída de C, y Sharpe del índice | 316,7 % · −34,4 % · 0,79 |
| [x] | **P5.** BASE mensual con fechas del 18/11/2021 al 18/11/2026: CAGR y Sharpe | 6,69 % · 0,65 |
| [x] | **P6.** Cost Analysis → «Sensibilidad a costes de operativa (rotación)» (10.000 €, 10 años, 5 %, 0 %, zona euro, ING): el título y la nota dicen que no incluye la custodia; diferencia con rotación alta | 1.240 € (7,6 %) |

### Lista completa (opcional)

| ✔ | Comprobación en la interfaz | Valor esperado (de la API) |
|---|---|---|
| [ ] | Home y menú muestran solo los 5 módulos activos | Sin «AI Strategy Analyst» ni «Próximamente» |
| [ ] | Explore Markets: `IWDA.AS` y `EUNH.DE` aparecen como ETF, con TER y Sharpe; se añaden y se quitan de «Mi lista», y la lista se conserva al recargar | — |
| [ ] | Strategy Builder: crear BASE (10.000 €, 70/30) con aportaciones mensuales de 210 € y 90 € | Validación sin errores |
| [ ] | Strategy Comparison (BASE + BASE sin aportaciones, fechas fijas, S&P 500 TR): CAGR, volatilidad, máxima caída y Sharpe de BASE | 9,26 % · 11,51 % · −25,6 % · 0,82 |
| [ ] | Ídem, referencia de mercado en el gráfico (línea discontinua) y sección «vs. referencia» | Sharpe del índice 0,79 |
| [ ] | Cost Analysis, BASE mensual con ING: costes durante la inversión y valor neto | 772 € · 83.395,20 € |
| [ ] | Ídem con Bankinter: 242 compras × 20 € | 4.840 € en compras · 734,98 € de custodia |
| [ ] | Cálculo a mano de una cifra de E1 contra la tarifa oficial (elegid el intermediario) | Coincide |
| [ ] | Strategy Comparison con A, B y C (sin aportaciones): rentabilidad total de C y su máxima caída | 316,7 % · −34,4 % |
| [ ] | Mismo escenario BASE con fechas del 18/11/2021 al 18/11/2026 | CAGR 6,69 % · Sharpe 0,65 |
| [ ] | Cost Sensitivity: 10.000 €, 10 años, 5 %, 0 %, zona euro, ING; rotación alta | Diferencia de 1.240 € (7,6 %) |
| [ ] | Cost Sensitivity con Bankinter, rotación alta | Diferencia de 6.070 € (37,3 %) |
| [ ] | Ninguna pantalla presenta los resultados como predicción ni como recomendación | — |

Si una cifra de la interfaz no coincide, anotadlo aquí: puede ser un error de la app o de los experimentos.

---

## Fase 8.1 — Cierre funcional (V0.11)

### A. Tests automáticos (2026-11-18)

| Suite | Resultado |
|---|---|
| Backend deterministas (`python -m pytest`) | **295 superados** |
| Backend integración + E2E (`-m "e2e or integration"`, red y app del equipo en marcha) | **54 superados** |
| Vitest (`npm test`) | **93/93** |
| Build de producción (`npm run build`) | Correcto; sin referencias al analista en el bundle |
| Playwright (`npm run test:e2e`, contra la app del equipo) | **45/45** |

**Tests nuevos (regresión de E31):**
- `test_sens_venta_usa_su_propia_comision`: compra 1 €, venta 10 €;
- `test_sens_divisa_solo_en_el_lado_que_la_cobra`.

Ambos fallaban con la implementación anterior.

**Tests eliminados con el AI Strategy Analyst (D80):** `test_analyst.py`, `test_integration_analyst.py`, `profile.test.js` y `ai-analyst.spec.js`. La ruta `/analyst` sale de `test_e2e_running_app.py`. Las secciones de las Fases 6 y 6.1 se conservan abajo como historia.

### B. Validación del equipo

| Comprobación | Esperado | Equipo |
|---|---|---|
| Navegación y Home | 5 módulos; ninguna mención a AI Strategy Analyst ni botones «Próximamente» | |
| `/analyst` | Página 404 de la app | |
| Arranque | La app funciona sin LM Studio abierto | |
| Cost Sensitivity | Mismas cifras que antes con los 10 intermediarios (todos cobran igual al comprar y al vender) | |
| Regresión | News, Explore Markets, Mi lista, Builder, aportaciones, Comparison, benchmark, Sharpe y Cost Analysis | |

---

## Fase 7 — Sharpe, benchmark, sensibilidad a costes y favoritos (V0.10)

### A. Tests automáticos (2026-11-18)

| Suite | Resultado |
|---|---|
| pytest deterministas (incluye `test_phase7.py`: 20 nuevos) | **350 passed** |
| pytest integración (Yahoo y noticias reales; se excluye la prueba real con LM Studio) | **42 passed** |
| pytest E2E con la app en marcha | **13 passed** |
| Vitest (incluye `favorites.test.js`: 7 nuevos, y errores del analista) | **101 passed** |
| Playwright (incluye `phase7.spec.js`: 7 nuevos) | **53 passed** |
| `npm run build` | **OK** |

### B. Correspondencia con lo pedido

| Área | Prueba | Resultado | Equipo |
|---|---|---|---|
| Sharpe | Serie conocida (fórmula a mano), volatilidad cero → No disponible, histórico insuficiente → No disponible, rf definido, escala √365/√252, futuros «No aplica» | ✅ | |
| Benchmark | Mismas fechas que el periodo común, histórico corto (no acorta las estrategias; aviso), datos ausentes, métricas coherentes (+20 % sintético), proxy etiquetado, id inválido | ✅ | |
| Sensibilidad | Coste cero = sin costes, coste fijo (1 + 24 órdenes), más rotación → más coste, horizonte corto/largo (efecto compuesto: 20 años > 2 × 10 años), mismo capital con distinta rotación, diferencia > lo pagado | ✅ | |
| Favoritos | Añadir, eliminar, persistencia (recarga), ticker duplicado (también en minúsculas), abrir favorito, lista vacía, datos dañados, límite | ✅ | |
| Regresión | News, Explore Markets, Strategy Builder, aportaciones, Comparison, Cost Analysis, brokers y AI Strategy Analyst (proveedor simulado) | ✅ | |

**Ajuste de regresión:** dos E2E antiguos contaban 4 tarjetas de métricas en Explore Markets; ahora son 5 (Sharpe).

---

## Fase 6.1 — AI Strategy Analyst local con LM Studio (V0.9)

> 🔁 Histórico: funcionalidad retirada en la Fase 8.1 (D80). Estos tests ya no existen en el código.

### A. Tests automáticos (2026-11-12)

| Suite | Resultado |
|---|---|
| pytest deterministas (`test_analyst.py`: 54, con proveedor falso y servidor LM Studio simulado; **sin LM Studio ni red**) | **327 passed** |
| pytest integración (Yahoo y noticias reales) | **42 passed, 1 skipped**: la prueba real con LM Studio se omite porque no está en marcha en este entorno |
| pytest E2E con la app en marcha | **13 passed** |
| Vitest | **91 passed** |
| Playwright: Builder, Comparison, Cost Analysis, Aportaciones y AI Analyst (7, con IA simulada) | **45 passed** |
| `npm run build` | **OK** |

### B. Correspondencia con lo pedido

| Prueba | Cómo se comprobó | Resultado | Equipo |
|---|---|---|---|
| Input, output, parsing y caché | Igual que en la Fase 6, con el proveedor falso | ✅ | |
| JSON de modelos locales | Bloque de código, `<think>…</think>` y texto alrededor → aceptado; JSON roto → error controlado | ✅ | |
| Servidor no disponible | Conexión rechazada o timeout en `/models` → `server_down`, con mensaje «Inicia LM Studio…» | ✅ | |
| Sin modelo | Lista vacía o solo *embeddings* → `no_model`, con mensaje específico | ✅ | |
| Modelo inexistente | `LMSTUDIO_MODEL` no listado → `model_not_found` | ✅ | |
| Timeout y errores | Timeout → 504; conexión perdida, HTTP 4xx/5xx, formato inesperado o respuesta cortada → 502 con reintento | ✅ | |
| Sin API key ni *fallback* de pago | La petición no lleva claves ni `fallbacks`; el código no importa SDKs de pago; `requirements.txt` sin `anthropic` | ✅ | |
| Detección real en este entorno | LM Studio no instalado ni en marcha → `/api/analyst/status` = `server_down`; la página muestra el aviso con instrucciones y «Comprobar de nuevo» | ✅ | |
| Regresión | News, Explore Markets, Builder, aportaciones, Comparison, Cost Analysis, perfiles de intermediarios y AI Analyst con proveedor falso | ✅ | |

### C. Pendiente: prueba manual con LM Studio real
Instalar LM Studio, cargar un modelo, iniciar el servidor, pulsar «Comprobar de nuevo» y «Generar análisis» con varias estrategias y perfiles. Después ejecutar `python -m pytest -m integration tests/test_integration_analyst.py`. Ver [[Bitácora]] §19.

---

## Fase 6 — AI Strategy Analyst (V0.8, con Anthropic; sustituida por la 6.1)

### A. Tests automáticos (2026-11-12)

| Suite | Resultado |
|---|---|
| pytest deterministas (incluye `test_analyst.py`: 40 nuevos, **con proveedor falso, sin llamadas reales**) | **313 passed** |
| pytest integración (Yahoo y noticias reales) | **42 passed, 1 skipped**: la llamada real a Claude se omite porque no hay `ANTHROPIC_API_KEY` en este entorno |
| pytest E2E con la app en marcha | **13 passed** |
| Vitest (incluye `profile.test.js`: 5 nuevos) | **91 passed** |
| Playwright: Builder (8) + Comparison (11) + Cost Analysis (12) + Aportaciones (7) + AI Analyst (6) | **44 passed** |
| `npm run build` | **OK** |

**Política de tests:**
- Los tests del analista usan un proveedor falso y no gastan API.
- En Playwright, la respuesta de la IA se simula interceptando la petición; las cifras vienen del backend real.
- Solo existe **una** prueba real (`test_integration_analyst.py`), que se ejecuta con `pytest -m integration` cuando hay clave configurada.

### B. Correspondencia con lo pedido

| Prueba | Cómo se comprobó | Resultado | Equipo |
|---|---|---|---|
| Construcción del input | Cifras idénticas a las de Comparison; compacto y sin HTML; costes y perfil opcionales; datos ausentes como `null` con motivo | ✅ | |
| Parsing | JSON válido, en bloque de código, vacío, no JSON, apartados ausentes, tipos incorrectos | ✅ | |
| Errores del proveedor | Timeout → 504; red, servicio o rechazo → 502; los errores no se cachean | ✅ | |
| Sin API key | Estado «no configurado», cifras sin texto de IA y ninguna llamada | ✅ | |
| Respuesta estructurada | Esquema fijo; el frontend controla la presentación (texto plano) | ✅ | |
| No añade estrategias inexistentes | `strategy_id` desconocido → rechazo | ✅ | |
| No altera cifras | Porcentajes del texto contrastados con los datos (aviso si no coinciden); tarjetas pintadas desde los datos | ✅ | |
| No introduce predicciones | «subirá», «va a subir» → rechazo | ✅ | |
| No recomienda | «Debes comprar», «Te recomiendo», «Deberías vender», «Compra…», «la mejor opción» → rechazo; textos descriptivos («cada compra genera…») permitidos | ✅ | |
| Prompt | Rol, no inventar, no predecir, no asesorar, trade-offs, español, TER, aportaciones | ✅ | |
| Desacoplamiento | Solo `ai/provider.py` importa el SDK; petición y rechazo del `AnthropicProvider` probados con un cliente simulado | ✅ | |
| Bajo demanda y caché | No hay llamada sin pulsar; la misma petición no vuelve a llamar; cambiar el perfil la marca como desactualizada | ✅ | |
| UX | Carga, error con reintento, sin estrategias, sin comparación previa, sin API, móvil sin desbordamiento | ✅ | |
| Regresión | News, Explore Markets, Builder, aportaciones, Comparison, Cost Analysis y perfiles de intermediarios (Playwright 44/44) | ✅ | |

### C. Pendiente de la prueba humana
- **Calidad del texto real de Claude:** no se ha podido probar con el modelo real porque no hay clave en este entorno. Ver [[Bitácora]] §18.
---

## Fase 5.1 — Aportaciones periódicas + ampliación de intermediarios (V0.7) — ✅ APROBADA

### A. Tests automáticos (2026-11-12)

| Suite | Resultado |
|---|---|
| pytest deterministas (incluye `test_contributions.py` 31 nuevos y `test_costs.py` 37 reescritos) | **273 passed** |
| pytest integración con Yahoo y noticias reales (incluye aportaciones reales con VOO) | **42 passed** |
| pytest E2E con la app en marcha | **13 passed** |
| Vitest (incluye `contributions.test.js` 11 nuevos) | **86 passed** |
| Playwright: Builder (8) + Comparison (11) + Cost Analysis (12) + Aportaciones (7) | **38 passed** |
| `npm run build` | **OK** |

### B. Tests de aportaciones pedidos (deterministas)

| # | Prueba | Test | Resultado | Equipo |
|---|---|---|---|---|
| 1 | Aportación mensual durante 12 meses | `test_aportacion_mensual_12_meses_comision_fija`, `test_mensual_durante_12_meses` | ✅ | |
| 2 | Aportación trimestral | `test_aportacion_trimestral` (2-abr, 2-jul, 2-oct) | ✅ | |
| 3 | Aportación en día no bursátil | `test_aportacion_en_dia_no_bursatil_pasa_al_siguiente` (domingo → lunes) | ✅ | |
| 4 | Aportación a activo en EUR | sin comisión de divisa | ✅ | |
| 5 | Aportación a activo en USD con FX | 11 × 200 € × 0,50 %; servicio: 0,30 % y 0,50 % por aportación | ✅ | |
| 6 | Comisión fija | 12 × 1 € | ✅ | |
| 7 | Comisión porcentual | 11 × 0,20 % de 1.000 € | ✅ | |
| 8 | Comisión mínima | 11 × mínimo 5 € | ✅ | |
| 9 | Varias aportaciones a activos diferentes | 22 compras, cada una a su activo | ✅ | |
| 10 | Aportaciones + capital inicial | 1 compra inicial + 11 periódicas | ✅ | |
| 11 | Estrategia sin aportaciones | idéntica a buy & hold (valor y TWR) | ✅ | |
| 12 | Capital total aportado | capital + Σ aportaciones, coincide entre Comparison y Costs | ✅ | |
| 13 | No confundir aportación con ganancia | precio plano: valor ↑ pero TWR 0 % y ganancia 0 €; caso conocido TWR = 21 % | ✅ | |

**Validaciones** (pytest y Vitest):
- importe negativo, cero, vacío o texto;
- activo inexistente o eliminado (al borrar un activo se borran sus aportaciones);
- misma frecuencia repetida en el mismo activo (frecuencias distintas sí se permiten);
- capital 0 sin aportaciones;
- capital 0 en un periodo sin aportaciones (error explicado);
- periodo demasiado corto (aviso).

### C. Tests de intermediarios pedidos

| Prueba | Cómo | Resultado |
|---|---|---|
| Broker sin custodia | MyInvestor, Trade Republic, Revolut, BBVA | ✅ |
| Banco con custodia | ING (trimestral sin operaciones), Santander (máxima por clase), Bankinter (trimestral con mínimo), CaixaBank (mínimo semestral) | ✅ |
| Comisión fija | Trade Republic 1 €, BBVA joven 0,99 € | ✅ |
| Comisión porcentual | BBVA ETF 0,15 %, Bankinter 0,07 % con máximo 200 € | ✅ |
| Comisión con mínimo | MyInvestor (1 € ETF / 3 € acciones), CaixaBank 0,65 % mín. 10 € | ✅ |
| Tarifa condicionada | tope de ING por debajo de 50.000; tramos de Santander y Bankinter (umbral en $) | ✅ |
| Operaciones gratuitas antes de cobrar | Revolut Premium: 7 órdenes en un mes → 2 € | ✅ |
| Aportaciones y compras repetidas | 60 compras = 60 € con 1 €/compra; planes de Trade Republic a 0 €; ING sin custodia con aportación mensual | ✅ |

### D. Regresión

News, Explore Markets, Strategy Builder, Strategy Comparison y Cost Analysis, sin aportaciones y con ellas: ✅ (Playwright 38/38 y pytest E2E 13/13).

### E. Comprobación manual de cifras (datos reales, 5 años, VOO 300 €/mes + QQQ 200 €/mes, 10.000 € iniciales)

| Intermediario | Cálculo | App |
|---|---|---|
| Santander | 122 compras internacionales ≤ 15.000 € × 20 € | 2.440 € ✅ |
| CaixaBank | 122 × 36 € | 4.392 € ✅ |
| BBVA joven | 122 × 0,99 € | 120,78 € ✅ |
| BBVA ETF | 0,15 % × 40.000 € aportados | 60 € ✅ |
| ING | ~3 $ + 0,10 % por compra; custodia 0 € (hay operación cada trimestre); divisa 0,5 % × 40.000 € = 200 € | ✅ |

---

## Fase 5 — Cost Analysis (V0.6) — ✅ APROBADA

### A. Tests automáticos (2026-11-12)

| Suite | Resultado |
|---|---|
| pytest deterministas (incluye `test_costs.py` 37 + `test_cost_service.py` 26 nuevos) | **250 passed** |
| pytest integración con Yahoo y noticias reales (incluye `test_integration_costs.py` 3 nuevos) | **41 passed** |
| pytest E2E con la app en marcha | **13 passed** |
| Vitest (incluye `model.test.js` 10 nuevos) | **75 passed** |
| Playwright: Strategy Builder (8) + Strategy Comparison (11) + Cost Analysis (12) | **31 passed** |
| `npm run build` | **OK** |

**Casos sintéticos con resultado conocido** (`test_costs.py`; son escenarios de test, **no tarifas reales**):
- 3 activos × 1 € por compra = **3 €**;
- 10.000 € × 0,20 % = **20 €**;
- 0,10 % de 1.000 € = 1 €, pero con mínimo de 5 € → **5 €**;
- custodia del 1 % sobre 10.000 € durante un año = **100 €**;
- cambio de divisa: 10.000 € × 0,50 % = **50 €**;
- también: máximo por operación, tope condicionado (20 € por debajo de 50.000 €, sin tope por encima), fijo en dólares convertido a euros, trimestres parciales, custodia de ING (trimestre de compra gratis, IVA, máximo por cuenta), y que un coste inicial deja de revalorizarse (impacto = 2 × 10 € si la inversión se duplica).

**Coherencia comprobada:**
- el resultado antes de costes coincide con el valor final de Strategy Comparison en el mismo periodo, con datos sintéticos y con datos reales;
- sin costes de intermediación, el resultado neto es igual al bruto;
- un ETF con TER da exactamente la rentabilidad de su precio (el TER no se resta).

### B. Correspondencia con las pruebas pedidas

| # | Prueba | Cómo se comprobó | Resultado | Equipo |
|---|---|---|---|---|
| 1 | Solo acciones | SAN.MC + ITX.MC con ING: compras 16 € (2 × (3 € + 0,10 % × 5.000 €)), divisa 0 € | ✅ | |
| 2 | Con ETF | VOO en USD con MyInvestor: mínimo de 1 € y divisa del 0,30 % | ✅ | |
| 3 | Mixta | VOO + IWDA.AS + AAPL: divisa solo sobre la parte en USD (42 € de 14.000 €) | ✅ | |
| 4 | Broker sin custodia | MyInvestor y Trade Republic → custodia 0 € | ✅ | |
| 5 | Broker con custodia | ING: custodia trimestral por valor; 0 € dentro del trimestre de compra | ✅ | |
| 6 | Comisión fija | Trade Republic: 1 € por compra y 1 € por venta estimada | ✅ | |
| 7 | Comisión porcentual | Personalizado al 0,20 % y MyInvestor al 0,12 % | ✅ | |
| 8 | Comisión con mínimo | Personalizado 0,10 % con mínimo 10 € → 20 € para dos compras de 5.000 € | ✅ | |
| 9 | Divisa aplicable | Activos en USD con ING (0,50 %) y MyInvestor (0,30 %) | ✅ | |
| 10 | Divisa no aplicable | Activos en EUR, y Trade Republic (no la publica) | ✅ | |
| 11 | Escenario personalizado | Formulario con validación (texto, límites); se recuerda al recargar | ✅ | |
| 12 | Coste cero | «Sin costes» y personalizado vacío → neto = bruto | ✅ | |
| 13 | Datos de broker incompletos | Estrategia con BTC-USD → «Datos incompletos» y aviso | ✅ | |
| 14 | TER disponible | VOO 0,03 %, IWDA.AS 0,20 % (Yahoo), marcado «ya reflejado» | ✅ | |
| 15 | TER no disponible | ETF sin dato → «No disponible» (test sintético) | ✅ | |
| 16 | Varias estrategias | 3 estrategias en orden de selección, sin ganador | ✅ | |
| 17 | Capitales distintos | 1.000 / 30.000 / 100.000 €: el tope de ING se aplica solo por debajo de 50.000 € | ✅ | |
| 18 | Periodo corto | Pocas semanas: sin custodia de ING | ✅ | |
| 19 | Periodo largo | 10 años: más custodia que 1 año | ✅ | |
| 20 | Móvil (375 px) | Sin desbordamiento horizontal; las tablas se desplazan dentro de su tarjeta | ✅ | |
| 21 | Recarga | Estrategias, periodo, escenario y costes personalizados se conservan | ✅ | |
| 22 | News sigue funcionando | Playwright (regresión) + pytest E2E | ✅ | |
| 23 | Explore Markets sigue funcionando | Playwright (regresión) + pytest E2E | ✅ | |
| 24 | Strategy Builder sigue funcionando | 8 tests Playwright | ✅ | |
| 25 | Strategy Comparison sigue funcionando | 11 tests Playwright + 34 deterministas tras el refactor | ✅ | |

---

## Fase 4 — Strategy Comparison (V0.5) — ✅ APROBADA

### A. Tests automáticos (2026-11-12)

| Suite | Resultado |
|---|---|
| pytest deterministas (incluye `test_portfolio.py` 29 + `test_backtest.py` 34 nuevos) | **187 passed** |
| pytest integración con Yahoo y noticias reales (incluye `test_integration_backtest.py` 5 nuevos) | **38 passed** |
| pytest E2E con la app en marcha | **13 passed** |
| Vitest | **65 passed** |
| Playwright: Strategy Builder (8) + Strategy Comparison (11) | **19 passed** |
| `npm run build` | **OK** |

**Fórmulas comprobadas con resultados conocidos** (`test_portfolio.py`):
- activo que sube un 10 % → +10 %;
- cartera 50/50 con un activo +10 % y otro plano → +5 % (105.000 €);
- activo plano → rentabilidad, volatilidad y drawdown 0;
- reparto inicial 60/30/10 de 100.000 € → 60.000 / 30.000 / 10.000 €;
- drawdown conocido de la cartera (80/110 − 1);
- el capital escala el valor pero no la rentabilidad;
- los pesos derivan sin rebalanceo (50/50 → 2/3 y 1/3);
- buy & hold = suma ponderada de las rentabilidades de los activos;
- una estrategia de un solo activo da las mismas métricas que Explore Markets;
- solo días comunes, sin rellenar NaN ni festivos;
- sin fechas comunes → sin datos;
- divisas: activo plano en USD con el EUR/USD de 1,00 a 1,25 → −20 % en euros; efecto multiplicativo; peniques;
- pesos inválidos y capital inválido rechazados.

**Servicio** (`test_backtest.py`):
- de 2 a 6 estrategias;
- errores con el nombre de la estrategia: pesos que suman 90 % o 110 %, peso vacío, sin activos, capital, ticker duplicado, divisa del capital;
- activos no utilizables: inexistente, tipo no soportado, sin histórico, sin divisa o sin tipo de cambio;
- resultados conocidos en euros, conversión USD y GBp;
- coherencia con Explore Markets;
- periodo común limitado por el activo más joven o por el tipo de cambio;
- festivo de un mercado eliminado para todas las estrategias;
- calendario con fines de semana → 365;
- presets, CAGR y volatilidad con periodos cortos, sábado inicial, fechas inválidas, periodo sin datos, gráfico base 100, reducción del gráfico y API (200, 400, 422).

**Integración real:**
- dos estrategias en USD a 1 año;
- la conversión a euros coincide exactamente con precio × variación del tipo de cambio;
- IBIT limita el periodo común;
- tres estrategias en euros con distinto capital: valor final = capital × (1 + rentabilidad);
- periodo de 1995 sin datos.

### B. Correspondencia con las pruebas pedidas

| # | Prueba | Cómo se verificó | Resultado | Equipo |
|---|---|---|---|---|
| 1 | Comparar dos estrategias | Playwright 3 | ✅ | ☐ |
| 2 | Comparar tres o más | Playwright 4 | ✅ | ☐ |
| 3 | Distinto capital inicial | Playwright 4 (50.000 / 20.000 / 10.000 €) + integración | ✅ | ☐ |
| 4 | Periodo de 1 año | Playwright 4 + integración | ✅ | ☐ |
| 5 | Periodo de 5 años | Playwright 3 (por defecto) + integración | ✅ | ☐ |
| 6 | Fechas personalizadas | Playwright 5 (sábado 06/01/2024 → 08/01/2024; fechas invertidas) | ✅ | ☐ |
| 7 | Activo con histórico corto | Playwright 6 (IBIT) + integración + deterministas | ✅ | ☐ |
| 8 | Estrategia inválida | Playwright 2 y 9 + deterministas | ✅ | ☐ |
| 9 | Ausencia de datos | Playwright 7 (1995-1996) + deterministas | ✅ | ☐ |
| 10 | Suma de pesos distinta de 100 % | Playwright 2 + deterministas (90 % y 110 %) | ✅ | ☐ |
| 11 | Gráfico principal | Playwright 3, 4 y 8 (una línea por estrategia; la leyenda oculta líneas) | ✅ | ☐ |
| 12 | Métricas | Playwright 3 + deterministas con resultados conocidos | ✅ | ☐ |
| 13 | Drawdown | Playwright 3 (segundo gráfico) + deterministas | ✅ | ☐ |
| 14 | Móvil | Playwright 10 (375 px, sin scroll horizontal; la tabla se desplaza dentro de su tarjeta) | ✅ | ☐ |
| 15 | Recarga de página | Playwright 8 (selección y periodo 10A se conservan) | ✅ | ☐ |
| 16 | Vuelta a Strategy Builder | Playwright 8 y 9 («Editar» abre la estrategia correcta) | ✅ | ☐ |
| 17 | News sigue funcionando | Playwright 11 + pytest E2E | ✅ | ☐ |
| 18 | Explore Markets sigue funcionando | Playwright 11 + pytest | ✅ | ☐ |
| 19 | Strategy Builder sigue funcionando | Playwright 11 + los 8 tests del Builder | ✅ | ☐ |

**Revisión visual en el navegador (Claude Code):** comparación de 3 estrategias reales a 5 años: franja del periodo, gráficos, tabla y composición correctos.

**Pendiente de prueba manual por el equipo:** tooltips ⓘ, lectura de los resultados y aspecto general.

**Estado de la fase:** 🟦 completada técnicamente — ⏳ pendiente de aprobación del equipo.

---

## Fase 3 — Strategy Builder (V0.4) — ✅ APROBADA

### A. Tests automáticos (2026-11-12)

| Suite | Resultado |
|---|---|
| Vitest: `model.test.js` (58) + `storage.test.js` (7) | **65 passed** |
| Playwright E2E: `e2e/strategy-builder.spec.js` | **8 passed** |
| Regresión del backend: pytest deterministas / integración / E2E | **124 / 32 / 13 passed** |
| `npm run build` | **OK** |

**Primera ejecución de los E2E: 6 de 8 superados.**
- El test 4 falló por el selector del propio test, que incluía el icono del medidor. Se ajustó el marcado.
- El test 7 detectó un **fallo real**: en móvil el editor se salía 26 px de la pantalla. Se corrigió el CSS.
- Tras las correcciones, 8 de 8.

### B. Correspondencia con las pruebas pedidas

| # | Prueba | Cómo se verificó | Resultado | Equipo |
|---|---|---|---|---|
| 1 | Crear una estrategia | E2E 1 | ✅ | ☐ |
| 2 | Renombrarla | E2E 2 | ✅ | ☐ |
| 3 | Añadir un activo | E2E 4 (VOO real) | ✅ | ☐ |
| 4 | Añadir varios activos | E2E 4 (VOO, QQQ, AAPL) | ✅ | ☐ |
| 5 | Buscar activos reales | E2E 4 («Apple» → AAPL, vía Yahoo) | ✅ | ☐ |
| 6 | Modificar pesos | E2E 4 | ✅ | ☐ |
| 7 | Conseguir exactamente 100 % | E2E 4 (50 + 35 + 15, y 50 + 42,5 + 7,5) · unitario 33,33 + 33,33 + 33,34 | ✅ | ☐ |
| 8 | Detectar suma inferior a 100 % | E2E 4: «85 % asignado — queda 15 %» | ✅ | ☐ |
| 9 | Detectar suma superior a 100 % | E2E 4: «108 % asignado — debes reducir 8 %» | ✅ | ☐ |
| 10 | Peso negativo | E2E 4 + unitarios | ✅ | ☐ |
| 11 | Peso inválido (texto, 0, > 100, decimales) | E2E 4 + unitarios | ✅ | ☐ |
| 12 | Impedir activo duplicado | E2E 4: «VOO ya forma parte de esta estrategia.» | ✅ | ☐ |
| 13 | Eliminar activo (sin redistribuir) | E2E 4 + unitario | ✅ | ☐ |
| 14 | Duplicar estrategia | E2E 5 (copia independiente: cambiar la copia no altera el original) | ✅ | ☐ |
| 15 | Crear al menos cuatro estrategias | E2E 5 (5 estrategias) | ✅ | ☐ |
| 16 | Cambiar entre ellas | E2E 5 | ✅ | ☐ |
| 17 | Eliminar estrategia (con confirmación) | E2E 5 (cancelar y confirmar) | ✅ | ☐ |
| 18 | Eliminar todas | E2E 6 → estado vacío, también tras recargar | ✅ | ☐ |
| 19 | Persistencia al recargar | E2E 4, 5 y 6 + unitarios de `storage` | ✅ | ☐ |
| 20 | Capital inicial válido | E2E 3 («50.000» → 50.000 €) | ✅ | ☐ |
| 21 | Capital inicial inválido | E2E 3 (negativo, 0, texto, vacío, 2.000 millones, 3 decimales) | ✅ | ☐ |
| 22 | Nombres (vacío, > 40, duplicado) | E2E 2 + unitarios | ✅ | ☐ |
| 23 | Responsive móvil | E2E 7 (375 px) + revisión visual | ✅ | ☐ |
| 24 | Estado vacío | E2E 1 + revisión visual | ✅ | ☐ |
| 25 | News sigue funcionando | E2E 8 + pytest E2E | ✅ | ☐ |
| 26 | Explore Markets sigue funcionando | E2E 8 + pytest E2E/integración | ✅ | ☐ |

**Pendiente de prueba manual por el equipo:**
- abrir los tooltips ⓘ del Strategy Builder;
- cerrar el navegador y volver a abrirlo (los E2E solo recargan la página);
- el aspecto visual general.

**Estado de la fase:** ✅ aprobada por el equipo.

---

## Fase 2 — Explore Markets completo + News (V0.3) — ✅ APROBADA

### A. Tests automáticos (2026-11-11)

| Suite | Resultado |
|---|---|
| Deterministas | **124 passed** |
| Integración con Yahoo y noticias reales | **32 passed** |
| E2E con la app arrancada mediante los `.bat` | **13 passed** |
| `npm run build` | **OK** |

**Qué cubren los deterministas:**
- **Rendimiento** (`test_performance.py`, 34 tests):
  - los 7 periodos;
  - inicio en sábado, días sin cotización inventados, fechas inválidas, inicial posterior a la final, fechas futuras;
  - histórico más corto, rango sin sesiones, 1 solo cierre, NaN y precios ≤ 0;
  - CAGR con menos de 1 año y fórmula exacta, volatilidad con menos de 20 rentabilidades, anualización 365 frente a 252;
  - máximo drawdown y serie de caídas, reducción del gráfico que conserva el máximo y el mínimo, fechas de Tokio.
- **Métricas** (`test_metrics.py`): umbral exacto de 365 días del CAGR y mínimo de rentabilidades para la volatilidad.
- **News** (`test_news.py`, 24 tests):
  - lectura de RSS, limpieza de HTML, fechas inválidas, timeout y HTTP 403;
  - orden, duplicados, sufijo de Google, enlaces `javascript:` y noticias antiguas;
  - fallo parcial, fallo total, caché, contenido anterior servido 20 min después y caducado a las 7 h;
  - búsqueda con y sin resultados, validación y caché.
- **API:** `/performance` (periodo, fechas, errores 400), `/news` (200, 503, 400) y un índice que ahora es válido.

**Qué cubre la integración** (sin depender de si el mercado sube o baja):
- **Mercados:** los 6 tipos de activo con datos reales; estructura de los 7 periodos; 10A cubre 10 años; inicio el 2024-01-06 (sábado) → 2024-01-08; en VOO, rentabilidad total > solo precio; la caché evita nuevas descargas.
- **Noticias:** portada con al menos 10 noticias reales, enlaces https y fechas recientes; las 6 categorías con noticias; los feeds del BCE y la Fed se leen; búsqueda real con y sin resultados.

### B. Comprobaciones en el navegador (Claude Code, 2026-11-11)

**Explore Markets**

| # | Prueba | Resultado observado | Equipo |
|---|---|---|---|
| 1 | Acción válida (TSLA) | ✅ Acción, TER "No aplica" con explicación, 4 métricas y gráfico | ☐ |
| 2 | ETF válido (VOO) | ✅ ETF, TER 0,03 %; 1A: +12,50 % total, +11,22 % solo precio | ☐ |
| 3 | Índice, cripto, futuro, fondo | ✅ ^GSPC, BTC-USD (volatilidad con 365 días), ES=F y VFIAX (TER 0,04 %), cada uno con su nota | ☐ |
| 4 | Ticker inválido | ✅ "No se ha encontrado ningún activo con el ticker «INVALIDTICKERXYZ»" | ☐ |
| 5 | Tipo no soportado (EURUSD=X) | ✅ Mensaje claro | ☐ |
| 6 | Los 7 periodos | ✅ 1M, 6M, año actual, 1A, 5A, 10A (2.513 sesiones) y Máx. (4.069) | ☐ |
| 7 | Fechas personalizadas con inicio en sábado | ✅ 06/01/2024 → empieza el 08/01/2024, con aviso | ☐ |
| 8 | Fecha inicial posterior a la final | ✅ Error en el formulario; los datos anteriores no se pierden | ☐ |
| 9 | Periodo inferior a un año | ✅ CAGR "—" con el motivo ("dura 30 días…") | ☐ |
| 10 | Periodo demasiado corto para la volatilidad | ✅ 10 sesiones → volatilidad "—" con el motivo | ☐ |
| 11 | Histórico insuficiente (VOO 2008-2012) | ✅ Empieza el 09/09/2010, con aviso | ☐ |
| 12 | Sin datos (rango 2000-2005, solo fin de semana, 1 cierre) | ✅ Estado "No hay datos suficientes" con explicación, sin avisos contradictorios | ☐ |
| 13 | Cambio rápido de periodo (1M → 10A → 6M) | ✅ Se queda 6M con sus datos | ☐ |
| 14 | Tooltips ⓘ de las métricas | ☐ Pendiente de prueba manual | ☐ |
| 15 | Móvil (375 px) | ✅ Sin scroll horizontal; métricas en una columna | ☐ |

**News**

| # | Prueba | Resultado observado | Equipo |
|---|---|---|---|
| 16 | Carga real de la portada | ✅ 36 noticias de las 6 categorías | ☐ |
| 17 | Enlaces correctos | ✅ `target=_blank`, `rel=noopener noreferrer`, enlace https de Google News o de la fuente oficial | ☐ |
| 18 | Fuente y fecha visibles | ✅ Medio + "hace 40 min" (fecha completa al pasar el ratón) | ☐ |
| 19 | Categoría Bancos centrales | ✅ Incluye el BCE marcado como "Fuente oficial" y "EN" | ☐ |
| 20 | Buscador | ✅ «Inditex» devuelve noticias del último mes | ☐ |
| 21 | Sin resultados | ✅ Mensaje informativo, sin relleno | ☐ |
| 22 | Fuente caída o timeout | ✅ Con el backend apagado: mensaje de Capi + "Reintentar". El fallo de proveedores está cubierto por los tests deterministas | ☐ |
| 23 | Caché | ✅ Probada en tests: no se vuelve a descargar en 10 min | ☐ |
| 24 | Móvil (375 px) | ✅ Una columna, sin scroll horizontal | ☐ |
| 25 | Abrir una noticia y llegar al medio original | ☐ Pendiente de prueba manual (Google puede mostrar antes su página de consentimiento) | ☐ |

**Estado de la fase:** ✅ aprobada por el equipo.

---

## Fase 1 — Estabilización de la base (V0.2) — ✅ APROBADA

Resultados de entonces: 57 tests deterministas, 16 de integración y 11 E2E superados, más 19 comprobaciones en el navegador.

Sus casos siguen cubiertos por la suite actual, salvo dos que cambiaron por decisión de la Fase 2:
- los índices y la cripto, que ahora se aceptan (D18);
- los periodos 1D y 1S, que se han eliminado (D19).

---

## V0.1 (histórico)

Los 10 tests de V0.1 se documentaron como superados al 100 %. La auditoría de la Fase 0 detectó que el arnés no podía detectar algunos fallos (ver [[Versiones]] §V0.1).
