import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/home/z/my-project/download/photo-editor';
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function editImage(localPath, prompt, outputPath, size = '768x1344') {
  const zai = await ZAI.create();
  
  // Read local image and convert to base64 data URL
  const imageBuffer = fs.readFileSync(localPath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(localPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  
  console.log(`📥 Imagen cargada: ${path.basename(localPath)} (${(imageBuffer.length/1024).toFixed(1)} KB)`);
  console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
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
  try {
    console.log('=== FOTO 1: MEJORAR CALIDAD ===\n');
    await editImage(
      '/home/z/my-project/upload/Imagen de WhatsApp 2025-03-23 a las 02.42.26_413dd9c2.jpg',
      'Enhance photo quality significantly: sharpen details, improve lighting, color saturation and clarity, increase resolution to HD, professional photography quality. Remove noise, compression artifacts and pixelation. Keep the woman face, hair, fringe, pose, blue sweater and fireplace background EXACTLY the same. Only improve overall image quality with professional retouching, do not change composition, do not alter any element, only upscale and enhance.',
      `${OUTPUT_DIR}/foto1_mejorada.png`,
      '768x1344'
    );
    console.log('');
  } catch (e) {
    console.error('❌ Error en foto 1:', e.message);
  }
  
  try {
    console.log('=== FOTO 2: CAMBIAR FONDO A PENTHOUSE ===\n');
    await editImage(
      '/home/z/my-project/upload/Imagen de WhatsApp 2025-03-18 a las 15.05.53_58e0e847.jpg',
      'Replace the outdoor green vegetation background with a luxurious modern penthouse interior at golden hour sunset. Large floor-to-ceiling windows with city skyline view in the background, warm golden lighting, elegant minimalist furniture softly blurred. Keep the woman IDENTICAL: same face, same exact pose (one hand on hip, other on shoulder), same black mesh top with white polka dots, same hair, same skin tone, same lighting on her body. Only change the background from outdoor to luxury penthouse interior. Professional fashion photography quality.',
      `${OUTPUT_DIR}/foto2_fondo_penthouse.png`,
      '768x1344'
    );
    console.log('');
  } catch (e) {
    console.error('❌ Error en foto 2:', e.message);
  }
  
  console.log('=== FIN ===');
}

main();
