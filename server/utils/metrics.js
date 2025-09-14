const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const counterSettlements = new client.Counter({
  name: 'ghostlock_settlements_total',
  help: 'Total settlements completed'
});

const gaugeSolverBalance = new client.Gauge({
  name: 'ghostlock_solver_balance_eth',
  help: 'Solver ETH balance'
});

// Expose metrics handler
function metricsHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  client.register.metrics().then(metrics => res.end(metrics));
}

module.exports = {metricsHandler, gaugeSolverBalance, counterSettlements}