import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { SERVER_PORT } from '../../shared/constants';
import { LobbyRoom, getActiveTempleRooms } from './rooms/LobbyRoom';
import { TempleRoom, serverModerationLogs } from './rooms/TempleRoom';
import { containsProfanity, PROFANITY_NAME_ERROR } from './profanity';

export async function startChuaOnlineServer(port = Number(process.env.PORT) || SERVER_PORT) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Phục vụ trực tiếp thư mục tài sản âm thanh & mô hình
  const assetsDir = path.resolve(__dirname, '../../assets');
  app.use(express.static(assetsDir));

  // Phục vụ giao diện 3D Web Client đã build (để chạy chung 1 cổng 2567 khi đẩy qua ngrok / tunnel)
  const clientDistDir = path.resolve(__dirname, '../../client/dist');
  app.use(
    express.static(clientDistDir, {
      etag: false,
      lastModified: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    })
  );

  // API kiểm tra nhanh tên người dùng hoặc tên phòng
  app.post('/api/check-name', (req, res) => {
    const text = String(req.body?.text ?? '').trim();
    if (!text || text.length < 2) {
      res.json({ ok: false, message: 'Tên phải có ít nhất 2 ký tự' });
      return;
    }
    if (containsProfanity(text)) {
      res.json({ ok: false, message: PROFANITY_NAME_ERROR });
      return;
    }
    res.json({ ok: true });
  });

  // API xem danh sách phòng đang mở & log báo cáo tin nhắn
  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getActiveTempleRooms() });
  });

  app.get('/api/moderation-logs', (_req, res) => {
    res.json({ logs: serverModerationLogs });
  });

  // Bộ nhớ đệm âm thanh giọng đọc Kinh / Niệm Phật tiếng Việt (TTS)
  const ttsCache = new Map<string, Buffer>();

  app.get('/api/tts', (req, res) => {
    const rawText = String(req.query.text ?? '')
      .replace(/[🙏🪷🕯️📖✨🔔📿]/g, '')
      .trim()
      .slice(0, 200);

    if (!rawText) {
      res.status(400).end();
      return;
    }

    const cached = ttsCache.get(rawText);
    if (cached) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cached);
      return;
    }

    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(rawText)}`;
    https
      .get(
        ttsUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
          }
        },
        (ttsRes) => {
          if (ttsRes.statusCode !== 200) {
            res.status(502).end();
            return;
          }
          const chunks: Buffer[] = [];
          ttsRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          ttsRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (ttsCache.size > 200) {
              const firstKey = ttsCache.keys().next().value;
              if (firstKey) ttsCache.delete(firstKey);
            }
            ttsCache.set(rawText, buffer);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(buffer);
          });
        }
      )
      .on('error', () => {
        res.status(502).end();
      });
  });

  // API lấy tiêu đề Video YouTube nhanh qua oEmbed
  app.get('/api/yt-info', (req, res) => {
    const rawId = String(req.query.id ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 11);
    if (rawId.length !== 11) {
      res.json({ ok: false, title: 'Nhạc YouTube Tuỳ Chọn' });
      return;
    }
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${rawId}&format=json`;
    https
      .get(oembedUrl, (oRes) => {
        let body = '';
        oRes.on('data', (c) => (body += c));
        oRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            res.json({ ok: true, id: rawId, title: parsed.title || `Nhạc YouTube (${rawId})` });
          } catch {
            res.json({ ok: true, id: rawId, title: `Nhạc YouTube (${rawId})` });
          }
        });
      })
      .on('error', () => {
        res.json({ ok: true, id: rawId, title: `Nhạc YouTube (${rawId})` });
      });
  });

  // API Stream & Cache trực tiếp âm thanh MP3 từ mọi link YouTube (tương thích 100% iPhone Safari / Android / PC)
  app.get('/api/yt-stream', (req, res) => {
    const rawId = String(req.query.id ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 11);
    if (rawId.length !== 11) {
      res.status(400).end();
      return;
    }

    const audioDir = path.join(assetsDir, 'audio');
    const cachedMp3 = path.join(audioDir, `yt_${rawId}.mp3`);
    if (fs.existsSync(cachedMp3) && fs.statSync(cachedMp3).size > 32000) {
      res.sendFile(cachedMp3);
      return;
    }

    const ytUrl = `https://www.youtube.com/watch?v=${rawId}`;
    execFile(
      'python',
      [
        '-m',
        'yt_dlp',
        '--js-runtimes',
        'node',
        '--remote-components',
        'ejs:github',
        '--no-playlist',
        '-f',
        '139/140/ba',
        '-g',
        ytUrl
      ],
      { timeout: 20000 },
      (err, stdout) => {
        const directUrl = (stdout || '').trim().split(/\r?\n/)[0];
        if (err || !directUrl || !directUrl.startsWith('http')) {
          res.redirect(`/audio/yt_Qq6dBbRusdw.mp3`);
          return;
        }

        const ffmpegPath = fs.existsSync('C:\\ffmpeg\\bin\\ffmpeg.exe')
          ? 'C:\\ffmpeg\\bin\\ffmpeg.exe'
          : 'ffmpeg';

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');

        const ff = spawn(ffmpegPath, [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          directUrl,
          '-t',
          '600',
          '-vn',
          '-acodec',
          'libmp3lame',
          '-b:a',
          '96k',
          '-f',
          'mp3',
          'pipe:1'
        ]);

        const chunks: Buffer[] = [];
        ff.stdout.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
          if (!res.writableEnded) {
            res.write(chunk);
          }
        });

        ff.on('close', (code) => {
          if (!res.writableEnded) {
            res.end();
          }
          const fullBuf = Buffer.concat(chunks);
          if (code === 0 && fullBuf.length > 64000) {
            try {
              fs.writeFileSync(cachedMp3, fullBuf);
            } catch {
              // Ignore write error
            }
          }
        });

        ff.on('error', () => {
          if (!res.headersSent) {
            res.redirect(`/audio/yt_Qq6dBbRusdw.mp3`);
          } else if (!res.writableEnded) {
            res.end();
          }
        });
      }
    );
  });

  const httpServer = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer
    })
  });

  gameServer.define('lobby_room', LobbyRoom);
  gameServer.define('temple_room', TempleRoom);

  await gameServer.listen(port);

  // Khởi tạo sẵn 3 phòng mẫu tương ứng với 3 chủ đề để người chơi vào sảnh thấy ngay
  await seedDefaultRooms();

  console.log(`=====================================================`);
  console.log(`🙏 Server Chùa Online đang chạy tại ws://localhost:${port}`);
  console.log(`=====================================================`);

  return { app, httpServer, gameServer };
}

async function seedDefaultRooms(): Promise<void> {
  const existing = getActiveTempleRooms();
  if (existing.length > 0) return;

  await matchMaker.createRoom('temple_room', {
    roomName: 'Chánh Điện Tụng Kinh Sáng',
    theme: 'Tụng kinh sáng',
    maxClients: 50,
    isPrivate: false
  });

  await matchMaker.createRoom('temple_room', {
    roomName: 'Thiền Đường Tĩnh Tâm',
    theme: 'Thiền',
    maxClients: 30,
    isPrivate: false
  });

  await matchMaker.createRoom('temple_room', {
    roomName: 'Chùa Việt Bốn Phương',
    theme: 'Chung',
    maxClients: 50,
    isPrivate: false
  });

  await matchMaker.createRoom('temple_room', {
    roomName: 'Nhà Thờ Chính Tòa Bốn Phương',
    theme: 'Nhà Thờ Công Giáo',
    maxClients: 50,
    isPrivate: false
  });

  await matchMaker.createRoom('temple_room', {
    roomName: 'Thánh Đường Cầu Nguyện Sáng',
    theme: 'Nhà Thờ Công Giáo',
    maxClients: 50,
    isPrivate: false
  });
}

if (require.main === module) {
  startChuaOnlineServer().catch((err) => {
    console.error('Lỗi khởi động Server:', err);
    process.exit(1);
  });
}
