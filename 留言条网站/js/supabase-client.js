// Supabase配置
const SUPABASE_URL = 'https://wcswoklppcfqutcdptgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjc3dva2xwcGNmcXV0Y2RwdGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTE4MDIsImV4cCI6MjA3ODA4NzgwMn0.t19r6DbPI8bIXZY7AbuJWl_jvQd8HRauYkMaPYwGEVE';

// 初始化Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 生成用户ID函数
function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

// 当前用户标识
let currentUserId = localStorage.getItem('userId') || generateUserId();
localStorage.setItem('userId', currentUserId);

// 导出供其他文件使用
window.supabaseClient = supabase;
window.currentUserId = currentUserId;
window.generateUserId = generateUserId;