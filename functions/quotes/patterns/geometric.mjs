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

export function scatteredCircles(ctx, width, height, branding) {
  const random = seededRandom(42);
  ctx.globalAlpha = 0.15;

  for (let i = 0; i < 20; i++) {
    const x = random() * width;
    const y = random() * height;
    const radius = 30 + random() * 100;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function circleGrid(ctx, width, height, branding) {
  const spacing = 80;
  const radius = 20;

  ctx.globalAlpha = 0.2;
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

export function concentricCircles(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.max(width, height) * 0.6;
  const rings = 8;

  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 3;

  for (let i = 1; i <= rings; i++) {
    const radius = (maxRadius / rings) * i;
    ctx.strokeStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

export function diagonalLines(ctx, width, height, branding) {
  ctx.strokeStyle = branding.colors.primary + '30';
  ctx.lineWidth = 3;

  const spacing = 40;
  for (let i = -height; i < width + height; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
}

export function horizontalLines(ctx, width, height, branding) {
  ctx.strokeStyle = branding.colors.secondary + '30';
  ctx.lineWidth = 2;

  const spacing = 50;
  for (let y = spacing; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export function verticalLines(ctx, width, height, branding) {
  ctx.strokeStyle = branding.colors.primary + '30';
  ctx.lineWidth = 2;

  const spacing = 50;
  for (let x = spacing; x < width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

export function crosshatch(ctx, width, height, branding) {
  ctx.strokeStyle = branding.colors.primary + '25';
  ctx.lineWidth = 2;

  const spacing = 60;

  for (let i = -height; i < width + height; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }

  for (let i = height; i > -width; i -= spacing) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i - width);
    ctx.stroke();
  }
}

export function trianglePattern(ctx, width, height, branding) {
  const random = seededRandom(123);
  ctx.globalAlpha = 0.2;

  for (let i = 0; i < 15; i++) {
    const x = random() * width;
    const y = random() * height;
    const size = 40 + random() * 80;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x - size / 2, y + size / 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function hexagonPattern(ctx, width, height, branding) {
  const size = 50;
  const spacing = size * 1.8;
  const hexHeight = size * Math.sqrt(3);

  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = branding.colors.primary;
  ctx.lineWidth = 2;

  for (let row = 0; row < height / hexHeight + 2; row++) {
    for (let col = 0; col < width / spacing + 2; col++) {
      const x = col * spacing + (row % 2) * (spacing / 2);
      const y = row * hexHeight;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function randomPolygons(ctx, width, height, branding) {
  const random = seededRandom(456);
  ctx.globalAlpha = 0.18;

  for (let i = 0; i < 12; i++) {
    const x = random() * width;
    const y = random() * height;
    const sides = 3 + Math.floor(random() * 4);
    const size = 40 + random() * 60;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();

    for (let j = 0; j < sides; j++) {
      const angle = (Math.PI * 2 / sides) * j;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (j === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function squareGrid(ctx, width, height, branding) {
  const spacing = 70;
  const size = 30;

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = branding.colors.secondary;

  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
  }

  ctx.globalAlpha = 1.0;
}

export function diamondGrid(ctx, width, height, branding) {
  const spacing = 80;
  const size = 35;

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = branding.colors.primary;

  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  ctx.globalAlpha = 1.0;
}

export function offsetGrid(ctx, width, height, branding) {
  const spacing = 60;
  const size = 25;

  ctx.globalAlpha = 0.2;

  for (let row = 0; row < height / spacing + 2; row++) {
    for (let col = 0; col < width / spacing + 2; col++) {
      const x = col * spacing + (row % 2) * (spacing / 2);
      const y = row * spacing;

      ctx.fillStyle = (row + col) % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
  }

  ctx.globalAlpha = 1.0;
}

export function spiralCircles(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const spirals = 40;

  ctx.globalAlpha = 0.15;

  for (let i = 0; i < spirals; i++) {
    const angle = (i / spirals) * Math.PI * 6;
    const radius = (i / spirals) * Math.min(width, height) * 0.4;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const circleSize = 10 + (i / spirals) * 20;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.arc(x, y, circleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function wavyLines(ctx, width, height, branding) {
  ctx.strokeStyle = branding.colors.primary + '30';
  ctx.lineWidth = 3;

  const waves = 6;
  const amplitude = 40;
  const frequency = 0.01;

  for (let i = 0; i < waves; i++) {
    const yOffset = (height / (waves + 1)) * (i + 1);

    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const y = yOffset + Math.sin(x * frequency) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
