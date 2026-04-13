import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, animationFrameScheduler, auditTime, map, observeOn } from 'rxjs';
import {
  Assignment,
  Driver,
  SchedulerDelta,
  SchedulerViewport,
  Shift,
} from '../models';

export interface SchedulerState {
  driversById: Map<string, Driver>;
  shiftsById: Map<string, Shift>;
  assignmentsById: Map<string, Assignment>;
  driverShiftIndex: Map<string, Set<string>>;
  viewport: SchedulerViewport;
  selectedShiftId: string | null;
  hoveredShiftId: string | null;
}

const EMPTY_VIEWPORT: SchedulerViewport = {
  timeStart: Date.now(),
  timeEnd: Date.now() + 60 * 60 * 1000,
  rowStart: 0,
  rowEnd: 20,
  pxPerMs: 0.00005,
  rowHeight: 28,
  scrollX: 0,
  scrollY: 0,
  width: 1280,
  height: 720,
};

@Injectable({ providedIn: 'root' })
export class SchedulerStore {
  private readonly delta$ = new Subject<SchedulerDelta>();

  private readonly stateSubject = new BehaviorSubject<SchedulerState>({
    driversById: new Map(),
    shiftsById: new Map(),
    assignmentsById: new Map(),
    driverShiftIndex: new Map(),
    viewport: EMPTY_VIEWPORT,
    selectedShiftId: null,
    hoveredShiftId: null,
  });

  readonly state$ = this.stateSubject.asObservable();
  readonly viewport$ = this.state$.pipe(map((s) => s.viewport));

  constructor(private readonly zone: NgZone) {
    this.zone.runOutsideAngular(() => {
      this.delta$
        .pipe(observeOn(animationFrameScheduler), auditTime(16, animationFrameScheduler))
        .subscribe((delta) => this.applyDelta(delta));
    });
  }

  getSnapshot(): SchedulerState {
    return this.stateSubject.value;
  }

  pushDelta(delta: SchedulerDelta): void {
    this.delta$.next(delta);
  }

  setViewport(viewport: SchedulerViewport): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({ ...prev, viewport });
  }

  selectShift(shiftId: string | null): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({ ...prev, selectedShiftId: shiftId });
  }

  hoverShift(shiftId: string | null): void {
    const prev = this.stateSubject.value;
    this.stateSubject.next({ ...prev, hoveredShiftId: shiftId });
  }

  private applyDelta(delta: SchedulerDelta): void {
    const prev = this.stateSubject.value;
    const next: SchedulerState = {
      ...prev,
      driversById: new Map(prev.driversById),
      shiftsById: new Map(prev.shiftsById),
      assignmentsById: new Map(prev.assignmentsById),
      driverShiftIndex: new Map(prev.driverShiftIndex),
    };

    delta.upsertDrivers?.forEach((d) => next.driversById.set(d.id, d));
    delta.removeDriverIds?.forEach((id) => next.driversById.delete(id));

    delta.upsertShifts?.forEach((s) => {
      next.shiftsById.set(s.id, s);
      this.bindShiftToDriver(next.driverShiftIndex, s.driverId, s.id);
    });

    delta.patchShifts?.forEach((patch) => {
      const existing = next.shiftsById.get(patch.id);
      if (!existing) return;
      const beforeDriver = existing.driverId;
      const merged = { ...existing, ...patch };
      next.shiftsById.set(patch.id, merged);
      if (beforeDriver !== merged.driverId) {
        this.unbindShiftFromDriver(next.driverShiftIndex, beforeDriver, patch.id);
        this.bindShiftToDriver(next.driverShiftIndex, merged.driverId, patch.id);
      }
    });

    delta.removeShiftIds?.forEach((id) => {
      const existing = next.shiftsById.get(id);
      if (existing) {
        this.unbindShiftFromDriver(next.driverShiftIndex, existing.driverId, existing.id);
      }
      next.shiftsById.delete(id);
    });

    delta.upsertAssignments?.forEach((a) => next.assignmentsById.set(a.id, a));
    delta.removeAssignmentIds?.forEach((id) => next.assignmentsById.delete(id));

    this.stateSubject.next(next);
  }

  private bindShiftToDriver(index: Map<string, Set<string>>, driverId: string, shiftId: string): void {
    const shifts = index.get(driverId) ?? new Set<string>();
    shifts.add(shiftId);
    index.set(driverId, shifts);
  }

  private unbindShiftFromDriver(index: Map<string, Set<string>>, driverId: string, shiftId: string): void {
    const shifts = index.get(driverId);
    if (!shifts) return;
    shifts.delete(shiftId);
    if (shifts.size === 0) {
      index.delete(driverId);
    }
  }
}
