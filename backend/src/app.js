// backend/src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDb } = require('./db');

const authRoutes = require('./routes/auth.routes');
const ementasRoutes = require('./routes/ementas.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const analyzeLinksRoutes = require('./routes/analyzeLinks.routes');
const sugestoesRoutes = require('./routes/sugestoes.routes');
const adminRoutes = require('./routes/admin.routes'); // 👈 NOVO

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());

app.use('/api', authRoutes); // /register, /login
app.use('/api/ementas', ementasRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/analyze-links', analyzeLinksRoutes);
app.use('/api', sugestoesRoutes);
app.use('/api/admin', adminRoutes); // 👈 NOVO: todas as rotas de admin começam com /api/admin

initDb();

module.exports = app;
