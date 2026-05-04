// 全局数据
let products = [];

// DOM 元素
const productsGrid = document.getElementById('products-grid');
const modal = document.getElementById('purchase-modal');
const modalProductInfo = document.getElementById('modal-product-info');
const purchaseForm = document.getElementById('purchase-form');
const buyerNameInput = document.getElementById('buyer-name');
const buyerEmailInput = document.getElementById('buyer-email');
const purchaseResultDiv = document.getElementById('purchase-result');
const closeModalBtn = document.querySelector('.close-modal');

let currentProduct = null;

// 获取商品列表
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            products = result.data;
            renderProducts();
        } else {
            productsGrid.innerHTML = '<div class="loading-spinner">暂无商品，请联系管理员添加</div>';
        }
    } catch (error) {
        console.error('获取商品失败', error);
        productsGrid.innerHTML = '<div class="loading-spinner">网络错误，请刷新页面重试</div>';
    }
}

// 渲染商品卡片
function renderProducts() {
    if (!products.length) {
        productsGrid.innerHTML = '<div class="loading-spinner">✨ 没有在售商品，稍后再来～</div>';
        return;
    }
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <img class="product-img" src="${product.image_url || 'https://picsum.photos/id/13/200/150'}" alt="${product.name}" loading="lazy">
            <div class="product-info">
                <div class="product-title">${escapeHtml(product.name)}</div>
                <div class="product-desc">${escapeHtml(product.description || '虚拟卡密，付款后自动发货')}</div>
                <div class="price-stock">
                    <span class="price">¥${Number(product.price).toFixed(2)}</span>
                    <span class="stock">库存: ${product.stock}</span>
                </div>
                <button class="buy-btn" data-id="${product.id}">立即购买</button>
            </div>
        </div>
    `).join('');

    // 绑定购买按钮事件
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === productId);
            if (product && product.stock > 0) {
                openModal(product);
            } else {
                alert('抱歉，该商品已售罄！');
            }
        });
    });
}

// 简单的防XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function openModal(product) {
    currentProduct = product;
    modalProductInfo.innerHTML = `
        <strong>${escapeHtml(product.name)}</strong><br>
        价格: ¥${product.price}  &nbsp; | &nbsp; 剩余库存: ${product.stock}
    `;
    // 重置表单和结果
    purchaseForm.reset();
    purchaseResultDiv.style.display = 'none';
    purchaseResultDiv.innerHTML = '';
    modal.style.display = 'flex';
}

async function handlePurchase(event) {
    event.preventDefault();
    if (!currentProduct) return;
    
    const buyerName = buyerNameInput.value.trim();
    const buyerEmail = buyerEmailInput.value.trim();
    
    if (!buyerName || !buyerEmail) {
        showResult('请填写完整姓名和邮箱', false);
        return;
    }
    if (!buyerEmail.includes('@')) {
        showResult('邮箱格式不正确', false);
        return;
    }
    
    // 发送购买请求
    try {
        const response = await fetch('/api/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: currentProduct.id,
                buyerName: buyerName,
                buyerEmail: buyerEmail
            })
        });
        
        const result = await response.json();
        if (result.success) {
            // 显示成功 + 卡密
            showResult(`
                ✅ 购买成功！<br>
                🎫 卡密: <strong style="font-size:1.1rem; background:#fff2e0; padding:4px 8px; border-radius:12px;">${result.order.cardCode}</strong><br>
                订单号: ${result.order.orderId}<br>
                已发送至邮箱: ${result.order.buyerEmail} (演示邮件未实际发送，请保存卡密)
            `, true);
            // 更新当前商品库存显示：重新拉取列表
            await fetchProducts();
            // 如果模态框未关闭不关闭，但显示成功
            setTimeout(() => {
                modal.style.display = 'none';
                purchaseResultDiv.style.display = 'none';
            }, 4000);
        } else {
            showResult(`❌ 购买失败: ${result.message}`, false);
        }
    } catch (err) {
        console.error(err);
        showResult('网络错误, 请稍后再试', false);
    }
}

function showResult(message, isSuccess) {
    purchaseResultDiv.innerHTML = message;
    purchaseResultDiv.style.display = 'block';
    purchaseResultDiv.className = `result-area ${isSuccess ? 'success' : 'error'}`;
}

// 关闭模态框
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

purchaseForm.addEventListener('submit', handlePurchase);

// 启动
fetchProducts();
