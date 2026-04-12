import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuthState } from "@/shared/hooks/useAuth";
import { RequireAuth } from "@/shared/components/RequireAuth";

// Main pages
const RedesignIndex = lazy(() => import("./redesign/pages/RedesignIndex"));
const RedesignCatalog = lazy(() => import("./redesign/pages/RedesignCatalog"));
const RedesignComplex = lazy(() => import("./redesign/pages/RedesignComplex"));
const RedesignApartment = lazy(() => import("./redesign/pages/RedesignApartment"));
const RedesignMap = lazy(() => import("./redesign/pages/RedesignMap"));
const RedesignLayouts = lazy(() => import("./redesign/pages/RedesignLayouts"));

// Catalog sub-pages
const CatalogApartments = lazy(() => import("./pages/CatalogApartments"));
const CatalogHouses = lazy(() => import("./pages/CatalogHouses"));
const CatalogLand = lazy(() => import("./pages/CatalogLand"));
const CatalogCommercial = lazy(() => import("./pages/CatalogCommercial"));
const Belgorod = lazy(() => import("./pages/Belgorod"));

// Detail / utility pages
const Presentation = lazy(() => import("./pages/Presentation"));
const Mortgage = lazy(() => import("./pages/Mortgage"));
const Compare = lazy(() => import("./pages/Compare"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Profile = lazy(() => import("./pages/Profile"));

// Auth
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// News
const News = lazy(() => import("./pages/News"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));

// Admin
const AdminLayout = lazy(() => import("./admin/layout/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const AdminPages = lazy(() => import("./admin/pages/AdminPages"));
const AdminPageEditor = lazy(() => import("./admin/pages/AdminPageEditor"));
const AdminMedia = lazy(() => import("./admin/pages/AdminMedia"));
const AdminUsers = lazy(() => import("./admin/pages/AdminUsers"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings"));
const AdminTokens = lazy(() => import("./admin/pages/AdminTokens"));
const AdminDocs = lazy(() => import("./admin/pages/AdminDocs"));
const AdminRequests = lazy(() => import("./admin/pages/AdminRequests"));
const AdminBlocks = lazy(() => import("./admin/pages/AdminBlocks"));
const AdminBlockEditor = lazy(() => import("./admin/pages/AdminBlockEditor"));
const AdminListings = lazy(() => import("./admin/pages/AdminListings"));
const AdminManualListing = lazy(() => import("./admin/pages/AdminManualListing"));
const AdminFeedImport = lazy(() => import("./admin/pages/AdminFeedImport"));
const AdminNews = lazy(() => import("./admin/pages/AdminNews"));
const AdminRegions = lazy(() => import("./admin/pages/AdminRegions"));
const AdminHomepage = lazy(() => import("./admin/pages/AdminHomepage"));
const EditorPage = lazy(() => import("./admin/components/editor/EditorPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => (
  <Routes>
    {/* Main */}
    <Route path="/" element={<RedesignIndex />} />
    <Route path="/catalog" element={<RedesignCatalog />} />
    <Route path="/catalog/apartments" element={<CatalogApartments />} />
    <Route path="/catalog/houses" element={<CatalogHouses />} />
    <Route path="/catalog/land" element={<CatalogLand />} />
    <Route path="/catalog/commercial" element={<CatalogCommercial />} />
    <Route path="/belgorod" element={<Belgorod />} />
    <Route path="/complex/:slug" element={<RedesignComplex />} />
    <Route path="/apartment/:id" element={<RedesignApartment />} />
    <Route path="/presentation/:slug" element={<Presentation />} />
    <Route path="/layouts/:complex" element={<RedesignLayouts />} />
    <Route path="/map" element={<RedesignMap />} />
    <Route path="/mortgage" element={<Mortgage />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
    <Route path="/contacts" element={<Contacts />} />
    <Route path="/privacy" element={<Privacy />} />

    {/* Auth */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

    {/* News */}
    <Route path="/news" element={<News />} />
    <Route path="/news/:slug" element={<NewsDetail />} />

    {/* Admin — protected, requires editor+ role */}
    <Route path="/admin" element={<RequireAuth roles={['admin', 'editor', 'manager']}><AdminLayout /></RequireAuth>}>
      <Route index element={<AdminDashboard />} />
      <Route path="pages" element={<AdminPages />} />
      <Route path="page-editor/:slug" element={<AdminPageEditor />} />
      <Route path="requests" element={<AdminRequests />} />
      <Route path="blocks" element={<AdminBlocks />} />
      <Route path="blocks/:id" element={<AdminBlockEditor />} />
      <Route path="listings" element={<AdminListings />} />
      <Route path="listings/manual/new" element={<AdminManualListing />} />
      <Route path="listings/manual/:listingId/edit" element={<AdminManualListing />} />
      <Route path="feed-import" element={<AdminFeedImport />} />
      <Route path="news" element={<AdminNews />} />
      <Route path="regions" element={<AdminRegions />} />
      <Route path="homepage" element={<AdminHomepage />} />
      <Route path="media" element={<AdminMedia />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="tokens" element={<AdminTokens />} />
      <Route path="docs" element={<AdminDocs />} />
    </Route>
    <Route path="/admin/editor/:pageId" element={<RequireAuth roles={['admin', 'editor']}><EditorPage /></RequireAuth>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const AppWithAuth = () => {
  const authState = useAuthState();
  return (
    <AuthProvider value={authState}>
      <AppRoutes />
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <AppWithAuth />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
