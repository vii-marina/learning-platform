import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  AdminPage,
  DashboardPage,
  LandingPage,
  LoginPage,
  RegisterPage,
} from "../pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
