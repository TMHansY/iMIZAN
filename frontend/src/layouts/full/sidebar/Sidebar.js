import { useMediaQuery, Box, Drawer, Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SidebarItems from './SidebarItems';

const Sidebar = ({ isMobileSidebarOpen, onSidebarClose }) => {
  const desktop = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack
        component={Link}
        to="/dashboard"
        onClick={onSidebarClose}
        direction="row"
        spacing={1.5}
        sx={{ p: 3, alignItems: 'center', color: 'primary.main', textDecoration: 'none' }}
      >
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 44,
            height: 44,
            bgcolor: 'primary.light',
            borderRadius: 2,
          }}
        >
          <SchoolOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={700}>
            iMIZAN
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Examination platform
          </Typography>
        </Box>
      </Stack>
      <SidebarItems onNavigate={desktop ? undefined : onSidebarClose} />
    </Box>
  );
  return (
    <Box sx={{ width: desktop ? 260 : 0, flexShrink: 0 }}>
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || isMobileSidebarOpen}
        onClose={onSidebarClose}
        PaperProps={{
          sx: { width: 260, maxWidth: '85vw', borderRight: '1px solid', borderColor: 'divider' },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
};
export default Sidebar;
