
import json
import os
import argparse
import asyncio
from notebooklm_mcp.api_client import NotebookLMClient

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True, help="Notebook ID")
    parser.add_argument("--urls", nargs='+', required=True, help="List of URLs")
    args = parser.parse_args()

    try:
        auth_path = os.path.expanduser("~/.notebooklm-mcp/auth.json")
        with open(auth_path, 'r') as f:
            auth_data = json.load(f)
        
        client = NotebookLMClient(cookies=auth_data.get('cookies'))
        
        print(f"Adding sources to Notebook {args.id}...")
        for url in args.urls:
            print(f"  - Adding: {url}")
            # Note: add_url_source might be sync or async based on previous findings.
            # inspect signatures said: (notebook_id: str, url: str) -> dict | None (Sync)
            try:
                client.add_url_source(notebook_id=args.id, url=url)
                print("    Success")
            except Exception as e_url:
                print(f"    Failed: {e_url}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
