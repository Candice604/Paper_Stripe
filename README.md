# 纸带 Paper Stripe

一个可旋转、可交互剪开的 3D 纸带拓扑实验站点，包含普通环、莫比乌斯环、进阶纸带和特殊拓扑关卡。

## GitHub Pages

这是为 GitHub 网页上传准备的扁平版本：所有文件都放在同一目录，上传时不会因重名而覆盖。

把本目录里的全部文件上传到仓库根目录，然后在 **Settings → Pages** 中选择 **Deploy from a branch**，分支选择 `main`，目录选择 `/ (root)`。

## 本地预览

```bash
python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。

> 3D 模块、剪纸声和雨声来自外部 CDN，首次访问需要联网。
