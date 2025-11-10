
const { Pool } = require('pg');

const connectionString = process.env.DB_CONNECTION_STRING;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        criado_em TIMESTAMPTZ DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS relatorios (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        conteudo JSONB NOT NULL,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Tabelas usuarios e relatorios prontas.');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err);
  }
}

module.exports = { pool, initDb };
