document.addEventListener('DOMContentLoaded', function () {
    // 使用全局变量
    const supabase = window.supabaseClient;
    const currentUserId = window.currentUserId;
    const escapeHtml = window.utils.escapeHtml;

    const wallContainer = document.getElementById('wallContainer');
    const addCardBtn = document.getElementById('addCardBtn');
    const userName = document.getElementById('userName');
    const cardTitle = document.getElementById('cardTitle');
    const cardContent = document.getElementById('cardContent');
    const resetBtn = document.getElementById('resetBtn');
    const cardCounter = document.getElementById('cardCounter');
    const statusIndicator = document.getElementById('statusIndicator');

    // 测试连接
    testConnection();

    // 添加卡片按钮事件
    addCardBtn.addEventListener('click', async function () {
        const user = userName.value.trim() || '匿名用户';
        const title = cardTitle.value.trim() || '新留言';
        const content = cardContent.value.trim() || '大家好！';

        if (content) {
            await addMessageToDatabase(user, title, content);
            // 清空表单
            cardTitle.value = '';
            cardContent.value = '';
        }
    });

    // 重置按钮事件
    resetBtn.addEventListener('click', async function () {
        if (confirm('确定要清空所有留言吗？')) {
            await clearAllMessages();
        }
    });

    const chatPageBtn = document.getElementById('chatPageBtn');
    chatPageBtn.addEventListener('click', function () {
        window.location.href = 'chat.html';
    });

    // === 在这里添加日记按钮跳转 ===
    const diaryPageBtn = document.getElementById('diaryPageBtn');
    diaryPageBtn.addEventListener('click', function() {
        window.location.href = 'diary.html';
    });

    // 测试连接函数
    async function testConnection() {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('count')
                .limit(1);

            if (error) throw error;

            statusIndicator.innerHTML = '<span class="status-online">● 实时在线</span>';
            loadMessages();
            setupRealtimeSubscription();
        } catch (error) {
            console.error('连接失败:', error);
            statusIndicator.innerHTML = '<span class="status-offline">● 连接失败</span>';
            cardCounter.textContent = '连接失败，请检查配置';
        }
    }

    // 从数据库加载留言
    async function loadMessages() {
        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // 清空容器
            wallContainer.innerHTML = '';

            // 添加所有留言卡片
            messages.forEach(msg => {
                createCardElement(msg);
            });

            updateCardCounter();
        } catch (error) {
            console.error('加载留言失败:', error);
            cardCounter.textContent = '加载失败';
        }
    }

    // 设置实时订阅
    function setupRealtimeSubscription() {
        supabase
            .channel('messages')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                (payload) => {
                    console.log('收到实时更新:', payload);

                    if (payload.eventType === 'INSERT') {
                        // 新留言
                        createCardElement(payload.new);
                        updateCardCounter();
                    } else if (payload.eventType === 'DELETE') {
                        // 删除留言
                        const cardToRemove = document.getElementById(`card-${payload.old.id}`);
                        if (cardToRemove) {
                            cardToRemove.remove();
                            updateCardCounter();
                        }
                    }
                }
            )
            .subscribe();
    }

    // 创建卡片元素
    function createCardElement(message) {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `card-${message.id}`;

        // 设置位置
        const x = message.x || Math.random() * (wallContainer.offsetWidth - 320);
        const y = message.y || Math.random() * (wallContainer.offsetHeight - 200);
        card.style.transform = `translate3d(${x}px, ${y}px, 0)`;

        card.innerHTML = `
            <div class="card-header">
                <div class="circles">
                    <div class="circle red"></div>
                    <div class="circle orange"></div>
                    <div class="circle green"></div>
                </div>
                <div class="card-title">${escapeHtml(message.title)}</div>
                ${message.user_id === currentUserId ? '<div class="close-btn">×</div>' : ''}
            </div>
            <div class="card-content">
                <div>
                    <strong>${escapeHtml(message.user_name)}:</strong><br>
                    ${escapeHtml(message.content)}
                </div>
            </div>
        `;

        wallContainer.appendChild(card);

        // 使卡片可拖动
        makeCardDraggable(card, message.id);

        // 如果是自己的卡片，添加删除功能
        if (message.user_id === currentUserId) {
            addCloseFunctionality(card, message.id);
        }
    }

    // 添加消息到数据库
    async function addMessageToDatabase(userName, title, content) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    user_name: userName,
                    title: title,
                    content: content,
                    user_id: currentUserId,
                    x: Math.floor(Math.random() * (wallContainer.offsetWidth - 320)),
                    y: Math.floor(Math.random() * (wallContainer.offsetHeight - 200))
                });

            if (error) throw error;

            // 手动触发重新加载消息
            loadMessages();
            return data;
        } catch (error) {
            console.error('发布留言失败:', error);
            console.error('详细错误:', JSON.stringify(error, null, 2));
            alert('发布失败: ' + (error.message || '请检查控制台'));
        }
    }

    // 清空所有留言
    async function clearAllMessages() {
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .gt('id', 0);

            if (error) throw error;

            wallContainer.innerHTML = '';
            updateCardCounter();
        } catch (error) {
            console.error('清空留言失败:', error);
        }
    }

    // 删除单条留言
    async function deleteMessage(messageId) {
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;
        } catch (error) {
            console.error('删除留言失败:', error);
        }
    }

    // 更新卡片位置到数据库
    async function updateMessagePosition(messageId, x, y) {
        try {
            const { error } = await supabase
                .from('messages')
                .update({ x: x, y: y })
                .eq('id', messageId);

            if (error) throw error;
        } catch (error) {
            console.error('更新位置失败:', error);
        }
    }

    // 使卡片可拖动
    function makeCardDraggable(card, messageId) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        card.addEventListener('mousedown', dragStart);

        function dragStart(e) {
            if (e.target.classList.contains('close-btn')) return;

            e.preventDefault();

            const transform = card.style.transform;
            const match = transform.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
            currentX = match ? parseFloat(match[1]) : 0;
            currentY = match ? parseFloat(match[2]) : 0;

            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;

            isDragging = true;
            card.classList.add('dragging');

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }

        function drag(e) {
            if (!isDragging) return;

            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // 边界检查
            const containerRect = wallContainer.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();

            currentX = Math.max(0, Math.min(currentX, containerRect.width - cardRect.width));
            currentY = Math.max(0, Math.min(currentY, containerRect.height - cardRect.height));

            card.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }

        function dragEnd() {
            if (!isDragging) return;

            isDragging = false;
            card.classList.remove('dragging');

            // 更新数据库中的位置
            updateMessagePosition(messageId, currentX, currentY);

            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        }
    }

    // 添加关闭功能
    function addCloseFunctionality(card, messageId) {
        const closeBtn = card.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (confirm('确定要删除这条留言吗？')) {
                    deleteMessage(messageId);
                }
            });
        }
    }

    // 更新卡片计数
    function updateCardCounter() {
        const cardCount = document.querySelectorAll('.card').length;
        cardCounter.textContent = `当前有 ${cardCount} 条留言`;
    }
});

