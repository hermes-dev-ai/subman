const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://subman:***@db:5432/subman',
});

const JWT_SECRET = process.env.JWT_SECRET || 'change...-secret-key-2026';

function signToken(userId, email, role) {
  return jwt.sign({
    role: role === 'client' ? 'subman_client' : 'subman_customer',
    user_id: userId,
    email: email,
  }, JWT_SECRET, { expiresIn: '7d' });
}

// Signup
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, phone, company } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs requis: name, email, password, role' });
    }
    const existing = await pool.query('SELECT id FROM auth.' + role + 's WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email deja utilise' });
    }
    const hash = await bcrypt.hash(password, 10);
    const table = role === 'client' ? 'auth.clients' : 'auth.customers';
    let query, params;
    if (role === 'client') {
      query = 'INSERT INTO ' + table + ' (name, email, password, company) VALUES ($1, $2, $3, $4) RETURNING id, name, email, company, created_at';
      params = [name, email, hash, company || null];
    } else {
      query = 'INSERT INTO ' + table + ' (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, created_at';
      params = [name, email, hash, phone || null];
    }
    const result = await pool.query(query, params);
    const user = result.rows[0];
    const token = signToken(user.id, email, role);
    res.status(201).json({ user, token, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur inscription' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    let result = await pool.query(
      'SELECT id, name, email, password, company, created_at, $1 as role FROM auth.clients WHERE email = $2',
      ['client', email]
    );
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT id, name, email, password, phone, created_at, $1 as role FROM auth.customers WHERE email = $2',
        ['customer', email]
      );
    }
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const token = signToken(user.id, email, user.role);
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur connexion' });
  }
});

// Get profile
app.get('/auth/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const table = decoded.role === 'subman_client' ? 'auth.clients' : 'auth.customers';
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM ' + table + ' WHERE id = $1',
      [decoded.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(result.rows[0]);
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Auth service running on port ' + PORT);
});
