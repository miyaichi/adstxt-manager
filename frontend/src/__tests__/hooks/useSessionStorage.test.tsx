import { renderHook, act } from '@testing-library/react';
import { useSessionStorage } from '../../hooks';

describe('useSessionStorage hook', () => {
  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    // Setup sessionStorage mock
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });

    // Clear the mock before each test
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  test('should initialize with default value if sessionStorage is empty', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useSessionStorage('user', initialValue));

    expect(result.current[0]).toEqual(initialValue);
    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('user');
  });

  test('should initialize with value from sessionStorage if it exists', () => {
    const storedValue = { name: 'Jane', age: 25 };
    sessionStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedValue));

    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useSessionStorage('user', initialValue));

    expect(result.current[0]).toEqual(storedValue);
    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('user');
  });

  test('should update sessionStorage when setValue is called', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useSessionStorage('user', initialValue));

    const newValue = { name: 'Jane', age: 25 };
    act(() => {
      result.current[1](newValue);
    });

    expect(result.current[0]).toEqual(newValue);
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(newValue));
  });

  test('should handle function updates correctly', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useSessionStorage('user', initialValue));

    act(() => {
      result.current[1]((prev) => ({ ...prev, age: prev.age + 1 }));
    });

    const expectedValue = { name: 'John', age: 31 };
    expect(result.current[0]).toEqual(expectedValue);
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(expectedValue));
  });

  test('should handle sessionStorage errors gracefully', () => {
    // Mock an error when setting an item
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorageMock.setItem.mockImplementation(() => {
      throw new Error('sessionStorage is full');
    });

    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useSessionStorage('user', initialValue));

    const newValue = { name: 'Jane', age: 25 };
    act(() => {
      result.current[1](newValue);
    });

    // Value should be updated in the hook state even if sessionStorage fails
    expect(result.current[0]).toEqual(newValue);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
