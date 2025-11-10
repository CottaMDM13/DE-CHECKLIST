// src/components/FileUploadSection.jsx
import React, { useState } from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FileUploadSection = ({ title, onFileSelect, onAnalyze, isLoading }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            if (onFileSelect) {
                onFileSelect(file);
            }
        }
    };

    const isAnalyzeDisabled = !selectedFile || isLoading || !onAnalyze;

return (
    <Paper
        elevation={3}
        sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        }}
    >
        {/* Cabeçalho */}
        <Box>
        <Typography variant="subtitle1" fontWeight={600}>
            {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
            Envie um arquivo .docx para que o sistema realize a análise automática.
        </Typography>
        </Box>

        {/* Área de upload */}
        <Box
        sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            bgcolor: 'grey.50',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
        }}
        >
        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />

        {!selectedFile && (
            <Typography variant="body2" color="text.secondary">
            Arraste um arquivo aqui ou clique no botão abaixo
            </Typography>
        )}

        <Button
            variant="contained"
            component="label"
            sx={{ mt: 2 }}
        >
            Escolher arquivo (.docx)
            <input
            type="file"
            hidden
            accept=".docx"
            onChange={handleFileChange}
            />
        </Button>

        {selectedFile && (
            <Typography
            variant="body2"
            sx={{ mt: 2, wordBreak: 'break-all' }}
            >
            <strong>Selecionado:</strong> {selectedFile.name}
            </Typography>
        )}

        <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 1 }}
        >
            Formato aceito: .docx
        </Typography>
        </Box>

        {/* Botões de ação */}
        <Box
        sx={{
            mt: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
        }}
        >
        {onAnalyze && (
            <Button
            variant="contained"
            color="primary"
            onClick={onAnalyze}
            disabled={isAnalyzeDisabled}
            fullWidth
            >
            {isLoading ? 'Analisando...' : 'Analisar'}
            </Button>
        )}
        </Box>
    </Paper>
    );
};

export default FileUploadSection;