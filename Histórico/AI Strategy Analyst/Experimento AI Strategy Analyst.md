# Experimento AI Strategy Analyst (Fases 6–6.1) — retirado en la Fase 8.1

Esta carpeta conserva el rastro del módulo **AI Strategy Analyst**. Se construyó, se probó y se **retiró del producto por decisión del equipo** el 2026-11-18 ([[Decisiones]] D80).

Su código se eliminó de la aplicación. La evidencia de lo que existió está en:
- **Prompts versionados:** [[Prompt analyst-v1]] (Fase 6, con la API de Claude) y [[Prompt analyst-v2]] (Fase 6.1, con LM Studio). Son copias literales de `backend/ai/prompts/` antes de borrarlo.
- **Arquitectura y decisiones:** [[Decisiones]] D59–D69 (función del analista, proveedor desacoplado, input estructurado, guardrails, perfil educativo, caché, LM Studio) y D80 (retirada).
- **Versiones:** [[Versiones]] V0.8 (API de Claude), V0.9 (LM Studio) y V0.11 (retirada).
- **Datos enviados al modelo:** [[Datos y fuentes]] §8.
- **Pruebas:** [[Acceptance tests]] §Fase 6 y §Fase 6.1.
- **Incidencias con el modelo local:** [[Bitácora]] §19 y [[Errores de la IA]] E15–E16.

**Qué existía en el código** (hasta la V0.10):

| Pieza | Archivos | Función |
|---|---|---|
| Backend | `backend/ai/analyst_input.py`, `prompts.py`, `provider.py` (`AIProvider`, `LMStudioProvider`), `validation.py` (guardrails), `analyst_service.py` (caché 1 h) | Generar y validar el análisis |
| API | `backend/routers/analyst.py` | `GET /api/analyst/status`, `POST /api/analyst/analyze` |
| Frontend | `frontend/src/features/analyst/` (`AIStrategyAnalyst.jsx`, `AnalystResults.jsx`, `profile.js`), `frontend/src/api/analystApi.js` | Página `/analyst` |
| Tests | `backend/tests/test_analyst.py`, `test_integration_analyst.py`, `frontend/e2e/ai-analyst.spec.js`, `profile.test.js` | Proveedor simulado y E2E simulados |
| Configuración | `backend/.env.example` (`AI_PROVIDER`, `LMSTUDIO_*`, `AI_TIMEOUT_SECONDS`) | LM Studio local |
