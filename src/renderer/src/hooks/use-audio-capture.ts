import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export function useAudioCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [streams, setStreams] = useState<MediaStream[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const hasMicAccess = await window.api.requestMicrophonePermission();
      if (!hasMicAccess) {
        toast.error('Microphone access denied. Please grant permission in System Settings.');
        return;
      }

      const sources = await window.api.getDesktopSources({ types: ['window', 'screen'] });

      const primaryScreen = sources.find((s: any) => s.id.startsWith('screen')) || sources[0];

      const systemStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primaryScreen.id,
          },
        } as any,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primaryScreen.id,
          },
        } as any,
      });

      systemStream.getVideoTracks().forEach((track) => track.stop());

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      setStreams([systemStream, micStream]);
      setIsRecording(true);
      toast.success('Started capturing microphone and system audio!');

      // TODO: Pipe these streams to MediaRecorder and then to the transcription service
    } catch (err: any) {
      console.error('Error starting audio capture:', err);
      toast.error(`Failed to start recording: ${err.message}`);
    }
  }, []);

  const stopRecording = useCallback(() => {
    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    setStreams([]);
    setIsRecording(false);
    toast.info('Recording stopped.');
  }, [streams]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
