export function returnMidpointColors(color1: string, color2: string, steps: number = 3): string[] | null {
  if (!color1 || !color2 || steps < 2) return null;

  const hexToRgb = (hex: string): [number, number, number] => {
    const rgb = hex.replace(/^#/, '').match(/.{2}/g)?.map((x) => parseInt(x, 16));
    if (!rgb || rgb.length !== 3) throw new Error(`Invalid hex color: ${hex}`);
    return [rgb[0], rgb[1], rgb[2]];
  };

  const rgbToHex = ([r, g, b]: [number, number, number]): string =>
    `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;

  const blendChannel = (c1: number, c2: number, ratio: number): number =>
    Math.round(c1 + (c2 - c1) * ratio);

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const colors: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const midpoint: [number, number, number] = [
      blendChannel(rgb1[0], rgb2[0], ratio),
      blendChannel(rgb1[1], rgb2[1], ratio),
      blendChannel(rgb1[2], rgb2[2], ratio),
    ];
    colors.push(rgbToHex(midpoint));
  }

  return colors;
}
