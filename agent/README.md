# BNB · Cập nhật giá thị trường (Agent local)

Công cụ chạy trên **máy nhân viên** để tự cào giá đối thủ mỗi sáng rồi đẩy về web RMS.
Vì chạy local + lái **Chrome thật** nên vượt được tường chặn bot mà máy chủ bị dính.

## Dành cho NHÂN VIÊN (người chạy máy)

1. Yêu cầu máy đã cài **Google Chrome**.
2. Tải file **`BNB-CapNhatGia.exe`** về 1 thư mục riêng (vd `C:\BNB-Gia\`).
3. Mở thư mục đó, giữ **Shift + chuột phải** → "Mở cửa sổ PowerShell tại đây".
4. Gõ:  `.\BNB-CapNhatGia.exe --setup`
   - Dán **URL web** (sếp cung cấp, vd `https://bnb-bepngocbao.vercel.app`)
   - Dán **Mã liên kết (token)** (sếp cung cấp)
   - Chọn **g** để cào thử ngay 30 SP.
5. Xong! Máy sẽ **tự cào giá lúc 8h sáng mỗi ngày** (đã đăng ký lịch Windows).
   Cứ để máy mở (hoặc bật) lúc 8h là được.

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

1. **Đặt biến môi trường trên web** (Vercel → Project → Settings → Environment Variables):
   - `AGENT_TOKEN = <chuỗi bí mật>` (cùng giá trị nhân viên dán lúc setup).
   - Redeploy để áp dụng.
2. Bảng Supabase `bnb_market_prices` đã được tạo (migration `0011`).
3. Giá đổ về xem ở menu **Tìm nguồn (RMS) → Giá thị trường (Agent local)**.

## Build lại EXE (khi sửa code agent)
```
cd agent
npm install
node build.mjs      # tạo BNB-CapNhatGia.exe
```
Yêu cầu: Node 22+ (SEA). Gửi cho nhân viên **chỉ 1 file** `BNB-CapNhatGia.exe`.
