const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targetOils = [
  {
    name: 'Cold Pressed Groundnut Oil',
    nameTe: 'వేరుశనగ నూనె',
    slug: 'cold-pressed-groundnut-oil-1l',
    price: 320,
    mrp: 370,
    sku: 'GND-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/cold_pressed_groundnut_oil.png',
    description: '100% స్వచ్ఛమైన సాంప్రదాయ చెక్క గానుగ వేరుశనగ నూనె. ఎటువంటి రసాయనాలు లేవు.',
    benefits: ['100% Wood Pressed / చెక్క గానుగ', 'Zero Chemicals / ఎటువంటి రసాయనాలు లేవు', 'Healthy cooking / ఆరోగ్యకరమైన వంట నూనె']
  },
  {
    name: 'Cold Pressed Black Sesame Oil',
    nameTe: 'నల్ల నువ్వుల నూనె',
    slug: 'cold-pressed-black-sesame-oil-1l',
    price: 350,
    mrp: 400,
    sku: 'BSES-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/pure_sesame_oil.png',
    description: 'సాంప్రదాయ పద్ధతిలో నల్ల నువ్వుల నుండి గానుగ ద్వారా తీసిన స్వచ్ఛమైన నూనె.',
    benefits: ['100% Wood Pressed / చెక్క గానుగ', 'Rich in nutrients / పోషకాలు మెండుగా కలవు', 'Perfect for daily health / ఆరోగ్యానికి మేలు చేయును']
  },
  {
    name: 'Cold Pressed White Sesame Oil',
    nameTe: 'నువ్వుల పప్పు నూనె',
    slug: 'cold-pressed-white-sesame-oil-1l',
    price: 450,
    mrp: 520,
    sku: 'WSES-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/pure_sesame_oil.png',
    description: 'నువ్వుల పప్పు నుండి సేకరించిన అత్యుత్తమ నాణ్యమైన స్వచ్ఛమైన నువ్వుల నూనె.',
    benefits: ['100% Pure Sesame / స్వచ్ఛమైన నువ్వుల నూనె', 'Traditional Wooden Press / గానుగ నూనె', 'Premium Taste / కమ్మని రుచి']
  },
  {
    name: 'Cold Pressed Coconut Oil',
    nameTe: 'కొబ్బరి నూనె',
    slug: 'cold-pressed-coconut-oil-1l',
    price: 800,
    mrp: 920,
    sku: 'COC-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/cold_pressed_coconut_oil.png',
    description: 'ఎండబెట్టిన కొబ్బరి చిప్పల నుండి చెక్క గానుగ ద్వారా తీసిన స్వచ్ఛమైన కొబ్బరి నూనె. జుట్టు మరియు వంటకు శ్రేష్ఠం.',
    benefits: ['100% Pure Copra Oil / స్వచ్ఛమైన కొబ్బరి నూనె', 'Multipurpose Use / జుట్టు మరియు వంటకు మేలు చేయును', 'Unrefined / సహజ సిద్ధమైనది']
  },
  {
    name: 'Cold Pressed Sunflower Oil',
    nameTe: 'సన్ ఫ్లవర్ నూనె',
    slug: 'cold-pressed-sunflower-oil-1l',
    price: 450,
    mrp: 520,
    sku: 'SUN-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/sunflower_oil.png',
    description: 'సూర్యకాంతి గింజల నుండి చెక్క గానుగ పద్ధతి ద్వారా సేకరించిన తేలికపాటి వంట నూనె.',
    benefits: ['Light & Easy to Digest / తేలికైనది', 'Chemical Free / రసాయనాలు లేవు', 'Healthy Heart / గుండెకు మేలు చేయును']
  },
  {
    name: 'Cold Pressed Almond Oil',
    nameTe: 'బాదం నూనె',
    slug: 'cold-pressed-almond-oil-1l',
    price: 2000,
    mrp: 2300,
    sku: 'ALM-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/badam_oil.png',
    description: 'నాణ్యమైన ప్రీమియం బాదం పప్పుల నుండి చెక్క గానుగ ద్వారా సేకరించిన అమూల్యమైన బాదం నూనె.',
    benefits: ['Premium California Almonds / బ్రాండెడ్ బాదం పప్పులు', 'Rich in Vitamin E / విటమిన్ E సమवृद्धिగా ఉంటుంది', 'Perfect for Hair & Skin / చర్మ, జుట్టు సంరక్షణ']
  },
  {
    name: 'Cold Pressed Castor Oil',
    nameTe: 'ఆముదం నూనె',
    slug: 'cold-pressed-castor-oil-1l',
    price: 350,
    mrp: 400,
    sku: 'CAS-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/olive_oil.png',
    description: 'సాంప్రదాయ పద్ధతిలో సేకరించిన స్వచ్ఛమైన ఆముదం నూనె. జుట్టు మరియు చర్మ రక్షణకు సహాయపడుతుంది.',
    benefits: ['100% Natural Castor / స్వచ్ఛమైన ఆముదం', 'Hair growth booster / జుట్టు ఒత్తుగా పెరగడానికి తోడ్పడుతుంది', 'Moisturizes Skin / చర్మాన్ని మృదువుగా చేయును']
  },
  {
    name: 'Cold Pressed Flaxseed Oil',
    nameTe: 'అవిశ నూనె',
    slug: 'cold-pressed-flaxseed-oil-1l',
    price: 450,
    mrp: 520,
    sku: 'FLX-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/safflower_oil.png',
    description: 'అవిసె గింజల నుండి కోల్డ్ ప్రెస్డ్ విధానంలో సేకరించిన ఒమేగా-3 ఫ్యాటీ యాసిడ్స్ సమృద్ధిగా గల ఆరోగ్యకరమైన నూనె.',
    benefits: ['Omega-3 Rich / ఒమేగా-3 పోషకాలు', '100% Wood Pressed / చెక్క గానుగ', 'Immunity Booster / రోగ నిరోధక శక్తి పెంచుతుంది']
  },
  {
    name: 'Cold Pressed Mustard Oil',
    nameTe: 'ఆవ నూనె',
    slug: 'cold-pressed-mustard-oil-1l',
    price: 400,
    mrp: 460,
    sku: 'MST-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/mustard_oil.png',
    description: 'గాఢమైన సువాసన మరియు ఘాటు కలిగిన సాంప్రదాయ చెక్క గానుగ ఆవ నూనె.',
    benefits: ['Strong Pungent Aroma / గాఢమైన ఘాటు', 'Natural Preservative / సహజ నిల్వ కారిణి', 'Cold Pressed / గానుగ నూనె']
  },
  {
    name: 'Cold Pressed Safflower Oil',
    nameTe: 'కుసుమ నూనె',
    slug: 'cold-pressed-safflower-oil-1l',
    price: 500,
    mrp: 580,
    sku: 'SAF-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/safflower_oil.png',
    description: 'కుసుమ గింజల నుండి చెక్క గానుగ ద్వారా సేకరించిన ఒరిజినల్ వంట నూనె. కొలెస్ట్రాల్ నియంత్రించడానికి తోడ్పడుతుంది.',
    benefits: ['Helps Manage Cholesterol / కొలెస్ట్రాల్ నియంత్రణ', 'Traditional Wood Pressed / చెక్క గానుగ', 'Light for cooking / వంటకు శ్రేష్ఠం']
  },
  {
    name: 'Cold Pressed Niger Seed Oil',
    nameTe: 'వెర్రి నువ్వుల నూనె',
    slug: 'cold-pressed-niger-seed-oil-1l',
    price: 850,
    mrp: 980,
    sku: 'NIG-CP-1L',
    unit: 'Litre',
    weight: 1.0,
    image: '/images/products/pure_sesame_oil.png',
    description: 'సాంప్రదాయ వెర్రి నువ్వుల నుండి తీసిన స్వచ్ఛమైన ప్రత్యేకమైన నూనె. ఎన్నో ఆయుర్వేద గుణాలు కలవు.',
    benefits: ['Traditional Niger Seed / వెర్రి నువ్వులు', 'Medicinal Values / ఆయుర్వేద గుణాలు', '100% Cold Pressed / గానుగ నూనె']
  }
];

async function sync() {
  console.log('Synchronizing products database with the Guntur Store Price List...');

  // Update site settings
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
    }
  });
  console.log('Updated site settings in database.');

  // Ensure category exists
  const category = await prisma.category.upsert({
    where: { slug: 'cold-pressed' },
    update: { isActive: true },
    create: {
      name: 'Traditional Cold Pressed Oils (సాంప్రదాయ చెక్క గానుగ నూనెలు)',
      nameTe: 'సాంప్రదాయ చెక్క గానుగ నూనెలు',
      slug: 'cold-pressed',
      image: '/images/categories/cold_pressed.png',
      description: 'సాంప్రదాయ చెక్క గానుగ పద్ధతి ద్వారా సేకరించిన స్వచ్ఛమైన మరియు పోషకాలు నిండిన నూనెలు',
      sortOrder: 1,
      isActive: true,
    }
  });

  // Deactivate all other categories to only show Traditional Cold Pressed Oils
  await prisma.category.updateMany({
    where: { NOT: { slug: 'cold-pressed' } },
    data: { isActive: false }
  });
  console.log('Deactivated other categories.');

  // Deactivate all existing products first to only show these 11 target oils
  await prisma.product.updateMany({
    data: { isActive: false }
  });
  console.log('Temporarily deactivated existing products.');

  // Create or Update target oils
  for (const oil of targetOils) {
    const existing = await prisma.product.findUnique({
      where: { slug: oil.slug }
    });

    const productData = {
      name: oil.name,
      nameTe: oil.nameTe,
      slug: oil.slug,
      description: oil.description,
      price: oil.price,
      mrp: oil.mrp,
      sku: oil.sku,
      unit: oil.unit,
      weight: oil.weight,
      categoryId: category.id,
      images: JSON.stringify([oil.image]),
      benefits: JSON.stringify(oil.benefits),
      ingredients: JSON.stringify([oil.nameTe]),
      usage: JSON.stringify(['వంటలకు, తాలింపులకు అనుకూలం.']),
      isActive: true,
      stock: 50 // In stock
    };

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: productData
      });
      console.log(`Updated oil: ${oil.name} to price ₹${oil.price}`);
    } else {
      await prisma.product.create({
        data: productData
      });
      console.log(`Created oil: ${oil.name} with price ₹${oil.price}`);
    }
  }

  console.log('Database synchronized successfully! Only the 11 target oils are active.');
  process.exit(0);
}

sync().catch(err => {
  console.error('Error during synchronization:', err);
  process.exit(1);
});
