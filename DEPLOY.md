# 旅行共享记账本 - 部署到 PythonAnywhere 指南

## 1. 注册 PythonAnywhere
访问 https://www.pythonanywhere.com/ 注册免费账号（Beginner 计划）

## 2. 上传项目文件

### 方法一：通过 Web 界面（推荐）
1. 登录 PythonAnywhere，进入 **Files** 页面
2. 进入 `/home/你的用户名/mysite/` 目录
3. 点击 **Upload a file** 按钮，逐个上传以下文件：
   - `app.py`
   - `wsgi.py`
   - `requirements.txt`
   - `templates/index.html`
   - `static/css/style.css`
   - `static/js/app.js`
4. 创建 `uploads/` 文件夹（点击 **New directory**）

### 方法二：通过 Git（如果你有 GitHub 仓库）
```bash
cd ~/mysite
git clone https://github.com/你的用户名/你的仓库名.git .
```

## 3. 安装依赖
1. 打开 **Consoles** → **Bash** 终端
2. 执行：
```bash
cd ~/mysite
pip install --user flask flask-cors
```

## 4. 配置 Web App
1. 进入 **Web** 页面
2. 点击 **Add a new web app** → **Next** → 选择 **Flask** → 选择 **Python 3.10**（或最新版本）
3. 在 Web 配置中，找到 **Code** 部分：
   - **Source code**: `/home/你的用户名/mysite`
   - **Working directory**: `/home/你的用户名/mysite`
   - **WSGI configuration file**: 点击链接编辑

## 5. 修改 WSGI 配置
编辑 `/var/www/你的用户名_pythonanywhere_com_wsgi.py`，**删除**文件里所有内容，替换为：

```python
import sys
import os

path = '/home/你的用户名/mysite'
if path not in sys.path:
    sys.path.insert(0, path)

os.chdir(path)

from app import app, init_db
init_db()
application = app
```

> ⚠️ **重要**：把 `你的用户名` 替换为你的 PythonAnywhere 用户名

## 6. 启动
1. 回到 **Web** 页面，点击绿色的 **Reload** 按钮
2. 访问 `https://你的用户名.pythonanywhere.com/` 查看效果

## 7. 静态文件说明
- 上传的截图凭证保存在 `uploads/` 文件夹
- 数据库文件 `data.db` 会自动创建
- 免费账户有 512MB 存储限制，定期清理旧截图

## 项目结构
```
mysite/
├── app.py              # Flask 后端
├── wsgi.py             # WSGI 入口（PythonAnywhere 用）
├── requirements.txt    # 依赖
├── data.db             # SQLite 数据库（自动创建）
├── uploads/            # 截图凭证存储
├── templates/
│   └── index.html      # 前端页面
└── static/
    ├── css/
    │   └── style.css   # 样式
    └── js/
        └── app.js      # 前端逻辑
```