import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <main class="layout">
      <header class="toolbar">Airport Ground Transport Scheduler</header>
      <section class="content">
        <app-airport-scheduler></app-airport-scheduler>
      </section>
    </main>
  `,
  styles: [
    `
      .layout {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-rows: 52px 1fr;
        color: #e2e8f0;
        font-family: Inter, Arial, sans-serif;
      }

      .toolbar {
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-weight: 600;
        background: #111827;
        border-bottom: 1px solid #1f2937;
      }

      .content {
        min-height: 0;
      }

      app-airport-scheduler {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
