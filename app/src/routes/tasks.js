const express = require('express');
const { trace } = require('@opentelemetry/api');
const { logger } = require('../logger');
const { tasksCreatedTotal } = require('../metrics');

const router = express.Router();

// Estado em memória de propósito: esse projeto existe para demonstrar
// observabilidade, não persistência de dados — um banco de verdade só
// adicionaria complexidade sem ensinar nada a mais sobre tracing/logs/métricas.
let tasks = [
  { id: 1, title: 'Configurar o OpenTelemetry', done: true },
  { id: 2, title: 'Conectar Grafana ao Prometheus, Loki e Tempo', done: false },
];
let nextId = 3;

function randomDelay(minMs, maxMs) {
  return new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));
}

router.get('/', async (req, res) => {
  // Delay artificial para a métrica/trace de duração não ficarem todos
  // idênticos e próximos de zero — num demo isso deixa os gráficos do
  // Grafana com uma variação visível e mais realista de observar.
  await randomDelay(20, 150);
  logger.info('Listando tarefas', { count: tasks.length });
  res.json(tasks);
});

router.get('/:id', async (req, res) => {
  const span = trace.getActiveSpan();
  const task = tasks.find((t) => t.id === Number(req.params.id));

  if (!task) {
    span?.setAttribute('task.found', false);
    logger.warn('Tarefa não encontrada', { task_id: req.params.id });
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  span?.setAttribute('task.found', true);
  await randomDelay(10, 80);
  res.json(task);
});

router.post('/', async (req, res) => {
  const { title } = req.body;

  if (!title) {
    logger.warn('Tentativa de criar tarefa sem título');
    return res.status(400).json({ error: 'O campo "title" é obrigatório' });
  }

  await randomDelay(30, 200);

  const task = { id: nextId++, title, done: false };
  tasks.push(task);
  tasksCreatedTotal.inc();

  logger.info('Tarefa criada', { task_id: task.id, title: task.title });
  res.status(201).json(task);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);

  if (tasks.length === before) {
    logger.warn('Tentativa de remover tarefa inexistente', { task_id: id });
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  logger.info('Tarefa removida', { task_id: id });
  res.status(204).send();
});

// Rota de propósito instável: existe só para gerar erros e latência alta de
// vez em quando nos gráficos — sem ela, a suíte de observabilidade não
// teria nada interessante para mostrar (tudo daria sempre certo e rápido).
router.get('/_chaos/simulate', async (req, res) => {
  const span = trace.getActiveSpan();
  const shouldFail = Math.random() < 0.25;
  const shouldBeSlow = Math.random() < 0.2;

  if (shouldBeSlow) {
    span?.addEvent('simulando latência alta');
    await randomDelay(800, 2000);
  }

  if (shouldFail) {
    span?.setAttribute('chaos.outcome', 'error');
    logger.error('Falha simulada propositalmente pela rota de caos');
    return res.status(500).json({ error: 'Falha simulada' });
  }

  span?.setAttribute('chaos.outcome', 'success');
  res.json({ message: 'Tudo certo dessa vez' });
});

module.exports = router;
