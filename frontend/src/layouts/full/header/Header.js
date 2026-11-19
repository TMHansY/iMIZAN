import ThemeToggle from '../../../components/shared/ThemeToggle';
import React from 'react';
import { Box, AppBar, Toolbar, Stack, IconButton, Typography } from '@mui/material';
import { IconMenu } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import Profile from './Profile';
import NotificationBell from './NotificationBell';

const Header = ({ toggleMobileSidebar, hasSidebar = false }) => {
  const { userInfo } = useSelector((state) => state.auth);
  const toolbarHeight = { minHeight: { xs: 64, lg: 76 } };
  return (
    <>
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          top: 0,
          left: hasSidebar ? { lg: '260px' } : 0,
          width: hasSidebar ? { lg: 'calc(100% - 260px)' } : '100%',
          color: 'text.primary',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Toolbar sx={{ ...toolbarHeight, gap: { xs: 0.5, sm: 1 }, px: { xs: 1, sm: 3 } }}>
          {toggleMobileSidebar && (
            <IconButton
              aria-label="Open navigation"
              onClick={toggleMobileSidebar}
              sx={{ display: { lg: 'none' } }}
            >
              <IconMenu size={22} />
            </IconButton>
          )}

          <Box flexGrow={1} />
          <ThemeToggle />
          <NotificationBell />
          <Stack
            spacing={0.25}
            sx={{ display: { xs: 'none', sm: 'flex' }, ml: 1, minWidth: 0, maxWidth: 240 }}
          >
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {userInfo?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {userInfo?.role}
            </Typography>
          </Stack>
          <Profile />
        </Toolbar>
      </AppBar>
      <Toolbar aria-hidden="true" sx={{ ...toolbarHeight, visibility: 'hidden' }} />
    </>
  );
};
export default Header;
