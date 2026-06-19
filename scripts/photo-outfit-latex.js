import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/home/z/my-project/download/photo-editor';
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function editImage(localPath, prompt, outputPath, size = '768x1344') {
  const zai = await ZAI.create();
  
  const imageBuffer = fs.readFileSync(localPath);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;
  
  console.log(`📥 Imagen cargada: ${path.basename(localPath)} (${(imageBuffer.length/1024).toFixed(1)} KB)`);
  console.log(`📝 Prompt: ${prompt.substring(0, 120)}...`);
  console.log(`📐 Size: ${size}`);
  console.log('⏳ Procesando...');
  
  const response = await zai.images.generations.edit({
    prompt: prompt,
    images: [{ url: dataUrl }],
    size: size
  });
  
  const imageBase64 = response.data[0].base64;
  const buffer = Buffer.from(imageBase64, 'base64');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`✅ Listo: ${outputPath} (${(buffer.length/1024).toFixed(1)} KB)`);
  return outputPath;
}

async function main() {
  const prompt = `Replace the woman's current outfit (black tank top and blue jeans) with a shiny black latex catsuit (full body latex outfit, long sleeves, long legs, glossy reflective material with highlights and shine). The latex should have realistic shine and reflections following the body curves. 

CRITICAL - Keep IDENTICAL: 
- Her face (same features, same expression, same makeup)
- Her exact pose (one leg on bridge railing, one hand on railing, other hand on leg)
- Her black medium-length hair tied up
- Her body shape and proportions  
- The wooden bridge background with sky, clouds, water and vegetation
- The natural daylight lighting

Only change the outfit from tank top + jeans to glossy black latex catsuit. Professional photography, high detail, realistic latex material with proper highlights and reflections.`;

  try {
    await editImage(
      '/home/z/my-project/scripts/photo-outfit-input.jpg',
      prompt,
      `${OUTPUT_DIR}/foto3_outfit_latex.png`,
      '768x1344'
    );
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.message.includes('400')) {
      console.error('Response:', e.message);
    }
  }
}

main();
