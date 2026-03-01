import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-songs',
      configureServer(server) {
        server.middlewares.use('/songs', (req, res, next) => {
          const decoded = decodeURIComponent(req.url || '').replace(/^\//, '')
          const filePath = path.join(__dirname, '../songs', decoded)

          // Prevent directory traversal
          const songsRoot = path.resolve(__dirname, '../songs') + path.sep
          const resolved = path.resolve(filePath)
          if (!resolved.startsWith(songsRoot)) {
            next()
            return
          }

          try {
            const stat = fs.statSync(filePath)
            if (!stat.isFile()) {
              next()
              return
            }

            const ext = path.extname(filePath).toLowerCase()
            const mime = MIME_TYPES[ext] || 'application/octet-stream'
            res.setHeader('Content-Type', mime)
            res.setHeader('Content-Length', stat.size)
            res.setHeader('Accept-Ranges', 'bytes')

            // Support range requests for audio seeking
            const range = req.headers.range
            if (range) {
              const parts = range.replace(/bytes=/, '').split('-')
              const start = parseInt(parts[0], 10)
              const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Content-Length': end - start + 1,
                'Content-Type': mime,
              })
              fs.createReadStream(filePath, { start, end }).pipe(res)
            } else {
              fs.createReadStream(filePath).pipe(res)
            }
          } catch {
            next()
          }
        })
      },
    },
  ],
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
