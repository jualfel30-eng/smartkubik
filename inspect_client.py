
import json
import os
from notebooklm_mcp.api_client import NotebookLMClient

try:
    auth_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
    with open(auth_path, 'r') as f:
        auth_data = json.load(f)
        
    cookies = auth_data.get('cookies')
    client = NotebookLMClient(cookies=cookies)
    print([m for m in dir(client) if not m.startswith('_')])
except Exception as e:
    print(f"Error: {e}")
