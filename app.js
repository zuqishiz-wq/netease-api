const express = require('express');
const cors = require('cors');
const { search, song_url_v1, song_detail, lyric_new } = require('NeteaseCloudMusicApi');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 健康检查
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: '网易云音乐 API' });
});

// 搜索
app.get('/search', async (req, res) => {
  try {
    const { keywords, limit = 20, offset = 0, type = 1 } = req.query;
    if (!keywords) return res.status(400).json({ error: 'keywords required' });
    const result = await search({ keywords, limit: +limit, offset: +offset, type: +type });
    res.json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取播放链接
app.get('/song/url', async (req, res) => {
  try {
    const { id, level = 'standard' } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const result = await song_url_v1({ id, level });
    res.json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 歌曲详情
app.get('/song/detail', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'ids required' });
    const result = await song_detail({ ids: ids.toString() });
    res.json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 歌词
app.get('/lyric', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const result = await lyric_new({ id });
    res.json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => console.log(`API 服务运行在端口 ${PORT}`));
