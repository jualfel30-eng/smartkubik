
import json
import os
import inspect
from notebooklm_mcp.api_client import NotebookLMClient

try:
    auth_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
    with open(auth_path, 'r') as f:
        auth_data = json.load(f)
        
    cookies = auth_data.get('cookies')
    client = NotebookLMClient(cookies=cookies)
    
    print("--- Available Attributes/Methods ---")
    print([d for d in dir(client) if not d.startswith('_')])

    if hasattr(client, 'query'):
        print("\n--- query ---")
        print(inspect.signature(client.query))
        print(client.query.__doc__)

    if hasattr(client, 'chat'):
        print("\n--- chat ---")
        print(inspect.signature(client.chat))
        print(client.chat.__doc__)

except Exception as e:
    print(f"Error: {e}")
