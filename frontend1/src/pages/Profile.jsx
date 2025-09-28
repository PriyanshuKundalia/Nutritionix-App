import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Profile() {
  const { authToken } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // For BMR calculation display
  const [bmr, setBmr] = useState(null);

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:8080/user/profile', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) {
          setError('Failed to fetch profile');
          setLoading(false);
          return;
        }
        const res = await response.json();
        const data = res.data || res;
        setUser(data);
        setName(data.name || '');
        setAge(data.age !== null && data.age !== undefined ? String(data.age) : '');
        setHeight(data.height !== null && data.height !== undefined ? String(data.height) : '');
        setWeight(data.weight !== null && data.weight !== undefined ? String(data.weight) : '');
        setResetEmail(data.email || '');
      } catch {
        setError('Network error');
      }
      setLoading(false);
    }
    if (authToken) {
      fetchProfile();
    }
  }, [authToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanedAge = age === '' ? null : Number(age);
    const cleanedHeight = height === '' ? null : Number(height);
    const cleanedWeight = weight === '' ? null : Number(weight);

    try {
      const response = await fetch('http://localhost:8080/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          age: cleanedAge,
          height: cleanedHeight,
          weight: cleanedWeight,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to update profile');
        return;
      }
      setSuccess('Profile updated successfully');
      setUser(prev => ({
        ...prev,
        name,
        age: cleanedAge,
        height: cleanedHeight,
        weight: cleanedWeight,
      }));
      setIsEditing(false);
      setBmr(null); // Reset BMR on update
    } catch {
      setError('Network error');
    }
  }

  // Calculate BMR on button click using Mifflin-St Jeor formula (male version)
  function calculateBMR() {
    if (!age || !height || !weight) {
      setBmr('Please enter age, height, and weight');
      return;
    }
    const ageNum = Number(age);
    const heightNum = Number(height);
    const weightNum = Number(weight);
    if (isNaN(ageNum) || isNaN(heightNum) || isNaN(weightNum)) {
      setBmr('Invalid input values');
      return;
    }
    const calculatedBMR = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    setBmr(Math.round(calculatedBMR));
  }

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!user) return null;

  return (
    <div className="profile-container">
      <div className="header">
        <h2>Profile</h2>
        {!isEditing && (
          <button className="edit-btn" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        )}
      </div>

      <div className="info">
        <div className="field">
          <span className="label">Name:</span>
          <span>{!isEditing ? user.name || 'Not available' : null}</span>
        </div>
        <div className="field">
          <span className="label">Age:</span>
          <span>{!isEditing ? (user.age !== undefined ? user.age : 'Not available') : null}</span>
        </div>
        <div className="field">
          <span className="label">Height:</span>
          <span>{!isEditing ? (user.height !== undefined ? `${user.height} cm` : 'Not available') : null}</span>
        </div>
        <div className="field">
          <span className="label">Weight:</span>
          <span>{!isEditing ? (user.weight !== undefined ? `${user.weight} kg` : 'Not available') : null}</span>
        </div>
        <div className="field">
          <span className="label">Email:</span>
          <span>{user.email || 'Not available'}</span>
        </div>
        <div className="field">
          <span className="label">Role:</span>
          <span>{user.role || 'Not available'}</span>
        </div>
        <div className="field">
          <span className="label">Member Since:</span>
          <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
        </div>

        {/* Calc BMR button and display */}
        {!isEditing && (
          <>
            <button
              type="button"
              onClick={calculateBMR}
              style={{
                marginTop: '12px',
                padding: '6px 14px',
                fontSize: '0.9rem',
                borderRadius: '6px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Calc BMR
            </button>
            {bmr !== null && (
              <p style={{ marginTop: '8px', color: '#27ae60', fontWeight: '600' }}>
                {typeof bmr === 'number' ? `Calculated BMR: ${bmr} kcal/day` : bmr}
              </p>
            )}
          </>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="edit-form">
          <label>
            Name:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </label>
          <label>
            Age:
            <input
              type="number"
              min="0"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input"
            />
          </label>
          <label>
            Height (cm):
            <input
              type="number"
              min="0"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="input"
            />
          </label>
          <label>
            Weight (kg):
            <input
              type="number"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input"
            />
          </label>
          <div className="buttons">
            <button type="submit" className="save-btn">
              Save
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setName(user.name);
                setAge(user.age !== undefined && user.age !== null ? String(user.age) : '');
                setHeight(user.height !== undefined && user.height !== null ? String(user.height) : '');
                setWeight(user.weight !== undefined && user.weight !== null ? String(user.weight) : '');
                setIsEditing(false);
                setError('');
                setSuccess('');
                setBmr(null);
              }}
            >
              Cancel
            </button>
          </div>
          {success && <p className="success-msg">{success}</p>}
          {error && <p className="error-msg">{error}</p>}
        </form>
      )}

      {/* Password Reset Section */}
      <div className="password-reset-section">
        {!showReset && (
          <button
            className="reset-toggle-btn"
            onClick={() => {
              setShowReset(true);
              setResetMessage('');
            }}
          >
            Reset Password
          </button>
        )}
        {showReset && (
          <div className="reset-form">
            <p>Enter your email to receive password reset instructions.</p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Email"
              required
              className="input"
            />
            <div className="buttons">
              <button onClick={handleRequestReset} className="save-btn">
                Send Reset Email
              </button>
              <button
                onClick={() => setShowReset(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
            {resetMessage && <p className="message">{resetMessage}</p>}
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-container {
          max-width: 450px;
          margin: 40px auto;
          padding: 30px;
          background: #181818;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          color: #e0e0e0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        h2 {
          margin: 0;
          font-weight: 700;
          font-size: 1.8rem;
          color: #61dafb;
        }
        .edit-btn {
          background: #61dafb;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          color: #181818;
          transition: background 0.3s ease;
        }
        .edit-btn:hover {
          background: #52b4e3;
        }
        .info {
          margin-top: 25px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 1.1rem;
          border-bottom: 1px solid #333;
        }
        .label {
          font-weight: 600;
          color: #80c6ff;
        }
        form.edit-form {
          margin-top: 25px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        label {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          flex-direction: column;
          color: #bbb;
        }
        input.input {
          margin-top: 8px;
          padding: 10px;
          border-radius: 6px;
          border: 1.5px solid #444;
          background-color: #222;
          color: #e0e0e0;
          font-size: 1rem;
          transition: border 0.3s ease;
        }
        input.input:focus {
          outline: none;
          border-color: #61dafb;
          box-shadow: 0 0 8px #61dafb88;
        }
        .buttons {
          display: flex;
          gap: 12px;
        }
        .save-btn {
          background: #27ae60;
          border: none;
          padding: 10px 22px;
          color: white;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          flex: 1;
          transition: background 0.3s ease;
        }
        .save-btn:hover {
          background: #1f864d;
        }
        .cancel-btn {
          background: #888;
          border: none;
          padding: 10px 22px;
          color: white;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          flex: 1;
          transition: background 0.3s ease;
        }
        .cancel-btn:hover {
          background: #555;
        }
        .success-msg {
          color: #27ae60;
          font-weight: 600;
          text-align: center;
        }
        .error-msg {
          color: #ff5757;
          font-weight: 600;
          text-align: center;
        }
        .loading {
          text-align: center;
          font-size: 1.2rem;
          color: #ccc;
        }
        .error {
          text-align: center;
          color: #ff5757;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .password-reset-section {
          margin-top: 40px;
          text-align: center;
        }
        .reset-toggle-btn {
          background: #f39c12;
          border: none;
          padding: 10px 22px;
          color: white;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.3s ease;
          font-size: 1rem;
        }
        .reset-toggle-btn:hover {
          background: #d17e0a;
        }
        .reset-form {
          margin-top: 20px;
        }
        .message {
          margin-top: 15px;
          font-weight: 700;
          color: #61dafb;
        }
      `}</style>
    </div>
  );
}
