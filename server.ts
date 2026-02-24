import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { parse } from "csv-parse/sync";
import Database from "better-sqlite3";
import path from "path";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const db = new Database("unihub.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    sender TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chat_status (
    chat_id TEXT PRIMARY KEY,
    buyer_accepted INTEGER DEFAULT 0,
    seller_accepted INTEGER DEFAULT 0,
    buyer_completed INTEGER DEFAULT 0,
    seller_completed INTEGER DEFAULT 0,
    buyer_review TEXT,
    seller_review TEXT
  );
`);

// Migration: Ensure columns exist (for existing databases)
try {
  db.exec("ALTER TABLE chat_status ADD COLUMN buyer_accepted INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE chat_status ADD COLUMN seller_accepted INTEGER DEFAULT 0");
} catch (e) {}


app.use(express.json());

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT6AXyUUpakG2OlV2Tr3Xh5Qs7gR4FeiYiYXNC1nFBIxGUbB1eSuDZveOWKjBqK7OZ5_fgGaZ98iIFI/pub?output=csv";

// API: Fetch posts from Google Sheets
app.get("/api/posts", async (req, res) => {
  try {
    const response = await fetch(SHEET_URL);
    const csvData = await response.text();
    console.log("CSV Data length:", csvData.length);
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });
    console.log("First record keys:", records.length > 0 ? Object.keys(records[0]) : "No records");
    
    // Map sheet columns to our app's structure
    const posts = records.map((r: any, index: number) => {
      // Find values by looking for keywords in keys
      const findVal = (keywords: string[]) => {
        const key = Object.keys(r).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
        return key ? r[key] : null;
      };

      return {
        id: index,
        category: findVal(["danh mục", "loại", "category"]) || "Khác",
        time: findVal(["dấu thời gian", "timestamp", "thời gian", "ngày"]) || "Vừa xong",
        title: findVal(["Bạn muốn đăng tin vào đâu?", "tiêu đề", "nội dung", "title"]) || "Không có tiêu đề",
        author: findVal(["họ và tên", "người đăng", "tên", "author"]) || "Ẩn danh",
        karma: parseInt(findVal(["karma", "điểm"])) || 0,
        avatar: findVal(["avatar", "ảnh"]) || `https://picsum.photos/seed/${index}/100/100`,
        email: findVal(["email", "thư điện tử", "địa chỉ email"]),
        contact: findVal(["SĐT / link Zalo / link Facebook", "contact", "liên hệ", "số điện thoại", "zalo", "facebook"]),
        details: r // Keep all fields for detail view
      };
    });

    // Get all chat statuses to filter/sort
    const statuses = db.prepare("SELECT * FROM chat_status").all() as any[];
    const statusMap = new Map(statuses.map(s => [s.chat_id, s]));

    const filteredPosts = posts.filter(post => {
      const status = statusMap.get(post.id.toString());
      if (status && status.buyer_completed && status.seller_completed) {
        return false; // Hide completed posts
      }
      return true;
    });

    // Sort: accepted posts go to the end
    filteredPosts.sort((a, b) => {
      const statusA = statusMap.get(a.id.toString());
      const statusB = statusMap.get(b.id.toString());
      const acceptedA = statusA && statusA.buyer_accepted && statusA.seller_accepted ? 1 : 0;
      const acceptedB = statusB && statusB.buyer_accepted && statusB.seller_accepted ? 1 : 0;
      return acceptedA - acceptedB;
    });

    res.json(filteredPosts);
  } catch (error) {
    console.error("Error fetching sheet:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// API: Get chat history
app.get("/api/chat/:chatId", (req, res) => {
  const messages = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC").all(req.params.chatId);
  const status = db.prepare("SELECT * FROM chat_status WHERE chat_id = ?").get(req.params.chatId);
  res.json({ messages, status: status || { buyer_accepted: 0, seller_accepted: 0, buyer_completed: 0, seller_completed: 0 } });
});

// API: Accept support
app.post("/api/chat/:chatId/accept", (req, res) => {
  const { role } = req.body; // 'buyer' or 'seller'
  const chatId = req.params.chatId;
  
  const status = db.prepare("SELECT * FROM chat_status WHERE chat_id = ?").get(chatId);
  if (!status) {
    db.prepare("INSERT INTO chat_status (chat_id, buyer_accepted, seller_accepted) VALUES (?, ?, ?)").run(
      chatId, 
      role === 'buyer' ? 1 : 0, 
      role === 'seller' ? 1 : 0
    );
  } else {
    if (role === 'buyer') {
      db.prepare("UPDATE chat_status SET buyer_accepted = 1 WHERE chat_id = ?").run(chatId);
    } else {
      db.prepare("UPDATE chat_status SET seller_accepted = 1 WHERE chat_id = ?").run(chatId);
    }
  }
  
  const updatedStatus = db.prepare("SELECT * FROM chat_status WHERE chat_id = ?").get(chatId);
  broadcast(chatId, { type: 'status_update', status: updatedStatus });
  res.json(updatedStatus);
});

// API: Complete support
app.post("/api/chat/:chatId/complete", (req, res) => {
  const { role } = req.body; // 'buyer' or 'seller'
  const chatId = req.params.chatId;
  
  const status = db.prepare("SELECT * FROM chat_status WHERE chat_id = ?").get(chatId);
  if (!status) {
    db.prepare("INSERT INTO chat_status (chat_id, buyer_completed, seller_completed) VALUES (?, ?, ?)").run(
      chatId, 
      role === 'buyer' ? 1 : 0, 
      role === 'seller' ? 1 : 0
    );
  } else {
    if (role === 'buyer') {
      db.prepare("UPDATE chat_status SET buyer_completed = 1 WHERE chat_id = ?").run(chatId);
    } else {
      db.prepare("UPDATE chat_status SET seller_completed = 1 WHERE chat_id = ?").run(chatId);
    }
  }
  
  const updatedStatus = db.prepare("SELECT * FROM chat_status WHERE chat_id = ?").get(chatId);
  
  // Broadcast update
  broadcast(chatId, { type: 'status_update', status: updatedStatus });
  
  res.json(updatedStatus);
});

// WebSocket Chat
const clients = new Map<string, Set<WebSocket>>();

function broadcast(chatId: string, message: any) {
  const chatClients = clients.get(chatId);
  if (chatClients) {
    const payload = JSON.stringify(message);
    chatClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const chatId = url.searchParams.get("chatId");
  
  if (!chatId) {
    ws.close();
    return;
  }

  if (!clients.has(chatId)) {
    clients.set(chatId, new Set());
  }
  clients.get(chatId)!.add(ws);

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'message') {
      const stmt = db.prepare("INSERT INTO messages (chat_id, sender, content) VALUES (?, ?, ?)");
      const info = stmt.run(chatId, msg.sender, msg.content);
      
      broadcast(chatId, {
        type: 'message',
        id: info.lastInsertRowid,
        sender: msg.sender,
        content: msg.content,
        timestamp: new Date().toISOString()
      });
    }
  });

  ws.on("close", () => {
    clients.get(chatId)?.delete(ws);
  });
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
