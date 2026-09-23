import { Button, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useColorMode } from '../../context/ColorModeContext';

export default function ThemeToggle() {
  const { mode, toggleMode } = useColorMode();
  const label = `Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`;
  return (
    <Tooltip title={label}>
      <Button
        aria-label={label}
        onClick={toggleMode}
        variant="outlined"
        startIcon={mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        sx={{
          flexShrink: 0,
          color: 'text.primary',
          bgcolor: 'background.paper',
          borderColor: 'text.secondary',
          whiteSpace: 'nowrap',
          px: { xs: 1.25, sm: 2 },
          '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
        }}
      >
        {mode === 'dark' ? 'Light mode' : 'Dark mode'}
      </Button>
    </Tooltip>
  );
}
