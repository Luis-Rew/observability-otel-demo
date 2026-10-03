// Esse arquivo precisa ser carregado ANTES de qualquer outro código da
// aplicação (veja o script "start" em package.json: `node --require
// ./tracing.js src/index.js`). O OpenTelemetry instrumenta bibliotecas como
// o Express e o módulo http do Node "por baixo dos panos" (monkey-patching),
// e isso só funciona se ele rodar antes delas serem importadas.
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'tasks-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  // Em vez de cada serviço falar diretamente com o backend de tracing (Tempo),
  // mandamos tudo para o OTel Collector. Ele funciona como um "hub" — recebe
  // de qualquer linguagem/framework via um protocolo padrão (OTLP) e decide
  // para onde rotear. Isso desacopla a aplicação do backend de observabilidade
  // específico: trocar o Tempo por outra ferramenta não exige tocar no código.
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
