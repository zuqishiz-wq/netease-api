const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { cloudsearch, song_url_v1, song_detail, lyric_new, register_anonimous } = require('NeteaseCloudMusicApi');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// 本地音乐目录
const LOCAL_MUSIC_DIRS = ['D:/音乐', 'D:/新建文件夹/music-server/music'];
const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus']);

function scanLocalMusic() {
  const songs = [];
  const seen = new Set();
  for (const dir of LOCAL_MUSIC_DIRS) {
    try {
      for (const f of fs.readdirSync(dir)) {
        const ext = path.extname(f).toLowerCase();
        if (AUDIO_EXTS.has(ext) && !seen.has(f)) {
          seen.add(f);
          songs.push({ id: 'local_' + Buffer.from(f).toString('base64'), name: path.basename(f, ext), file: f, dir, artist: '本地音乐' });
        }
      }
    } catch(e) {}
  }
  return songs;
}

// 全局匿名 cookie
let anonCookie = '';

async function initAnon() {
  try {
    const r = await register_anonimous();
    if (r.body.cookie) {
      anonCookie = r.body.cookie;
      console.log('匿名登录成功');
    }
  } catch (e) {
    console.error('匿名登录失败:', e.message);
  }
}

// 健康检查
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: '网易云音乐 API' });
});

// 搜索（自动补封面）
app.get('/search', async (req, res) => {
  try {
    const { keywords, limit = 20, offset = 0, type = 1 } = req.query;
    if (!keywords) return res.status(400).json({ error: 'keywords required' });
    const result = await cloudsearch({ keywords, limit: +limit, offset: +offset, type: +type, cookie: anonCookie });
    const songs = result.body.result?.songs || [];
    // 批量获取封面
    if (songs.length > 0) {
      const ids = songs.map(s => s.id).join(',');
      try {
        const detail = await song_detail({ ids, cookie: anonCookie });
        const detailSongs = detail.body?.songs || [];
        const coverMap = {};
        detailSongs.forEach(s => { if (s.al?.picUrl) coverMap[s.id] = s.al.picUrl; });
        songs.forEach(s => { if (coverMap[s.id]) { if (!s.al) s.al = {}; s.al.picUrl = coverMap[s.id]; } });
      } catch(e) {}
    }
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
    const result = await song_url_v1({ id, level, cookie: anonCookie });
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
    const result = await song_detail({ ids: ids.toString(), cookie: anonCookie });
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
    const result = await lyric_new({ id, cookie: anonCookie });
    res.json(result.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 本地音乐列表
app.get('/local/list', (req, res) => {
  res.json({ songs: scanLocalMusic() });
});

// 本地音乐搜索
app.get('/local/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const songs = scanLocalMusic().filter(s => s.name.toLowerCase().includes(q));
  res.json({ songs });
});

// 本地音乐流式播放
app.get('/local/stream', (req, res) => {
  const file = req.query.f;
  if (!file) return res.status(400).json({ error: 'f required' });
  for (const dir of LOCAL_MUSIC_DIRS) {
    const fp = path.join(dir, file);
    if (fs.existsSync(fp)) return res.sendFile(path.resolve(fp));
  }
  res.status(404).json({ error: 'file not found' });
});

app.use((req, res) => res.status(404).json({ error: 'not found' }));

initAnon().then(() => {
  app.listen(PORT, () => console.log(`API 运行在端口 ${PORT}`));
});
