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
    org_name TEXT NOT NULL,
    contact TEXT UNIQUE,
    email TEXT UNIQUE,
    address TEXT NOT NULL,
    zone TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('restaurant', 'ngo', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    zone TEXT NOT NULL,
    food_description TEXT NOT NULL,
    category TEXT DEFAULT 'NORMAL', -- 'NORMAL', 'BAKERY_SWEETS'
    total_meals INTEGER NOT NULL,
    meals_remaining INTEGER NOT NULL,
    cooked_time DATETIME NOT NULL,
    expiry_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'REMOVED', 'EDITED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    ngo_id INTEGER NOT NULL,
    meals_claimed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    pickup_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    FOREIGN KEY (ngo_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'CLAIM', 'EXPIRY_WARNING'
    message TEXT NOT NULL,
    related_id INTEGER, -- listing_id, claim_id etc
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration for existing databases
try {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
} catch (e) {}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)");
} catch (e) {}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_contact ON users(contact)");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN org_name TEXT");
} catch (e) {}
try {
  db.exec("UPDATE users SET org_name = name WHERE org_name IS NULL");
} catch (e) {}

try {
  db.exec("ALTER TABLE listings ADD COLUMN category TEXT DEFAULT 'NORMAL'");
} catch (e) {}

// Migration for listings status constraint
try {
  // Check if the current schema supports 'REMOVED' status
  let migrationNeeded = false;
  try {
    db.exec(`
      INSERT INTO listings (id, restaurant_id, zone, food_description, total_meals, meals_remaining, cooked_time, expiry_time, status) 
      VALUES (-999, 0, 'TEMP', 'TEMP', 0, 0, '2026-01-01', '2026-01-01', 'REMOVED')
    `);
    db.exec("DELETE FROM listings WHERE id = -999");
  } catch (err: any) {
    if (err.message.includes("CHECK constraint failed")) {
      migrationNeeded = true;
    }
  }

  if (migrationNeeded) {
    console.log("Migrating listings table to update status constraint...");
    db.exec("PRAGMA foreign_keys = OFF");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE listings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id INTEGER NOT NULL,
          zone TEXT NOT NULL,
          food_description TEXT NOT NULL,
          category TEXT DEFAULT 'NORMAL',
          total_meals INTEGER NOT NULL,
          meals_remaining INTEGER NOT NULL,
          cooked_time DATETIME NOT NULL,
          expiry_time DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'REMOVED', 'EDITED')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (restaurant_id) REFERENCES users(id)
        );
      `);
      
      // Copy data, ensuring category exists
      db.exec(`
        INSERT INTO listings_new (id, restaurant_id, zone, food_description, category, total_meals, meals_remaining, cooked_time, expiry_time, status, created_at)
        SELECT id, restaurant_id, zone, food_description, COALESCE(category, 'NORMAL'), total_meals, meals_remaining, cooked_time, expiry_time, status, created_at 
        FROM listings;
      `);
      
      db.exec("DROP TABLE listings;");
      db.exec("ALTER TABLE listings_new RENAME TO listings;");
    })();
    db.exec("PRAGMA foreign_keys = ON");
    console.log("Listings migration successful.");
  }
} catch (e) {
  console.error("Listings migration failed:", e);
  db.exec("PRAGMA foreign_keys = ON");
}

// Migration for claims status constraint
try {
  let migrationNeeded = false;
  try {
    db.exec(`
      INSERT INTO claims (id, listing_id, ngo_id, meals_claimed, status) 
      VALUES (-999, 0, 0, 0, 'CANCELLED')
    `);
    db.exec("DELETE FROM claims WHERE id = -999");
  } catch (err: any) {
    if (err.message.includes("CHECK constraint failed")) {
      migrationNeeded = true;
    }
  }

  if (migrationNeeded) {
    console.log("Migrating claims table to update status constraint...");
    db.exec("PRAGMA foreign_keys = OFF");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE claims_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          listing_id INTEGER NOT NULL,
          ngo_id INTEGER NOT NULL,
          meals_claimed INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
          pickup_time DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (listing_id) REFERENCES listings(id),
          FOREIGN KEY (ngo_id) REFERENCES users(id)
        );
      `);
      
      db.exec(`
        INSERT INTO claims_new (id, listing_id, ngo_id, meals_claimed, status, pickup_time, created_at)
        SELECT id, listing_id, ngo_id, meals_claimed, status, pickup_time, created_at FROM claims;
      `);
      
      db.exec("DROP TABLE claims;");
      db.exec("ALTER TABLE claims_new RENAME TO claims;");
    })();
    db.exec("PRAGMA foreign_keys = ON");
    console.log("Claims migration successful.");
  }
} catch (e) {
  console.error("Claims migration failed:", e);
  db.exec("PRAGMA foreign_keys = ON");
}

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
    const { name, orgName, contact, email, address, zone, password, role } = req.body;
    try {
      // 1. Check if email already exists
      if (email) {
        const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (existingEmail) return res.status(400).json({ error: "A user with this email already exists" });
      }

      // 2. Check if contact already exists
      if (contact) {
        const existingContact = db.prepare("SELECT id FROM users WHERE contact = ?").get(contact);
        if (existingContact) return res.status(400).json({ error: "A user with this contact number already exists" });
      }

      // 3. User requested unique passwords across all users
      if (password) {
        const allHashes = db.prepare("SELECT password_hash FROM users WHERE password_hash IS NOT NULL").all() as { password_hash: string }[];
        for (const { password_hash } of allHashes) {
          const isMatch = await bcrypt.compare(password, password_hash);
          if (isMatch) {
            return res.status(400).json({ error: "This password has already been used by another user. Please choose a unique password for security." });
          }
        }
      }

      const hash = password ? await bcrypt.hash(password, 10) : null;
      const result = db.prepare(
        "INSERT INTO users (name, org_name, contact, email, address, zone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, orgName, contact || null, email || null, address, zone, hash, role);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { contact, email, password } = req.body;
    let user: any;
    if (contact) {
      user = db.prepare("SELECT * FROM users WHERE contact = ?").get(contact);
    } else if (email) {
      user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    }

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, orgName: user.org_name, zone: user.zone }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { 
      httpOnly: true, 
      sameSite: "none", 
      secure: true,
      path: '/'
    });
    res.json({ id: user.id, role: user.role, name: user.name, orgName: user.org_name, zone: user.zone, token });
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
    let token = req.cookies.token;
    
    // Fallback to Authorization header for consistency
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) return res.json(null);
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT id, name, org_name as orgName, contact, email, address, zone, role FROM users WHERE id = ?").get(decoded.id);
      if (!user) return res.json(null);
      res.json(user);
    } catch (err) {
      res.json(null);
    }
  });

  app.put("/api/auth/me", authenticate, async (req: any, res) => {
    const { name, orgName, contact, email, address, zone } = req.body;
    
    if (!name || !orgName || !address || !zone) {
      return res.status(400).json({ error: "Missing required fields: name, organization name, address, and zone are required." });
    }

    try {
      // Check for unique constraints if they changed
      if (email) {
        const existingEmail = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, req.user.id);
        if (existingEmail) return res.status(400).json({ error: "Email already taken by another user" });
      }
      if (contact) {
        const existingContact = db.prepare("SELECT id FROM users WHERE contact = ? AND id != ?").get(contact, req.user.id);
        if (existingContact) return res.status(400).json({ error: "Contact number already taken by another user" });
      }

      db.prepare(`
        UPDATE users 
        SET name = ?, org_name = ?, contact = ?, email = ?, address = ?, zone = ?
        WHERE id = ?
      `).run(name, orgName, contact, email, address, zone, req.user.id);

      // Return updated user info (need to re-fetch to get correct fields)
      const updatedUser: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
      
      // Update token (optional, but good for local session if claims changed)
      const token = jwt.sign({ 
        id: updatedUser.id, 
        role: updatedUser.role, 
        name: updatedUser.name, 
        orgName: updatedUser.org_name, 
        zone: updatedUser.zone 
      }, JWT_SECRET, { expiresIn: "24h" });
      
      res.cookie("token", token, { 
        httpOnly: true, 
        sameSite: "none", 
        secure: true,
        path: '/'
      });

      res.json({ 
        id: updatedUser.id, 
        role: updatedUser.role, 
        name: updatedUser.name, 
        orgName: updatedUser.org_name, 
        zone: updatedUser.zone,
        contact: updatedUser.contact,
        email: updatedUser.email,
        address: updatedUser.address,
        token 
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Listings
  app.post("/api/listings", authenticate, (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Only restaurants can create listings" });
    const { food_description, total_meals, cooked_time, category } = req.body;
    
    // Normal: 4 hours, Bakery/Sweets: 6 hours
    const durationHours = category === 'BAKERY_SWEETS' ? 6 : 4;
    const expiry_time = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    
    const result = db.prepare(
      "INSERT INTO listings (restaurant_id, zone, food_description, category, total_meals, meals_remaining, cooked_time, expiry_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(req.user.id, req.user.zone, food_description, category || 'NORMAL', total_meals, total_meals, cooked_time, expiry_time);
    
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/listings/:id", authenticate, (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    const listingId = parseInt(req.params.id);
    const result = db.prepare("UPDATE listings SET status = 'REMOVED' WHERE id = ? AND restaurant_id = ? AND status IN ('ACTIVE', 'EDITED')")
      .run(listingId, req.user.id);
    
    if (result.changes === 0) return res.status(400).json({ error: "Listing not found or already removed/expired" });
    res.json({ success: true });
  });

  app.put("/api/listings/:id", authenticate, (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    const listingId = parseInt(req.params.id);
    const { food_description, total_meals } = req.body;
    
    const tx = db.transaction(() => {
      const listing: any = db.prepare("SELECT * FROM listings WHERE id = ? AND restaurant_id = ?").get(listingId, req.user.id);
      if (!listing) throw new Error("Listing not found");
      if (listing.status !== 'ACTIVE' && listing.status !== 'EDITED') throw new Error("Cannot edit inactive listing");

      const mealsClaimed = listing.total_meals - listing.meals_remaining;
      if (total_meals < mealsClaimed) {
        throw new Error(`Cannot set total meals to ${total_meals} because ${mealsClaimed} meals have already been claimed.`);
      }

      const newMealsRemaining = total_meals - mealsClaimed;

      db.prepare(`
        UPDATE listings 
        SET food_description = ?, total_meals = ?, meals_remaining = ?, status = 'EDITED'
        WHERE id = ?
      `).run(food_description, total_meals, newMealsRemaining, listingId);

      return true;
    });

    try {
      tx();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/listings", authenticate, (req: any, res) => {
    try {
      // Auto-expire logic: update status if current time > expiry_time
      const now = new Date().toISOString();
      db.prepare("UPDATE listings SET status = 'EXPIRED' WHERE status IN ('ACTIVE', 'EDITED') AND expiry_time < ?").run(now);

      const { zone, sort } = req.query;
      console.log(`Fetching listings. Zone: "${zone}", Sort: "${sort}", Now: ${now}`);
      
      // Use LEFT JOIN to ensure listings show up even if user data is missing (though it shouldn't be)
      let query = `
        SELECT l.*, u.org_name as restaurant_name 
        FROM listings l 
        LEFT JOIN users u ON l.restaurant_id = u.id 
        WHERE l.status IN ('ACTIVE', 'EDITED') AND l.meals_remaining > 0
      `;
      const params: any[] = [];

      // Handle empty zone filter correctly
      if (zone && typeof zone === 'string' && zone.trim() !== "") {
        query += " AND l.zone = ?";
        params.push(zone.trim());
      }

      if (sort === 'least_time') query += " ORDER BY l.expiry_time ASC";
      else if (sort === 'most_meals') query += " ORDER BY l.meals_remaining DESC";
      else query += " ORDER BY l.created_at DESC";

      const listings = db.prepare(query).all(...params);
      console.log(`Found ${listings.length} active listings for query`);
      res.json(listings);
    } catch (err: any) {
      console.error("Database error in GET /api/listings:", err);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Debug route to check listings table
  app.get("/api/debug/listings", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') {
      // Allow for now to debug, but normally restricted
      // return res.status(403).json({ error: "Forbidden" });
    }
    const allListings = db.prepare("SELECT * FROM listings").all();
    const allUsers = db.prepare("SELECT id, name, org_name, role, zone FROM users").all();
    res.json({ listings: allListings, users: allUsers, serverTime: new Date().toISOString() });
  });

  app.get("/api/listings/my", authenticate, (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    
    // Auto-expire logic consistency
    const now = new Date().toISOString();
    db.prepare("UPDATE listings SET status = 'EXPIRED' WHERE status IN ('ACTIVE', 'EDITED') AND expiry_time < ? AND restaurant_id = ?")
      .run(now, req.user.id);

    const listings = db.prepare(`
      SELECT l.*, u.org_name as restaurant_name 
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

      // Create notification for restaurant
      db.prepare(`
        INSERT INTO notifications (user_id, type, message, related_id)
        VALUES (?, 'CLAIM', ?, ?)
      `).run(
        listing.restaurant_id,
        `${req.user.orgName} has claimed ${meals_claimed} meals from your "${listing.food_description}" listing.`,
        listing_id
      );

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
      SELECT c.*, l.food_description, l.zone, u.org_name as restaurant_name 
      FROM claims c 
      JOIN listings l ON c.listing_id = l.id 
      JOIN users u ON l.restaurant_id = u.id 
      WHERE c.ngo_id = ? 
      ORDER BY c.created_at DESC
    `).all(req.user.id);
    res.json(claims);
  });

  app.get("/api/claims/listing/:id", authenticate, (req: any, res) => {
    const listingId = parseInt(req.params.id);
    const claims = db.prepare(`
      SELECT c.*, u.org_name as ngo_name, u.contact as ngo_contact 
      FROM claims c 
      JOIN users u ON c.ngo_id = u.id 
      WHERE c.listing_id = ?
    `).all(listingId);
    res.json(claims);
  });

  app.post("/api/claims/:id/pickup", authenticate, (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    const claimId = parseInt(req.params.id);
    db.prepare("UPDATE claims SET status = 'COMPLETED', pickup_time = ? WHERE id = ? AND ngo_id = ? AND status = 'PENDING'")
      .run(new Date().toISOString(), claimId, req.user.id);
    res.json({ success: true });
  });

  app.post("/api/claims/:id/cancel", authenticate, (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    const claimId = parseInt(req.params.id);
    
    const tx = db.transaction(() => {
      const claim: any = db.prepare("SELECT * FROM claims WHERE id = ? AND ngo_id = ? AND status = 'PENDING'").get(claimId, req.user.id);
      if (!claim) throw new Error("Claim not found or already picked up/cancelled");

      // Restore meals to listing
      db.prepare("UPDATE listings SET meals_remaining = meals_remaining + ? WHERE id = ?").run(claim.meals_claimed, claim.listing_id);
      
      // Update claim status
      db.prepare("UPDATE claims SET status = 'CANCELLED' WHERE id = ?").run(claimId);

      return true;
    });

    try {
      tx();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
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

  // Notifications
  app.get("/api/notifications", authenticate, (req: any, res) => {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(req.user.id);
    res.json(notifications);
  });

  app.post("/api/notifications/read-all", authenticate, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.user.id);
    res.json({ success: true });
  });

  app.post("/api/notifications/:id/read", authenticate, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
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
    
    // Background task for expiry warnings and auto-expiry
    setInterval(() => {
      try {
        const now = new Date();
        const nowIso = now.toISOString();

        // Auto-expire listings that reached deadline
        db.prepare("UPDATE listings SET status = 'EXPIRED' WHERE status IN ('ACTIVE', 'EDITED') AND expiry_time <= ?").run(nowIso);
        
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
        
        // Find claims for listings expiring soon that haven't been notified yet
        // and listing is still active
        const upcomingWarnings = db.prepare(`
          SELECT c.id as claim_id, c.ngo_id, l.food_description, l.expiry_time, l.id as listing_id
          FROM claims c
          JOIN listings l ON c.listing_id = l.id
          WHERE c.status = 'PENDING'
            AND l.status IN ('ACTIVE', 'EDITED')
            AND l.expiry_time > ?
            AND l.expiry_time <= ?
            AND NOT EXISTS (
              SELECT 1 FROM notifications n 
              WHERE n.user_id = c.ngo_id 
                AND n.type = 'EXPIRY_WARNING' 
                AND n.related_id = c.id
            )
        `).all(now.toISOString(), thirtyMinutesFromNow) as any[];

        for (const warning of upcomingWarnings) {
          const expiryTimeIST = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(warning.expiry_time));

          db.prepare(`
            INSERT INTO notifications (user_id, type, message, related_id)
            VALUES (?, 'EXPIRY_WARNING', ?, ?)
          `).run(
            warning.ngo_id,
            `Reminder: Your claim for "${warning.food_description}" expires soon at ${expiryTimeIST}. Please pick it up!`,
            warning.claim_id
          );
        }
      } catch (err) {
        console.error("Error in expiry warning background task:", err);
      }
    }, 60000); // Check every minute
  });
}

startServer();
