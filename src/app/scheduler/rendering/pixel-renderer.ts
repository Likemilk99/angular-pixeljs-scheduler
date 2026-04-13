import { Application, Container, Graphics, Rectangle } from 'pixi.js';
import { Assignment, SchedulerViewport, ShiftType, VisibleShift } from '../models';
import { ObjectPool } from './object-pool';

const SHIFT_COLORS: Record<ShiftType, number> = {
  work: 0x2d9cdb,
  break: 0xf2c94c,
  standby: 0x6fcf97,
};

export class PixelRenderer {
  readonly app = new Application();

  readonly root = new Container();
  readonly gridLayer = new Container();
  readonly shiftLayer = new Container({ sortableChildren: true });
  readonly overlayLayer = new Container();
  readonly interactionLayer = new Container();

  private readonly shiftPool = new ObjectPool<Graphics>(() => new Graphics());
  private readonly badgePool = new ObjectPool<Graphics>(() => new Graphics());
  private readonly activeShiftNodes = new Map<string, Graphics>();

  private readonly gridNode = new Graphics();

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ resizeTo: host, antialias: false, useContextAlpha: false });
    host.appendChild(this.app.canvas);

    this.app.stage.addChild(this.root);
    this.root.addChild(this.gridLayer, this.shiftLayer, this.overlayLayer, this.interactionLayer);

    this.gridLayer.addChild(this.gridNode);

    this.interactionLayer.eventMode = 'static';
    this.interactionLayer.hitArea = new Rectangle(0, 0, host.clientWidth, host.clientHeight);
    this.interactionLayer.interactiveChildren = false;

    this.root.cullableChildren = false;
    this.shiftLayer.cullableChildren = false;
    this.overlayLayer.cullableChildren = false;
  }

  resizeInteractionLayer(width: number, height: number): void {
    this.interactionLayer.hitArea = new Rectangle(0, 0, width, height);
  }

  renderGrid(viewport: SchedulerViewport): void {
    const grid = this.gridNode;
    grid.clear();

    const rows = Math.ceil(viewport.height / viewport.rowHeight);
    for (let i = 0; i <= rows; i += 1) {
      const y = i * viewport.rowHeight;
      grid.moveTo(0, y).lineTo(viewport.width, y).stroke({ width: 1, color: 0x2f3542, alpha: 0.6 });
    }

    const pxPerMinute = viewport.pxPerMs * 60_000;
    const intervalMinutes = pxPerMinute > 80 ? 5 : pxPerMinute > 30 ? 15 : 60;
    const intervalMs = intervalMinutes * 60_000;
    const first = Math.floor(viewport.timeStart / intervalMs) * intervalMs;

    for (let t = first; t < viewport.timeEnd; t += intervalMs) {
      const x = (t - viewport.timeStart) * viewport.pxPerMs;
      grid.moveTo(x, 0).lineTo(x, viewport.height).stroke({ width: 1, color: 0x57606f, alpha: 0.4 });
    }
  }

  renderShifts(visibleShifts: VisibleShift[], selectedShiftId: string | null, hoveredShiftId: string | null): void {
    const nextIds = new Set(visibleShifts.map((v) => v.shift.id));

    for (const [shiftId, node] of this.activeShiftNodes.entries()) {
      if (nextIds.has(shiftId)) continue;
      node.visible = false;
      node.clear();
      this.shiftLayer.removeChild(node);
      this.shiftPool.release(node);
      this.activeShiftNodes.delete(shiftId);
    }

    for (const visible of visibleShifts) {
      const shift = visible.shift;
      const node = this.activeShiftNodes.get(shift.id) ?? this.createShiftNode(shift.id);

      const isSelected = selectedShiftId === shift.id;
      const isHovered = hoveredShiftId === shift.id;
      const color = SHIFT_COLORS[shift.type];
      const border = isSelected ? 0xffffff : isHovered ? 0xced6e0 : 0x111111;

      node.clear();
      node.roundRect(visible.x, visible.y + 2, visible.width, visible.height, 4).fill({ color, alpha: 0.95 });
      node.roundRect(visible.x, visible.y + 2, visible.width, visible.height, 4).stroke({
        width: isSelected ? 2 : 1,
        color: border,
        alpha: 0.9,
      });

      node.eventMode = 'none';
      node.zIndex = isSelected ? 2 : isHovered ? 1 : 0;
      node.visible = true;
    }
  }

  renderAssignmentOverlay(assignmentsByShiftId: Map<string, Assignment[]>): void {
    for (const old of this.overlayLayer.removeChildren()) {
      old.clear();
      this.badgePool.release(old as Graphics);
    }

    for (const [shiftId, list] of assignmentsByShiftId.entries()) {
      const host = this.activeShiftNodes.get(shiftId);
      if (!host || !host.visible || list.length === 0) continue;

      const bounds = host.getBounds();
      const badge = this.badgePool.acquire();
      badge.clear();
      badge
        .roundRect(bounds.x + bounds.width - 14, bounds.y + 2, 12, 12, 3)
        .fill({ color: list.some((a) => a.priority === 1) ? 0xff4757 : 0x70a1ff, alpha: 1 });

      this.overlayLayer.addChild(badge);
    }
  }

  destroy(): void {
    this.app.destroy(true);
  }

  private createShiftNode(shiftId: string): Graphics {
    const node = this.shiftPool.acquire();
    this.activeShiftNodes.set(shiftId, node);
    this.shiftLayer.addChild(node);
    return node;
  }
}
