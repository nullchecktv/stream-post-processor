# Design Document

## Overview

This feature enhances the quote graphics system by adding 50 deterministic background patterns, dynamic font sizing, and portrait/landscape orientation support. The enhancement maintains the existing @napi-rs/canvas-based generation pipeline while introducing a pattern library that creates visual variety across quote graphics. Each quote's background pattern is determined by hashing the quote text, ensuring consistency while providing diverse visual aesthetics.

## Architecture

### High-Level Flow

```
Quote Text → Hash Function → Pattern Index (0-49)
                                    ↓
                          Pattern Library Selection
                                    ↓
Canvas Creation → Background Pattern → Text Overlay → S3 Upload
     ↓
Orientation (landscape/portrait) determines dimensions
     ↓
Text Length → Dynamic Font Size Calculation
```

### Component Interaction

1. **Quote Graphics Generator** receives quote data with orientation field
2. **Hash Function** calculates pattern index from quote text
3. **Pattern Library** provides pattern drawing function
4. **Font Size Calculator** determines optimal text size based on length
5. **Canvas Renderer** applies pattern, text, and branding
6. **S3 Storage** saves generated graphic

## Components and Interfaces

### 1. Pattern Library

**Location**: `functions/quotes/patterns/index.mjs`

**Purpose**: Provides 50 distinct background pattern drawing functions

**Pattern Function Signature**:
```javascript
/**
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} branding - Team branding configuration
 * @param {Object} branding.colors - Color palette
 * @param {string} branding.colors.primary - Primary brand color
 * @p {string} branding.colors.secondary - Secondary brand color
 * @param {string} branding.colors.background - Background color
 * @param {string} branding.colors.text - Text color
 */
function patternName(ctx, width, height, branding) {
  // Pattern drawing logic
}
```

**Pattern Categories**:

**Gradients (10 patterns)**:
- Linear gradients (top-to-bottom, diagonal, multi-stop)
- Radial gradients (center, offset, multi-circle)
- Conic gradients (color wheel, split)

**Geometric (15 patterns)**:
- Circles (scattered, grid, concentric)
- Lines (diagonal, horizontal, vertical, crosshatch)
- Polygons (triangles, hexagons, random)
- Grids (square, diamond, offset)

**Textures (10 patterns)**:
- Dots (random, grid, varying sizes)
- Noise (perlin-style, grain)
- Stippling (dense, sparse)
- Halftone patterns

**Abstract (10 patterns)**:
- Waves (sine, organic)
- Curves (bezier, flowing)
- Blobs (organic shapes)
- Spirals and swirls

**Minimalist (5 patterns)**:
- Solid with corner accent
- Subtle vignette
- Single geometric element
- Gradient edge
- Clean with border detail

**Pattern Registry**:
```javascript
export const PATTERNS = [
  linearGradientTopBottom,
  linearGradientDiagonal,
  radialGradientCenter,
  // ... 47 more patterns
];

export function getPattern(index) {
  return PATTERNS[index % PATTERNS.length];
}
```

### 2. Hash Function

**Location**: `functions/quotes/utils/hash.mjs`

**Purpose**: Generate consistent numeric hash from quote text

**Implementation**:
```javascript
/**
 * CRC32 hash implementation for deterministic pattern selection
 * @param {string} text - Quote text to hash
 * @returns {number} - Positive integer hash value
 */
export function hashQuoteText(text) {
  let crc = 0xFFFFFFFF;
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const byte = normalized.charCodeAt(i);
    crc = crc ^ byte;

    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Get pattern index from quote text
 * @param {string} text - Quote text
 * @returns {number} - Pattern index (0-49)
 */
export function getPatternIndex(text) {
  return hashQuoteText(text) % 50;
}
```

**Hash Properties**:
- Deterministic: Same input always produces same output
- Even distribution: Patterns selected uniformly
- Case-insensitive: "Hello" and "hello" produce same hash
- Whitespace-normalized: Leading/trailing spaces ignored

### 3. Font Size Calculator

**Location**: `functions/quotes/utils/text.mjs`

**Purpose**: Calculate optimal font size based on text length and canvas dimensions

**Implementation**:
```javascript
/**
 * Calculate optimal font size for quote text
 * @param {string} text - Quote text
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {number} - Font size in pixels
 */
export function calculateFontSize(text, width, height) {
  const length = text.length;
  const minSize = 48;
  const maxSize = 96;

  // Base size calculation on text length
  let size;
  if (length < 50) {
    size = maxSize;
  } else if (length < 100) {
    size = 84;
  } else if (length < 150) {
    size = 72;
  } else if (length < 200) {
    size = 60;
  } else {
    size = minSize;
  }

  // Adjust for portrait orientation (narrower width)
  if (height > width) {
    size = Math.max(minSize, size * 0.85);
  }

  return size;
}

/**
 * Wrap text to fit within max width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum line width
 * @returns {string[]} - Array of text lines
 */
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate total text block height
 * @param {number} fontSize - Font size in pixels
 * @param {number} lineCount - Number of text lines
 * @returns {number} - Total height in pixels
 */
export function calculateTextHeight(fontSize, lineCount) {
  const lineHeight = fontSize * 1.3;
  return lineCount * lineHeight;
}
```

### 4. Enhanced Quote Graphics Generator

**Location**: `functions/quotes/generate-graphic.mjs`

**Updated Handler Logic**:

```javascript
export const handler = async (event) => {
  const { detail } = event;
  const { tenantId, episodeId, quoteId, quote, episode } = detail;

  // Determine dimensions based on orientation
  const isPortrait = quote.orientation === 'portrait';
  const width = isPortrait ? 1080 : 1920;
  const height = isPortrait ? 1920 : 1080;
  const borderWidth = 20;

  // Get branding
  const branding = await resolveBranding(tenantId);

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw border
  ctx.fillStyle = branding.colors.primary;
  ctx.fillRect(0, 0, width, height);

  // Draw base background
  const innerWidth = width - (borderWidth * 2);
  const innerHeight = height - (borderWidth * 2);
  ctx.fillStyle = branding.colors.background;
  ctx.fillRect(borderWidth, borderWidth, innerWidth, innerHeight);

  // Apply background pattern
  ctx.save();
  ctx.translate(borderWidth, borderWidth);
  const patternIndex = getPatternIndex(quote.text);
  const pattern = getPattern(patternIndex);
  pattern(ctx, innerWidth, innerHeight, branding);
  ctx.restore();

  // Calculate font size
  const fontSize = calculateFontSize(quote.text, innerWidth, innerHeight);
  const fontFamily = registeredFamilies.has(branding.fontFamily)
    ? branding.fontFamily
    : 'Inter';

  // Draw quote text
  ctx.fillStyle = branding.colors.text;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = innerWidth - 200;
  const lines = wrapText(ctx, quote.text, maxTextWidth);
  const textHeight = calculateTextHeight(fontSize, lines.length);

  // Calculate vertical positioning
  let yPosition = (height - textHeight) / 2;
  const lineHeight = fontSize * 1.3;

  // Draw text lines
  lines.forEach(line => {
    ctx.fillText(line, width / 2, yPosition);
    yPosition += lineHeight;
  });

  // Draw speaker (if enabled)
  yPosition += 60;
  if (quote.showSpeaker && quote.speaker) {
    ctx.fillStyle = branding.colors.secondary;
    ctx.font = `${Math.floor(fontSize * 0.67)}px ${fontFamily}`;
    ctx.fillText(`— ${quote.speaker}`, width / 2, yPosition);
    yPosition += fontSize * 0.9;
  }

  // Draw episode title (if enabled)
  if (quote.showEpisodeTitle && episode.title) {
    ctx.fillStyle = branding.colors.text;
    ctx.globalAlpha = 0.7;
    ctx.font = `${Math.floor(fontSize * 0.5)}px ${fontFamily}`;
    ctx.fillText(episode.title, width / 2, yPosition);
    ctx.globalAlpha = 1.0;
  }

  // Encode and upload
  const buffer = await canvas.encode('png');
  const s3Key = generateQuoteS3Key(tenantId, episodeId, quoteId);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: 'image/png'
  }));

  // Update quote record
  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall(createQuoteKey(tenantId, episodeId, quoteId)),
    UpdateExpression: 'SET s3Key = :s3Key, fileSize = :fileSize, #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: marshall({
      ':s3Key': s3Key,
      ':fileSize': buffer.length,
      ':status': QUOTE_STATUS.CREATED,
      ':updatedAt': new Date().toISOString()
    })
  }));

  return { statusCode: 200, body: JSON.stringify({ quoteId, s3Key }) };
};
```

### 5. Pattern Examples

**Pattern 0: Linear Gradient Top to Bottom**
```javascript
export function linearGradientTopBottom(ctx, width, height, branding) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, branding.colors.primary + '40'); // 25% opacity
  gradient.addColorStop(1, branding.colors.secondary + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
```

**Pattern 1: Radial Gradient Center**
```javascript
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
```

**Pattern 2: Scattered Circles**
```javascript
export function scatteredCircles(ctx, width, height, branding) {
  const seed = 42; // Consistent seed for deterministic randomness
  const random = seededRandom(seed);

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
```

**Pattern 3: Diagonal Lines**
```javascript
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
```

**Pattern 4: Dot Grid**
```javascript
export function dotGrid(ctx, width, height, branding) {
  const spacing = 50;
  const radius = 4;

  ctx.fillStyle = branding.colors.secondary + '40';
  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

### 6. Data Model Updates

**Quote Entity Enhancement**:
```javascript
{
  pk: "{tenantId}#{episodeId}",
  sk: "data#quote#{quoteId}",
  // ... existing fields
  orientation: "landscape" | "portrait",  // NEW FIELD
  // ... rest of fields
}
```

**Default Value**: `orientation: "landscape"`

### 7. API Updates

**POST /episodes/{episodeId}/quotes**

**Request Body Enhancement**:
```json
{
  "text": "Quote text",
  "speaker": "Allen",
  "timestamp": "00:15:30",
  "orientation": "landscape"  // NEW FIELD (optional, defaults to "landscape")
}
```

**PUT /episodes/{episodeId}/quotes/{quoteId}**

**Request Body Enhancement**:
```json
{
  "text": "Updated text",
  "orientation": "portrait",  // NEW FIELD (optional)
  "showSpeaker": true,
  "showEpisodeTitle": false
}
```

**Validation**:
```javascript
const orientationSchema = z.enum(['landscape', 'portrait']).default('landscape');
```

### 8. Frontend UI Updates

**Quote Detail Page Enhancement**

**Location**: `frontend/src/pages/QuoteDetailPage.tsx`

**New UI Elements**:
```typescript
// Add orientation toggle
<div className="flex justify-between items-center">
  <span className="text-sm text-gray-600">Orientation</span>
  <div className="flex gap-2">
    <button
      onClick={() => setOrientation('landscape')}
      className={`px-3 py-1 text-sm rounded ${
        orientation === 'landscape'
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      Landscape
    </button>
    <button
      onClick={() => setOrientation('portrait')}
      className={`px-3 py-1 text-sm rounded ${
        orientation === 'portrait'
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      Portrait
    </button>
  </div>
</div>
```

**Image Display Update**:
```typescript
// Adjust image container for orientation
<div className={`mb-6 relative ${
  quote.orientation === 'portrait' ? 'max-w-md mx-auto' : ''
}`}>
  <img
    src={quote.imageUrl}
    alt={`Quote by ${quote.speaker}`}
    className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
  />
</div>
```

## Text Readability Enhancements

### Contrast Checking

**Implementation**:
```javascript
/**
 * Calculate relative luminance of a color
 * @param {string} hex - Hex color code
 * @returns {number} - Luminance value (0-1)
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} - Contrast ratio
 */
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

### Text Shadow Application

**When to Apply**:
- If contrast ratio < 4.5:1, apply text shadow
- Shadow enhances readability without changing colors

**Implementation**:
```javascript
function applyTextShadowIfNeeded(ctx, textColor, backgroundColor) {
  const contrast = getContrastRatio(textColor, backgroundColor);

  if (contrast < 4.5) {
    // Apply subtle shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }
}
```

## Performance Considerations

### Pattern Rendering Optimization

- **Pre-calculate values**: Compute spacing, positions once
- **Limit iterations**: Cap geometric pattern elements at reasonable counts
- **Use efficient drawing**: Prefer `fillRect` over complex paths when possible
- **Avoid overdraw**: Don't draw elements outside visible canvas

### Memory Management

- **Canvas reuse**: Single canvas instance per graphic
- **Buffer cleanup**: Release buffers after S3 upload
- **Pattern function scope**: Keep pattern functions pure, no closures

### Execution Time

**Target**: < 2 seconds per graphic
**Breakdown**:
- Pattern selection: < 1ms
- Canvas creation: < 50ms
- Pattern drawing: < 500ms
- Text rendering: < 200ms
- PNG encoding: < 800ms
- S3 upload: < 400ms

## Testing Strategy

### Unit Tests

**Hash Function Tests**:
```javascript
describe('hashQuoteText', () => {
  it('should return consistent hash for same text', () => {
    const text = 'Hello world';
    expect(hashQuoteText(text)).toBe(hashQuoteText(text));
  });

  it('should be case-insensitive', () => {
    expect(hashQuoteText('Hello')).toBe(hashQuoteText('hello'));
  });

  it('should distribute evenly across 50 patterns', () => {
    const quotes = generateTestQuotes(500);
    const distribution = quotes.map(q => getPatternIndex(q));
    const counts = countOccurrences(distribution);

    // Each pattern should appear ~10 times (±3)
    Object.values(counts).forEach(count => {
      expect(count).toBeGreaterThanOrEqual(7);
      expect(count).toBeLessThanOrEqual(13);
    });
  });
});
```

**Font Size Calculator Tests**:
```javascript
describe('calculateFontSize', () => {
  it('should return max size for short quotes', () => {
    expect(calculateFontSize('Short', 1920, 1080)).toBe(96);
  });

  it('should return min size for long quotes', () => {
    const longText = 'a'.repeat(250);
    expect(calculateFontSize(longText, 1920, 1080)).toBe(48);
  });

  it('should adjust for portrait orientation', () => {
    const text = 'Medium length quote text';
    const landscape = calculateFontSize(text, 1920, 1080);
    const portrait = calculateFontSize(text, 1080, 1920);
    expect(portrait).toBeLessThan(landscape);
  });
});
```

**Pattern Tests**:
```javascript
describe('Pattern Library', () => {
  it('should have exactly 50 patterns', () => {
    expect(PATTERNS.length).toBe(50);
  });

  it('should return valid pattern for any index', () => {
    for (let i = 0; i < 50; i++) {
      const pattern = getPattern(i);
      expect(typeof pattern).toBe('function');
    }
  });

  it('should handle index overflow gracefully', () => {
    expect(getPattern(75)).toBe(getPattern(25));
  });
});
```

### Integration Tests

**End-to-End Graphic Generation**:
```javascript
describe('Quote Graphic Generation', () => {
  it('should generate landscape graphic with pattern', async () => {
    const event = createTestEvent({
      quote: { text: 'Test quote', orientation: 'landscape' }
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    // Verify S3 upload
    const s3Object = await getS3Object(result.s3Key);
    expect(s3Object.ContentType).toBe('image/png');
  });

  it('should generate portrait graphic with pattern', async () => {
    const event = createTestEvent({
      quote: { text: 'Test quote', orientation: 'portrait' }
    });

    const result = await handler(event);
    const buffer = await getS3ObjectBuffer(result.s3Key);
    const image = await loadImage(buffer);

    expect(image.width).toBe(1080);
    expect(image.height).toBe(1920);
  });
});
```

### Visual Regression Tests

**Pattern Consistency**:
- Generate graphics for same quote multiple times
- Compare pixel-by-pixel to ensure deterministic output
- Verify pattern appears identical across generations

**Orientation Verification**:
- Generate landscape and portrait versions
- Verify dimensions match expected values
- Confirm text layout adapts appropriately

## Deployment Considerations

### Lambda Configuration

**No changes required**:
- Memory: 1024 MB (sufficient for pattern rendering)
- Timeout: 30 seconds (adequate for complex patterns)
- Layer: Existing @napi-rs/canvas layer

### Environment Variables

**No new variables needed**:
- Uses existing `TABLE_NAME`, `BUCKET_NAME`

### Backward Compatibility

**Existing Quotes**:
- Quotes without `orientation` field default to `landscape`
- Regeneration uses new pattern system automatically
- No migration script required

**API Compatibility**:
- `orientation` field is optional in requests
- Existing clients continue to work without changes

## Monitoring and Observability

### CloudWatch Metrics

**New Metrics**:
- Pattern distribution (track which patterns are used most)
- Generation time by pattern type
- Orientation split (landscape vs portrait usage)

**Existing Metrics**:
- Graphic generation success rate
- Average generation time
- S3 upload success rate

### Logging

**Pattern Selection**:
```javascript
logger.info('Pattern selected', {
  quoteId,
  patternIndex,
  quoteLength: quote.text.length,
  orientation: quote.orientation
});
```

**Font Size Calculation**:
```javascript
logger.debug('Font size calculated', {
  quoteId,
  textLength: quote.text.length,
  fontSize,
  lineCount: lines.length
});
```

## Future Enhancements

### Phase 2 Features

- **Custom patterns**: Allow teams to upload custom background images
- **Pattern favorites**: Let users mark preferred patterns
- **Pattern preview**: Show all 50 patterns in UI for manual selection
- **Animated patterns**: Generate GIF/MP4 with subtle animations
- **Pattern themes**: Group patterns by style (modern, classic, minimal)

### Advanced Features

- **AI pattern selection**: Use AI to choose optimal pattern for quote sentiment
- **Brand color extraction**: Auto-generate patterns from brand logo
- **Pattern editor**: Visual tool for creating custom patterns
- **A/B testing**: Track which patterns perform best on social media

