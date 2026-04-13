import { FC, ReactNode } from 'react';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import { Theme } from '@mui/material';

interface LabelProps {
  className?: string;
  color?:
    | 'primary'
    | 'black'
    | 'secondary'
    | 'error'
    | 'warning'
    | 'success'
    | 'info';
  children?: ReactNode;
}

const LabelWrapper = styled('span')(({ theme }: { theme: Theme }) => `
  background-color: ${theme.palette.grey[100]};
  padding: ${theme.spacing(0.5, 1)};
  font-size: ${theme.typography.pxToRem(13)};
  border-radius: ${theme.shape.borderRadius};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-height: ${theme.spacing(3)};
  
  &.MuiLabel {
    &-primary {
      background-color: ${theme.palette.primary.light};
      color: ${theme.palette.primary.main};
    }

    &-black {
      background-color: ${theme.palette.grey[900]};
      color: ${theme.palette.common.white};
    }
    
    &-secondary {
      background-color: ${theme.palette.secondary.light};
      color: ${theme.palette.secondary.main};
    }
    
    &-success {
      background-color: ${theme.palette.success.light};
      color: ${theme.palette.success.main};
    }
    
    &-warning {
      background-color: ${theme.palette.warning.light};
      color: ${theme.palette.warning.main};
    }
          
    &-error {
      background-color: ${theme.palette.error.light};
      color: ${theme.palette.error.main};
    }
    
    &-info {
      background-color: ${theme.palette.info.light};
      color: ${theme.palette.info.main};
    }
  }
`);

const Label: FC<LabelProps> = ({
  className,
  color = 'secondary',
  children,
  ...rest
}) => {
  return (
    <LabelWrapper className={`MuiLabel-${color}`} {...rest}>
      {children}
    </LabelWrapper>
  );
};

Label.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  color: PropTypes.oneOf([
    'primary',
    'black',
    'secondary',
    'error',
    'warning',
    'success',
    'info',
  ]),
};

export default Label;
