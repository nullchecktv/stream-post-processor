import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownPreview } from '../MarkdownPreview'

describe('MarkdownPreview', () => {
  describe('Basic Rendering', () => {
    test('should render simple markdown text', () => {
      const content = 'Hello world'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    test('should render headings', () => {
      const content = '# Heading 1\n## Heading 2\n### Heading 3'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Heading 2' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Heading 3' })).toBeInTheDocument()
    })

    test('should render paragraphs', () => {
      const content = 'First paragraph\n\nSecond paragraph'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('First paragraph')).toBeInTheDocument()
      expect(screen.getByText('Second paragraph')).toBeInTheDocument()
    })

    test('should render bold text', () => {
      const content = 'This is **bold** text'
      render(<MarkdownPreview content={content} />)

      const boldElement = screen.getByText('bold')
      expect(boldElement.tagName).toBe('STRONG')
    })

    test('should render italic text', () => {
      const content = 'This is *italic* text'
      render(<MarkdownPreview content={content} />)

      const italicElement = screen.getByText('italic')
      expect(italicElement.tagName).toBe('EM')
    })

    test('should render links', () => {
      const content = '[Click here](https://example.com)'
      render(<MarkdownPreview content={content} />)

      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    test('should render unordered lists', () => {
      const content = '- Item 1\n- Item 2\n- Item 3'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    test('should render ordered lists', () => {
      const content = '1. First\n2. Second\n3. Third'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
      expect(screen.getByText('Third')).toBeInTheDocument()
    })

    test('should render inline code', () => {
      const content = 'Use `console.log()` for debugging'
      render(<MarkdownPreview content={content} />)

      const codeElement = screen.getByText('console.log()')
      expect(codeElement.tagName).toBe('CODE')
    })

    test('should render code blocks', () => {
      const content = '```javascript\nconst x = 42;\n```'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText(/const x = 42/)).toBeInTheDocument()
    })
  })

  describe('GitHub Flavored Markdown', () => {
    test('should render tables', () => {
      const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('Header 1')).toBeInTheDocument()
      expect(screen.getByText('Header 2')).toBeInTheDocument()
      expect(screen.getByText('Cell 1')).toBeInTheDocument()
      expect(screen.getByText('Cell 2')).toBeInTheDocument()
    })

    test('should render strikethrough', () => {
      const content = '~~strikethrough~~'
      render(<MarkdownPreview content={content} />)

      const strikeElement = screen.getByText('strikethrough')
      expect(strikeElement.tagName).toBe('DEL')
    })

    test('should render task lists', () => {
      const content = '- [x] Completed task\n- [ ] Incomplete task'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText(/Completed task/)).toBeInTheDocument()
      expect(screen.getByText(/Incomplete task/)).toBeInTheDocument()
    })
  })

  describe('Complex Content', () => {
    test('should render blog post structure', () => {
      const content = `# Blog Post Title

## Introduction

This is the introduction paragraph with **bold** and *italic* text.

## Main Content

Here are some key points:

- Point 1
- Point 2
- Point 3

### Code Example

\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\`

## Conclusion

Final thoughts go here.`

      render(<MarkdownPreview content={content} />)

      expect(screen.getByRole('heading', { level: 1, name: 'Blog Post Title' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Introduction' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Main Content' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Code Example' })).toBeInTheDocument()
      expect(screen.getByText('Point 1')).toBeInTheDocument()
      expect(screen.getByText(/function hello/)).toBeInTheDocument()
    })

    test('should handle empty content', () => {
      const content = ''
      render(<MarkdownPreview content={content} />)

      const container = screen.getByText('', { selector: 'div' })
      expect(container).toBeInTheDocument()
    })

    test('should handle content with special characters', () => {
      const content = 'Special chars: & < > " \''
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText(/Special chars/)).toBeInTheDocument()
    })

    test('should render nested lists', () => {
      const content = `- Item 1
  - Nested 1
  - Nested 2
- Item 2`
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Nested 1')).toBeInTheDocument()
      expect(screen.getByText('Nested 2')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    test('should render blockquotes', () => {
      const content = '> This is a quote'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('This is a quote')).toBeInTheDocument()
    })

    test('should render horizontal rules', () => {
      const content = 'Before\n\n---\n\nAfter'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByText('Before')).toBeInTheDocument()
      expect(screen.getByText('After')).toBeInTheDocument()
    })
  })

  describe('Sanitization', () => {
    test('should not render script tags', () => {
      const content = '<script>alert("xss")</script>'
      render(<MarkdownPreview content={content} />)

      expect(screen.queryByText(/alert/)).not.toBeInTheDocument()
    })

    test('should handle malformed markdown gracefully', () => {
      const content = '# Heading\n\n**Bold without closing'
      render(<MarkdownPreview content={content} />)

      expect(screen.getByRole('heading', { level: 1, name: 'Heading' })).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    test('should apply prose classes', () => {
      const content = 'Test content'
      const { container } = render(<MarkdownPreview content={content} />)

      const proseDiv = container.querySelector('.prose')
      expect(proseDiv).toBeInTheDocument()
    })

    test('should apply responsive prose sizing', () => {
      const content = 'Test content'
      const { container } = render(<MarkdownPreview content={content} />)

      const proseDiv = container.querySelector('.prose-sm')
      expect(proseDiv).toBeInTheDocument()
    })
  })
})
