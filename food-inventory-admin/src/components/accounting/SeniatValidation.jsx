import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Box,
  CircularProgress,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { toast } from 'react-toastify';
import { validateDocumentForSENIAT, generateSeniatXML, downloadSeniatXML } from '../../lib/api';

const SeniatValidation = ({ documentId, document, onValidationComplete }) => {
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const [xmlData, setXmlData] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    // Check if XML already generated
    if (document?.seniat?.xmlGenerated) {
      setXmlGenerated(true);
      setXmlData({
        qrCode: document.seniat.qrCode,
        verificationUrl: document.seniat.verificationUrl,
        xmlHash: document.seniat.xmlHash,
      });
    }
  }, [document]);

  const handleValidate = async () => {
    setLoading(true);
    try {
      const result = await validateDocumentForSENIAT(documentId);
      setValidationResults(result);

      if (result.valid) {
        toast.success('✅ Documento válido para SENIAT');
        if (onValidationComplete) {
          onValidationComplete(result);
        }
      } else {
        toast.error(`❌ Validación fallida: ${result.errors.length} errores encontrados`);
      }
    } catch (error) {
      console.error('Error validating document:', error);
      toast.error('Error al validar documento');
      setValidationResults({
        valid: false,
        errors: [error.message || 'Error desconocido'],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateXML = async () => {
    setLoading(true);
    try {
      const result = await generateSeniatXML(documentId);
      setXmlGenerated(true);
      setXmlData({
        qrCode: result.qrCode,
        verificationUrl: result.verificationUrl,
        xmlHash: result.xmlHash,
      });
      toast.success('✅ XML SENIAT generado correctamente');
    } catch (error) {
      console.error('Error generating XML:', error);
      toast.error(error.message || 'Error al generar XML SENIAT');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      const blob = await downloadSeniatXML(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${document?.documentNumber || documentId}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('XML descargado correctamente');
    } catch (error) {
      console.error('Error downloading XML:', error);
      toast.error('Error al descargar XML');
    }
  };

  const getStatusIcon = (isValid, hasWarnings) => {
    if (isValid && !hasWarnings) {
      return <CheckCircleIcon color="success" />;
    }
    if (isValid && hasWarnings) {
      return <WarningIcon color="warning" />;
    }
    return <ErrorIcon color="error" />;
  };

  return (
    <Card>
      <CardHeader
        title="Validación SENIAT"
        subheader="Validar factura para facturación electrónica"
      />
      <CardContent>
        {/* Status Info */}
        {document && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Documento: <strong>{document.documentNumber}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Estado: <Chip label={document.status} size="small" color="primary" />
            </Typography>
            {document.controlNumber && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                Número de Control: <strong>{document.controlNumber}</strong>
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Validation Button */}
        {!validationResults && (
          <Box mb={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleValidate}
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {loading ? 'Validando...' : 'Validar para SENIAT'}
            </Button>
          </Box>
        )}

        {/* Validation Results */}
        {validationResults && (
          <Box mb={2}>
            <Alert
              severity={validationResults.valid ? 'success' : 'error'}
              icon={getStatusIcon(
                validationResults.valid,
                validationResults.warnings?.length > 0
              )}
            >
              <Typography variant="subtitle2">
                {validationResults.valid
                  ? 'Documento válido para facturación electrónica'
                  : 'Documento tiene errores de validación'}
              </Typography>
            </Alert>

            {/* Errors */}
            {validationResults.errors && validationResults.errors.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Errores ({validationResults.errors.length}):
                </Typography>
                <List dense>
                  {validationResults.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={error}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Warnings */}
            {validationResults.warnings && validationResults.warnings.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  Advertencias ({validationResults.warnings.length}):
                </Typography>
                <List dense>
                  {validationResults.warnings.map((warning, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={warning}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Actions after validation */}
            <Box mt={3} display="flex" gap={1}>
              <Button
                variant="outlined"
                onClick={handleValidate}
                disabled={loading}
                size="small"
              >
                Validar nuevamente
              </Button>
              {validationResults.valid && !xmlGenerated && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleGenerateXML}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <DescriptionIcon />}
                  size="small"
                >
                  Generar XML
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* XML Generated Section */}
        {xmlGenerated && xmlData && (
          <>
            <Divider sx={{ my: 2 }} />
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                XML SENIAT Generado
              </Typography>
            </Alert>

            <Box display="flex" flexDirection="column" gap={1}>
              <Button
                variant="outlined"
                startIcon={<QrCodeIcon />}
                onClick={() => setQrDialogOpen(true)}
                size="small"
                fullWidth
              >
                Ver Código QR
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadXML}
                size="small"
                fullWidth
              >
                Descargar XML
              </Button>
            </Box>

            {xmlData.xmlHash && (
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  Hash SHA-256:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    wordBreak: 'break-all',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.12)
                        : theme.palette.grey[100],
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {xmlData.xmlHash}
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm">
        <DialogTitle>Código QR de Verificación</DialogTitle>
        <DialogContent>
          {xmlData?.qrCode && (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <img
                src={xmlData.qrCode}
                alt="QR Code"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              {xmlData.verificationUrl && (
                <Box textAlign="center">
                  <Typography variant="caption" color="textSecondary" gutterBottom>
                    URL de Verificación:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      mt: 1,
                      p: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.primary.main, 0.12)
                          : theme.palette.grey[100],
                      borderRadius: 1,
                    }}
                  >
                    {xmlData.verificationUrl}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SeniatValidation;
