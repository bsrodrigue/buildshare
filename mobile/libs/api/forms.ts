import { FieldValues, Path,UseFormSetError } from 'react-hook-form';

import { BackendApiError } from '@/libs/api/types';

/**
 * Maps structured backend field errors to react-hook-form's setError state.
 */
export const setFormErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean => {
  if (error instanceof BackendApiError && error.fields) {
    Object.entries(error.fields).forEach(([field, issues]) => {
      // We assume the first issue is the most relevant for the UI
      setError(field as Path<T>, {
        type: 'server',
        message: issues[0].message,
      });
    });
    return true;
  }
  return false;
};
