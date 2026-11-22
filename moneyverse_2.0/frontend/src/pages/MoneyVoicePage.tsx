import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { VoiceChatResponse } from '../types';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  Copy,
  Check,
  Info,
  Radio
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioBase64?: string | null;
}

export const MoneyVoicePage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial welcome message tailored to language
    const welcomeMap: Record<string, string> = {
      en: "Hello! I am your Money Voice assistant. Ask me anything about your expenses, budgeting, savings, or investments. You can speak or type!",
      kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಮನಿ ವಾಯ್ಸ್ ಸಹಾಯಕ. ನಿಮ್ಮ ಖರ್ಚು, ಬಜೆಟ್ ಮತ್ತು ಉಳಿತಾಯದ ಕುರಿತು ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳನ್ನು ಕನ್ನಡದಲ್ಲೇ ಕೇಳಬಹುದು. ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ!",
      hi: "नमस्ते! मैं आपका मनी वॉइस सहायक हूँ। अपने खर्च, बजट या बचत के बारे में हिंदी में बोलकर या लिखकर कोई भी सवाल पूछें।",
      ta: "வணக்கம்! நான் உங்கள் பணக் குரல் உதவியாளர். உங்கள் செலவு அல்லது சேமிப்பு குறித்து தமிழில் பேசலாம் அல்லது தட்டச்சு செய்யலாம்.",
      te: "నమస్కారం! నేను మీ మనీ వాయిస్ సహాయకుడిని. మీ ఖర్చులు, బడ్జెట్ మరియు పొదుపు గురించి తెలుగులో మాట్లాడవచ్చు లేదా టైప్ చేయవచ్చు."
    };

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: welcomeMap[language] || welcomeMap.en,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Recording Timer
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Clean Audio on Unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speech Recognition & MediaRecorder Setup with capability detection
  const startListening = async () => {
    setMicNotice(null);

    // 1. Check browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicNotice(
        "Browser Limitation: Your browser does not support the MediaDevices audio recording API. Please type your query in the input box below."
      );
      return;
    }

    // 2. Request microphone access cleanly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      if (typeof MediaRecorder !== 'undefined') {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      }
      setIsListening(true);
    } catch (err: any) {
      setIsListening(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicNotice(
          "Permission Denied: Microphone access was blocked. Please click the lock/camera icon in your browser URL bar to allow microphone access, or type your question below."
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicNotice(
          "Hardware Limitation: No microphone detected on this device. Please connect a microphone or use keyboard input."
        );
      } else if (err.name === 'NotReadableError') {
        setMicNotice(
          "Device Busy: Your microphone is currently locked or in use by another application."
        );
      } else {
        setMicNotice(`Microphone notice: ${err.message || 'Microphone initialization failed'}`);
      }
      return;
    }

    // 3. Setup Web Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicNotice(
        "Browser Engine Limitation: This browser does not support Web Speech recognition (best experienced on Google Chrome or Microsoft Edge). Audio recording is active; you can also type below."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Locale mapping for the 5 supported languages
      const localeMap: Record<string, string> = {
        en: 'en-IN',
        kn: 'kn-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
      };
      recognition.lang = localeMap[language] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'network') {
          setMicNotice(
            "Service Limitation: The browser's speech recognition network service is currently unreachable or restricted. You can type your question directly in the text box below."
          );
        } else if (event.error === 'not-allowed') {
          setMicNotice("Speech recognition permission denied by browser settings.");
        } else if (event.error === 'no-speech') {
          setMicNotice("No speech was detected. Tap the microphone and try speaking again.");
        } else {
          setMicNotice(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      setMicNotice(
        "Speech recognition could not start. Please verify browser permissions or type your question below."
      );
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Text-To-Speech Playback with Graceful Limitations Handling
  const speakText = (msgId: string, text: string, audioBase64?: string | null) => {
    // If already playing this message, stop it
    if (playingMessageId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingMessageId(null);
      return;
    }

    // Stop any existing playback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Option 1: Backend gTTS Base64 Audio
    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        activeAudioRef.current = audio;
        setPlayingMessageId(msgId);
        audio.onended = () => setPlayingMessageId(null);
        audio.onerror = () => {
          setPlayingMessageId(null);
          fallbackBrowserSpeech(msgId, text);
        };
        audio.play().catch(() => fallbackBrowserSpeech(msgId, text));
        return;
      } catch {
        fallbackBrowserSpeech(msgId, text);
        return;
      }
    }

    // Option 2: Fallback to browser SpeechSynthesis
    fallbackBrowserSpeech(msgId, text);
  };

  const fallbackBrowserSpeech = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      setMicNotice(
        "Audio Playback Limitation: Speech synthesis is not supported by your browser. Please read the response text above."
      );
      setPlayingMessageId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_\[\]]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const localeMap: Record<string, string> = {
        en: 'en-IN',
        kn: 'kn-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
      };
      utterance.lang = localeMap[language] || 'en-IN';
      utterance.rate = 0.95;

      utterance.onstart = () => setPlayingMessageId(msgId);
      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = (e) => {
        setPlayingMessageId(null);
        if (e.error !== 'canceled') {
          setMicNotice(
            `Voice Playback Limitation: System speech voice for ${language.toUpperCase()} could not play (${e.error}). You can read the text response above.`
          );
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      setPlayingMessageId(null);
      setMicNotice(
        `Audio Playback Limitation: Speech synthesis encountered an error (${e.message}). You can read the text response above.`
      );
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    if (isListening) {
      stopListening();
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await apiRequest<VoiceChatResponse>('/ai/voice-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend.trim(),
          language,
          include_audio: true,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.response_text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        audioBase64: res.audio_base64,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Error connecting to Ollama AI: ${err.message}. Please verify that the local Ollama service is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-100px)] max-w-4xl mx-auto px-4 py-4 flex flex-col justify-between">
      {/* Header */}
      <div className="pb-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <Mic className="w-5 h-5 text-purple-400" />
            <span>{t('voice_title')}</span>
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('voice_subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20 uppercase">
            {language}
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
            Ollama • qwen2.5:3b
          </span>
        </div>
      </div>

      {/* Mic permission or limitation alert */}
      {micNotice && (
        <div className="my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold text-amber-200">Audio / Speech Notice</p>
            <p className="mt-0.5 leading-relaxed">{micNotice}</p>
          </div>
          <button
            onClick={() => setMicNotice(null)}
            className="text-amber-400 hover:text-white font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                  : 'glass-panel border border-white/10 text-gray-200 rounded-tl-none'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                <span>{msg.timestamp}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="hover:text-white transition-colors"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.id, msg.text, msg.audioBase64)}
                      className={`hover:text-cyan-400 transition-colors flex items-center space-x-1 ${
                        playingMessageId === msg.id ? 'text-cyan-400 font-bold' : ''
                      }`}
                      title={playingMessageId === msg.id ? 'Stop Playback' : t('action_listen')}
                    >
                      {playingMessageId === msg.id ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-400 animate-pulse" />
                          <span className="text-rose-300">Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>{t('action_listen')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-purple-700/40 border border-purple-500/30 flex items-center justify-center text-white flex-shrink-0">
                <User className="w-4 h-4 text-purple-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-purple-300 pl-10">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{t('status_ai_thinking')}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="py-2 flex flex-wrap gap-1.5 overflow-x-auto">
        {[
          t('voice_quick_prompt_1'),
          t('voice_quick_prompt_2'),
          t('voice_quick_prompt_3'),
          t('voice_quick_prompt_4'),
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-white/10 text-[11px] text-gray-300 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Active Recording State Banner */}
      {isListening && (
        <div className="mb-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs text-purple-300 animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <Radio className="w-4 h-4 text-rose-400" />
            <span className="font-semibold text-white">Recording voice ({language.toUpperCase()})...</span>
            <span className="font-mono text-cyan-300">
              {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[11px] text-gray-400">Speak clearly or tap Mic to finish</span>
        </div>
      )}

      {/* Spoken/Typed Input Dock */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-2xl transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/50'
                : 'bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-400'
            }`}
            title={isListening ? t('action_stop_speaking') : t('action_speak')}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isListening ? t('action_stop_speaking') : t('voice_placeholder')}
            className="flex-1 px-4 py-3 rounded-2xl glass-input text-xs font-medium"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-3 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 transition-all disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

