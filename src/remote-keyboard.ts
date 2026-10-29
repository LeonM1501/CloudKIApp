export function remoteKeysyms(previous: string, value: string): number[] {
  const before = Array.from(previous), after = Array.from(value);
  let common = 0;
  while (common < before.length && before[common] === after[common]) common++;
  return [
    ...Array(before.length - common).fill(0xff08),
    ...after.slice(common).map(char => {
      const point = char.codePointAt(0)!;
      if (char === "\n" || char === "\r") return 0xff0d;
      if (char === "\t") return 0xff09;
      return point <= 0xff ? point : 0x01000000 | point;
    }),
  ];
}
