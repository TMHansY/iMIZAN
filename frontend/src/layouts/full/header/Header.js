import ThemeToggle from '../../../components/shared/ThemeToggle';
import React from 'react';
import { Box, AppBar, Toolbar, Stack, IconButton, Typography } from '@mui/material';
import { IconMenu } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import Profile from './Profile';
import NotificationBell from './NotificationBell';

const Header = ({ toggleMobileSidebar }) => {
  const { userInfo } = useSelector((state) => state.auth);
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        color: 'text.primary',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{ gap: { xs: 0.5, sm: 1 }, minHeight: { xs: 64, lg: 76 }, px: { xs: 1, sm: 3 } }}
      >
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
  );
};
export default Header;
