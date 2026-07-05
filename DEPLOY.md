# 旅行共享记账本 - 部署到 PythonAnywhere 指南

> GitHub 仓库: https://github.com/wqyzy/travel_account

## 1. 注册 PythonAnywhere
访问 https://www.pythonanywhere.com/ 注册免费账号（Beginner 计划）

## 2. 拉取项目
打开 **Consoles** → **Bash**，执行：
```bash
rm -rf ~/mysite
git clone https://github.com/wqyzy/travel_account.git ~/mysite
cd ~/mysite
pip3 install --user flask
mkdir -p uploads
```

## 3. 配置 Web App
1. 进入 **Web** 页面 → **Add a new web app** → **Flask** → **Python 3.10**
2. 在 **Code** 部分：
   - **Source code**: `/home/你的用户名/mysite`
   - **Working directory**: `/home/你的用户名/mysite`
3. 点击 **WSGI configuration file** 链接（例如 `/var/www/你的用户名_pythonanywhere_com_wsgi.py`）
4. **删除**文件里全部内容，替换为：

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

> ⚠️ **关键**：
> - 把 `你的用户名` 替换为你的 PythonAnywhere 用户名
> - 编辑的是 `/var/www/xxx_pythonanywhere_com_wsgi.py`，不是项目里的 `wsgi.py`
> - 变量名必须是 `application`（Flask 的 `app` 赋值给它）

## 4. 启动
点击绿色的 **Reload** 按钮 → 访问 `https://你的用户名.pythonanywhere.com/`

## 5. 更新代码
后续代码有更新时：
```bash
cd ~/mysite
git pull
```
然后在 Web 页面点击 **Reload**。

## 注意事项
- 免费账户有 512MB 存储限制
- 上传的截图保存在 `uploads/` 文件夹中
- 如果报错，查看 **Web** 页面的 error log 链接