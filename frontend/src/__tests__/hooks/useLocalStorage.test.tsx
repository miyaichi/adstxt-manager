import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../hooks';

describe('useLocalStorage hook', () => {
  // Mock localStorage
  const localStorageMock = (() => {
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
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Clear the mock before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('should initialize with default value if localStorage is empty', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));

    expect(result.current[0]).toEqual(initialValue);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
  });

  test('should initialize with value from localStorage if it exists', () => {
    const storedValue = { name: 'Jane', age: 25 };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedValue));

    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));

    expect(result.current[0]).toEqual(storedValue);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
  });

  test('should update localStorage when setValue is called', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));

    const newValue = { name: 'Jane', age: 25 };
    act(() => {
      result.current[1](newValue);
    });

    expect(result.current[0]).toEqual(newValue);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(newValue));
  });

  test('should handle function updates correctly', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));

    act(() => {
      result.current[1]((prev) => ({ ...prev, age: prev.age + 1 }));
    });

    const expectedValue = { name: 'John', age: 31 };
    expect(result.current[0]).toEqual(expectedValue);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(expectedValue));
  });

  test('should handle localStorage errors gracefully', () => {
    // Mock an error when setting an item
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('localStorage is full');
    });

    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));

    const newValue = { name: 'Jane', age: 25 };
    act(() => {
      result.current[1](newValue);
    });

    // Value should be updated in the hook state even if localStorage fails
    expect(result.current[0]).toEqual(newValue);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
