import { Driver, SchedulerViewport, Shift, VisibleShift } from '../models';

export class VirtualizationEngine {
  computeVisibleDriverIds(drivers: Driver[], viewport: SchedulerViewport): string[] {
    const sorted = [...drivers].sort((a, b) => a.index - b.index);
    const overscan = 5;
    const from = Math.max(0, viewport.rowStart - overscan);
    const to = Math.min(sorted.length, viewport.rowEnd + overscan);

    return sorted.slice(from, to).map((d) => d.id);
  }

  computeVisibleShifts(
    shifts: Shift[],
    driverIndexById: Map<string, number>,
    viewport: SchedulerViewport,
  ): VisibleShift[] {
    const visible: VisibleShift[] = [];
    const overscanMs = (viewport.timeEnd - viewport.timeStart) * 0.1;
    const fromTime = viewport.timeStart - overscanMs;
    const toTime = viewport.timeEnd + overscanMs;

    for (const shift of shifts) {
      const row = driverIndexById.get(shift.driverId);
      if (row == null) continue;
      if (row < viewport.rowStart - 5 || row > viewport.rowEnd + 5) continue;
      if (shift.endTime < fromTime || shift.startTime > toTime) continue;

      const x = (shift.startTime - viewport.timeStart) * viewport.pxPerMs;
      const width = Math.max(2, (shift.endTime - shift.startTime) * viewport.pxPerMs);
      const y = (row - viewport.rowStart) * viewport.rowHeight;
      const height = viewport.rowHeight - 4;

      visible.push({ shift, x, y, width, height });
    }

    return visible;
  }
}
