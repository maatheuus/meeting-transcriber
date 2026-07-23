import { ipcMain } from 'electron';
import type { SegmentInput } from '../services/segmentsService';
import * as segmentsService from '../services/segmentsService';

function requireMeetingId(value: unknown, channel: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${channel} needs a meeting id`);
  return value;
}

function requireSegmentId(value: unknown, channel: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${channel} needs a segment id`);
  }
  return value;
}

export function registerSegmentsIpc(): void {
  ipcMain.handle('segments:list', (_e, meetingId: unknown) =>
    segmentsService.list(requireMeetingId(meetingId, 'segments:list')),
  );

  ipcMain.handle('segments:append', (_e, meetingId: unknown, segments: unknown) => {
    if (!Array.isArray(segments)) throw new Error('segments:append needs an array of segments');
    return segmentsService.append(
      requireMeetingId(meetingId, 'segments:append'),
      segments as SegmentInput[],
    );
  });

  ipcMain.handle('segments:insert', (_e, meetingId: unknown, segment: unknown) => {
    if (!segment || typeof segment !== 'object') throw new Error('segments:insert needs a segment');
    return segmentsService.insert(
      requireMeetingId(meetingId, 'segments:insert'),
      segment as SegmentInput,
    );
  });

  ipcMain.handle('segments:update', (_e, id: unknown, patch: unknown) => {
    if (!patch || typeof patch !== 'object') throw new Error('segments:update needs a patch');
    return segmentsService.update(requireSegmentId(id, 'segments:update'), patch as SegmentInput);
  });

  ipcMain.handle('segments:delete', (_e, id: unknown) => {
    segmentsService.remove(requireSegmentId(id, 'segments:delete'));
  });

  ipcMain.handle(
    'segments:rename-speaker',
    (_e, meetingId: unknown, from: unknown, to: unknown) => {
      if (typeof from !== 'string' || typeof to !== 'string') {
        throw new Error('segments:rename-speaker needs both speaker labels');
      }
      segmentsService.renameSpeaker(
        requireMeetingId(meetingId, 'segments:rename-speaker'),
        from,
        to,
      );
    },
  );

  ipcMain.handle('segments:known-speakers', (_e, meetingId: unknown) =>
    segmentsService.knownSpeakers(requireMeetingId(meetingId, 'segments:known-speakers')),
  );
}
