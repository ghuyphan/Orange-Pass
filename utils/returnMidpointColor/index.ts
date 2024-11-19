export function returnMidpointColor(color1: string, color2: string): string | null {
  if (!color1 || !color2) return null;

  const hexToRgb = (hex: string): [number, number, number] => {
    const rgb = hex
      .replace(/^#/, '')
      .match(/.{2}/g)
      ?.map((x) => parseInt(x, 16));

    if (!rgb || rgb.length !== 3) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    return [rgb[0], rgb[1], rgb[2]];
  };

  const rgbToHex = ([r, g, b]: [number, number, number]): string =>
    `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const midpoint: [number, number, number] = [
    Math.round((rgb1[0] + rgb2[0]) / 2),
    Math.round((rgb1[1] + rgb2[1]) / 2),
    Math.round((rgb1[2] + rgb2[2]) / 2),
  ];

  return rgbToHex(midpoint);
}
