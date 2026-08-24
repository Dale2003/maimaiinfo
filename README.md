# maimaiinfo

## 项目简介
maimaiinfo 是一个用于查询和展示音乐曲目信息的Web应用。用户可以通过输入曲目ID、曲名或别名来搜索相关的音乐信息，并在模态框中查看详细数据。

## 文件结构
```
maimaiinfo
├── index.html          # 主HTML文档，包含网页结构和脚本
├── static
│   ├── all_data.json   # 包含音乐数据的JSON文件
│   ├── dschange.json    # 历代定数变化
│   ├── course.json      # 段位与课题曲数据
│   ├── css
│   │   └── style.css    # 应用的CSS样式文件
│   ├── js
│   │   └── main.js      # 应用的JavaScript逻辑文件
│   └── img
│       └── favicon.ico   # 应用的favicon图标
└── README.md           # 项目文档
```

## 安装与使用
1. **克隆项目**
   ```bash
   git clone https://github.com/Dale2003/maimaiinfo.git
   cd maimaiinfo
   ```

2. **打开index.html**
   使用浏览器打开 `index.html` 文件，即可访问应用。

## 功能
- **搜索功能**: 用户可以通过输入曲目ID、曲名或别名来搜索音乐。
- **模态框展示**: 搜索结果将以模态框的形式展示详细信息，包括曲目ID、类型、等级、艺术家等。
- **加载提示**: 在数据加载过程中，用户将看到一个加载提示。

## 更新数据

仓库中的三份业务数据由当前 meowmeow 运行时数据生成：

- `all_data.json`：以 `more_music_data.json` 为完整曲库，合并正式别名、本地别名和谱面拟合定数。
- `dschange.json`：同步定数变更历史。
- `course.json`：同步段位与课题曲数据。

在 `bot/maimaiinfo` 目录运行：

```bash
python3 scripts/build_static_data.py
python3 scripts/build_static_data.py --check
```

默认从相邻的 `bot/static` 与 `bot/meowmeow` 读取数据；也可以通过 `--source-root` 指定其他 `bot` 目录。

## 贡献
欢迎任何形式的贡献！如果您有建议或发现问题，请提交issue或pull request。

## 致谢
- 谱面数据来源：水鱼查分器
- 曲绘数据来源：落雪查分器
- 别名数据来源：Yuri-YuzuChaN

## 许可证
本项目采用MIT许可证，详情请参阅LICENSE文件。
