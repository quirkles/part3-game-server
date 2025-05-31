export function generateAllSubstrings(
  str: string,
  minLength = 1,
  preserveCase = false,
): string[] {
  const results = new Set<string>();
  const inputStr = preserveCase ? str : str.toLowerCase();
  let i = 0;
  let j = i + minLength;
  while (i < inputStr.length) {
    while (j <= str.length) {
      results.add(inputStr.substring(i, j));
      j++;
    }
    i++;
    j = i + minLength;
  }
  return [...results];
}
