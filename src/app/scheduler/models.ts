export type DriverStatus = 'active' | 'break' | 'offline';
export type ShiftType = 'work' | 'break' | 'standby';
export type AssignmentTaskType = 'boarding' | 'transfer' | 'crew_transport';

export interface Driver {
  id: string;
  name: string;
  index: number;
  status: DriverStatus;
}

export interface Shift {
  id: string;
  driverId: string;
  startTime: number; // epoch ms
  endTime: number; // epoch ms
  type: ShiftType;
}

export interface Assignment {
  id: string;
  shiftId: string;
  taskType: AssignmentTaskType;
  priority: 1 | 2 | 3;
  status: 'planned' | 'in_progress' | 'done' | 'blocked';
}

export interface SchedulerViewport {
  timeStart: number;
  timeEnd: number;
  rowStart: number;
  rowEnd: number;
  pxPerMs: number;
  rowHeight: number;
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface ShiftPatch {
  id: string;
  driverId?: string;
  startTime?: number;
  endTime?: number;
  type?: ShiftType;
}

export interface SchedulerDelta {
  upsertDrivers?: Driver[];
  removeDriverIds?: string[];
  upsertShifts?: Shift[];
  patchShifts?: ShiftPatch[];
  removeShiftIds?: string[];
  upsertAssignments?: Assignment[];
  removeAssignmentIds?: string[];
}

export interface VisibleShift {
  shift: Shift;
  x: number;
  y: number;
  width: number;
  height: number;
}
