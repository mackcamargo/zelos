import React, { useState, useCallback, useRef } from 'react';

export interface FieldValidationRule {
  id: string; // DOM element ID or field identifier (e.g. 'input-name')
  name?: string; // Optional field key
  label?: string; // Human label for fallback error message (e.g. "Nome completo")
  value: any; // Field value
  required?: boolean; // Whether field is required (default: true)
  errorMessage?: string; // Custom error message if empty/invalid
  customValidate?: (value: any) => string | null | boolean; // Custom validator function
  sectionId?: string; // Tab/section ID if field is in hidden/closed tab
  onSwitchSection?: (sectionId: string) => void; // Callback to open section before scrolling
}

export interface UseFormValidationReturn {
  errors: Record<string, string>;
  highlightedFieldId: string | null;
  validateAndFocus: (
    fields: FieldValidationRule[],
    globalOptions?: {
      onSwitchSection?: (sectionId: string) => void;
      highlightDurationMs?: number;
    }
  ) => boolean;
  clearError: (fieldId: string) => void;
  clearAllErrors: () => void;
  getFieldProps: (
    fieldId: string,
    options?: {
      customErrorMsg?: string;
    }
  ) => {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
    className: string;
    hasError: boolean;
    errorText?: string;
    isHighlighted: boolean;
  };
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearError = useCallback((fieldId: string) => {
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setHighlightedFieldId((prev) => (prev === fieldId ? null : prev));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setHighlightedFieldId(null);
  }, []);

  const validateAndFocus = useCallback(
    (
      fields: FieldValidationRule[],
      globalOptions?: {
        onSwitchSection?: (sectionId: string) => void;
        highlightDurationMs?: number;
      }
    ): boolean => {
      const newErrors: Record<string, string> = {};
      let firstInvalidField: FieldValidationRule | null = null;

      for (const field of fields) {
        const isRequired = field.required !== false;
        const val = field.value;
        const isEmpty =
          val === null ||
          val === undefined ||
          (typeof val === 'string' && val.trim() === '') ||
          (Array.isArray(val) && val.length === 0);

        let errorMsg: string | null = null;

        if (isRequired && isEmpty) {
          errorMsg = field.errorMessage || 'Campo obrigatório';
        } else if (!isEmpty && field.customValidate) {
          const customRes = field.customValidate(val);
          if (typeof customRes === 'string') {
            errorMsg = customRes;
          } else if (customRes === false) {
            errorMsg = field.errorMessage || 'Campo inválido';
          }
        }

        if (errorMsg) {
          newErrors[field.id] = errorMsg;
          if (!firstInvalidField) {
            firstInvalidField = field;
          }
        }
      }

      setErrors(newErrors);

      if (firstInvalidField) {
        const invalidField = firstInvalidField;
        const targetId = invalidField.id;

        // Switch section/tab if field is in closed section
        if (invalidField.sectionId) {
          if (invalidField.onSwitchSection) {
            invalidField.onSwitchSection(invalidField.sectionId);
          } else if (globalOptions?.onSwitchSection) {
            globalOptions.onSwitchSection(invalidField.sectionId);
          }
        }

        // Trigger blinking border highlight
        setHighlightedFieldId(targetId);

        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        const duration = globalOptions?.highlightDurationMs ?? 1500;
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedFieldId(null);
        }, duration);

        // Smooth scroll and focus
        setTimeout(() => {
          const el =
            document.getElementById(targetId) ||
            document.querySelector(`[name="${targetId}"]`) ||
            document.querySelector(`[data-field-id="${targetId}"]`);

          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if ('focus' in el && typeof (el as HTMLElement).focus === 'function') {
              (el as HTMLElement).focus({ preventScroll: true });
            }
          }
        }, 80);

        return false;
      }

      setHighlightedFieldId(null);
      return true;
    },
    []
  );

  const getFieldProps = useCallback(
    (fieldId: string) => {
      const errorText = errors[fieldId];
      const hasError = Boolean(errorText);
      const isHighlighted = highlightedFieldId === fieldId;

      return {
        id: fieldId,
        'aria-invalid': hasError,
        'aria-describedby': hasError ? `err-${fieldId}` : undefined,
        hasError,
        errorText,
        isHighlighted,
        className: isHighlighted
          ? 'animate-flash-error !border-danger focus:!border-danger focus:!ring-danger/20'
          : hasError
          ? '!border-danger focus:!border-danger focus:!ring-danger/20'
          : '',
      };
    },
    [errors, highlightedFieldId]
  );

  return {
    errors,
    highlightedFieldId,
    validateAndFocus,
    clearError,
    clearAllErrors,
    getFieldProps,
  };
}

export function FormFieldError({ fieldId, error }: { fieldId: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`err-${fieldId}`} className="text-[10px] text-danger font-medium mt-1 flex items-center gap-1">
      <span>{error}</span>
    </p>
  );
}
