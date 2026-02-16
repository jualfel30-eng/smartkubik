
import json
import os
import asyncio
from notebooklm_mcp.api_client import NotebookLMClient

NOTEBOOK_ID = "8cb60700-bdda-4123-a93c-32a238697eb5" # Topic 1: Compras/Inventarios

QUERY = """
Based on the sources in this notebook (Reddit threads, retail statistics, etc.), identify the top 5 most recurring and acute pain points regarding Inventory Management for small businesses (PYMEs). 

For each pain point, provide exactly this structure:
1. **Pain Point Name**
2. ** The Hidden Reality** (what isn't usually said)
3. **Statistic** (a specific number/percentage from the sources)
4. **Quote** (a representative complaint or anecdote from the sources)
5. **The Misconception** (what they wrongly believe)

Focus particularly on 'Phantom Inventory', 'Shrinkage', and 'Incorrect Costing'.
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
