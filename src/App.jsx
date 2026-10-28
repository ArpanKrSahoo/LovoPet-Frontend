import { Routes, Route, useLocation } from "react-router-dom";

import NavBar from "./components/shared/navbar/NavBar";
import Footer from "./components/shared/Footer";
import HomePage from "./pages/HomePage";
import CTASection from "./pages/Ctasection";
import AuthPage from "./pages/AuthPage";
import AdminLogin from "./pages/AdminLogin";
import CheckEmail from "./pages/CheckEmail";
import PetShop from "./pages/PetShop";
import AnimalPharmacy from "./pages/AnimalPharmacy";
import VeterinarianApplicationPage from "./pages/VeterinarianApplicationPage";
import VendorApplicationPage from "./pages/VendorApplicationPage";
import VetLayout from "./components/layout/VetLayout";
import AdoptionPage from "./pages/AdoptionPage";
import ChatbotWidget from "./components/shared/ChatbotWidget";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith("/admin");
  const hideNavAndFooter = location.pathname === "/auth" || isAdminRoute;

  return (
    <>
      {!hideNavAndFooter && <NavBar />}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/team" element={<CTASection />} />

        {/* Customer/vendor authentication */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/checkEmail" element={<CheckEmail />} />

        {/* Admin authentication and temporary landing page */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="/pet-shop" element={<PetShop />} />
        <Route path="/adoption" element={<AdoptionPage />} />
        <Route path="/animal-pharmacy" element={<AnimalPharmacy />} />
        <Route path="/vet-apply" element={<VeterinarianApplicationPage />} />
        <Route path="/vendor-apply" element={<VendorApplicationPage />} />
        <Route path="/vet" element={<VetLayout />} />
      </Routes>

      {!hideNavAndFooter && <Footer />}

      {!isAdminRoute && <ChatbotWidget />}
    </>
  );
}

export default App;
