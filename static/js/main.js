// 全局变量
let musicInfo = {}; // 存储曲目信息
let isDataLoading = false; // 数据加载状态
let dsChangeInfo = null; // 存储定数变化信息
let currentChart = null; // 存储当前的Chart实例

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
    loadAllData();
    
    // 事件监听器
    setupEventListeners();
});

// 加载所有数据
async function loadAllData() {
    if (isDataLoading) return;
    isDataLoading = true;
    
    // 显示加载界面
    loadingOverlay.style.display = 'flex';
    
    try {
        // 并行加载歌曲数据和定数变化数据
        const [songData] = await Promise.all([
            loadDataFromNetwork(),
            loadDsChangeData() // 这个函数在 dschange.js 中定义
        ]);
        
        musicInfo = songData;
        
        // 更新加载完成提示
        document.querySelector('#loading-progress').textContent = '加载完成！';
        
        // 短暂延迟后隐藏加载界面并显示搜索界面
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            searchContainer.style.display = 'block';
            isDataLoading = false;
        }, 500);
    } catch (error) {
        console.error('Error loading data:', error);
        alert("加载数据失败，请刷新页面重试！");
        isDataLoading = false;
    }
}

// 从网络加载数据并显示进度
async function loadDataFromNetwork() {
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
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error loading data from network:', error);
        throw error;
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

    // 构建模态框内容
    const modalHTML = `
        <div class="modal-header">
            <h2 id="modal-title">${music.title}</h2>
            <button id="close-modal" class="close-btn">&times;</button>
        </div>
        <div class="song-tabs">
            <button class="tab-btn active" data-tab="basic-info">基本信息</button>
            <button class="tab-btn" data-tab="ds-change">定数变化</button>
        </div>
        <div id="basic-info" class="tab-content active">
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
        <div id="ds-change" class="tab-content">
            <div class="song-info-card">
                <h3>定数变化历史</h3>
                <div class="ds-change-chart-container">
                    <canvas id="dsChangeChart" width="800" height="400"></canvas>
                </div>
                <div id="ds-change-no-data" style="display: none;" class="no-data">无定数变化数据</div>
            </div>
        </div>
    `;
    
    // 设置模态框内容
    infoModal.innerHTML = modalHTML;
    
    // 添加选项卡切换事件监听
    setupTabEvents(input);
    
    // 添加关闭按钮事件监听
    document.querySelectorAll('#close-modal, #close-modal-btn').forEach(button => {
        button.addEventListener('click', () => {
            infoModal.style.display = 'none';
            modalOverlay.style.display = 'none';
            // 销毁图表以避免内存泄漏
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
        });
    });
    
    // 显示模态框
    modalOverlay.style.display = "flex";
    infoModal.style.display = "block";
}

// 设置选项卡事件
function setupTabEvents(songId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加当前选中项的活动状态
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            
            // 如果切换到定数变化选项卡，初始化图表
            if (tabId === 'ds-change') {
                initDsChangeChart(songId);
            }
        });
    });
}

// 初始化定数变化图表
function initDsChangeChart(songId) {
    // 如果已经有图表实例，先销毁它
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    if (!dsChangeData || !dsChangeData[songId]) {
        document.getElementById('dsChangeChart').style.display = 'none';
        document.getElementById('ds-change-no-data').style.display = 'block';
        return;
    }
    
    document.getElementById('dsChangeChart').style.display = 'block';
    document.getElementById('ds-change-no-data').style.display = 'none';
    
    const songInfo = dsChangeData[songId];
    
    // 为每个难度准备数据
    const chartData = {};
    const versionsInSong = new Set();
    
    // 收集所有难度的版本数据
    for (const [diffKey, diffInfo] of Object.entries(songInfo.difficulties)) {
        chartData[diffKey] = [];
        
        // 遍历所有版本，按时间顺序收集数据
        for (const version of versionOrder) {
            if (diffInfo.versions[version] !== undefined) {
                versionsInSong.add(version);
                chartData[diffKey].push({
                    version: version,
                    ds: diffInfo.versions[version]
                });
            }
        }
    }
    
    // 如果没有版本数据，显示无数据提示
    if (versionsInSong.size === 0) {
        document.getElementById('dsChangeChart').style.display = 'none';
        document.getElementById('ds-change-no-data').style.display = 'block';
        return;
    }
    
    // 只显示相关版本，从歌曲所在的第一个版本开始
    const relevantVersions = versionOrder.filter(v => versionsInSong.has(v));
    
    // 准备图表数据
    const datasets = [];
    
    // 为每个难度添加数据集
    for (const [diffKey, dataPoints] of Object.entries(chartData)) {
        if (dataPoints.length === 0) continue;
        
        const color = difficultyColors[diffKey] || '#999999';
        const diffName = difficultyNames[diffKey] || diffKey;
        
        // 构建完整的数据点数组，包含空值以保持连续性
        const fullDataPoints = [];
        let lastKnownDs = null;
        
        for (const version of relevantVersions) {
            const dataPoint = dataPoints.find(p => p.version === version);
            
            if (dataPoint) {
                fullDataPoints.push(dataPoint.ds);
                lastKnownDs = dataPoint.ds;
            } else if (lastKnownDs !== null) {
                // 使用上一个已知的定数值
                fullDataPoints.push(lastKnownDs);
            } else {
                // 如果前面没有值，使用null表示缺失
                fullDataPoints.push(null);
            }
        }
        
        datasets.push({
            label: diffName,
            data: fullDataPoints,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.1,
            fill: false,
            pointRadius: 5,
            pointHoverRadius: 7
        });
    }
    
    // 创建图表
    const ctx = document.getElementById('dsChangeChart').getContext('2d');
    
    // 图表数据
    const chartDataConfig = {
        labels: relevantVersions,
        datasets: datasets
    };
    
    // 获取数据集中的所有非null值
    const allValues = datasets.flatMap(dataset => 
        dataset.data.filter(val => val !== null)
    );
    
    // 图表配置
    const config = {
        type: 'line',
        data: chartDataConfig,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                        }
                    },
                    // 添加点击外部区域隐藏标签的配置
                    external: function(context) {
                        // 在图表容器之外添加点击监听器以隐藏标签
                        const chartContainer = document.querySelector('.ds-change-chart-container');
                        document.addEventListener('click', function(e) {
                            if (!chartContainer.contains(e.target)) {
                                const tooltip = context.tooltip;
                                if (tooltip && tooltip.opacity !== 0) {
                                    tooltip.setActiveElements([], {x: 0, y: 0});
                                    context.chart.update();
                                }
                            }
                        });
                    }
                },
                title: {
                    display: true,
                    text: '定数变化历史',
                    font: {
                        size: 16
                    },
                    align: 'center', // 使标题居中对齐
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'y'
                    },
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'y',
                        onZoomComplete: function({chart}) {
                            chart.update('none');
                        }
                    },
                    limits: {
                        y: {min: 0, max: 15}
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        drawBorder: false
                    },
                    min: function() {
                        const min = Math.floor(Math.min(...allValues) - 0.5);
                        return Math.max(0, min);
                    },
                    max: function() {
                        const max = Math.ceil(Math.max(...allValues) + 0.5);
                        return max;
                    },
                    ticks: {
                        stepSize: 0.5
                    }
                }
            }
        }
    };
    
    // 创建图表
    currentChart = new Chart(ctx, config);
}