interface PreviewModalProps {
  domain: string;
  onClose: () => void;
}

export function PreviewModal({ domain, onClose }: PreviewModalProps) {
  const previewUrl = `http://localhost:3001/${domain}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-medium">Vista Previa del Storefront</h3>
            <p className="text-sm text-gray-500">{previewUrl}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Storefront Preview"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            🔗 Abrir en nueva pestaña
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
