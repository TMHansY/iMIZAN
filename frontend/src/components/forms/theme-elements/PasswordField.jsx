import React, { useState } from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import CustomTextField from './CustomTextField';

export default function PasswordField({ InputProps, disabled, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <CustomTextField
      {...props}
      disabled={disabled}
      type={visible ? 'text' : 'password'}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <>
            {InputProps?.endAdornment}
            <InputAdornment position="end">
              <IconButton
                type="button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-controls={props.id}
                edge="end"
                disabled={disabled || InputProps?.disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setVisible((current) => !current)}
                sx={{ color: 'text.secondary' }}
              >
                {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
              </IconButton>
            </InputAdornment>
          </>
        ),
      }}
    />
  );
}
