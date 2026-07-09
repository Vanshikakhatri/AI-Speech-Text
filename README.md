# AI Speech Assistant

## Tech Stack

- React + Vite
- FastAPI
- Whisper
- Ollama
- Docker

## Prerequisites

Install:

- Git
- Docker Desktop
- Node.js
- Ollama

## Clone Repository

```bash
git clone https://github.com/Vanshikakhatri/AI-Speech-Text.git
cd AI-Speech-Text
```

## Backend

```bash
cd backend
docker build -t speech-backend .
docker run --rm -p 8000:8000 speech-backend
```

docker pull vanshikakhatri20/speech-backend:latest
docker run --rm -p 8000:8000 vanshikakhatri20/speech-backend:latest

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Ollama

```bash
ollama serve
```

If the model is not installed:

```bash
ollama pull llama3.2:3b
```

## Open

```
http://localhost:5173
```
## Prerequisites

Install:

- Git
- Docker Desktop
- Node.js
- Ollama

Download the Ollama model:

```bash
ollama pull llama3.2:3b

open terminal
git clone https://github.com/Vanshikakhatri/AI-Speech-Text.git
cd AI-Speech-Text
## Backend

### Pull the pre-built Docker image

```bash
docker pull vanshikakhatri20/speech-backend:latest
```

### Run the backend

```bash
docker run --rm -p 8000:8000 vanshikakhatri20/speech-backend:latest
```
