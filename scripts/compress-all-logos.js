const sharp = require('sharp');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['\"]|['\"]$/g, '');
    env[match[1]] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  console.log('Fetching all teams with logos from Supabase...');
  const res = await fetch(`${url}/rest/v1/teams?select=id,name,short_name,logo_url&logo_url=not.is.null`, {
    headers: { 'apikey': key }
  });
  
  if (!res.ok) {
    console.error('Failed to fetch teams:', res.status, await res.text());
    return;
  }
  
  const teams = await res.json();
  console.log(`Found ${teams.length} teams with logo_url.`);
  
  let totalSaved = 0;
  
  for (const team of teams) {
    if (!team.logo_url || !team.logo_url.startsWith('data:image/')) {
      console.log(`Skipping ${team.name} (not a data URI)`);
      continue;
    }
    
    const originalLen = team.logo_url.length;
    if (originalLen < 30000) {
      console.log(`Skipping ${team.name} (already small: ${(originalLen/1024).toFixed(1)} KB)`);
      continue;
    }
    
    try {
      const base64Data = team.logo_url.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const compressed = await sharp(buffer)
        .resize({ width: 140, height: 140, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, alphaQuality: 90 })
        .toBuffer();
        
      const newLogo = 'data:image/webp;base64,' + compressed.toString('base64');
      const savedBytes = originalLen - newLogo.length;
      totalSaved += savedBytes;
      
      const patchRes = await fetch(`${url}/rest/v1/teams?id=eq.${team.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ logo_url: newLogo })
      });
      
      if (patchRes.ok) {
        console.log(`✓ [${team.name}] ${(originalLen/1024).toFixed(1)} KB -> ${(newLogo.length/1024).toFixed(1)} KB (hemat ${(savedBytes/1024).toFixed(1)} KB)`);
      } else {
        console.error(`✗ [${team.name}] Update failed:`, patchRes.status, await patchRes.text());
      }
    } catch (err) {
      console.error(`✗ [${team.name}] Compression error:`, err.message);
    }
  }
  
  console.log(`\nSELESAI! Total penghematan data: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB!`);
}

main().catch(console.error);
