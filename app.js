// ═══════════════════════════════════════
// GEM NATION — Shared Firebase & Data
// ═══════════════════════════════════════

// Firebase Config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDaVuZJXpjTcKEXLhZ2_X4SuhFvPClaXTI",
  authDomain: "gemnation-64290.firebaseapp.com",
  projectId: "gemnation-64290",
  storageBucket: "gemnation-64290.firebasestorage.app",
  messagingSenderId: "812100549141",
  appId: "1:812100549141:web:c609b16993893b66df6c1c",
  measurementId: "G-024YRSP079"
};

// FedaPay Key
const FEDAPAY_PUBLIC_KEY = "pk_sandbox_whKNLj3ao-SHZ6rbtPGPR21F";

// Packages
const PACKAGES = [
  { id:1, diamonds:100, bonus:10,  price:750,   popular:false },
  { id:2, diamonds:210, bonus:21,  price:1400,  popular:false },
  { id:3, diamonds:530, bonus:53,  price:3250,  popular:false },
  { id:4, diamonds:1080,bonus:108, price:6800,  popular:true  },
  { id:5, diamonds:2200,bonus:220, price:12800, popular:false },
];

// Payment Methods
const PAYMENTS = [
  { id:"flooz",  name:"Flooz",         icon:"🔵", pays:"Togo" },
  { id:"tmoney", name:"T-Money",       icon:"🟡", pays:"Togo" },
  { id:"wave",   name:"Wave",          icon:"💙", pays:"Togo/Sénégal" },
  { id:"orange", name:"Orange Money",  icon:"🟠", pays:"CI/Mali" },
  { id:"mtn",    name:"MTN MoMo",      icon:"🟡", pays:"CI/Ghana" },
  { id:"moov",   name:"Moov Money",    icon:"🔵", pays:"CI/Bénin" },
];

// Reviews
const REVIEWS = [
  { name:"GhostSniper77", stars:5, text:"Livraison en 2 minutes ! Service au top, je recommande à 100% 🔥", date:"Il y a 2 jours" },
  { name:"FireKing99",    stars:5, text:"Fiable et rapide. J'ai commandé plusieurs fois, jamais déçu.", date:"Il y a 5 jours" },
  { name:"ShadowXX",      stars:5, text:"Meilleur site de recharge FF au Togo. Prix imbattables !", date:"Il y a 1 semaine" },
  { name:"NinjaBlaze",    stars:5, text:"Transaction rapide et sécurisée. Je reviendrai !", date:"Il y a 2 semaines" },
];

// FAQs
const FAQS = [
  { q:"Combien de temps prend la livraison ?",      a:"La livraison est quasi instantanée, entre 1 et 5 minutes après confirmation du paiement." },
  { q:"Comment trouver mon UID Free Fire ?",         a:"Ouvrez Free Fire → cliquez sur votre profil en haut à gauche → votre UID s'affiche sous votre pseudo." },
  { q:"Quelles méthodes de paiement acceptez-vous ?",a:"Nous acceptons Flooz, T-Money, Wave (Togo), Orange Money, MTN MoMo et Moov Money." },
  { q:"Que faire si je n'ai pas reçu mes diamants ?", a:"Contactez-nous immédiatement sur WhatsApp au +228 70 32 34 56 avec votre numéro de transaction." },
  { q:"Est-ce que c'est sécurisé ?",                 a:"Oui, 100% sécurisé. Nous utilisons uniquement des cartes cadeaux officielles Free Fire." },
];

// Initialize Firebase
var db;
function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      try { firebase.analytics(); } catch(e) {}
      console.log("✅ Firebase connecté");
    }
  } catch(e) { console.error("Firebase erreur:", e); }
}

// Toast notification
function showToast(msg, type="success") {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Diamond SVG
function diamondSVG(size=22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="diamond-icon">
    <defs>
      <linearGradient id="dg1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fde68a"/>
        <stop offset="100%" stop-color="#f5c842"/>
      </linearGradient>
      <linearGradient id="dg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef3c7"/>
        <stop offset="100%" stop-color="#e8a020"/>
      </linearGradient>
    </defs>
    <polygon points="12,2 22,9 18,22 6,22 2,9" fill="url(#dg1)" stroke="#e8a020" stroke-width="1"/>
    <polygon points="12,2 18,9 12,18 6,9" fill="url(#dg2)" opacity="0.6"/>
  </svg>`;
}

// Navbar HTML
function navbarHTML(activePage) {
  const links = [
    { href:'index.html',    label:'🏠 Accueil',   id:'home' },
    { href:'recharge.html', label:'💎 Recharger', id:'recharge' },
    { href:'guide.html',    label:'📖 Guide',     id:'guide' },
    { href:'faq.html',      label:'❓ FAQ',       id:'faq' },
  ];
  return `
  <nav class="navbar">
    <a href="index.html" class="nav-logo">
      <div class="nav-logo-icon">💎</div>
      <div class="nav-logo-text">GEM <span>NATION</span></div>
    </a>
    <div class="nav-links">
      ${links.map(l=>`<a href="${l.href}" class="nav-link ${activePage===l.id?'active':''}">${l.label}</a>`).join('')}
      <a href="admin.html" class="nav-link" id="historyLink" style="display:none">📋 Historique</a>
      <button class="nav-link admin-btn" id="adminBtn" onclick="toggleAdmin()">🔒 Admin</button>
    </div>
  </nav>`;
}

// Footer HTML
function footerHTML() {
  return `
  <footer>
    <div class="footer-logo">GEM NATION</div>
    <div style="margin-bottom:10px">© 2025 GEM NATION – Recharge Gaming · Afrique 🌍</div>
    <a href="https://wa.me/22870323456" target="_blank">📞 +228 70 32 34 56 – WhatsApp</a>
    <div style="margin-top:6px;font-size:11px">Service disponible 24h/24 · 7j/7</div>
  </footer>
  <a href="https://wa.me/22870323456" target="_blank" class="whatsapp-fab">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </a>`;
}

// Admin management
let isAdmin = false;
function toggleAdmin() {
  if (!isAdmin) {
    const p = prompt("Mot de passe admin :");
    if (p === "admin123") {
      isAdmin = true;
      document.getElementById('adminBtn').className = 'nav-link admin-active';
      document.getElementById('adminBtn').textContent = '🔓 Admin';
      const histLink = document.getElementById('historyLink');
      if (histLink) histLink.style.display = 'inline-flex';
      showToast("Mode admin activé ✅");
      if (typeof onAdminActivated === 'function') onAdminActivated();
    } else {
      showToast("Mot de passe incorrect", "error");
    }
  } else {
    isAdmin = false;
    document.getElementById('adminBtn').className = 'nav-link admin-btn';
    document.getElementById('adminBtn').textContent = '🔒 Admin';
    const histLink = document.getElementById('historyLink');
    if (histLink) histLink.style.display = 'none';
    if (typeof onAdminDeactivated === 'function') onAdminDeactivated();
  }
}
