import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const AccountManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [hideDeactivated, setHideDeactivated] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/api/users/accounts', {
        withCredentials: true,
      });
      setAccounts(data);
    } catch (err) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleToggleActive = async (id, email) => {
    try {
      const { data } = await axiosInstance.put(
        `/api/users/${id}/toggle-active`,
        {},
        { withCredentials: true },
      );
      toast.success(data.message);
      fetchAccounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update account');
    }
  };
  const handleDelete = async (id, email) => {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return;

    try {
      const { data } = await axiosInstance.delete(`/api/users/${id}`, {
        withCredentials: true,
      });
      toast.success(data.message);
      fetchAccounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete account');
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || account.role === roleFilter;
    const matchesDeactivated = !hideDeactivated || account.isApproved;
    return matchesSearch && matchesRole && matchesDeactivated;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="Account Management" description="View and manage all accounts">
      <DashboardCard title="All Accounts">
        <Box mb={3} display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="Search by name or email"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              label="Role"
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="lecturer">Lecturer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={hideDeactivated}
                onChange={(e) => setHideDeactivated(e.target.checked)}
              />
            }
            label="Hide deactivated accounts"
          />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No accounts match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account._id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={account.isApproved ? 'Active' : 'Deactivated'}
                        color={account.isApproved ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          color={account.isApproved ? 'error' : 'success'}
                          disabled={account.role === 'admin'}
                          onClick={() => handleToggleActive(account._id, account.email)}
                        >
                          {account.isApproved ? 'Deactivate' : 'Reactivate'}
                        </Button>
                        {!account.isApproved && account.role !== 'admin' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDelete(account._id, account.email)}
                          >
                            Delete
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DashboardCard>
    </PageContainer>
  );
};

export default AccountManagement;