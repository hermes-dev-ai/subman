const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'subman-secret-key-2026';

function signToken(userId, email, role) {
  return jwt.sign(
    { role: role === 'client' ? 'subman_client' : 'subman_customer', user_id: userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Signup
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, phone, company } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs requis: name, email, password, role' });
    }
    if (!['client', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Role invalide (client ou customer)' });
    }

    const model = role === 'client' ? prisma.client : prisma.customer;
    const existing = await model.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email deja utilise' });
    }

    const hash = await bcrypt.hash(password, 10);
    const data = role === 'client'
      ? { name, email, passwordHash: hash, company }
      : { name, email, passwordHash: hash, phone };

    const user = await model.create({
      data,
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true }
    });

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

    let user = await prisma.client.findUnique({ where: { email } });
    let role = 'client';

    if (!user) {
      user = await prisma.customer.findFirst({ where: { email } });
      role = 'customer';
    }

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = signToken(user.id, email, role);
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, token, role });
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
    const model = decoded.role === 'subman_client' ? prisma.client : prisma.customer;
    const user = await model.findUnique({
      where: { id: decoded.user_id },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Auth service running on port ' + PORT);
});
