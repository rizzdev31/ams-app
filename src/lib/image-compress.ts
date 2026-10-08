import sharp from 'sharp';

/**
 * Mengompres logo tim (Base64 data URI) agar sangat ringan (<15 KB),
 * menjaga aspect ratio asli, transparansi penuh (alpha channel),
 * dan format WebP modern yang didukung seluruh browser.
 */
export async function optimizeLogoDataUri(dataUri: string): Promise<string> {
  if (!dataUri || !dataUri.startsWith('data:image/')) {
    return dataUri;
  }

  // Jika ukuran sudah di bawah 15KB, tidak perlu dikompres ulang
  if (dataUri.length < 15000) {
    return dataUri;
  }

  try {
    const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const compressed = await sharp(buffer)
      .resize({ width: 140, height: 140, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 90 })
      .toBuffer();

    return 'data:image/webp;base64,' + compressed.toString('base64');
  } catch (err) {
    console.warn('Gagal mengompres gambar dengan sharp, menggunakan data asli:', err);
    return dataUri;
  }
}
