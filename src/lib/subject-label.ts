export function subjectLabel(subjectName: string, topicNumbers: number[]): string {
  const numbers = [...new Set(topicNumbers)].sort((left, right) => left - right);
  if (numbers.length === 0) return subjectName;

  const prefix = numbers.length === 1 ? `Tema ${numbers[0]}` : `Temas ${compactNumbers(numbers)}`;
  return `${prefix} · ${subjectName}`;
}

function compactNumbers(numbers: number[]): string {
  const consecutive = numbers.every(
    (number, index) => index === 0 || number === numbers[index - 1] + 1,
  );
  return consecutive ? `${numbers[0]}–${numbers[numbers.length - 1]}` : numbers.join(", ");
}
