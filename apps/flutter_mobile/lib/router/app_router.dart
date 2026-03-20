import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/models/auth_state.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/signup_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/invoices/screens/invoice_list_screen.dart';
import '../features/contacts/screens/contact_list_screen.dart';
import '../features/payments/screens/payments_screen.dart';
import '../features/inventory/screens/product_list_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/settings/screens/settings_hub_screen.dart';
import '../features/more/screens/more_screen.dart';
// Phase 2: Purchases
import '../features/purchases/screens/purchase_list_screen.dart';
import '../features/purchases/screens/purchase_form_screen.dart';
// Phase 2: Quotations
import '../features/quotations/screens/quotation_list_screen.dart';
import '../features/quotations/screens/quotation_detail_screen.dart';
import '../features/quotations/screens/quotation_form_screen.dart';
// Phase 2: Purchase Orders
import '../features/purchase_orders/screens/purchase_order_list_screen.dart';
import '../features/purchase_orders/screens/purchase_order_detail_screen.dart';
// Phase 2: Credit & Debit Notes
import '../features/credit_notes/screens/credit_note_list_screen.dart';
import '../features/debit_notes/screens/debit_note_list_screen.dart';
// Phase 2: Expenses
import '../features/expenses/screens/expense_list_screen.dart';
// Phase 2: Books
import '../features/books/screens/chart_of_accounts_screen.dart';
import '../features/books/screens/journal_list_screen.dart';
import '../features/books/screens/journal_form_screen.dart';
import '../features/books/screens/ledger_screen.dart';
// Phase 2: Reports
import '../features/reports/screens/reports_hub_screen.dart';
import '../features/reports/screens/trial_balance_screen.dart';
import '../features/reports/screens/profit_loss_screen.dart';
import '../features/reports/screens/balance_sheet_screen.dart';
import '../features/reports/screens/cash_flow_screen.dart';
import '../features/reports/screens/general_ledger_screen.dart';
import '../features/reports/screens/day_book_screen.dart';
import '../features/reports/screens/receivable_aging_screen.dart';
import '../features/reports/screens/payable_aging_screen.dart';
import '../features/reports/screens/sales_register_screen.dart';
import '../features/reports/screens/purchase_register_screen.dart';
import '../features/reports/screens/stock_summary_screen.dart';
import '../features/reports/screens/stock_movement_screen.dart';
import '../features/reports/screens/gst_summary_screen.dart';
import '../features/reports/screens/tds_summary_screen.dart';
// Phase 3: Proforma, Delivery Challans, Recurring
import '../features/proforma/screens/proforma_list_screen.dart';
import '../features/delivery_challans/screens/delivery_challan_list_screen.dart';
import '../features/recurring/screens/recurring_list_screen.dart';
import '../features/recurring/screens/recurring_detail_screen.dart';
// Phase 3: Banking
import '../features/banking/screens/bank_accounts_screen.dart';
import '../features/banking/screens/bank_account_detail_screen.dart';
import '../features/banking/screens/bank_reconciliation_screen.dart';
// Phase 3: Tax & E-Invoice
import '../features/tax/screens/tax_dashboard_screen.dart';
import '../features/tax/screens/gst_returns_screen.dart';
import '../features/tax/screens/tds_screen.dart';
import '../features/einvoice/screens/einvoice_dashboard_screen.dart';
// Phase 3: Budgets & Branches
import '../features/budgets/screens/budget_list_screen.dart';
import '../features/branches/screens/branch_list_screen.dart';
// Phase 3: Commerce, WhatsApp, AI Insights, CA Portal
import '../features/commerce/screens/commerce_screen.dart';
import '../features/whatsapp/screens/whatsapp_screen.dart';
import '../features/insights/screens/insights_screen.dart';
import '../features/ca_portal/screens/ca_portal_screen.dart';
import '../core/widgets/kontafy_scaffold.dart';
// Settings sub-pages
import '../features/settings/screens/settings_org_screen.dart';
import '../features/settings/screens/settings_team_screen.dart';
import '../features/settings/screens/settings_email_screen.dart';
import '../features/settings/screens/settings_tax_screen.dart';
import '../features/settings/screens/settings_invoice_screen.dart';
import '../features/settings/screens/settings_audit_log_screen.dart';
// Billing
import '../features/billing/screens/billing_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    redirect: (context, state) {
      final isAuth = auth.status == AuthStatus.authenticated;
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';

      if (auth.status == AuthStatus.unknown) return null;
      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/';
      return null;
    },
    routes: [
      // Auth routes (no shell)
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),

      // Full-screen form routes (no bottom nav / drawer)
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/purchases/new',
        builder: (_, __) => const PurchaseFormScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/quotations/new',
        builder: (_, __) => const QuotationFormScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/books/journal/new',
        builder: (_, __) => const JournalFormScreen(),
      ),

      // Shell routes (with bottom nav + drawer)
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => KontafyScaffold(child: child),
        routes: [
          // Core
          GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/invoices', builder: (_, __) => const InvoiceListScreen()),
          GoRoute(path: '/contacts', builder: (_, __) => const ContactListScreen()),
          GoRoute(path: '/payments', builder: (_, __) => const PaymentsScreen()),
          GoRoute(path: '/products', builder: (_, __) => const ProductListScreen()),
          GoRoute(path: '/more', builder: (_, __) => const MoreScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsHubScreen()),
          GoRoute(path: '/settings/organization', builder: (_, __) => const SettingsOrgScreen()),
          GoRoute(path: '/settings/email', builder: (_, __) => const SettingsEmailScreen()),
          GoRoute(path: '/settings/team', builder: (_, __) => const SettingsTeamScreen()),
          GoRoute(path: '/settings/tax', builder: (_, __) => const SettingsTaxScreen()),
          GoRoute(path: '/settings/invoice', builder: (_, __) => const SettingsInvoiceScreen()),
          GoRoute(path: '/settings/audit-log', builder: (_, __) => const SettingsAuditLogScreen()),
          GoRoute(path: '/billing', builder: (_, __) => const BillingScreen()),

          // Purchases
          GoRoute(path: '/purchases', builder: (_, __) => const PurchaseListScreen()),

          // Quotations
          GoRoute(path: '/quotations', builder: (_, __) => const QuotationListScreen()),
          GoRoute(
            path: '/quotations/:id',
            builder: (_, state) => QuotationDetailScreen(
              quotationId: state.pathParameters['id']!,
            ),
          ),

          // Purchase Orders
          GoRoute(path: '/purchase-orders', builder: (_, __) => const PurchaseOrderListScreen()),
          GoRoute(
            path: '/purchase-orders/:id',
            builder: (_, state) => PurchaseOrderDetailScreen(
              id: state.pathParameters['id']!,
            ),
          ),

          // Credit & Debit Notes
          GoRoute(path: '/credit-notes', builder: (_, __) => const CreditNoteListScreen()),
          GoRoute(path: '/debit-notes', builder: (_, __) => const DebitNoteListScreen()),

          // Expenses
          GoRoute(path: '/expenses', builder: (_, __) => const ExpenseListScreen()),

          // Books
          GoRoute(path: '/books/accounts', builder: (_, __) => const ChartOfAccountsScreen()),
          GoRoute(path: '/books/journal', builder: (_, __) => const JournalListScreen()),
          GoRoute(path: '/books/ledger', builder: (_, __) => const LedgerScreen()),

          // Reports
          GoRoute(path: '/reports', builder: (_, __) => const ReportsHubScreen()),
          GoRoute(path: '/reports/trial-balance', builder: (_, __) => const TrialBalanceScreen()),
          GoRoute(path: '/reports/profit-loss', builder: (_, __) => const ProfitLossScreen()),
          GoRoute(path: '/reports/balance-sheet', builder: (_, __) => const BalanceSheetScreen()),
          GoRoute(path: '/reports/cash-flow', builder: (_, __) => const CashFlowScreen()),
          GoRoute(path: '/reports/general-ledger', builder: (_, __) => const GeneralLedgerScreen()),
          GoRoute(path: '/reports/day-book', builder: (_, __) => const DayBookScreen()),
          GoRoute(path: '/reports/receivable-aging', builder: (_, __) => const ReceivableAgingScreen()),
          GoRoute(path: '/reports/payable-aging', builder: (_, __) => const PayableAgingScreen()),
          GoRoute(path: '/reports/sales-register', builder: (_, __) => const SalesRegisterScreen()),
          GoRoute(path: '/reports/purchase-register', builder: (_, __) => const PurchaseRegisterScreen()),
          GoRoute(path: '/reports/stock-summary', builder: (_, __) => const StockSummaryScreen()),
          GoRoute(path: '/reports/stock-movement', builder: (_, __) => const StockMovementScreen()),
          GoRoute(path: '/reports/gst-summary', builder: (_, __) => const GstSummaryScreen()),
          GoRoute(path: '/reports/tds-summary', builder: (_, __) => const TdsSummaryScreen()),

          // Proforma & Delivery Challans
          GoRoute(path: '/proforma', builder: (_, __) => const ProformaListScreen()),
          GoRoute(path: '/delivery-challans', builder: (_, __) => const DeliveryChallanListScreen()),

          // Recurring Invoices
          GoRoute(path: '/recurring', builder: (_, __) => const RecurringListScreen()),
          GoRoute(
            path: '/recurring/:id',
            builder: (_, state) => RecurringDetailScreen(
              id: state.pathParameters['id']!,
            ),
          ),

          // Banking
          GoRoute(path: '/banking/accounts', builder: (_, __) => const BankAccountsScreen()),
          GoRoute(
            path: '/banking/accounts/:id',
            builder: (_, state) => BankAccountDetailScreen(
              id: state.pathParameters['id']!,
            ),
          ),
          GoRoute(path: '/banking/reconciliation', builder: (_, __) => const BankReconciliationScreen()),

          // Tax & GST
          GoRoute(path: '/tax/gst', builder: (_, __) => const TaxDashboardScreen()),
          GoRoute(path: '/tax/gst/returns', builder: (_, __) => const GstReturnsScreen()),
          GoRoute(path: '/tax/tds', builder: (_, __) => const TdsScreen()),

          // E-Invoice
          GoRoute(path: '/einvoice/generate', builder: (_, __) => const EInvoiceDashboardScreen()),

          // Budgets & Branches
          GoRoute(path: '/budgets', builder: (_, __) => const BudgetListScreen()),
          GoRoute(path: '/branches', builder: (_, __) => const BranchListScreen()),

          // Commerce, WhatsApp, AI Insights, CA Portal
          GoRoute(path: '/ecommerce', builder: (_, __) => const CommerceScreen()),
          GoRoute(path: '/whatsapp', builder: (_, __) => const WhatsAppScreen()),
          GoRoute(path: '/ai', builder: (_, __) => const InsightsScreen()),
          GoRoute(path: '/ca-portal', builder: (_, __) => const CaPortalScreen()),
        ],
      ),
    ],
  );
});
