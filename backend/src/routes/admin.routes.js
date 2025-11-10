const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../auth');

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Somente para usuários com role = 'admin'.
 * Retorna:
 * - resumo: totais
 * - topUsuarios: usuários com maior média de pontuação
 * - topDocumentos: documentos com melhor pontuação final + ementa (disciplina)
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Acesso restrito ao administrador.' });
    }

    const query = `
      SELECT
        r.id,
        r.titulo,
        r.tipo,
        r.conteudo,
        r.criado_em,
        u.id    AS usuario_id,
        u.nome  AS usuario_nome,
        u.email AS usuario_email
      FROM relatorios r
      JOIN usuarios u ON u.id = r.usuario_id
      ORDER BY r.criado_em DESC;
    `;

    const result = await pool.query(query);
    const relatorios = result.rows || [];

    const usuariosMap = {};
    const documentos = [];

    for (const row of relatorios) {
      let pontuacaoFinal = null;
      let ementaTitulo = null;

      if (row.conteudo) {
        try {
          const parsed =
            typeof row.conteudo === 'string'
              ? JSON.parse(row.conteudo)
              : row.conteudo;

          const resultado = parsed?.resultado;

          // pontuação final
          if (
            resultado &&
            typeof resultado.pontuacaoFinal !== 'undefined'
          ) {
            const num = Number(resultado.pontuacaoFinal);
            if (!Number.isNaN(num)) {
              pontuacaoFinal = num;
            }
          }

          // tentar extrair a disciplina / ementa usada
          let ementaObj =
            parsed?.ementaUtilizada ||
            parsed?.ementa ||
            resultado?.ementaUtilizada ||
            parsed?.dadosEmenta ||
            null;

          if (ementaObj) {
            if (typeof ementaObj === 'string') {
              ementaTitulo = ementaObj;
            } else if (typeof ementaObj === 'object') {
              ementaTitulo =
                ementaObj.nome_disciplina ||
                ementaObj.nome ||
                ementaObj.disciplina ||
                ementaObj.titulo ||
                ementaObj.descricao ||
                null;
            }
          }
        } catch (e) {
          console.error(
            'Falha ao parsear conteúdo do relatório (admin dashboard):',
            e
          );
        }
      }

      if (pontuacaoFinal !== null) {
        documentos.push({
          id: row.id,
          titulo: row.titulo,
          tipo: row.tipo,
          pontuacaoFinal,
          usuarioId: row.usuario_id,
          usuarioNome: row.usuario_nome,
          usuarioEmail: row.usuario_email,
          criadoEm: row.criado_em,
          ementa: ementaTitulo,
        });

        if (!usuariosMap[row.usuario_id]) {
          usuariosMap[row.usuario_id] = {
            usuarioId: row.usuario_id,
            nome: row.usuario_nome,
            email: row.usuario_email,
            somaPontuacao: 0,
            totalRelatorios: 0,
          };
        }

        usuariosMap[row.usuario_id].somaPontuacao += pontuacaoFinal;
        usuariosMap[row.usuario_id].totalRelatorios += 1;
      }
    }

    const topUsuarios = Object.values(usuariosMap)
      .map((u) => ({
        usuarioId: u.usuarioId,
        nome: u.nome,
        email: u.email,
        mediaPontuacao:
          u.totalRelatorios > 0
            ? Number(
                (u.somaPontuacao / u.totalRelatorios).toFixed(2)
              )
            : 0,
        totalRelatorios: u.totalRelatorios,
      }))
      .sort((a, b) => b.mediaPontuacao - a.mediaPontuacao)
      .slice(0, 5);

    const topDocumentos = documentos
      .sort((a, b) => b.pontuacaoFinal - a.pontuacaoFinal)
      .slice(0, 10);

    const resumo = {
      totalRelatorios: relatorios.length,
      totalComPontuacao: documentos.length,
      totalUsuarios: Object.keys(usuariosMap).length,
    };

    return res.json({
      resumo,
      topUsuarios,
      topDocumentos,
    });
  } catch (err) {
    console.error('Erro ao montar dashboard admin:', err);
    res
      .status(500)
      .json({ error: 'Erro ao montar dashboard administrativo.' });
  }
});

module.exports = router;
