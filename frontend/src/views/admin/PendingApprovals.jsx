import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/api/users/pending', {
        withCredentials: true,
      });
      setPendingUsers(data);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load pending accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === pendingUsers.length ? [] : pendingUsers.map((u) => u._id),
    );
  };

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

  const handleBulkApprove = async () => {
    try {
      const { data } = await axiosInstance.post(
        '/api/users/bulk-approve',
        { ids: selectedIds },
        { withCredentials: true },
      );
      toast.success(data.message);
      fetchPending();
    } catch (err) {
      toast.error('Failed to approve selected accounts');
    }
  };

  const handleBulkReject = async () => {
    try {
      const { data } = await axiosInstance.post(
        '/api/users/bulk-reject',
        { ids: selectedIds },
        { withCredentials: true },
      );
      toast.success(data.message);
      fetchPending();
    } catch (err) {
      toast.error('Failed to reject selected accounts');
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
      <DashboardCard
        title="Pending Account Approvals"
        action={
          selectedIds.length > 0 && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" color="success" onClick={handleBulkApprove}>
                Approve Selected ({selectedIds.length})
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={handleBulkReject}>
                Reject Selected ({selectedIds.length})
              </Button>
            </Stack>
          )
        }
      >
        {pendingUsers.length === 0 ? (
          <Typography color="text.secondary">No accounts awaiting approval.</Typography>
        ) : (
          <>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Checkbox
                checked={selectedIds.length === pendingUsers.length}
                indeterminate={selectedIds.length > 0 && selectedIds.length < pendingUsers.length}
                onChange={toggleSelectAll}
              />
              <Typography variant="body2" color="text.secondary">
                Select all
              </Typography>
            </Stack>
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
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedIds.includes(user._id)}
                        onChange={() => toggleSelected(user._id)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${user.name} (${user.role})`}
                      secondary={user.email}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </DashboardCard>
    </PageContainer>
  );
};

export default PendingApprovals;