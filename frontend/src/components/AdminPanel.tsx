import React, { useState } from 'react';
import axios from 'axios';

interface User {
  name: string;
  email: string;
  password: string;
}

const AdminPanel: React.FC = () => {
  const [user, setUser] = useState<User>({ name: '', email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const createUser = async () => {
    try {
      const response = await axios.post('/api/admin/user', user);
      console.log(response.data);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <div>
      <h1>Admin Panel</h1>
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={user.name}
        onChange={handleChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={user.email}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={user.password}
        onChange={handleChange}
      />
      <button onClick={createUser}>Create User</button>
    </div>
  );
};

export default AdminPanel;
