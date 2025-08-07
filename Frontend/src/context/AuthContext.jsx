import { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(
    localStorage.getItem('walletAddress') || ''
  );
  const [authUser, setAuthUser] = useState(
    JSON.parse(localStorage.getItem('authUser')) || null
  );
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem('isAdmin') === 'true' || false
  );

  const login = (address, userData = {}) => {
    const userWithAdminStatus = {
      ...userData,
      walletAddress: address,
      isAdmin: userData.isAdmin || localStorage.getItem('isAdmin') === 'true' || false
    };

    setWalletAddress(address);
    setAuthUser(userWithAdminStatus);
    setIsAdmin(userWithAdminStatus.isAdmin);
    
    localStorage.setItem('walletAddress', address);
    localStorage.setItem('authUser', JSON.stringify(userWithAdminStatus));
    localStorage.setItem('isAdmin', userWithAdminStatus.isAdmin.toString());
  };

  const setAdminStatus = (status) => {
    setIsAdmin(status);
    localStorage.setItem('isAdmin', status.toString());
    
    // Update authUser if it exists
    if (authUser) {
      const updatedUser = { ...authUser, isAdmin: status };
      setAuthUser(updatedUser);
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
    }
  };

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }

    setWalletAddress('');
    setAuthUser(null);
    setIsAdmin(false);
    
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('authUser');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('profilePic');
  };

  // Sync admin status from localStorage on initial load
  useEffect(() => {
    const storedAdminStatus = localStorage.getItem('isAdmin') === 'true';
    if (storedAdminStatus !== isAdmin) {
      setIsAdmin(storedAdminStatus);
    }
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        walletAddress, 
        authUser, 
        isAdmin,
        login, 
        logout,
        setAdminStatus,
        setAuthUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  return useContext(AuthContext);
};