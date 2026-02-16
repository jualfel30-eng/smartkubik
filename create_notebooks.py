
import json
import os
import asyncio
from notebooklm_mcp.api_client import NotebookLMClient

NOTEBOOKS = [
    "Smartkubik - Compras/Inventarios/Costeo",
    "Smartkubik - Ventas/Órdenes/POS",
    "Smartkubik - Finanzas/Contabilidad",
    "Smartkubik - Operaciones/Logística/Servicios",
    "Smartkubik - CRM/Posventa/Automatización",
    "Smartkubik - Analítica/KPIs/Reportes/BI",
    "Smartkubik - Nómina/RRHH/Productividad"
]

async def main():
    try:
        auth_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
        with open(auth_path, 'r') as f:
            auth_data = json.load(f)
        
        client = NotebookLMClient(cookies=auth_data.get('cookies'))
        
        results = []
        print("Creating notebooks...")
        for title in NOTEBOOKS:
            nb = client.create_notebook(title)
            # Inspect what create_notebook returns. It might be synchronous in the wrapper but check signatures.
            # Inspect signature earlier said: (title: str) -> Notebook | None
            # And it was synchronous (no await in signature print, though wrapper might hide it).
            # Wait, list_notebooks needed removal of await. So create_notebook likely sync too.
            
            if nb:
                print(f"Created: {nb.title} (ID: {nb.id})")
                results.append({"title": nb.title, "id": nb.id})
            else:
                print(f"Failed to create: {title}")
        
        # Save to file for the agent to read
        with open("created_notebooks.json", "w") as f:
            json.dump(results, f, indent=2)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
