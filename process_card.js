const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'card.avif');
const outputPath = path.join(__dirname, 'assets', 'images', 'card.png');

// Since we want to remove the white background from the card,
// sharp's trim() detects the background color (usually the top-left pixel) 
// and removes it. We convert it to a transparent PNG.
sharp(inputPath)
  .trim({ threshold: 40 }) // threshold ensures slightly off-white pixels are also trimmed
  .png()
  .toFile(outputPath)
  .then(info => {
    console.log('Successfully trimmed background and saved as card.png:', info);
  })
  .catch(err => {
    console.error('Error processing image:', err);
  });
