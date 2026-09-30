import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { btnPrimary } from "../components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <p className="font-serif text-7xl font-bold text-brass-400">404</p>
        <h1 className="mt-4 font-serif text-2xl font-bold text-paper-50">Page not found</h1>
        <p className="mt-2 text-sm text-ink-300">
          This page doesn't exist — but your files never left your device, so nothing to worry about.
        </p>
        <Link to="/" className={btnPrimary + " mt-8"}>Back to the workshop</Link>
      </main>
      <Footer />
    </div>
  );
}
