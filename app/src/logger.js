const pino = require('pino');
const { trace, context } = require('@opentelemetry/api');

/**
 * Logger que injeta trace_id/span_id em toda linha de log — essa é a peça
 * central para CORRELACIONAR os três pilares da observabilidade:
 *
 *   - Você vê um pico de latência numa MÉTRICA (Prometheus/Grafana)
 *   - Clica nele e cai num TRACE daquele intervalo de tempo (Tempo)
 *   - A partir do trace_id do span, pula direto para os LOGS daquela
 *     requisição específica (Loki) — sem precisar procurar por timestamp
 *     aproximado numa pilha de logs.
 *
 * Sem o trace_id em cada log, essa navegação não existe: logs, métricas e
 * traces ficam sendo três ferramentas separadas que não se conversam.
 */
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

function withTraceContext() {
  const span = trace.getSpan(context.active());
  if (!span) {
    return {};
  }
  const { traceId, spanId } = span.spanContext();
  return { trace_id: traceId, span_id: spanId };
}

const logger = {
  info: (msg, extra = {}) => baseLogger.info({ ...withTraceContext(), ...extra }, msg),
  warn: (msg, extra = {}) => baseLogger.warn({ ...withTraceContext(), ...extra }, msg),
  error: (msg, extra = {}) => baseLogger.error({ ...withTraceContext(), ...extra }, msg),
};

module.exports = { logger, baseLogger };
