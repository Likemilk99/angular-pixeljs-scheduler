import { SchedulerViewport } from '../models';

export class ViewportEngine {
  private readonly minPxPerMs = 0.00001;
  private readonly maxPxPerMs = 0.002;

  createInitial(width: number, height: number, now: number): SchedulerViewport {
    return {
      timeStart: now,
      timeEnd: now + 2 * 60 * 60 * 1000,
      rowStart: 0,
      rowEnd: Math.floor(height / 28),
      pxPerMs: 0.00006,
      rowHeight: 28,
      scrollX: 0,
      scrollY: 0,
      width,
      height,
    };
  }

  pan(v: SchedulerViewport, dx: number, dy: number): SchedulerViewport {
    const timeShiftMs = -dx / v.pxPerMs;
    const rowShift = Math.trunc(dy / v.rowHeight);

    return {
      ...v,
      timeStart: v.timeStart + timeShiftMs,
      timeEnd: v.timeEnd + timeShiftMs,
      rowStart: Math.max(0, v.rowStart + rowShift),
      rowEnd: Math.max(v.rowStart + 1, v.rowEnd + rowShift),
      scrollX: v.scrollX + dx,
      scrollY: Math.max(0, v.scrollY + dy),
    };
  }

  zoom(v: SchedulerViewport, anchorX: number, zoomFactor: number): SchedulerViewport {
    const nextPxPerMs = this.clamp(v.pxPerMs * zoomFactor, this.minPxPerMs, this.maxPxPerMs);
    const anchorTime = v.timeStart + anchorX / v.pxPerMs;
    const nextTimeStart = anchorTime - anchorX / nextPxPerMs;
    const spanMs = v.width / nextPxPerMs;

    return {
      ...v,
      pxPerMs: nextPxPerMs,
      timeStart: nextTimeStart,
      timeEnd: nextTimeStart + spanMs,
    };
  }

  resize(v: SchedulerViewport, width: number, height: number): SchedulerViewport {
    const spanMs = width / v.pxPerMs;

    return {
      ...v,
      width,
      height,
      timeEnd: v.timeStart + spanMs,
      rowEnd: v.rowStart + Math.ceil(height / v.rowHeight),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
