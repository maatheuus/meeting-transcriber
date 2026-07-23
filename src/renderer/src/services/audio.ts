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

  // Monotonic recording clock: total RECORDED time for the current session,
  // excluding any paused intervals. `runStart` is the timestamp of the current
  // running span (0 while paused/stopped); `bankedMs` accumulates time from the
  // spans already finished (each pause banks the elapsed span).
  private runStart = 0;
  private bankedMs = 0;

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
    this.bankedMs = 0;
    this.runStart = 0;
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
      this.runStart = performance.now();
    } catch (e) {
      console.error('Failed to start recording', e);
      throw e;
    }
  }

  /** Total recorded time (ms) of the current session, excluding paused spans. */
  getElapsedMs(): number {
    return this.bankedMs + (this.runStart ? performance.now() - this.runStart : 0);
  }

  /** MediaRecorder's actual output mime type (e.g. "audio/webm;codecs=opus"). */
  getMimeType(): string {
    return this.mediaRecorder?.mimeType || 'audio/webm';
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
      // Bank the running span and stop the clock so paused time is excluded.
      if (this.runStart) {
        this.bankedMs += performance.now() - this.runStart;
        this.runStart = 0;
      }
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.runStart = performance.now();
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recorder'));
        return;
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm;codecs=opus';

      this.mediaRecorder.onstop = () => {
        // Freeze the recording clock so getElapsedMs() reflects the final length.
        if (this.runStart) {
          this.bankedMs += performance.now() - this.runStart;
          this.runStart = 0;
        }
        const blob = new Blob(this.audioChunks, { type: mimeType });
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
