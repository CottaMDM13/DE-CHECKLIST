// src/components/CorrectionModal.jsx
import React from 'react';
import { Modal, Box, Typography, Button, Paper, Divider, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '70%',
    maxWidth: '900px',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column'
};

const CorrectionModal = ({ open, onClose, criterion, onUpdateStatus, isGenerating, suggestion }) => {
    if (!criterion) return null;

    const hasSuggestions = suggestion && suggestion.correcoes && suggestion.correcoes.length > 0;

    return (
        <Modal open={open} onClose={onClose}>
        <Box
            sx={{
            ...style,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: '90vh',
            }}
        >
            {/* Cabeçalho */}
            <Box>
            <Typography variant="h6" component="h2" gutterBottom>
                Sugestão de Correção para Critério
            </Typography>
            {criterion && (
                <Typography variant="body2" color="text.secondary">
                <strong>Critério {criterion.criterio}:</strong> {criterion.descricao}
                </Typography>
            )}
            </Box>

            {/* Conteúdo principal */}
            <Paper
            variant="outlined"
            sx={{
                p: 2,
                flexGrow: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
            >
            {/* Justificativa da IA */}
            <Box>
                <Typography variant="subtitle2" gutterBottom>
                <strong>Justificativa da IA</strong>
                </Typography>
                <Typography
                variant="body2"
                sx={{
                    fontStyle: 'italic',
                    color: 'text.secondary',
                    whiteSpace: 'pre-wrap',
                }}
                >
                {criterion?.justificativa || 'Nenhuma justificativa fornecida.'}
                </Typography>
            </Box>

            <Divider />

            {/* Sugestões */}
            {isGenerating ? (
                <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    my: 1,
                }}
                >
                <CircularProgress size={24} />
                <Typography variant="body1">Gerando sugestões...</Typography>
                </Box>
            ) : hasSuggestions ? (
                <Box>
                <Typography variant="subtitle2" gutterBottom>
                    <strong>Sugestões de Correção</strong>
                </Typography>
                <List dense sx={{ whiteSpace: 'pre-wrap' }}>
                    {suggestion.correcoes.map((corr, index) => (
                    <ListItem
                        key={index}
                        divider
                        sx={{
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                        }}
                    >
                        <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                        >
                        <strong>Contexto:</strong> {corr.contexto}
                        </Typography>
                        <ListItemText
                        primary={
                            <Typography variant="body2" color="error.main">
                            Original: "{corr.original}"
                            </Typography>
                        }
                        secondary={
                            <Typography variant="body2" color="success.main">
                            Sugestão:{' '}
                            "
                            {Array.isArray(corr.sugestao)
                                ? corr.sugestao.join('\n')
                                : corr.sugestao}
                            "
                            </Typography>
                        }
                        />
                    </ListItem>
                    ))}
                </List>
                </Box>
            ) : (
                suggestion && (
                <Typography color="error">
                    {suggestion.error ||
                    'Nenhuma sugestão foi gerada para este critério.'}
                </Typography>
                )
            )}
            </Paper>

            {/* Botões de ação */}
            <Box
            sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                mt: 1,
                flexShrink: 0,
            }}
            >
            <Button variant="outlined" onClick={onClose}>
                Fechar
            </Button>
            <Button
                variant="contained"
                color="success"
                onClick={() => onUpdateStatus(criterion.criterio, 'Aprovado')}
            >
                Marcar critério como corrigido
            </Button>
            </Box>
        </Box>
        </Modal>
    );
};

export default CorrectionModal;