// 定数变化处理模块
let dsChangeData = null; // 存储定数变化数据
const versionOrder = [
    "maimai",
    "maimai PLUS",
    "maimai GreeN",
    "maimai GreeN PLUS",
    "maimai ORANGE",
    "maimai ORANGE PLUS",
    "maimai PiNK",
    "maimai PiNK PLUS",
    "maimai MURASAKi",
    "maimai MURASAKi PLUS",
    "maimai MiLK",
    "maimai MiLK PLUS",
    "maimai FiNALE",
    "maimai DX",
    "maimai DX PLUS",
    "maimai DX Splash",
    "maimai DX Splash PLUS",
    "maimai DX UNiVERSE",
    "maimai DX UNiVERSE PLUS",
    "maimai DX FESTiVAL",
    "maimai DX FESTiVAL PLUS",
    "maimai DX BUDDiES",
    "maimai DX BUDDiES PLUS",
    "maimai DX PRiSM",
    "maimai DX PRiSM PLUS"
];

// 颜色映射
const difficultyColors = {
    "basic": "#4CAF50",
    "advanced": "#FFC107",
    "expert": "#F44336",
    "master": "#9C27B0",
    "remaster": "#9C27B0"
};

// 难度映射
const difficultyMapping = {
    0: "basic",
    1: "advanced",
    2: "expert",
    3: "master",
    4: "remaster"
};

// 难度名称映射
const difficultyNames = {
    "basic": "Basic",
    "advanced": "Advanced",
    "expert": "Expert",
    "master": "Master",
    "remaster": "Re:Master"
};

// 加载定数变化数据
async function loadDsChangeData() {
    try {
        const response = await fetch('static/dschange.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 转换数据为更易于使用的格式
        dsChangeData = processRawDsChangeData(data);
        return dsChangeData;
    } catch (error) {
        console.error('Error loading DS change data:', error);
        return null;
    }
}

// 处理原始定数变化数据为更易于使用的格式
function processRawDsChangeData(rawData) {
    const processedData = {};
    
    for (const [songId, songInfo] of Object.entries(rawData)) {
        if (!songInfo.ds || songInfo.ds.length === 0) continue;
        
        processedData[songId] = {
            id: songId,
            name: songInfo.name || "",
            difficulties: {}
        };
        
        // 处理每个难度的定数变化
        songInfo.ds.forEach((diffInfo, index) => {
            if (!diffInfo || Object.keys(diffInfo).length === 0) return;
            
            const diffKey = difficultyMapping[index] || `difficulty_${index}`;
            
            processedData[songId].difficulties[diffKey] = {
                versions: diffInfo
            };
        });
    }
    
    return processedData;
}

// 获取指定歌曲的定数变化信息
function getSongDsChangeInfo(songId) {
    if (!dsChangeData || !dsChangeData[songId]) {
        return null;
    }
    
    return dsChangeData[songId];
}

// 获取最新版本中某歌曲某难度的定数
function getLatestDs(songId, difficultyIndex) {
    if (!dsChangeData || !dsChangeData[songId]) {
        return null;
    }
    
    const diffKey = difficultyMapping[difficultyIndex] || `difficulty_${difficultyIndex}`;
    const diffInfo = dsChangeData[songId].difficulties[diffKey];
    
    if (!diffInfo) {
        return null;
    }
    
    // 按版本顺序找到最新的定数
    let latestDs = null;
    for (let i = versionOrder.length - 1; i >= 0; i--) {
        const version = versionOrder[i];
        if (diffInfo.versions[version] !== undefined) {
            latestDs = diffInfo.versions[version];
            break;
        }
    }
    
    return latestDs;
}

// 生成定数变化的折线图
function generateDsChangeChart(songId) {
    if (!dsChangeData || !dsChangeData[songId]) {
        return '<div class="no-data">无定数变化数据</div>';
    }
    
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
    
    // 如果没有版本数据，返回无数据提示
    if (versionsInSong.size === 0) {
        return '<div class="no-data">无定数变化数据</div>';
    }
    
    // 只显示相关版本，从歌曲所在的第一个版本开始
    const relevantVersions = versionOrder.filter(v => versionsInSong.has(v));
    
    // 创建图表容器
    let chartHtml = `
        <div class="ds-change-chart-container">
            <canvas id="dsChangeChart" width="800" height="400"></canvas>
        </div>
        <script>
        // 在文档加载完成后初始化图表
        document.addEventListener('DOMContentLoaded', function() {
            // 如果图表已经存在，先销毁它
            if (window.dsChart) {
                window.dsChart.destroy();
            }
            
            const ctx = document.getElementById('dsChangeChart').getContext('2d');
            
            // 图表数据
            const chartData = {
                labels: ${JSON.stringify(relevantVersions)},
                datasets: [
    `;
    
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
        
        chartHtml += `
                {
                    label: '${diffName}',
                    data: ${JSON.stringify(fullDataPoints)},
                    borderColor: '${color}',
                    backgroundColor: '${color}20',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
        `;
    }
    
    // 关闭数据集数组和图表配置
    chartHtml += `
                ]
            };
            
            // 图表配置
            const config = {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '定数变化历史',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                                }
                            }
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
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
                            min: function(context) {
                                const min = Math.floor(Math.min(...chartData.datasets.flatMap(dataset => 
                                    dataset.data.filter(val => val !== null)
                                )) - 0.5);
                                return Math.max(0, min);
                            },
                            max: function(context) {
                                const max = Math.ceil(Math.max(...chartData.datasets.flatMap(dataset => 
                                    dataset.data.filter(val => val !== null)
                                )) + 0.5);
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
            window.dsChart = new Chart(ctx, config);
        });
        </script>
    `;
    
    return chartHtml;
}