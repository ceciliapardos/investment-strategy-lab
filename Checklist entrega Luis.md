# Checklist de entrega — profesor Luis

**Base:** enunciado «El carril abierto» (`trabajo grupo/01 Trabajo a entregar - Carril Abierto.pdf`). Entrega el **26 de noviembre**.

**Estados:**
- ✅ hecho, con evidencia;
- 🟡 en curso o hecho parcialmente;
- ⬜ pendiente.

Ningún punto se marca ✅ sin una evidencia en la carpeta. Revisado el 2026-11-19 (Fases 8, 8.1, 9 y 9.1); el estado final lo decide el equipo.

---

## 1. Entregables

| Requisito | Evidencia | Archivo | Estado |
|---|---|---|---|
| Proyecto funcionando | Fases 0–5 aprobadas; Fase 7 y 8.1 completadas técnicamente; regresión V0.11 en verde (backend 295 + 54, Vitest 93, Playwright 45). La Fase 6 (AI Analyst) se descartó (D80): ya no requiere validación | [[Fases del proyecto]], [[Versiones]] V0.11 | 🟡 Fases 7 y 8.1 pendientes de validación humana |
| Repositorio público en github.com/lgarvia | Publicado en https://github.com/ceciliapardos/investment-strategy-lab, rama `main`, con código, tests, documentación y resultados reproducibles; secretos y temporales excluidos | `README.md`, `.gitignore` | 🟡 Publicado en la cuenta del equipo. El enunciado lo sitúa «al lado de» los repositorios de github.com/lgarvia: confirmad con el profesor si basta con enviarle el enlace o hay que transferirlo o hacer un *fork* allí |
| Qué se publica (capturas, `entrega_provisional/`, nombres del equipo) | Decisión pendiente | [[Decisiones]] D70 | ⬜ |
| Bitácora de 2–4 páginas | Hay una bitácora provisional de la Fase 4 (12/11/2026), anterior a las Fases 5–8 | `entrega_provisional/` | ⬜ La versión final está por escribir (fuera del alcance de la Fase 8) |
| Bitácora: qué queríamos hacer y qué hicimos | Cronología completa | [[Idea del Proyecto]], [[Bitácora]] | 🟡 Material listo; falta redactar |
| Bitácora: las tres decisiones importantes y qué descartamos | Tres candidatas (D77) + retirada de AI Strategy Analyst como candidata fuerte (D80); alternativas descartadas (D78) | [[Decisiones]] D77, D78, D80 | 🟡 El equipo debe elegirlas |
| Bitácora: dónde falló la máquina | 31 casos clasificados por fuerza (6 A) | [[Errores de la IA]] | 🟡 El equipo debe elegir los casos |
| Bitácora: qué haríamos distinto | 5 aprendizajes propuestos | [[Decisiones]] D79 | 🟡 Pendiente de revisión |

## 2. Requisito eliminatorio («Sin esto, no hay nota»)

| Requisito | Evidencia | Archivo | Estado |
|---|---|---|---|
| Tres casos concretos en los que la máquina se equivocó | Seis casos A con evidencia (E01–E06) | [[Errores de la IA]] Parte I | 🟡 Falta la selección del equipo |
| …qué nos dijo | Citas literales en E02, E12 y E28; en E01 y E09 solo hay registro escrito, sin captura | Ídem | 🟡 |
| …cómo detectamos que estaba mal | Descrito en cada caso, indicando cuándo detectó la propia IA (E02, E05, E14) | Ídem | ✅ |
| …contra qué fuente primaria lo comprobamos | CNMV, Vanguard, Bankinter, documentación de yfinance, código y logs | Ídem; [[Investigación principal]] §9 | 🟡 E05: conviene que el equipo repita el cálculo con la web de Bankinter |

## 3. Reglas de uso de la IA

| Regla | Evidencia | Archivo | Estado |
|---|---|---|---|
| 1. Úsala | Antigravity y Claude Code como método; LM Studio + Qwen3 8B como experimento descartado | [[Idea del Proyecto]] «Herramientas utilizadas» | ✅ |
| 2. Decláralo | Sección «Desarrollo asistido por IA» del `README.md` (Antigravity, Claude Code, Obsidian, LM Studio + Qwen3 8B como experimento descartado) y documentación en Obsidian | `README.md`, [[Idea del Proyecto]], [[Bitácora]] §9 | ✅ |
| 3. Guarda el rastro (hilos, prompts, versiones) | Versiones y decisiones fechadas; prompts del analista conservados en `Histórico/AI Strategy Analyst/`; transcripciones de Claude Code solo en local; registro de Antigravity en `../Proyecto Coste Invisible/`; historial en Git desde la publicación | [[Versiones]], [[Decisiones]], [[Bitácora]], repositorio público | 🟡 Las transcripciones y el rastro de Antigravity siguen fuera del repositorio |
| 4. Lo que firmas, lo defiendes | Requiere que el equipo domine cada caso y cada fuente | — | ⬜ Tarea humana |

## 4. Criterios de evaluación

| Criterio (peso) | Evidencia disponible | Archivo | Estado |
|---|---|---|---|
| Calidad de las decisiones (35 %) | Registro D1–D81 (incluida la retirada razonada de una funcionalidad ya construida, D80), con contexto, alternativas y estado; cambios de rumbo documentados | [[Decisiones]], [[Idea del Proyecto]] | 🟡 Falta elegir las 3 principales |
| Control sobre la máquina (30 %) | Auditoría de la Fase 0; aprobación humana por fase; errores de IA con detección y corrección; diagnóstico humano en E15–E16 | [[Errores de la IA]], [[Fases del proyecto]] | 🟡 |
| Ancla financiera (20 %) | Pregunta, hipótesis, variables, literatura y limitaciones; tarifas oficiales; TER sin doble cómputo; resultados empíricos contrastados con las hipótesis (§12) | [[Investigación principal]], [[Experimentos y resultados]], [[Datos y fuentes]] | 🟡 Pendiente de aprobación del equipo |
| Ejecución (15 %) | App de 5 módulos con tests deterministas, de integración y E2E; sin dependencias de IA ni servicios de pago | [[Acceptance tests]], `backend/tests/`, `frontend/e2e/` | 🟡 Fases 7 y 8.1 sin validar por el equipo |

## 5. Otros puntos del enunciado

| Requisito | Evidencia | Archivo | Estado |
|---|---|---|---|
| «Cambiar de idea… se documenta» | Coste Invisible → comparador → Investment Strategy Lab | [[Idea del Proyecto]], [[Bitácora]] §1–10 | ✅ |
| Propuesta del 24 de septiembre (puntos 1–6, con «cómo sabré si ha salido bien») | No hay copia de la propuesta en esta carpeta | — | ⬜ El equipo debe localizarla y enlazarla |
| Checkpoint del 22 de octubre | No consta en la carpeta | — | ⬜ Ídem |
| «Cómo sabremos si ha salido bien» | Criterios redactados en la Fase 8 | [[Investigación principal]] §10 | 🟡 Redactados tarde (ver D79) |
| Resultados empíricos con la app (para la bitácora) | 5 experimentos **congelados** (Fase 9.1): E4 validado; E1–E3 validados con limitaciones; E5 hipotético. Supuestos tarifarios contrastados con fuentes oficiales y grado de certeza (ALTA/MEDIA/BAJA) por cifra | [[Experimentos y resultados]], `Resultados investigación/` | ✅ Validado por el equipo: P1–P6 coinciden (2026-11-19, [[Acceptance tests]]); resultados definitivamente congelados |
| Sin predicciones ni asesoramiento | Principios y avisos en la interfaz; el producto ya no genera texto con IA | [[Idea del Proyecto]], `README.md` | ✅ |
| Datos trazables | Cadenas A–E con fuente, transformación, archivo, endpoint y test (la F, generativa, es histórica) | [[Cadena de datos y reproducibilidad]] | ✅ |
