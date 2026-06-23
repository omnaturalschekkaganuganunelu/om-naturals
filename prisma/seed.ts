const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding database for Natural Chekka Ganuga Oils...');

  // 1. Create Site Settings (singleton)
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      businessName: 'ఓమ్ నాచురల్ చెక్క గానుగ నూనెలు / OM Natural Chekka Ganuga Oils',
      businessEmail: 'support@omnatural.com',
      contactPhone: '+91 86882 91288',
      whatsappNumber: '+91 86882 91288',
    },
    create: {
      id: 'singleton',
      codEnabled: true,
      freeShippingAbove: 500,
      shippingFee: 40,
      gstRate: 5,
      contactPhone: '+91 86882 91288',
      whatsappNumber: '+91 86882 91288',
      businessName: 'ఓమ్ నాచురల్ చెక్క గానుగ నూనెలు / OM Natural Chekka Ganuga Oils',
      businessEmail: 'support@omnatural.com',
    },
  });
  console.log('Site settings created/verified.');

  // 2. Create Default Users (Admin and Customer)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const customerPasswordHash = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nunebazaar.com' },
    update: {},
    create: {
      name: 'Nune Admin',
      email: 'admin@nunebazaar.com',
      password: adminPasswordHash,
      phone: '9876543210',
      role: 'ADMIN',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'satvish@gmail.com' },
    update: {},
    create: {
      name: 'Satvi Nune',
      email: 'satvish@gmail.com',
      password: customerPasswordHash,
      phone: '9999988888',
      role: 'CUSTOMER',
    },
  });

  // Create default address for customer
  const existingAddress = await prisma.address.findFirst({
    where: { userId: customer.id }
  });

  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        name: 'Satvi Nune',
        phone: '9999988888',
        line1: 'Flat 402, Golden Heritage Apartments',
        line2: 'Madhapur, Hitech City Road',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        isDefault: true,
      }
    });
  }
  console.log('Default users and address created/verified.');

  // 3. Create Categories (Cold Pressed vs Refined & Filtered)
  // Clean up pooja items category if it exists
  const existingPoojaCat = await prisma.category.findUnique({
    where: { slug: 'pooja-items' }
  });
  if (existingPoojaCat) {
    // We will update it instead of deleting it to avoid breaking relational constraints
    await prisma.category.update({
      where: { slug: 'pooja-items' },
      data: {
        name: 'Refined & Filtered Oils (శుద్ధి చేసిన & వడపోసిన నూనెలు)',
        nameTe: 'శుద్ధి చేసిన & వడపోసిన నూనెలు',
        slug: 'refined-filtered',
        image: '/images/categories/refined_filtered.png',
        description: 'నాణ్యమైన పద్ధతిలో శుద్ధి చేయబడిన మరియు వడపోసిన వంట నూనెలు',
        sortOrder: 2,
        isActive: true,
      }
    });
  }

  const categoryColdPressed = await prisma.category.upsert({
    where: { slug: 'cold-pressed' },
    update: {
      name: 'Traditional Cold Pressed Oils (సాంప్రదాయ చెక్క గానుగ నూనెలు)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నూనెలు',
      image: '/images/categories/cold_pressed.png',
      description: 'సాంప్రదాయ చెక్క గానుగ పద్ధతి ద్వారా సేకరించిన స్వచ్ఛమైన మరియు పోషకాలు నిండిన నూనెలు',
      sortOrder: 1,
    },
    create: {
      name: 'Traditional Cold Pressed Oils (సాంప్రదాయ చెక్క గానుగ నూనెలు)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నూనెలు',
      slug: 'cold-pressed',
      image: '/images/categories/cold_pressed.png',
      description: 'సాంప్రదాయ చెక్క గానుగ పద్ధతి ద్వారా సేకరించిన స్వచ్ఛమైన మరియు పోషకాలు నిండిన నూనెలు',
      sortOrder: 1,
      isActive: true,
    },
  });

  // Also make sure legacy 'oils' slug is migrated to 'cold-pressed' if needed, or upsert it
  const legacyOilsCat = await prisma.category.findUnique({
    where: { slug: 'oils' }
  });
  if (legacyOilsCat) {
    await prisma.category.update({
      where: { slug: 'oils' },
      data: {
        slug: 'cold-pressed-legacy',
        isActive: false
      }
    });
  }

  const categoryRefinedFiltered = await prisma.category.upsert({
    where: { slug: 'refined-filtered' },
    update: {
      name: 'Refined & Filtered Oils (శుద్ధి చేసిన & వడపోసిన నూనెలు)',
      nameTe: 'శుద్ధి చేసిన & వడపోసిన నూనెలు',
      image: '/images/categories/refined_filtered.png',
      description: 'నాణ్యమైన పద్ధతిలో శుద్ధి చేయబడిన మరియు వడపోసిన వంట నూనెలు',
      sortOrder: 2,
    },
    create: {
      name: 'Refined & Filtered Oils (శుద్ధి చేసిన & వడపోసిన నూనెలు)',
      nameTe: 'శుద్ధి చేసిన & వడపోసిన నూనెలు',
      slug: 'refined-filtered',
      image: '/images/categories/refined_filtered.png',
      description: 'నాణ్యమైన పద్ధతిలో శుద్ధి చేయబడిన మరియు వడపోసిన వంట నూనెలు',
      sortOrder: 2,
      isActive: true,
    },
  });

  console.log('Categories created/verified.');

  // 4. Create Coupons
  const coupons = [
    {
      code: 'NUNE10',
      type: 'PERCENT',
      value: 10,
      minOrderValue: 200,
      maxDiscount: 100,
      isActive: true,
    },
    {
      code: 'GANUGA50',
      type: 'FIXED',
      value: 50,
      minOrderValue: 500,
      isActive: true,
    },
    {
      code: 'PUREGOLD',
      type: 'PERCENT',
      value: 15,
      minOrderValue: 800,
      maxDiscount: 200,
      isActive: true,
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        type: c.type,
        value: c.value,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount,
        isActive: c.isActive,
      },
      create: c,
    });
  }
  console.log('Coupons created/verified.');

  // 5. Create 50+ Products
  // Helper to construct product data
  const rawProducts = [
    // --- PEANUT / GROUNDNUT OILS (వేరుశనగ నూనె) ---
    {
      name: 'Cold Pressed Groundnut Oil (సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె',
      slug: 'cold-pressed-groundnut-oil-1l',
      description: 'చెక్క గానుగ ద్వారా స్వచ్ఛమైన పల్లీల నుండి సేకరించిన నూనె. ఎటువంటి రసాయనాలు కలపని సాంప్రదాయ వంట నూనె.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 310, mrp: 360, stock: 50, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'GND-CP-1L',
      benefits: ['100% Cold Pressed / గానుగ నూనె', 'Rich in Vitamin E / విటమిన్ E సమృద్ధిగా ఉంటుంది', 'Zero Chemicals / ఎటువంటి రసాయనాలు లేవు'],
      ingredients: ['Pure Groundnut Seeds (వేరుశనగ గింజలు)'], usage: ['వంటలకు, తాలింపులకు అనుకూలం.']
    },
    {
      name: 'Cold Pressed Groundnut Oil (సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె',
      slug: 'cold-pressed-groundnut-oil-5l',
      description: 'చెక్క గానుగ ద్వారా స్వచ్ఛమైన పల్లీల నుండి సేకరించిన నూనె. 5 లీటర్ల క్యాన్ పరిమాణం.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 1520, mrp: 1750, stock: 40, unit: 'Litre', weight: 5.0, categorySlug: 'cold-pressed', sku: 'GND-CP-5L',
      benefits: ['100% Cold Pressed / గానుగ నూనె', 'Bulk Family Pack / కుటుంబ ప్యాక్'],
      ingredients: ['Pure Groundnut Seeds (వేరుశనగ గింజలు)'], usage: ['రోజూ వంటలకు అనుకూలం.']
    },
    {
      name: 'Cold Pressed Groundnut Oil (సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె',
      slug: 'cold-pressed-groundnut-oil-15l',
      description: 'సాంప్రదాయ పద్ధతిలో తీసిన వేరుశనగ నూనె. 15 లీటర్ల పెద్ద ఇత్తడి/మెటల్ టిన్.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 4500, mrp: 5200, stock: 15, unit: 'Litre', weight: 15.0, categorySlug: 'cold-pressed', sku: 'GND-CP-15L',
      benefits: ['Traditional Bilona & Wooden Press / చెక్క గానుగ', 'Saves Money in Bulk / హోల్‌సేల్ ధర'],
      ingredients: ['Pure Groundnut Seeds (వేరుశనగ గింజలు)'], usage: ['పెద్ద వంటలు, నిల్వ ఉంచే పచ్చళ్లకు అనుకూలం.']
    },
    {
      name: 'Cold Pressed Groundnut Oil (సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె',
      slug: 'cold-pressed-groundnut-oil-500ml',
      description: 'చెక్క గానుగ వేరుశనగ నూనె. 500 మిల్లీలీటర్ల చిన్న ప్యాక్.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 165, mrp: 195, stock: 60, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'GND-CP-500M',
      benefits: ['100% Natural / సహజమైనది', 'Handy bottle size / అనుకూలమైన చిన్న బాటిల్'],
      ingredients: ['Pure Groundnut Seeds (వేరుశనగ గింజలు)'], usage: ['స్వల్ప వంటలకు, రుచి కోసం.']
    },
    {
      name: 'Pure Filtered Groundnut Oil (వడపోసిన వేరుశనగ నూనె)',
      nameTe: 'వడపోసిన వేరుశనగ నూనె',
      slug: 'filtered-groundnut-oil-1l',
      description: 'సహజ పద్ధతిలో వడపోసిన వేరుశనగ నూనె. నూనెలోని సహజ గింజల సువాసన మరియు రంగును కాపాడుతుంది.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 240, mrp: 280, stock: 50, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'GND-FIL-1L',
      benefits: ['Double Filtered / రెండుసార్లు వడపోసినది', 'No Refined Chemicals / ఎటువంటి కెమికల్స్ లేవు'],
      ingredients: ['Groundnuts (వేరుశనగ పల్లీలు)'], usage: ['సాధారణ వంటలకు అనుకూలం.']
    },
    {
      name: 'Pure Filtered Groundnut Oil (వడపోసిన వేరుశనగ నూనె)',
      nameTe: 'వడపోసిన వేరుశనగ నూనె',
      slug: 'filtered-groundnut-oil-5l',
      description: 'గింజల స్వచ్ఛతను నిలిపి ఉంచేలా సహజ పద్ధతిలో వడపోసిన వేరుశనగ నూనె. 5 లీటర్ల పరిమాణం.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 1180, mrp: 1350, stock: 30, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'GND-FIL-5L',
      benefits: ['Cleanly Filtered / శుభ్రంగా వడపోసినది', 'High Smoke Point / ఎక్కువ వేడిని తట్టుకుంటుంది'],
      ingredients: ['Groundnuts (వేరుశనగ పల్లీలు)'], usage: ['డీప్ ఫ్రై చేయడానికి అనుకూలం.']
    },
    {
      name: 'Pure Filtered Groundnut Oil (వడపోసిన వేరుశనగ నూనె)',
      nameTe: 'వడపోసిన వేరుశనగ నూనె',
      slug: 'filtered-groundnut-oil-15l',
      description: 'వడపోసిన స్వచ్ఛమైన వేరుశనగ నూనె. 15 లీటర్ల పెద్ద టిన్.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 3450, mrp: 3990, stock: 20, unit: 'Litre', weight: 15.0, categorySlug: 'refined-filtered', sku: 'GND-FIL-15L',
      benefits: ['Double Filtered / డబుల్ ఫిల్టర్డ్', 'Value Pack / ఎక్కువ కాలం నిల్వ ఉంటుంది'],
      ingredients: ['Groundnuts (వేరుశనగ పల్లీలు)'], usage: ['పెద్ద శుభకార్యాల వంటలకు శ్రేష్ఠం.']
    },
    {
      name: 'Refined Groundnut Oil (శుద్ధి చేసిన వేరుశనగ నూనె)',
      nameTe: 'శుద్ధి చేసిన వేరుశనగ నూనె',
      slug: 'refined-groundnut-oil-1l',
      description: 'నాణ్యమైన పద్ధతిలో శుద్ధి చేసిన లైట్ వేరుశనగ నూనె.',
      images: ['/images/products/cold_pressed_groundnut_oil.png'],
      price: 210, mrp: 250, stock: 80, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'GND-REF-1L',
      benefits: ['Light & Mild Flavor / తేలికపాటి రుచి', 'Low absorption / తక్కువ నూనె పీల్చుకుంటుంది'],
      ingredients: ['Peanuts (వేరుశనగ గింజలు)'], usage: ['రోజూవారీ తేలికపాటి వంటలకు.']
    },

    // --- COCONUT OILS (కొబ్బరి నూనె) ---
    {
      name: 'Cold Pressed Coconut Oil (సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె',
      slug: 'cold-pressed-coconut-oil-1l',
      description: 'ఎండబెట్టిన స్వచ్ఛమైన కొబ్బరి చిప్పల నుండి చెక్క గానుగ ద్వారా తీసిన నూనె. జుట్టుకు మరియు వంటలకు ఎంతో మేలు చేస్తుంది.',
      images: ['/images/products/cold_pressed_coconut_oil.png'],
      price: 360, mrp: 420, stock: 45, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'COC-CP-1L',
      benefits: ['100% Raw & Pure / స్వచ్ఛమైన కొబ్బరి నూనె', 'Cold Pressed / గానుగ నూనె', 'Great for Hair & Cooking / జుట్టు మరియు వంటకు మేలు చేయును'],
      ingredients: ['Dry Coconut Copra (ఎండు కొబ్బరి)'], usage: ['తల మర్దనకు మరియు దక్షిణ భారత వంటకాలకు ఉపయోగించండి.']
    },
    {
      name: 'Cold Pressed Coconut Oil (సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె',
      slug: 'cold-pressed-coconut-oil-5l',
      description: 'సాంప్రదాయ గానుగ కొబ్బరి నూనె. 5 లీటర్ల క్యాన్.',
      images: ['/images/products/cold_pressed_coconut_oil.png'],
      price: 1750, mrp: 2000, stock: 25, unit: 'Litre', weight: 5.0, categorySlug: 'cold-pressed', sku: 'COC-CP-5L',
      benefits: ['Pure Copra Extract / అసలైన కొబ్బరి నూనె', 'Anti-fungal properties / రోగ నిరోధక శక్తి పెంచుతుంది'],
      ingredients: ['Dry Coconut Copra (ఎండు కొబ్బరి)'], usage: ['వంటలలో మరియు బాడీ లోషన్‌గా వాడవచ్చు.']
    },
    {
      name: 'Cold Pressed Coconut Oil (సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె',
      slug: 'cold-pressed-coconut-oil-500ml',
      description: 'చెక్క గానుగ కొబ్బరి నూనె. 500 మిల్లీలీటర్ల బాటిల్.',
      images: ['/images/products/cold_pressed_coconut_oil.png'],
      price: 190, mrp: 220, stock: 55, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'COC-CP-500M',
      benefits: ['Freshly Packed / తాజాగా ప్యాక్ చేయబడినది', 'Skin & Hair Nourishment / చర్మం మరియు జుట్టు సంరక్షణ'],
      ingredients: ['Dry Coconut Copra (ఎండు కొబ్బరి)'], usage: ['రోజూ జుట్టుకు రాసుకోవడానికి అనుకూలం.']
    },
    {
      name: 'Cold Pressed Coconut Oil (సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కొబ్బరి నూనె',
      slug: 'cold-pressed-coconut-oil-15l',
      description: 'స్వచ్ఛమైన చెక్క గానుగ కొబ్బరి నూనె. 15 లీటర్ల పెద్ద టిన్.',
      images: ['/images/products/cold_pressed_coconut_oil.png'],
      price: 5100, mrp: 5900, stock: 10, unit: 'Litre', weight: 15.0, categorySlug: 'cold-pressed', sku: 'COC-CP-15L',
      benefits: ['Wooden Cold Pressed / చెక్క గానుగ', 'Bulk Pricing / హోల్‌సేల్ రేటు'],
      ingredients: ['Dry Coconut Copra (ఎండు కొబ్బరి)'], usage: ['బేకరీ వంటలకు మరియు హోల్‌సేల్ వాడకానికి అనుకూలం.']
    },
    {
      name: 'Pure Filtered Coconut Oil (స్వచ్ఛమైన వడపోసిన కొబ్బరి నూనె)',
      nameTe: 'స్వచ్ఛమైన వడపోసిన కొబ్బరి నూనె',
      slug: 'filtered-coconut-oil-1l',
      description: 'సహజ రంగు మరియు వాసన నిలిపి ఉంచేలా క్లీన్‌గా వడపోసిన కొబ్బరి నూనె.',
      images: ['/images/products/cold_pressed_coconut_oil.png'],
      price: 290, mrp: 340, stock: 40, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'COC-FIL-1L',
      benefits: ['Double Filtered / రెండుసార్లు వడపోసినది', 'No Added Artificial Scents / కృత్రిమ సువాసనలు లేవు'],
      ingredients: ['Coconut (కొబ్బరి గింజలు)'], usage: ['ఆహార తయారీకి మరియు సౌందర్య సాధనంగా వాడవచ్చు.']
    },
    {
      name: 'Pure Filtered Coconut Oil (స్వచ్ఛమైన వడపోసిన కొబ్బరి నూనె)',
      nameTe: 'స్వచ్ఛమైన వడపోసిన కొబ్బరి నూనె',
      slug: 'filtered-coconut-oil-5l',
      description: 'వడపోసిన కొబ్బరి నూనె. 5 లీటర్ల క్యాన్ పరిమాణం.',
      images: ['/images/products/cold_pressed_coconut_oil.png'],
      price: 1400, mrp: 1650, stock: 20, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'COC-FIL-5L',
      benefits: ['Zero Chemicals / కెమికల్స్ లేవు', 'Clean Filtered / వడపోసినది'],
      ingredients: ['Coconut (కొబ్బరి గింజలు)'], usage: ['దక్షిణ భారత వంటకాల తయారీకి.']
    },

    // --- BADAM / ALMOND OILS (బాదం నూనె) ---
    {
      name: 'Cold Pressed Almond Oil (సాంప్రదాయ చెక్క గానుగ బాదం నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ బాదం నూనె',
      slug: 'cold-pressed-almond-oil-100ml',
      description: 'ఉత్తమమైన కాలిఫోర్నియా బాదం గింజల నుండి చెక్క గానుగ ద్వారా సేకరించిన అత్యంత విలువైన చర్మ మరియు జుట్టు పోషణ నూనె.',
      images: ['/images/products/badam_oil.png'],
      price: 280, mrp: 340, stock: 100, unit: 'Gram', weight: 100, categorySlug: 'cold-pressed', sku: 'ALM-CP-100M',
      benefits: ['100% Pure Sweet Almond / తీపి బాదం', 'Rich in Vitamin D & E / విటమిన్ D మరియు E కలవు', 'Amazing skin moisturizer / చర్మాన్ని మృదువుగా చేయును'],
      ingredients: ['California Almonds (బాదం గింజలు)'], usage: ['రాత్రి పడుకునే ముందు ముఖానికి లేదా జుట్టుకు రాయండి.']
    },
    {
      name: 'Cold Pressed Almond Oil (సాంప్రదాయ చెక్క గానుగ బాదం నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ బాదం నూనె',
      slug: 'cold-pressed-almond-oil-250ml',
      description: 'చెక్క గానుగ ద్వారా సేకరించిన స్వచ్ఛమైన తీపి బాదం నూనె. 250 మిల్లీలీటర్ల బాటిల్.',
      images: ['/images/products/badam_oil.png'],
      price: 650, mrp: 750, stock: 80, unit: 'Gram', weight: 250, categorySlug: 'cold-pressed', sku: 'ALM-CP-250M',
      benefits: ['Authentic Wooden Press / గానుగ నూనె', 'Hair growth booster / జుట్టు ఒత్తుగా పెరగడానికి తోడ్పడుతుంది'],
      ingredients: ['Premium Almonds (ప్రీమియం బాదం పప్పులు)'], usage: ['జుట్టుకు మరియు మసాజ్‌లకు వాడవచ్చు.']
    },
    {
      name: 'Cold Pressed Almond Oil (సాంప్రదాయ చెక్క గానుగ బాదం నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ బాదం నూనె',
      slug: 'cold-pressed-almond-oil-500ml',
      description: 'చెక్క గానుగ బాదం నూనె. 500 మిల్లీలీటర్ల పెద్ద పరిమాణం.',
      images: ['/images/products/badam_oil.png'],
      price: 1250, mrp: 1450, stock: 40, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'ALM-CP-500M',
      benefits: ['Nourishing Hair & Skin / జుట్టు & చర్మ పోషణ', 'Edible grade / వంటలలో / పాలతో తాగవచ్చు'],
      ingredients: ['Sweet Almonds (తీపి బాదం)'], usage: ['గోరువెచ్చని పాలతో కలిపి తాగవచ్చు లేదా చర్మానికి రాయవచ్చు.']
    },
    {
      name: 'Cold Pressed Almond Oil (సాంప్రదాయ చెక్క గానుగ బాదం నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ బాదం నూనె',
      slug: 'cold-pressed-almond-oil-1l',
      description: '1 లీటరు పరిమాణంలో లభించే అత్యుత్తమ చెక్క గానుగ బాదం నూనె. విలువైన మెటల్ టిన్ ప్యాకింగ్.',
      images: ['/images/products/badam_oil.png'],
      price: 2400, mrp: 2800, stock: 20, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'ALM-CP-1L',
      benefits: ['Pure Cold Pressed / స్వచ్ఛమైన కోల్డ్ ప్రెస్డ్', 'Premium Quality / అత్యుత్తమ నాణ్యత'],
      ingredients: ['Premium Almonds (నాణ్యమైన బాదం పప్పులు)'], usage: ['ఆహార తయారీకి లేదా బేబీ మసాజ్‌లకు ఉపయోగిస్తారు.']
    },
    {
      name: 'Filtered Sweet Almond Oil (స్వచ్ఛమైన బాదం నూనె)',
      nameTe: 'స్వచ్ఛమైన బాదం నూనె',
      slug: 'filtered-almond-oil-250ml',
      description: 'వడపోసిన తీపి బాదం నూనె. చర్మ సంరక్షణకు అత్యంత సురక్షితమైనది.',
      images: ['/images/products/badam_oil.png'],
      price: 520, mrp: 600, stock: 50, unit: 'Gram', weight: 250, categorySlug: 'refined-filtered', sku: 'ALM-FIL-250M',
      benefits: ['Double Filtered / రెండుసార్లు వడపోసినది', 'No artificial colors / కృత్రిమ రంగులు లేవు'],
      ingredients: ['Sweet Almonds (తీపి బాదం పప్పులు)'], usage: ['చర్మానికి రాయడానికి మరియు బేబీ మసాజ్ కి శ్రేష్ఠం.']
    },
    {
      name: 'Filtered Sweet Almond Oil (స్వచ్ఛమైన బాదం నూనె)',
      nameTe: 'స్వచ్ఛమైన బాదం నూనె',
      slug: 'filtered-almond-oil-500ml',
      description: 'రసాయన రహితంగా వడపోసిన తీపి బాదం నూనె. 500 మిల్లీలీటర్ల బాటిల్.',
      images: ['/images/products/badam_oil.png'],
      price: 980, mrp: 1150, stock: 30, unit: 'Litre', weight: 0.5, categorySlug: 'refined-filtered', sku: 'ALM-FIL-500M',
      benefits: ['Natural Filtration / సహజ వడపోత', 'Great value size / తక్కువ ధరలో పెద్ద ప్యాక్'],
      ingredients: ['Sweet Almonds (తీపి బాదం పప్పులు)'], usage: ['ముఖ సౌందర్య లేపనంగా వాడవచ్చు.']
    },

    // --- MUSTARD OILS (ఆవ నూనె) ---
    {
      name: 'Cold Pressed Mustard Oil (సాంప్రదాయ చెక్క గానుగ ఆవ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ ఆవ నూనె',
      slug: 'cold-pressed-mustard-oil-1l',
      description: 'గాఢమైన సువాసన మరియు ఘాటు కలిగిన సాంప్రదాయ చెక్క గానుగ ఆవ నూనె. ఉత్తర భారత మరియు సాంప్రదాయ పచ్చళ్ల తయారీకి అత్యుత్తమమైనది.',
      images: ['/images/products/mustard_oil.png'],
      price: 290, mrp: 340, stock: 60, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'MST-CP-1L',
      benefits: ['Strong Pungent Aroma / గాఢమైన ఘాటు', 'Rich in MUFA / గుండె ఆరోగ్యానికి తోడ్పడుతుంది', 'Natural Preservative / పచ్చళ్లకు సహజ నిల్వ కారిణి'],
      ingredients: ['Pure Mustard Seeds (స్వచ్ఛమైన నల్ల ఆవాలు)'], usage: ['సాంప్రదాయ ఆవకాయ పచ్చళ్లకు మరియు వంటలకు వాడండి.']
    },
    {
      name: 'Cold Pressed Mustard Oil (సాంప్రదాయ చెక్క గానుగ ఆవ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ ఆవ నూనె',
      slug: 'cold-pressed-mustard-oil-5l',
      description: 'సాంప్రదాయ చెక్క గానుగ ఆవ నూనె. 5 లీటర్ల పెద్ద క్యాన్.',
      images: ['/images/products/mustard_oil.png'],
      price: 1420, mrp: 1650, stock: 35, unit: 'Litre', weight: 5.0, categorySlug: 'cold-pressed', sku: 'MST-CP-5L',
      benefits: ['100% Natural Oil / సహజ నూనె', 'Improves digestion / జీర్ణశక్తిని పెంచుతుంది'],
      ingredients: ['Pure Mustard Seeds (స్వచ్ఛమైన నల్ల ఆవాలు)'], usage: ['రోజూవారీ ఉత్తర భారత వంటలకు ఉపయోగించవచ్చు.']
    },
    {
      name: 'Cold Pressed Mustard Oil (సాంప్రదాయ చెక్క గానుగ ఆవ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ ఆవ నూనె',
      slug: 'cold-pressed-mustard-oil-500ml',
      description: 'చెక్క గానుగ ఆవ నూనె. 500 మిల్లీలీటర్ల ప్యాక్.',
      images: ['/images/products/mustard_oil.png'],
      price: 155, mrp: 180, stock: 70, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'MST-CP-500M',
      benefits: ['High Pungency / ఘాటు ఎక్కువగా ఉంటుంది', 'Wooden Press / గానుగ నూనె'],
      ingredients: ['Pure Mustard Seeds (ఆవాలు)'], usage: ['చిన్నపాటి పోపు వంటలకు లేదా బాడీ మసాజ్‌కి అనుకూలం.']
    },
    {
      name: 'Cold Pressed Mustard Oil (సాంప్రదాయ చెక్క గానుగ ఆవ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ ఆవ నూనె',
      slug: 'cold-pressed-mustard-oil-15l',
      description: 'గానుగ ఆవ నూనె. 15 లీటర్ల పెద్ద టిన్.',
      images: ['/images/products/mustard_oil.png'],
      price: 4200, mrp: 4900, stock: 15, unit: 'Litre', weight: 15.0, categorySlug: 'cold-pressed', sku: 'MST-CP-15L',
      benefits: ['Pure Cold Pressed / గానుగ నూనె', 'Best for Pickles / నిల్వ పచ్చళ్లకు అనుకూలం'],
      ingredients: ['Mustard Seeds (ఆవాలు)'], usage: ['హోల్‌సేల్ ఆవకాయ పచ్చళ్ల తయారీకి ఉత్తమం.']
    },
    {
      name: 'Pure Filtered Mustard Oil (స్వచ్ఛమైన వడపోసిన ఆవ నూనె)',
      nameTe: 'స్వచ్ఛమైన వడపోసిన ఆవ నూనె',
      slug: 'filtered-mustard-oil-1l',
      description: 'సహజ పద్ధతిలో శుభ్రంగా వడపోసిన ఆవ నూనె. తేలికపాటి ఘాటు కలిగి ఉంటుంది.',
      images: ['/images/products/mustard_oil.png'],
      price: 220, mrp: 260, stock: 50, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'MST-FIL-1L',
      benefits: ['Double Filtered / రెండుసార్లు వడపోసినది', 'Zero Chemicals / రసాయనాలు లేవు'],
      ingredients: ['Mustard Seeds (ఆవాలు)'], usage: ['ఉత్తర భారత వంటల తయారీకి.']
    },
    {
      name: 'Pure Filtered Mustard Oil (స్వచ్ఛమైన వడపోసిన ఆవ నూనె)',
      nameTe: 'స్వచ్ఛమైన వడపోసిన ఆవ నూనె',
      slug: 'filtered-mustard-oil-5l',
      description: 'వడపోసిన ఆవ నూనె. 5 లీటర్ల క్యాన్ పరిమాణం.',
      images: ['/images/products/mustard_oil.png'],
      price: 1050, mrp: 1250, stock: 25, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'MST-FIL-5L',
      benefits: ['Purely Filtered / సహజ వడపోత', 'Great shelf life / ఎక్కువ రోజులు నిల్వ ఉంటుంది'],
      ingredients: ['Mustard Seeds (ఆవాలు)'], usage: ['ఫ్రై వంటలకు మరియు కూరలకు అనుకూలం.']
    },

    // --- SESAME / NUVVULA OILS (నువ్వుల నూనె) ---
    {
      name: 'Cold Pressed Sesame Oil (సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె',
      slug: 'cold-pressed-sesame-oil-1l',
      description: 'నల్ల నువ్వుల నుండి గానుగ ద్వారా తీసిన స్వచ్ఛమైన నువ్వుల నూనె. దీపారాధనకు మరియు ఒంటి చలువ చేసే వంటలకు అనుకూలమైనది.',
      images: ['/images/products/pure_sesame_oil.png'],
      price: 390, mrp: 450, stock: 50, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'SES-CP-1L',
      benefits: ['Auspicious for Diya / దీపారాధనకు శ్రేష్ఠం', 'Traditional Wooden Press / గానుగ నూనె', 'Rich in antioxidants / పోషకాలు మెండుగా కలవు'],
      ingredients: ['Black Sesame Seeds (నల్ల నువ్వులు)'], usage: ['వంటలలో లేదా దీపాలు వెలిగించడానికి ఉపయోగించండి.']
    },
    {
      name: 'Cold Pressed Sesame Oil (సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె',
      slug: 'cold-pressed-sesame-oil-5l',
      description: 'చెక్క గానుగ నువ్వుల నూనె. 5 లీటర్ల క్యాన్.',
      images: ['/images/products/pure_sesame_oil.png'],
      price: 1900, mrp: 2200, stock: 30, unit: 'Litre', weight: 5.0, categorySlug: 'cold-pressed', sku: 'SES-CP-5L',
      benefits: ['100% Pure Sesame / నల్ల నువ్వుల నూనె', 'Anti-inflammatory / చర్మ రక్షణకు సహాయపడుతుంది'],
      ingredients: ['Black Sesame Seeds (నల్ల నువ్వులు)'], usage: ['ఆయుర్వేద అభ్యంగన స్నానాలకు మరియు వంటలకు.']
    },
    {
      name: 'Cold Pressed Sesame Oil (సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె',
      slug: 'cold-pressed-sesame-oil-500ml',
      description: 'చెక్క గానుగ నువ్వుల నూనె. 500 మిల్లీలీటర్ల బాటిల్.',
      images: ['/images/products/pure_sesame_oil.png'],
      price: 205, mrp: 240, stock: 65, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'SES-CP-500M',
      benefits: ['Rich taste / కమ్మని రుచి', 'Wooden Pressed / చెక్క గానుగ'],
      ingredients: ['Sesame Seeds (నువ్వులు)'], usage: ['దీపారాధనకు లేదా వంటకాలలో వాడటానికి.']
    },
    {
      name: 'Cold Pressed Sesame Oil (సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నువ్వుల నూనె',
      slug: 'cold-pressed-sesame-oil-15l',
      description: 'స్వచ్ఛమైన చెక్క గానుగ నువ్వుల నూనె. 15 లీటర్ల పెద్ద టిన్ ప్యాక్.',
      images: ['/images/products/pure_sesame_oil.png'],
      price: 5600, mrp: 6500, stock: 12, unit: 'Litre', weight: 15.0, categorySlug: 'cold-pressed', sku: 'SES-CP-15L',
      benefits: ['Bulk Value / హోల్‌సేల్ ప్యాక్', 'Pure & Traditional / సాంప్రదాయమైనది'],
      ingredients: ['Sesame Seeds (నువ్వులు)'], usage: ['దేవాలయాల దీపారాధనకు మరియు పెద్ద ఎత్తున వంటలకు శ్రేష్ఠం.']
    },
    {
      name: 'Filtered Sesame Oil (వడపోసిన నువ్వుల నూనె)',
      nameTe: 'వడపోసిన నువ్వుల నూనె',
      slug: 'filtered-sesame-oil-1l',
      description: 'సహజ రంగు మరియు సువాసన నిలిపి ఉంచేలా వడపోసిన నువ్వుల నూనె.',
      images: ['/images/products/pure_sesame_oil.png'],
      price: 320, mrp: 380, stock: 45, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'SES-FIL-1L',
      benefits: ['Double Filtered / రెండుసార్లు వడపోసినది', 'Perfect for Cooking / వంటలకు ఎంతో మేలు చేయును'],
      ingredients: ['Sesame Seeds (నువ్వులు)'], usage: ['పులిహోర వంటకాలకు మరియు పోపులకు ఎంతో రుచినిస్తుంది.']
    },

    // --- SUNFLOWER OILS (సూర్యకాంతి నూనె) ---
    {
      name: 'Refined Sunflower Oil (ప్రీమియం శుద్ధి చేసిన సూర్యకాంతి నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన సూర్యకాంతి నూనె',
      slug: 'refined-sunflower-oil-1l',
      description: 'రసాయన వ్యర్థాలు లేని ప్రీమియం క్వాలిటీ రిఫైన్డ్ సూర్యకాంతి నూనె. గుండెకు మరియు రోజూవారీ వంటలకు ఎంతో తేలికైనది.',
      images: ['/images/products/sunflower_oil.png'],
      price: 150, mrp: 180, stock: 100, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'SUN-REF-1L',
      benefits: ['Vitamin A, D & E Fortified / విటమిన్లు కలవు', 'Light and Easy to Digest / జీర్ణమవడానికి తేలికైనది', 'Low absorption / తక్కువ నూనె పీల్చుకుంటుంది'],
      ingredients: ['Sunflower Seeds (సూర్యకాంతి గింజలు)'], usage: ['అన్ని రకాల కూరలు మరియు ఫ్రైలకు వాడుకోవచ్చు.']
    },
    {
      name: 'Refined Sunflower Oil (ప్రీమియం శుద్ధి చేసిన సూర్యకాంతి నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన సూర్యకాంతి నూనె',
      slug: 'refined-sunflower-oil-5l',
      description: 'ప్రీమియం క్వాలిటీ రిఫైన్డ్ సూర్యకాంతి నూనె. 5 లీటర్ల క్యాన్.',
      images: ['/images/products/sunflower_oil.png'],
      price: 730, mrp: 850, stock: 80, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'SUN-REF-5L',
      benefits: ['Multi-stage Refined / శుద్ధి చేసినది', 'Value Pack / కుటుంబానికి శ్రేష్ఠమైనది'],
      ingredients: ['Sunflower Seeds (సూర్యకాంతి గింజలు)'], usage: ['రోజూ కూరలకు, డీప్ ఫ్రై వంటలకు శ్రేష్ఠం.']
    },
    {
      name: 'Refined Sunflower Oil (ప్రీమియం శుద్ధి చేసిన సూర్యకాంతి నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన సూర్యకాంతి నూనె',
      slug: 'refined-sunflower-oil-15l',
      description: 'ప్రీమియం క్వాలిటీ శుద్ధి చేసిన సూర్యకాంతి నూనె. 15 లీటర్ల పెద్ద టిన్.',
      images: ['/images/products/sunflower_oil.png'],
      price: 2150, mrp: 2500, stock: 30, unit: 'Litre', weight: 15.0, categorySlug: 'refined-filtered', sku: 'SUN-REF-15L',
      benefits: ['Bulk Savings / పెద్ద మొత్తంలో లాభం', 'High Smoke Point / ఎక్కువ వేడిని తట్టుకుంటుంది'],
      ingredients: ['Sunflower Seeds (సూర్యకాంతి గింజలు)'], usage: ['పండుగ పిండివంటలు తయారు చేయడానికి అనుకూలం.']
    },
    {
      name: 'Pure Filtered Sunflower Oil (స్వచ్ఛమైన వడపోసిన సూర్యకాంతి నూనె)',
      nameTe: 'స్వచ్ఛమైన వడపోసిన సూర్యకాంతి నూనె',
      slug: 'filtered-sunflower-oil-1l',
      description: 'సహజ వడపోత పద్ధతి ద్వారా సేకరించిన సూర్యకాంతి నూనె. రసాయనాలు కలపబడలేదు.',
      images: ['/images/products/sunflower_oil.png'],
      price: 170, mrp: 200, stock: 50, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'SUN-FIL-1L',
      benefits: ['Chemical Free / కెమికల్స్ లేవు', 'Cold Filtered / సహజంగా వడపోసినది'],
      ingredients: ['Sunflower Seeds (సూర్యకాంతి గింజలు)'], usage: ['సాధారణ వంటలలో పోపు వేయడానికి.']
    },
    {
      name: 'Pure Filtered Sunflower Oil (స్వచ్ఛమైన వడపోసిన సూర్యకాంతి నూనె)',
      nameTe: 'స్వచ్ఛమైన వడపోసిన సూర్యకాంతి నూనె',
      slug: 'filtered-sunflower-oil-5l',
      description: 'సహజ పద్ధతిలో వడపోసిన సూర్యకాంతి నూనె. 5 లీటర్ల క్యాన్.',
      images: ['/images/products/sunflower_oil.png'],
      price: 820, mrp: 950, stock: 30, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'SUN-FIL-5L',
      benefits: ['Double Filtered / డబుల్ ఫిల్టర్డ్', 'Zero Additives / ఎటువంటి ప్రిజర్వేటివ్స్ లేవు'],
      ingredients: ['Sunflower Seeds (సూర్యకాంతి గింజలు)'], usage: ['రోజూవారీ పౌష్టిక ఆహార వంటలకు.']
    },

    // --- SAFFLOWER OILS (కుసుమ నూనె) ---
    {
      name: 'Cold Pressed Safflower Oil (సాంప్రదాయ చెక్క గానుగ కుసుమ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కుసుమ నూనె',
      slug: 'cold-pressed-safflower-oil-1l',
      description: 'కుసుమ గింజల నుండి చెక్క గానుగ ద్వారా సేకరించిన ఆరోగ్యకరమైన వంట నూనె. కొలెస్ట్రాల్ నియంత్రించడానికి ఎంతో తోడ్పడుతుంది.',
      images: ['/images/products/safflower_oil.png'],
      price: 340, mrp: 390, stock: 40, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'SAF-CP-1L',
      benefits: ['Helps Manage Cholesterol / కొలెస్ట్రాల్ నియంత్రణకు మేలు చేయును', '100% Wood Pressed / గానుగ నూనె', 'Rich in Linoleic Acid / గుండెకు శ్రేష్ఠమైనది'],
      ingredients: ['Safflower Seeds (కుసుమ గింజలు)'], usage: ['రోజూవారీ వంటలకు వాడుకోవచ్చు.']
    },
    {
      name: 'Cold Pressed Safflower Oil (సాంప్రదాయ చెక్క గానుగ కుసుమ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కుసుమ నూనె',
      slug: 'cold-pressed-safflower-oil-5l',
      description: 'చెక్క గానుగ కుసుమ నూనె. 5 లీటర్ల క్యాన్ పరిమాణం.',
      images: ['/images/products/safflower_oil.png'],
      price: 1650, mrp: 1900, stock: 25, unit: 'Litre', weight: 5.0, categorySlug: 'cold-pressed', sku: 'SAF-CP-5L',
      benefits: ['Anti-oxidant properties / యాంటీఆక్సిడెంట్స్ సమృద్ధి', 'Healthy lifestyle oil / ఆరోగ్యకరమైన నూనె'],
      ingredients: ['Safflower Seeds (కుసుమ గింజలు)'], usage: ['కూరలకు మరియు డీప్ ఫ్రైలకు శ్రేష్ఠం.']
    },
    {
      name: 'Cold Pressed Safflower Oil (సాంప్రదాయ చెక్క గానుగ కుసుమ నూనె)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ కుసుమ నూనె',
      slug: 'cold-pressed-safflower-oil-500ml',
      description: 'చెక్క గానుగ కుసుమ నూనె. 500 మిల్లీలీటర్ల బాటిల్.',
      images: ['/images/products/safflower_oil.png'],
      price: 180, mrp: 210, stock: 50, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'SAF-CP-500M',
      benefits: ['Heart Healthy / హార్ట్ ఫ్రెండ్లీ', 'Pure & Unrefined / స్వచ్ఛమైన నూనె'],
      ingredients: ['Safflower Seeds (కుసుమ గింజలు)'], usage: ['తేలికపాటి వంటలకు.']
    },
    {
      name: 'Filtered Safflower Oil (వడపోసిన కుసుమ నూనె)',
      nameTe: 'వడపోసిన కుసుమ నూనె',
      slug: 'filtered-safflower-oil-1l',
      description: 'రసాయన రహితంగా వడపోసిన కుసుమ నూనె.',
      images: ['/images/products/safflower_oil.png'],
      price: 270, mrp: 320, stock: 35, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'SAF-FIL-1L',
      benefits: ['Double Filtered / రెండుసార్లు వడపోసినది', 'Clean & light / లైట్ గా ఉంటుంది'],
      ingredients: ['Safflower Seeds (కుసుమ గింజలు)'], usage: ['డీప్ ఫ్రై మరియు పోపులకు వాడండి.']
    },

    // --- RICE BRAN OILS (వరి తవుడు నూనె) ---
    {
      name: 'Refined Rice Bran Oil (ప్రీమియం శుద్ధి చేసిన వరి తవుడు నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన వరి తవుడు నూనె',
      slug: 'refined-rice-bran-oil-1l',
      description: 'వరి తవుడు నుండి శుద్ధి చేసి తయారుచేసిన ప్రీమియం వంట నూనె. ఒరైజనాల్ సమృద్ధిగా ఉండి కొలెస్ట్రాల్ తగ్గించడంలో సాయపడుతుంది.',
      images: ['/images/products/rice_bran_oil.png'],
      price: 160, mrp: 190, stock: 80, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'RBO-REF-1L',
      benefits: ['Rich in Oryzanol / ఒరైజనాల్ సమృద్ధిగా ఉండును', 'High smoke point / ఎక్కువ వేడిని తట్టుకోగలదు', 'Low Oil Absorption / తక్కువ నూనె పీల్చుకుంటుంది'],
      ingredients: ['Fresh Rice Bran (తాజా వరి తవుడు)'], usage: ['రోజూవారీ కూరలకు, చపాతి మరియు డీప్ ఫ్రై వంటలకు.']
    },
    {
      name: 'Refined Rice Bran Oil (ప్రీమియం శుద్ధి చేసిన వరి తవుడు నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన వరి తవుడు నూనె',
      slug: 'refined-rice-bran-oil-5l',
      description: 'శుద్ధి చేసిన వరి తవుడు నూనె. 5 లీటర్ల క్యాన్.',
      images: ['/images/products/rice_bran_oil.png'],
      price: 780, mrp: 900, stock: 60, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'RBO-REF-5L',
      benefits: ['Heart Friendly / గుండెకు రక్షణ', 'Value Size / ఆదా ప్యాక్'],
      ingredients: ['Fresh Rice Bran (వరి తవుడు)'], usage: ['కుటుంబ వంటలకు ఉపయోగించండి.']
    },
    {
      name: 'Refined Rice Bran Oil (ప్రీమియం శుద్ధి చేసిన వరి తవుడు నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన వరి తవుడు నూనె',
      slug: 'refined-rice-bran-oil-15l',
      description: 'వరి తవుడు నూనె. 15 లీటర్ల పెద్ద మెటల్ టిన్ ప్యాక్.',
      images: ['/images/products/rice_bran_oil.png'],
      price: 2250, mrp: 2600, stock: 20, unit: 'Litre', weight: 15.0, categorySlug: 'refined-filtered', sku: 'RBO-REF-15L',
      benefits: ['Bulk Savings / పెద్ద మొత్తంలో ఆదా', 'Excellent shelf life / ఎక్కువ రోజులు నిల్వ ఉండును'],
      ingredients: ['Fresh Rice Bran (వరి తవుడు)'], usage: ['పెద్ద మొత్తంలో వంటకాలు చేయడానికి.']
    },
    {
      name: 'Cold Pressed Rice Bran Oil (చెక్క గానుగ వరి తవుడు నూనె)',
      nameTe: 'చెక్క గానుగ వరి తవుడు నూనె',
      slug: 'cold-pressed-rice-bran-oil-1l',
      description: 'సాంప్రదాయ చెక్క గానుగ పద్ధతిలో సేకరించిన స్వచ్ఛమైన వరి తవుడు నూనె.',
      images: ['/images/products/rice_bran_oil.png'],
      price: 220, mrp: 260, stock: 35, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'RBO-CP-1L',
      benefits: ['Unrefined / శుద్ధి చేయనిది', 'Natural taste and nutrients / సహజ పోషకాలు కలవు'],
      ingredients: ['Fresh Rice Bran (వరి తవుడు)'], usage: ['సాధారణ వంటలలో పోపు వేయడానికి.']
    },

    // --- OLIVE OILS (ఆలివ్ నూనె) ---
    {
      name: 'Extra Virgin Olive Oil (స్వచ్ఛమైన ఆలివ్ నూనె - మొదటి పిండు)',
      nameTe: 'స్వచ్ఛమైన ఆలివ్ నూనె - మొదటి పిండు',
      slug: 'extra-virgin-olive-oil-1l',
      description: 'అత్యుత్తమ క్వాలిటీ ఆలివ్ పండ్ల నుండి మొదటి పిండు (ఫస్ట్ ప్రెస్) ద్వారా తీసిన ఎక్స్‌ట్రా వర్జిన్ ఆలివ్ నూనె. సలాడ్స్ మరియు ఇటాలియన్ వంటలకు పవిత్రమైన సువాసననిస్తుంది.',
      images: ['/images/products/olive_oil.png'],
      price: 950, mrp: 1200, stock: 30, unit: 'Litre', weight: 1.0, categorySlug: 'cold-pressed', sku: 'OLV-EV-1L',
      benefits: ['First Cold Press / మొదటి పిండు కోల్డ్ ప్రెస్డ్', 'Rich in Monounsaturated Fats / మోనో-అన్‌శాచురేటెడ్ కొవ్వులు కలవు', 'Anti-aging & skin health / చర్మానికి ఎంతో మేలు చేయును'],
      ingredients: ['Mediterranean Olives (ఆలివ్ పండ్లు)'], usage: ['సలాడ్లు, పాస్తా వంటలపై చల్లుకోవడానికి మరియు చర్మ సంరక్షణకు ఉపయోగించండి.']
    },
    {
      name: 'Extra Virgin Olive Oil (స్వచ్ఛమైన ఆలివ్ నూనె - మొదటి పిండు)',
      nameTe: 'స్వచ్ఛమైన ఆలివ్ నూనె - మొదటి పిండు',
      slug: 'extra-virgin-olive-oil-500ml',
      description: 'ఎక్స్‌ట్రా వర్జిన్ ఆలివ్ నూనె. 500 మిల్లీలీటర్ల బాటిల్.',
      images: ['/images/products/olive_oil.png'],
      price: 520, mrp: 650, stock: 45, unit: 'Litre', weight: 0.5, categorySlug: 'cold-pressed', sku: 'OLV-EV-500M',
      benefits: ['100% Pure Extra Virgin / శుద్ధమైన ఆలివ్ నూనె', 'Heart healthy / గుండెకు ఎంతో మేలు'],
      ingredients: ['Mediterranean Olives (ఆలివ్ పండ్లు)'], usage: ['సలాడ్ డ్రెస్సింగ్స్ కి శ్రేష్ఠం.']
    },
    {
      name: 'Extra Virgin Olive Oil (స్వచ్ఛమైన ఆలివ్ నూనె - మొదటి పిండు)',
      nameTe: 'స్వచ్ఛమైన ఆలివ్ నూనె - మొదటి పిండు',
      slug: 'extra-virgin-olive-oil-250ml',
      description: 'ఎక్స్‌ట్రా వర్జిన్ ఆలివ్ నూనె. 250 మిల్లీలీటర్ల అనుకూలమైన చిన్న బాటిల్.',
      images: ['/images/products/olive_oil.png'],
      price: 290, mrp: 360, stock: 60, unit: 'Litre', weight: 0.25, categorySlug: 'cold-pressed', sku: 'OLV-EV-250M',
      benefits: ['Rich aroma / మంచి సువాసన', 'High quality / అత్యుత్తమ క్వాలిటీ'],
      ingredients: ['Olives (ఆలివ్ పండ్లు)'], usage: ['ఆహార అలంకరణకు, పోపులకు.']
    },
    {
      name: 'Pure Olive Pomace Oil (శుద్ధి చేసిన ఆలివ్ పోమేస్ నూనె)',
      nameTe: 'శుద్ధి చేసిన ఆలివ్ పోమేస్ నూనె',
      slug: 'olive-pomace-oil-1l',
      description: 'శుద్ధి చేసిన ఆలివ్ పోమేస్ నూనె. అధిక వేడిని తట్టుకోగలదు కాబట్టి భారతీయ వంటలకు అనుకూలమైనది.',
      images: ['/images/products/olive_oil.png'],
      price: 580, mrp: 700, stock: 40, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'OLV-POM-1L',
      benefits: ['High Smoke Point / అధిక వేడిని తట్టుకుంటుంది', 'Mild Olive Flavor / తేలికపాటి ఆలివ్ రుచి'],
      ingredients: ['Refined Olive Pomace (ఆలివ్ గింజలు)'], usage: ['డీప్ ఫ్రైయింగ్ మరియు ఇండియన్ వంటకాలకు.']
    },
    {
      name: 'Pure Olive Pomace Oil (శుద్ధి చేసిన ఆలివ్ పోమేస్ నూనె)',
      nameTe: 'శుద్ధి చేసిన ఆలివ్ పోమేస్ నూనె',
      slug: 'olive-pomace-oil-5l',
      description: 'ఆలివ్ పోమేస్ నూనె. 5 లీటర్ల క్యాన్ పరిమాణం.',
      images: ['/images/products/olive_oil.png'],
      price: 2750, mrp: 3200, stock: 15, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'OLV-POM-5L',
      benefits: ['Bulk Pack / పెద్ద క్యాన్', 'Great for daily cooking / నిత్య వంటలకు శ్రేష్ఠం'],
      ingredients: ['Refined Olive Pomace (ఆలివ్ గింజలు)'], usage: ['అన్ని రకాల కూరలు వేయించడానికి.']
    },

    // --- SOYABEAN OILS (సోయాబీన్ నూనె) ---
    {
      name: 'Refined Soyabean Oil (ప్రీమియం శుద్ధి చేసిన సోయాబీన్ నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన సోయాబీన్ నూనె',
      slug: 'refined-soyabean-oil-1l',
      description: 'ప్రోటీన్లు సమృద్ధిగా ఉండే సోయా గింజల నుండి తీసిన రిఫైన్డ్ సోయాబీన్ నూనె. ఆరోగ్యానికి ఎంతో మంచిది.',
      images: ['/images/products/sunflower_oil.png'], // fallback sunflower
      price: 145, mrp: 170, stock: 90, unit: 'Litre', weight: 1.0, categorySlug: 'refined-filtered', sku: 'SOY-REF-1L',
      benefits: ['Rich in Omega-3 / ఒమేగా-3 కొవ్వు ఆమ్లాలు కలవు', 'Light & Healthy / తేలికగా ఉండి ఆరోగ్యానికి మంచిది'],
      ingredients: ['Soyabean Seeds (సోయాబీన్ గింజలు)'], usage: ['నిత్యం వండే వంటలకు అనుకూలం.']
    },
    {
      name: 'Refined Soyabean Oil (ప్రీమియం శుద్ధి చేసిన సోయాబీన్ నూనె)',
      nameTe: 'ప్రీమియం శుద్ధి చేసిన సోయాబీన్ నూనె',
      slug: 'refined-soyabean-oil-5l',
      description: 'రిఫైన్డ్ సోయాబీన్ నూనె. 5 లీటర్ల క్యాన్.',
      images: ['/images/products/sunflower_oil.png'], // fallback sunflower
      price: 700, mrp: 800, stock: 40, unit: 'Litre', weight: 5.0, categorySlug: 'refined-filtered', sku: 'SOY-REF-5L',
      benefits: ['Omega-3 Rich / ఒమేగా-3 సమృద్ధి', 'Value family pack / కుటుంబ ఆదా ప్యాక్'],
      ingredients: ['Soyabean Seeds (సోయాబీన్ గింజలు)'], usage: ['ఫ్రైలు మరియు నిత్య కూరలకు.']
    }
  ];

  // Map slugs to categories
  const catMap: Record<string, string> = {
    'cold-pressed': categoryColdPressed.id,
    'refined-filtered': categoryRefinedFiltered.id
  };

  // Disable all existing products first to clean up old database states (such as Pooja items)
  await prisma.product.updateMany({
    data: { isActive: false }
  });

  for (const raw of rawProducts) {
    const categoryId = catMap[raw.categorySlug];
    const productData = {
      name: raw.name,
      nameTe: raw.nameTe,
      slug: raw.slug,
      description: raw.description,
      images: JSON.stringify(raw.images),
      price: raw.price,
      mrp: raw.mrp,
      sku: raw.sku,
      stock: raw.stock,
      unit: raw.unit,
      weight: raw.weight,
      categoryId: categoryId,
      benefits: JSON.stringify(raw.benefits),
      ingredients: JSON.stringify(raw.ingredients),
      usage: JSON.stringify(raw.usage),
      isActive: true
    };

    await prisma.product.upsert({
      where: { slug: raw.slug },
      update: {
        price: productData.price,
        mrp: productData.mrp,
        stock: productData.stock,
        benefits: productData.benefits,
        description: productData.description,
        images: productData.images,
        isActive: productData.isActive,
      },
      create: productData,
    });
  }
  console.log(`Successfully seeded ${rawProducts.length} edible oil products.`);

  // 6. Create home banners
  // Clean up old banners
  await prisma.banner.deleteMany({});
  
  const banners = [
    {
      image: '/images/categories/cold_pressed.png',
      title: 'సాంప్రదాయ చెక్క గానుగ నూనెలు',
      subtitle: 'Natural Cold Pressed Oils - 100% Pure, Wood Pressed & Organic',
      ctaLink: '/products?category=cold-pressed',
      sortOrder: 1,
      isActive: true,
    },
    {
      image: '/images/categories/refined_filtered.png',
      title: 'శుద్ధి చేసిన & వడపోసిన వంట నూనెలు',
      subtitle: 'Refined & Filtered Cooking Oils for Daily Healthy Kitchens',
      ctaLink: '/products?category=refined-filtered',
      sortOrder: 2,
      isActive: true,
    }
  ];

  for (const b of banners) {
    await prisma.banner.create({ data: b });
  }
  console.log('Banners created/verified.');

  console.log('Database seeding successfully completed! 🎉');
}

main()
  .catch((e) => {
    console.error('Error during seeding database: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
