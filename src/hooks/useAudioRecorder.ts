// src/hooks/useAudioRecorder.ts
import { useState, useRef, useCallback } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioBase64: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

export const useAudioRecorder = (): AudioRecorderState => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // ARQUITECTO: Configuración crítica para Vercel Free Tier (Límite 4.5MB)
      // Usamos 16kbps (16000 bits/seg) mono.
      // Calidad suficiente para voz, peso mínimo.
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000, 
      };

      // Fallback si el navegador no soporta codecs específicos
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          console.warn("Codec Opus 16kbps no soportado, usando default.");
          delete options.mimeType;
          delete options.audioBitsPerSecond; 
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Al detener, creamos el Blob final
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        console.log(`🎙️ Audio finalizado. Tamaño: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Convertir a Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setAudioBase64(base64String.split(',')[1]); 
        };

        // Apagar tracks del micrófono para liberar hardware
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Grabar en chunks de 1 segundo
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error micrófono:", err);
      alert("No se pudo acceder al micrófono.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
      }
    }
  }, []);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioBase64(null);
    setRecordingTime(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    recordingTime,
    audioBlob,
    audioBase64,
    startRecording,
    stopRecording,
    resetRecording
  };
};