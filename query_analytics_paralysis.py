
import json
import os
import asyncio
from notebooklm_mcp.api_client import NotebookLMClient

NOTEBOOK_ID = "f205f6b8-e9a0-4292-88df-47704a937937" # Topic 6: Analítica/Reportes/BI

QUERY = """
Perform a deep dive analysis on 'Analysis Paralysis' (Parálisis de Análisis) in small businesses based on the sources in this notebook. 

Contrast and complement the general knowledge with specific findings from the sources. 
Provide a detailed brief with the following sections:

1. **Hard Data & Statistics**: Specific numbers, percentages, or study results regarding decision paralysis, data overwhelm, failure to use data, or lack of trust in data.
2. **Root Causes & Insights**: Why exactly does this happen in PYMEs? (e.g., trust issues, formatting inconsistencies, too many tools).
3. **Common Errors**: specific mistakes business owners make (e.g., cognitive biases, data fragmentation).
4. **Concrete Solutions**: What specific steps or strategies are suggested to cure this paralysis?
5. **Success Cases**: Any anecdotes or examples of businesses improving their decision-making process.

Extract specific quotes or source references where possible.
"""

async def main():
    try:
        auth_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
        with open(auth_path, 'r') as f:
            auth_data = json.load(f)
        
        cookies = auth_data.get('cookies')
        client = NotebookLMClient(cookies=cookies)
        
        print(f"Querying Notebook {NOTEBOOK_ID}...")
        response = client.query(notebook_id=NOTEBOOK_ID, query_text=QUERY)
        
        if response:
            print("\n--- Insight Result ---\n")
            print(response.get('answer'))
        else:
            print("No response returned.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
