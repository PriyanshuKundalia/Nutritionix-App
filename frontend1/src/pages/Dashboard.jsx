import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Dashboard() {
  const { authToken } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('http://localhost:8080/user/profile', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch user data');
          return;
        }

        const json = await response.json();
        console.log('Fetched user data:', json); // Debug log
        setUserData(json);
      } catch {
        setError('Network error');
      }
    }

    if (authToken) {
      fetchUserData();
    }
  }, [authToken]);

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!userData) {
    return <p>Loading user data...</p>;
  }

  const user = userData.data;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name || user.email || 'User'}!</p>
      {/* Display more user info as needed */}
    </div>
  );
}
