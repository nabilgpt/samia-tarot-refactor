import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing user session on app load
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const userData = localStorage.getItem('samia_user');
        const token = localStorage.getItem('samia_token');
        
        if (userData && token) {
          const user = JSON.parse(userData);
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data - replace with actual API response
      const mockUser = {
        id: '1',
        email,
        firstName: 'أحمد',
        lastName: 'محمد',
        role: 'client',
        avatar: null,
        phone: '+966501234567',
        dateOfBirth: '1990-01-01',
        country: 'Saudi Arabia',
        balance: 150.00
      };

      const mockToken = 'mock_jwt_token_' + Date.now();

      // Store in localStorage
      localStorage.setItem('samia_user', JSON.stringify(mockUser));
      localStorage.setItem('samia_token', mockToken);

      dispatch({ type: 'LOGIN_SUCCESS', payload: mockUser });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const signup = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock user creation - replace with actual API response
      const newUser = {
        id: Date.now().toString(),
        ...userData,
        role: 'client',
        avatar: null,
        balance: 0.00
      };

      const mockToken = 'mock_jwt_token_' + Date.now();

      // Store in localStorage
      localStorage.setItem('samia_user', JSON.stringify(newUser));
      localStorage.setItem('samia_token', mockToken);

      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('samia_user');
    localStorage.removeItem('samia_token');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('samia_user', JSON.stringify(updatedUser));
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    signup,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 