import { Component, OnInit, computed, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

export interface Clo {
  courseCode: string;
  courseName: string;
  cloCode: string;
  description: string;
  percentage: number;
  threshold: number;
  passed: boolean;
  contributingComponents: string[];
}

interface RadarAxis {
  label: string;
  x: number;
  y: number;
  lx: number;
  ly: number;
  value: number;
  passed: boolean;
}

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './clo.component.html'
})
export class CloComponent implements OnInit {
  items = signal<Clo[]>([]);
  
  // Top 8 CLOs for Radar Chart
  readonly radarItems = computed(() => this.items().slice(0, 8));

  readonly radarAxes = computed<RadarAxis[]>(() => {
    const list = this.radarItems();
    if (!list.length) return [];
    const cx = 200, cy = 180, r = 120;
    const n = list.length;
    return list.map((c, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      const lx = cx + (r + 28) * Math.cos(angle);
      const ly = cy + (r + 28) * Math.sin(angle);
      return {
        label: `${c.cloCode} (${c.percentage}%)`,
        x,
        y,
        lx,
        ly,
        value: c.percentage,
        passed: c.passed
      };
    });
  });

  readonly radarPolygon = computed(() => {
    const list = this.radarItems();
    if (!list.length) return '';
    const cx = 200, cy = 180, r = 120;
    const n = list.length;
    return list.map((c, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const pct = Math.min(100, Math.max(0, c.percentage)) / 100;
      const x = cx + r * pct * Math.cos(angle);
      const y = cy + r * pct * Math.sin(angle);
      return `${Math.round(x)},${Math.round(y)}`;
    }).join(' ');
  });

  readonly thresholdPolygon = computed(() => {
    const list = this.radarItems();
    if (!list.length) return '';
    const cx = 200, cy = 180, r = 120;
    const n = list.length;
    return list.map((c, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const th = (c.threshold || 50) / 100;
      const x = cx + r * th * Math.cos(angle);
      const y = cy + r * th * Math.sin(angle);
      return `${Math.round(x)},${Math.round(y)}`;
    }).join(' ');
  });

  readonly passedCount = computed(() => this.items().filter(c => c.passed).length);
  readonly totalCount = computed(() => this.items().length);
  readonly overallRate = computed(() => this.totalCount() ? Math.round((this.passedCount() / this.totalCount()) * 100) : 0);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get<Clo[]>('/student/clo-results').subscribe(r => this.items.set(r.data || []));
  }
}
