const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const bodyParser = require("body-parser");
const crypto = require("crypto"); // Add this for generating reset tokens

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "SIMS"
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to database:", err);
    } else {
        console.log("Connected to SIMS database");
    }
});

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/forgotPassword", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "forgotPassword.html"));
});

app.get("/resetPassword", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "resetPassword.html"));
});

app.get("/adminProfile", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "adminProfile.html"));
});

app.get("/studentAdmission", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "studentAdmission.html"));
});

app.get("/studentInformation", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "studentInformation.html"));
});

// API: Login Check
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM admins WHERE email = ? AND password = ?";
    db.query(query, [email, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (result.length > 0) {
            res.json({ 
                message: "Login successful", 
                redirect: "/adminProfile",
                adminId: result[0].id 
            });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    });
});

// API: Forgot Password - Verify Email and Generate Reset Token
app.post("/api/forgotPassword", (req, res) => {
    const { email } = req.body;

    // Check if email exists
    const checkQuery = "SELECT * FROM admins WHERE email = ?";
    db.query(checkQuery, [email], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Email not found" });
        }

        // Generate reset token (valid for 1 hour)
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store reset token in database
        const updateQuery = "UPDATE admins SET reset_token = ?, reset_token_expiry = ? WHERE email = ?";
        db.query(updateQuery, [resetToken, tokenExpiry, email], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            // In production, you would send an email with the reset link
            // For this demo, we'll redirect to resetPassword page with token
            res.json({ 
                message: "Verification successful",
                redirect: "/resetPassword?token=" + resetToken,
                token: resetToken // Remove this in production!
            });
        });
    });
});

// API: Reset Password
app.post("/api/resetPassword", (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
    }

    // Check if token is valid and not expired
    const checkQuery = "SELECT * FROM admins WHERE reset_token = ? AND reset_token_expiry > NOW()";
    db.query(checkQuery, [token], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (result.length === 0) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }

        // Update password and clear reset token
        const updateQuery = "UPDATE admins SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?";
        db.query(updateQuery, [newPassword, result[0].id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            res.json({ 
                message: "Password reset successfully",
                redirect: "/login"
            });
        });
    });
});

// API: Get Admin Data
app.get("/api/admin", (req, res) => {
    const query = "SELECT * FROM admins LIMIT 1";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json(result[0]);
    });
});

// API: Update Admin Data
app.put("/api/admin/update", (req, res) => {
    const { name, email, phone_number, password } = req.body;

    const query = "UPDATE admins SET name = ?, email = ?, phone_number = ?, password = ? WHERE id = 1";
    db.query(query, [name, email, phone_number, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "Profile updated successfully" });
    });
});

// API: Logout
app.post("/api/logout", (req, res) => {
    res.json({ message: "Logout successful", redirect: "/login" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});