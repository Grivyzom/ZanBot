// src/utils/generateSocialIcons.ts
import { createCanvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

/**
 * Genera iconos básicos para redes sociales si no existen
 */
export async function generateSocialIcons() {
  const assetsDir = path.join(__dirname, '..', '..', 'assets');
  
  // Asegurarse de que el directorio assets existe
  try {
    await fs.access(assetsDir);
  } catch (err) {
    await fs.mkdir(assetsDir, { recursive: true });
    console.log(`✅ Directorio de assets creado en ${assetsDir}`);
  }
  
  // Configuración de redes sociales e iconos
  const networks = [
    { name: 'instagram', color: '#E1306C', symbol: 'Ig' },
    { name: 'twitter', color: '#1DA1F2', symbol: 'X' },
    { name: 'youtube', color: '#FF0000', symbol: 'YT' },
    { name: 'github', color: '#333333', symbol: 'GH' },
    { name: 'twitch', color: '#9146FF', symbol: 'Tw' }
  ];
  
  // Generar cada icono
  for (const network of networks) {
    const iconPath = path.join(assetsDir, `${network.name}.png`);
    
    // Verificar si el icono ya existe
    try {
      await fs.access(iconPath);
      console.log(`✅ Icono ${network.name} ya existe`);
      continue; // Saltar si el icono ya existe
    } catch (err) {
      // El icono no existe, lo generamos
    }
    
    // Crear canvas para el icono
    const size = 200; // Tamaño más grande para mejor calidad
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Dibujar fondo
    ctx.fillStyle = network.color;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Añadir texto
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size/2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(network.symbol, size/2, size/2);
    
    // Guardar el icono
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(iconPath, buffer);
    console.log(`✅ Icono ${network.name} generado correctamente`);
  }
  
  console.log('✅ Generación de iconos completada');
}

// Si este archivo se ejecuta directamente, generar los iconos
if (require.main === module) {
  generateSocialIcons()
    .then(() => console.log('✅ Generación de iconos terminada'))
    .catch(err => console.error('❌ Error generando iconos:', err));
}