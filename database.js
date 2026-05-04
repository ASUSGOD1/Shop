const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'card_shop.db');
let db = null;

// 初始化数据库及表结构
function initDB() {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('数据库连接失败:', err.message);
        } else {
            console.log('已连接 SQLite 数据库');
            // 创建商品表
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL NOT NULL,
                    stock INTEGER DEFAULT 0,
                    image_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // 创建订单表
            db.run(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_uuid TEXT UNIQUE NOT NULL,
                    product_id INTEGER,
                    buyer_name TEXT,
                    buyer_email TEXT,
                    amount REAL,
                    card_code TEXT,
                    status TEXT DEFAULT 'completed',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            `);
            
            // 插入演示数据（如果无数据）
            db.get(`SELECT COUNT(*) as count FROM products`, (err, row) => {
                if (err) return;
                if (row.count === 0) {
                    const demoProducts = [
                        ['50元 Steam 充值卡', 'Steam平台 数字礼品卡 全国通用', 50.00, 25, 'https://picsum.photos/id/104/200/150'],
                        ['10美元 Google Play 礼品码', '美区Google Play 兑换码', 72.00, 18, 'https://picsum.photos/id/20/200/150'],
                        ['奈飞 Netflix 高级会员 1个月', '流媒体账号共享/非共享码 虚拟卡密', 35.00, 42, 'https://picsum.photos/id/30/200/150'],
                        ['苹果 App Store 充值卡 $10', '美区 Apple ID 兑换', 78.00, 9, 'https://picsum.photos/id/26/200/150'],
                        ['亚马逊 $5 礼品卡', '美亚/英亚 电子兑换码', 45.00, 13, 'https://picsum.photos/id/42/200/150']
                    ];
                    
                    const insertStmt = db.prepare(`INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)`);
                    demoProducts.forEach(prod => {
                        insertStmt.run(prod, (err) => {
                            if (err) console.error('插入演示商品失败', err);
                        });
                    });
                    insertStmt.finalize();
                    console.log('已插入演示商品数据');
                }
            });
        }
    });
}

// 获取所有商品
function getProducts() {
    try {
        const stmt = db.prepare(`SELECT id, name, description, price, stock, image_url FROM products WHERE stock > 0 ORDER BY id ASC`);
        const rows = stmt.all();
        stmt.finalize();
        return rows;
    } catch (err) {
        console.error(err);
        return [];
    }
}

// 根据id获取商品
function getProductById(id) {
    try {
        const stmt = db.prepare(`SELECT * FROM products WHERE id = ?`);
        const product = stmt.get(id);
        stmt.finalize();
        return product;
    } catch (err) {
        return null;
    }
}

// 扣减库存
function reduceStock(productId) {
    try {
        const updateStmt = db.prepare(`UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0`);
        const result = updateStmt.run(productId);
        updateStmt.finalize();
        return result.changes > 0;
    } catch (err) {
        return false;
    }
}

// 创建订单，返回order_uuid
function createOrder(productId, buyerName, buyerEmail, amount, cardCode) {
    const orderUuid = require('uuid').v4();
    try {
        const stmt = db.prepare(`
            INSERT INTO orders (order_uuid, product_id, buyer_name, buyer_email, amount, card_code, status)
            VALUES (?, ?, ?, ?, ?, ?, 'completed')
        `);
        const info = stmt.run(orderUuid, productId, buyerName, buyerEmail, amount, cardCode);
        stmt.finalize();
        return orderUuid;
    } catch (err) {
        console.error('订单创建错误', err);
        return null;
    }
}

module.exports = {
    initDB,
    getProducts,
    getProductById,
    reduceStock,
    createOrder
};