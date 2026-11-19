import { lazy, Suspense } from 'react';
import { useLocale } from './localization/useLocale';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/ToastContainer';
import { WorkspacePage } from './modules/workspace/WorkspacePage';
import { UsersPage } from './modules/users/UsersPage';
import { UserFormPage } from './modules/users/UserFormPage';
import { InvitationsPage, AcceptInvitationPage } from './modules/users/InvitationsPage';
import { RolesPage } from './modules/users/RolesPage';
import { SystemLogsPage } from './modules/users/SystemLogsPage';
import { UserDetailsPage } from './modules/users/UserDetailsPage';
import { LeadsPage } from './modules/leads/LeadsPage';
import { CustomersPage } from './modules/customers/CustomersPage';
import { SuppliersPage } from './modules/suppliers/SuppliersPage';
import { CrmFormPage } from './modules/crm/CrmFormPage';
import { ConvertLeadPage } from './modules/leads/ConvertLeadPage';
import { ToastProvider } from './contexts/ToastProvider';
import { AuthProvider } from './modules/auth/AuthProvider';
import { BrandingProvider } from './modules/settings/BrandingProvider';
import { SettingsPage } from './modules/settings/SettingsPage';
import { NotificationsProvider } from './modules/notifications/NotificationsProvider';
import { NotificationsPage } from './modules/notifications/NotificationsPage';
import { ActivityLogPage } from './modules/audit/ActivityLogModal';
import { LocaleProvider } from './localization/LocaleProvider';

const CataloguePage = lazy(() =>
  import('./modules/catalogue/CataloguePage').then((module) => ({ default: module.CataloguePage })),
);
const EmailsPage = lazy(() =>
  import('./modules/emails/EmailsPage').then((module) => ({ default: module.EmailsPage })),
);
const InboxPage = lazy(() =>
  import('./modules/inbox/InboxPage').then((module) => ({ default: module.InboxPage })),
);
const BookingsPage = lazy(() =>
  import('./modules/bookings/BookingsPage').then((module) => ({ default: module.BookingsPage })),
);
const NewBookingPage = lazy(() =>
  import('./modules/bookings/BookingsPage').then((module) => ({ default: module.NewBookingPage })),
);
const BookingDetailsPage = lazy(() =>
  import('./modules/bookings/BookingsPage').then((module) => ({
    default: module.BookingDetailsPage,
  })),
);
const QuotationsPage = lazy(() =>
  import('./modules/quotations/QuotationsPage').then((module) => ({
    default: module.QuotationsPage,
  })),
);
const QuotationEditorPage = lazy(() =>
  import('./modules/quotations/QuotationEditorPage').then((module) => ({
    default: module.QuotationEditorPage,
  })),
);
const QuotationDetailsPage = lazy(() =>
  import('./modules/quotations/QuotationDetailsPage').then((module) => ({
    default: module.QuotationDetailsPage,
  })),
);
const PublicQuotationPage = lazy(() =>
  import('./modules/quotations/PublicQuotationPage').then((module) => ({
    default: module.PublicQuotationPage,
  })),
);

const LoginPage = lazy(() =>
  import('./modules/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const Dashboard = lazy(() =>
  import('./modules/dashboard/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const FinancePage = lazy(() =>
  import('./modules/finance/FinancePage').then((module) => ({ default: module.FinancePage })),
);
const FinancialReportsPage = lazy(() =>
  import('./modules/finance/FinancialReportsPage').then((module) => ({
    default: module.FinancialReportsPage,
  })),
);
const InvoicesPage = lazy(() =>
  import('./modules/finance/InvoicesPage').then((module) => ({ default: module.InvoicesPage })),
);
const RecordPaymentPage = lazy(() =>
  import('./modules/finance/RecordPaymentPage').then((module) => ({
    default: module.RecordPaymentPage,
  })),
);
const IssueInvoicePage = lazy(() =>
  import('./modules/finance/IssueInvoicePage').then((module) => ({
    default: module.IssueInvoicePage,
  })),
);
const SupplierInvoicePage = lazy(() =>
  import('./modules/finance/SupplierInvoicePage').then((module) => ({
    default: module.SupplierInvoicePage,
  })),
);
const ViewPaymentPage = lazy(() =>
  import('./modules/finance/ViewPaymentPage').then((module) => ({
    default: module.ViewPaymentPage,
  })),
);
const InvoiceDetailsPage = lazy(() =>
  import('./modules/finance/InvoiceDetailsPage').then((module) => ({
    default: module.InvoiceDetailsPage,
  })),
);

function RouteLoading() {
  const { t } = useLocale();
  return (
    <p role="status" className="p-6 text-gray-600 dark:text-gray-300">
      {t('common.loading')}
    </p>
  );
}

function App() {
  return (
    <LocaleProvider>
      <BrandingProvider>
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>
              <BrowserRouter>
                <Suspense fallback={<RouteLoading />}>
                  <Routes>
                    <Route path="/q/:shareId" element={<PublicQuotationPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/invitation/:token" element={<AcceptInvitationPage />} />
                    <Route
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/activity" element={<ActivityLogPage />} />
                      <Route path="/emails" element={<EmailsPage />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/bookings" element={<BookingsPage />} />
                      <Route path="/bookings/new" element={<NewBookingPage />} />
                      <Route path="/bookings/:id" element={<BookingDetailsPage />} />
                      <Route path="/quotations" element={<QuotationsPage />} />
                      <Route path="/quotations/new" element={<QuotationEditorPage />} />
                      <Route path="/quotations/:id/edit" element={<QuotationEditorPage />} />
                      <Route path="/quotations/:id" element={<QuotationDetailsPage />} />
                      <Route path="/catalogue/:kind" element={<CataloguePage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/leads" element={<LeadsPage key="all-leads" />} />
                      <Route
                        path="/leads/overdue"
                        element={<LeadsPage key="overdue-leads" overdue />}
                      />
                      <Route path="/leads/new" element={<CrmFormPage kind="leads" />} />
                      <Route path="/leads/:id" element={<CrmFormPage kind="leads" readOnly />} />
                      <Route path="/leads/:id/edit" element={<CrmFormPage kind="leads" />} />
                      <Route path="/leads/:id/convert" element={<ConvertLeadPage />} />
                      <Route path="/customers" element={<CustomersPage key="all-customers" />} />
                      <Route
                        path="/customers/corporate"
                        element={<CustomersPage key="corporate" corporate />}
                      />
                      <Route path="/customers/new" element={<CrmFormPage kind="customers" />} />
                      <Route
                        path="/customers/:id"
                        element={<CrmFormPage kind="customers" readOnly />}
                      />
                      <Route
                        path="/customers/:id/edit"
                        element={<CrmFormPage kind="customers" />}
                      />
                      <Route path="/suppliers" element={<SuppliersPage />} />
                      <Route path="/suppliers/new" element={<CrmFormPage kind="suppliers" />} />
                      <Route
                        path="/suppliers/:id"
                        element={<CrmFormPage kind="suppliers" readOnly />}
                      />
                      <Route
                        path="/suppliers/:id/edit"
                        element={<CrmFormPage kind="suppliers" />}
                      />
                      <Route path="/users" element={<UsersPage />} />
                      <Route path="/users/new" element={<UserFormPage />} />
                      <Route path="/users/invite" element={<InvitationsPage />} />
                      <Route path="/users/roles" element={<RolesPage />} />
                      <Route path="/users/logs" element={<SystemLogsPage />} />
                      <Route path="/users/view" element={<UserDetailsPage />} />
                      <Route path="/users/:id" element={<UserDetailsPage />} />
                      <Route path="/users/:id/edit" element={<UserFormPage />} />
                      <Route path="/finance" element={<FinancePage />} />
                      <Route path="/finance/reports" element={<FinancialReportsPage />} />
                      <Route path="/finance/invoices" element={<InvoicesPage />} />
                      <Route path="/finance/invoices/:id" element={<InvoiceDetailsPage />} />
                      <Route path="/finance/record-payment" element={<RecordPaymentPage />} />
                      <Route path="/finance/issue-invoice" element={<IssueInvoicePage />} />
                      <Route path="/finance/supplier-invoice" element={<SupplierInvoicePage />} />
                      <Route path="/finance/bookings/:id" element={<ViewPaymentPage />} />
                      <Route path="/finance/view-payment" element={<ViewPaymentPage />} />
                      <Route path="*" element={<WorkspacePage notFound />} />
                    </Route>
                  </Routes>
                </Suspense>
                <ToastContainer />
              </BrowserRouter>
            </ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrandingProvider>
    </LocaleProvider>
  );
}

export default App;
