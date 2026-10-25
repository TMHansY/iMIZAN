import { Card } from '@mui/material';
import React from 'react';
import PropTypes from 'prop-types';

const BlankCard = ({ children, className, sx }) => {
  return (
    <Card
      sx={[{ p: 0, position: 'relative' }, sx]}
      className={className}
      elevation={9}
      variant={undefined}
    >
      {children}
    </Card>
  );
};

BlankCard.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  sx: PropTypes.object,
};

export default BlankCard;
