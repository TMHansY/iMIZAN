import { getContrastRatio } from '@mui/material/styles';
import { createAppTheme } from './DefaultColors';

test('dark text, labels, and action colours have readable contrast on page and card surfaces', () => {
  const { palette } = createAppTheme('dark');
  for (const background of [palette.background.default, palette.background.paper]) {
    for (const foreground of [
      palette.text.primary,
      palette.text.secondary,
      palette.primary.main,
      palette.error.main,
      palette.success.main,
      palette.warning.main,
    ]) {
      expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const name of ['primary', 'success', 'error', 'warning']) {
    expect(getContrastRatio(palette[name].contrastText, palette[name].main)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(getContrastRatio(palette[name].contrastText, palette[name].dark)).toBeGreaterThanOrEqual(
      4.5,
    );
  }
});
