from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import whisper
from gtts import gTTS

from llama import ask_llama


app = FastAPI()


# ---------------------------------------
# Allow React Frontend
# ---------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------
# Load Whisper Model
# ---------------------------------------

model = whisper.load_model("base")


# ---------------------------------------
# Request Models
# ---------------------------------------

class TextInput(BaseModel):
    text: str


# ---------------------------------------
# Home
# ---------------------------------------

@app.get("/")
def home():
    return {
        "message": "AI Speech Backend Running"
    }


# ---------------------------------------
# Chat Endpoint
# Type -> Llama -> Text
# ---------------------------------------

@app.post("/chat")
async def chat(data: TextInput):

    answer = ask_llama(data.text)

    return {
        "answer": answer
    }


# ---------------------------------------
# Speak Endpoint
# Text -> Speech
# ---------------------------------------

@app.post("/speak")
async def speak(data: TextInput):

    tts = gTTS(
        text=data.text,
        lang="en"
    )

    tts.save("voice.mp3")

    return FileResponse(
        "voice.mp3",
        media_type="audio/mpeg",
        filename="voice.mp3"
    )


# ---------------------------------------
# Voice Chat
# Voice -> Whisper -> Llama
# ---------------------------------------

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...)):

    with open("audio.wav", "wb") as audio:
        audio.write(await file.read())

    result = model.transcribe("audio.wav")

    transcript = result["text"]

    answer = ask_llama(transcript)

    return {
        "text": transcript,
        "answer": answer
    }


# ---------------------------------------
# Optional
# Only Speech -> Text
# ---------------------------------------

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):

    with open("audio.wav", "wb") as audio:
        audio.write(await file.read())

    result = model.transcribe("audio.wav")

    return {
        "text": result["text"]
    }