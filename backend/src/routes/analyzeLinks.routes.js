
const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  const { links } = req.body;
  if (!Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ error: 'Lista de links é obrigatória.' });
  }

  const analysis = links.map((link) => ({
    link,
    status: 'Reprovado',
    descricao: 'Validação detalhada de link temporariamente indiponível. Verifique manualmente este recurso.',
    displayText: `${link} - análise pendente`,
  }));

  res.json({ analysis });
});

module.exports = router;
