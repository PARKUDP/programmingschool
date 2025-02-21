import { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:5050/health')
      .then((res) => res.json())
      .then((data) => setMessage(data.status))
      .catch((err) => console.error('API Error:', err));
  }, []);

  return (
    <div>
      <h1>Hello, React + Flask!</h1>
      <p>Flask API Status: {message}</p>
    </div>
  );
}

export default App;
