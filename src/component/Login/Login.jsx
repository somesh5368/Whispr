import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        // Mock authentication logic
        if (username && password) {
            navigate('/main'); // Redirect to main components
        } else {
            alert('Please enter valid credentials!');
        }
    };

    return (
        <div
            className="min-h-[100vh] flex justify-center items-center bg-[#f8f9fa] border-2 border-black "
        >
            <div className="p-5 bg-white shadow-lg rounded-md w-[300px] text-center">
                <h2 className="text-2xl mb-5 font-bold">Login</h2>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full mb-3 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full mb-3 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                />
                <button
                    onClick={handleLogin}
                    className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 transition duration-300"
                >
                    Login
                </button>
                <p className="mt-3 text-sm">
                    Don’t have credentials?{' '}
                    <a
                        href="/main"
                        className="text-blue-500 underline cursor-pointer hover:text-blue-700"
                    >
                        Skip login and explore
                    </a>
                </p>
            </div>
        </div>
    );
}

export default Login;