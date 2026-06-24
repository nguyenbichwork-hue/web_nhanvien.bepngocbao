# BNB · Cập nhật giá thị trường (Agent local)

Công cụ chạy trên **máy nhân viên** để tự cào giá đối thủ mỗi sáng rồi đẩy về web RMS.
Vì chạy local + lái **Chrome thật** nên vượt được tường chặn bot mà máy chủ bị dính.

## Dành cho NHÂN VIÊN (người chạy máy) — chỉ 2 bước

1. Yêu cầu máy đã cài **Google Chrome**.
2. Tải file **`BNB-CapNhatGia.exe`** về (vd để ở Desktop) rồi **nhấn đúp** vào nó.

Xong! Lần đầu nhấn đúp, máy tự:
- Đăng ký **lịch chạy 8h sáng mỗi ngày**.
- Cào giá toàn bộ ngay (URL + mã đã **nhúng sẵn** trong file → **không phải nhập gì**).

Từ đó cứ để máy mở (hoặc bật) lúc 8h sáng là tự cập nhật. Muốn cào lại lúc nào: **nhấn đúp lại**.

> Nếu Windows hiện "Windows protected your PC" → bấm **More info → Run anyway**
> (file nội bộ, không ký số).

### Lệnh tay (khi cần)
| Lệnh | Việc |
|------|------|
| `BNB-CapNhatGia.exe` | Cào toàn bộ ngay bây giờ |
| `BNB-CapNhatGia.exe --once 50` | Cào thử 50 SP đầu |
| `BNB-CapNhatGia.exe --no-browser` | Cào nhanh (bỏ Chrome) |
| `BNB-CapNhatGia.exe --setup` | Cài lại URL/mã hoặc đăng ký lại lịch |

- Nhật ký chạy lưu ở `agent.log` (cùng thư mục).
- Cấu hình lưu ở `config.json` (cùng thư mục) — **không gửi file này cho ai** (chứa mã).

## Dành cho SẾP / NGƯỜI QUẢN TRỊ

- **`AGENT_TOKEN` trên Vercel** (Settings → Environment Variables) đã đặt = giá trị nhúng
  trong EXE. URL + token đã **nhúng sẵn** trong `BNB-CapNhatGia.exe` nên nhân viên không cần
  nhập gì. Đổi token → đổi cả 2 nơi (Vercel env + `agent/build-config.json`) rồi build lại.
- Bảng Supabase `bnb_market_prices` đã tạo (migration `0011`).
- Giá đổ về xem ở menu **Tìm nguồn (RMS) → Giá thị trường (Agent local)**.

## Build lại EXE (khi sửa code / đổi token)
```
cd agent
npm install
# tạo agent/build-config.json:  { "webUrl": "https://...", "token": "..." }
node build.mjs      # → BNB-CapNhatGia.exe (đã nhúng URL/token)
```
Yêu cầu: Node 22+ (SEA). `build-config.json` chứa token → KHÔNG commit (đã .gitignore).
Gửi nhân viên **chỉ 1 file** `BNB-CapNhatGia.exe`.
