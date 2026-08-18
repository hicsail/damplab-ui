import { useContext } from 'react';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { ViewModeContext } from '../contexts/ViewModeContext';

/**
 * Returns user context with isDamplabStaff overridden to false when
 * the staff user has toggled into client view mode.
 */
export function useEffectiveUser(): UserContextProps {
  const userContext = useContext(UserContext);
  const { isClientView } = useContext(ViewModeContext);

  if (!isClientView || !userContext.userProps?.isDamplabStaff) {
    return userContext;
  }

  return {
    ...userContext,
    userProps: {
      ...userContext.userProps,
      isDamplabStaff: false,
    },
  };
}
