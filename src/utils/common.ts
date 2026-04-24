import { App } from 'antd';

/**
 * Custom hook for displaying messages using App.useApp()
 * This provides access to message API with proper context
 *
 * @example
 * const { displaySuccessMessage, displayErrorMessage, displayInfoMessage, displayWarningMessage } = useMessage();
 *
 * // Display messages
 * displaySuccessMessage(response.data, 'Operation successful!');
 * displayErrorMessage(error, 'Operation failed!');
 * displayInfoMessage('Processing...', 'Info message');
 * displayWarningMessage('Warning!', 'Warning message');
 *
 * // Use message API directly
 * message.info('Info message');
 */
export const useMessage = () => {
  const { message } = App.useApp();

  /**
   * Display success message from API response
   * Handles response structure automatically
   * @param data - The response data object (usually response.data)
   * @param fallbackMessage - Message to display if data.message is not available
   */
  const displaySuccessMessage = (data: any, fallbackMessage: string): void => {
    const msg = data?.message || fallbackMessage;
    message.success(msg);
  };

  /**
   * Display error message from API error
   * Handles error structure automatically
   * @param error - The error object
   * @param fallbackMessage - Message to display if error details are not available
   */
  const displayErrorMessage = (error: any, fallbackMessage: string): void => {
    const msg = error?.detail || error?.message || fallbackMessage;
    message.error(msg);
  };

  /**
   * Display info message
   * @param data - The data object or string message
   * @param fallbackMessage - Message to display if data.message is not available
   */
  const displayInfoMessage = (data: any, fallbackMessage?: string): void => {
    const msg = typeof data === 'string' ? data : (data?.message || fallbackMessage);
    message.info(msg);
  };

  /**
   * Display warning message
   * @param data - The data object or string message
   * @param fallbackMessage - Message to display if data.message is not available
   */
  const displayWarningMessage = (data: any, fallbackMessage?: string): void => {
    const msg = typeof data === 'string' ? data : (data?.message || fallbackMessage);
    message.warning(msg);
  };

  return {
    displaySuccessMessage,
    displayErrorMessage,
    displayInfoMessage,
    displayWarningMessage,
    message, // Expose the message API for custom usage
  };
};

/**
 * Custom hook for using modals with App.useApp()
 * This provides access to modal API with proper context (no static function warnings)
 *
 * @example
 * const { modal } = useModal();
 *
 * // Confirmation modal
 * modal.confirm({
 *   title: 'Confirm Action',
 *   content: 'Are you sure?',
 *   onOk: () => handleAction(),
 * });
 *
 * // Other modal types
 * modal.info({ title: 'Info', content: 'Information' });
 * modal.success({ title: 'Success', content: 'Success message' });
 * modal.warning({ title: 'Warning', content: 'Warning message' });
 * modal.error({ title: 'Error', content: 'Error message' });
 */
export const useModal = () => {
  const { modal } = App.useApp();

  return {
    modal,
  };
};

/**
 * Custom hook for using notifications with App.useApp()
 * This provides access to notification API with proper context
 *
 * @example
 * const { notification } = useNotification();
 *
 * notification.success({
 *   message: 'Success',
 *   description: 'Operation completed successfully',
 * });
 */
export const useNotification = () => {
  const { notification } = App.useApp();

  return {
    notification,
  };
};
