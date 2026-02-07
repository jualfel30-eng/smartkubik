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

    // Calculate items per page based on grid capacity
    const itemsPerPage = gridConfig.rows * gridConfig.cols;

    // Split items into separate pages
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
        pages.push(items.slice(i, i + itemsPerPage));
    }

    return (
        <div className="w-full bg-white text-black">
            <style>{`
        @media print {
          @page { size: letter; margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .label-page {
            page-break-after: always;
            break-after: page;
            min-height: 27.9cm; /* Explicit Letter height for preview consistency */
            padding: 2rem; /* Matches original p-8 */
        }
        @media print {
            .label-page {
                padding: 0;
                min-height: auto; /* Let printer handle height */
                height: auto;
            }
        }
      `}</style>

            {pages.map((pageItems, pageIndex) => (
                <div
                    key={pageIndex}
                    className={`label-page grid ${gridConfig.className} w-full content-start`}
                >
                    {pageItems.map((item, index) => {
                        const price = currency === 'VES'
                            ? (item.price * exchangeRate)
                            : item.price;

                        const currencySymbol = currency === 'VES' ? 'Bs.' : 'REF';

                        return (
                            <div
                                key={index}
                                className={`border border-gray-300 rounded p-3 flex gap-3 ${gridConfig.labelHeight} overflow-hidden bg-white`}
                            >
                                {/* Columna 1: Logo (30% del ancho) */}
                                <div className="w-[30%] flex items-center justify-center">
                                    {config.showLogo && config.storeLogo ? (
                                        <img
                                            src={config.storeLogo}
                                            alt={config.storeName}
                                            className="w-full h-auto object-contain max-h-full"
                                        />
                                    ) : (
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-center opacity-60">
                                            {config.storeName || 'TIENDA'}
                                        </div>
                                    )}
                                </div>

                                {/* Columna 2: Contenido (70% del ancho) */}
                                <div className="w-[70%] flex flex-col justify-between h-full">
                                    {/* Sección superior: Nombre, Marca y SKU */}
                                    <div className="flex flex-col gap-1">
                                        {/* Nombre del producto - alineado a la izquierda */}
                                        <div className="font-bold leading-tight line-clamp-3 text-left text-sm" title={item.productName}>
                                            {item.productName}
                                        </div>

                                        {/* Marca - alineado a la izquierda */}
                                        {config.showBrand && item.brand && (
                                            <div className="text-xs text-gray-500 uppercase text-left truncate">
                                                {item.brand}
                                            </div>
                                        )}

                                        {/* SKU - debajo de la marca */}
                                        {showSKU && item.sku && (
                                            <div className="text-[9px] text-gray-400 text-left truncate">
                                                SKU: {item.sku}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sección inferior: Precio y fecha */}
                                    <div className="flex flex-col gap-1 mt-auto">
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
            ))}
        </div>
    );
};
