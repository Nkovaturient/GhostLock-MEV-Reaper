// routes/solver.js
const express = require('express');
const router = express.Router();
const { solverService } = require('../services/solver.js');
const { registryService } = require('../services/solverRegistry.js'); // we'll add this service in next section
require('dotenv').config();

const ADMIN_TOKEN = process.env.SOLVER_ADMIN_TOKEN || '';

// middleware: simple bearer token auth for admin endpoints
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!ADMIN_TOKEN) return res.status(403).json({ error: 'Admin token not configured on server' });
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Bearer token' });
  const token = auth.slice(7);
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Invalid admin token' });
  next();
}

// public read: solver status
router.get('/status', (req, res) => {
  try {
    const status = solverService.getStatus();
    res.json({ ok: true, status });
  } catch (err) {
    console.error('GET /api/solver/status error', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});

// admin: start solver
router.post('/start', requireAdmin, async (req, res) => {
  try {
    await solverService.start();
    res.json({ ok: true, message: 'solver started' });
  } catch (err) {
    console.error('POST /api/solver/start', err);
    res.status(500).json({ ok: false, error: err.message || 'failed' });
  }
});

// admin: stop solver
router.post('/stop', requireAdmin, async (req, res) => {
  try {
    await solverService.stop();
    res.json({ ok: true, message: 'solver stopped' });
  } catch (err) {
    console.error('POST /api/solver/stop', err);
    res.status(500).json({ ok: false, error: err.message || 'failed' });
  }
});

// public: list registered solvers (reads from registryService)
router.get('/registry/solvers', async (req, res) => {
  try {
    const list = await registryService.getRegisteredSolvers();
    res.json({ ok: true, solvers: list });
  } catch (err) {
    console.error('GET /api/solver/registry/solvers', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});

// admin: slash solver (on-chain) - body: { solver: address, amount: string, to: address }
router.post('/registry/slash', requireAdmin, async (req, res) => {
  try {
    const { solver, amount, to } = req.body;
    if (!solver || !amount || !to) return res.status(400).json({ ok: false, error: 'missing params' });
    const tx = await registryService.slashSolver(solver, amount, to);
    res.json({ ok: true, txHash: tx.hash });
  } catch (err) {
    console.error('POST /api/solver/registry/slash', err);
    res.status(500).json({ ok: false, error: err.message || 'failed' });
  }
});

module.exports = router;
