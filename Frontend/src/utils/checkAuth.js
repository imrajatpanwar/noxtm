// Utility to check authentication status
export const checkAuth = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('=== Authentication Status ===');
  console.log('Token exists:', !!token);
  console.log('Token:', token ? `${token.substring(0, 20)}...` : 'None');
  console.log('User exists:', !!user);
  
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      console.log('User data:', parsedUser);
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  console.log('=========================');
  
  return { hasToken: !!token, hasUser: !!user };
};

// Check if token is expired (basic check - doesn't validate signature)
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp;
  } catch (e) {
    console.error('Error checking token expiration:', e);
    return true;
  }
};
