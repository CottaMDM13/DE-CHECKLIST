import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  LinearProgress,
  Paper,
  Button,
  TextField,
  Autocomplete,
  Alert,
} from '@mui/material';
import FileUploadSection from './FileUploadSection';
import ResultsModal from './ResultsModal';
import { useAuth } from '../contexts/AuthContext';
import CorrectionModal from './CorrectionModal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const BACKEND_API_URL =
  import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';

// Nenhum critério terá sugestões de correção
const criteriaWithSuggestions = [];

const ProfessorDashboard = () => {
  const { token, backendUrl } = useAuth();
  const [professorFile, setProfessorFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedCorrections, setAcceptedCorrections] = useState([]);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const [ementas, setEmentas] = useState([]);
  const [selectedEmenta, setSelectedEmenta] = useState(null);
  const [loadingEmentas, setLoadingEmentas] = useState(false);
  const [ementaError, setEmentaError] = useState(null);

  const [linksSummaryText, setLinksSummaryText] = useState('');

  const fullCriteriaList = [
    // ✅ NOVO CRITÉRIO PRINCIPAL – EMENTA (ID 0)
    {
      id: 0,
      displayText: 'Validar conformidade com a ementa',
      type: 'auto',
      textForAI: `
Você é um especialista educacional em alinhamento curricular para materiais didáticos do ensino médio no Maranhão. 
Seu foco neste critério é verificar se a APOSTILA DO PROFESSOR está completamente alinhada com a EMENTA selecionada.

Use SEMPRE a ementa que foi informada no contexto do prompt (disciplina, objetivos, conteúdo programático).

Sua análise deve responder a duas perguntas principais:
1. "Se eu ler toda a apostila do professor, vou conseguir trabalhar com a turma tudo o que os objetivos da ementa esperam?"
   - Verifique se há explicações, orientações, sugestões, atividades e materiais suficientes para o professor trabalhar cada objetivo.
2. "Todo o conteúdo programático da ementa está, de alguma forma, contemplado na apostila do professor?"
   - Verifique se todos os itens do conteúdo programático aparecem na apostila (com o mesmo nome ou sinônimos claros) e em contexto coerente.

Regras de decisão:
- Status "Aprovado":
  - Se TODOS os objetivos da ementa e TODOS os itens do conteúdo programático estiverem contemplados de maneira adequada na apostila do professor.
- Status "Reprovado":
  - Se pelo menos um objetivo ou item do conteúdo programático estiver ausente, muito superficial ou desalinhado.

Regras para justificativa:
- Se "Aprovado": a justificativa deve ser uma string vazia "".
- Se "Reprovado": a justificativa deve ser curta e cirúrgica, citando APENAS um ou dois exemplos claros das principais lacunas, 
  indicando capítulo/seção quando possível (ex.: "O objetivo X não é contemplado no Capítulo 3" ou 
  "O tópico Y do conteúdo programático não aparece em nenhuma seção da apostila").
      `,
    },

    // ✅ TODOS OS CRITÉRIOS ORIGINAIS DO PROFESSOR, SEM ALTERAÇÃO
    {
      id: 2,
      displayText:
        "Verificar se possui a palavra 'Aluno' e substituir por 'Estudante'.",
      type: 'auto',
      textForAI:
        "Você é um revisor linguístico especializado em linguagem inclusiva para materiais didáticos do ensino médio no Maranhão. Sua tarefa é escanear todo o texto da apostila em busca da palavra 'Aluno' (em qualquer forma, como 'aluno', 'alunos', etc.). Passo 1: Localize todas as ocorrências. Passo 2: Determine se elas precisam ser substituídas por 'Estudante' para promover neutralidade de gênero. Aprove se não houver ocorrências ou se já estiverem corretas; reprove se encontrar 'Aluno'. Se reprovado, na justificativa, mencione um ou dois exemplos com localização, como 'A palavra \"Aluno\" aparece na introdução do Capítulo 1'.",
    },
    {
      id: 3,
      displayText:
        'Verificar se é citado o nome do curso e retirar, já que o CC pode ser comum a outros Cursos.',
      type: 'auto',
      textForAI:
        "Você é um revisor de conteúdo pedagógico para apostilas do ensino médio no Maranhão. Sua tarefa é verificar se o nome de um curso ou componente curricular específico (ex: 'Engenharia Civil', 'Gastronomia') é mencionado no texto. Passo 1: Identifique menções a cursos ou componentes curriculares. Passo 2: Determine se essas menções são desnecessárias, considerando que o conteúdo pode ser compartilhado entre diferentes cursos. Reprove se houver menções específicas a cursos; aprove se não houver ou se as menções forem genéricas e adequadas. Se reprovado, na justificativa, cite um ou dois exemplos com localização, como 'O curso \"Análise de Sistemas\" foi citado na introdução do Capítulo 1'.",
    },
    {
      id: 5,
      displayText:
        'Verificar se o quadro inicial (Planejamento das aulas) com Conhecimentos e estratégias de ensino está preenchido.',
      type: 'auto',
      textForAI:
        "Você não consegue ler o conteúdo de tabelas que estão em formato de imagem. Portanto, sua tarefa é apenas verificar se existe a seção textual 'Planejamento de ensino' ou 'Planejamento das aulas'. Se você encontrar o título ou menções a essa seção/tabela no documento, o critério deve ser 'Aprovado', pois devemos assumir que a imagem da tabela está presente e preenchida. O critério só deve ser 'Reprovado' se não houver NENHUMA menção a essa seção no documento. Se reprovado, na justificativa, indique a ausência, como 'Nenhuma menção à seção Planejamento de ensino ou Planejamento das aulas foi encontrada'.",
    },
    {
      id: 6,
      displayText: 'Verificar se consta no livro os objetivos de aprendizagem.',
      type: 'auto',
      textForAI:
        'Você é um designer instrucional para materiais do ensino médio. Sua tarefa é confirmar a presença de uma introdução geral na apostila, que deve incluir objetivos de aprendizagem claros. Passo 1: Localize a seção de introdução. Passo 2: Verifique se ela apresenta objetivos explícitos. Aprove se ambos estiverem presentes e alinhados; reprove se faltar. Se reprovado, na justificativa, especifique o problema, como \'Introdução presente, mas sem objetivos de aprendizagem\'.',
    },
    {
      id: 7,
      displayText:
        'Verificar a ordem de seções por capítulo: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando.',
      type: 'auto',
      textForAI:
        'Você é um especialista em estruturação de materiais didáticos. Sua tarefa é verificar, para CADA capítulo do documento, se as seis seções a seguir estão presentes e NA ORDEM CORRETA: 1 Contextualizando, 1 Conectando, 1 Aprofundando, 1 Praticando, 1 Recapitulando e 1 Exercitando. Passo 1: Identifique todos os capítulos no documento. Passo 2: Para cada capítulo, liste as seções presentes e verifique se estão na ordem correta. Passo 3: Aprove se todos os capítulos tiverem todas as seções na ordem correta; reprove se algum capítulo estiver com seções faltantes, fora de ordem ou com nomes incorretos (ex: \'EXERCÍCIOS\' em vez de \'Exercitando\'). Na justificativa, para TODOS os casos (aprovado ou reprovado), inclua uma lista detalhada de todos os capítulos e as seções presentes em cada um, no formato: \'Capítulo X: [lista de seções encontradas]\'. Se reprovado, adicione uma frase curta indicando o problema, como \'Capítulo 7 possui a seção EXERCÍCIOS em vez de Exercitando\'. Exemplo de justificativa: \'Capítulo 1: Contextualizando, Conectando, Aprofundando, Praticando, Recapitulando, Exercitando; Capítulo 2: Contextualizando, Conectando, Aprofundando, Praticando, Recapitulando, Exercitando; Capítulo 7: Contextualizando, Conectando, Aprofundando, Praticando, Recapitulando, EXERCÍCIOS. Capítulo 7 possui a seção EXERCÍCIOS em vez de Exercitando.\'.',
    },
    {
      id: 8,
      displayText:
        'Verificar se o conteúdo abordado em cada seção didática atende à proposta e à sua função.',
      type: 'auto',
      textForAI:
        'Você é um avaliador de estrutura didática. Sua tarefa é verificar se o conteúdo de cada seção atende sua função proposta (ex: Contextualizando introduz contexto). Passo 1: Defina função de cada seção. Passo 2: Analise alinhamento. Aprove se atendido; reprove se não. Se reprovado, na justificativa, cite um exemplo, como \'Seção Aprofundando no Capítulo 1 não aprofunda conceitos adequadamente\'.',
    },
    {
      id: 10,
      displayText:
        'Verificar se a linguagem está clara, coerente e com fluxo lógico apresentando os conceitos de forma progressiva.',
      type: 'auto',
      textForAI:
        'Você é um editor linguístico pedagógico. Sua tarefa é avaliar clareza, coerência, fluxo lógico e progressão de conceitos na linguagem. Passo 1: Leia o texto sequencialmente. Passo 2: Identifique problemas de fluxo ou clareza. Aprove se excelente; reprove se falhas. Se reprovado, na justificativa, aponte um ou dois, como \'Fluxo ilógico na transição do Capítulo 2 para 3\'.',
    },
    {
      id: 13,
      displayText:
        'Verificar se há analogias e exemplos com o cotidiano, para relacionar os conceitos do livro a situações práticas.',
      type: 'auto',
      textForAI:
        'Você é um especialista em pedagogia ativa para o ensino médio. Sua tarefa é verificar a inclusão de analogias e exemplos relacionados ao cotidiano que conectem os conceitos do livro a situações práticas, preferencialmente relevantes para o contexto do Maranhão. Passo 1: Identifique conceitos chave em cada capítulo. Passo 2: Busque analogias ou exemplos que ilustrem esses conceitos em contextos reais (ex.: agricultura, cultura local, profissões). Aprove se houver exemplos suficientes e relevantes; reprove se escassos ou genéricos. Se reprovado, na justificativa, cite um ou dois capítulos afetados, como \'Capítulo 2 carece de exemplos do cotidiano para conceitos de sustentabilidade\'.',
    },
    {
      id: 14,
      displayText:
        'Verificar se há indicações de discussões e interações propostas, como dinâmicas, perguntas norteadoras ou debates para facilitar o trabalho do professor.',
      type: 'auto',
      textForAI:
        'Você é um designer instrucional especializado em materiais para professores do ensino médio. Sua tarefa é verificar a presença de indicações de discussões ou interações pedagógicas, como dinâmicas de grupo, perguntas norteadoras ou sugestões de debates, que facilitem o trabalho do professor. Passo 1: Busque por seções ou trechos que proponham atividades interativas (ex.: \'Sugira aos alunos que discutam...\' ou \'Proponha um debate sobre...\'). Passo 2: Avalie se são suficientes e relevantes. Aprove se houver indicações claras; reprove se ausentes ou insuficientes. Se reprovado, na justificativa, cite um exemplo, como \'Nenhuma sugestão de dinâmica encontrada no Capítulo 3\'.',
    },
    {
      id: 15,
      displayText:
        'Verificar se há gabarito comentado e justificativa das respostas corretas e incorretas nas questões dos exercícios.',
      type: 'auto',
      textForAI:
        'Você é um avaliador de materiais didáticos para professores do ensino médio. Sua tarefa é verificar se as seções \'Exercitando\' contêm gabaritos comentados com justificativas para as respostas corretas e incorretas. Passo 1: Identifique as seções \'Exercitando\'. Passo 2: Verifique se cada questão objetiva possui um gabarito (ex.: \'Gabarito: A\') e uma explicação que justifique a resposta correta e, quando aplicável, por que as outras opções estão incorretas. Aprove se todas as questões tiverem gabaritos comentados completos; reprove se faltarem explicações ou gabaritos. Se reprovado, na justificativa, cite um ou dois exemplos, como \'Questão 2 do Capítulo 3 não possui justificativa para as respostas incorretas\'.',
    },
    {
      id: 17,
      displayText:
        'Verificar se há indicação de Atividades extras e Bibliografia complementar para o professor.',
      type: 'auto',
      textForAI:
        'Você é um curador de recursos pedagógicos para professores do ensino médio. Sua tarefa é verificar a presença de indicações de atividades extras (ex.: projetos, exercícios adicionais) e bibliografia complementar (ex.: livros, artigos, vídeos) destinadas ao professor. Passo 1: Busque menções a seções como \'Atividades Extras\', \'Sugestões de Atividades\' ou \'Bibliografia Complementar\'. Passo 2: Avalie se são relevantes e suficientes. Aprove se houver indicações claras; reprove se ausentes ou insuficientes. Se reprovado, na justificativa, cite um exemplo, como \'Nenhuma indicação de atividades extras ou bibliografia complementar encontrada no documento\'.',
    },
    {
      id: 18,
      displayText: 'Verificar referências bibliográficas no final do livro.',
      type: 'auto',
      textForAI:
        'Você é um bibliógrafo acadêmico. Sua tarefa é verificar a presença e completude de referências bibliográficas no final da apostila. Passo 1: Localize a seção de referências. Passo 2: Avalie formato e cobertura. Aprove se completa; reprove se ausente ou incompleta. Se reprovado, na justificativa, indique o problema, como \'Referências ausentes para fontes citadas no Capítulo 2\'.',
    },
    {
      id: 19,
      displayText:
        'Verificar se há as Marcações de Capítulos, Seções e SubTags (#) nos livros.',
      type: 'auto',
      textForAI:
        "Sua tarefa é verificar a formatação correta das marcações (tags) no documento. A regra principal é que toda tag DEVE começar com '#' e terminar com '#', sem espaços entre o símbolo e a palavra (ex: #SAIBAMAIS#). O critério deve be 'Reprovado' APENAS se você encontrar tags mal formatadas (ex: '#SAIBAMAIS' or 'DICAS#'). Se todas as tags encontradas seguirem o padrão '#PALAVRA#', ou se nenhuma tag da lista abaixo for utilizada, o critério deve be 'Aprovado'. A simples ausência de subtags não é motivo para reprovação. Para sua referência, as tags esperadas são: #SAIBAMAIS#, #SAIBA MAIS#, #CURIOSIDADE#, #DICAS#, #FIQUEATENTO#, #FIQUE ATENTO#, #ATENCAO#, #ATENÇÃO#, #AQUINOMARANHAO#, #AQUINOMARANHÃO#, #AQUI NO MARANHAO#, #FIQUELIGADO#, #FIQUE LIGADO#, #DESTAQUE#, #QUADRO#, #CITACAO#, #TOOLTIP#, #TOOLTIPTITULO#, #Capítulo#, #CAPITULO#, #FONTE#, #QUEBRADEPAGINA#, #TITULO2#, #TITULO3#, #TITULOTABELA#.",
    },
  ];

  useEffect(() => {
    const fetchEmentas = async () => {
      try {
        setLoadingEmentas(true);
        setEmentaError(null);

        const res = await fetch(`${BACKEND_API_URL}/api/ementas`);
        if (!res.ok) {
          throw new Error('Erro ao buscar ementas');
        }

        const data = await res.json();
        setEmentas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar ementas:', err);
        setEmentaError(
          'Não foi possível carregar as ementas. Verifique o backend e tente novamente.'
        );
      } finally {
        setLoadingEmentas(false);
      }
    };

    fetchEmentas();
  }, []);

  const extractTextFromFile = (file) => {
    return new Promise((resolve, reject) => {
      if (
        file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target.result;
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve(result.value);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Formato de arquivo não suportado. Use .docx'));
      }
    });
  };

  const extractLinksWithGemini = async (materialText) => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `
Você é um extrator de links. A partir do texto abaixo (uma apostila de professor), identifique todos os links (URLs) presentes.

Responda APENAS em JSON válido, no formato:

{
  "links": ["https://exemplo.com/1", "https://exemplo.com/2"]
}

Se não houver nenhum link, responda:

{
  "links": []
}

Texto da apostila:
""" 
${materialText}
"""
    `;

    const result = await model.generateContent(prompt);
    const text = (await result.response.text()) || '';

    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.warn('Falha ao fazer parse do JSON de links (professor):', text);
      throw new Error('O modelo devolveu um JSON inválido ao extrair links.');
    }

    if (!parsed.links || !Array.isArray(parsed.links)) {
      return [];
    }

    const uniqueLinks = Array.from(
      new Set(parsed.links.map((l) => String(l).trim()).filter(Boolean))
    );

    return uniqueLinks;
  };

  const analyzeLinksOnBackend = async (links) => {
    if (!links || links.length === 0) {
      return '';
    }

    const res = await fetch(`${BACKEND_API_URL}/api/analyze-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ links }),
    });

    if (!res.ok) {
      console.error('Erro ao analisar links no backend:', await res.text());
      throw new Error('Erro ao analisar links externos no backend.');
    }

    const data = await res.json();

    if (!data.analysis || !Array.isArray(data.analysis)) {
      return '';
    }

    const formatted = data.analysis
      .map((item, index) => {
        return `Link ${index + 1}:
  URL: ${item.link}
  Status: ${item.status || 'N/D'}
  Descrição: ${item.descricao || 'N/D'}`;
      })
      .join('\n\n');

    return formatted;
  };

  const buildPrompt = (extractedText, criteriaForAI, ementa, linksSummary) => {
    const criteriosTexto = criteriaForAI
      .map((c) => `${c.id}. ${c.textForAI || c.displayText}`)
      .join('\n');

    const infoEmenta = ementa
      ? `
EMENTA SELECIONADA:
- Disciplina: ${ementa.nome_disciplina || ''}
- Carga horária: ${ementa.carga_horaria || ''}
- Objetivos: ${ementa.objetivos || ''}
- Conteúdo programático: ${ementa.conteudo_programatico || ''}`
      : `
NENHUMA EMENTA FOI SELECIONADA. Considere apenas os critérios do professor.`;

    const linksInfo = linksSummary
      ? `
ANÁLISE DOS LINKS EXTERNOS (GERADA ANTERIORMENTE):
${linksSummary}`
      : `
NÃO FORAM ENCONTRADOS LINKS OU A ANÁLISE DE LINKS NÃO ESTÁ DISPONÍVEL.`;

    const prompt = `
Você é um especialista educacional na criação e curadoria de apostilas para professores do ensino médio do estado do Maranhão. Sua tarefa é analisar a APOSTILA DO PROFESSOR e avaliá-la criteriosamente, usando conceitos de análise e pedagogia e com base nos seguintes critérios.

${infoEmenta}

${linksInfo}

Sua resposta deve ser APENAS UM OBJETO JSON VÁLIDO.
Para cada critério, determine o status como "Aprovado" ou "Reprovado".

INSTRUÇÃO IMPORTANTE PARA JUSTIFICATIVA:
- Para critérios APROVADOS, a 'justificativa' deve ser uma string vazia "".
- Para critérios REPROVADOS, a 'justificativa' deve ser curta e cirúrgica, apontando apenas um ou dois exemplos claros do problema e sua localização (Capítulo e Seção, se possível). Não liste todas as ocorrências.

LISTA DE CRITÉRIOS PARA ANÁLISE:
${criteriosTexto}

APOSTILA COMPLETA PARA ANÁLISE:
---
${extractedText}
---

FORMATO JSON DE SAÍDA OBRIGATÓRIO (sem pontuacaoFinal):
{"analise": [{"criterio": <number>, "status": "<Aprovado ou Reprovado>", "justificativa": "<string>"}]}
    `;

    return prompt;
  };

  const handleProfessorAnalysis = async () => {
    if (!professorFile) return;
    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);

    if (!selectedEmenta) {
      setEmentaError('Selecione uma ementa para continuar.');
      setIsLoading(false);
      return;
    }

    const criteriaForAI = fullCriteriaList.filter((c) => c.type === 'auto');

    try {
      const extractedText = await extractTextFromFile(professorFile);
      setFileContent(extractedText);

      let linksSummary = '';
      try {
        const links = await extractLinksWithGemini(extractedText);
        if (links.length > 0) {
          linksSummary = await analyzeLinksOnBackend(links);
        }
      } catch (err) {
        console.warn('Falha ao extrair/analisar links no fluxo do professor:', err);
      }
      setLinksSummaryText(linksSummary);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = buildPrompt(
        extractedText,
        criteriaForAI,
        selectedEmenta,
        linksSummary
      );

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      let jsonResponse;

      try {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
          const jsonString = text.substring(startIndex, endIndex + 1);
          jsonResponse = JSON.parse(jsonString);
        } else {
          throw new Error('Nenhum objeto JSON válido foi encontrado na resposta.');
        }
      } catch (parseError) {
        console.error('Erro ao fazer o parse do JSON da API:', parseError);
        console.error('Texto recebido da API:', text);
        throw new Error('A resposta da API não estava em um formato JSON válido.');
      }

      const approvedCount = jsonResponse.analise.filter(
        (item) => item.status === 'Aprovado'
      ).length;
      const totalAutoCriteria = criteriaForAI.length;
      const score =
        totalAutoCriteria > 0
          ? Math.round((approvedCount / totalAutoCriteria) * 100)
          : 0;

      const finalAnalysis = fullCriteriaList.map((criterion) => {
        const autoResult = jsonResponse.analise.find(
          (item) => item.criterio === criterion.id
        );
        return {
          criterio: criterion.id,
          descricao: criterion.displayText,
          status:
            criterion.type === 'manual'
              ? 'Análise Manual'
              : autoResult
              ? autoResult.status
              : 'Erro',
          justificativa: autoResult ? autoResult.justificativa : '',
          manualEdit: false,
        };
      });

      setAnalysisResult({
        pontuacaoFinal: score,
        analise: finalAnalysis,
      });
      setIsModalOpen(true);

      // Salvar relatório no backend
      try {
        if (token) {
          const apiBase = backendUrl || BACKEND_API_URL;
          await fetch(`${apiBase}/api/relatorios`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              titulo: `Relatório - Professor - ${professorFile.name}`,
              tipo: 'professor',
              conteudo: {
                aba: 'professor',
                arquivo: professorFile.name,
                ementa: selectedEmenta,
                resultado: {
                  pontuacaoFinal: score,
                  analise: finalAnalysis,
                },
              },
            }),
          });
        }
      } catch (err) {
        console.error('Erro ao salvar relatório (professor):', err);
      }
    } catch (e) {
      console.error(e);
      setError(
        'Ocorreu um erro ao analisar o documento. Se o problema persistir, verifique sua chave de API, o backend e as permissões do modelo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (criterion) => {
    // Abre o modal de correção
    setCorrectionTarget(criterion);
    setIsCorrectionModalOpen(true);
    // Neste dashboard, não geramos sugestões automáticas,
    // apenas usamos o modal para visualizar ou marcar como corrigido.
    setSuggestion(null);
  };


  const handleAcceptCorrections = (criterioId, correcoes) => {
    if (!Array.isArray(correcoes) || correcoes.length === 0) return;

    setAcceptedCorrections((prev) => {
      const novos = correcoes
        .filter((c) => c.original && c.sugestao)
        .map((c) => ({
          criterioId,
          original: c.original,
          sugestao: c.sugestao,
        }));

      return [...prev, ...novos];
    });
  };

  const handleDownloadCorrectedDocument = async (formato) => {
    if (!professorFile || !professorFile.content) {
      alert('Texto original da apostila não está carregado.');
      return;
    }

    if (!acceptedCorrections.length) {
      alert('Nenhuma correção foi aceita ainda.');
      return;
    }

    try {
      const res = await fetch(`${backendUrl || BACKEND_API_URL}/api/aplicar-correcoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify({
          textoOriginal: professorFile.content,
          correcoes: acceptedCorrections.map(({ original, sugestao }) => ({
            original,
            sugestao,
          })),
          formato,
        }),
      });

      if (!res.ok) {
        let data = null;
        try {
          data = await res.json();
        } catch (e) {
          // ignore
        }
        throw new Error(data?.error || 'Erro ao gerar documento corrigido.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formato === 'pdf' ? 'apostila_corrigida.pdf' : 'apostila_corrigida.docx';
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao baixar documento corrigido:', e);
      alert('Ocorreu um erro ao gerar o documento corrigido.');
    }
  };

  const handleGenerateCorrection = async () => {
    setIsGeneratingSuggestion(false);
    setSuggestion({
      error: 'Sugestões de correção não estão disponíveis para este critério.',
    });
  };

  const handleStatusUpdate = (criterioId, newStatus) => {
    const updatedAnalysis = analysisResult.analise.map((item) => {
      if (item.criterio === criterioId) {
        return { ...item, status: newStatus, manualEdit: true };
      }
      return item;
    });
    const criteriaForAI = fullCriteriaList.filter((c) => c.type === 'auto');
    const totalAutoCriteria = criteriaForAI.length;
    const approvedCount = updatedAnalysis.filter((item) => {
      const originalCriterion = fullCriteriaList.find(
        (c) => c.id === item.criterio
      );
      return (
        originalCriterion &&
        originalCriterion.type === 'auto' &&
        item.status === 'Aprovado'
      );
    }).length;
    const newScore =
      totalAutoCriteria > 0
        ? Math.round((approvedCount / totalAutoCriteria) * 100)
        : 0;
    setAnalysisResult({
      pontuacaoFinal: newScore,
      analise: updatedAnalysis,
    });
    setIsCorrectionModalOpen(false);
  };

  const handleExportPDF = () => {
    if (!analysisResult) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Relatório de Análise - Versão Professor', 14, 22);

    doc.setFontSize(12);
    doc.text(`Pontuação Final: ${analysisResult.pontuacaoFinal}%`, 14, 32);

    const tableColumn = ['ID', 'Critério', 'Status', 'Justificativa'];
    const tableRows = analysisResult.analise.map((item) => [
      item.criterio,
      item.descricao,
      item.manualEdit ? `${item.status} (Editado)` : item.status,
      item.justificativa || 'N/A',
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 8 },
    });

    doc.save('relatorio-analise-professor.pdf');
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                1. Selecione a ementa
              </Typography>

              {loadingEmentas ? (
                <Box display="flex" alignItems="center" gap={2}>
                  <LinearProgress sx={{ flex: 1 }} />
                  <Typography variant="body2">Carregando ementas...</Typography>
                </Box>
              ) : (
                <>
                  <Autocomplete
                    options={ementas}
                    getOptionLabel={(option) =>
                      option?.nome_disciplina || 'Disciplina sem nome'
                    }
                    value={selectedEmenta}
                    onChange={(_, value) => {
                      setSelectedEmenta(value);
                      setEmentaError(null);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Ementa"
                        size="small"
                        error={!!ementaError}
                        helperText={
                          ementaError ||
                          'Escolha a ementa para contextualizar a análise.'
                        }
                      />
                    )}
                  />

                  {selectedEmenta && (
                    <Box mt={2}>
                      {selectedEmenta.objetivos && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Objetivos:</strong> {selectedEmenta.objetivos}
                        </Typography>
                      )}
                      {selectedEmenta.conteudo_programatico && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          <strong>Conteúdo programático:</strong>{' '}
                          {selectedEmenta.conteudo_programatico}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {ementaError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {ementaError}
                    </Alert>
                  )}
                </>
              )}
            </Paper>

            <FileUploadSection
              title="Versão do Professor"
              onFileSelect={setProfessorFile}
              onAnalyze={handleProfessorAnalysis}
              isLoading={isLoading}
            />
          </Grid>
        </Grid>

        {isLoading && (
          <Box sx={{ width: '100%', mt: 4 }}>
            <Typography textAlign="center" sx={{ mb: 1 }}>
              Analisando documento...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
            {error}
          </Typography>
        )}

        {!isLoading && analysisResult && (
          <Paper elevation={3} sx={{ mt: 4, p: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Análise Concluída
            </Typography>
            <Typography variant="h6">
              Pontuação da Análise Automática: {analysisResult.pontuacaoFinal}%
              de Aprovação
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => setIsModalOpen(true)}>
                Ver Relatório Detalhado
              </Button>
              <Button variant="outlined" onClick={handleExportPDF}>
                Exportar PDF
              </Button>
              {acceptedCorrections.length > 0 && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => handleDownloadCorrectedDocument('docx')}
                  >
                    Baixar apostila corrigida (DOCX)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleDownloadCorrectedDocument('pdf')}
                  >
                    Baixar apostila corrigida (PDF)
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        )}

        <ResultsModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          results={analysisResult}
          onEditCriterion={handleEditClick}
          criteriaWithSuggestions={criteriaWithSuggestions}
        />

        <CorrectionModal
          open={isCorrectionModalOpen}
          onClose={() => setIsCorrectionModalOpen(false)}
          criterion={correctionTarget}
          onUpdateStatus={handleStatusUpdate}
          isGenerating={isGeneratingSuggestion}
          suggestion={suggestion}
          onAcceptCorrections={handleAcceptCorrections}
        />
      </Container>
    </>
  );
};

export default ProfessorDashboard;
