import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import ToolPage from "./pages/ToolPage";
import Research from "./pages/Research";
import SelfTest from "./pages/SelfTest";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  return (
    <div className="paper-grain selection-brass min-h-screen bg-ink-950 text-paper-100">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/research" element={<Research />} />
        <Route path="/self-test" element={<SelfTest />} />
        <Route path="/:toolSlug" element={<ToolPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
