const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Document, Packer, Paragraph } = require('docx');
const PDFDocument = require('pdfkit');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Rota para gerar sugestões de correção a partir da justificativa e do critério
router.post('/sugestoes', async (req, res) => {
  try {
    const { criterio, descricao, justificativa, ementa } = req.body;

    if (!descricao) {
      return res
        .status(400)
        .json({ error: 'Descrição do critério é obrigatória.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: 'GEMINI_API_KEY não configurada no backend.' });
    }

    const objetivos = ementa?.objetivos || 'Não informados';
    const conteudo = ementa?.conteudo_programatico || 'Não informado';

    const prompt = `
Você é um revisor pedagógico de materiais didáticos para o ensino médio.

Sua entrada:
- Critério: "${descricao}"
- Justificativa (contendo exemplos de trechos problemáticos): "${justificativa || 'Sem justificativa detalhada.'}"
- Objetivos da ementa: "${objetivos}"
- Conteúdo programático: "${conteudo}"

O QUE VOCÊ DEVE FAZER:

1) Leia a JUSTIFICATIVA e identifique as EXPRESSÕES ou TRECHOS PROBLEMÁTICOS,
   principalmente aqueles que aparecem ENTRE ASPAS (simples ou duplas),
   por exemplo: "Legal, né?", 'Super prático, né?', etc.

2) Para CADA expressão problemática, crie uma versão corrigida, mais adequada
   para um material didático do ensino médio (linguagem clara, formal, objetiva).

3) Para CADA correção, retorne um objeto com:
   - "original": exatamente o trecho problemático que aparece na justificativa
                e também no material (por exemplo "Legal, né?").
                Esse texto será usado literalmente para localizar e substituir
                dentro da apostila, então não invente variações.
   - "sugestao": o mesmo trecho reescrito de forma adequada.
   - "contexto": local aproximado onde isso aparece (ex.: "Capítulo 3, exemplos").

4) IMPORTANTE:
   - Não gere parágrafos genéricos sobre a apostila inteira.
   - Foque em MÚLTIPLAS correções pontuais: uma entrada no array "correcoes"
     para cada expressão que precisa ser trocada.
   - "original" DEVE ser um trecho curto que possa ser encontrado no texto.

FORMATO DE SAÍDA (OBRIGATÓRIO):

Retorne APENAS um JSON válido, exatamente no formato:

{
  "correcoes": [
    {
      "original": "texto original exato a ser substituído",
      "sugestao": "texto sugerido para ficar no lugar",
      "contexto": "onde aplicar essa mudança"
    }
  ]
}

Se não houver NADA que possa ser corrigido, retorne:

{"correcoes": []}
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      console.error('Resposta da IA sem JSON:', text);
      return res
        .status(500)
        .json({ error: 'Resposta da IA não retornou JSON válido.' });
    }

    const jsonString = text.substring(start, end + 1);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error('Falha ao parsear JSON da IA:', e, jsonString);
      return res
        .status(500)
        .json({ error: 'Falha ao interpretar a resposta da IA.' });
    }

    if (!parsed.correcoes) {
      parsed.correcoes = [];
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Erro IA /sugestoes:', err);
    res.status(500).json({ error: 'Falha ao gerar sugestão de correção.' });
  }
});

// Rota para aplicar correções e gerar DOCX/PDF
router.post('/aplicar-correcoes', async (req, res) => {
  try {
    const { textoOriginal, correcoes, formato } = req.body;

    if (!textoOriginal) {
      return res.status(400).json({ error: 'Texto original é obrigatório.' });
    }
    if (!Array.isArray(correcoes) || correcoes.length === 0) {
      return res
        .status(400)
        .json({ error: 'Lista de correções é obrigatória.' });
    }

    let textoCorrigido = textoOriginal;
    correcoes.forEach((corr) => {
      if (!corr.original || !corr.sugestao) return;
      const escaped = corr.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      textoCorrigido = textoCorrigido.replace(regex, corr.sugestao);
    });

    const tmpRoot = path.join(__dirname, '..', '..', 'tmp');
    if (!fs.existsSync(tmpRoot)) {
      fs.mkdirSync(tmpRoot, { recursive: true });
    }

    const fmt = (formato || 'docx').toLowerCase();

    if (fmt === 'pdf') {
      const pdfPath = path.join(tmpRoot, `corrigido-${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      doc.fontSize(12).text(textoCorrigido);
      doc.end();

      stream.on('finish', () => {
        res.download(pdfPath, 'versao_corrigida.pdf', () => {
          fs.unlink(pdfPath, () => {});
        });
      });
    } else {
      const docxPath = path.join(tmpRoot, `corrigido-${Date.now()}.docx`);
      const doc = new Document({
        sections: [
          {
            children: textoCorrigido.split('\n').map((line) => new Paragraph(line)),
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(docxPath, buffer);

      res.download(docxPath, 'versao_corrigida.docx', () => {
        fs.unlink(docxPath, () => {});
      });
    }
  } catch (err) {
    console.error('Erro em /aplicar-correcoes:', err);
    res
      .status(500)
      .json({ error: 'Falha ao aplicar correções e gerar arquivo.' });
  }
});

module.exports = router;
