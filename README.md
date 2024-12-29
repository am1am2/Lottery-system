# Lottery-system
抽奖系统
抽奖系统部署文档

1. 系统要求
Node.js v16.9.0 或以上版本
PM2 进程管理器
Nginx Web服务器
操作系统: Linux (推荐CentOS/Ubuntu)

2. 项目结构
    （1）. 数据目录 (data/)
        participants.txt: JSON格式，存储参与者信息
        prizes.txt: JSON格式，存储奖项设置
        winners.txt: JSON格式，存储中奖记录
    （2）. 日志目录 (logs/)
        err.log: 错误日志
        out.log: 标准输出日志
    （3）. 前端页面
        index.html: 主页
        display.html: 实时展示页面
        submit.html: 参与报名页面
        prize-settings.html: 奖项设置页面
        lottery.html: 开始抽奖页面
        admin.html: 管理员登录页面
        login.html: 管理员登录页面
    （4）. 配置文件
        package.json: 项目依赖配置
        pm2.config.js: PM2进程管理配置
    （5）. 服务器文件
        server.js: Express服务器主文件，处理API请求和数据存储
    （6）. Web服务器配置
        .user.ini: PHP环境配置
        .404.html: 自定义404错误页面
    （7）. 权限设置
        # 目录权限
        chmod 755 lottery/
        chmod 755 lottery/data/
        chmod 755 lottery/logs/

        # 文件权限
        chmod 644 lottery/data/*
        chmod 644 lottery/logs/*
        chmod 644 lottery/*.html
        chmod 644 lottery/*.js
        chmod 644 lottery/*.json
    （7）. 注意事项
        确保data目录有读写权限
        定期备份data目录下的数据文件
        定期清理logs目录下的日志文件
        保持node_modules目录的依赖包更新
        确保img目录下的二维码图片正确
    （8）. 二维码生成
        需要首先在服务器端打开submit.html
        将链接生成二维码，将二维码图片上传到img目录下
        在display.html中找到
            <div class="qr-panel">
                <img src="./img/300.png" alt="二维码" class="qr-code">
                <div class="qr-text">扫码参与</div>
            </div>
        将"./img/300.png"替换为img目录下的二维码图片路径
3. 安装步骤
    3.1 安装Node.js
        # 使用nvm安装Node.js（可使用宝塔面板安装）
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        source ~/.bashrc
        nvm install 16.9.0
        nvm use 16.9.0
    3.2 安装PM2
        npm install -g pm2
    3.3 部署项目
        # 创建项目目录
        mkdir -p /www/wwwroot/lottery
        cd /www/wwwroot/lottery

        # 复制项目文件到该目录
        # 安装依赖
        npm install

        # 创建必要的目录和文件
        mkdir -p data logs
        touch data/participants.txt data/winners.txt data/prizes.txt
    3.4 配置Nginx
        server {
            listen 80;
            server_name your_domain.com;

            location / {
                root /www/wwwroot/lottery;
                index index.html;
                try_files $uri $uri/ /index.html;
            }

            location /api {
                proxy_pass http://localhost:8080;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_cache_bypass $http_upgrade;
            }
        }
    3.5 启动服务
        # 使用PM2启动服务
        pm2 start pm2.config.js
4. 配置文件说明
    4.1 PM2配置 (pm2.config.js)
        module.exports = {
            apps: [{
                name: 'lottery',
                script: 'server.js',
                watch: true,
                ignore_watch: ['node_modules', 'data', 'logs'],
                error_file: './logs/err.log',
                out_file: './logs/out.log',
                log_date_format: 'YYYY-MM-DD HH:mm:ss'
            }]
        }
    4.2 服务器配置 (server.js)
        端口: 8080
        支持跨域访问
        使用express-session进行会话管理
        文件存储路径: /data目录
5. 数据文件说明
    participants.txt: 存储参与者信息
    winners.txt: 存储中奖记录
    prizes.txt: 存储奖项设置
6. 维护指南
    6.1 日志查看
        # 查看错误日志
        tail -f logs/err.log

        # 查看输出日志
        tail -f logs/out.log
    6.2 服务管理
        # 重启服务
        pm2 restart lottery

        # 停止服务
        pm2 stop lottery

        # 查看服务状态
        pm2 status lottery

        # 查看日志
        pm2 logs lottery
    6.3 数据备份
        建议定期备份data目录下的数据文件：
        # 备份数据
        tar -czf lottery_data_$(date +%Y%m%d).tar.gz data/
7. 安全建议
    设置适当的文件权限
    chmod 755 /www/wwwroot/lottery
    chmod 644 /www/wwwroot/lottery/data/*

    配置防火墙，只开放必要端口(80, 443)
    
    定期更新依赖包
    npm audit
    npm update


8. 故障排除
    如果服务无法启动，检查logs目录下的错误日志
    确保data目录下的文件存在且有正确的读写权限
    检查端口8080是否被占用
    验证Nginx配置是否正确

9. 注意事项
    生产环境中建议使用HTTPS
    定期清理日志文件
    监控服务器资源使用情况
    确保数据文件定期备份
