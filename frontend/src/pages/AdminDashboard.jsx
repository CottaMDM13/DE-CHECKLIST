// frontend/src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { user, token, backendUrl } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  const [searchNome, setSearchNome] = useState('');
  const [searchEmenta, setSearchEmenta] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${backendUrl}/api/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text();
        let data;

        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseErr) {
          throw new Error(
            `Resposta inválida do servidor: ${text.slice(0, 120)}`
          );
        }

        if (!res.ok) {
          throw new Error(
            data.error || 'Erro ao carregar dashboard administrativo.'
          );
        }

        setDashboard(data);
      } catch (err) {
        console.error('Erro ao buscar dashboard admin:', err);
        setError(
          err.message || 'Erro ao carregar dashboard administrativo.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchDashboard();
    } else {
      setLoading(false);
      if (user) {
        setError(
          'Acesso restrito. Apenas administradores podem visualizar este painel.'
        );
      }
    }
  }, [user, token, backendUrl]);

  const filtrarTexto = (valor, termo) => {
    if (!termo) return true;
    if (!valor) return false;
    return valor.toLowerCase().includes(termo.toLowerCase());
  };

  const resumo = dashboard?.resumo || {};
  const topUsuarios = dashboard?.topUsuarios || [];
  const topDocumentos = dashboard?.topDocumentos || [];

  const usuariosFiltrados = topUsuarios.filter((u) =>
    filtrarTexto(`${u.nome} ${u.email}`, searchNome)
  );

  const documentosFiltrados = topDocumentos.filter((doc) => {
    const porNome = filtrarTexto(
      `${doc.usuarioNome || ''} ${doc.usuarioEmail || ''}`,
      searchNome
    );
    const porEmenta = filtrarTexto(doc.ementa || '', searchEmenta);
    return porNome && porEmenta;
  });

  let rankingBuscaAutor = null;
  if (searchNome.trim() && topUsuarios.length) {
    const idx = topUsuarios.findIndex((u) =>
      filtrarTexto(`${u.nome} ${u.email}`, searchNome)
    );
    if (idx >= 0) {
      rankingBuscaAutor = {
        posicao: idx + 1,
        ...topUsuarios[idx],
      };
    }
  }

  const podium = usuariosFiltrados.slice(0, 3);

  const getPontuacaoFinal = (doc) => {
    if (!doc) return 0;
    const raw =
      typeof doc.pontuacaoFinal !== 'undefined'
        ? doc.pontuacaoFinal
        : doc.pontuacaoGeral ?? doc.pontuacao ?? 0;

    const num = Number(raw);
    if (Number.isNaN(num)) return 0;
    return num;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper sx={{ p: 3, maxWidth: 480 }}>
          <Typography variant="h6" gutterBottom>
            Erro ao carregar dados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'grey.100',
        py: 4,
        px: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Cabeçalho */}
        <Box
          sx={{
            mb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              Dashboard Administrativo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visão geral de desempenho dos relatórios gerados pela equipe.
            </Typography>
          </Box>

          <Box>
            <Tooltip title="Ver lista completa de relatórios">
              <IconButton onClick={() => navigate('/relatorios')} size="small">
                <AssessmentIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Cards de resumo */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Relatórios gerados
              </Typography>
              <Typography variant="h4">
                {resumo?.totalRelatorios ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Quantidade total de análises realizadas.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Relatórios com pontuação
              </Typography>
              <Typography variant="h4">
                {resumo?.totalComPontuacao ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Documentos que receberam avaliação completa.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Usuários avaliados
              </Typography>
              <Typography variant="h4">
                {resumo?.totalUsuarios ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pessoas que já geraram pelo menos um relatório.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1 }} />

        {/* Filtros */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Filtros
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              label="Buscar por nome (autor)"
              size="small"
              value={searchNome}
              onChange={(e) => setSearchNome(e.target.value)}
            />
            <TextField
              label="Buscar por disciplina / ementa"
              size="small"
              value={searchEmenta}
              onChange={(e) => setSearchEmenta(e.target.value)}
            />
          </Box>

          {rankingBuscaAutor && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: 'grey.50',
                borderStyle: 'dashed',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2">
                Autor encontrado no ranking:
              </Typography>
              <Typography variant="body2">
                #{rankingBuscaAutor.posicao} • {rankingBuscaAutor.nome} (
                {rankingBuscaAutor.email}) —{' '}
                {rankingBuscaAutor.mediaPontuacao?.toFixed
                  ? rankingBuscaAutor.mediaPontuacao.toFixed(1)
                  : rankingBuscaAutor.mediaPontuacao || 0}
                %
              </Typography>
            </Paper>
          )}
        </Paper>

        {/* Pódio + tabelas */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* Pódio */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Ranking de autores (Pódio)
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Top 3 autores com melhor média de pontuação.
            </Typography>

            {podium.length > 0 ? (
              <Grid container spacing={2}>
                {podium.map((u, index) => (
                  <Grid item xs={12} sm={4} key={u.email || index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {index === 0
                          ? '🥇 1º lugar'
                          : index === 1
                          ? '🥈 2º lugar'
                          : '🥉 3º lugar'}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {u.nome}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {u.email}
                      </Typography>
                      <Typography variant="body2">
                        Média:{' '}
                        {u.mediaPontuacao?.toFixed
                          ? u.mediaPontuacao.toFixed(1)
                          : u.mediaPontuacao || 0}
                        %
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Relatórios: {u.totalRelatorios ?? 0}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Não há autores suficientes para montar o pódio com os filtros
                atuais.
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Tabela de autores */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Relatórios por autor
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Lista completa de autores com quantidade de relatórios e média de
              pontuação.
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Relatórios</TableCell>
                  <TableCell align="right">Média (%)</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuariosFiltrados.map((u, index) => (
                  <TableRow key={u.email || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell align="right">
                      {u.totalRelatorios ?? 0}
                    </TableCell>
                    <TableCell align="right">
                      {u.mediaPontuacao?.toFixed
                        ? u.mediaPontuacao.toFixed(1)
                        : u.mediaPontuacao || 0}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver relatórios desse autor">
                        <IconButton
                          size="small"
                          onClick={() => navigate('/relatorios')}
                        >
                          <AssessmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {usuariosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                      >
                        Nenhum autor encontrado com os filtros atuais.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <Divider />

          {/* Tabela de documentos em destaque */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Relatórios em destaque
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Documentos com melhores avaliações de acordo com os critérios
              analisados.
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Disciplina / Documento</TableCell>
                  <TableCell>Autor</TableCell>
                  <TableCell align="right">Pontuação (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documentosFiltrados.map((doc, index) => {
                  const pontFinal = getPontuacaoFinal(doc);
                  return (
                    <TableRow
                      key={doc.id || index}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/relatorios/${doc.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {doc.ementa || 'Disciplina não informada'}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {doc.titulo}
                        </Typography>
                      </TableCell>
                      <TableCell>{doc.usuarioNome}</TableCell>
                      <TableCell align="right">
                        {pontFinal.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}

                {documentosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                      >
                        Nenhum relatório encontrado com os filtros atuais.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
