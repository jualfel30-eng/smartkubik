import React from 'react';
import { SearchableSelect } from './custom/SearchableSelect';

const ProductSearchView = ({
  products = [],
  onProductSelect,
  isLoading = false,
  searchInput = '',
  onSearchInputChange,
  inventoryMap = {}
}) => {
  return (
    <SearchableSelect
      options={products.map(p => {
        const productId = String(p._id);
        const availableQty = inventoryMap[productId] || 0;
        return {
          value: p._id,
          label: `${p.name} (${p.sku || 'N/A'}) - Stock: ${availableQty}`,
          product: p,
        };
      })}
      onSelection={onProductSelect}
      inputValue={searchInput}
      onInputChange={onSearchInputChange}
      value={null}
      placeholder={isLoading ? "Cargando productos..." : "Buscar y añadir producto..."}
      isDisabled={isLoading}
    />
  );
};

export default ProductSearchView;
