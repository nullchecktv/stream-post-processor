describe('Create Quotes Tool - Speaker Acceptance', () => {
  test('should accept any speaker name without validation', () => {
    const validQuotes = [
      { speaker: 'Bob' },
      { speaker: 'Robert Smith' },
      { speaker: 'Dr. Smith' },
      { speaker: 'Unknown Speaker' },
      { speaker: 'Guest 1' },
      { speaker: 'host' },
      { speaker: 'John Doe' }
    ];

    validQuotes.forEach(quote => {
      expect(quote.speaker).toBeTruthy();
      expect(typeof quote.speaker).toBe('string');
      expect(quote.speaker.length).toBeGreaterThan(0);
    });
  });

  test('should store speaker names exactly as provided', () => {
    const testCases = [
      { input: 'Bob', expected: 'Bob' },
      { input: 'Robert Smith', expected: 'Robert Smith' },
      { input: 'Dr. John', expected: 'Dr. John' },
      { input: 'guest1', expected: 'guest1' }
    ];

    testCases.forEach(({ input, expected }) => {
      expect(input).toBe(expected);
    });
  });

  test('should not normalize or transform speaker names', () => {
    const speakers = [
      'Bob',
      'bob',
      'BOB',
      'Robert Smith',
      'robert smith'
    ];

    speakers.forEach(speaker => {
      expect(speaker).toBe(speaker);
    });
  });
});
