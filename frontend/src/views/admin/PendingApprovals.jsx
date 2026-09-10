import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const PendingApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/api/users/pending', {
        withCredentials: true,
      });
      setPendingUsers(data);
    } catch (err) {
      toast.error('Failed to load pending accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id, email) => {
    try {
      await axiosInstance.put(`/api/users/${id}/approve`, {}, { withCredentials: true });
      toast.success(`${email} approved`);
      fetchPending();
    } catch (err) {
      toast.error('Failed to approve account');
    }
  };

  const handleReject = async (id, email) => {
    try {
      await axiosInstance.delete(`/api/users/${id}/reject`, { withCredentials: true });
      toast.success(`${email} rejected`);
      fetchPending();
    } catch (err) {
      toast.error('Failed to reject account');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="Pending Approvals" description="Approve or reject new accounts">
      <DashboardCard title="Pending Account Approvals">
        {pendingUsers.length === 0 ? (
          <Typography color="text.secondary">No accounts awaiting approval.</Typography>
        ) : (
          <List disablePadding>
            {pendingUsers.map((user, index) => (
              <React.Fragment key={user._id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{ py: 2 }}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleApprove(user._id, user.email)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleReject(user._id, user.email)}
                      >
                        Reject
                      </Button>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={`${user.name} (${user.role})`}
                    secondary={user.email}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </DashboardCard>
    </PageContainer>
  );
};

export default PendingApprovals;