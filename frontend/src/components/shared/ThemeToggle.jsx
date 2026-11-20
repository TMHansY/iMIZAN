import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useColorMode } from '../../context/ColorModeContext';

export default function ThemeToggle() {
  const { mode, toggleMode } = useColorMode();
  const label = `Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`;
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        title={label}
        onClick={toggleMode}
        color="inherit"
        sx={{
          flexShrink: 0,
          color: 'text.primary',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
