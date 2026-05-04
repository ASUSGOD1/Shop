const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { initDB, getProducts, createOrder, getProductById, reduceStock } = require('./database');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 初始化数据库
initDB();

// ========== API 路由 ==========

// 获取所有商品列表（前端展示）
app.get('/api/products', (req, res) => {
    try {
        const products = getProducts();
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 购买商品：生成订单 & 扣减库存（模拟发卡：返回卡密）
app.post('/api/purchase', (req, res) => {
    const { productId, buyerName, buyerEmail } = req.body;
    
    if (!productId || !buyerName || !buyerEmail) {
        return res.status(400).json({ success: false, message: '缺少必要信息 (商品ID, 姓名, 邮箱)' });
    }
    
    // 获取商品信息
    const product = getProductById(parseInt(productId));
    if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在' });
    }
    
    if (product.stock <= 0) {
        return res.status(400).json({ success: false, message: '库存不足，无法购买' });
    }
    
    // 模拟卡密生成（真实场景可改为从数据表读取预存卡密）
    const cardCode = `CARD-${uuidv4().slice(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // 创建订单 (实际正式应当事务处理，简单演示先扣库存再记录)
    const orderId = createOrder(productId, buyerName, buyerEmail, product.price, cardCode);
    if (!orderId) {
        return res.status(500).json({ success: false, message: '订单创建失败' });
    }
    
    // 扣减库存
    const reduced = reduceStock(productId);
    if (!reduced) {
        // 回滚语义略复杂，本demo简单返回错误
        return res.status(500).json({ success: false, message: '库存更新失败，请联系客服' });
    }
    
    // 返回购买成功信息 + 卡密
    res.json({
        success: true,
        message: '购买成功！卡密已生成',
        order: {
            orderId,
            productName: product.name,
            cardCode: cardCode,
            buyerEmail: buyerEmail
        }
    });
});

// 健康检查 / 开源展示
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 其余前端路由都走 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 卡网系统已启动: http://localhost:${PORT}`);
    console.log(`📦 开源项目 - 虚拟商品自动发卡平台`);
});