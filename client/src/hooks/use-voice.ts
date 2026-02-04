import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { voiceApi, ocrApi } from "@shared/routes";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        resolve(blob);

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.stop();
      setIsRecording(false);
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}

export function useTranscribe() {
  return useMutation<{ text: string }, Error, Blob>({
    mutationFn: async (audioBlob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch(voiceApi.transcribe.path, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to transcribe audio");
      }

      return res.json();
    },
  });
}

export function useSynthesize() {
  return useMutation<Blob, Error, string>({
    mutationFn: async (text) => {
      const res = await fetch(voiceApi.synthesize.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to synthesize speech");
      }

      return res.blob();
    },
  });
}

export function useOCR() {
  return useMutation<{ text: string; labs?: Record<string, any>; structured: boolean }, Error, File>({
    mutationFn: async (imageFile) => {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch(ocrApi.analyze.path, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to analyze image");
      }

      return res.json();
    },
  });
}

// Custom hook for voice recording + transcription combined
export function useVoiceInput() {
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const transcribe = useTranscribe();

  const recordAndTranscribe = useCallback(async () => {
    if (isRecording) {
      const blob = await stopRecording();
      const result = await transcribe.mutateAsync(blob);
      return result.text;
    } else {
      await startRecording();
      return null;
    }
  }, [isRecording, startRecording, stopRecording, transcribe]);

  return {
    isRecording,
    isTranscribing: transcribe.isPending,
    startRecording,
    stopRecording,
    recordAndTranscribe,
    transcribedText: transcribe.data?.text,
  };
}
