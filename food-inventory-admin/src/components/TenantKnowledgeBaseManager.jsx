import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  deleteKnowledgeBaseDocument,
  listKnowledgeBaseDocuments,
  uploadKnowledgeBaseDocument,
} from '@/lib/api';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
];

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) {
    return 'Desconocido';
  }
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const TenantKnowledgeBaseManager = () => {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customSource, setCustomSource] = useState('');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await listKnowledgeBaseDocuments();
      setDocuments(response?.data || []);
    } catch (error) {
      toast.error('No se pudieron cargar los documentos', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.warning('Tipo de archivo no soportado', {
        description: 'Solo se permiten archivos PDF o texto plano (.txt).',
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const resetUploadState = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);
    setCustomSource('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning('Debes seleccionar un archivo para cargar.');
      return;
    }

    setUploading(true);
    try {
      await uploadKnowledgeBaseDocument(selectedFile, customSource.trim() || undefined);
      toast.success('Documento cargado correctamente');
      resetUploadState();
      await loadDocuments();
    } catch (error) {
      toast.error('Error al cargar el documento', { description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (source) => {
    const confirmed = window.confirm(`¿Eliminar el documento "${source}" de la base de conocimiento?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteKnowledgeBaseDocument(source);
      toast.success('Documento eliminado correctamente');
      await loadDocuments();
    } catch (error) {
      toast.error('No se pudo eliminar el documento', { description: error.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base de Conocimiento del Negocio</CardTitle>
        <CardDescription>
          Sube documentos específicos del tenant para que el asistente los utilice al responder.
          Los archivos se fragmentan automáticamente y se indexan en Pinecone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="font-medium">Carga de documentos</Label>
          <p className="text-sm text-muted-foreground">
            Formatos permitidos: PDF y texto plano (.txt). Máximo recomendado: 10 MB por archivo.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Input
              type="file"
              accept=".pdf,.txt"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Seleccionar archivo
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nombre de referencia</Label>
              <Input
                placeholder="Ej: Manual operativo sucursal norte"
                value={customSource}
                onChange={(event) => setCustomSource(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Archivo seleccionado</Label>
              <Input
                readOnly
                value={selectedFile ? selectedFile.name : 'Ningún archivo seleccionado'}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? 'Cargando...' : 'Subir documento'}
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="font-medium">Documentos cargados</Label>
            <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando documentos…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se han cargado documentos personalizados para este tenant.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={`${doc.tenantId}-${doc.source}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-border/60 p-3"
                >
                  <div>
                    <p className="font-medium">{doc.source}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.fileName} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.source)}>
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantKnowledgeBaseManager;
