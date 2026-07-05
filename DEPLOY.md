# 旅行共享记账本 - 部署到 PythonAnywhere 指南

> GitHub 仓库: https://github.com/wqyzy/travel_account

## 1. 注册 PythonAnywhere
访问 https://www.pythonanywhere.com/ 注册免费账号（Beginner 计划）

## 2. 拉取项目
1. 登录 PythonAnywhere，打开 **Consoles** → **Bash**
2. 执行：
```bash
cd ~
rm -rf mysite
git clone https://github.com/wqyzy/travel_account.git mysite
```

## 3. 安装依赖
在同一个 Bash 终端中：
```bash
cd ~/mysite
pip3 install --user flask flask-cors
```

## 4. 创建上传目录
```bash
mkdir -p ~/mysite/uploads
```

## 5. 配置 Web App
1. 进入 **Web** 页面
2. 点击 **Add a new web app** → **Next** → 选择 **Flask** → 选择 **Python 3.10**（或最新版本）
3. 在 **Code** 部分配置：
   - **Source code**: `/home/你的用户名/mysite`
   - **Working directory**: `/home/你的用户名/mysite`
4. 点击 **WSGI configuration file** 链接，**删除**全部内容，替换为：

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

> ⚠️ 把 `你的用户名` 替换为你的 PythonAnywhere 用户名

## 6. 启动
1. 回到 **Web** 页面，点击绿色的 **Reload** 按钮
2. 访问 `https://你的用户名.pythonanywhere.com/`

## 7. 更新代码
后续代码有更新时，在 PythonAnywhere Bash 中执行：
```bash
cd ~/mysite
git pull
```
然后在 Web 页面点击 **Reload**。

## 项目结构
```
mysite/
├── app.py              # Flask 后端
├── wsgi.py             # WSGI 入口
├── requirements.txt    # 依赖
├── data.db             # SQLite 数据库（自动创建）
├── uploads/            # 截图凭证存储
├── templates/
│   └── index.html      # 前端页面
└── static/
    ├── css/style.css   # 样式
    └── js/app.js       # 前端逻辑
```

## 注意事项
- 免费账户有 512MB 存储限制，定期清理旧截图
- 免费账户每 24 小时需要重新激活一次
- 上传的截图保存在 `uploads/` 文件夹