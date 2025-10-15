import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Trash2, Search } from 'lucide-react';

const KnowledgeBaseManagement = () => {
  // State for file upload
  const [file, setFile] = useState(null);
  const [tenantId, setTenantId] = useState('smartkubik_docs');
  const [source, setSource] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // State for document list
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // State for query
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState([]);

  const fetchDocuments = useCallback(async () => {
    if (!tenantId) return;
    setIsLoadingDocs(true);
    try {
      const response = await fetchApi(`/super-admin/knowledge-base/documents?tenantId=${tenantId}`);
      setDocuments(response.data || []);
    } catch (error) {
      toast.error('Error al cargar los documentos', { description: error.message });
    } finally {
      setIsLoadingDocs(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSource(selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file || !tenantId) {
      toast.error('El archivo y el ID de Tenant son requeridos.');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantId', tenantId);
    formData.append('source', source);

    try {
      await fetchApi('/super-admin/knowledge-base/upload', { method: 'POST', body: formData });
      toast.success('Documento subido exitosamente.');
      setFile(null);
      setSource('');
      if (document.getElementById('file-input')) {
        document.getElementById('file-input').value = '';
      }
      fetchDocuments(); // Refresh the list
    } catch (error) {
      toast.error('Error al subir el documento', { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docSource) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el documento '${docSource}'? Esta acción es irreversible.`)) {
      return;
    }
    try {
      await fetchApi(`/super-admin/knowledge-base/document?tenantId=${tenantId}&source=${encodeURIComponent(docSource)}`, { method: 'DELETE' });
      toast.success(`Documento '${docSource}' eliminado.`);
      fetchDocuments(); // Refresh the list
    } catch (error) {
      toast.error('Error al eliminar el documento', { description: error.message });
    }
  };

  const handleQuery = async () => {
    if (!query || !tenantId) {
      toast.error('La consulta y el ID de Tenant son requeridos.');
      return;
    }
    setIsQuerying(true);
    setQueryResults([]);
    try {
      const response = await fetchApi(`/super-admin/knowledge-base/query?tenantId=${tenantId}&q=${encodeURIComponent(query)}`);
      setQueryResults(response.data || []);
      toast.success('Consulta completada.');
    } catch (error) {
      toast.error('Error al realizar la consulta', { description: error.message });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Gestionar Base de Conocimiento</h1>
      
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subir Nuevo Documento</CardTitle>
          <CardDescription>Sube archivos (PDF o TXT) para alimentar la base de conocimiento de un tenant específico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-id">ID de Tenant de la Base de Conocimiento</Label>
            <Input id="tenant-id" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Ej: smartkubik_docs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-input">Archivo de Documento (PDF, TXT)</Label>
            <Input id="file-input" type="file" onChange={handleFileChange} accept=".pdf,.txt" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Fuente del Documento (si se deja en blanco, se usa el nombre del archivo)</Label>
            <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ej: manual_usuario_v1.pdf" />
          </div>
          <Button onClick={handleUpload} disabled={isUploading}>{isUploading ? 'Subiendo...' : 'Subir Documento'}</Button>
        </CardContent>
      </Card>

      {/* Document List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos en la Base de Conocimiento</CardTitle>
          <CardDescription>Lista de documentos actualmente en la base de conocimiento para el tenant: {tenantId}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? <p>Cargando documentos...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Fuente (Source)</TableHead><TableHead>Nombre Original</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha de Subida</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc._id}>
                    <TableCell className="font-medium">{doc.source}</TableCell>
                    <TableCell>{doc.fileName}</TableCell>
                    <TableCell>{doc.fileType}</TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(doc.source)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Query Card */}
      <Card>
        <CardHeader>
          <CardTitle>Probar Base de Conocimiento</CardTitle>
          <CardDescription>Realiza una pregunta a la base de conocimiento del tenant seleccionado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Escribe tu pregunta aquí..." />
            <Button onClick={handleQuery} disabled={isQuerying}><Search className="mr-2 h-4 w-4" />{isQuerying ? 'Buscando...' : 'Preguntar'}</Button>
          </div>
          {queryResults.length > 0 && (
            <div className="space-y-2 pt-4">
              <h3 className="font-semibold">Resultados de la Búsqueda:</h3>
              <div className="space-y-4 rounded-md border p-4">
                {queryResults.map((result, index) => (
                  <div key={index} className="text-sm border-b pb-2 mb-2">
                    <p className="font-mono bg-muted p-2 rounded-md">{result.pageContent}</p>
                    <p className="text-xs text-muted-foreground mt-1">Fuente: {result.metadata.source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBaseManagement;
