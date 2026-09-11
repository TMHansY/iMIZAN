import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
  IconUserPlus,
  IconPlayerPlayFilled,
  IconShieldCheck,
} from '@tabler/icons-react';

import { uniqueId } from 'lodash';

const Menuitems = [
  {
    navlabel: true,
    subheader: 'Home',
  },

  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconLayoutDashboard,
    href: '/dashboard',
  },
  {
    navlabel: true,
    subheader: 'Student',
  },
  {
    id: uniqueId(),
    title: 'Exams',
    icon: IconTypography,
    href: '/exam',
  },
  {
    id: uniqueId(),
    title: 'Result',
    icon: IconCopy,
    href: '/result',
  },
  {
    navlabel: true,
    subheader: 'Lecturer',
  },
  {
    id: uniqueId(),
    title: 'Create Exam',
    icon: IconMoodHappy,
    href: '/create-exam',
  },
  {
    id: uniqueId(),
    title: 'Add Questions',
    icon: IconLogin,
    href: '/add-questions',
  },
  {
    id: uniqueId(),
    title: 'Exam Logs',
    icon: IconUserPlus,
    href: '/exam-log',
  },
  {
    navlabel: true,
    subheader: 'Admin',
  },
  {
    id: uniqueId(),
    title: 'Pending Approvals',
    icon: IconShieldCheck,
    href: '/admin/approvals',
  },
  {
    id: uniqueId(),
    title: 'Account Management',
    icon: IconShieldCheck,
    href: '/admin/accounts',
  },
  {
    id: uniqueId(),
    title: 'System Stats',
    icon: IconShieldCheck,
    href: '/admin/stats',
  },
  // {
  //   id: uniqueId(),
  //   title: 'Exam  Sale comp',
  //   icon: IconPlayerPlayFilled,
  //   href: '/generate-report',
  // },
  // {
  //   id: uniqueId(),
  //   title: 'Sample Page',
  //   icon: IconAperture,
  //   href: '/sample-page',
  // },
];

export default Menuitems;
