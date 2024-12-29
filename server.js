const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');

const app = express();
const port = 8080;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// 在文件开头添加调试日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}: ${req.method} ${req.url}`);
    next();
});

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.txt');
const PRIZES_FILE = path.join(DATA_DIR, 'prizes.txt');
const WINNERS_FILE = path.join(DATA_DIR, 'winners.txt');

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        // 确保文件存在
        for (const file of [PARTICIPANTS_FILE, PRIZES_FILE, WINNERS_FILE]) {
            try {
                await fs.access(file);
            } catch {
                await fs.writeFile(file, '[]');
            }
        }
    } catch (error) {
        console.error('创建数据目录失败:', error);
    }
}

// 读取文件数据
async function readFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(filePath, '[]');
            return [];
        }
        throw error;
    }
}

// 写入文件数据
async function appendFile(filePath, data) {
    try {
        const existingData = await readFile(filePath);
        existingData.push(data);
        await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
    } catch (error) {
        console.error('写入文件失败:', error);
        throw error;
    }
}

// API路由
// 提交报名
app.post('/api/submit', async (req, res) => {
    console.log('收到提交请求:', {
        url: req.url,
        method: req.method,
        body: req.body,
        headers: req.headers
    });
    
    try {
        const { name, phone } = req.body;
        
        // 验证数据
        if (!name || !phone) {
            console.log('数据验证失败: 缺少必要字段');
            return res.status(400).json({
                success: false,
                message: '姓名和手机号不能为空'
            });
        }

        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: '请输入正确的手机号码'
            });
        }

        const participants = await readFile(PARTICIPANTS_FILE);
        const isDuplicate = participants.some(p => 
            p.phone === phone || p.name === name
        );
        
        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                message: '该用户已报名'
            });
        }

        await appendFile(PARTICIPANTS_FILE, {
            name,
            phone,
            time: new Date().toISOString()
        });

        res.json({
            success: true,
            message: '报名成功！'
        });
    } catch (error) {
        console.error('处理请求失败:', error);
        res.status(500).json({
            success: false,
            message: '系统错误，请稍后重试'
        });
    }
});

// 获取参与者列表
app.get('/api/participants', async (req, res) => {
    try {
        // 从 data/participants.txt 读取 JSON 格式的参与者信息
        const data = await fs.readFile('data/participants.txt', 'utf8');
        const participants = JSON.parse(data);
        res.json(participants);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 如果文件不存在，返回空数组
            res.json([]);
        } else {
            console.error('读取参与者失败:', error);
            res.status(500).json({ error: '读取失败' });
        }
    }
});

// 获取奖项列表
app.get('/api/prizes', async (req, res) => {
    try {
        const prizes = await readFile(PRIZES_FILE);
        res.json(prizes);
    } catch (error) {
        res.status(500).json({ error: '获取奖项列表失败' });
    }
});

// 保存奖项设置
app.post('/api/prizes', async (req, res) => {
    try {
        await fs.writeFile(PRIZES_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: '保存成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 获取所有中奖记录
app.get('/api/winners', async (req, res) => {
    try {
        // 检查文件是否存在
        try {
            await fs.access('data/winners.txt');
        } catch (error) {
            // 文件不存在时返回空数组
            return res.json([]);
        }

        // 读取文件内容
        const data = await fs.readFile('data/winners.txt', 'utf8');
        if (!data.trim()) {
            // 文件为空时返回空数组
            return res.json([]);
        }

        const winners = data.trim().split('\n')
            .filter(line => line.trim() !== '')  // 过滤空行
            .map(line => {
                const [time, rest] = line.split(' - ');
                const [prize, winner] = rest.split(': ');
                return { time, prize, winner };
            });
        res.json(winners);
    } catch (error) {
        console.error('读取中奖记录失败:', error);
        res.status(500).json({ error: '读取失败' });
    }
});

// 修改中奖记录
app.put('/api/winners', async (req, res) => {
    try {
        const { time, prize, winner } = req.body;
        const data = await fs.readFile('data/winners.txt', 'utf8');
        const lines = data.trim().split('\n');
        const newLines = lines.map(line => {
            if (line.startsWith(time)) {
                return `${time} - ${prize}: ${winner}`;
            }
            return line;
        });
        await fs.writeFile('data/winners.txt', newLines.join('\n') + '\n', 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('修改中奖记录失败:', error);
        res.status(500).json({ error: '修改失败' });
    }
});

// 删除中奖记录
app.delete('/api/winners', async (req, res) => {
    try {
        const { time } = req.body;
        const data = await fs.readFile('data/winners.txt', 'utf8');
        const lines = data.trim().split('\n').filter(Boolean); // 过滤空行
        const newLines = lines.filter(line => !line.startsWith(time));
        
        // 如果是最后一条记录，确保写入空文件
        if (newLines.length === 0) {
            await fs.writeFile('data/winners.txt', '', 'utf8');
        } else {
            await fs.writeFile('data/winners.txt', newLines.join('\n') + '\n', 'utf8');
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('删除中奖记录失败:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// 保存中奖记录
app.post('/api/save_winner', async (req, res) => {
    try {
        const { prize, winner } = req.body;
        const time = new Date().toLocaleString();
        const record = `${time} - ${prize}: ${winner}\n`;
        
        // 确保目录存在
        await fs.mkdir('data', { recursive: true });
        
        // 追加写入文件
        await fs.appendFile('data/winners.txt', record, 'utf8');
        
        res.json({ success: true });
    } catch (error) {
        console.error('保存中奖记录失败:', error);
        res.status(500).json({ error: '保存失败' });
    }
});

// 添加参与者
app.post('/api/participants', async (req, res) => {
    try {
        const { name, phone } = req.body;
        // 读取现有数据
        const data = await fs.readFile('data/participants.txt', 'utf8');
        const participants = JSON.parse(data);
        
        // 添加新参与者
        participants.push({
            name,
            phone,
            time: new Date().toISOString()
        });
        
        // 写回文件
        await fs.writeFile('data/participants.txt', JSON.stringify(participants, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('添加参与者失败:', error);
        res.status(500).json({ error: '添加失败' });
    }
});

// 删除参与者
app.delete('/api/participants', async (req, res) => {
    try {
        const { name, phone } = req.body;
        // 读取现有数据
        const data = await fs.readFile('data/participants.txt', 'utf8');
        const participants = JSON.parse(data);
        
        // 过滤掉要删除的参与者
        const newParticipants = participants.filter(p => 
            !(p.name === name && p.phone === phone)
        );
        
        // 写回文件
        await fs.writeFile('data/participants.txt', JSON.stringify(newParticipants, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('删除参与者失败:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// 添加 session 中间件
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// 登录路由
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 用户名: admin
    // 密码: admin123
    if (username === 'admin' && password === 'admin123') {
        req.session.isAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// 验证中间件
function requireAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// 保护管理页面
app.get('/admin.html', requireAuth, (req, res, next) => {
    next();
});

// 保护API路由
app.use('/api/winners', requireAuth);
app.use('/api/participants', requireAuth);

// 启动服务器
async function start() {
    await ensureDataDir();
    app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`);
    });
}

start(); 