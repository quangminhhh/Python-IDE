# Python IDE - Online Python Development Environment

Một môi trường phát triển Python hoàn chỉnh chạy trực tiếp trên trình duyệt, được xây dựng với Next.js và Pyodide. Trải nghiệm lập trình Python mượt mà, không cần cài đặt, với đầy đủ tính năng hiện đại.

![Python IDE Demo](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15.4.5-000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)

## 🌟 Tính năng chính

### 📝 **Code Editor mạnh mẽ**
- **Monaco Editor** tích hợp sẵn - trình soạn thảo code chuyên nghiệp như VS Code
- **Syntax highlighting** cho Python với màu sắc đẹp mắt
- **Auto-completion** thông minh, gợi ý code tự động
- **Word wrap** - tự động xuống dòng cho code dài
- **Tự động lưu** - Code được lưu ngay lập tức khi bạn gõ
- **Chia sẻ code** qua URL - Nén và chia sẻ code với người khác

### 🖥️ **Console tương tác**
- **Terminal xterm.js** - Console Python thực thụ với con trỏ nhấp nháy
- **Input/Output** thời gian thực - Nhập liệu và xuất kết quả ngay lập tức
- **Hỗ trợ input()** - Nhập dữ liệu trực tiếp từ bàn phím
- **Copy output** - Sao chép kết quả console chỉ với một click
- **Clear console** - Xóa sạch output và reset trạng thái

### ⚡ **Thực thi Python**
- **Pyodide Engine** - Python 3.11 chạy hoàn toàn trên trình duyệt
- **Thư viện khoa học** - NumPy, Pandas, Matplotlib, và hàng trăm package khác
- **Execution timer** - Hiển thị thời gian chạy code chính xác
- **Interruptible execution** - Dừng code đang chạy bất cứ lúc nào
- **Error handling** - Hiển thị lỗi Python rõ ràng và dễ hiểu

### 🎨 **Giao diện người dùng**
- **Responsive design** - Hoạt động mượt mà trên mọi thiết bị
- **Light/Dark theme** - Chuyển đổi giao diện sáng/tối
- **Resizable panels** - Điều chỉnh kích thước Editor và Console
- **Font size control** - Tăng/giảm kích thước font với hiệu ứng mở rộng
- **Tooltips** - Hướng dẫn chi tiết cho mọi nút bấm
- **Status indicators** - Hiển thị trạng thái chạy code realtime

## 🚀 Cài đặt và khởi chạy

### Yêu cầu hệ thống
- Node.js 18+
- npm/yarn/pnpm/bun

### Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd python-ide

# Cài đặt dependencies
npm install
# hoặc
yarn install
```

### Chạy ứng dụng

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Mở [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng.

## 📖 Hướng dẫn sử dụng chi tiết

### 🎯 **Viết và chạy code Python**

1. **Nhập code**: Gõ code Python vào editor bên trái
2. **Chạy code**: Nhấn nút **"Run"** hoặc phím tắt **Ctrl+Enter**
3. **Xem kết quả**: Output hiển thị ngay tại console bên phải
4. **Dừng thực thi**: Nhấn **"Stop"** hoặc phím **Escape** nếu cần

```python
# Ví dụ code đơn giản
name = input("Tên của bạn: ")
print(f"Xin chào, {name}!")

# Code có tính toán
import math
radius = float(input("Nhập bán kính: "))
area = math.pi * radius ** 2
print(f"Diện tích hình tròn: {area:.2f}")
```

### 🎮 **Các nút điều khiển chính**

#### **Nhóm thực thi** (chức năng chính)
- **🎯 Run Button**
  - Chạy toàn bộ code Python
  - Phím tắt: `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
  - Tooltip hiển thị: "Run Python code (Ctrl+Enter)"
  - Khi đang chạy: Nút chuyển thành "Running..." và bị disable

- **⏹️ Stop Button**
  - Dừng code đang thực thi ngay lập tức
  - Phím tắt: `Escape`
  - Chỉ hoạt động khi có code đang chạy
  - Tooltip: "Stop execution (Escape)" / "No code running"

#### **Nhóm meta** (chức năng phụ trợ)
- **🌙 Theme Toggle**
  - Chuyển đổi giữa giao diện sáng/tối
  - Click để thay đổi theme ngay lập tức
  - Tooltip: "Switch to light/dark theme"

- **📤 Share Button**
  - Tạo URL chia sẻ code hiện tại
  - Code được nén bằng LZ-String để URL ngắn gọn
  - Mở dialog với link sẵn sàng copy

### 🖥️ **Console và Input/Output**

#### **Trạng thái Console**
Console hiển thị 3 trạng thái rõ ràng:
- **🟢 Ready**: Sẵn sàng chạy code mới
- **🟡 Running**: Đang thực thi Python code
- **🔵 Waiting for input**: Đang chờ bạn nhập dữ liệu

#### **Nhập liệu với input()**
```python
# Khi gặp input(), console sẽ:
name = input("Nhập tên: ")  # Console chuyển sang "Waiting for input"
# 1. Gõ tên của bạn
# 2. Nhấn Enter
# 3. Code tiếp tục chạy
print("Xin chào", name)
```

#### **Điều khiển Console**
- **📋 Copy**: Sao chép toàn bộ output console
- **🗑️ Clear**: Xóa sạch console và reset trạng thái
  - Dừng code đang chạy (nếu có)
  - Xóa toàn bộ output
  - Reset cursor về trạng thái ban đầu

### 🎨 **Font Size Control - Tính năng độc đáo**

Một trong những tính năng nổi bật nhất là bộ điều khiển font size với hiệu ứng "thở":

#### **🔍 Vị trí**: Giữa Editor và Console (desktop)
- Trạng thái co: Chỉ hiển thị số font size hiện tại (14px)
- **Hover để mở rộng**: Panel mở rộng mượt mà với 3 nút điều khiển

#### **🎛️ Các nút điều khiển**:
- **➖ Minus**: Giảm font size (10px → 24px)
- **➕ Plus**: Tăng font size
- **↻ Reset**: Về font size mặc định (14px)

#### **✨ Hiệu ứng đặc biệt**:
- **Breathing animation**: Hiệu ứng "thở" với transition 300ms
- **Staggered opacity**: Các phần tử hiện/ẩn theo thứ tự
- **Component shifting**: Editor và Console dịch chuyển nhẹ nhàng

#### **📱 Mobile**: Các nút font size hiển thị trực tiếp trong header Console

### 📏 **Resize Panel**

#### **🖱️ Cách sử dụng**:
1. Di chuột đến đường phân cách giữa Editor và Console
2. Con trỏ chuột chuyển thành ↔️ (resize cursor)
3. Kéo thả để điều chỉnh tỷ lệ 20%-80%
4. **Visual indicator**: Hiện biểu tượng grip khi hover

#### **💾 Tự động lưu**: Tỷ lệ được lưu trong localStorage và khôi phục khi mở lại

### 🔗 **Share Code qua URL**

#### **📤 Tạo link chia sẻ**:
1. Click nút **"Share"** ở header
2. Code được nén tự động bằng thuật toán LZ-String
3. URL tạo ra: `domain.com#code=<compressed-data>`
4. Click **"Copy"** để sao chép link

#### **📥 Nhận code từ link**:
- Mở URL được chia sẻ → Code tự động tải vào editor
- Ưu tiên: URL hash > localStorage

#### **⚠️ Lưu ý**: Giữ URL dưới 2000 ký tự để tương thích tốt nhất

### ⌨️ **Phím tắt toàn cục**

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+Enter` | Chạy code Python |
| `Escape` | Dừng thực thi |
| `Ctrl+C` | Ngắt input (trong console) |

### 🕐 **Execution Timer**

Hiển thị thời gian thực thi chính xác:
- **⏱️ Trong khi chạy**: "Running... 2.5s"
- **✅ Hoàn thành**: "Completed in 1.23s"
- **❌ Bị dừng**: "Stopped at 0.8s"

## 🔧 Kiến trúc kỹ thuật

### **Frontend Stack**
- **Next.js 15.4.5** - React framework với App Router
- **TypeScript** - Type safety và developer experience
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives

### **Editor & Terminal**
- **Monaco Editor** - VS Code editor engine
- **xterm.js** - Professional terminal emulator
- **Dynamic font sizing** - Real-time typography updates

### **Python Engine**
- **Pyodide 0.26** - CPython 3.11 trong WebAssembly
- **SharedArrayBuffer** - High-performance worker communication
- **Interruptible execution** - Graceful code interruption
- **Scientific packages** - NumPy, Pandas, Matplotlib sẵn có

### **State Management**
- **React Hooks** - Local state với useRef/useState
- **localStorage** - Persistent code và settings
- **LZ-String** - Code compression cho URL sharing

## 🎭 **Theme Support**

### **🌞 Light Theme**
- Background: Trắng sạch (#ffffff)
- Code highlighting: GitHub light colors
- Terminal: Bright terminal với blue cursor

### **🌙 Dark Theme**
- Background: GitHub dark (#0d1117)
- Code highlighting: VS Code dark colors
- Terminal: Dark terminal với purple cursor

Theme được lưu trong localStorage và đồng bộ với system preference.

## 📱 **Responsive Design**

### **💻 Desktop** (≥768px)
- Layout ngang: Editor trái | Console phải
- Resize handle với visual feedback
- Font control expandable ở giữa
- Header tooltip đầy đủ

### **📱 Mobile** (<768px)
- Layout dọc: Editor trên | Console dưới
- Font controls hiển thị trực tiếp
- Touch-friendly button sizing
- Optimized spacing và typography

## 🐛 **Error Handling**

### **Python Errors**
- **Syntax errors**: Highlight dòng lỗi
- **Runtime errors**: Stack trace đầy đủ
- **Import errors**: Gợi ý package cần cài

### **System Errors**
- **Worker failures**: Auto-recovery với reconnection
- **Memory issues**: Graceful degradation
- **Network errors**: Offline fallback

## 🚀 **Performance**

### **Optimizations**
- **Code splitting**: Dynamic imports cho heavy components
- **Debounced saving**: 400ms delay để tránh excessive writes
- **RAF-based resizing**: 60fps smooth panel adjustment
- **Pre-warming**: Pyodide load sẵn khi idle

### **Memory Management**
- **Worker isolation**: Python chạy trong dedicated worker
- **Buffer cleanup**: Automatic SharedArrayBuffer management
- **Proxy cleanup**: Proper PyProxy disposal

## 🔒 **Security**

- **Sandboxed execution**: Python chạy trong WebAssembly sandbox
- **No file system access**: Hoàn toàn isolated
- **CSP compliant**: Content Security Policy friendly
- **XSS protection**: Input sanitization và escape

## 🤝 **Contributing**

```bash
# Setup development
git clone <repo>
cd python-ide
npm install
npm run dev

# Code style
npm run lint        # ESLint check
npm run build       # Production build test
```

### **Development Guidelines**
- TypeScript strict mode
- ESLint + Prettier formatting
- Component-based architecture
- Comprehensive error handling

## 📄 **License**

MIT License - Sử dụng tự do cho mục đích cá nhân và thương mại.

---

**🎉 Enjoy coding Python in your browser!**

Nếu bạn gặp vấn đề hoặc có ý tưởng cải tiến, đừng ngần ngại tạo issue hoặc pull request.
