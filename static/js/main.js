// 全局变量
let musicInfo = {}; // 存储曲目信息
let isDataLoading = false; // 数据加载状态

// DOM元素
const loadingOverlay = document.getElementById('loading-overlay');
const searchContainer = document.getElementById('search-container');
const guessIdInput = document.getElementById('guess-id');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');
const modalOverlay = document.getElementById('modal-overlay');
const infoModal = document.getElementById('info-modal');
const aboutModal = document.getElementById('about-modal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 确保模态框初始状态为隐藏
    if (infoModal) infoModal.style.display = 'none';
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (aboutModal) aboutModal.style.display = 'none';
    
    // 直接从网络加载数据
    loadDataFromNetwork();
    
    // 事件监听器
    setupEventListeners();
});

// 从网络加载数据并显示进度
async function loadDataFromNetwork() {
    if (isDataLoading) return;
    isDataLoading = true;
    
    // 显示加载界面
    loadingOverlay.style.display = 'flex';
    
    try {
        // 使用fetch并添加进度指示
        const response = await fetch('static/all_data.json');
        
        // 检查响应是否成功
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
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
            
            // 更新加载进度显示
            const progressText = document.querySelector('#loading-progress');
            if (total > 0) {
                const progress = Math.min(Math.round((loaded / total) * 100), 100);
                progressText.textContent = `正在加载数据 (${progress}%)`;
            } else {
                progressText.textContent = `正在加载数据 (${loaded} bytes)`;
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
        musicInfo = JSON.parse(jsonString);
        
        // 更新加载完成提示
        document.querySelector('#loading-progress').textContent = '加载完成！';
        
        // 短暂延迟后隐藏加载界面并显示搜索界面
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            searchContainer.style.display = 'block';
            isDataLoading = false;
        }, 500);
    } catch (error) {
        console.error('Error loading data from network:', error);
        alert("加载数据失败，请刷新页面重试！");
        isDataLoading = false;
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 搜索按钮点击
    searchButton.addEventListener('click', displaySongInfo);
    
    // 输入框事件
    guessIdInput.addEventListener('input', searchMatches);
    
    // 关于按钮
    document.getElementById('about-button').addEventListener('click', () => {
        aboutModal.style.display = 'block';
        modalOverlay.style.display = 'flex';
    });
    
    // 关闭关于模态框
    document.getElementById('close-about').addEventListener('click', () => {
        aboutModal.style.display = 'none';
        modalOverlay.style.display = 'none';
    });
    
    // 点击遮罩层关闭模态框
    modalOverlay.addEventListener('click', () => {
        infoModal.style.display = 'none';
        aboutModal.style.display = 'none';
        modalOverlay.style.display = 'none';
    });
    
    // 使用事件委托处理关闭按钮点击，而不是直接绑定到可能不存在的元素
    document.addEventListener('click', function(event) {
        if (event.target && (event.target.id === 'close-modal' || event.target.id === 'close-modal-btn')) {
            infoModal.style.display = 'none';
            modalOverlay.style.display = 'none';
        }
    });
}

// 搜索匹配曲目
function searchMatches() {
    const input = guessIdInput.value.trim().toLowerCase();
    
    // 清空结果区域
    searchResults.innerHTML = '';
    
    if (!input || !musicInfo) {
        searchResults.style.display = 'none';
        return;
    }
    
    // 进行搜索匹配并计算相关度
    const matches = Object.keys(musicInfo)
        .map(key => {
            const music = musicInfo[key];
            const aliases = music.alias || [];
            let score = 0;
            
            // 计算匹配分数
            if (key.toLowerCase() === input) {
                score += 150; // ID完全一致得分最高
            } else if (key.toLowerCase().includes(input)) {
                score += 100; // ID部分匹配
            }
            
            if (music.title.toLowerCase() === input) {
                score += 120; // 标题完全一致
            } else if (music.title.toLowerCase().includes(input)) {
                score += 80; // 标题部分匹配
            }
            
            aliases.forEach(alias => {
                if (alias.toLowerCase() === input) {
                    score += 120; // 别名完全一致
                } else if (alias.toLowerCase().includes(input)) {
                    score += 60; // 别名部分匹配
                }
            });
            
            return { key, music, score };
        })
        .filter(item => item.score > 0) // 只保留有匹配结果的
        .sort((a, b) => b.score - a.score); // 按分数从高到低排序
    
    // 显示匹配结果
    if (matches.length > 0) {
        matches.forEach(({ key, music }) => {
            const div = document.createElement('div');
            div.style.padding = '5px';
            div.style.cursor = 'pointer';
            div.textContent = `${music.title} (ID: ${key})`;
            div.onclick = () => selectMatch(key);
            searchResults.appendChild(div);
        });
        searchResults.style.display = 'block';
    } else {
        searchResults.style.display = 'none';
    }
}

// 选择匹配结果
function selectMatch(id) {
    guessIdInput.value = id;
    searchResults.style.display = 'none';
}

// 显示歌曲信息
function displaySongInfo() {
    const input = guessIdInput.value.trim().toLowerCase();
    
    if (!input) {
        alert("请输入曲目 ID");
        return;
    }

    // 检查musicInfo是否已加载
    if (!musicInfo || Object.keys(musicInfo).length === 0) {
        alert("数据尚未加载完成，请稍候再试");
        return;
    }

    let music = musicInfo[input];
    if (!music) {
        alert("未找到相关曲目！");
        return;
    }

    // 清空输入框
    guessIdInput.value = "";

    // 设置标题
    document.getElementById("modal-title").textContent = music.title;
    
    // 构建模态框内容
    infoModal.innerHTML = `
        <div class="modal-header">
            <h2 id="modal-title">${music.title}</h2>
            <button id="close-modal" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
            <div class="song-info-card">
                <h3>基本信息</h3>
                <div class="cover-container">
                    <img src="https://assets2.lxns.net/maimai/jacket/${music.id % 10000}.png" alt="${music.title}">
                </div>
                <div class="song-info-grid">
                    <div class="info-item">
                        <span class="info-label">曲目ID</span>
                        <span class="info-value">${music.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">类型</span>
                        <span class="info-value">${music.type}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">艺术家</span>
                        <span class="info-value">${music.basic_info.artist}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">流派</span>
                        <span class="info-value">${music.basic_info.genre}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">版本</span>
                        <span class="info-value">${music.basic_info.from}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">BPM</span>
                        <span class="info-value">${music.basic_info.bpm}</span>
                    </div>
                </div>
            </div>

            <div class="song-info-card">
                <h3>难度与谱面信息</h3>
                <div class="difficulty-info">
                    ${music.level.map((level, index) => {
                        const difficultyClass = ['basic', 'advanced', 'expert', 'master', 'remaster'][index];
                        const fitDiff = music.fit_diff && music.fit_diff[index] ? 
                            ` (拟合: ${music.fit_diff[index].toFixed(2)})` : '';
                        return `
                            <div class="difficulty-badge ${difficultyClass}">
                                ${['Basic', 'Advanced', 'Expert', 'Master', 'Re:Master'][index]}: ${level}
                                (${music.ds[index]})${fitDiff}
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="chart-info-container">
                    <table class="chart-info-table">
                        <thead>
                            <tr>
                                <th>难度</th>
                                <th>音符</th>
                                <th>物量</th>
                                <th>谱师</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${music.charts.map((chart, index) => {
                                const difficultyClass = ['basic', 'advanced', 'expert', 'master', 'remaster'][index];
                                const difficultyShort = ['BAS', 'ADV', 'EXP', 'MAS', 'REM'][index];
                                return `
                                    <tr class="${difficultyClass}-row">
                                        <td>${difficultyShort}</td>
                                        <td>${chart.notes.join("/")}</td>
                                        <td>${chart.notes.reduce((a, b) => a + b, 0)}</td>
                                        <td>${chart.charter}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            ${music.alias && music.alias.length > 0 ? `
                <div class="song-info-card">
                    <h3>别名</h3>
                    <div class="alias-tags">
                        ${music.alias.map(alias => `
                            <span class="alias-tag">${alias}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button id="close-modal-btn" class="btn btn-primary">关闭</button>
        </div>
    `;
    
    // 添加关闭按钮事件监听
    document.querySelectorAll('#close-modal, #close-modal-btn').forEach(button => {
        button.addEventListener('click', () => {
            infoModal.style.display = 'none';
            modalOverlay.style.display = 'none';
        });
    });
    
    // 显示模态框
    modalOverlay.style.display = "block";
    infoModal.style.display = "block";
}