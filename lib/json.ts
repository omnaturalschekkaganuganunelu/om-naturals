export function parseJSONArray(input: any): string[] {
  if (!input) return [];

  let cur: any = input;

  // Unpack stringified JSON up to 5 levels deep
  for (let i = 0; i < 5; i++) {
    if (typeof cur === 'string') {
      const trimmed = cur.trim();
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          cur = JSON.parse(trimmed);
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (Array.isArray(cur)) {
    const result: string[] = [];
    for (const item of cur) {
      const parsed = parseJSONArray(item);
      result.push(...parsed);
    }
    return result.filter((s) => typeof s === 'string' && s.trim().length > 0);
  }

  if (typeof cur === 'string') {
    const trimmed = cur.trim();
    if (trimmed) return [trimmed];
  }

  return [];
}

export function safeUnwrapLines(v: any): string {
  const arr = parseJSONArray(v);
  return arr.join('\n');
}
