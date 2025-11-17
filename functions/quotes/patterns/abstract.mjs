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

export function sineWaves(ctx, width, height, branding) {
  ctx.strokeStyle = branding.colors.primary + '35';
  ctx.lineWidth = 4;

  const waves = 5;
  const amplitude = 60;
  const frequency = 0.008;

  for (let i = 0; i < waves; i++) {
    const yOffset = (height / (waves + 1)) * (i + 1);
    const phaseShift = (i * Math.PI) / 3;

    ctx.beginPath();
    for (let x = 0; x <= width; x += 3) {
      const y = yOffset + Math.sin(x * frequency + phaseShift) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

export function organicWaves(ctx, width, height, branding) {
  const random = seededRandom(555);
  ctx.globalAlpha = 0.25;

  const waveCount = 4;

  for (let w = 0; w < waveCount; w++) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, branding.colors.primary + '60');
    gradient.addColorStop(1, branding.colors.secondary + '60');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    const startY = (height / waveCount) * w;

    ctx.moveTo(0, startY);

    for (let x = 0; x <= width; x += 50) {
      const y = startY + (random() - 0.5) * 80;
      const cpX1 = x - 25;
      const cpY1 = startY + (random() - 0.5) * 60;
      const cpX2 = x - 10;
      const cpY2 = y + (random() - 0.5) * 40;

      ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, x, y);
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function bezierCurves(ctx, width, height, branding) {
  const random = seededRandom(777);
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 3;

  for (let i = 0; i < 8; i++) {
    const startX = random() * width;
    const startY = random() * height;
    const endX = random() * width;
    const endY = random() * height;
    const cp1X = random() * width;
    const cp1Y = random() * height;
    const cp2X = random() * width;
    const cp2Y = random() * height;

    ctx.strokeStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

export function flowingLines(ctx, width, height, branding) {
  const random = seededRandom(888);
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;

  const lineCount = 12;

  for (let i = 0; i < lineCount; i++) {
    const startX = -50;
    const startY = (height / lineCount) * i;

    ctx.strokeStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    let currentX = startX;
    let currentY = startY;

    while (currentX < width + 50) {
      const nextX = currentX + 80 + random() * 40;
      const nextY = currentY + (random() - 0.5) * 100;
      const cpX = currentX + 40;
      const cpY = currentY + (random() - 0.5) * 80;

      ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);
      currentX = nextX;
      currentY = nextY;
    }

    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

export function organicBlobs(ctx, width, height, branding) {
  const random = seededRandom(999);
  ctx.globalAlpha = 0.2;

  const blobCount = 6;

  for (let i = 0; i < blobCount; i++) {
    const centerX = random() * width;
    const centerY = random() * height;
    const baseRadius = 80 + random() * 120;
    const points = 8;

    ctx.fillStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();

    for (let j = 0; j <= points; j++) {
      const angle = (j / points) * Math.PI * 2;
      const radiusVariation = 0.7 + random() * 0.6;
      const radius = baseRadius * radiusVariation;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevAngle = ((j - 1) / points) * Math.PI * 2;
        const prevRadius = baseRadius * (0.7 + random() * 0.6);
        const prevX = centerX + Math.cos(prevAngle) * prevRadius;
        const prevY = centerY + Math.sin(prevAngle) * prevRadius;

        const cpX = (prevX + x) / 2 + (random() - 0.5) * 40;
        const cpY = (prevY + y) / 2 + (random() - 0.5) * 40;

        ctx.quadraticCurveTo(cpX, cpY, x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

export function spiralPattern(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.45;
  const turns = 4;
  const points = 200;

  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 3;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
  gradient.addColorStop(0, branding.colors.primary);
  gradient.addColorStop(1, branding.colors.secondary);
  ctx.strokeStyle = gradient;

  ctx.beginPath();

  for (let i = 0; i <= points; i++) {
    const progress = i / points;
    const angle = progress * Math.PI * 2 * turns;
    const radius = progress * maxRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

export function swirlPattern(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.5;
  const arms = 3;

  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 4;

  for (let arm = 0; arm < arms; arm++) {
    const armOffset = (arm / arms) * Math.PI * 2;

    const gradient = ctx.createLinearGradient(
      centerX,
      centerY,
      centerX + maxRadius,
      centerY + maxRadius
    );
    gradient.addColorStop(0, branding.colors.primary);
    gradient.addColorStop(1, branding.colors.secondary);
    ctx.strokeStyle = gradient;

    ctx.beginPath();

    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      const angle = armOffset + progress * Math.PI * 4;
      const radius = progress * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

export function concentricWaves(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.max(width, height) * 0.7;
  const waveCount = 8;

  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 2;

  for (let w = 0; w < waveCount; w++) {
    const baseRadius = (maxRadius / waveCount) * (w + 1);
    const waveAmplitude = 15;
    const waveFrequency = 8;

    ctx.strokeStyle = w % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();

    for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
      const waveOffset = Math.sin(angle * waveFrequency) * waveAmplitude;
      const radius = baseRadius + waveOffset;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (angle === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

export function randomCurves(ctx, width, height, branding) {
  const random = seededRandom(1111);
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 3;

  const curveCount = 10;

  for (let i = 0; i < curveCount; i++) {
    const startX = random() * width * 0.3;
    const startY = random() * height;
    const endX = width * 0.7 + random() * width * 0.3;
    const endY = random() * height;

    const controlPoints = 3;
    const points = [{ x: startX, y: startY }];

    for (let j = 0; j < controlPoints; j++) {
      points.push({
        x: startX + ((endX - startX) / (controlPoints + 1)) * (j + 1) + (random() - 0.5) * 200,
        y: startY + ((endY - startY) / (controlPoints + 1)) * (j + 1) + (random() - 0.5) * 200
      });
    }

    points.push({ x: endX, y: endY });

    ctx.strokeStyle = i % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let j = 1; j < points.length - 2; j++) {
      const xc = (points[j].x + points[j + 1].x) / 2;
      const yc = (points[j].y + points[j + 1].y) / 2;
      ctx.quadraticCurveTo(points[j].x, points[j].y, xc, yc);
    }

    ctx.quadraticCurveTo(
      points[points.length - 2].x,
      points[points.length - 2].y,
      points[points.length - 1].x,
      points[points.length - 1].y
    );

    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

export function fluidShapes(ctx, width, height, branding) {
  const random = seededRandom(1234);
  ctx.globalAlpha = 0.18;

  const shapeCount = 5;

  for (let i = 0; i < shapeCount; i++) {
    const centerX = random() * width;
    const centerY = random() * height;
    const size = 100 + random() * 150;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      size
    );
    gradient.addColorStop(0, i % 2 === 0 ? branding.colors.primary + 'AA' : branding.colors.secondary + 'AA');
    gradient.addColorStop(1, i % 2 === 0 ? branding.colors.primary + '00' : branding.colors.secondary + '00');
    ctx.fillStyle = gradient;

    ctx.beginPath();

    const points = 12;
    for (let j = 0; j <= points; j++) {
      const angle = (j / points) * Math.PI * 2;
      const radiusVariation = 0.6 + random() * 0.8;
      const radius = size * radiusVariation;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevAngle = ((j - 1) / points) * Math.PI * 2;
        const prevRadiusVariation = 0.6 + random() * 0.8;
        const prevRadius = size * prevRadiusVariation;
        const prevX = centerX + Math.cos(prevAngle) * prevRadius;
        const prevY = centerY + Math.sin(prevAngle) * prevRadius;

        const midAngle = (prevAngle + angle) / 2;
        const midRadiusVariation = 0.6 + random() * 0.8;
        const midRadius = size * midRadiusVariation * 1.2;
        const cpX = centerX + Math.cos(midAngle) * midRadius;
        const cpY = centerY + Math.sin(midAngle) * midRadius;

        ctx.quadraticCurveTo(cpX, cpY, x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}
