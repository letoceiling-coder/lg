import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { lazy, Suspense } from "react";

// Auto-reload once on ChunkLoadError (happens after new deploy while old SPA is open)
function lazyWithReload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const msg = (err as Error)?.message ?? '';
      const isChunk =
        (err as Error)?.name === 'ChunkLoadError' ||
        /Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/.test(msg);
      if (isChunk && sessionStorage.getItem('chunk_reload') !== '1') {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    })
  );
}


import { AuthProvider, useAuth, useAuthState } from "@/shared/hooks/useAuth";
import { RequireAuth } from "@/shared/components/RequireAuth";
import SeoRouteMeta from "@/shared/components/SeoRouteMeta";

// Main pages
const RedesignIndex = lazyWithReload(() => import("./redesign/pages/RedesignIndex"));
const RedesignCatalog = lazyWithReload(() => import("./redesign/pages/RedesignCatalog"));
const RedesignComplex = lazyWithReload(() => import("./redesign/pages/RedesignComplex"));
const RedesignApartment = lazyWithReload(() => import("./redesign/pages/RedesignApartment"));
const RedesignListingDetail = lazyWithReload(() => import("./redesign/pages/RedesignListingDetail"));
const RedesignMap = lazyWithReload(() => import("./redesign/pages/RedesignMap"));
const RedesignLayouts = lazyWithReload(() => import("./redesign/pages/RedesignLayouts"));

// Catalog sub-pages
const CatalogApartments = lazy(() => import("./pages/CatalogApartments"));
const Belgorod = lazy(() => import("./pages/Belgorod"));

// Detail / utility pages
const Presentation = lazyWithReload(() => import("./pages/Presentation"));
const Compare = lazy(() => import("./pages/Compare"));
const Favorites = lazyWithReload(() => import("./pages/Favorites"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AboutCompany = lazy(() => import("./pages/AboutCompany"));
const SelectionPage = lazy(() => import("./pages/SelectionPage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));
const CareerPage = lazy(() => import("./pages/CareerPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const OfferPage = lazy(() => import("./pages/OfferPage"));
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
const AdminAudit = lazy(() => import("./admin/pages/AdminAudit"));
const AdminRequests = lazy(() => import("./admin/pages/AdminRequests"));
const AdminTelegramNotify = lazy(() => import("./admin/pages/AdminTelegramNotify"));
const AdminBlocks = lazy(() => import("./admin/pages/AdminBlocks"));
const AdminBlockEditor = lazy(() => import("./admin/pages/AdminBlockEditor"));
const AdminBuilders = lazy(() => import("./admin/pages/AdminBuilders"));
const AdminBuildings = lazy(() => import("./admin/pages/AdminBuildings"));
const AdminListings = lazy(() => import("./admin/pages/AdminListings"));
const AdminSellers = lazy(() => import("./admin/pages/AdminSellers"));
const AdminManualListing = lazy(() => import("./admin/pages/AdminManualListing"));
const AdminListingWizard = lazy(() => import("./admin/pages/AdminListingWizard"));
const AdminManualHouse = lazy(() => import("./admin/pages/AdminManualHouse"));
const AdminManualLand = lazy(() => import("./admin/pages/AdminManualLand"));
const AdminManualCommercial = lazy(() => import("./admin/pages/AdminManualCommercial"));
const AdminManualParking = lazy(() => import("./admin/pages/AdminManualParking"));
const AdminFeedImport = lazy(() => import("./admin/pages/AdminFeedImport"));
const AdminNews = lazy(() => import("./admin/pages/AdminNews"));
const AdminRegions = lazy(() => import("./admin/pages/AdminRegions"));
const AdminHomepage = lazy(() => import("./admin/pages/AdminHomepage"));
const AdminReference = lazy(() => import("./admin/pages/AdminReference"));
const EditorPage = lazy(() => import("./admin/components/editor/EditorPage"));

const NotFound = lazyWithReload(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AdminIndexRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'agent') return <Navigate to="/admin/listings" replace />;
  if (user?.role === 'manager') return <Navigate to="/admin/requests" replace />;
  return <AdminDashboard />;
};

const AppRoutes = () => (
  <Routes>
    {/* Main */}
    <Route path="/" element={<RedesignIndex />} />
    <Route path="/catalog" element={<RedesignCatalog />} />
    <Route path="/catalog/apartments" element={<CatalogApartments />} />
    <Route path="/catalog/houses" element={<Navigate to="/catalog?type=houses" replace />} />
    <Route path="/catalog/land" element={<Navigate to="/catalog?type=land" replace />} />
    <Route path="/catalog/commercial" element={<Navigate to="/catalog?type=commercial" replace />} />
    <Route path="/belgorod" element={<Belgorod />} />
    <Route path="/complex/:slug" element={<RedesignComplex />} />
    <Route path="/apartment/:id" element={<RedesignApartment />} />
    <Route path="/listing/:id" element={<RedesignListingDetail />} />
    <Route path="/presentation/:slug" element={<Presentation />} />
    <Route path="/layouts/:complex" element={<RedesignLayouts />} />
    <Route path="/map" element={<RedesignMap />} />
    <Route path="/mortgage" element={<Navigate to="/catalog" replace />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
    <Route path="/contacts" element={<Contacts />} />
    <Route path="/about" element={<AboutCompany />} />
    <Route path="/selection" element={<SelectionPage />} />
    <Route path="/partners" element={<PartnersPage />} />
    <Route path="/career" element={<CareerPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/offer" element={<OfferPage />} />
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
    <Route path="/admin" element={<RequireAuth roles={['admin', 'editor', 'manager', 'agent']}><AdminLayout /></RequireAuth>}>
      <Route index element={<RequireAuth roles={['admin', 'editor', 'manager', 'agent']}><AdminIndexRedirect /></RequireAuth>} />
      <Route path="pages" element={<RequireAuth roles={['admin', 'editor']}><AdminPages /></RequireAuth>} />
      <Route path="page-editor/:slug" element={<RequireAuth roles={['admin', 'editor']}><AdminPageEditor /></RequireAuth>} />
      <Route path="requests" element={<RequireAuth roles={['admin', 'editor', 'manager']}><AdminRequests /></RequireAuth>} />
      <Route path="telegram-notify" element={<RequireAuth roles={['admin']}><AdminTelegramNotify /></RequireAuth>} />
      <Route path="audit" element={<RequireAuth roles={['admin']}><AdminAudit /></RequireAuth>} />
      <Route path="blocks" element={<RequireAuth roles={['admin', 'editor']}><AdminBlocks /></RequireAuth>} />
      <Route path="blocks/:id" element={<RequireAuth roles={['admin', 'editor']}><AdminBlockEditor /></RequireAuth>} />
      <Route path="builders" element={<RequireAuth roles={['admin', 'editor']}><AdminBuilders /></RequireAuth>} />
      <Route path="buildings" element={<RequireAuth roles={['admin', 'editor']}><AdminBuildings /></RequireAuth>} />
      <Route path="listings" element={<AdminListings />} />
      <Route path="sellers" element={<RequireAuth roles={['admin', 'editor', 'manager', 'agent']}><AdminSellers /></RequireAuth>} />
      <Route path="listings/wizard/new" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminListingWizard /></RequireAuth>} />
      <Route path="listings/manual/new" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualListing /></RequireAuth>} />
      <Route path="listings/manual/:listingId/edit" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualListing /></RequireAuth>} />
      <Route path="listings/manual-house/new" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualHouse /></RequireAuth>} />
      <Route path="listings/manual-house/:listingId/edit" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualHouse /></RequireAuth>} />
      <Route path="listings/manual-land/new" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualLand /></RequireAuth>} />
      <Route path="listings/manual-land/:listingId/edit" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualLand /></RequireAuth>} />
      <Route path="listings/manual-commercial/new" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualCommercial /></RequireAuth>} />
      <Route path="listings/manual-commercial/:listingId/edit" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualCommercial /></RequireAuth>} />
      <Route path="listings/manual-parking/new" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualParking /></RequireAuth>} />
      <Route path="listings/manual-parking/:listingId/edit" element={<RequireAuth roles={['admin', 'editor', 'agent']}><AdminManualParking /></RequireAuth>} />
      <Route path="feed-import" element={<RequireAuth roles={['admin', 'editor']}><AdminFeedImport /></RequireAuth>} />
      <Route path="news" element={<RequireAuth roles={['admin', 'editor']}><AdminNews /></RequireAuth>} />
      <Route path="regions" element={<RequireAuth roles={['admin', 'editor']}><AdminRegions /></RequireAuth>} />
      <Route path="reference" element={<RequireAuth roles={['admin', 'editor']}><AdminReference /></RequireAuth>} />
      <Route path="homepage" element={<RequireAuth roles={['admin', 'editor']}><AdminHomepage /></RequireAuth>} />
      <Route path="media" element={<RequireAuth roles={['admin', 'editor']}><AdminMedia /></RequireAuth>} />
      <Route path="users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
      <Route path="settings" element={<RequireAuth roles={['admin', 'editor']}><AdminSettings /></RequireAuth>} />
      <Route path="tokens" element={<RequireAuth roles={['admin']}><AdminTokens /></RequireAuth>} />
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
        <SeoRouteMeta />
        <Suspense fallback={<Loading />}>
          <AppWithAuth />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
