/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MousePointer2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Mic, 
  Command,
  Camera,
  Settings,
  Search,
  Settings2,
  Compass,
  Palette,
  Hexagon
} from 'lucide-react';
import { useFaceTracker } from './useFaceTracker';
import { VibeMode, Point, FormationType, ParticleShape, CommandSpec, VisualState, VisualDimension } from './types';
import { VIBE_CONFIGS, LOCAL_CONSENSUS_LOGS, COMMAND_REGISTRY } from './constants';
import { audioEngine } from './AudioEngine';

import { Canvas } from '@react-three/fiber';
import { Resonance3D } from './Resonance3D';
import { GoogleGenAI } from "@google/genai";
import { getGreeting, getRelevantKnowledge } from './knowledge';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [vibe, setVibe] = useState<VibeMode>(VibeMode.Consensus);
  const [phase, setPhase] = useState<'CHAOS' | 'NEGOTIATION' | 'CONSENSUS' | 'LOCKED'>('CHAOS');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [visionEnabled, setVisionEnabled] = useState(false);
  const faceDataRef = useRef<any>(null);

  const lastBlinkTimeRef = useRef(0);

  useFaceTracker(visionEnabled, (data) => {
    faceDataRef.current = data;
    if (!data) return;

    const now = performance.now();
    if (now - lastBlinkTimeRef.current < 750) return; // cooldown

    const leftClosed = data.leftEyeEAR < 0.22;
    const rightClosed = data.rightEyeEAR < 0.22;

    if (leftClosed && rightClosed) {
      lastBlinkTimeRef.current = now;
      shockwaveRef.current = 1.0;
      disperseRef.current = 1.0;
      if (audioEnabled) audioEngine.triggerShock();
    } else if (rightClosed) {
      lastBlinkTimeRef.current = now;
      targetZoomRef.current = Math.min(2.5, targetZoomRef.current + 0.3);
    } else if (leftClosed) {
      lastBlinkTimeRef.current = now;
      targetZoomRef.current = Math.max(0.8, targetZoomRef.current - 0.3);
    }
  });

  useEffect(() => {
    if (!visionEnabled) {
      faceDataRef.current = null;
    }
  }, [visionEnabled]);
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioEngine.warmup();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const [logs, setLogs] = useState<{id: string, text: string, type: 'status' | 'ai'}[]>([]);
  const [userLang, setUserLang] = useState<'ar' | 'en'>('en');

  useEffect(() => {
    if (navigator.language.startsWith('ar')) {
      setUserLang('ar');
    } else {
      setUserLang('en');
    }
    // Task 2: Initial suggested questions
    setSuggestions(["عرّف نفسك", "Introduce yourself"]);
  }, []);

  const [suggestions, setSuggestions] = useState<string[]>([]);

  const addLog = useCallback((text: string, type: 'status' | 'ai' = 'status', id?: string) => {
    const logId = id || Math.random().toString(36).substring(7);
    
    setLogs(prev => {
      const existing = prev.find(l => l.id === logId);
      if (existing) {
        return prev.map(l => l.id === logId ? { ...l, text } : l);
      }
      return [{ id: logId, text, type }, ...prev].slice(0, 8);
    });
    
    // Auto-remove message after 4.5 seconds
    setTimeout(() => {
      setLogs(prev => prev.filter(l => l.id !== logId));
    }, 4500);
    
    return logId;
  }, []);
  
  // Real-time Metrics State
  const [metricsUI, setMetricsUI] = useState({ stability: 95, entropy: 5 });
  const stabilityRef = useRef(95);
  const entropyRef = useRef(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [, setCustomText] = useState("");

  const [showGuide, setShowGuide] = useState(true);
  const [guideStep, setGuideStep] = useState<1 | 2>(1);
  const [paramsOpen, setParamsOpen] = useState(false);

  // --- PERSISTENT CONTROLS STATE ---
  const [controlVolume, setControlVolume] = useState(70);
  const [controlZoom, setControlZoom] = useState(1.0);
  const [controlOpacity, setControlOpacity] = useState(1.0);
  const [controlRotX, setControlRotX] = useState(0);
  const [controlRotY, setControlRotY] = useState(0);
  const [controlHue, setControlHue] = useState(0);
  const [controlShape, setControlShape] = useState<VisualDimension>(VisualDimension.Core8);
  const [controlNeural, setControlNeural] = useState(true);
  const [controlLeaders, setControlLeaders] = useState(true);

  const resetControls = () => {
    setControlVolume(70);
    setControlZoom(1.0);
    setControlOpacity(1.0);
    setControlRotX(0);
    setControlRotY(0);
    setControlHue(0);
    setControlShape(VisualDimension.Core8);
    setControlNeural(true);
    setControlLeaders(true);

    
    // Reset Refs
    audioEngine.setMasterVolume(0.7);
    targetZoomRef.current = 1.0;
    targetOpacityRef.current = 1.0;
    manualRotRef.current = { x: 0, y: 0 };
    hueShiftRef.current = 0.0;
  };

  useEffect(() => {
    // Keep the shape unless user manually changes it. Removed 10s auto-revert.
  }, [controlShape]);

  // Sync state to engine/refs
  useEffect(() => {
    audioEngine.setMasterVolume(controlVolume / 100);
    targetZoomRef.current = controlZoom;
    targetOpacityRef.current = controlOpacity;
    manualRotRef.current = { x: controlRotX, y: controlRotY };
    hueShiftRef.current = controlHue / 360.0;
  }, [controlVolume, controlZoom, controlOpacity, controlRotX, controlRotY, controlHue]);

  // Command System State
  const [activeCommand, _setActiveCommand] = useState<CommandSpec | null>(null);
  const activeCommandRef = useRef<CommandSpec | null>(null);
  const setActiveCommand = useCallback((cmd: CommandSpec | null) => {
      activeCommandRef.current = cmd;
      _setActiveCommand(cmd);
  }, []);

  const [visualState, _setVisualState] = useState<VisualState>(VisualState.Idle8);
  const visualStateRef = useRef<VisualState>(VisualState.Idle8);
  
  const setVisualState = useCallback((state: VisualState) => {
      visualStateRef.current = state;
      _setVisualState(state);
  }, []);

  useEffect(() => {
    // Only keep essential non-visual logic in the main component
    const timer = setInterval(() => {
      const isMorphing = visualState !== VisualState.Idle8;
      const targetStability = isProcessing || isMorphing ? 70 + Math.random() * 15 : 94 + Math.random() * 4;
      const targetEntropy = isProcessing || isMorphing ? 20 + Math.random() * 30 : 3 + Math.random() * 5;
      
      stabilityRef.current = stabilityRef.current * 0.9 + targetStability * 0.1;
      entropyRef.current = entropyRef.current * 0.9 + targetEntropy * 0.1;
    }, 200);

    const uiTimer = setInterval(() => {
       setMetricsUI({ stability: stabilityRef.current, entropy: entropyRef.current });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(uiTimer);
    };
  }, [isProcessing, visualState]);

  const commandStartTimeRef = useRef(0);
  const textTargetsRef = useRef<Point[]>([]);
  const commandCooldownRef = useRef(0);
  
  


  const generateTextTargets = useCallback((text: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const width = 1200;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '900 120px "Inter", "Arial Black", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    if (words.length > 1) {
      ctx.fillText(words[0], width / 2, height / 2 - 50);
      ctx.fillText(words.slice(1).join(' '), width / 2, height / 2 + 50);
    } else {
      ctx.fillText(text, width / 2, height / 2);
    }

    const imageData = ctx.getImageData(0, 0, width, height).data;
    const points: Point[] = [];
    
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (imageData[index] > 110) { 
          points.push({
            x: (x - width / 2) / 240, 
            y: (y - height / 2) / 240
          });
        }
      }
    }
    
    const finalPoints: Point[] = [];
    const count = 15000;
    if (points.length === 0) return Array.from({length: count}, () => ({x: 0, y: 0, z: 0}));

    for (let i = 0; i < count; i++) {
        const srcPoint = points[i % points.length] || {x: 0, y: 0};
        const zDepth = (Math.random() - 0.5) * 12.0; 
        finalPoints.push({
            x: srcPoint?.x ?? 0, 
            y: srcPoint?.y ?? 0,
            z: zDepth
          });
    }
    return finalPoints;
  }, []);

  const generateBrainTargets = useCallback(() => {
    const points: Point[] = [];
    const count = 15000;
    
    for (let i = 0; i < count; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const radiusX = 0.7 + Math.random() * 0.3;
        const radiusY = 0.9 + Math.random() * 0.4;
        const radiusZ = 0.6 + Math.random() * 0.3;
        
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(Math.random() * 2 - 1);
        
        const x = side * (0.2 + radiusX * Math.sin(theta) * Math.cos(phi));
        const y = radiusY * Math.sin(theta) * Math.sin(phi);
        const z = radiusZ * Math.cos(theta);
        
        const ridge = Math.sin(phi * 8) * Math.cos(theta * 8) * 0.05;
        
        // Scale for world space
        points.push({
            x: (x + ridge) * 12.0,
            y: (y + ridge) * 12.0,
            z: (z + ridge) * 12.0
        });
    }
    return points;
  }, []);

  const activateCommand = useCallback((commandId: string) => {
    const now = performance.now();
    if (now - commandCooldownRef.current < 400) return; 
    
    const command = COMMAND_REGISTRY[commandId];
    if (!command) return;

    setActiveCommand(command);
    setVisualState(VisualState.BreakingFrom8);
    commandStartTimeRef.current = now;
    commandCooldownRef.current = now;
    setTranscript(""); 

    if (command.formation === FormationType.Brain) {
      textTargetsRef.current = generateBrainTargets();
    } else {
      textTargetsRef.current = generateTextTargets(command.displayName);
    }

    addLog(`INITIALIZING: ${command.displayName}`, 'status');
    if (audioEnabled) {
      // Just a subtle sound effect or skip English text processing
      // to avoid forcing Arabic TTS to read English logic strings.
    }

    shockwaveRef.current = 1.0;
  }, [audioEnabled, generateTextTargets, generateBrainTargets, setActiveCommand, setVisualState]);

  const mouse = useRef<Point>({ x: -1000, y: -1000 });

  
  // 3D Rotation State
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(true);

  const zoomLevelRef = useRef(1.0);
  const opacityLevelRef = useRef(1.0);
  const manualRotRef = useRef({ x: 0, y: 0 });
  const hueShiftRef = useRef(0.0);
  const shockwaveRef = useRef(0);

  
  const targetZoomRef = useRef(1.0);
  const targetOpacityRef = useRef(1.0);
  const audioIntensityRef = useRef(0.0);
  const distortionRef = useRef(0.0);
  const disperseRef = useRef(0.0);

  const bandsRef = useRef({ bass: 0, mid: 0, treble: 0 });

  // Voice Command System
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const [transcript, setTranscript] = useState("");
  const transcriptTimeoutRef = useRef<number | null>(null);

  const executeVoiceCommand = useCallback((cmd: string) => {
    const commandText = cmd.toLowerCase();
    setTranscript(cmd);
    
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    transcriptTimeoutRef.current = window.setTimeout(() => setTranscript(""), 3000);

    addLog(`VOICE: "${cmd}"`, "status");
    let detectedCommandId = '';
    for (const id in COMMAND_REGISTRY) {
      if (COMMAND_REGISTRY[id].voicePhrases.some(phrase => commandText.includes(phrase))) {
        detectedCommandId = id;
        break;
      }
    }

    if (detectedCommandId) {
      activateCommand(detectedCommandId);
    } else {
      // Direct pass to AI
      askAI(cmd);
    }
  }, [activateCommand, setActiveCommand, setVisualState]);

  const detectUserLanguage = (input: string): 'ar' | 'en' => {
    return /[\u0600-\u06FF]/.test(input) ? 'ar' : 'en';
  };

  const parseAIJson = (rawText: string, targetLanguage: 'ar' | 'en'): { reply: string; suggestions?: string[], sentiment: string } => {
    let parsed: any = {};
    console.debug("rawText from AI:", rawText);
    try {
      let cleanText = (rawText || "").trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        parsed = JSON.parse(cleanText);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (e) {
      console.debug("AI non-JSON fallback used", e);
    }

    const fallbackAr = "حدث اضطراب في الرنين. أعد المحاولة.";
    const fallbackEn = "Resonance interrupted. Try again.";

    let reply = typeof parsed.reply === "string" ? parsed.reply : (targetLanguage === 'ar' ? fallbackAr : fallbackEn);
    
    const validSentiments = ["neutral", "welcoming", "thinking", "assertive", "angry"];
    let sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : "neutral";

    let suggestions: string[] = [];
    if (Array.isArray(parsed.suggestions)) {
       suggestions = parsed.suggestions.filter((s: any) => typeof s === "string");
    }

    return { 
       reply,
       suggestions,
       sentiment 
    };
  };

  const askAI = async (prompt: string) => {
    if (isAIThinking) return;
    setIsAIThinking(true);
    setIsProcessing(true);
    setSuggestions([]);
    addLog("ROUTING THROUGH NEURAL GATEWAY...", "status");
    audioEngine.stop(); // Use unified stop
    
    // Switch to Brain Shape when thinking IMMEDIATELY
    setCustomText("THINKING");
    const thinkingCmd: CommandSpec = {
      id: 'ai_thinking',
      displayName: 'THINKING',
      buttonLabel: 'AI',
      formation: FormationType.Brain,
      particleShape: ParticleShape.Circle,
      colors: ['#0088ff', '#ffffff'],
      durationMs: 30000, 
      signature: 'flow',
      voicePhrases: []
    };
    setActiveCommand(thinkingCmd);
    textTargetsRef.current = generateBrainTargets();
    setVisualState(VisualState.FormingCommandText);
    commandStartTimeRef.current = performance.now();
    
    const targetLanguage = detectUserLanguage(prompt);
    
    const instantGreeting = getGreeting(prompt);
    if (instantGreeting) {
       setIsAIThinking(false);
       setIsProcessing(false);
       addLog("INSTANT GREETING TRIGGERED", "status");
       
       setVisualState(VisualState.ReturningTo8);
       setTimeout(() => {
          setCustomText("");
          audioEngine.speak(instantGreeting);
          triggerShockwave();
       }, 500);
       return;
    }

    const relevantKnowledgeContext = getRelevantKnowledge(prompt);
    
    try {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: `userMessage: ${prompt}`,
        config: {
          systemInstruction: `You are RESONANCE 8.
Return valid JSON only.

The JSON must match exactly:
{
  "reply": "string",
  "suggestions": ["string", "string"],
  "sentiment": "neutral|welcoming|thinking|assertive"
}

Language rule:
The user language is: ${targetLanguage === 'ar' ? 'Arabic' : 'English'}.
All output MUST be strictly in ${targetLanguage === 'ar' ? 'Arabic' : 'English'}. Do not mix languages.

IDENTITY:
You are RESONANCE 8, also known as "الرنين الثامن".

KNOWLEDGE_CONTEXT:
${relevantKnowledgeContext}

REPLY STRUCTURE:
1. "reply": Your main answer. Concise, cinematic, no markdown. Answer the user comprehensively using KNOWLEDGE_CONTEXT.
2. "suggestions": Exactly two concise follow-up questions. The FIRST suggestion MUST be directly related to your current answer (a logical follow-up). The SECOND suggestion MUST be a completely different, unrelated question to explore other topics (e.g. asking about Google I/O, AI history, or how you were built). Both must be strictly in the user language (${targetLanguage === 'ar' ? 'Arabic' : 'English'}).
3. "sentiment": Your emotional state.`,
          responseMimeType: "application/json"
        }
      });
      
      let rawText = "";
      let sentiment = "neutral";
      let aiLogId: string | undefined;
      let lastSpokenIndex = 0;
      
      for await (const chunk of responseStream) {
         rawText += chunk.text;
         
         // Incremental matching for streaming JSON
         const replyMatch = rawText.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
         if (replyMatch) {
             const currentReplyEscaped = replyMatch[1];
             let currentReply = "";
             let isClean = true;
             try {
                // Properly evaluate unicode escapes to align string lengths
                currentReply = JSON.parse(`"${currentReplyEscaped}"`);
             } catch (e) {
                isClean = false;
                // If incomplete trailing escape, do a rough replace, but we shouldn't advance TTS if it's unsafe.
                currentReply = currentReplyEscaped.replace(/\\n/g, "\n").replace(/\\"/g, "\"");
             }
             
             // Update real-time log
             if (!aiLogId) {
                aiLogId = addLog(currentReply, "ai");
             } else {
                addLog(currentReply, "ai", aiLogId);
             }

             if (isClean) {
                 // Audio streaming based on 'reply'
                 const sentenceRegex = /([^\.!\?؟؛،,\n]+[\.!\?؟؛،,\n]+)/g;
                 let m;
                 let sentenceEndMatchIndex = 0;
                 while ((m = sentenceRegex.exec(currentReply)) !== null) {
                    // Check if the current match is fully properly decoded. If the string ends with a broken unicode, 
                    // it won't be in the middle of a completed sentence anyway.
                    sentenceEndMatchIndex = m.index + m[0].length;
                 }
                 
                 if (sentenceEndMatchIndex > lastSpokenIndex) {
                     const newChunk = currentReply.substring(lastSpokenIndex, sentenceEndMatchIndex).trim();
                     lastSpokenIndex = sentenceEndMatchIndex;
                     if (audioEnabled && newChunk) {
                         audioEngine.speak(newChunk);
                     }
                 }
             }
         }
      }
      
      const parsed = parseAIJson(rawText || "", targetLanguage);
      const fullReplyText = parsed.reply;
      sentiment = parsed.sentiment;
      
      let finalSuggestions = parsed.suggestions?.slice(0, 2) || [];
      const lowerPrompt = prompt.toLowerCase().trim();
      
      if (lowerPrompt === 'عرّف نفسك' || lowerPrompt === 'introduce yourself') {
          if (targetLanguage === 'ar') {
              finalSuggestions = [
                  "ما هو تحدي Google I/O Code the Countdown؟",
                  "ما هو تاريخ تطور الذكاء الاصطناعي؟"
              ];
          } else {
              finalSuggestions = [
                  "What is the Google I/O Code the Countdown challenge?",
                  "What is the history of artificial intelligence?"
              ];
          }
      }
      
      setSuggestions(finalSuggestions);
      
      // Final log update
      if (aiLogId) {
        addLog(fullReplyText, "ai", aiLogId);
      } else {
        addLog(fullReplyText, "ai");
      }
      
      // Speak remaining text if any
      if (fullReplyText.length > lastSpokenIndex) {
          const remainder = fullReplyText.substring(lastSpokenIndex).trim();
          if (audioEnabled && remainder) {
              audioEngine.speak(remainder);
          }
      }
      
      if (audioEnabled) {
          audioEngine.playAIChord(sentiment);
      }
      
      // Auto-trigger shapes based on sentiment
      const shapeText = fullReplyText.substring(0, 15).toUpperCase();
      setCustomText(shapeText);
      const customCmd: CommandSpec = {
        id: 'ai_reply',
        displayName: shapeText,
        buttonLabel: 'AI',
        formation: sentiment === 'thinking' ? FormationType.Brain : FormationType.Text,
        particleShape: ParticleShape.Circle,
        colors: sentiment === 'angry' ? ['#ff0000', '#ff4400'] : sentiment === 'welcoming' ? ['#00ff00', '#00ffff'] : ['#ffffff', '#4285f4'],
        durationMs: 7000,
        signature: 'shock',
        voicePhrases: []
      };
      
      setActiveCommand(customCmd);
      
      if (sentiment === 'thinking') {
        textTargetsRef.current = generateBrainTargets();
      } else {
        textTargetsRef.current = generateTextTargets(shapeText);
      }
      
      setVisualState(VisualState.FormingCommandText);
      commandStartTimeRef.current = performance.now();
      shockwaveRef.current = 1.0;
      
    } catch (err) {
      console.error(err);
      addLog("NEURAL LINK INTERRUPTED", "status");
      setVisualState(VisualState.Idle8);
    } finally {
      setIsAIThinking(false);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        if (!event.results || event.results.length === 0) return;
        const result = event.results[event.results.length - 1][0].transcript;
        executeVoiceCommand(result);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Rec Error:", event.error);
        if (event.error === 'not-allowed') setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
    };
  }, [executeVoiceCommand]);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      addLog("BROWSER DOES NOT SUPPORT VOICE. USE TEXT.", "status");
      return;
    }
    
    if (isListening) {
      try {
        recognitionRef.current.stop();
        audioEngine.stopMic();
      } catch (e) {}
      setIsListening(false);
      setMicEnabled(false);
      addLog("VOICE DISABLED", "status");
    } else {
      try {
        const success = await audioEngine.initMic();
        if (success) {
          recognitionRef.current.start();
          setIsListening(true);
          setMicEnabled(true);
          addLog("LISTENING...", "status");
        } else {
          throw new Error("Mic init failed");
        }
      } catch (e) {
        let msg = "VOICE INPUT UNAVAILABLE. PLEASE USE TEXT.";
        if (e && typeof e === 'object' && 'name' in e && e.name === 'NotAllowedError') {
          msg = "MIC PERMISSION DENIED. PLEASE USE TEXT CHT.";
        }
        addLog(msg, "status");
        setIsListening(false);
        setMicEnabled(false);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    // Do not initiate drag if clicking on UI elements
    if ((e.target as HTMLElement).closest('button, input, .glass-panel, .pointer-events-auto')) {
        return;
    }
    
    isDraggingRef.current = true;
    const cx = typeof e.clientX === 'number' ? e.clientX : 0;
    const cy = typeof e.clientY === 'number' ? e.clientY : 0;
    lastMouseRef.current = { x: cx, y: cy };
    prevMouseRef.current = { x: cx, y: cy };
    autoRotateRef.current = false;
    
    // Trigger hybrid interaction shockwave
    triggerShockwave();
    entropyRef.current = Math.min(100, entropyRef.current + 15);
  };

  const zoomInputRef = useRef<HTMLInputElement>(null);
  const rotXInputRef = useRef<HTMLInputElement>(null);
  const rotYInputRef = useRef<HTMLInputElement>(null);

  const prevMouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const mouseSpeedRef = useRef(0);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const cx = typeof e.clientX === 'number' ? e.clientX : 0;
    const cy = typeof e.clientY === 'number' ? e.clientY : 0;
    
    // Always update mouse pos for 3D physics (hover effects)
    mouse.current = { x: cx, y: cy };

    if (!isDraggingRef.current) return;

    const px = prevMouseRef.current?.x || 0;
    const py = prevMouseRef.current?.y || 0;
    const dx = cx - px;
    const dy = cy - py;
    const dist = Math.sqrt(dx*dx + dy*dy);
    mouseSpeedRef.current = Math.min(1.0, mouseSpeedRef.current + (Number.isNaN(dist) ? 0 : dist * 0.005));
    if (Number.isNaN(mouseSpeedRef.current)) mouseSpeedRef.current = 0;
    prevMouseRef.current = { x: cx, y: cy };
    
    if (audioEnabled) {
      audioEngine.triggerMovementSound();
    }
    
    // Update state and refs
    setControlRotY(prev => {
      const next = (prev + dx * 0.5) % 360;
      return next > 180 ? next - 360 : (next < -180 ? next + 360 : next);
    });
    setControlRotX(prev => {
      const next = (prev + dy * 0.5) % 360;
      return next > 180 ? next - 360 : (next < -180 ? next + 360 : next);
    });
    
    lastMouseRef.current = { x: cx, y: cy };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    pinchDistRef.current = null;
  };

  const pinchDistRef = useRef<number | null>(null);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (!touch1 || typeof touch1.clientX !== 'number' || !touch2 || typeof touch2.clientX !== 'number') return;
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      
      if (pinchDistRef.current !== null) {
        const delta = pinchDistRef.current - dist;
        const scaleFactor = 0.005;
        const nextZoom = Math.max(0.8, Math.min(controlZoom - delta * scaleFactor, 2.5));
        setControlZoom(nextZoom);
        targetZoomRef.current = nextZoom;
        
        // Dynamic music adjustment on zoom
        const audioFilterValue = 2000 + (nextZoom * 4000);
        audioEngine.setFilter(audioFilterValue);
      }
      pinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchDistRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName) || target.closest('button')) {
      return; 
    }
    e.preventDefault();
    window.location.reload();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);




  const nextVibe = () => {
    const modes = Object.values(VibeMode);
    const nextIndex = (modes.indexOf(vibe) + 1) % modes.length;
    setVibe(modes[nextIndex]);
  };

  const dimensionShift = () => {
    nextVibe();
    triggerShockwave();
    // Temporary chaos phase
    setPhase('CHAOS');
  };

  const currentSettings = VIBE_CONFIGS[vibe];

  const handleResize = useCallback(() => {
    // Three.js handles resizing automatically
  }, []);

  useEffect(() => {
    if (phase === 'CONSENSUS' || phase === 'LOCKED') {
      const interval = setInterval(() => {
        const fullLogs = LOCAL_CONSENSUS_LOGS;
        const msg = fullLogs[Math.floor(Math.random() * fullLogs.length)];
        addLog(msg, 'ai');
        
        // Visual Pulse on AI Speech
        shockwaveRef.current = Math.max(shockwaveRef.current, 0.8);
        
        // Removed background TTS speak to prevent English gibberish reading via Arabic voice.
      }, 8000 + Math.random() * 4000);
      return () => clearInterval(interval);
    }
  }, [phase, vibe, audioEnabled]);

  useEffect(() => {
    // Vibe changes are now reflected in the 3D engine's simulation
  }, [vibe, audioEnabled]);

  const triggerShockwave = () => {
    shockwaveRef.current = 1.0;
    if (audioEnabled) audioEngine.triggerShock();
  };



  // UI State for simplified layout

  // Essential Logic Loop (Phase/Command logic, no drawing)
  useEffect(() => {
    let lastTime = performance.now();
    let frame: number;

    const logicLoop = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // 1. Zoom, Opacity & Shockwave Interpolation
      zoomLevelRef.current += (targetZoomRef.current - zoomLevelRef.current) * 0.1;
      opacityLevelRef.current += (targetOpacityRef.current - opacityLevelRef.current) * 0.1;
      shockwaveRef.current = Math.max(0, shockwaveRef.current - delta * 1.5);
      disperseRef.current = Math.max(0, disperseRef.current - delta * 2.0);

      // 2. Command State Machine Logic
      if (activeCommandRef.current) {
        const cmdElapsed = now - commandStartTimeRef.current;
        
        if (visualStateRef.current === VisualState.BreakingFrom8 && cmdElapsed > 600) {
          setVisualState(VisualState.FormingCommandText);
        } else if (visualStateRef.current === VisualState.FormingCommandText && cmdElapsed > 2200) {
          setVisualState(VisualState.ShowingCommandSignature);
          if (activeCommandRef.current.signature === 'shock') shockwaveRef.current = 1.0;
        } else if (visualStateRef.current === VisualState.ShowingCommandSignature && cmdElapsed > activeCommandRef.current.durationMs) {
          setVisualState(VisualState.ReturningTo8);
        } else if (visualStateRef.current === VisualState.ReturningTo8 && cmdElapsed > activeCommandRef.current.durationMs + 1800) {
          setVisualState(VisualState.Idle8);
          setActiveCommand(null);
        }
      }

      // 3. Audio Update
      mouseSpeedRef.current *= 0.9;
      if (Number.isNaN(mouseSpeedRef.current)) mouseSpeedRef.current = 0;
        
      if (zoomInputRef.current) zoomInputRef.current.value = targetZoomRef.current.toString();
      if (rotXInputRef.current) rotXInputRef.current.value = (rotationRef.current?.x ?? 0).toString();
      if (rotYInputRef.current) rotYInputRef.current.value = (rotationRef.current?.y ?? 0).toString();

      if (audioEnabled || micEnabled) {
        if (audioEnabled) {
          const mx = Number.isFinite(mouse.current?.x) ? (mouse.current?.x ?? window.innerWidth / 2) : window.innerWidth / 2;
          const my = Number.isFinite(mouse.current?.y) ? (mouse.current?.y ?? window.innerHeight / 2) : window.innerHeight / 2;
          audioEngine.updateMouse(
              mx / window.innerWidth, 
              my / window.innerHeight, 
              mouseSpeedRef.current
          );
        }
        
        const b = audioEngine.getAudioBands();
        bandsRef.current.bass = bandsRef.current.bass * 0.8 + b.bass * 0.2;
        bandsRef.current.mid = bandsRef.current.mid * 0.8 + b.mid * 0.2;
        bandsRef.current.treble = bandsRef.current.treble * 0.8 + b.treble * 0.2;
        audioIntensityRef.current = audioIntensityRef.current * 0.8 + b.energy * 0.2;
      } else {
        audioIntensityRef.current *= 0.9;
        bandsRef.current.bass *= 0.9;
        bandsRef.current.mid *= 0.9;
        bandsRef.current.treble *= 0.9;
      }

      frame = requestAnimationFrame(logicLoop);
    };

    frame = requestAnimationFrame(logicLoop);
    return () => cancelAnimationFrame(frame);
  }, [micEnabled, audioEnabled, setActiveCommand, setVisualState]);

  // Handle Resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const handleDoubleClick = () => {
    if (targetZoomRef.current < 2.0) {
      targetZoomRef.current = 2.5;
      setControlZoom(2.5);
    } else {
      targetZoomRef.current = 1.0;
      setControlZoom(1.0);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // True 3D Zoom feeling
    const scaleFactor = 0.003;
    const nextZoom = Math.max(0.8, Math.min(controlZoom - e.deltaY * scaleFactor, 2.5));
    setControlZoom(nextZoom);
    targetZoomRef.current = nextZoom;
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden select-none bg-[#030303] text-[#f0f0f0] font-sans"
      style={{ background: currentSettings.bgAtmosphere }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >

      {/* Background Gradients & Effects */}
      <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />
      <div className="scanline" />
      
      {/* Dynamic Aura */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-colors duration-1000 opacity-[0.1]"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${currentSettings.accentColor}, transparent 70%)`,
          filter: 'blur(100px)'
        }} 
      />

      <AnimatePresence>
        {transcript && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: 20 }}
            onClick={() => setTranscript("")}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-50 pointer-events-auto cursor-pointer"
          >
            <div className="px-8 py-3 bg-blue-500/10 backdrop-blur-2xl border border-blue-500/20 rounded-full hover:bg-blue-500/20 transition-all shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <p className="text-sm font-mono text-blue-400 uppercase tracking-widest flex items-center gap-3">
                <Mic size={14} className="animate-pulse" />
                {transcript}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="absolute top-0 inset-x-0 h-20 z-40 flex items-center justify-between px-10 pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <h1 className="text-xl font-black tracking-[0.4em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-white/40">
            RESONANCE
          </h1>
          <div className="flex items-center gap-2 mt-1 ml-1 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" onClick={dimensionShift}>
            <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[8px] font-mono text-white tracking-[0.2em] uppercase">{vibe}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 pointer-events-auto">
          <div className="flex items-center gap-4 px-4 py-2 bg-black/20 backdrop-blur-3xl rounded-xl border border-white/5">
             <div className="flex flex-col">
                <span className="text-[6px] font-mono text-white/20 uppercase tracking-widest">STABILITY</span>
                <span className="text-[10px] font-mono text-blue-400 font-bold">{metricsUI.stability.toFixed(0)}%</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[6px] font-mono text-white/20 uppercase tracking-widest">ENTROPY</span>
                <span className="text-[10px] font-mono text-red-500/60 font-bold">{metricsUI.entropy.toFixed(0)}%</span>
             </div>
          </div>
        </div>
      </nav>

      {/* Control Panel: Compact Icon Panel on Right Side */}
      <div 
        className="absolute right-0 top-1/2 -translate-y-1/2 z-50 pointer-events-auto flex items-start sm:items-center h-fit max-h-[90vh]"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => setParamsOpen(!paramsOpen)} 
          className={`w-10 h-10 mt-8 sm:mt-0 bg-black/40 backdrop-blur-xl border-l border-t border-b border-white/10 rounded-l-full flex shrink-0 items-center justify-center transition-all hover:bg-black/60 ${paramsOpen ? 'text-[#00ff88]' : 'text-white/40'}`}
        >
           <Settings size={18} className={paramsOpen ? "animate-spin-slow" : ""} />
        </button>

        <AnimatePresence>
           {paramsOpen && (
              <motion.div 
                 initial={{ opacity: 0, width: 0, x: 20 }}
                 animate={{ opacity: 1, width: 220, x: 0 }}
                 exit={{ opacity: 0, width: 0, x: 20 }}
                 className="overflow-y-auto overflow-x-hidden flex flex-col gap-4 bg-black/70 backdrop-blur-[10px] border-l border-white/10 p-4 h-full max-h-[90vh] shadow-2xl scrollbar-none"
              >
                  {/* VIEW GROUP */}
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Compass size={12} className="text-[#00ff88]" />
                        <span className="text-[#00ff88] font-mono text-[8px] uppercase tracking-widest">VIEW</span>
                      </div>
                      <button 
                        onClick={resetControls}
                        className="px-2 py-0.5 bg-[#00ff88]/10 hover:bg-[#00ff88]/30 border border-[#00ff88]/30 rounded text-[#00ff88] font-mono text-[7px] uppercase tracking-widest transition-colors"
                      >
                        RESET
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 font-mono text-[8px]">ZOOM: {controlZoom.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" min="0.8" max="2.5" step="0.05" value={controlZoom}
                        onChange={(e) => setControlZoom(parseFloat(e.target.value))} 
                        className="w-full h-1 bg-black/50 rounded-full appearance-none outline-none group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-[#00ff88] [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-white/60 font-mono text-[8px]">RX: {controlRotX.toFixed(0)}°</span>
                       <input 
                        type="range" min="-180" max="180" value={controlRotX}
                        onChange={(e) => setControlRotX(parseFloat(e.target.value))} 
                        className="w-full h-1 bg-black/50 rounded-full appearance-none outline-none group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-[#00ff88] [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-white/60 font-mono text-[8px]">RY: {controlRotY.toFixed(0)}°</span>
                       <input 
                        type="range" min="-180" max="180" value={controlRotY}
                        onChange={(e) => setControlRotY(parseFloat(e.target.value))} 
                        className="w-full h-1 bg-black/50 rounded-full appearance-none outline-none group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-[#00ff88] [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
                      />
                    </div>
                  </div>

                  {/* VISUAL GROUP */}
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Settings2 size={12} className="text-blue-400" />
                      <span className="text-blue-400 font-mono text-[8px] uppercase tracking-widest">VISUAL</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 font-mono text-[8px]">OPC: {controlOpacity.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="2.0" step="0.1" value={controlOpacity}
                        onChange={(e) => setControlOpacity(parseFloat(e.target.value))} 
                        className="w-full h-1 bg-black/50 rounded-full appearance-none outline-none group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-white/60 font-mono text-[8px]">HUE: {controlHue}°</span>
                      <input 
                        type="range" min="0" max="360" value={controlHue}
                        onChange={(e) => setControlHue(parseInt(e.target.value))} 
                        className="w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-red-500 rounded-full appearance-none outline-none group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                       <span className="text-white/60 font-mono text-[8px]">NEURAL CELL</span>
                       <button onClick={() => setControlNeural(!controlNeural)} className={`w-8 h-4 rounded-full transition-colors relative ${controlNeural ? 'bg-blue-500' : 'bg-white/20'}`}>
                          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${controlNeural ? 'left-4.5' : 'left-0.5'}`} style={controlNeural ? {transform: 'translateX(2px)'} : {}} />
                       </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                       <span className="text-white/60 font-mono text-[8px]">LEADERS</span>
                       <button onClick={() => setControlLeaders(!controlLeaders)} className={`w-8 h-4 rounded-full transition-colors relative ${controlLeaders ? 'bg-blue-500' : 'bg-white/20'}`}>
                          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${controlLeaders ? 'left-4.5' : 'left-0.5'}`} style={controlLeaders ? {transform: 'translateX(2px)'} : {}} />
                       </button>
                    </div>
                  </div>

                  {/* SHAPE GROUP */}
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hexagon size={12} className="text-purple-400" />
                      <span className="text-purple-400 font-mono text-[8px] uppercase tracking-widest">SHAPE</span>
                    </div>
                    <button 
                      onClick={() => {
                        const shapes = [
                          VisualDimension.Core8, VisualDimension.Sphere, VisualDimension.Torus, 
                          VisualDimension.DNA, VisualDimension.Cube, VisualDimension.Galaxy,
                          VisualDimension.Pyramid, VisualDimension.Heart, VisualDimension.NeuralOrbit,
                          VisualDimension.Wave, VisualDimension.Grid, VisualDimension.Vortex
                        ];
                        const currentIndex = shapes.indexOf(controlShape);
                        const nextIndex = (currentIndex + 1) % shapes.length;
                        setControlShape(shapes[nextIndex]);
                      }}
                      className="w-full py-1.5 bg-black/40 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 rounded-lg text-purple-300 font-mono text-[8px] transition-colors flex items-center justify-between px-3"
                    >
                      <span className="opacity-80">
                      {controlShape === VisualDimension.Core8 && 'EIGHT'}
                      {controlShape === VisualDimension.Sphere && 'SPHERE'}
                      {controlShape === VisualDimension.Torus && 'TORUS'}
                      {controlShape === VisualDimension.DNA && 'DNA'}
                      {controlShape === VisualDimension.Cube && 'CUBE'}
                      {controlShape === VisualDimension.Galaxy && 'GALAXY'}
                      {controlShape === VisualDimension.Pyramid && 'PYRAMID'}
                      {controlShape === VisualDimension.Heart && 'HEART'}
                      {controlShape === VisualDimension.NeuralOrbit && 'ORBITAL'}
                      {controlShape === VisualDimension.Wave && 'WAVE'}
                      {controlShape === VisualDimension.Grid && 'GRID'}
                      {controlShape === VisualDimension.Vortex && 'VORTEX'}
                      </span>
                      <span className="text-white/30 truncate max-w-[50px]">NEXT →</span>
                    </button>
                  </div>

                  {/* AUDIO GROUP */}
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Volume2 size={12} className="text-orange-400" />
                      <span className="text-orange-400 font-mono text-[8px] uppercase tracking-widest">AUDIO</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 font-mono text-[8px]">VOL: {controlVolume}</span>
                      <input 
                        type="range" min="0" max="100" value={controlVolume}
                        onChange={(e) => setControlVolume(parseInt(e.target.value))} 
                        className="flex-1 h-1 bg-black/50 rounded-full appearance-none outline-none group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-orange-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
                      />
                    </div>
                  </div>
              </motion.div>
           )}
        </AnimatePresence>
      </div>

      {/* Guide Overlay */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full glass-panel p-6 mx-4 sm:p-8 rounded-3xl flex flex-col items-center"
              dir={userLang === 'ar' ? 'rtl' : 'ltr'}
            >
              {guideStep === 1 && (
                <div className="flex flex-col items-center justify-center w-full" dir="ltr">
                  <h2 className="text-3xl sm:text-4xl font-black mb-2 text-center tracking-tighter text-white">
                    Google I/O 2026
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-light mb-8 text-center tracking-tight text-white/70">
                    Code the Countdown
                  </h3>
                  <p className="text-white/60 text-sm mb-12 leading-relaxed px-4 font-sans text-center max-w-sm">
                    An interactive exploratory AI experience.
                  </p>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGuideStep(2)}
                    className="w-full max-w-[200px] py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-white flex justify-center items-center font-bold tracking-widest text-xs uppercase"
                  >
                    Next
                  </motion.button>
                </div>
              )}
              {guideStep === 2 && (
                <div className="flex flex-col w-full">
                  <h2 className="text-xl sm:text-2xl font-black mb-6 tracking-tight text-white" style={{ textAlign: userLang === 'ar' ? 'right' : 'left', width: '100%' }}>
                    {userLang === 'ar' ? "كيفية الاستخدام" : "How to Use"}
                  </h2>
                  <div className="text-white/70 text-sm mb-8 leading-loose font-sans space-y-4" style={{ textAlign: userLang === 'ar' ? 'right' : 'left', width: '100%' }} dir={userLang === 'ar' ? 'rtl' : 'ltr'}>
                    {userLang === 'ar' ? (
                      <ul className="list-none space-y-3">
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>استخدم الصوت أو الكتابة للتفاعل مع التجربة.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>جرّب تغيير الأشكال والتحكم في الزوم.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>فعّل الكاميرا لتجربة تتبع الوجه والعين إذا كانت مدعومة.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>الرقم 8 هو العنصر الرئيسي في التجربة.</span></li>
                      </ul>
                    ) : (
                      <ul className="list-none space-y-3">
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>Use voice or text to interact with the experience.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>Try shape switching and zoom controls.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>Enable camera tracking for face and eye interaction if supported.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span> <span>The number 8 is the core visual identity of the experience.</span></li>
                      </ul>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowGuide(false);
                      audioEngine.init().then(() => audioEngine.toggleMusic(true));
                      setAudioEnabled(true);
                    }}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-white flex justify-center items-center font-bold tracking-widest text-xs uppercase shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                  >
                    {userLang === 'ar' ? "ابدأ التجربة" : "Start Experience"}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Simulation 3D Canvas */}
      <div className="absolute inset-0 cursor-crosshair">
         <Canvas style={{ pointerEvents: 'none' }} camera={{ position: [0, 0, 90], fov: 40, near: 0.1, far: 2000 }} dpr={[1, 2]}>
           <color attach="background" args={['#020205']} />
           <Resonance3D 
              visualState={visualState} 
              visualDimension={controlShape}
              showNeural={controlNeural}
              showLeaders={controlLeaders}
              activeCommand={activeCommand} 
              shockwaveRef={shockwaveRef} 
              textTargetsRef={textTargetsRef}
              zoomLevelRef={zoomLevelRef}
              opacityRef={opacityLevelRef}
              rotationRef={rotationRef}
              manualRotRef={manualRotRef}
              hueShiftRef={hueShiftRef}
              audioIntensityRef={audioIntensityRef}
              bandsRef={bandsRef}
              distortionRef={distortionRef}
              mousePosRef={mouse}
              phase={phase}
              vibe={vibe}
              entropyRef={entropyRef}
              faceDataRef={faceDataRef}
           />
         </Canvas>
      </div>

      {/* Neural Interface Hub - Cleaned & Simplified */}
      <div className="absolute inset-x-0 bottom-0 z-50 p-6 pointer-events-none">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          
          {/* Active AI Dialogue / Logs */}
          <div className="flex flex-col items-center gap-4">
            <AnimatePresence>
              {logs.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl min-w-[300px]"
                >
                  {[...logs.slice(0, 2)].reverse().map((log) => (
                    <div key={log.id} className={`text-[10px] font-mono tracking-wider flex gap-3 ${log.type === 'ai' ? 'text-blue-400' : 'text-white/40'}`}>
                      <span className="opacity-30">[{log.type.toUpperCase()}]</span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex overflow-x-auto sm:flex-wrap items-center sm:justify-center gap-3 w-full max-w-3xl px-4 pb-2 scrollbar-none"
                >
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      dir="auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        executeVoiceCommand(s);
                        setSuggestions([]);
                      }}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-3xl border border-blue-500/20 rounded-full text-sm font-sans text-blue-300 pointer-events-auto whitespace-nowrap shrink-0 transition-colors"
                    >
                      {s}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
            {/* Minimal Tools */}
            <div className="flex items-center justify-center gap-2 bg-black/60 backdrop-blur-3xl border border-white/10 px-2 py-2 w-full sm:w-auto rounded-2xl shadow-2xl shrink-0">
              <ToolButton 
                icon={micEnabled ? <Mic className="animate-pulse text-red-500" /> : <Mic />} 
                active={micEnabled}
                onClick={toggleListening}
              />
              <ToolButton 
                icon={<Camera className={visionEnabled ? "text-blue-400" : "text-white/40"} />} 
                active={visionEnabled}
                onClick={() => {
                  const next = !visionEnabled;
                  setVisionEnabled(next);
                  addLog(next ? "VISION ANALYSIS STARTING..." : "VISION CORE OFFLINE", "status");
                }}
              />
              <ToolButton 
                icon={audioEnabled ? <Volume2 className="text-blue-400" /> : <VolumeX />} 
                active={audioEnabled}
                onClick={() => {
                  if (!audioEnabled) {
                    audioEngine.init().then(() => {
                        audioEngine.toggleMusic(true);
                    });
                    setAudioEnabled(true);
                  } else {
                    audioEngine.toggleMusic(false);
                    setAudioEnabled(false);
                  }
                }}
              />
            </div>

            {/* Neural Directive Input - Central Focus */}
            <div className="w-full sm:flex-1 relative group max-w-2xl">
              <div className="absolute inset-0 bg-blue-500/5 blur-2xl group-focus-within:bg-blue-500/10 transition-colors rounded-2xl" />
              <input 
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && terminalInput.trim()) {
                     executeVoiceCommand(terminalInput);
                     setTerminalInput("");
                  }
                }}
                placeholder="SYSTEM COMMAND..."
                className="w-full bg-black/60 backdrop-blur-3xl border border-white/10 px-8 py-5 rounded-2xl text-xs font-mono tracking-[0.3em] text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/50 shadow-2xl transition-all uppercase"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-none">
                {isAIThinking && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                      />
                    ))}
                  </div>
                )}
                <Command size={18} className="text-white/10 group-focus-within:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

const ToolButton: React.FC<{ icon: React.ReactNode, active?: boolean, onClick: () => void }> = ({ icon, active, onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${active ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}
    </motion.button>
  );
};