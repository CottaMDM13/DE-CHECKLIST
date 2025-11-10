
const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Criar relatório
router.post('/', authenticateToken, async (req, res) => {
  const { id: usuarioId } = req.user;
  const { titulo, tipo, conteudo } = req.body;

  if (!titulo || !tipo || !conteudo) {
    return res.status(400).json({ error: 'Título, tipo e conteúdo são obrigatórios.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO relatorios (usuario_id, titulo, tipo, conteudo)
       VALUES ($1, $2, $3, $4)
       RETURNING id, usuario_id, titulo, tipo, conteudo, criado_em`,
      [usuarioId, titulo, tipo, conteudo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar relatório:', err);
    res.status(500).json({ error: 'Erro ao salvar relatório.' });
  }
});

// Listar relatórios (user vê os seus, admin vê todos)
router.get('/', authenticateToken, async (req, res) => {
  const { id: usuarioId, role } = req.user;

  try {
    let query;
    let params;

    if (role === 'admin') {
      query = `
        SELECT r.id, r.titulo, r.tipo, r.conteudo, r.criado_em,
               u.nome AS usuario_nome, u.email AS usuario_email
        FROM relatorios r
        JOIN usuarios u ON u.id = r.usuario_id
        ORDER BY r.criado_em DESC;
      `;
      params = [];
    } else {
      query = `
        SELECT id, titulo, tipo, conteudo, criado_em
        FROM relatorios
        WHERE usuario_id = $1
        ORDER BY criado_em DESC;
      `;
      params = [usuarioId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar relatórios:', err);
    res.status(500).json({ error: 'Erro ao buscar relatórios.' });
  }
});

module.exports = router;
