import { useEffect, useRef, useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:8000";

// =============================
// Shared fetch helpers
// =============================
async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    if (data && data.detail) return data.detail;
  } catch {
    // response body wasn't JSON, ignore
  }
  return `Request failed (${response.status})`;
}

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}

async function fetchBlob(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.blob();
}

function extensionForMime(mime) {
  if (!mime) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("webm")) return "webm";
  return "mp3";
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// =============================
// Small inline icon set (no external deps)
// =============================
const Icon = {
  Mic: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Stop: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  ),
  Speaker: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Copy: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Trash: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Download: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Replay: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 15a7 7 0 1 0 1-9.5L4 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Send: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 12 20 4l-6 16-3-7-7-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  Bot: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="9" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9V5m0 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM9 14v1M15 14v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Check: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function createRipple(event) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

function Waveform({ active }) {
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className={`waveform ${active ? "waveform-active" : ""}`} aria-hidden="true">
      {bars.map((i) => (
        <span key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

function App() {
  // -----------------------------
  // Speech ↔ Text Converter
  // -----------------------------
  const [speechText, setSpeechText] = useState("");
  const [sttRecording, setSttRecording] = useState(false);
  const [sttStatus, setSttStatus] = useState("");
  const [sttError, setSttError] = useState("");
  const [sttSpeaking, setSttSpeaking] = useState(false);
  const [sttSuccess, setSttSuccess] = useState(false);
  const [sttCopied, setSttCopied] = useState(false);

  const sttRecorderRef = useRef(null);
  const sttStreamRef = useRef(null);
  const sttChunksRef = useRef([]);

  // -----------------------------
  // Text to Speech (standalone card)
  // -----------------------------
  const [ttsText, setTtsText] = useState("");
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsAudioExt, setTtsAudioExt] = useState("mp3");
  const ttsAudioRef = useRef(null);
  const ttsObjectUrlRef = useRef(null);

  // -----------------------------
  // AI Voice Assistant
  // -----------------------------
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerTime, setAnswerTime] = useState(null);
  const [aiRecording, setAiRecording] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");
  const [sending, setSending] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  const aiRecorderRef = useRef(null);
  const aiStreamRef = useRef(null);
  const aiChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (ttsObjectUrlRef.current) URL.revokeObjectURL(ttsObjectUrlRef.current);
    };
  }, []);

  // =============================
  // Play speech (used by STT card's "Convert to Speech")
  // =============================
  const playSpeech = async (text, setSpeaking, setError) => {
    if (!text || !text.trim()) {
      setError("There's no text to convert to speech yet.");
      return;
    }

    setError("");
    setSpeaking(true);

    try {
      const blob = await fetchBlob(`${BACKEND_URL}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      setError(err.message || "Unable to play speech.");
    } finally {
      setSpeaking(false);
    }
  };

  // =============================
  // Generic microphone recording helper
  // =============================
  const beginRecording = async ({
    streamRef,
    recorderRef,
    chunksRef,
    setRecording,
    setStatus,
    setError,
    recordingLabel,
    onStop,
  }) => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await onStop(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setStatus(recordingLabel);
    } catch (err) {
      setError("Microphone access was denied or is unavailable.");
      setRecording(false);
      setStatus("");
    }
  };

  const endRecording = (recorderRef, setRecording) => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  // =============================
  // Speech → Text (Card 1)
  // =============================
  const startSpeechRecording = () => {
    setSttSuccess(false);
    beginRecording({
      streamRef: sttStreamRef,
      recorderRef: sttRecorderRef,
      chunksRef: sttChunksRef,
      setRecording: setSttRecording,
      setStatus: setSttStatus,
      setError: setSttError,
      recordingLabel: "Recording...",
      onStop: async (blob) => {
        setSttStatus("Transcribing...");

        try {
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");

          const data = await fetchJSON(`${BACKEND_URL}/transcribe`, {
            method: "POST",
            body: formData,
          });

          setSpeechText(data.text || "");
          setSttSuccess(true);
          setTimeout(() => setSttSuccess(false), 3200);
        } catch (err) {
          setSttError(err.message || "Transcription failed. Please try again.");
        } finally {
          setSttStatus("");
        }
      },
    });
  };

  const stopSpeechRecording = () => {
    endRecording(sttRecorderRef, setSttRecording);
  };

  const clearSpeechText = () => {
    setSpeechText("");
    setSttError("");
    setSttSuccess(false);
  };

  const copySpeechText = async () => {
    if (!speechText.trim()) return;
    try {
      await navigator.clipboard.writeText(speechText);
      setSttCopied(true);
      setTimeout(() => setSttCopied(false), 1800);
    } catch {
      setSttError("Couldn't copy to clipboard.");
    }
  };

  // =============================
  // Text → Speech (Card 2, standalone)
  // =============================
  const speakTtsText = async () => {
    if (!ttsText.trim()) {
      setTtsError("Type something to convert to speech first.");
      return;
    }

    setTtsError("");
    setTtsSpeaking(true);

    try {
      const blob = await fetchBlob(`${BACKEND_URL}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText }),
      });

      if (ttsObjectUrlRef.current) URL.revokeObjectURL(ttsObjectUrlRef.current);
      const url = URL.createObjectURL(blob);
      ttsObjectUrlRef.current = url;
      setTtsAudioExt(extensionForMime(blob.type));
      setTtsAudioUrl(url);

      requestAnimationFrame(() => {
        ttsAudioRef.current?.play().catch(() => {});
      });
    } catch (err) {
      setTtsError(err.message || "Unable to generate speech.");
    } finally {
      setTtsSpeaking(false);
    }
  };

  const replayTts = () => {
    if (!ttsAudioRef.current) return;
    ttsAudioRef.current.currentTime = 0;
    ttsAudioRef.current.play().catch(() => {});
  };

  const clearTts = () => {
    setTtsText("");
    setTtsError("");
    if (ttsObjectUrlRef.current) {
      URL.revokeObjectURL(ttsObjectUrlRef.current);
      ttsObjectUrlRef.current = null;
    }
    setTtsAudioUrl(null);
  };

  // =============================
  // Chat (Typed) — Card 3
  // =============================
  const sendQuestion = async () => {
    if (!question.trim() || sending) return;

    setSending(true);
    setAiError("");
    setAiStatus("Thinking...");

    try {
      const data = await fetchJSON(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question }),
      });

      setAnswer(data.answer || "");
      setAnswerTime(new Date());
    } catch (err) {
      setAiError(err.message || "Chat failed. Please try again.");
    } finally {
      setSending(false);
      setAiStatus("");
    }
  };

  // =============================
  // Voice Chat — Card 3
  // =============================
  const startVoiceAssistant = () => {
    beginRecording({
      streamRef: aiStreamRef,
      recorderRef: aiRecorderRef,
      chunksRef: aiChunksRef,
      setRecording: setAiRecording,
      setStatus: setAiStatus,
      setError: setAiError,
      recordingLabel: "Recording...",
      onStop: async (blob) => {
        setAiStatus("Transcribing & thinking...");

        try {
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");

          const data = await fetchJSON(`${BACKEND_URL}/voice-chat`, {
            method: "POST",
            body: formData,
          });

          setQuestion(data.text || "");
          setAnswer(data.answer || "");
          setAnswerTime(new Date());
        } catch (err) {
          setAiError(err.message || "Voice assistant failed. Please try again.");
        } finally {
          setAiStatus("");
        }
      },
    });
  };

  const stopVoiceAssistant = () => {
    endRecording(aiRecorderRef, setAiRecording);
  };

  const clearAiCard = () => {
    setQuestion("");
    setAnswer("");
    setAiError("");
    setAnswerTime(null);
  };

  const copyAnswer = async () => {
    if (!answer.trim()) return;
    try {
      await navigator.clipboard.writeText(answer);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1800);
    } catch {
      setAiError("Couldn't copy to clipboard.");
    }
  };

  // =============================
  // Derived UI state
  // =============================
  const sttTranscribing = sttStatus === "Transcribing...";
  const aiTranscribing = aiStatus === "Transcribing & thinking...";
  const aiBusy = sending || aiTranscribing;

  // =============================
  // UI
  // =============================
  return (
    <div className="app">
      <div className="app-backdrop" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
      </div>

      <header className="app-header">
        <div className="app-eyebrow">Voice &amp; Language</div>
        <h1 className="app-title">AI Speech Assistant</h1>
        <p className="app-subtitle">Speak it, read it, ask it — one console for your voice AI stack.</p>
      </header>

      <main className="cards-grid">
        {/* ================================= */}
        {/* CARD 1 — Speech to Text */}
        {/* ================================= */}
        <section className="card card-glass">
          <div className="card-head">
            <div className="card-head-icon icon-cyan">
              <Icon.Mic className="card-head-svg" />
            </div>
            <div>
              <h2 className="card-title">Speech to Text</h2>
              <p className="card-desc">Record your voice and get an instant transcript.</p>
            </div>
          </div>

          <div className="mic-stage">
            <Waveform active={sttRecording} />
            <p className={`mic-status ${sttRecording ? "mic-status-live" : ""}`}>
              {sttRecording ? (
                <>
                  <span className="live-dot" /> Recording…
                </>
              ) : sttTranscribing ? (
                "Transcribing…"
              ) : (
                "Tap record and start speaking"
              )}
            </p>
          </div>

          <div className="button-row">
            <button
              type="button"
              className={`btn btn-primary btn-lg ${sttRecording ? "btn-danger" : ""}`}
              onMouseDown={createRipple}
              onClick={sttRecording ? stopSpeechRecording : startSpeechRecording}
              disabled={sttTranscribing || sttSpeaking}
            >
              {sttRecording ? (
                <>
                  <Icon.Stop className="btn-icon" /> Stop
                </>
              ) : (
                <>
                  <Icon.Mic className="btn-icon" /> Record
                </>
              )}
            </button>
          </div>

          {sttError && <p className="inline-alert inline-alert-error">{sttError}</p>}

          {sttSuccess && (
            <p className="inline-alert inline-alert-success">
              <Icon.Check className="inline-alert-icon" /> Transcribed successfully
            </p>
          )}

          <div className="field-block">
            <textarea
              className="textarea"
              rows="7"
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="Your transcript will appear here — feel free to edit it before converting back to speech."
              disabled={sttRecording}
            />
            <div className="field-footer">
              <span className="char-count">{speechText.length} characters</span>
              <div className="field-footer-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onMouseDown={createRipple}
                  onClick={copySpeechText}
                  disabled={!speechText.trim()}
                >
                  <Icon.Copy className="btn-icon-sm" /> {sttCopied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onMouseDown={createRipple}
                  onClick={clearSpeechText}
                  disabled={sttRecording || sttTranscribing || sttSpeaking || !speechText.trim()}
                >
                  <Icon.Trash className="btn-icon-sm" /> Clear
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-gradient btn-full"
            onMouseDown={createRipple}
            onClick={() => playSpeech(speechText, setSttSpeaking, setSttError)}
            disabled={sttSpeaking || sttRecording || sttTranscribing || !speechText.trim()}
          >
            {sttSpeaking ? (
              <>
                <span className="spinner" /> Generating speech…
              </>
            ) : (
              <>
                <Icon.Speaker className="btn-icon" /> Convert to Speech
              </>
            )}
          </button>
        </section>

        {/* ================================= */}
        {/* CARD 2 — Text to Speech */}
        {/* ================================= */}
        <section className="card card-glass">
          <div className="card-head">
            <div className="card-head-icon icon-purple">
              <Icon.Speaker className="card-head-svg" />
            </div>
            <div>
              <h2 className="card-title">Text to Speech</h2>
              <p className="card-desc">Turn any text into natural-sounding audio.</p>
            </div>
          </div>

          <div className="field-block">
            <textarea
              className="textarea textarea-lg"
              rows="8"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Type or paste text here — e.g. “Welcome to your AI speech assistant, ready whenever you are.”"
            />
            <div className="field-footer">
              <span className="char-count">{ttsText.length} characters</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onMouseDown={createRipple}
                onClick={clearTts}
                disabled={ttsSpeaking || (!ttsText.trim() && !ttsAudioUrl)}
              >
                <Icon.Trash className="btn-icon-sm" /> Clear
              </button>
            </div>
          </div>

          {ttsError && <p className="inline-alert inline-alert-error">{ttsError}</p>}

          <button
            type="button"
            className="btn btn-gradient btn-full"
            onMouseDown={createRipple}
            onClick={speakTtsText}
            disabled={ttsSpeaking || !ttsText.trim()}
          >
            {ttsSpeaking ? (
              <>
                <span className="spinner" /> Generating speech…
              </>
            ) : (
              <>
                <Icon.Speaker className="btn-icon" /> Speak
              </>
            )}
          </button>

          {ttsAudioUrl ? (
            <div className="audio-player fade-in">
              <audio ref={ttsAudioRef} src={ttsAudioUrl} controls className="audio-el" />
              <div className="audio-actions">
                <button type="button" className="btn btn-ghost btn-sm" onMouseDown={createRipple} onClick={replayTts}>
                  <Icon.Replay className="btn-icon-sm" /> Replay
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={ttsAudioUrl}
                  download={`speech-output.${ttsAudioExt}`}
                  onMouseDown={createRipple}
                >
                  <Icon.Download className="btn-icon-sm" /> Download
                </a>
              </div>
            </div>
          ) : (
            <div className="audio-placeholder">
              <Icon.Speaker className="audio-placeholder-icon" />
              <p>Your generated audio will appear here</p>
            </div>
          )}
        </section>

        {/* ================================= */}
        {/* CARD 3 — AI Voice Assistant */}
        {/* ================================= */}
        <section className="card card-glass card-assistant">
          <div className="card-head card-head-center">
            <div className="card-head-icon icon-blue">
              <Icon.Bot className="card-head-svg" />
            </div>
            <div>
              <h2 className="card-title">AI Voice Assistant</h2>
              <p className="card-desc">Ask by typing or speaking — get a spoken answer back.</p>
            </div>
          </div>

          <div className="assistant-inner">
          <div className="assistant-input">
            <textarea
              className="textarea"
              rows="3"
              value={question}
              placeholder="Ask anything…"
              onChange={(e) => setQuestion(e.target.value)}
              disabled={aiRecording}
            />
            <div className="button-row">
              <button
                type="button"
                className="btn btn-gradient"
                onMouseDown={createRipple}
                onClick={sendQuestion}
                disabled={aiBusy || aiRecording || !question.trim()}
              >
                {sending ? (
                  <>
                    <span className="spinner" /> Thinking…
                  </>
                ) : (
                  <>
                    <Icon.Send className="btn-icon" /> Send
                  </>
                )}
              </button>

              <button
                type="button"
                className={`btn btn-primary ${aiRecording ? "btn-danger" : ""}`}
                onMouseDown={createRipple}
                onClick={aiRecording ? stopVoiceAssistant : startVoiceAssistant}
                disabled={sending || aiSpeaking}
              >
                {aiRecording ? (
                  <>
                    <Icon.Stop className="btn-icon" /> Stop
                  </>
                ) : (
                  <>
                    <Icon.Mic className="btn-icon" /> Record Question
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onMouseDown={createRipple}
                onClick={clearAiCard}
                disabled={aiRecording || aiBusy || aiSpeaking || (!question.trim() && !answer.trim())}
              >
                <Icon.Trash className="btn-icon-sm" /> Clear
              </button>
            </div>

            {aiRecording && <Waveform active={aiRecording} />}
            {aiError && <p className="inline-alert inline-alert-error">{aiError}</p>}
          </div>

          <div className="answer-card">
            {aiBusy ? (
              <div className="typing-indicator">
                <span />
                <span />
                <span />
                <span className="typing-label">{aiStatus || "Thinking…"}</span>
              </div>
            ) : answer ? (
              <div className="answer-body fade-in">
                <p className="answer-text">{answer}</p>
                <div className="answer-meta">
                  {answerTime && <span className="answer-time">{formatTime(answerTime)}</span>}
                  <div className="answer-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onMouseDown={createRipple}
                      onClick={() => playSpeech(answer, setAiSpeaking, setAiError)}
                      disabled={aiSpeaking || aiBusy || aiRecording}
                      aria-label="Read answer aloud"
                      title="Read answer aloud"
                    >
                      {aiSpeaking ? <span className="spinner spinner-sm" /> : <Icon.Speaker className="icon-btn-svg" />}
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onMouseDown={createRipple}
                      onClick={copyAnswer}
                      aria-label="Copy answer"
                      title="Copy answer"
                    >
                      {aiCopied ? <Icon.Check className="icon-btn-svg" /> : <Icon.Copy className="icon-btn-svg" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="answer-placeholder">Your assistant's answer will appear here.</p>
            )}
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
