import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { UserProfile } from '../../core/models/portal.models';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';

interface GpaResult {
  gpa: number;
  average10: number;
  totalCredits: number;
  passedCredits: number;
  classification: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent],
  template: `
  <app-page-header
    title="Điểm trung bình và tiến độ tốt nghiệp"
    subtitle="GPA được tổng hợp thời gian thực từ cơ sở dữ liệu MongoDB bằng Aggregation Pipeline đa giai đoạn.">
  </app-page-header>

  @if (data(); as g) {
    <!-- Thống kê GPA hiện tại -->
    <section class="stats-grid">
      <app-stat-card label="GPA tích lũy" [value]="g.gpa" icon="query_stats" [trend]="g.classification" />
      <app-stat-card label="Trung bình hệ 10" [value]="g.average10" icon="calculate" tone="success" />
      <app-stat-card label="Tín chỉ tính GPA" [value]="g.totalCredits" icon="menu_book" tone="warning" />
      <app-stat-card label="Tín chỉ đã tích lũy" [value]="g.passedCredits" icon="workspace_premium" tone="success" />
    </section>

    <section class="gpa-layout">
      <!-- Donut Tiến độ -->
      <article class="panel progress-card">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">TIẾN ĐỘ CHƯƠNG TRÌNH</span>
            <h3>{{ g.passedCredits }} / {{ requiredCredits() }} tín chỉ</h3>
          </div>
          <strong>{{ progressPercent() }}%</strong>
        </div>
        <div class="progress-donut large" [style.--progress]="progressPercent() + '%'">
          <div>
            <strong>{{ progressPercent() }}%</strong>
            <span>đã hoàn thành</span>
          </div>
        </div>
        <div class="progress"><i [style.width.%]="progressPercent()"></i></div>
      </article>

      <!-- Tổng hợp Học vụ -->
      <article class="panel">
        <div class="panel-heading">
          <div>
            <span class="eyebrow">TỔNG HỢP HỌC VỤ</span>
            <h3>Tình trạng học tập</h3>
          </div>
        </div>
        <div class="status-overview">
          <div><span>Xếp loại hiện tại</span><strong>{{ g.classification }}</strong></div>
          <div><span>Tín chỉ còn lại</span><strong>{{ remainingCredits() }}</strong></div>
          <div><span>Tỷ lệ tín chỉ đạt</span><strong>{{ creditPassRate() }}%</strong></div>
          <div><span>Ngành đào tạo</span><strong>{{ profile()?.programName || 'Công nghệ Thông tin' }}</strong></div>
        </div>
      </article>
    </section>

    <!-- BỘ CÔNG CỤ DỰ BÁO & GIẢ LẬP MỤC TIÊU GPA TỐT NGHIỆP -->
    <section class="panel" style="margin-top: 18px; padding: 22px;">
      <div class="panel-heading" style="margin-bottom: 16px;">
        <div>
          <span class="eyebrow" style="color: #0b6fc2; font-weight: 700;">TÍNH NĂNG ĐỘT PHÁ</span>
          <h3 style="margin: 4px 0 0; font-size: 19px; color: #0b1c30;">🎯 Máy tính Giả lập & Dự báo GPA Tốt nghiệp (Graduation Simulator)</h3>
          <p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">Chọn hoặc điều chỉnh mức GPA mong muốn khi ra trường để hệ thống tự động tính toán điểm số tối thiểu cần đạt trong {{ remainingCredits() }} tín chỉ còn lại.</p>
        </div>
      </div>

      <!-- Presets Buttons -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button type="button" class="secondary-button"
                [style.background]="targetGpa() === 2.5 ? '#0b6fc2' : '#ffffff'"
                [style.color]="targetGpa() === 2.5 ? '#ffffff' : '#0b6fc2'"
                (click)="targetGpa.set(2.5)">
          🥉 Bằng Khá (GPA ≥ 2.50)
        </button>
        <button type="button" class="secondary-button"
                [style.background]="targetGpa() === 2.8 ? '#0b6fc2' : '#ffffff'"
                [style.color]="targetGpa() === 2.8 ? '#ffffff' : '#0b6fc2'"
                (click)="targetGpa.set(2.8)">
          🥈 Bằng Khá Cao (GPA ≥ 2.80)
        </button>
        <button type="button" class="secondary-button"
                [style.background]="targetGpa() === 3.2 ? '#0b6fc2' : '#ffffff'"
                [style.color]="targetGpa() === 3.2 ? '#ffffff' : '#0b6fc2'"
                (click)="targetGpa.set(3.2)">
          🥇 Bằng Giỏi (GPA ≥ 3.20)
        </button>
        <button type="button" class="secondary-button"
                [style.background]="targetGpa() === 3.6 ? '#0b6fc2' : '#ffffff'"
                [style.color]="targetGpa() === 3.6 ? '#ffffff' : '#0b6fc2'"
                (click)="targetGpa.set(3.6)">
          🏆 Bằng Xuất Sắc (GPA ≥ 3.60)
        </button>
      </div>

      <!-- Simulation Result Card -->
      <div style="background: linear-gradient(135deg, #f8fbff 0%, #edf5fc 100%); border: 1.5px solid #c2e0fa; border-radius: 14px; padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; align-items: center;">
        <div>
          <span style="font-size: 11.5px; color: var(--muted); text-transform: uppercase; font-weight: 600;">Mục tiêu đã chọn</span>
          <div style="font-size: 26px; font-weight: 800; color: #0b6fc2; margin-top: 4px;">GPA {{ targetGpa() | number:'1.2-2' }}</div>
          <small style="color: #5a6e85; font-size: 12px;">Tổng điểm cần: {{ targetTotalPoints() | number:'1.1-1' }} pts</small>
        </div>

        <div>
          <span style="font-size: 11.5px; color: var(--muted); text-transform: uppercase; font-weight: 600;">GPA cần đạt ở các môn còn lại</span>
          <div style="font-size: 26px; font-weight: 800;" [style.color]="simulationResult().color">
            {{ simulationResult().isFeasible ? (simulationResult().requiredGpa | number:'1.2-2') : 'Không khả thi' }}
          </div>
          <small style="color: #5a6e85; font-size: 12px;">Áp dụng cho {{ remainingCredits() }} tín chỉ sắp học</small>
        </div>

        <div>
          <span style="font-size: 11.5px; color: var(--muted); text-transform: uppercase; font-weight: 600;">Điểm TB hệ 10 tương đương</span>
          <div style="font-size: 26px; font-weight: 800; color: #10213f;">
            {{ simulationResult().isFeasible ? (simulationResult().approxScore10 | number:'1.1-1') + ' / 10' : '—' }}
          </div>
          <small style="color: #5a6e85; font-size: 12px;">Thang điểm chữ: {{ simulationResult().targetLetter }}</small>
        </div>

        <div style="border-left: 2px solid #c2e0fa; padding-left: 16px;">
          <span style="font-size: 11.5px; color: var(--muted); text-transform: uppercase; font-weight: 600;">Đánh giá & Khuyến nghị</span>
          <div style="margin-top: 5px; font-size: 13px; font-weight: 600; line-height: 1.45;" [style.color]="simulationResult().color">
            {{ simulationResult().advice }}
          </div>
        </div>
      </div>
    </section>
  } @else {
    <article class="panel empty-state">
      <span class="material-symbols-outlined spin">progress_activity</span>
      <h3>Đang tính toán GPA từ MongoDB...</h3>
    </article>
  }
  `
})
export class GpaComponent implements OnInit {
  readonly data = signal<GpaResult | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  readonly targetGpa = signal<number>(2.5);

  readonly requiredCredits = computed(() => Math.max(1, this.profile()?.requiredCredits || 151));
  readonly progressPercent = computed(() => Math.min(100, Math.round((this.data()?.passedCredits || 0) * 1000 / this.requiredCredits()) / 10));
  readonly remainingCredits = computed(() => Math.max(0, this.requiredCredits() - (this.data()?.passedCredits || 0)));
  readonly creditPassRate = computed(() => {
    const gpa = this.data();
    return gpa?.totalCredits ? Math.round(gpa.passedCredits * 1000 / gpa.totalCredits) / 10 : 0;
  });

  readonly targetTotalPoints = computed(() => this.targetGpa() * this.requiredCredits());

  readonly simulationResult = computed(() => {
    const curGpa = this.data()?.gpa || 0;
    const curCredits = this.data()?.passedCredits || 0;
    const remCredits = this.remainingCredits();
    const target = this.targetGpa();
    const totalRequired = this.requiredCredits();

    if (remCredits <= 0) {
      return {
        isFeasible: false,
        requiredGpa: 0,
        approxScore10: 0,
        targetLetter: '—',
        color: '#dc2626',
        advice: 'Bạn đã hoàn thành đủ số tín chỉ chương trình đào tạo.'
      };
    }

    const currentPoints = curGpa * curCredits;
    const targetPoints = target * totalRequired;
    const neededPoints = targetPoints - currentPoints;
    const neededGpa = neededPoints / remCredits;

    if (neededGpa > 4.0) {
      return {
        isFeasible: false,
        requiredGpa: neededGpa,
        approxScore10: 10,
        targetLetter: 'Vượt trần',
        color: '#dc2626',
        advice: `Để đạt GPA ${target.toFixed(2)}, bạn cần đạt GPA trung bình ${neededGpa.toFixed(2)} ở ${remCredits} tín chỉ còn lại (vượt mức tối đa 4.0). Nhóm khuyến nghị bạn đặt mục tiêu GPA phù hợp hơn hoặc cải thiện điểm các môn cũ.`
      };
    }

    if (neededGpa <= 2.0) {
      return {
        isFeasible: true,
        requiredGpa: Math.max(1.0, neededGpa),
        approxScore10: 5.5,
        targetLetter: 'Điểm D / C',
        color: '#10b981',
        advice: `Khả thi cao! Bạn chỉ cần duy trì điểm trung bình từ 5.5 - 6.0 (thang điểm 10) ở các môn còn lại để chắc chắn đạt mục tiêu.`
      };
    }

    if (neededGpa <= 2.8) {
      const approx10 = 5.5 + (neededGpa - 2.0) * 2.0;
      return {
        isFeasible: true,
        requiredGpa: neededGpa,
        approxScore10: approx10,
        targetLetter: 'Điểm C+ / B',
        color: '#0b6fc2',
        advice: `Hoàn toàn khả thi! Bạn cần đạt trung bình khoảng ${approx10.toFixed(1)} điểm hệ 10 (tương đương điểm B/C+) ở ${remCredits} tín chỉ còn lại.`
      };
    }

    if (neededGpa <= 3.4) {
      const approx10 = 7.0 + (neededGpa - 2.8) * 1.5;
      return {
        isFeasible: true,
        requiredGpa: neededGpa,
        approxScore10: approx10,
        targetLetter: 'Điểm B+ / A',
        color: '#d97706',
        advice: `Thách thức cao! Bạn cần nỗ lực đạt loại Giỏi (trung bình ~${approx10.toFixed(1)} điểm hệ 10, điểm B+ và A) trong toàn bộ ${remCredits} tín chỉ còn lại.`
      };
    }

    // between 3.4 and 4.0
    return {
      isFeasible: true,
      requiredGpa: neededGpa,
      approxScore10: 9.0,
      targetLetter: 'Điểm A / A+',
      color: '#ea580c',
      advice: `Cực kỳ thử thách! Bạn bắt buộc phải đạt điểm A/A+ tuyệt đối ở hầu hết tất cả các môn còn lại để cán mốc này.`
    };
  });

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    forkJoin({
      gpa: this.api.get<GpaResult>('/student/gpa'),
      profile: this.api.get<UserProfile>('/profile')
    }).subscribe(({ gpa, profile }) => {
      this.data.set(gpa.data);
      this.profile.set(profile.data);
    });
  }
}
