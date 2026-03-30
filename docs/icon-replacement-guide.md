# WorkPulse 图标替换指南

## 需要的图标文件

| 文件 | 用途 | 尺寸要求 | 格式 |
|------|------|----------|------|
| `resources/icon.png` | 应用主图标（源文件） | 1024×1024 px | PNG，透明背景 |
| `resources/icon.icns` | macOS 应用图标 | 多尺寸包 | ICNS（从 icon.png 生成） |
| `resources/icon.ico` | Windows 应用图标 | 多尺寸包 | ICO（从 icon.png 生成） |
| `resources/tray-icon.png` | macOS 菜单栏图标 | 44×44 px | PNG，白色图形 + 透明背景 |

---

## 设计规范

### 应用图标 (`icon.png`)

- **尺寸**: 1024×1024 px
- **背景**: 透明（macOS 会自动加圆角）
- **安全区域**: 内容放在中心 900×900 区域内，四周留 ~60px 边距
- **风格**: macOS squircle 形状，不要自己加圆角（系统自动处理）

### 菜单栏图标 (`tray-icon.png`)

- **尺寸**: 44×44 px（Retina @2x，对应 22pt）
- **颜色**: 纯白色图形 + 透明背景
- **内容区域**: 图形控制在 36×36 px 内，四周留 4px padding
- **说明**: 代码中设置了 `setTemplateImage(true)`，macOS 会自动适配深色/浅色模式

---

## 替换步骤

### 1. 替换应用图标

将设计师提供的 1024×1024 PNG 替换 `resources/icon.png`。

### 2. 生成 macOS 图标包 (.icns)

```bash
# 创建 iconset 目录
mkdir resources/icon.iconset

# 生成各尺寸
for size in 16 32 64 128 256 512 1024; do
  sips -z $size $size resources/icon.png --out resources/icon.iconset/icon_${size}x${size}.png
done

# 创建 @2x 版本
cp resources/icon.iconset/icon_32x32.png resources/icon.iconset/icon_16x16@2x.png
cp resources/icon.iconset/icon_64x64.png resources/icon.iconset/icon_32x32@2x.png
cp resources/icon.iconset/icon_256x256.png resources/icon.iconset/icon_128x128@2x.png
cp resources/icon.iconset/icon_512x512.png resources/icon.iconset/icon_256x256@2x.png
cp resources/icon.iconset/icon_1024x1024.png resources/icon.iconset/icon_512x512@2x.png

# 打包为 icns
iconutil -c icns resources/icon.iconset -o resources/icon.icns

# 清理
rm -rf resources/icon.iconset
```

### 3. 生成 Windows 图标 (.ico)

```bash
python3 - <<'EOF'
from PIL import Image

img = Image.open('resources/icon.png').convert('RGBA')
sizes = [16, 24, 32, 48, 64, 128, 256]
imgs = [img.resize((s, s), Image.LANCZOS) for s in sizes]
imgs[0].save('resources/icon.ico', format='ICO', append_images=imgs[1:], sizes=[(s,s) for s in sizes])
print("icon.ico 生成完成")
EOF
```

> 需要 Pillow: `pip install Pillow`

### 4. 替换菜单栏图标

将设计师提供的 44×44 白色 PNG 替换 `resources/tray-icon.png`。

### 5. 重新打包

```bash
# 清理旧包
rm -rf dist

# macOS
npm run dist:mac

# Windows（需在 Windows 环境运行）
npm run dist:win
```

---

## 一键脚本

将 `icon.png` 和 `tray-icon.png` 放到 `resources/` 后，运行：

```bash
# 生成 icns + ico + 打包
mkdir -p resources/icon.iconset && \
for size in 16 32 64 128 256 512 1024; do
  sips -z $size $size resources/icon.png --out resources/icon.iconset/icon_${size}x${size}.png
done && \
cp resources/icon.iconset/icon_32x32.png resources/icon.iconset/icon_16x16@2x.png && \
cp resources/icon.iconset/icon_64x64.png resources/icon.iconset/icon_32x32@2x.png && \
cp resources/icon.iconset/icon_256x256.png resources/icon.iconset/icon_128x128@2x.png && \
cp resources/icon.iconset/icon_512x512.png resources/icon.iconset/icon_256x256@2x.png && \
cp resources/icon.iconset/icon_1024x1024.png resources/icon.iconset/icon_512x512@2x.png && \
iconutil -c icns resources/icon.iconset -o resources/icon.icns && \
rm -rf resources/icon.iconset && \
python3 -c "
from PIL import Image
img = Image.open('resources/icon.png').convert('RGBA')
sizes = [16,24,32,48,64,128,256]
imgs = [img.resize((s,s), Image.LANCZOS) for s in sizes]
imgs[0].save('resources/icon.ico', format='ICO', append_images=imgs[1:], sizes=[(s,s) for s in sizes])
" && \
echo "✅ 所有图标已生成，运行 npm run dist:mac 打包"
```
