import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// JWT_SECRET defined above

// Email Transporter defines above


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
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
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[1-9][0-9]{9}$/;

  app.post("/api/auth/register", async (req, res) => {
    const { name, orgName, contact, email, address, zone, password, role } = req.body;
    try {
      // 0. Validate password length
      if (password && password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long." });
      }

      // 0.1 Validate phone number format
      if (contact && !PHONE_REGEX.test(contact)) {
        return res.status(400).json({ error: "Invalid phone number. Must be exactly 10 digits and cannot start with 0." });
      }

      // 1. Validate email format
      if (email && !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: "Invalid email format. Please use example@domain.com" });
      }
      
      // 1. Check if email already exists
      if (email) {
        const { data: existingEmail } = await supabase.from("users").select("id").eq("email", email).single();
        if (existingEmail) return res.status(400).json({ error: "A user with this email already exists" });
      }

      // 2. Check if contact already exists
      if (contact) {
        const { data: existingContact } = await supabase.from("users").select("id").eq("contact", contact).single();
        if (existingContact) return res.status(400).json({ error: "A user with this contact number already exists" });
      }

      // 3. Unique passwords requirement
      if (password) {
        const { data: allHashes } = await supabase.from("users").select("password_hash").not("password_hash", "is", null);
        if (allHashes) {
          for (const { password_hash } of allHashes) {
            const isMatch = await bcrypt.compare(password, password_hash);
            if (isMatch) {
              return res.status(400).json({ error: "This password has already been used by another user. Please choose a unique password for security." });
            }
          }
        }
      }

      const hash = password ? await bcrypt.hash(password, 10) : null;
      const { data: result, error } = await supabase.from("users").insert({
        name,
        org_name: orgName,
        contact: contact || null,
        email: email || null,
        address,
        zone,
        password_hash: hash,
        role
      }).select("id").single();

      if (error) throw error;
      res.json({ id: result.id });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { contact, email, password } = req.body;

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    let user: any;
    if (contact) {
      const { data } = await supabase.from("users").select("*").eq("contact", contact).single();
      user = data;
    } else if (email) {
      const { data } = await supabase.from("users").select("*").eq("email", email).single();
      user = data;
    }

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ 
      id: user.id, 
      role: user.role, 
      name: user.name, 
      orgName: user.org_name, 
      zone: user.zone 
    }, JWT_SECRET, { expiresIn: "24h" });
    
    res.cookie("token", token, { 
      httpOnly: true, 
      sameSite: "none", 
      secure: true,
      path: '/'
    });
    
    res.json({ 
      id: user.id, 
      role: user.role, 
      name: user.name, 
      orgName: user.org_name, 
      zone: user.zone,
      email: user.email,
      contact: user.contact,
      address: user.address,
      avatar_url: user.avatar_url,
      token 
    });
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

  app.get("/api/auth/me", async (req, res) => {
    let token = req.cookies.token;
    
    // Fallback to Authorization header for consistency
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) return res.json(null);
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const { data: user } = await supabase.from("users")
        .select("id, name, org_name, contact, email, address, zone, role, avatar_url")
        .eq("id", decoded.id)
        .single();
        
      if (!user) return res.json(null);
      // Map org_name to orgName for frontend compatibility
      res.json({
        ...user,
        orgName: user.org_name
      });
    } catch (err) {
      res.json(null);
    }
  });

  app.put("/api/auth/me", authenticate, async (req: any, res) => {
    const { name, orgName, contact, email, address, zone, avatar_url, currentPassword, newPassword } = req.body;
    
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email format. Please use example@domain.com" });
    }

    if (contact && !PHONE_REGEX.test(contact)) {
      return res.status(400).json({ error: "Invalid phone number. Must be exactly 10 digits and cannot start with 0." });
    }

    if (!name || !orgName || !address || !zone) {
      return res.status(400).json({ error: "Missing required fields: name, organization name, address, and zone are required." });
    }

    try {
      // If changing password, verify current password
      if (newPassword) {
        if (newPassword.length < 6) {
          return res.status(400).json({ error: "New password must be at least 6 characters long." });
        }
        if (!currentPassword) {
          return res.status(400).json({ error: "Current password is required to set a new one." });
        }
        const { data: user } = await supabase.from("users").select("password_hash").eq("id", req.user.id).single();
        if (!user) throw new Error("User not found");
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
          return res.status(400).json({ error: "Incorrect current password." });
        }
      }

      // Check for unique constraints if they changed
      if (email) {
        const { data: existingEmail } = await supabase.from("users").select("id").eq("email", email).neq("id", req.user.id).single();
        if (existingEmail) return res.status(400).json({ error: "Email already taken by another user" });
      }
      if (contact) {
        const { data: existingContact } = await supabase.from("users").select("id").eq("contact", contact).neq("id", req.user.id).single();
        if (existingContact) return res.status(400).json({ error: "Contact number already taken by another user" });
      }

      let passwordHash: string | null = null;
      if (newPassword) {
        // Enforce unique password requirement
        const { data: allHashes } = await supabase.from("users").select("password_hash").not("password_hash", "is", null);
        if (allHashes) {
          for (const { password_hash } of allHashes) {
            const isMatch = await bcrypt.compare(newPassword, password_hash);
            if (isMatch) {
              return res.status(400).json({ error: "This password has already been used by another user. Please choose a unique password for security." });
            }
          }
        }
        passwordHash = await bcrypt.hash(newPassword, 10);
      }

      const updateData: any = {
        name,
        org_name: orgName,
        contact,
        email,
        address,
        zone,
        avatar_url
      };
      if (passwordHash) {
        updateData.password_hash = passwordHash;
      }

      const { data: updatedUser, error: updateError } = await supabase.from("users")
        .update(updateData)
        .eq("id", req.user.id)
        .select("id, name, org_name, contact, email, address, zone, role, avatar_url")
        .single();
      
      if (updateError) throw updateError;
      
      // Update token
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
        avatar_url: updatedUser.avatar_url,
        token 
      });
    } catch (err: any) {
      console.error("Profile update error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { data: user } = await supabase.from("users").select("id, name").eq("email", email).single();
    
    // Safety message (don't reveal if user exists)
    const safetyMessage = { message: "If an account with that email exists, we have sent a reset link. Please check your inbox (and spam folder)." };

    if (!user) {
      return res.json(safetyMessage);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

    await supabase.from("users").update({
      reset_token: token,
      reset_token_expiry: expiry
    }).eq("id", user.id);

    const appUrl = process.env.APP_URL || `http://${req.headers.host}`;
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'SurplusLink <noreply@surpluslink.com>',
        to: email,
        subject: 'Password Reset Request - SurplusLink',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #059669;">Reset Your Password</h2>
            <p>Hello ${user.name},</p>
            <p>We received a request to reset your password for your SurplusLink account. If you didn't request this, you can safely ignore this email.</p>
            <p>To reset your password, please click the button below within the next 30 minutes:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 0.875rem; color: #64748b;">Or copy and paste this link in your browser:</p>
            <p style="font-size: 0.875rem; color: #64748b; word-break: break-all;">${resetLink}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="font-size: 0.75rem; color: #94a3b8; text-align: center;">&copy; 2026 SurplusLink. Better food, less waste.</p>
          </div>
        `
      });
      console.log(`Reset email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send reset email:", error);
      // We still return success to prevent user enumeration
    }
    
    res.json(safetyMessage);
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Token and new password required" });

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const { data: user } = await supabase.from("users")
      .select("id")
      .eq("reset_token", token)
      .gt("reset_token_expiry", new Date().toISOString())
      .single();

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await supabase.from("users").update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expiry: null
    }).eq("id", user.id);

    res.json({ success: true, message: "Password updated successfully. You can now log in with your new password." });
  });

  // Listings
  app.post("/api/listings", authenticate, async (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Only restaurants can create listings" });
    const { food_description, total_meals, cooked_time, category } = req.body;
    
    // Normal: 4 hours, Bakery/Sweets: 6 hours
    const durationHours = category === 'BAKERY_SWEETS' ? 6 : 4;
    const expiry_time = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase.from("listings").insert({
      restaurant_id: req.user.id,
      zone: req.user.zone,
      food_description,
      category: category || 'NORMAL',
      total_meals,
      meals_remaining: total_meals,
      cooked_time,
      expiry_time
    }).select("id").single();
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ id: data.id });
  });

  app.delete("/api/listings/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    const listingId = parseInt(req.params.id);
    
    const { error } = await supabase.from("listings")
      .update({ status: 'REMOVED' })
      .eq("id", listingId)
      .eq("restaurant_id", req.user.id)
      .in("status", ['ACTIVE', 'EDITED']);
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.put("/api/listings/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    const listingId = parseInt(req.params.id);
    const { food_description, total_meals } = req.body;
    
    try {
      const { data: listing, error: fetchError } = await supabase.from("listings")
        .select("*")
        .eq("id", listingId)
        .eq("restaurant_id", req.user.id)
        .single();

      if (fetchError || !listing) throw new Error("Listing not found");
      if (listing.status !== 'ACTIVE' && listing.status !== 'EDITED') throw new Error("Cannot edit inactive listing");

      const mealsClaimed = listing.total_meals - listing.meals_remaining;
      if (total_meals < mealsClaimed) {
        throw new Error(`Cannot set total meals to ${total_meals} because ${mealsClaimed} meals have already been claimed.`);
      }

      const newMealsRemaining = total_meals - mealsClaimed;

      const { error: updateError } = await supabase.from("listings")
        .update({
          food_description,
          total_meals,
          meals_remaining: newMealsRemaining,
          status: 'EDITED'
        })
        .eq("id", listingId);

      if (updateError) throw updateError;
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/listings", authenticate, async (req: any, res) => {
    try {
      // Auto-expire logic
      const now = new Date().toISOString();
      await supabase.from("listings")
        .update({ status: 'EXPIRED' })
        .in("status", ['ACTIVE', 'EDITED'])
        .lt("expiry_time", now);

      const { zone, sort } = req.query;
      
      let query = supabase.from("listings")
        .select(`
          *,
          users!listings_restaurant_id_fkey (
            org_name,
            avatar_url
          )
        `)
        .in("status", ['ACTIVE', 'EDITED'])
        .gt("meals_remaining", 0);

      if (zone && typeof zone === 'string' && zone.trim() !== "") {
        query = query.eq("zone", zone.trim());
      }

      if (sort === 'least_time') query = query.order("expiry_time", { ascending: true });
      else if (sort === 'most_meals') query = query.order("meals_remaining", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data: listings, error } = await query;
      if (error) throw error;

      // Transform for frontend naming compatibility
      const transformed = listings.map((l: any) => ({
        ...l,
        restaurant_name: l.users?.org_name,
        restaurant_avatar: l.users?.avatar_url
      }));

      res.json(transformed || []);
    } catch (err: any) {
      console.error("Supabase error in GET /api/listings:", err);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Debug route
  app.get("/api/debug/listings", authenticate, async (req: any, res) => {
    const { data: listings } = await supabase.from("listings").select("*");
    const { data: users } = await supabase.from("users").select("id, name, org_name, role, zone");
    res.json({ listings, users, serverTime: new Date().toISOString() });
  });

  app.get("/api/listings/my", authenticate, async (req: any, res) => {
    if (req.user.role !== 'restaurant') return res.status(403).json({ error: "Forbidden" });
    
    // Auto-expire logic consistency
    const now = new Date().toISOString();
    await supabase.from("listings")
      .update({ status: 'EXPIRED' })
      .in("status", ['ACTIVE', 'EDITED'])
      .lt("expiry_time", now)
      .eq("restaurant_id", req.user.id);

    const { data: listings } = await supabase.from("listings")
      .select(`
        *,
        users!listings_restaurant_id_fkey (
          org_name,
          avatar_url
        )
      `)
      .eq("restaurant_id", req.user.id)
      .order("created_at", { ascending: false });

    const transformed = listings?.map((l: any) => ({
      ...l,
      restaurant_name: l.users?.org_name,
      restaurant_avatar: l.users?.avatar_url
    }));

    res.json(transformed || []);
  });

  // Claims
  app.post("/api/claims", authenticate, async (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Only NGOs can claim meals" });
    const { listing_id, meals_claimed } = req.body;

    try {
      // Fetch listing with lock (Supabase doesn't support SELECT FOR UPDATE via standard client easily but we can check state)
      const { data: listing, error: fetchError } = await supabase.from("listings")
        .select("*")
        .eq("id", listing_id)
        .eq("status", "ACTIVE")
        .single();
        
      if (fetchError || !listing) throw new Error("Listing not found or expired");
      if (listing.meals_remaining < meals_claimed) throw new Error("Not enough meals remaining");

      // Update remaining meals
      const { error: updateError } = await supabase.from("listings")
        .update({ meals_remaining: listing.meals_remaining - meals_claimed })
        .eq("id", listing_id);
      
      if (updateError) throw updateError;

      // Create claim
      const { data: claim, error: claimError } = await supabase.from("claims").insert({
        listing_id,
        ngo_id: req.user.id,
        meals_claimed
      }).select("id").single();

      if (claimError) throw claimError;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: listing.restaurant_id,
        type: 'CLAIM',
        message: `${req.user.orgName} has claimed ${meals_claimed} meals from your "${listing.food_description}" listing.`,
        related_id: listing_id
      });

      res.json({ id: claim.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/claims/my", authenticate, async (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    const { data: claims } = await supabase.from("claims")
      .select(`
        *,
        listings!claims_listing_id_fkey (
          food_description,
          zone,
          users!listings_restaurant_id_fkey (
            org_name,
            contact
          )
        )
      `)
      .eq("ngo_id", req.user.id)
      .order("created_at", { ascending: false });

    // Transform for frontend
    const transformed = claims?.map((c: any) => ({
      ...c,
      food_description: c.listings?.food_description,
      zone: c.listings?.zone,
      restaurant_name: c.listings?.users?.org_name,
      restaurant_contact: c.listings?.users?.contact
    }));

    res.json(transformed || []);
  });

  app.get("/api/claims/listing/:id", authenticate, async (req: any, res) => {
    const listingId = parseInt(req.params.id);
    const { data: claims } = await supabase.from("claims")
      .select(`
        *,
        users!claims_ngo_id_fkey (
          org_name,
          contact
        )
      `)
      .eq("listing_id", listingId);

    const transformed = claims?.map((c: any) => ({
      ...c,
      ngo_name: c.users?.org_name,
      ngo_contact: c.users?.contact
    }));

    res.json(transformed || []);
  });

  app.post("/api/claims/:id/pickup", authenticate, async (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    const claimId = parseInt(req.params.id);
    
    await supabase.from("claims")
      .update({
        status: 'COMPLETED',
        pickup_time: new Date().toISOString()
      })
      .eq("id", claimId)
      .eq("ngo_id", req.user.id)
      .eq("status", "PENDING");

    res.json({ success: true });
  });

  app.post("/api/claims/:id/cancel", authenticate, async (req: any, res) => {
    if (req.user.role !== 'ngo') return res.status(403).json({ error: "Forbidden" });
    const claimId = parseInt(req.params.id);
    
    try {
      const { data: claim, error: fetchError } = await supabase.from("claims")
        .select("*")
        .eq("id", claimId)
        .eq("ngo_id", req.user.id)
        .eq("status", "PENDING")
        .single();

      if (fetchError || !claim) throw new Error("Claim not found or already processed");

      // Restore meals
      const { data: listing } = await supabase.from("listings").select("meals_remaining").eq("id", claim.listing_id).single();
      if (listing) {
        await supabase.from("listings")
          .update({ meals_remaining: listing.meals_remaining + claim.meals_claimed })
          .eq("id", claim.listing_id);
      }
      
      // Update claim
      await supabase.from("claims").update({ status: 'CANCELLED' }).eq("id", claimId);

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const { data: listings } = await supabase.from("listings").select("total_meals, status, zone");
    const { data: claims } = await supabase.from("claims").select("meals_claimed, status");

    const totalMealsListed = listings?.reduce((sum, l) => sum + l.total_meals, 0) || 0;
    const totalMealsClaimed = claims?.reduce((sum, c) => sum + c.meals_claimed, 0) || 0;
    const totalMealsPickedUp = claims?.filter(c => c.status === 'COMPLETED').reduce((sum, c) => sum + c.meals_claimed, 0) || 0;
    const activeListingsCount = listings?.filter(l => l.status === 'ACTIVE').length || 0;
    const expiredListingsCount = listings?.filter(l => l.status === 'EXPIRED').length || 0;

    const zoneMap: Record<string, number> = {};
    listings?.forEach(l => {
      zoneMap[l.zone] = (zoneMap[l.zone] || 0) + 1;
    });
    const zoneDistribution = Object.entries(zoneMap).map(([zone, count]) => ({ zone, count }));

    res.json({
      totalMealsListed,
      totalMealsClaimed,
      totalMealsPickedUp,
      activeListingsCount,
      expiredListingsCount,
      zoneDistribution
    });
  });

  // Notifications
  app.get("/api/notifications", authenticate, async (req: any, res) => {
    const { data: notifications } = await supabase.from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    res.json(notifications || []);
  });

  app.post("/api/notifications/read-all", authenticate, async (req: any, res) => {
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.user.id);
    res.json({ success: true });
  });

  app.post("/api/notifications/:id/read", authenticate, async (req: any, res) => {
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
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
    setInterval(async () => {
      try {
        const now = new Date();
        const nowIso = now.toISOString();

        // Auto-expire listings that reached deadline
        await supabase.from("listings")
          .update({ status: 'EXPIRED' })
          .in("status", ['ACTIVE', 'EDITED'])
          .lte("expiry_time", nowIso);
        
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
        
        // Find claims for listings expiring soon that haven't been notified yet
        // In PostgreSQL/Supabase, we can use a join with a subquery or a simple join with conditions
        const { data: upcomingWarnings } = await supabase.from("claims")
          .select(`
            id,
            ngo_id,
            listings!claims_listing_id_fkey (
              id,
              food_description,
              expiry_time
            )
          `)
          .eq("status", "PENDING")
          .gt("listings.expiry_time", nowIso)
          .lte("listings.expiry_time", thirtyMinutesFromNow);

        if (upcomingWarnings) {
          for (const warning of upcomingWarnings as any[]) {
            if (!warning.listings) continue;

            // Check if notification already exists
            const { data: existingNotif } = await supabase.from("notifications")
              .select("id")
              .eq("user_id", warning.ngo_id)
              .eq("type", "EXPIRY_WARNING")
              .eq("related_id", warning.id)
              .single();

            if (!existingNotif) {
              const expiryTimeIST = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
              }).format(new Date(warning.listings.expiry_time));

              await supabase.from("notifications").insert({
                user_id: warning.ngo_id,
                type: 'EXPIRY_WARNING',
                message: `Reminder: Your claim for "${warning.listings.food_description}" expires soon at ${expiryTimeIST}. Please pick it up!`,
                related_id: warning.id
              });
            }
          }
        }
      } catch (err) {
        console.error("Error in expiry warning background task:", err);
      }
    }, 60000); // Check every minute
  });
}

startServer();
