# Báo cáo test lại lần 2 – EduManage LMS

- **Commit test:** `9011ea8` (Update README) + `3559e92` (Update), so với lần trước là `cdd1f52`
- **Ngày test:** 18/11/2026
- **Cách chạy:** `git pull` → `dotnet test` → `docker compose up -d --build`

## 1. Tổng quan

| Hạng mục | Kết quả |
|---|---|
| Build + test backend | ✅ 41/41 pass (thêm 13 test mới trong `BugFixVerificationTests`) |
| Docker (mongo + api + frontend) | ✅ Chạy bình thường |
| Chạy lại toàn bộ test CRUD / load dữ liệu cũ | ✅ Không có lỗi mới phát sinh |

## 2. Kết quả từng lỗi đã báo

| # | Lỗi | Trạng thái |
|---|---|---|
| 1 | Export Excel Sinh viên / CTĐT bị 500 | ✅ **Đã sửa.** Cả 12 loại export đều trả file Excel bình thường |
| 2 | Sửa trạng thái bảng điểm và danh sách SV qua form CRUD | ⚠️ **Mới sửa một phần** (xem 3.1) |
| 3 | SĐT hồ sơ không được kiểm tra | ✅ **Đã sửa.** `abc`, `12345`, `09123abc45` bị chặn; số hợp lệ, `+84…` và để trống vẫn lưu được. Màn hình Admin sửa SV/GV cũng đã được kiểm tra |
| 4 | Tín chỉ tích lũy lệch giữa 2 màn hình | ⚠️ **Vẫn lệch, kiểu khác:** trước là 104 / 95, giờ là **104 / 107** (xem 3.2) |
| 5 | Log ghi lỗi nghiệp vụ thành 500 | ❌ **Chưa hết** (xem 3.3) |

README: đã sửa port (8082, 27018) và tài khoản SV demo ✅.

## 3. Những chỗ còn lỗi

### 3.1. Lỗi 2: mới chặn được chuyển **sang** "Đã công bố"

**Phần đã sửa đúng:**
- Đổi một lớp Draft sang `Published` (kể cả viết thường `published`) qua PUT → báo 400 kèm thông báo rõ ràng.
- Option "Đã công bố" trên form đã bị disable.

**Phần vẫn làm được qua form/PUT CRUD (đã test thật trên một lớp test):**

| Thao tác | Kết quả |
|---|---|
| Draft → **Locked** (khóa bảng điểm) | 200, lưu thành công |
| Draft → **Submitted** (giả lập GV đã nộp) | 200, lưu thành công |
| **Published → Draft** (gỡ công bố bảng điểm, SV mất điểm) | 200, lưu thành công |
| PUT kèm `students: [...]` (ghi đè danh sách SV của lớp) | 200, lưu thành công |

**Gợi ý sửa đơn giản nhất:** trong `UpdateAsync` của `AdminResourceService`, với `class-sections` thì **bỏ hẳn** `gradeStatus` và `students` khỏi body, giống cách `AdminResourceCreatePolicy` làm khi tạo:

```csharp
if (resource.Equals("class-sections", StringComparison.OrdinalIgnoreCase))
{
    body.Remove("gradeStatus");
    body.Remove("students");
}
```

Nên đặt đoạn này **sau** các bước validate (ngay trước khi tính `fieldsToUnset`) để không bị báo thiếu trường bắt buộc. Vì update dùng `$set` theo body, bỏ key đi thì giá trị cũ trong DB được giữ nguyên. Sau đó xóa luôn field `gradeStatus` khỏi form trong `admin-resource.schema.ts`. Trạng thái bảng điểm chỉ nên đổi qua màn hình **Duyệt bảng điểm**.

> Ghi chú: đoạn kiểm tra `Published` mới thêm trong `PrepareCreateAsync` sẽ không bao giờ chạy tới, vì `ApplyStructuralDefaults` đã ép `gradeStatus = "Draft"` từ trước. Không gây lỗi, chỉ là code thừa.

### 3.2. Lỗi 4: tín chỉ vẫn lệch, giờ là 104 / 107

SV `2001230381`: trang **GPA** và **Dashboard** ghi **104**, trang **Chương trình khung** ghi **107**.

Bản sửa đã bỏ điều kiện `!ExcludeFromGpa`, nên GDTC/GDQP được tính lại đúng. Tuy nhiên hai bên vẫn dùng **điều kiện "Đạt" khác nhau**:
- `StudentAnalyticsService` (GPA): đạt khi `điểm tổng ≥ điểm đạt của môn` **và** không có thành phần bắt buộc nào dưới `minimumScore`.
- `StudentPortalService.GetCurriculum`: chỉ kiểm tra `CalculateFinalScore(x) >= 4`.

Hai môn đang bị đánh giá khác nhau:

| Môn | TC | Điểm tổng | Điểm thành phần | Bảng điểm | CT khung |
|---|---|---|---|---|---|
| 0101101040 Thực hành Trí tuệ nhân tạo | 1 | 4.02 | DA = 3.7 | ❌ Không đạt | ✅ Đạt |
| 0101001677 GDQP-AN 4 | 2 | 4.18 | DA = 3.9 | ❌ Không đạt | ✅ Đạt |

Hậu quả là cùng một môn, trang Chương trình khung ghi "Đạt" còn Bảng điểm ghi "Không đạt".

**Gợi ý sửa:** cho trang Chương trình khung dùng chung kết quả `passed` từ `StudentAnalyticsService` (hoặc cùng hàm kiểm tra), không tự tính lại bằng `>= 4`. Nên sửa ở cả `completedCredits` và `status` của từng môn (dòng ~126).

### 3.3. Lỗi 5: log vẫn ghi 500

Log API sau khi sửa, khi đăng nhập sai mật khẩu và gọi ID không tồn tại:

```
[ERR] HTTP POST /api/v1/auth/login responded 500 in 121 ms
[WRN] Client Warning [401]: Tên đăng nhập hoặc mật khẩu không đúng
[ERR] HTTP GET /api/v1/admin/faculties/... responded 500 in 1.5 ms
[WRN] Client Warning [404]: Không tìm thấy tài nguyên
```

Dòng `WRN` mới đã đúng. Nhưng dòng `ERR ... responded 500` do Serilog ghi vẫn còn, vì thứ tự middleware trong `Program.cs` chưa đổi: `UseSerilogRequestLogging()` (dòng 102) vẫn nằm **sau** `UseMiddleware<ExceptionMiddleware>()` (dòng 96).

**Gợi ý:** đổi chỗ hai dòng này, đưa `app.UseSerilogRequestLogging();` lên **trước** `app.UseMiddleware<ExceptionMiddleware>();`. Client vẫn nhận đúng mã lỗi, nên lỗi này không ảnh hưởng tới người dùng.

## 4. Lỗi nhỏ / góp ý (không bắt buộc)

- SĐT có dấu cách như `0912 345 678` bị từ chối. Nên `Replace(" ", "")` trước khi kiểm tra cho thân thiện hơn.
- Phần còn sót trong README:
  - Mục 5 vẫn ghi `cd nosql` (phải là `cd learning-management-system`).
  - README vẫn nhắc thư mục `docs/`, nhưng thư mục này bị `.gitignore` nên không có trên GitHub.
- `frontend/src/environments/environment.ts` vẫn trỏ `http://localhost:5200`. Chỉ ảnh hưởng khi chạy `npm start` không qua Docker.
- Các góp ý giao diện lần trước (tên cột thô, dropdown học kỳ trùng tên) chưa thay đổi.

## 5. Dữ liệu test

Các lớp test `TCS…`/`TCX…` và dữ liệu do script tạo ra đã được xóa mềm. SĐT của SV `2001230381` đã được trả về `0911000000`.
