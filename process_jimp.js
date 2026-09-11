const Jimp = require('jimp');
const path = require('path');

const imgPath = path.join(__dirname, 'assets', 'images', 'card.png');

Jimp.read(imgPath)
  .then(image => {
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    
    // We iterate over every pixel. If it's close to white, we make it transparent.
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const hex = image.getPixelColor(x, y);
        const rgba = Jimp.intToRGBA(hex);
        
        // If it's a white-ish pixel
        if (rgba.r > 240 && rgba.g > 240 && rgba.b > 240) {
          image.setPixelColor(Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, 0), x, y);
        }
      }
    }
    
    return image.writeAsync(imgPath);
  })
  .then(() => {
    console.log('Successfully removed white background via Jimp!');
  })
  .catch(err => {
    console.error('Error with Jimp:', err);
  });
