import { renderHook, act } from '@testing-library/react';
import { useAsync } from '../../hooks';

describe('useAsync hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should handle successful async function', async () => {
    const successData = { id: 1, name: 'Test' };
    const asyncFn = jest.fn().mockResolvedValue(successData);

    const { result } = renderHook(() => useAsync(asyncFn, false));

    // Initial state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Execute the async function
    let promiseResult;
    act(() => {
      promiseResult = result.current.execute();
    });

    // Loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for the async function to resolve
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    // Success state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(successData);
    expect(result.current.error).toBeNull();

    // The execute method should return the result
    await expect(promiseResult).resolves.toEqual(successData);
  });

  test('should handle failed async function', async () => {
    const errorMessage = 'Test error';
    const error = new Error(errorMessage);
    const asyncFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useAsync(asyncFn, false));

    // Execute the async function
    let promiseResult;
    act(() => {
      promiseResult = result.current.execute().catch((e) => e);
    });

    // Wait for the async function to reject
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    // Error state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(error);

    // The execute method should throw the error
    await expect(promiseResult).resolves.toEqual(error);
  });

  test('should execute immediately when immediate is true', async () => {
    const successData = { id: 1, name: 'Test' };
    const asyncFn = jest.fn().mockResolvedValue(successData);

    const { result } = renderHook(() => useAsync(asyncFn, true));

    // Should be in loading state initially
    expect(result.current.loading).toBe(true);
    expect(asyncFn).toHaveBeenCalledTimes(1);

    // Wait for the async function to resolve
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    // Success state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(successData);
    expect(result.current.error).toBeNull();
  });
});
