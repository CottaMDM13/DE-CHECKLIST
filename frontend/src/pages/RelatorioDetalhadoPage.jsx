
import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import CorrectionModal from '../components/CorrectionModal';

const RelatorioDetalhadoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, backendUrl } = useAuth();

  const [relatorio, setRelatorio] = useState(location.state?.relatorio || null);
  const [loading, setLoading] = useState(!location.state?.relatorio);
  const [error, setError] = useState('');
  const [visibleJustifications, setVisibleJustifications] = useState({});
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  useEffect(() => {
    if (relatorio || !token || !backendUrl) return;

    const fetchRelatorio = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${backendUrl}/api/relatorios`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao buscar relatórios.');

        const encontrado = data.find((r) => String(r.id) === String(id));
        if (!encontrado) {
          setError('Relatório não encontrado.');
        } else {
          setRelatorio(encontrado);
        }
      } catch (err) {
        console.error('Erro ao buscar relatório:', err);
        setError(err.message || 'Erro ao buscar relatório.');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorio();
  }, [relatorio, token, backendUrl, id]);

  const parsedConteudo = useMemo(() => {
    if (!relatorio || !relatorio.conteudo) return null;
    const raw = relatorio.conteudo;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Erro ao parsear conteúdo do relatório:', e);
        return null;
      }
    }
    return raw;
  }, [relatorio]);

  const resultado = parsedConteudo?.resultado;
  const analise = Array.isArray(resultado?.analise) ? resultado.analise : [];

  const sortedCriteria = useMemo(() => {
    if (!Array.isArray(analise)) return [];
    const list = [...analise];
    list.sort((a, b) => {
      if (a.descricao === 'Validar conformidade com a ementa') return -1;
      if (b.descricao === 'Validar conformidade com a ementa') return 1;
      const aIsReprovado = a.status === 'Reprovado';
      const bIsReprovado = b.status === 'Reprovado';
      if (aIsReprovado && !bIsReprovado) return -1;
      if (!aIsReprovado && bIsReprovado) return 1;
      return (a.criterio || 0) - (b.criterio || 0);
    });
    return list;
  }, [analise]);

  const toggleJustification = (criterio) => {
    setVisibleJustifications((prev) => ({
      ...prev,
      [criterio]: !prev[criterio],
    }));
  };

  const handleEditClick = async (criterion) => {
    setCorrectionTarget(criterion);
    setIsCorrectionModalOpen(true);
    setIsGeneratingSuggestion(true);
    setSuggestion(null);

    try {
      const res = await fetch(`${backendUrl}/api/sugestoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criterio: criterion.criterio,
          descricao: criterion.descricao,
          justificativa: criterion.justificativa,
          ementa: parsedConteudo?.ementa,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar sugestão.');
      }
      setSuggestion(data);
    } catch (err) {
      console.error('Erro ao gerar sugestão:', err);
      setSuggestion({ error: 'Erro ao gerar sugestão de correção.' });
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleExportPDF = () => {
    try {
      if (!resultado || !Array.isArray(sortedCriteria) || !sortedCriteria.length) {
        alert('Não há dados suficientes para gerar o PDF.');
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Relatório de Análise Detalhada', 14, 20);
      doc.setFontSize(11);
      doc.text(relatorio.titulo || 'Relatório', 14, 28);

      const pontuacaoTexto =
        typeof resultado.pontuacaoFinal === 'number'
          ? `${resultado.pontuacaoFinal}%`
          : String(resultado.pontuacaoFinal ?? 'N/A');

      doc.text(`Pontuação final: ${pontuacaoTexto}`, 14, 36);

      const tableColumn = ['ID', 'Critério', 'Status', 'Justificativa'];
      const tableRows = sortedCriteria.map((item) => [
        item.criterio,
        item.descricao,
        item.manualEdit ? `${item.status} (Editado)` : item.status,
        item.justificativa || 'N/A',
      ]);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 44,
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      });

      const nomeArquivo =
        relatorio.titulo
          ?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '') || `relatorio-${relatorio.id}`;

      doc.save(`${nomeArquivo}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF.');
    }
  };

  const handleVoltar = () => {
    navigate('/relatorios');
  };

  if (loading && !relatorio) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando relatório...
          </Typography>
          <Button variant="text" onClick={handleVoltar}>
            Voltar
          </Button>
        </Box>
      </Container>
    );
  }

  if (!relatorio) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Relatório não encontrado
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="contained" onClick={handleVoltar}>
            Voltar
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box
        sx={{
          mt: 3,
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Relatório completo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize os detalhes completos da análise realizada.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
          >
            Baixar PDF
          </Button>
          <Button variant="outlined" size="small" onClick={handleVoltar}>
            Voltar
          </Button>
        </Box>
      </Box>

      <Paper
        elevation={1}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          mb: 2,
          width: '100%',
          minHeight: 110,
        }}
      >
        <Box
          sx={{
            mb: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {relatorio.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {parsedConteudo?.arquivo || '-'} · {relatorio.tipo}
            </Typography>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, minWidth: 150 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Pontuação final
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {resultado?.pontuacaoFinal ?? 'N/A'}
              {typeof resultado?.pontuacaoFinal === 'number' && '%'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={1}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          width: '100%',
          minHeight: 240,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Detalhamento dos critérios avaliados
        </Typography>

        {sortedCriteria.length > 0 ? (
          <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Critério</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Justificativa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCriteria.map((item) => (
                  <TableRow key={item.criterio}>
                    <TableCell sx={{ fontSize: '0.875rem', width: '45%' }}>
                      {item.descricao}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        size="small"
                        label={item.status}
                        color={
                          item.status === 'Aprovado'
                            ? 'success'
                            : item.status === 'Reprovado'
                            ? 'error'
                            : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                            mt: 0.5,
                          }}
                        >
                          <Tooltip
                            title={
                              visibleJustifications[item.criterio]
                                ? 'Ocultar justificativa'
                                : 'Exibir justificativa'
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => toggleJustification(item.criterio)}
                            >
                              {visibleJustifications[item.criterio] ? (
                                <Visibility fontSize="small" />
                              ) : (
                                <VisibilityOff fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Abrir correções">
                            <IconButton size="small" onClick={() => handleEditClick(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        {visibleJustifications[item.criterio] && (
                          <Typography
                            variant="body2"
                            sx={{
                              wordBreak: 'break-word',
                              color: 'text.secondary',
                              mt: 0.5,
                            }}
                          >
                            {item.justificativa || 'N/A'}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Não há detalhes de critérios disponíveis para este relatório.
          </Typography>
        )}
      </Paper>

      <CorrectionModal
        open={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        criterion={correctionTarget}
        onUpdateStatus={() => {}}
        isGenerating={isGeneratingSuggestion}
        suggestion={suggestion}
        onAcceptCorrections={() => {}}
      />
    </Container>
  );
};

export default RelatorioDetalhadoPage;
