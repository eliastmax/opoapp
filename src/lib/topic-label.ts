export function topicLabel(topicNumber: number, topicName: string): string {
  const cleanName = topicName
    .trim()
    .replace(/^tema\s+\d+\s*(?:[.():—–-]+\s*)?/i, "")
    .trim();

  return cleanName ? `Tema ${topicNumber}. ${cleanName}` : `Tema ${topicNumber}`;
}
