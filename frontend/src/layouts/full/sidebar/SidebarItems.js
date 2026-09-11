import React from 'react';
import Menuitems from './MenuItems';
import { useLocation } from 'react-router';
import { Box, List } from '@mui/material';
import NavItem from './NavItem';
import NavGroup from './NavGroup/NavGroup';
import { useSelector } from 'react-redux';

const SidebarItems = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const { pathname } = useLocation();
  const pathDirect = pathname;

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.map((item) => {
          // Check if the user is a student and if the item should be hidden
          if (
            userInfo?.role === 'student' &&
            ['Create Exam', 'Add Questions', 'Exam Logs'].includes(item.title)
          ) {
            return null; // Don't render this menu item for students
          }
          if (
            userInfo?.role === 'admin' &&
            ['Exams', 'Result', 'Create Exam', 'Add Questions', 'Exam Logs'].includes(item.title)
          ) {
            return null; // Don't render this menu item for admins
          }

          if (userInfo?.role !== 'admin' && ['Pending Approvals', 'Account Management', 'System Stats'].includes(item.title)) {
            return null; // Only admins see the approvals page
          }
          // {/********SubHeader**********/}
         if (item.subheader) {
            // Check if the user is a student and if the subheader should be hidden
            if (userInfo?.role === 'student' && item.subheader === 'Lecturer') {
              return null; // Don't render the "Lecturer" subheader for students
            }

            if (userInfo?.role !== 'admin' && item.subheader === 'Admin') {
              return null; // Only admins see the "Admin" subheader
            }

            if (userInfo?.role === 'admin' && item.subheader === 'Student') {
              return null; // Admins only see the "Admin" subheader, not "Student" or "Lecturer"
            }

            if (userInfo?.role === 'admin' && item.subheader === 'Lecturer') {
              return null; // Admins only see the "Admin" subheader, not "Student" or "Lecturer"
            }

            return <NavGroup item={item} key={item.subheader} />;

            // {/********If Sub Menu**********/}
            /* eslint no-else-return: "off" */
          } else {
            return <NavItem item={item} key={item.id} pathDirect={pathDirect} />;
          }
        })}
      </List>
    </Box>
  );
};
export default SidebarItems;
