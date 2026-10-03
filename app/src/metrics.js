const client = require('prom-client');

// Métricas "de infraestrutura" do próprio processo Node (uso de memória,
// event loop lag, etc) — o prom-client já sabe coletar isso sozinho.
client.collectDefaultMetrics({ prefix: 'tasks_api_' });

const httpRequestDuration = new client.Histogram({
  name: 'tasks_api_http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets pensados para uma API web comum: a maioria das respostas deve
  // cair nos primeiros buckets (abaixo de 300ms); os maiores existem para
  // conseguir enxergar as requisições lentas na cauda da distribuição.
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const httpRequestsTotal = new client.Counter({
  name: 'tasks_api_http_requests_total',
  help: 'Total de requisições HTTP recebidas',
  labelNames: ['method', 'route', 'status_code'],
});

const tasksCreatedTotal = new client.Counter({
  name: 'tasks_api_tasks_created_total',
  help: 'Total de tarefas criadas desde que o processo subiu',
});

module.exports = {
  register: client.register,
  httpRequestDuration,
  httpRequestsTotal,
  tasksCreatedTotal,
};
