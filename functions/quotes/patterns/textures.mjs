/**
 * Seeded random number generator for deterministic patterns
 * @param {number} seed - Seed value for random generation
 * @returns {function} Random number generator function (0-1)
 */
function seededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function randomDots(ctx, width, height, branding) {
  const random = seededRandom(789);
  ctx.globalAlpha = 0.2;

  for (let i = 0; i < 150; i++) {
    const x = random() * width;
    const y = random() * height;
    const radius = 2 + random() * 4;

    ctx.fillStyle = i % 3 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function dotGrid(ctx, width, height, branding) {
  const spacing = 30;
  const radius = 3;

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = branding.colors.primary;

  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function varyingSizeDots(ctx, width, height, branding) {
  const random = seededRandom(321);
  const spacing = 40;

  ctx.globalAlpha = 0.2;

  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      const radius = 2 + random() * 8;
      ctx.fillStyle = random() > 0.5 ? branding.colors.primary : branding.colors.secondary;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function perlinNoise(ctx, width, height, branding) {
  const random = seededRandom(654);
  const gridSize = 20;

  ctx.globalAlpha = 0.15;

  for (let x = 0; x < width; x += gridSize) {
    for (let y = 0; y < height; y += gridSize) {
      const noise = random();
      const brightness = Math.floor(noise * 100);
      ctx.fillStyle = branding.colors.primary + brightness.toString(16).padStart(2, '0');
      ctx.fillRect(x, y, gridSize, gridSize);
    }
  }

  ctx.globalAlpha = 1.0;
}

export function grainTexture(ctx, width, height, branding) {
  const random = seededRandom(987);
  const density = 0.02;
  const totalPixels = width * height;
  const grainCount = Math.floor(totalPixels * density);

  ctx.globalAlpha = 0.15;

  for (let i = 0; i < grainCount; i++) {
    const x = random() * width;
    const y = random() * height;
    const size = 1 + random() * 2;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.fillRect(x, y, size, size);
  }

  ctx.globalAlpha = 1.0;
}

export function denseStippling(ctx, width, height, branding) {
  const random = seededRandom(147);
  ctx.globalAlpha = 0.18;

  for (let i = 0; i < 300; i++) {
    const x = random() * width;
    const y = random() * height;
    const radius = 1 + random() * 2;

    ctx.fillStyle = branding.colors.primary;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function sparseStippling(ctx, width, height, branding) {
  const random = seededRandom(258);
  ctx.globalAlpha = 0.2;

  for (let i = 0; i < 80; i++) {
    const x = random() * width;
    const y = random() * height;
    const radius = 2 + random() * 4;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function halftonePattern(ctx, width, height, branding) {
  const spacing = 25;
  const maxRadius = 8;

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = branding.colors.primary;

  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
      );
      const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
      const radius = maxRadius * (1 - distanceFromCenter / maxDistance);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function organicDots(ctx, width, height, branding) {
  const random = seededRandom(369);
  const clusters = 8;

  ctx.globalAlpha = 0.2;

  for (let c = 0; c < clusters; c++) {
    const centerX = random() * width;
    const centerY = random() * height;
    const clusterSize = 30 + random() * 50;
    const dotCount = 15 + Math.floor(random() * 20);

    for (let i = 0; i < dotCount; i++) {
      const angle = random() * Math.PI * 2;
      const distance = random() * clusterSize;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const radius = 2 + random() * 4;

      ctx.fillStyle = c % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function clusteredDots(ctx, width, height, branding) {
  const random = seededRandom(741);
  const gridSpacing = 80;

  ctx.globalAlpha = 0.2;

  for (let x = gridSpacing; x < width; x += gridSpacing) {
    for (let y = gridSpacing; y < height; y += gridSpacing) {
      const dotsInCluster = 5 + Math.floor(random() * 8);

      for (let i = 0; i < dotsInCluster; i++) {
        const offsetX = (random() - 0.5) * 30;
        const offsetY = (random() - 0.5) * 30;
        const radius = 2 + random() * 3;

        ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1.0;
}
