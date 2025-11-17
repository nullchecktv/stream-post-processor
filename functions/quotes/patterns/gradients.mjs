export function linearGradientTopBottom(ctx, width, height, branding) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, branding.colors.primary + '40');
  gradient.addColorStop(1, branding.colors.secondary + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function linearGradientDiagonal(ctx, width, height, branding) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, branding.colors.primary + '3D');
  gradient.addColorStop(1, branding.colors.secondary + '3D');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function linearGradientMultiStop(ctx, width, height, branding) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, branding.colors.primary + '40');
  gradient.addColorStop(0.5, branding.colors.secondary + '30');
  gradient.addColorStop(1, branding.colors.primary + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function radialGradientCenter(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(width, height) * 0.7;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, branding.colors.secondary + '60');
  gradient.addColorStop(1, branding.colors.background + '00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function radialGradientOffset(ctx, width, height, branding) {
  const offsetX = width * 0.25;
  const offsetY = height * 0.25;
  const radius = Math.max(width, height) * 0.8;

  const gradient = ctx.createRadialGradient(offsetX, offsetY, 0, offsetX, offsetY, radius);
  gradient.addColorStop(0, branding.colors.primary + '50');
  gradient.addColorStop(1, branding.colors.background + '00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function radialGradientMultiCircle(ctx, width, height, branding) {
  ctx.globalAlpha = 0.3;

  const circles = [
    { x: width * 0.3, y: height * 0.3, radius: width * 0.4 },
    { x: width * 0.7, y: height * 0.7, radius: width * 0.35 }
  ];

  circles.forEach((circle, index) => {
    const gradient = ctx.createRadialGradient(
      circle.x, circle.y, 0,
      circle.x, circle.y, circle.radius
    );
    const color = index === 0 ? branding.colors.primary : branding.colors.secondary;
    gradient.addColorStop(0, color + 'AA');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });

  ctx.globalAlpha = 1.0;
}

export function conicGradientColorWheel(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;

  const gradient = ctx.createConicGradient(0, centerX, centerY);
  gradient.addColorStop(0, branding.colors.primary + '40');
  gradient.addColorStop(0.25, branding.colors.secondary + '40');
  gradient.addColorStop(0.5, branding.colors.primary + '40');
  gradient.addColorStop(0.75, branding.colors.secondary + '40');
  gradient.addColorStop(1, branding.colors.primary + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function conicGradientSplit(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;

  const gradient = ctx.createConicGradient(0, centerX, centerY);
  gradient.addColorStop(0, branding.colors.primary + '3D');
  gradient.addColorStop(0.5, branding.colors.secondary + '3D');
  gradient.addColorStop(1, branding.colors.primary + '3D');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function linearGradientHorizontal(ctx, width, height, branding) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, branding.colors.primary + '40');
  gradient.addColorStop(1, branding.colors.secondary + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function radialGradientCorner(ctx, width, height, branding) {
  ctx.globalAlpha = 0.25;

  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height }
  ];

  const radius = Math.max(width, height) * 0.5;

  corners.forEach((corner, index) => {
    const gradient = ctx.createRadialGradient(
      corner.x, corner.y, 0,
      corner.x, corner.y, radius
    );
    const color = index % 2 === 0 ? branding.colors.primary : branding.colors.secondary;
    gradient.addColorStop(0, color + 'CC');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });

  ctx.globalAlpha = 1.0;
}
