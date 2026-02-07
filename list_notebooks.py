
import asyncio
import json
import os
from notebooklm_mcp.api_client import NotebookLMClient

async def main():
    try:
        auth_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
        with open(auth_path, 'r') as f:
            auth_data = json.load(f)
            
        cookies = auth_data.get('cookies')
        if not cookies:
            print("Error: No cookies found in auth.json")
            return

        client = NotebookLMClient(cookies=cookies)
        
        # Try to find a method that lists notebooks
        if hasattr(client, 'list_notebooks'):
            print("Calling list_notebooks()...")
            notebooks = client.list_notebooks()
            if not notebooks:
                print("No notebooks found.")
            for nb in notebooks:
                print(f"- {nb.title} (ID: {nb.id})")
        else:
            print("list_notebooks method not found. Available methods:")
            print([d for d in dir(client) if not d.startswith('_')])
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
