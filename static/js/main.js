// 全局变量
let songData = null;
let isDataLoading = false;

// DOM元素
const loadingOverlay = document.getElementById('loading-overlay');
const loadingProgress = document.getElementById('loading-progress');
const guessIdInput = document.getElementById('guess-id');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 尝试从缓存加载数据
    loadDataWithCache();
    
    // 事件监听器
    setupEventListeners();
});

// 使用缓存并显示加载进度
async function loadDataWithCache() {
    if (isDataLoading) return;
    isDataLoading = true;
    
    // 显示加载界面
    loadingOverlay.style.display = 'flex';
    
    try {
        // 检查本地缓存
        const cachedData = localStorage.getItem('maimai_song_data');
        const cachedTimestamp = localStorage.getItem('maimai_data_timestamp');
        const currentTime = new Date().getTime();
        
        // 如果缓存存在且不超过1天
        if (cachedData && cachedTimestamp && (currentTime - cachedTimestamp < 86400000)) {
            songData = JSON.parse(cachedData);
            console.log('Data loaded from cache');
            loadingProgress.textContent = '从缓存加载数据成功！';
            
            // 短暂延迟后隐藏加载界面
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                isDataLoading = false;
            }, 1000);
            return;
        }
        
        // 如果无缓存或缓存过期，则从网络加载
        await loadDataFromNetwork();
    } catch (error) {
        console.error('Error loading data:', error);
        loadingProgress.textContent = '加载失败，请刷新页面重试';
    }
}

// 从网络加载数据并显示进度
async function loadDataFromNetwork() {
    try {
        // 使用fetch并添加进度指示
        const response = await fetch('static/all_data.json');
        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;
        
        // 创建一个可读流来处理数据并更新进度
        const reader = response.body.getReader();
        const chunks = [];
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;
            
            // 更新加载进度
            if (total > 0) {
                const progress = Math.min(Math.round((loaded / total) * 100), 100);
                loadingProgress.textContent = `正在加载数据 (${progress}%)`;
            } else {
                loadingProgress.textContent = `正在加载数据 (${loaded} bytes)`;
            }
        }
        
        // 合并所有块并解析JSON
        const allChunks = new Uint8Array(loaded);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }
        
        const jsonString = new TextDecoder().decode(allChunks);
        songData = JSON.parse(jsonString);
        
        // 保存到本地缓存
        localStorage.setItem('maimai_song_data', jsonString);
        localStorage.setItem('maimai_data_timestamp', new Date().getTime().toString());
        
        loadingProgress.textContent = '加载完成！';
        
        // 短暂延迟后隐藏加载界面
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            isDataLoading = false;
        }, 1000);
    } catch (error) {
        console.error('Error loading data from network:', error);
        loadingProgress.textContent = '加载失败，请刷新页面重试';
        isDataLoading = false;
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 搜索按钮点击
    searchButton.addEventListener('click', () => {
        const id = guessIdInput.value.trim();
        if (id) {
            displaySongInfo(id);
        }
    });
    
    // 关闭模态框按钮
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('info-modal').style.display = 'none';
        document.getElementById('modal-overlay').style.display = 'none';
    });
    
    // 关于按钮
    document.getElementById('about-button').addEventListener('click', () => {
        document.getElementById('about-modal').style.display = 'block';
        document.getElementById('modal-overlay').style.display = 'flex';
    });
    
    // 关闭关于模态框
    document.getElementById('close-about').addEventListener('click', () => {
        document.getElementById('about-modal').style.display = 'none';
        document.getElementById('modal-overlay').style.display = 'none';
    });
}

// 搜索匹配曲目
function searchMatches() {
    const input = guessIdInput.value.trim().toLowerCase();
    
    // 清空结果区域
    searchResults.innerHTML = '';
    
    if (!input || !songData) return;
    
    // 进行搜索匹配（实现取决于你的原有代码和数据结构）
    // 这里是示例实现，你需要根据你的数据结构调整
    const matches = Object.values(songData).filter(song => {
        return song.title.toLowerCase().includes(input) || 
               (song.id && song.id.toLowerCase().includes(input)) ||
               (song.aliases && song.aliases.some(alias => alias.toLowerCase().includes(input)));
    }).slice(0, 10); // 限制结果数量
    
    // 显示匹配结果
    matches.forEach(song => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = `${song.title} (ID: ${song.id})`;
        div.onclick = () => {
            guessIdInput.value = song.id;
            searchResults.innerHTML = '';
        };
        searchResults.appendChild(div);
    });
}

// 显示歌曲信息（你的原有函数）
function displaySongInfo(id) {
    // 实现取决于你的原有代码
    // ...
}

// 其他你原有的函数
// ...