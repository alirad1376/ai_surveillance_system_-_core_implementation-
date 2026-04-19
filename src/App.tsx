import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { LanguageProvider } from "./i18n/LanguageContext";

export default function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gray-50">
        <Authenticated>
          <Dashboard />
        </Authenticated>
        
        <Unauthenticated>
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full mx-auto p-6">
              <SignInForm />
            </div>
          </div>
        </Unauthenticated>
        
        <Toaster />
      </div>
    </LanguageProvider>
  );
}
