import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Compresses and optimizes an image file before upload
 * - Resizes to max 1200x1200px (larger for marketing materials)
 * - Converts to JPEG at 85% quality
 * - Returns base64 string
 * - Max size after compression: 800KB
 */
const compressAndConvertImage = (file) => {
  return new Promise((resolve, reject) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      reject(new Error('Solo se permiten imágenes JPEG, PNG o WebP'));
      return;
    }

    // Validate file size (max 10MB before compression)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      reject(new Error('La imagen es demasiado grande. Máximo 10MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 1200x1200 for marketing, maintain aspect ratio)
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG at 85% quality (better quality for marketing)
          const base64 = canvas.toDataURL('image/jpeg', 0.85);

          // Check size limit (800KB after compression)
          const sizeInKB = (base64.length * 3) / 4 / 1024;
          if (sizeInKB > 800) {
            reject(new Error(`Imagen demasiado grande después de compresión: ${sizeInKB.toFixed(0)}KB. Máximo: 800KB`));
          } else {
            resolve(base64);
          }
        } catch (error) {
          reject(new Error(`Error al procesar imagen: ${error.message}`));
        }
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

export default function ImageUploader({ value = [], onChange, maxImages = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    const filesArray = Array.from(files);

    // Validate number of images
    if (value.length + filesArray.length > maxImages) {
      toast.error(`Solo puedes subir máximo ${maxImages} imágenes`);
      return;
    }

    // Validate file types
    const validFiles = filesArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} no es una imagen válida`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      // Compress and optimize images before upload
      toast.info(`Comprimiendo ${validFiles.length} imagen(es)...`);

      const compressedImages = await Promise.all(
        validFiles.map(file => compressAndConvertImage(file))
      );

      // Now we have base64 images, we can either:
      // 1. Upload them to the server as base64
      // 2. Convert back to blob and upload as multipart
      // For now, let's store them directly as base64 (simpler for marketing campaigns)

      const newImages = [...value, ...compressedImages];
      onChange?.(newImages);
      toast.success(`${compressedImages.length} imagen(es) optimizada(s) y agregada(s) exitosamente`);
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error(error.message || 'Error al procesar las imágenes');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange?.(newImages);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-gray-100">
          <ImageIcon className="w-5 h-5" />
          Imágenes de la Campaña
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Sube hasta {maxImages} imágenes para tu campaña (máx. 10MB c/u). Se optimizarán automáticamente a 1200x1200px.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${value.length >= maxImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={value.length < maxImages ? onButtonClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={value.length >= maxImages || uploading}
          />

          <div className="space-y-3">
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Subiendo imágenes...</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm font-medium dark:text-gray-200">
                    {value.length >= maxImages
                      ? `Límite de ${maxImages} imágenes alcanzado`
                      : 'Arrastra y suelta imágenes aquí'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {value.length < maxImages && 'o haz clic para seleccionar'}
                  </p>
                </div>
                {value.length < maxImages && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="dark:border-gray-600 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onButtonClick();
                    }}
                  >
                    Seleccionar Archivos
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Preview Grid */}
        {value.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {value.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <img
                    src={url}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {value.length} de {maxImages} imágenes subidas
        </p>
      </CardContent>
    </Card>
  );
}
