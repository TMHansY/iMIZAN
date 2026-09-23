import { createTheme } from '@mui/material/styles';
import typography from './Typography';
import { shadows } from './Shadows';

export const createAppTheme = (mode = 'light') => {
  const dark = mode === 'dark';
  const surface = dark ? '#20272D' : '#FFFFFF';
  const background = dark ? '#14191E' : '#F6F8F7';
  const divider = dark ? '#46515B' : '#E2E8E4';
  const secondaryText = dark ? '#C0CBD5' : '#617068';
  return createTheme({
    direction: 'ltr',
    palette: {
      mode,
      primary: {
        main: dark ? '#83D6AC' : '#166348',
        light: dark ? '#243F31' : '#EAF4EE',
        dark: dark ? '#ACE9C8' : '#005A32',
        contrastText: dark ? '#10251A' : '#FFFFFF',
      },
      secondary: {
        main: dark ? '#9CCADC' : '#476F83',
        light: dark ? '#203640' : '#E8F7FF',
        dark: dark ? '#7DB0C4' : '#304F60',
      },
      success: {
        main: dark ? '#83D6AC' : '#247653',
        light: dark ? '#233E30' : '#E6FFFA',
        dark: dark ? '#64B78E' : '#185338',
        contrastText: dark ? '#152019' : '#ffffff',
      },
      info: {
        main: dark ? '#90CAF9' : '#539BFF',
        light: dark ? '#233548' : '#EBF3FE',
        dark: dark ? '#69B0EA' : '#1682d4',
        contrastText: dark ? '#152019' : '#ffffff',
      },
      error: {
        main: dark ? '#F5A5A5' : '#B83C3C',
        light: dark ? '#482B2B' : '#FDEDE8',
        dark: dark ? '#DF8585' : '#8F2929',
        contrastText: dark ? '#152019' : '#ffffff',
      },
      warning: {
        main: dark ? '#E9C474' : '#956000',
        light: dark ? '#403722' : '#FEF5E5',
        dark: dark ? '#CDA551' : '#704700',
        contrastText: dark ? '#152019' : '#ffffff',
      },
      purple: {
        A50: '#EBF3FE',
        A100: '#6610f2',
        A200: '#557fb9',
      },
      grey: {
        50: dark ? '#1B2229' : '#FAFAFA',
        100: dark ? '#27313A' : '#F2F6FA',
        200: dark ? '#46515B' : '#EAEFF4',
        300: '#DFE5EF',
        400: '#7C8FAC',
        500: '#5A6A85',
        600: '#2A3547',
      },
      text: {
        primary: dark ? '#F1F5F9' : '#202B26',
        secondary: secondaryText,
      },
      action: {
        disabledBackground: dark ? '#303942' : 'rgba(73,82,88,0.12)',
        ...(dark ? { active: '#CBD5E1', disabled: '#8D99A5', selected: '#2B4038' } : {}),
        hoverOpacity: 0.02,
        hover: dark ? '#303C46' : '#f6f9fc',
      },
      divider,
      background: { default: background, paper: surface },
    },
    typography,
    shadows,
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { overflowWrap: 'break-word', colorScheme: mode },
          '*, *::before, *::after': { boxSizing: 'border-box' },
          '*:focus-visible': {
            outline: dark ? '3px solid #9CCADC' : '3px solid #476F83',
            outlineOffset: 3,
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animation: 'none !important',
              transition: 'none !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none', color: dark ? '#F1F5F9' : '#202B26' } },
      },
      MuiAppBar: { styleOverrides: { root: { color: dark ? '#F1F5F9' : '#202B26' } } },
      MuiInputLabel: { styleOverrides: { root: { color: secondaryText } } },
      MuiFormLabel: { styleOverrides: { root: { color: secondaryText } } },
      MuiFormHelperText: { styleOverrides: { root: { color: secondaryText } } },
      MuiListItemIcon: { styleOverrides: { root: { color: secondaryText } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? '#E2E8F0' : '#202B26',
            color: dark ? '#14191E' : '#FFFFFF',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${divider}`,
            boxShadow: '0 4px 20px rgba(32,43,38,0.035)',
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 44,
            padding: '10px 18px',
            fontWeight: 600,
            textTransform: 'none',
          },
        },
      },
      MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: surface,
            color: dark ? '#F1F5F9' : '#202B26',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? '#73818E' : divider },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: secondaryText },
          },
          input: { '@media (max-width: 600px)': { fontSize: '16px' } },
        },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 600, maxWidth: '100%' } } },
      MuiTableContainer: { styleOverrides: { root: { overflowX: 'auto' } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: divider, padding: '16px' },
          head: { backgroundColor: background, color: secondaryText, fontWeight: 600 },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16, margin: 16, maxWidth: 'calc(100% - 32px)' } },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 8, '&:hover': { backgroundColor: dark ? '#303C46' : '#F0F6F2' } },
        },
      },
    },
  });
};

export const baselightTheme = createAppTheme('light');
