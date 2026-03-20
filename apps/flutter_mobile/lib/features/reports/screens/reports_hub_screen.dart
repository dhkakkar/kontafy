import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';

class _ReportItem {
  final IconData icon;
  final String title;
  final String description;
  final String route;
  final Color color;

  const _ReportItem({
    required this.icon,
    required this.title,
    required this.description,
    required this.route,
    required this.color,
  });
}

class _ReportCategory {
  final String title;
  final List<_ReportItem> items;

  const _ReportCategory({required this.title, required this.items});
}

const _categories = [
  _ReportCategory(
    title: 'Financial',
    items: [
      _ReportItem(
        icon: Icons.balance_outlined,
        title: 'Trial Balance',
        description: 'Debit & credit balances of all accounts',
        route: '/reports/trial-balance',
        color: AppColors.navy,
      ),
      _ReportItem(
        icon: Icons.trending_up_outlined,
        title: 'Profit & Loss',
        description: 'Income vs expenses for a period',
        route: '/reports/profit-loss',
        color: AppColors.green,
      ),
      _ReportItem(
        icon: Icons.account_balance_outlined,
        title: 'Balance Sheet',
        description: 'Assets, liabilities & equity snapshot',
        route: '/reports/balance-sheet',
        color: AppColors.blue,
      ),
      _ReportItem(
        icon: Icons.water_drop_outlined,
        title: 'Cash Flow',
        description: 'Cash inflows & outflows by activity',
        route: '/reports/cash-flow',
        color: AppColors.purple,
      ),
    ],
  ),
  _ReportCategory(
    title: 'Books',
    items: [
      _ReportItem(
        icon: Icons.menu_book_outlined,
        title: 'General Ledger',
        description: 'All transactions by account',
        route: '/reports/general-ledger',
        color: AppColors.navy,
      ),
      _ReportItem(
        icon: Icons.calendar_today_outlined,
        title: 'Day Book',
        description: 'All journal entries by date',
        route: '/reports/day-book',
        color: AppColors.amber,
      ),
    ],
  ),
  _ReportCategory(
    title: 'Receivables & Payables',
    items: [
      _ReportItem(
        icon: Icons.arrow_downward_outlined,
        title: 'Receivable Aging',
        description: 'Outstanding customer invoices by age',
        route: '/reports/receivable-aging',
        color: AppColors.green,
      ),
      _ReportItem(
        icon: Icons.arrow_upward_outlined,
        title: 'Payable Aging',
        description: 'Outstanding supplier bills by age',
        route: '/reports/payable-aging',
        color: AppColors.red,
      ),
    ],
  ),
  _ReportCategory(
    title: 'Sales & Purchase',
    items: [
      _ReportItem(
        icon: Icons.point_of_sale_outlined,
        title: 'Sales Register',
        description: 'All sales invoices for a period',
        route: '/reports/sales-register',
        color: AppColors.green,
      ),
      _ReportItem(
        icon: Icons.shopping_cart_outlined,
        title: 'Purchase Register',
        description: 'All purchase bills for a period',
        route: '/reports/purchase-register',
        color: AppColors.blue,
      ),
    ],
  ),
  _ReportCategory(
    title: 'Inventory',
    items: [
      _ReportItem(
        icon: Icons.inventory_2_outlined,
        title: 'Stock Summary',
        description: 'Current stock levels & valuation',
        route: '/reports/stock-summary',
        color: AppColors.purple,
      ),
      _ReportItem(
        icon: Icons.swap_horiz_outlined,
        title: 'Stock Movement',
        description: 'Inward & outward stock activity',
        route: '/reports/stock-movement',
        color: AppColors.amber,
      ),
    ],
  ),
  _ReportCategory(
    title: 'Tax',
    items: [
      _ReportItem(
        icon: Icons.receipt_long_outlined,
        title: 'GST Summary',
        description: 'GST collected & paid summary',
        route: '/reports/gst-summary',
        color: AppColors.navy,
      ),
      _ReportItem(
        icon: Icons.percent_outlined,
        title: 'TDS Summary',
        description: 'TDS deducted & deposited summary',
        route: '/reports/tds-summary',
        color: AppColors.red,
      ),
    ],
  ),
];

class ReportsHubScreen extends StatelessWidget {
  const ReportsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: _categories.map((category) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 8, top: 8),
                child: Text(
                  category.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.muted,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.5,
                children: category.items.map((item) {
                  return _ReportCard(item: item);
                }).toList(),
              ),
              const SizedBox(height: 8),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final _ReportItem item;

  const _ReportCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(item.route),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: item.color,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: item.color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(item.icon, size: 18, color: item.color),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.ink,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.description,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
