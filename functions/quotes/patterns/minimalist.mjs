export function solidWithCornerAccent(ctx, width, height, branding) {
  ctx.fillStyle = branding.colors.primary + '15';

  const accentSize = Math.min(width, height) * 0.3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(accentSize, 0);
  ctx.lineTo(0, accentSize);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width - accentSize, height);
  ctx.lineTo(width, height - accentSize);
  ctx.closePath();
  ctx.fill();
}

export function subtleVignette(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(width, height) * 0.8;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, branding.colors.background + '00');
  gradient.addColorStop(0.7, branding.colors.background + '00');
  gradient.addColorStop(1, branding.colors.primary + '30');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function singleGeometricElement(ctx, width, height, branding) {
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) * 0.4;

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = branding.colors.secondary;

  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1.0;
}

export function gradientEdge(ctx, width, height, branding) {
  const edgeWidth = Math.min(width, height) * 0.15;

  const leftGradient = ctx.createLinearGradient(0, 0, edgeWidth, 0);
  leftGradient.addColorStop(0, branding.colors.primary + '40');
  leftGradient.addColorStop(1, branding.colors.primary + '00');

  ctx.fillStyle = leftGradient;
  ctx.fillRect(0, 0, edgeWidth, height);

  const rightGradient = ctx.createLinearGradient(width - edgeWidth, 0, width, 0);
  rightGradient.addColorStop(0, branding.colors.secondary + '00');
  rightGradient.addColorStop(1, branding.colors.secondary + '40');

  ctx.fillStyle = rightGradient;
  ctx.fillRect(width - edgeWidth, 0, edgeWidth, height);
}

export function cleanWithBorderDetail(ctx, width, height, branding) {
  const borderThickness = 3;
  const cornerLength = Math.min(width, height) * 0.1;

  ctx.strokeStyle = branding.colors.primary + '50';
  ctx.lineWidth = borderThickness;

  ctx.beginPath();
  ctx.moveTo(0, cornerLength);
  ctx.lineTo(0, 0);
  ctx.lineTo(cornerLength, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - cornerLength, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, cornerLength);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width, height - cornerLength);
  ctx.lineTo(width, height);
  ctx.lineTo(width - cornerLength, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cornerLength, height);
  ctx.lineTo(0, height);
  ctx.lineTo(0, height - cornerLength);
  ctx.stroke();
}
