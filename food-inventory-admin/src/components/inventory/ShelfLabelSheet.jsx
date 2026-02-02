import React from 'react';

export const ShelfLabelSheet = ({ items, config }) => {
    // Config defaults
    const {
        showPrice = true,
        currency = 'VES',
        showDate = false,
        showBarcode = false,
        showSKU = true,
        labelSize = 'standard', // 'standard' (3x5), 'small' (4x8)
        exchangeRate = 1
    } = config;

    // Grid configuration based on labelSize
    const gridConfig = {
        standard: { // 3x7 (Requested by User)
            cols: 3,
            rows: 7,
            className: 'grid-cols-3 grid-rows-7 gap-4',
            labelHeight: 'h-[130px]',
            labelClass: 'flex-col text-center'
        },
        rectangular: { // 2x7 Horizontal
            cols: 2,
            rows: 7,
            className: 'grid-cols-2 grid-rows-7 gap-x-8 gap-y-4',
            labelHeight: 'h-[130px]',
            labelClass: 'flex-row items-center text-left'
        },
        small: { // 4x8
            cols: 4,
            rows: 8,
            className: 'grid-cols-4 grid-rows-8 gap-2',
            labelHeight: 'h-[110px]',
            labelClass: 'flex-col text-center'
        }
    }[labelSize] || gridConfig?.standard || {
        cols: 3,
        rows: 7,
        className: 'grid-cols-3 grid-rows-7 gap-4',
        labelHeight: 'h-[130px]',
        labelClass: 'flex-col text-center'
    };

    const isRectangular = labelSize === 'rectangular';

    return (
        <div className="w-full h-full bg-white text-black p-8 print:p-0">
            <style>{`
        @media print {
          @page { size: letter; margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

            <div className={`grid ${gridConfig.className} w-full`} style={{ pageBreakAfter: 'always' }}>
                {items.map((item, index) => {
                    const price = currency === 'VES'
                        ? (item.price * exchangeRate)
                        : item.price;

                    const currencySymbol = currency === 'VES' ? 'Bs.' : 'REF';

                    return (
                        <div
                            key={index}
                            className={`border border-gray-300 rounded p-3 flex gap-3 ${gridConfig.labelHeight} overflow-hidden`}
                        >
                            {/* Columna 1: Logo (30% del ancho) */}
                            <div className="w-[30%] flex items-center justify-center">
                                {config.showLogo && config.storeLogo ? (
                                    <img
                                        src={config.storeLogo}
                                        alt={config.storeName}
                                        className="w-full h-auto object-contain"
                                    />
                                ) : (
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-center opacity-60">
                                        {config.storeName || 'TIENDA'}
                                    </div>
                                )}
                            </div>

                            {/* Columna 2: Contenido (70% del ancho) */}
                            <div className="w-[70%] flex flex-col justify-between">
                                {/* Sección superior: Nombre, Marca y SKU */}
                                <div className="flex flex-col gap-1">
                                    {/* Nombre del producto - alineado a la izquierda */}
                                    <div className="font-bold leading-tight line-clamp-2 text-left text-sm">
                                        {item.productName}
                                    </div>

                                    {/* Marca - alineado a la izquierda */}
                                    {config.showBrand && item.brand && (
                                        <div className="text-xs text-gray-500 uppercase text-left">
                                            {item.brand}
                                        </div>
                                    )}

                                    {/* SKU - debajo de la marca */}
                                    {showSKU && item.sku && (
                                        <div className="text-[9px] text-gray-400 text-left">
                                            SKU: {item.sku}
                                        </div>
                                    )}
                                </div>

                                {/* Sección inferior: Precio y fecha */}
                                <div className="flex flex-col gap-1">
                                    {/* Precio - alineado a la derecha y en grande */}
                                    {showPrice && (
                                        <div className="flex flex-col items-end text-right">
                                            <div className="font-extrabold text-3xl leading-none tracking-tight">
                                                {price.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 uppercase">{currencySymbol}</span>
                                        </div>
                                    )}

                                    {/* Fecha - alineado a la derecha */}
                                    {showDate && (
                                        <div className="text-[9px] text-gray-400 text-right">
                                            {new Date().toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
