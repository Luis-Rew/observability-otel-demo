const express = require('express');
const { logger } = require('./logger');
const { register, httpRequestDuration, httpRequestsTotal } = require('./metrics');
const tasksRouter = require('./routes/tasks');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Middleware de métricas: mede toda requisição que passa pela aplicação,
// não só as rotas de negócio. É assim que dashboards de "RED" (Rate, Errors,
// Duration) costumam ser montados na prática.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    // Usamos req.route?.path (quando existe) em vez de req.path para não
    // explodir a cardinalidade das métricas com um label por id de tarefa
    // (/tasks/1, /tasks/2, /tasks/3, ...) — isso é uma armadilha comum e
    // real ao instrumentar métricas em rotas com parâmetros dinâmicos.
    const route = req.route ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };

    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
});

app.use('/tasks', tasksRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  logger.info(`tasks-api ouvindo na porta ${port}`);
});
