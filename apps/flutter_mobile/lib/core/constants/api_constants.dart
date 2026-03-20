import 'package:flutter/foundation.dart';

class ApiConstants {
  static String get baseUrl => kReleaseMode ? 'https://api.kontafy.com' : 'https://api.kontafy.com';
  static const timeout = Duration(seconds: 15);
}

class Endpoints {
  static const login = '/auth/login';
  static const signup = '/auth/signup';
  static const me = '/auth/me';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';
  static const profile = '/profile';
  static const profilePassword = '/profile/password';
  static const dashboardStats = '/dashboard/stats';
  static const invoices = '/bill/invoices';
  static const contacts = '/bill/contacts';
  static const payments = '/bill/payments';
  static const purchases = '/bill/purchases';
  static const quotations = '/bill/quotations';
  static const purchaseOrders = '/bill/purchase-orders';
  static const creditNotes = '/bill/credit-notes';
  static const debitNotes = '/bill/debit-notes';
  static const recurring = '/bill/recurring';
  static const proforma = '/bill/proforma-invoices';
  static const deliveryChallans = '/bill/delivery-challans';
  static const products = '/stock/products';
  static const warehouses = '/stock/warehouses';
  static const movements = '/stock/movements';
  static const adjustments = '/stock/adjustments';
  static const accounts = '/books/accounts';
  static const journal = '/books/journal';
  static const ledger = '/books/ledger';
  static const reports = '/reports';
  static const bankAccounts = '/bank/accounts';
  static const reconciliation = '/bank/reconciliation';
  static const gst = '/tax/gst';
  static const tds = '/tax/tds';
  static const einvoice = '/einvoice';
  static const budget = '/budget';
  static const expenses = '/bill/expenses';
  static const settingsOrg = '/settings/organization';
  static const settingsEmail = '/settings/email';
  static const settingsTeam = '/settings/users';
  static const settingsInvoice = '/settings/invoice-config';
  static const settingsTax = '/settings/tax';
}
