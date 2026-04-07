import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("surpluslink.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT NOT NULL,
    zone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('restaurant', 'ngo', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    zone TEXT NOT NULL,
    food_description TEXT NOT NULL,
    total_meals INTEGER NOT NULL,
    meals_remaining INTEGER NOT NULL,
    cooked_time DATETIME NOT NULL,
    expiry_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    ngo_id INTEGER NOT NULL,
    meals_claimed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED')),
    pickup_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    FOREIGN KEY (ngo_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    let token = req.cookies.token;
    
    // Fallback to Authorization header
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const { name, contact, address, zone, password, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = db.prepare(
        "INSERT INTO users (name, contact, address, zone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(name, contact, address, zone, hash, role);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { contact, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE contact = ?").get(contact);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, zone: user.zone }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { 
      httpOnly: true, 
      sameSite: "none", 
      secure: true,
      path: '/'
    });
    res.json({ id: user.id, role: user.role, name: user.name, zone: user.zone, token });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: '/'
    });
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json(null);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json(decoded);
    } catch (err) {
      res.json(null);
    }
  });

  // Listings
  app.post("/api/listings", authenticate, (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Only restaurants can create listings" });
    const { food_description, total_meals, cooked_time, pickup_window_hours } = req.body;
    const expiry_time = new Date(Date.now() + pickup_window_hours * 60 * 60 * 1000).toISOString();
    
    const result = db.prepare(
      "INSERT INTO listings (restaurant_id, zone, food_description, total_meals, meals_remaining, cooked_time, expiry_time) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(req.user.id, req.user.zone, food_description, total_meals, total_meals, cooked_time, expiry_time);
    
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/listings", authenticate, (req: any, res) => {
    // Auto-expire logic: update status if current time > expiry_time
    db.prepare("UPDATE listings SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expiry_time < ?").run(new Date().toISOString());

    const { zone, sort } = req.query;
    let query = "SELECT l.*, u.name as restaurant_name FROM listings l JOIN users u ON l.restaurant_id = u.id WHERE l.status = 'ACTIVE'";
    const params: any[] = [];

    if (zone) {
      query += " AND l.zone = ?";
      params.push(zone);
    }

    if (sort === 'newest') query += " ORDER BY l.created_at DESC";
    else if (sort === 'least_time') query += " ORDER BY l.expiry_time ASC";
    else if (sort === 'most_meals') query += " ORDER BY l.meals_remaining DESC";
    else query += " ORDER BY l.created_at DESC";

    const listings = db.prepare(query).all(...params);
    res.json(listings);
  });

  app.get("/api/listings/my", authenticate, (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    const listings = db.prepare(`
      SELECT l.*, u.name as restaurant_name 
      FROM listings l 
      JOIN users u ON l.restaurant_id = u.id 
      WHERE l.restaurant_id = ? 
      ORDER BY l.created_at DESC
    `).all(req.user.id);
    res.json(listings);
  });

  // Claims
  app.post("/api/claims", authenticate, (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Only NGOs can claim meals" });
    const { listing_id, meals_claimed } = req.body;

    const tx = db.transaction(() => {
      const listing: any = db.prepare("SELECT * FROM listings WHERE id = ? AND status = 'ACTIVE'").get(listing_id);
      if (!listing) throw new Error("Listing not found or expired");
      if (listing.meals_remaining < meals_claimed) throw new Error("Not enough meals remaining");

      db.prepare("UPDATE listings SET meals_remaining = meals_remaining - ? WHERE id = ?").run(meals_claimed, listing_id);
      const result = db.prepare(
        "INSERT INTO claims (listing_id, ngo_id, meals_claimed) VALUES (?, ?, ?)"
      ).run(listing_id, req.user.id, meals_claimed);

      return result.lastInsertRowid;
    });

    try {
      const claimId = tx();
      res.json({ id: claimId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/claims/my", authenticate, (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    const claims = db.prepare(`
      SELECT c.*, l.food_description, l.zone, u.name as restaurant_name 
      FROM claims c 
      JOIN listings l ON c.listing_id = l.id 
      JOIN users u ON l.restaurant_id = u.id 
      WHERE c.ngo_id = ? 
      ORDER BY c.created_at DESC
    `).all(req.user.id);
    res.json(claims);
  });

  app.get("/api/claims/listing/:id", authenticate, (req: any, res) => {
    const claims = db.prepare(`
      SELECT c.*, u.name as ngo_name, u.contact as ngo_contact 
      FROM claims c 
      JOIN users u ON c.ngo_id = u.id 
      WHERE c.listing_id = ?
    `).all(req.params.id);
    res.json(claims);
  });

  app.post("/api/claims/:id/pickup", authenticate, (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    db.prepare("UPDATE claims SET status = 'COMPLETED', pickup_time = ? WHERE id = ? AND ngo_id = ?")
      .run(new Date().toISOString(), req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Admin Stats
  app.get("/api/admin/stats", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const totalMealsListed = db.prepare("SELECT SUM(total_meals) as total FROM listings").get() as any;
    const totalMealsClaimed = db.prepare("SELECT SUM(meals_claimed) as total FROM claims").get() as any;
    const totalMealsPickedUp = db.prepare("SELECT SUM(meals_claimed) as total FROM claims WHERE status = 'COMPLETED'").get() as any;
    const activeListingsCount = db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'ACTIVE'").get() as any;
    const expiredListingsCount = db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'EXPIRED'").get() as any;
    const zoneDistribution = db.prepare("SELECT zone, COUNT(*) as count FROM listings GROUP BY zone").all();

    res.json({
      totalMealsListed: totalMealsListed.total || 0,
      totalMealsClaimed: totalMealsClaimed.total || 0,
      totalMealsPickedUp: totalMealsPickedUp.total || 0,
      activeListingsCount: activeListingsCount.count || 0,
      expiredListingsCount: expiredListingsCount.count || 0,
      zoneDistribution
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
