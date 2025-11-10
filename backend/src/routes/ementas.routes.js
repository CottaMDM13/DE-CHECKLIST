
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nome_disciplina, carga_horaria, objetivos, conteudo_programatico
      FROM ementa
      ORDER BY nome_disciplina;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar ementas:', err);
    res.status(500).json({ error: 'Erro ao buscar ementas.' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, nome_disciplina, carga_horaria, objetivos, conteudo_programatico FROM ementa WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ementa não encontrada.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar ementa:', err);
    res.status(500).json({ error: 'Erro ao buscar ementa.' });
  }
});

module.exports = router;
