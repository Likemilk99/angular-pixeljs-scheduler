# Airport Ground Transport Scheduler (Angular + PixelJS/PixiJS)

## 1) Architecture

- **Angular layer** (OnPush + runOutsideAngular): owns host layout, controls, and state orchestration.
- **State layer (RxJS)**: `SchedulerStore` accepts delta updates and mutates maps incrementally.
- **Viewport engine**: transforms pan/zoom/resize into time-range and row-range windows.
- **Virtualization engine**: computes visible drivers and shifts with overscan.
- **Rendering engine**: retained scene graph with 4 layers:
  - grid layer
  - shifts layer
  - overlay layer
  - interaction layer
- **Interaction engine**: centralized pointer handling + spatial hash hit-test.

## 2) Why this design

- **Retained-mode rendering** keeps objects alive and updates only changed geometry each frame.
- **Incremental deltas** avoid full scene rebuild under ~40 updates/sec.
- **Pooling** removes GC churn from create/destroy storms.
- **Centralized interaction** avoids per-object heavy listeners and deep event-tree crawls.

## 3) CPU vs GPU tradeoff

- CPU work is reduced by visibility filtering (`O(visible)`), spatial indexing, and map-based patching.
- GPU work is reduced by layered draw ordering and avoiding unnecessary geometry mutation outside visible window.
- We use `Graphics` for rectangular shifts; the guide notes small graphics can be batched and are comparable to sprites.

## 4) Angular zone strategy

- Scheduler rendering and event loop run in `NgZone.runOutsideAngular()`.
- Angular only reacts to coarse UI state; per-frame and per-delta updates avoid global change detection.

## 5) Scaling notes (10k+ shifts)

- Keep data indexed by `driverId` and time bins to reduce visibility scan.
- Split hot-path updates (time/driver patches) from cold-path metadata updates.
- Track frame time and update budget; if over budget, process updates in micro-batches.

## 6) Conflict detection

- Maintain per-driver interval list (sorted by startTime).
- On patch/insert, binary-search neighbors only.
- Conflicts written to overlay badges and highlight style in shift layer.

## 7) Profiling / observability

- Use PixiJS DevTools for scene graph / draw-call inspection.
- Track FPS via ticker elapsedMS rolling average.
- Expose pool sizes and visible object counts as debug counters.
