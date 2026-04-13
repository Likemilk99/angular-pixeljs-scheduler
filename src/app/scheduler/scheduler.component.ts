import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { VirtualizationEngine } from './engine/virtualization-engine';
import { ViewportEngine } from './engine/viewport-engine';
import { Assignment, Driver, Shift } from './models';
import { InteractionEngine } from './interaction/interaction-engine';
import { PixelRenderer } from './rendering/pixel-renderer';
import { SchedulerStore } from './state/scheduler-store';

@Component({
  selector: 'app-airport-scheduler',
  template: '<div #host class="scheduler-host"></div>',
  styles: [
    `
      .scheduler-host {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  private readonly destroy$ = new Subject<void>();

  private readonly renderer = new PixelRenderer();
  private readonly viewportEngine = new ViewportEngine();
  private readonly virtualization = new VirtualizationEngine();
  private readonly interaction = new InteractionEngine(this.store);

  private realtimeTimer: ReturnType<typeof setInterval> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private readonly store: SchedulerStore, private readonly zone: NgZone) {}

  async ngAfterViewInit(): Promise<void> {
    await this.renderer.init(this.hostRef.nativeElement);

    this.zone.runOutsideAngular(() => {
      this.bindInteraction();
      this.bindRendering();
      this.bindResizeObserver();
      this.bootstrapDemoData();
      this.startRealtimeSimulation();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.renderer.destroy();
  }

  private bindInteraction(): void {
    this.renderer.interactionLayer.on('globalpointermove', (event) => this.interaction.onPointerMove(event));
    this.renderer.interactionLayer.on('pointertap', (event) => this.interaction.onPointerTap(event));
  }

  private bindRendering(): void {
    this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      const drivers = [...state.driversById.values()];
      const shifts = [...state.shiftsById.values()];
      const viewport = state.viewport;
      const visibleDriverIds = this.virtualization.computeVisibleDriverIds(drivers, viewport);

      const rowByDriverId = new Map<string, number>();
      visibleDriverIds.forEach((driverId, localRow) => rowByDriverId.set(driverId, viewport.rowStart + localRow));

      const visibleShifts = this.virtualization.computeVisibleShifts(shifts, rowByDriverId, viewport);
      this.interaction.reindex(visibleShifts);

      const assignmentsByShiftId = this.groupAssignmentsByShift([...state.assignmentsById.values()]);

      this.renderer.renderGrid(viewport);
      this.renderer.renderShifts(visibleShifts, state.selectedShiftId, state.hoveredShiftId);
      this.renderer.renderAssignmentOverlay(assignmentsByShiftId);
    });
  }

  private bindResizeObserver(): void {
    const host = this.hostRef.nativeElement;
    this.resizeObserver = new ResizeObserver(() => {
      const current = this.store.getSnapshot().viewport;
      const next = this.viewportEngine.resize(current, host.clientWidth, host.clientHeight);
      this.store.setViewport(next);
      this.renderer.resizeInteractionLayer(host.clientWidth, host.clientHeight);
    });
    this.resizeObserver.observe(host);
  }

  private groupAssignmentsByShift(assignments: Assignment[]): Map<string, Assignment[]> {
    const out = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const existing = out.get(assignment.shiftId) ?? [];
      existing.push(assignment);
      out.set(assignment.shiftId, existing);
    }
    return out;
  }

  private bootstrapDemoData(): void {
    const host = this.hostRef.nativeElement;
    this.store.setViewport(this.viewportEngine.createInitial(host.clientWidth, host.clientHeight, Date.now()));

    const drivers: Driver[] = Array.from({ length: 100 }).map((_, i) => ({
      id: `drv-${i}`,
      name: `Driver ${i}`,
      index: i,
      status: 'active',
    }));

    const now = Date.now();
    const shifts: Shift[] = Array.from({ length: 5000 }).map((_, i) => {
      const driverId = drivers[i % drivers.length].id;
      const start = now + (i % 1440) * 60_000;
      const end = start + (30 + (i % 120)) * 60_000;
      return {
        id: `shift-${i}`,
        driverId,
        startTime: start,
        endTime: end,
        type: i % 7 === 0 ? 'break' : i % 5 === 0 ? 'standby' : 'work',
      };
    });

    this.store.pushDelta({ upsertDrivers: drivers, upsertShifts: shifts });
  }

  private startRealtimeSimulation(): void {
    this.realtimeTimer = setInterval(() => {
      const state = this.store.getSnapshot();
      const shiftIds = [...state.shiftsById.keys()];
      if (shiftIds.length === 0) return;
      const id = shiftIds[Math.floor(Math.random() * shiftIds.length)];
      const shift = state.shiftsById.get(id);
      if (!shift) return;

      const delta = (Math.random() * 8 - 4) * 60_000;
      this.store.pushDelta({
        patchShifts: [
          {
            id,
            startTime: shift.startTime + delta,
            endTime: shift.endTime + delta,
            driverId: `drv-${Math.floor(Math.random() * 100)}`,
          },
        ],
      });
    }, 25);
  }
}
