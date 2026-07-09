import requests

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

def ask_llama(prompt):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": False
        }
    )

    response.raise_for_status()

    data = response.json()

    return data["response"]