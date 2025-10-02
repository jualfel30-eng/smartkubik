import React, { useState } from 'react';

// Asumo que tienes un componente Button, si no, usa un <button> normal.
import { Button } from '@/components/ui/button';

export default function TutorialDebugger() {
  const [debugInfo, setDebugInfo] = useState({});

  const scanCurrentPage = () => {
    const info = {
      route: window.location.pathname,
      tabs: Array.from(document.querySelectorAll('[role="tab"]')).map(el => ({
        selector: `[role="tab"][value="${el.value}"]`,
        text: el.textContent?.trim(),
        value: el.value,
        visible: el.offsetParent !== null
      })),
      buttons: Array.from(document.querySelectorAll('button')).map((el, idx) => ({
        selector: el.id ? `#${el.id}` : `button:contains("${el.textContent?.trim()}")`,
        text: el.textContent?.trim(),
        classes: el.className,
        visible: el.offsetParent !== null
      })).filter(btn => btn.text && btn.visible),
      dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).map(el => ({
        selector: '[role="dialog"]',
        visible: el.offsetParent !== null
      })),
      navigation: Array.from(document.querySelectorAll('nav button, nav a')).map(el => ({
        selector: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        href: el.href,
        visible: el.offsetParent !== null
      }))
    };
    
    setDebugInfo(info);
    console.log('🔍 DEBUG INFO:', info);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      width: '350px',
      maxHeight: '90vh',
      overflow: 'auto',
      backgroundColor: 'white',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '15px',
      zIndex: 100000,
      fontFamily: 'monospace',
      fontSize: '11px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
        🔍 Tutorial Debugger
      </h3>
      
      <Button onClick={scanCurrentPage} style={{
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '15px'
      }}>
        🔄 Escanear Página Actual
      </Button>

      {debugInfo.route && (
        <div>
          <h4>📍 Ruta: {debugInfo.route}</h4>
          
          {debugInfo.tabs?.length > 0 && (
            <div style={{marginBottom: '10px'}}>
              <h5>🏷️ Tabs disponibles:</h5>
              {debugInfo.tabs.map((tab, i) => (
                <div key={i} style={{ 
                  padding: '4px', 
                  backgroundColor: tab.visible ? '#e8f5e8' : '#ffe8e8',
                  margin: '2px 0',
                  borderRadius: '3px'
                }}>
                  <code>{tab.selector}</code>
                  <br />
                  <small>{tab.text} {!tab.visible && '(OCULTO)'}</small>
                </div>
              ))}
            </div>
          )}

          {debugInfo.buttons?.length > 0 && (
            <div>
              <h5>🔘 Botones Visibles (Top 15):</h5>
              {debugInfo.buttons.slice(0, 15).map((btn, i) => (
                <div key={i} style={{ 
                  padding: '4px',
                  backgroundColor: '#f0f0f0',
                  margin: '2px 0',
                  borderRadius: '3px'
                }}>
                  <strong>{btn.text}</strong>
                  <br />
                  <code style={{ fontSize: '10px' }}>{btn.selector}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}