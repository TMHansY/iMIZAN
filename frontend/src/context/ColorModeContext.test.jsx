import React from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { useTheme } from '@mui/material';
import { ColorModeProvider, COLOR_MODE_KEY } from './ColorModeContext';
import ThemeToggle from '../components/shared/ThemeToggle';

function Screen() {
  const theme = useTheme();
  return (
    <>
      <ThemeToggle />
      <output data-testid="palette">
        {theme.palette.mode}:{theme.palette.background.paper}
      </output>
    </>
  );
}
const mount = () =>
  render(
    <ColorModeProvider>
      <Screen />
    </ColorModeProvider>,
  );
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = jest.fn(() => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test('switches the application palette and remembers the choice after remounting', () => {
  const view = mount();
  expect(screen.getByTestId('palette').textContent).toBe('light:#FFFFFF');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(screen.getByTestId('palette').textContent).toBe('dark:#20272D');
  expect(localStorage.getItem(COLOR_MODE_KEY)).toBe('dark');
  view.unmount();
  mount();
  expect(screen.getByTestId('palette').textContent).toBe('dark:#20272D');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
  expect(localStorage.getItem(COLOR_MODE_KEY)).toBe('light');
});

test('uses device preference on first visit but respects an explicit saved choice', () => {
  window.matchMedia = jest.fn(() => ({ matches: true }));
  const view = mount();
  expect(screen.getByTestId('palette').textContent).toBe('dark:#20272D');
  view.unmount();
  localStorage.setItem(COLOR_MODE_KEY, 'light');
  mount();
  expect(screen.getByTestId('palette').textContent).toBe('light:#FFFFFF');
});

test('switching still works when local storage is unavailable', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(screen.getByTestId('palette').textContent).toBe('dark:#20272D');
});

test('the theme button displays the destination mode as a visible label', () => {
  mount();
  const button = screen.getByRole('button', { name: 'Switch to dark theme' });
  expect(button.textContent).toContain('Dark mode');
  fireEvent.click(button);
  expect(screen.getByRole('button', { name: 'Switch to light theme' }).textContent).toContain('Light mode');
});
