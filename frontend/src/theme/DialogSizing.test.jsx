import React from 'react';
import { render, screen } from '@testing-library/react';
import { Dialog, ThemeProvider } from '@mui/material';
import { createAppTheme } from './DefaultColors';

test.each(['light', 'dark'])(
  'dialogs keep their declared desktop maximum width in %s mode',
  (mode) => {
    const theme = createAppTheme(mode);
    const view = render(
      <ThemeProvider theme={theme}>
        <Dialog open fullWidth maxWidth="xs">
          Camera check
        </Dialog>
      </ThemeProvider>,
    );
    expect(window.getComputedStyle(screen.getByRole('dialog')).maxWidth).toBe('444px');
    view.rerender(
      <ThemeProvider theme={theme}>
        <Dialog open fullWidth maxWidth="sm">
          Result review
        </Dialog>
      </ThemeProvider>,
    );
    expect(window.getComputedStyle(screen.getByRole('dialog')).maxWidth).toBe('600px');
    view.rerender(
      <ThemeProvider theme={theme}>
        <Dialog open fullWidth maxWidth="md">
          Exam logs
        </Dialog>
      </ThemeProvider>,
    );
    expect(window.getComputedStyle(screen.getByRole('dialog')).maxWidth).toBe('900px');
  },
);
