// frontend/src/pages/RelatoriosPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const getTipoLabel = (tipo) => {
  if (tipo === 'aluno') return 'Aba do aluno';
  if (tipo === 'professor') return 'Aba do professor';
  if (tipo === 'admin') return 'Admin';
  return tipo || '-';
};

const extrairDisciplina = (relatorio) => {
  const raw = relatorio?.conteudo;
  if (!raw) return null;

  let parsed;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else {
    parsed = raw;
  }

  // Estrutura usada no JSON salvo no banco
  return (
    parsed?.ementa?.nome_disciplina ||
    parsed?.nomeDisciplina ||
    parsed?.disciplina ||
    null
  );
};

const RelatoriosPage = () => {
  const navigate = useNavigate();
  const { token, user, backendUrl } = useAuth();

  const [relatorios, setRelatorios] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRelatorios = async () => {
      try {
        setError('');
        const res = await fetch(`${backendUrl}/api/relatorios`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao buscar relatórios');
        }

        setRelatorios(data);
      } catch (err) {
        console.error('Erro ao buscar relatórios:', err);
        setError(err.message || 'Erro ao buscar relatórios');
      }
    };

    if (token) {
      fetchRelatorios();
    }
  }, [token, backendUrl]);

  const relatoriosComDisciplina = useMemo(
    () =>
      relatorios.map((r) => ({
        ...r,
        disciplina: extrairDisciplina(r),
      })),
    [relatorios]
  );

  const tituloPagina =
    user?.role === 'admin'
      ? 'Todos os relatórios gerados'
      : 'Meus relatórios gerados';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Título + Voltar */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h5">{tituloPagina}</Typography>

        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            if (user?.role === 'admin') {
              navigate('/admin'); // volta para o dashboard com pódio
            } else {
              navigate(-1); // volta para a página anterior para usuários comuns
            }
          }}
        >
          Voltar
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <Paper sx={{ p: 2 }}>
        {relatoriosComDisciplina.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum relatório encontrado.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Disciplina / Documento</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Gerado por</TableCell>
                <TableCell>Criado em</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relatoriosComDisciplina.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigate(`/relatorios/${r.id}`, { state: { relatorio: r } })
                  }
                >
                  <TableCell>
                    {r.disciplina && (
                      <Typography variant="body2" fontWeight={600}>
                        {r.disciplina}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      color={r.disciplina ? 'text.secondary' : 'inherit'}
                    >
                      {r.titulo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getTipoLabel(r.tipo)}
                      size="small"
                      color="primary"
                      onClick={() => {
                        if (r.tipo === 'aluno') navigate('/');
                        else if (r.tipo === 'professor') navigate('/professor');
                        else if (r.tipo === 'admin') navigate('/admin');
                      }}
                      sx={{ cursor: 'pointer' }}
                    />

                  </TableCell>
                  <TableCell>
                    {r.usuario_nome
                      ? `Doc gerado por ${r.usuario_nome} (${r.usuario_email}) na ${getTipoLabel(
                          r.tipo
                        )}`
                      : user
                      ? `Doc gerado por ${user.nome} (${user.email}) na ${getTipoLabel(
                          r.tipo
                        )}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {r.criado_em
                      ? new Date(r.criado_em).toLocaleString('pt-BR')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
};

export default RelatoriosPage;
