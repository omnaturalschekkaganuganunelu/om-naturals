const Jimp = require('jimp');

async function processImage(inputPath, outPaths, size) {
  try {
    const image = await Jimp.read(inputPath);
    
    // Resize to size x size
    image.cover(size, size);

    // Create a circular mask
    const mask = new Jimp(size, size, 0x00000000);
    const radius = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        if (dx * dx + dy * dy <= radius * radius) {
          mask.setPixelColor(0xFFFFFFFF, x, y);
        }
      }
    }

    // Apply the mask
    image.mask(mask, 0, 0);

    // Save to all outPaths
    for (const outPath of outPaths) {
      await image.writeAsync(outPath);
      console.log(`Saved ${outPath}`);
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  const url = "https://res.cloudinary.com/dftcaaum2/image/upload/v1782288004/0e117f50-c709-4c0d-a8a5-164f86bba7fa.png";
  
  await processImage(url, ["public/images/logo-512.png"], 512);
  await processImage(url, ["public/images/logo-192.png"], 192);
  await processImage(url, ["app/apple-icon.png", "public/images/logo.png"], 512);
}

run();
