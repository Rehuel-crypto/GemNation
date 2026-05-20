// ═══════════════════════════════════════════
// GEM NATION — Backend API Server
// Node.js + Express + Firebase Admin
// ═══════════════════════════════════════════

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const morgan     = require('morgan');
const admin      = require('firebase-admin');
const { body, validationResult } = require('express-validator');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── FIREBASE ADMIN INIT ──
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

// ══════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - Allow only your site
app.use(cors({
  origin: [
    'https://project-kyq8r-7ekxmmzdd.vercel.app',
    'https://gemnation.vercel.app',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(morgan('combined')); // Logging

// ── RATE LIMITERS ──

// Global: 100 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment: 3 attempts per hour per IP
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Trop de tentatives de paiement. Réessayez dans 1 heure." },
  keyGenerator: (req) => req.ip + (req.body?.uid || ''),
});

// Admin: 5 attempts per 15 min per IP
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives. Compte bloqué 15 minutes." },
});

app.use(globalLimiter);

// ══════════════════════════════════════
// ROUTES
// ══════════════════════════════════════

// Health check
app.get('/', (req, res) => {
  res.json({ status: '✅ GEM NATION API en ligne', version: '1.0.0' });
});

// ── VERIFY FEDAPAY PAYMENT ──
app.post('/api/verify-payment',
  paymentLimiter,
  [
    body('transactionId').notEmpty().isString().trim(),
    body('uid').matches(/^\d{9,12}$/).withMessage('UID invalide'),
    body('pkgId').isInt({ min: 1, max: 5 }),
    body('phone').matches(/^[\d\s+]{8,15}$/).withMessage('Téléphone invalide'),
  ],
  async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { transactionId, uid, pkgId, phone } = req.body;

    try {
      // 1. Verify payment with FedaPay API
      const fedaRes = await fetch(`https://api.fedapay.com/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!fedaRes.ok) {
        return res.status(400).json({ error: "Transaction introuvable" });
      }

      const fedaData = await fedaRes.json();
      const transaction = fedaData.v1?.transaction || fedaData.transaction;

      if (!transaction || transaction.status !== 'approved') {
        return res.status(400).json({ error: "Paiement non confirmé" });
      }

      // 2. Check if transaction already used
      const existingTxn = await db.collection('transactions')
        .where('fedapayId', '==', transactionId)
        .get();

      if (!existingTxn.empty) {
        return res.status(400).json({ error: "Transaction déjà utilisée" });
      }

      // 3. Get available gift code
      const codesSnap = await db.collection('giftcodes')
        .where('pkgId', '==', parseInt(pkgId))
        .where('used', '==', false)
        .limit(1)
        .get();

      if (codesSnap.empty) {
        // Alert via WhatsApp webhook could go here
        return res.status(400).json({ error: "Stock épuisé. Contactez le support." });
      }

      const codeDoc = codesSnap.docs[0];
      const code = codeDoc.data().code;

      // 4. Atomically mark code as used + save transaction
      const batch = db.batch();

      batch.update(codeDoc.ref, {
        used: true,
        usedBy: uid,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedIP: req.ip,
      });

      const txnRef = db.collection('transactions').doc();
      const PACKAGES = {
        1: { diamonds:100, bonus:10,  price:750   },
        2: { diamonds:210, bonus:21,  price:1400  },
        3: { diamonds:530, bonus:53,  price:3250  },
        4: { diamonds:1080,bonus:108, price:6800  },
        5: { diamonds:2200,bonus:220, price:12800 },
      };
      const pkg = PACKAGES[pkgId];

      batch.set(txnRef, {
        uid,
        phone: phone.replace(/\s/g,'').slice(-8), // Store only last 8 digits
        diamonds: pkg.diamonds,
        bonus: pkg.bonus,
        price: pkg.price,
        giftCode: code,
        fedapayId: transactionId,
        status: 'success',
        date: new Date().toLocaleString('fr-FR'),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: req.ip,
      });

      await batch.commit();

      // 5. Check low stock and send alert
      const remainingSnap = await db.collection('giftcodes')
        .where('pkgId', '==', parseInt(pkgId))
        .where('used', '==', false)
        .get();

      const remaining = remainingSnap.size;
      if (remaining <= 10) {
        // Log low stock alert
        await db.collection('alerts').add({
          type: 'LOW_STOCK',
          pkgId: parseInt(pkgId),
          remaining,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`⚠️ ALERTE STOCK BAS: Forfait ${pkgId} — ${remaining} restants`);
      }

      // 6. Return success with gift code
      res.json({
        success: true,
        giftCode: code,
        diamonds: pkg.diamonds + pkg.bonus,
        remaining,
        txnId: txnRef.id,
      });

    } catch (err) {
      console.error('Payment verification error:', err);
      res.status(500).json({ error: "Erreur serveur. Contactez le support." });
    }
  }
);

// ── ADMIN LOGIN ──
app.post('/api/admin/login',
  adminLimiter,
  [body('password').notEmpty().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Données invalides" });

    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      // Log failed attempt
      await db.collection('adminLogs').add({
        action: 'FAILED_LOGIN',
        ip: req.ip,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(()=>{});
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    // Generate simple session token
    const token = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');

    await db.collection('adminLogs').add({
      action: 'LOGIN',
      ip: req.ip,
      token: token.slice(0,10),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(()=>{});

    res.json({ success: true, token, expiresIn: 1800 }); // 30 min
  }
);

// ── GET STOCK STATUS ──
app.get('/api/stock', async (req, res) => {
  try {
    const snap = await db.collection('giftcodes').where('used','==',false).get();
    const stock = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    snap.docs.forEach(d => {
      const pkgId = d.data().pkgId;
      if (stock[pkgId] !== undefined) stock[pkgId]++;
    });
    res.json({ stock });
  } catch(e) {
    res.status(500).json({ error: "Erreur" });
  }
});

// ── CHECK UID ──
app.post('/api/check-uid',
  [body('uid').matches(/^\d{9,12}$/)],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ valid: false, message: "UID invalide" });
    res.json({ valid: true, message: "UID valide ✅" });
  }
);

// ── 404 Handler ──
app.use('*', (req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`🚀 GEM NATION API démarré sur port ${PORT}`);
  console.log(`✅ Firebase connecté: ${process.env.FIREBASE_PROJECT_ID}`);
});
