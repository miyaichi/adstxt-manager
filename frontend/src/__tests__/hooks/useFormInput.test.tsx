import { renderHook, act } from '@testing-library/react';
import { useFormInput } from '../../hooks';

describe('useFormInput hook', () => {
  test('should initialize with default values', () => {
    const initialState = { name: '', email: '' };
    const { result } = renderHook(() => useFormInput(initialState));
    
    expect(result.current.values).toEqual(initialState);
  });

  test('should update a field when handleChange is called', () => {
    const initialState = { name: '', email: '' };
    const { result } = renderHook(() => useFormInput(initialState));
    
    const event = {
      target: {
        name: 'name',
        value: 'John Doe'
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    act(() => {
      result.current.handleChange(event);
    });
    
    expect(result.current.values).toEqual({
      name: 'John Doe',
      email: ''
    });
  });

  test('should reset values when reset is called', () => {
    const initialState = { name: '', email: '' };
    const { result } = renderHook(() => useFormInput(initialState));
    
    // First update the values
    act(() => {
      result.current.setValues({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
    
    // Then reset them
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.values).toEqual(initialState);
  });
});