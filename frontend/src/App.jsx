import './App.css'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'; 
import RegisterPage from './pages/RegisterPage.jsx'; 
import ChatPage from './pages/ChatPage.jsx'; 
import ProtectedRoute from './components/ProtectedRoute.jsx'; 
import { Toaster } from 'react-hot-toast'; 

function App() {
  return (
    <div className="App">
      <Toaster 
        position="top-center" // Where notifications appear
        reverseOrder={false}  // Display order
      />

      <Routes>
        <Route 
          path="/" 
          element={ <ProtectedRoute> <ChatPage /> </ProtectedRoute> } 
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  )
}

export default App