export interface AudioDevice {
  id: string;
  name: string;
}

/**
 * Recorded audio lives in memory only: blobs are far too large for
 * localStorage, so playback is available until the page is reloaded.
 */
const recordings = new Map<string, string>();

export function setRecording(meetingId: string, blob: Blob): string {
  const previous = recordings.get(meetingId);
  if (previous) URL.revokeObjectURL(previous);

  const url = URL.createObjectURL(blob);
  recordings.set(meetingId, url);
  return url;
}

export function getRecording(meetingId: string): string | undefined {
  return recordings.get(meetingId);
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Web Audio graph used only to read the live input level for the waveform.
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sampleBuffer: Uint8Array<ArrayBuffer> | null = null;

  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ id: d.deviceId, name: d.label || 'Unknown Microphone' }));
    } catch (e) {
      console.error('Failed to get audio devices', e);
      return [];
    }
  }

  async startRecording(deviceId?: string): Promise<void> {
    this.audioChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      });

      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.setupAnalyser(stream);
      this.mediaRecorder.start();
    } catch (e) {
      console.error('Failed to start recording', e);
      throw e;
    }
  }

  private setupAnalyser(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      this.sampleBuffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    } catch (e) {
      console.error('Failed to set up audio analyser', e);
      this.analyser = null;
    }
  }

  private teardownAnalyser(): void {
    this.analyser = null;
    this.sampleBuffer = null;
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
  }

  /** Current mic loudness as a 0..100 value (RMS of the time-domain signal). */
  getLevel(): number {
    if (!this.analyser || !this.sampleBuffer) return 0;
    this.analyser.getByteTimeDomainData(this.sampleBuffer);
    let sumSquares = 0;
    for (let i = 0; i < this.sampleBuffer.length; i++) {
      const v = (this.sampleBuffer[i] - 128) / 128; // -1..1
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / this.sampleBuffer.length);
    // Boost so normal speech fills the bars; clamp to 0..100.
    return Math.min(100, rms * 320);
  }

  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recorder'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.audioChunks = [];
        this.teardownAnalyser();
        resolve(blob);
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    });
  }
}

export const audioService = new AudioRecordingService();
