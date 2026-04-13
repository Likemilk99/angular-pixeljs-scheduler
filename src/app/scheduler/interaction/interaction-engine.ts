import { FederatedPointerEvent } from 'pixi.js';
import { SchedulerStore } from '../state/scheduler-store';
import { VisibleShift } from '../models';

interface IndexedShift {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class InteractionEngine {
  private readonly cellSize = 64;
  private readonly buckets = new Map<string, IndexedShift[]>();

  constructor(private readonly store: SchedulerStore) {}

  reindex(visible: VisibleShift[]): void {
    this.buckets.clear();

    for (const v of visible) {
      const item: IndexedShift = { id: v.shift.id, x: v.x, y: v.y, w: v.width, h: v.height };
      const minX = Math.floor(v.x / this.cellSize);
      const maxX = Math.floor((v.x + v.width) / this.cellSize);
      const minY = Math.floor(v.y / this.cellSize);
      const maxY = Math.floor((v.y + v.height) / this.cellSize);

      for (let cx = minX; cx <= maxX; cx += 1) {
        for (let cy = minY; cy <= maxY; cy += 1) {
          const key = `${cx}:${cy}`;
          const bucket = this.buckets.get(key) ?? [];
          bucket.push(item);
          this.buckets.set(key, bucket);
        }
      }
    }
  }

  onPointerMove(event: FederatedPointerEvent): void {
    const hit = this.hitTest(event.global.x, event.global.y);
    this.store.hoverShift(hit?.id ?? null);
  }

  onPointerTap(event: FederatedPointerEvent): void {
    const hit = this.hitTest(event.global.x, event.global.y);
    this.store.selectShift(hit?.id ?? null);
  }

  private hitTest(x: number, y: number): IndexedShift | null {
    const key = `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`;
    const bucket = this.buckets.get(key);
    if (!bucket) return null;

    for (let i = bucket.length - 1; i >= 0; i -= 1) {
      const item = bucket[i];
      if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
        return item;
      }
    }

    return null;
  }
}
