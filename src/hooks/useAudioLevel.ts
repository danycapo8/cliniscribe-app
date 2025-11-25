// src/hooks/useAudioLevel.ts
import { useEffect, useState, useRef } from 'react';

export const useAudioLevel = (isRecording: boolean) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      return;
    }

    const initAudio = async () => {
      try {
        // Solicitamos acceso al micrófono para medir el volumen
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        analyser.fftSize = 64; // Tamaño pequeño para bajo consumo de CPU
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        const updateLevel = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // Calcular el volumen promedio
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          
          // Ajustamos la sensibilidad visual (multiplicador) para que la barra se mueva bien
          setAudioLevel(Math.min(100, average * 2.5));
          
          rafIdRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();

      } catch (err) {
        console.error("Error iniciando el visualizador de audio:", err);
      }
    };

    initAudio();

    // Limpieza al dejar de grabar para liberar memoria y apagar el micrófono
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  return audioLevel;
};