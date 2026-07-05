/**
 * 旅行共享记账本 - 前端逻辑
 */

// ==================== 全局状态 ====================
let state = {
    members: [],
    categories: [],
    expenses: [],
    stats: null,
    currentFilter: 'all',
};

let memberCount = 4;

// ==================== 初始化 ====================
async function init() {
    await Promise.all([
        loadMembers(),
        loadCategories(),
        loadExpenses(),
        loadStats(),
    ]);
    renderAll();
}

// ==================== API 调用 ====================
async function api(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        showToast('网络错误，请稍后重试', 'error');
        console.error(err);
        return null;
    }
}

async function loadMembers() {
    const data = await api('/api/members');
    if (data) state.members = data;
}

async function loadCategories() {
    const data = await api('/api/categories');
    if (data) state.categories = data;
}

async function loadExpenses() {
    const data = await api('/api/expenses');
    if (data) state.expenses = data;
}

async function loadStats() {
    const data = await api('/api/stats');
    if (data) {
        state.stats = data;
        memberCount = data.member_count;
    }
}

// ==================== 渲染 ====================
function renderAll() {
    renderStats();
    renderCategorySummary();
    renderMemberSelect();
    renderCategorySelect();
    renderFilterTabs();
    renderExpenseList();
}

function renderStats() {
    if (!state.stats) return;

    const grid = document.getElementById('statsGrid');
    const s = state.stats;

    // 成员已付标签
    const memberTags = s.member_paid.map(m => {
        const diff = m.paid - s.per_person;
        const balanceClass = diff >= 0 ? 'balance-positive' : 'balance-negative';
        const sign = diff >= 0 ? '+' : '';
        return `
            <span class="member-paid-tag">
                <span class="mp-emoji">${m.emoji}</span>
                <span class="mp-name">${m.name}</span>
                <span class="mp-paid">已付</span>
                <span class="mp-amount">¥${m.paid.toFixed(2)}</span>
                <span class="mp-balance ${balanceClass}">${sign}${diff.toFixed(2)}</span>
            </span>
        `;
    }).join('');

    grid.innerHTML = `
        <div class="stat-card total">
            <div class="stat-row">
                <div class="stat-label">💰 总支出</div>
                <div class="stat-value">¥${s.total.toFixed(2)}</div>
            </div>
        </div>
        <div class="stat-card per-person">
            <div class="stat-row">
                <div class="stat-label">👤 人均应付</div>
                <div class="stat-value">¥${s.per_person.toFixed(2)}</div>
            </div>
            <div class="stat-sub">${s.member_count} 人平摊</div>
        </div>
        <div class="stat-card count">
            <div class="stat-row">
                <div class="stat-label">📝 记录笔数</div>
                <div class="stat-value">${s.member_paid.reduce((sum, m) => sum + (s.expense_count || 0), state.expenses.length)}</div>
            </div>
        </div>
        <div class="stat-card member-paid-card">
            <div class="stat-label">💳 每人已付 & 差额</div>
            <div class="member-paid-row">${memberTags}</div>
        </div>
    `;
}

function renderCategorySummary() {
    if (!state.stats) return;
    const container = document.getElementById('categorySummary');
    const s = state.stats;

    container.innerHTML = s.category_summary.map(c => `
        <div class="cat-card">
            <div class="cat-icon" style="background:${c.color}20; color:${c.color}">
                ${c.icon}
            </div>
            <div class="cat-info">
                <div class="cat-name">${c.name}</div>
                <div class="cat-total">¥${c.total.toFixed(2)}</div>
                <div class="cat-count">${c.count} 笔</div>
            </div>
        </div>
    `).join('');
}

function renderMemberSelect() {
    const select = document.getElementById('memberSelect');
    select.innerHTML = state.members.map(m =>
        `<option value="${m.id}">${m.emoji} ${m.name}${m.role ? ' · ' + m.role : ''}</option>`
    ).join('');
}

function renderCategorySelect() {
    const select = document.getElementById('categorySelect');
    select.innerHTML = state.categories.map(c =>
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');
}

function renderFilterTabs() {
    const container = document.getElementById('filterTabs');
    const allTab = `<button class="filter-tab ${state.currentFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>`;
    const catTabs = state.categories.map(c =>
        `<button class="filter-tab ${state.currentFilter === String(c.id) ? 'active' : ''}" data-filter="${c.id}">${c.icon} ${c.name}</button>`
    ).join('');
    container.innerHTML = allTab + catTabs;

    // 绑定事件
    container.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.currentFilter = tab.dataset.filter;
            renderFilterTabs();
            renderExpenseList();
        });
    });
}

function renderExpenseList() {
    const container = document.getElementById('expenseList');
    let items = state.expenses;

    // 筛选
    if (state.currentFilter !== 'all') {
        items = items.filter(e => String(e.category_id) === state.currentFilter);
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📝</span>
                <p>${state.currentFilter === 'all' ? '还没有记录，开始记一笔吧！' : '此分类下暂无记录'}</p>
            </div>
        `;
        return;
    }

    const perPerson = state.stats ? state.stats.per_person : 0;

    container.innerHTML = items.map(e => {
        const time = new Date(e.created_at + 'Z').toLocaleString('zh-CN', {
            month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const receiptHtml = e.receipt_path
            ? `<div class="ei-receipt" onclick="openImageModal('/uploads/${e.receipt_path}')" title="查看凭证">
                   <img src="/uploads/${e.receipt_path}" alt="凭证">
               </div>`
            : `<div class="ei-receipt-placeholder">📎</div>`;

        return `
            <div class="expense-item" data-id="${e.id}">
                <div class="ei-cat" style="background:${e.category_color}20; color:${e.category_color}">
                    ${e.category_icon}
                </div>
                <div class="ei-info">
                    <div class="ei-desc">${e.description || e.category_name}</div>
                    <div class="ei-meta">
                        <span style="display:inline-flex;align-items:center;gap:4px">
                            <span>${e.member_emoji}</span>
                            <span style="color:${e.member_color};font-weight:500">${e.member_name}</span>
                        </span>
                        <span>${e.category_name}</span>
                        <span>${time}</span>
                    </div>
                </div>
                <div class="ei-amount">¥${e.amount.toFixed(2)}</div>
                <div class="ei-per-person">
                    人均<br><span>¥${(e.amount / memberCount).toFixed(2)}</span>
                </div>
                ${receiptHtml}
                <div class="ei-actions">
                    <button class="btn btn-danger" onclick="deleteExpense(${e.id})" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== 表单提交 ====================
document.getElementById('expenseForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ 记录中...';

    const result = await api('/api/expenses', {
        method: 'POST',
        body: formData,
    });

    if (result) {
        showToast('✅ 记录成功！', 'success');
        this.reset();
        clearReceipt();
        await loadExpenses();
        await loadStats();
        renderAll();
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '💰 记录支出';
});

// ==================== 删除支出 ====================
async function deleteExpense(id) {
    if (!confirm('确定要删除这条记录吗？')) return;

    const result = await api(`/api/expenses/${id}`, { method: 'DELETE' });
    if (result) {
        showToast('已删除', 'success');
        await loadExpenses();
        await loadStats();
        renderAll();
    }
}

// ==================== 截图预览 ====================
function previewReceipt(input) {
    const file = input.files[0];
    const preview = document.getElementById('receiptPreview');
    const img = document.getElementById('receiptImg');
    const nameEl = document.getElementById('fileName');

    if (file) {
        nameEl.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        clearReceipt();
    }
}

function clearReceipt() {
    document.getElementById('receiptInput').value = '';
    document.getElementById('receiptPreview').style.display = 'none';
    document.getElementById('receiptImg').src = '';
    document.getElementById('fileName').textContent = '';
}

// ==================== 图片弹窗 ====================
function openImageModal(src) {
    document.getElementById('imageModalImg').src = src;
    document.getElementById('imageModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== 成员管理弹窗 ====================
async function openMemberModal() {
    await loadMembers();
    const list = document.getElementById('memberList');
    list.innerHTML = state.members.map(m => `
        <div class="member-edit-item">
            <span class="me-emoji">${m.emoji}</span>
            <div class="me-fields">
                <input type="text" value="${m.name}" placeholder="姓名"
                       onchange="updateMemberField(${m.id}, 'name', this.value)">
                <input type="text" value="${m.role || ''}" placeholder="角色"
                       onchange="updateMemberField(${m.id}, 'role', this.value)">
                <input type="text" value="${m.emoji}" placeholder="头像" style="max-width:60px"
                       onchange="updateMemberField(${m.id}, 'emoji', this.value)">
            </div>
            <input type="color" value="${m.color}" class="me-color"
                   onchange="updateMemberField(${m.id}, 'color', this.value)">
        </div>
    `).join('');

    document.getElementById('memberModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMemberModal() {
    document.getElementById('memberModal').classList.remove('active');
    document.body.style.overflow = '';
    // 刷新数据
    loadMembers().then(() => {
        loadStats().then(() => renderAll());
    });
}

async function updateMemberField(id, field, value) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;
    member[field] = value;
    await api(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: member.name,
            role: member.role,
            emoji: member.emoji,
            color: member.color,
        }),
    });
}

// ==================== Toast ====================
let toastTimer;
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMemberModal();
        closeImageModal();
    }
});

// ==================== 启动 ====================
init();