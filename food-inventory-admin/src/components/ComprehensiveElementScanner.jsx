import React, { useState } from 'react';

export default function ComprehensiveElementScanner() {
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const comprehensiveScan = () => {
    setIsScanning(true);
    
    // Esperar un frame para que se actualice la UI
    requestAnimationFrame(() => {
      const results = {
        route: window.location.pathname,
        timestamp: new Date().toLocaleTimeString(),
        elements: {
          buttons: [],
          links: [],
          inputs: [], 
          selects: [],
          textareas: [],
          tabs: [],
          dialogs: [],
          forms: [],
          clickableElements: []
        },
        stats: {}
      };

      // BOTONES - todos los tipos
      const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
      buttons.forEach((btn, idx) => {
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         window.getComputedStyle(btn).display !== 'none' &&
                         window.getComputedStyle(btn).visibility !== 'hidden';
        
        if (isVisible) {
          results.elements.buttons.push({
            index: idx,
            text: btn.textContent?.trim() || btn.value || btn.title || 'Sin texto',
            id: btn.id || null,
            classes: btn.className || null,
            type: btn.type || 'button',
            disabled: btn.disabled,
            selectors: generateSelectors(btn, 'button'),
            position: { x: Math.round(rect.x), y: Math.round(rect.y) },
            size: { w: Math.round(rect.width), h: Math.round(rect.height) }
          });
        }
      });

      // ENLACES
      const links = document.querySelectorAll('a[href]');
      links.forEach((link, idx) => {
        const rect = link.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.links.push({
            index: idx,
            text: link.textContent?.trim() || 'Sin texto',
            href: link.href,
            id: link.id || null,
            classes: link.className || null,
            selectors: generateSelectors(link, 'link')
          });
        }
      });

      // INPUTS
      const inputs = document.querySelectorAll('input:not([type="button"]):not([type="submit"])');
      inputs.forEach((input, idx) => {
        const rect = input.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.inputs.push({
            index: idx,
            type: input.type,
            name: input.name || null,
            id: input.id || null,
            placeholder: input.placeholder || null,
            value: input.value || null,
            selectors: generateSelectors(input, 'input')
          });
        }
      });

      // SELECTS
      const selects = document.querySelectorAll('select, [role="combobox"], [role="listbox"]');
      selects.forEach((select, idx) => {
        const rect = select.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.selects.push({
            index: idx,
            name: select.name || null,
            id: select.id || null,
            options: select.options ? Array.from(select.options).map(opt => opt.text) : [],
            selectors: generateSelectors(select, 'select')
          });
        }
      });

      // TEXTAREAS
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea, idx) => {
        const rect = textarea.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.textareas.push({
            index: idx,
            name: textarea.name || null,
            id: textarea.id || null,
            placeholder: textarea.placeholder || null,
            selectors: generateSelectors(textarea, 'textarea')
          });
        }
      });

      // TABS
      const tabs = document.querySelectorAll('[role="tab"], [data-state], button[value], .tab, .tabs button');
      tabs.forEach((tab, idx) => {
        const rect = tab.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.tabs.push({
            index: idx,
            text: tab.textContent?.trim() || 'Sin texto',
            value: tab.value || tab.getAttribute('data-value') || null,
            active: tab.getAttribute('data-state') === 'active' || tab.classList.contains('active'),
            id: tab.id || null,
            selectors: generateSelectors(tab, 'tab')
          });
        }
      });

      // DIALOGS/MODALS
      const dialogs = document.querySelectorAll('[role="dialog"], .modal, .dialog, [data-radix-dialog-content]');
      dialogs.forEach((dialog, idx) => {
        const rect = dialog.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.dialogs.push({
            index: idx,
            id: dialog.id || null,
            classes: dialog.className || null,
            selectors: generateSelectors(dialog, 'dialog')
          });
        }
      });

      // FORMS
      const forms = document.querySelectorAll('form');
      forms.forEach((form, idx) => {
        const rect = form.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible) {
          results.elements.forms.push({
            index: idx,
            action: form.action || null,
            method: form.method || null,
            id: form.id || null,
            selectors: generateSelectors(form, 'form')
          });
        }
      });

      // ELEMENTOS CLICKEABLES (cualquier cosa con onclick, cursor pointer, etc.)
      const clickables = document.querySelectorAll('*');
      clickables.forEach((el, idx) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (isVisible && 
            (el.onclick || 
             style.cursor === 'pointer' || 
             el.hasAttribute('data-testid') ||
             el.classList.contains('clickable') ||
             el.getAttribute('role') === 'button')) {
          
          // Evitar duplicados que ya están en otras categorías
          if (!el.matches('button, a, input, select, textarea, [role="tab"], [role="dialog"], form')) {
            results.elements.clickableElements.push({
              index: idx,
              tagName: el.tagName.toLowerCase(),
              text: el.textContent?.trim().substring(0, 50) || 'Sin texto',
              id: el.id || null,
              classes: el.className || null,
              cursor: style.cursor,
              selectors: generateSelectors(el, 'clickable')
            });
          }
        }
      });

      // ESTADÍSTICAS
      results.stats = {
        totalButtons: results.elements.buttons.length,
        totalLinks: results.elements.links.length,
        totalInputs: results.elements.inputs.length,
        totalSelects: results.elements.selects.length,
        totalTextareas: results.elements.textareas.length,
        totalTabs: results.elements.tabs.length,
        totalDialogs: results.elements.dialogs.length,
        totalForms: results.elements.forms.length,
        totalClickables: results.elements.clickableElements.length,
        totalInteractive: results.elements.buttons.length + 
                         results.elements.links.length + 
                         results.elements.inputs.length + 
                         results.elements.selects.length + 
                         results.elements.textareas.length + 
                         results.elements.tabs.length + 
                         results.elements.clickableElements.length
      };

      setScanResults(results);
      setIsScanning(false);
    });
  };

  const generateSelectors = (element, type) => {
    const selectors = [];
    
    // ID selector (más específico)
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Selector por atributos únicos
    if (element.getAttribute('data-testid')) {
      selectors.push(`[data-testid="${element.getAttribute('data-testid')}"]`);
    }
    
    if (element.getAttribute('role')) {
      selectors.push(`[role="${element.getAttribute('role')}"]`);
    }
    
    if (element.value) {
      selectors.push(`${element.tagName.toLowerCase()}[value="${element.value}"]`);
    }
    
    // Selector por texto (para botones y enlaces)
    if (type === 'button' || type === 'link' || type === 'tab') {
      const text = element.textContent?.trim();
      if (text && text.length < 50) {
        selectors.push(`${element.tagName.toLowerCase()}:contains("${text}")`);
      }
    }
    
    // Selector por clases específicas
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        selectors.push(`${element.tagName.toLowerCase()}.${classes[0]}`);
      }
    }
    
    // Selector por posición como último recurso
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => 
        child.tagName === element.tagName
      );
      const index = siblings.indexOf(element);
      if (index !== -1) {
        selectors.push(`${parent.tagName.toLowerCase()} ${element.tagName.toLowerCase()}:nth-child(${index + 1})`);
      }
    }
    
    return selectors;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copiado: ${text}`);
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(scanResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `element-scan-${scanResults.route.replace(/\//g, '-')}-${Date.now()}.json`;
    link.click();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      width: '500px',
      maxHeight: '90vh',
      overflow: 'auto',
      backgroundColor: 'white',
      border: '3px solid #007bff',
      borderRadius: '8px',
      padding: '20px',
      zIndex: 200000,
      fontFamily: 'monospace',
      fontSize: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '18px' }}>
        Comprehensive Element Scanner
      </h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={comprehensiveScan}
          disabled={isScanning}
          style={{
            backgroundColor: isScanning ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '6px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            marginRight: '10px',
            fontSize: '14px'
          }}
        >
          {isScanning ? 'Escaneando...' : 'ESCANEAR TODO'}
        </button>
        
        {scanResults && (
          <button 
            onClick={exportResults}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Exportar JSON
          </button>
        )}
      </div>

      {scanResults && (
        <div>
          <h3 style={{ color: '#28a745' }}>
            Ruta: {scanResults.route} | {scanResults.timestamp}
          </h3>
          
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '5px',
            marginBottom: '15px'
          }}>
            <h4>Resumen:</h4>
            <p>Botones: {scanResults.stats.totalButtons} | 
               Enlaces: {scanResults.stats.totalLinks} | 
               Inputs: {scanResults.stats.totalInputs} | 
               Selects: {scanResults.stats.totalSelects} | 
               Tabs: {scanResults.stats.totalTabs} | 
               Dialogs: {scanResults.stats.totalDialogs} | 
               Forms: {scanResults.stats.totalForms} | 
               Clickables: {scanResults.stats.totalClickables}</p>
            <p><strong>Total Interactivos: {scanResults.stats.totalInteractive}</strong></p>
          </div>

          {Object.entries(scanResults.elements).map(([category, elements]) => (
            elements.length > 0 && (
              <div key={category} style={{ marginBottom: '20px' }}>
                <h4 style={{ 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  padding: '8px', 
                  margin: '0 0 10px 0',
                  borderRadius: '4px'
                }}>
                  {category.toUpperCase()} ({elements.length})
                </h4>
                
                {elements.map((element, idx) => (
                  <div key={idx} style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    marginBottom: '8px',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                      {element.text || element.href || element.name || `${category} ${idx + 1}`}
                    </div>
                    
                    {element.id && (
                      <div style={{ color: '#666' }}>ID: {element.id}</div>
                    )}
                    
                    {element.type && (
                      <div style={{ color: '#666' }}>Tipo: {element.type}</div>
                    )}
                    
                    <div style={{ marginTop: '8px' }}>
                      <strong>Selectores:</strong>
                      {element.selectors.map((selector, sIdx) => (
                        <div key={sIdx} style={{ 
                          backgroundColor: '#e9ecef', 
                          padding: '4px', 
                          margin: '2px 0',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }} onClick={() => copyToClipboard(selector)}>
                          <code>{selector}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
