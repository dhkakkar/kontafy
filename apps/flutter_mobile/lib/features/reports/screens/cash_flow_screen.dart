import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

DateTime _fyStart() {
  final now = DateTime.now();
  return now.month >= 4 ? DateTime(now.year, 4, 1) : DateTime(now.year - 1, 4, 1);
}

DateTime _fyEnd() {
  final now = DateTime.now();
  return now.month >= 4 ? DateTime(now.year + 1, 3, 31) : DateTime(now.year, 3, 31);
}

class CashFlowScreen extends ConsumerStatefulWidget {
  const CashFlowScreen({super.key});

  @override
  ConsumerState<CashFlowScreen> createState() => _CashFlowScreenState();
}

class _CashFlowScreenState extends ConsumerState<CashFlowScreen> {
  DateTime _startDate = _fyStart();
  DateTime _endDate = _fyEnd();
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> _operatingItems = [];
  List<Map<String, dynamic>> _investingItems = [];
  List<Map<String, dynamic>> _financingItems = [];
  num _operatingNet = 0;
  num _investingNet = 0;
  num _financingNet = 0;
  num _openingBalance = 0;
  num _netChange = 0;
  num _closingBalance = 0;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get(
        '/books/reports/cash-flow',
        queryParameters: {
          'start_date': DateFormat('yyyy-MM-dd').format(_startDate),
          'end_date': DateFormat('yyyy-MM-dd').format(_endDate),
        },
      );
      final data = res['data'] ?? res;

      final operating = List<Map<String, dynamic>>.from(
        data['operating'] ?? data['operatingActivities'] ?? data['operating_activities'] ?? [],
      );
      final investing = List<Map<String, dynamic>>.from(
        data['investing'] ?? data['investingActivities'] ?? data['investing_activities'] ?? [],
      );
      final financing = List<Map<String, dynamic>>.from(
        data['financing'] ?? data['financingActivities'] ?? data['financing_activities'] ?? [],
      );

      num sumOp = 0;
      for (final i in operating) {
        sumOp += (i['amount'] ?? i['total'] ?? 0) as num;
      }
      num sumInv = 0;
      for (final i in investing) {
        sumInv += (i['amount'] ?? i['total'] ?? 0) as num;
      }
      num sumFin = 0;
      for (final i in financing) {
        sumFin += (i['amount'] ?? i['total'] ?? 0) as num;
      }

      final opNet = (data['operatingNet'] ?? data['operating_net'] ?? sumOp) as num;
      final invNet = (data['investingNet'] ?? data['investing_net'] ?? sumInv) as num;
      final finNet = (data['financingNet'] ?? data['financing_net'] ?? sumFin) as num;
      final opening = (data['openingBalance'] ?? data['opening_balance'] ?? 0) as num;
      final change = (data['netChange'] ?? data['net_change'] ?? (opNet + invNet + finNet)) as num;
      final closing = (data['closingBalance'] ?? data['closing_balance'] ?? (opening + change)) as num;

      setState(() {
        _operatingItems = operating;
        _investingItems = investing;
        _financingItems = financing;
        _operatingNet = opNet;
        _investingNet = invNet;
        _financingNet = finNet;
        _openingBalance = opening;
        _netChange = change;
        _closingBalance = closing;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: _endDate,
    );
    if (picked != null && picked != _startDate) {
      setState(() => _startDate = picked);
      _fetchData();
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && picked != _endDate) {
      setState(() => _endDate = picked);
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cash Flow Statement')),
      body: Column(
        children: [
          // Filter bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.white,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Expanded(child: _dateButton('From', _startDate, _pickStartDate)),
                const SizedBox(width: 10),
                Expanded(child: _dateButton('To', _endDate, _pickEndDate)),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.refresh, color: AppColors.navy),
                  onPressed: _fetchData,
                  tooltip: 'Refresh',
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: AppColors.muted),
                            const SizedBox(height: 12),
                            const Text('Failed to load report', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.ink)),
                            const SizedBox(height: 4),
                            Text(_error!, style: const TextStyle(fontSize: 13, color: AppColors.muted), textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            ElevatedButton(onPressed: _fetchData, child: const Text('Retry')),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchData,
                        child: _buildContent(),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _dateButton(String label, DateTime date, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Text('$label: ', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
            const Icon(Icons.calendar_today, size: 14, color: AppColors.navy),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                DateFormat('dd MMM yy').format(date),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.ink),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildActivitySection(
          title: 'Operating Activities',
          items: _operatingItems,
          netTotal: _operatingNet,
          icon: Icons.settings_outlined,
          color: AppColors.blue,
        ),
        const SizedBox(height: 12),
        _buildActivitySection(
          title: 'Investing Activities',
          items: _investingItems,
          netTotal: _investingNet,
          icon: Icons.trending_up_outlined,
          color: AppColors.purple,
        ),
        const SizedBox(height: 12),
        _buildActivitySection(
          title: 'Financing Activities',
          items: _financingItems,
          netTotal: _financingNet,
          icon: Icons.account_balance_outlined,
          color: AppColors.amber,
        ),
        const SizedBox(height: 20),

        // Summary footer
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.navy.withOpacity(0.04),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.navy.withOpacity(0.15)),
          ),
          child: Column(
            children: [
              _summaryRow('Opening Balance', _openingBalance, isHighlighted: false),
              const Divider(height: 20, color: AppColors.border),
              _summaryRow('Net Change in Cash', _netChange, isHighlighted: true),
              const Divider(height: 20, color: AppColors.border),
              _summaryRow('Closing Balance', _closingBalance, isHighlighted: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _summaryRow(String label, num amount, {required bool isHighlighted}) {
    final color = amount >= 0 ? AppColors.green : AppColors.red;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isHighlighted ? 15 : 14,
            fontWeight: isHighlighted ? FontWeight.w600 : FontWeight.w500,
            color: isHighlighted ? AppColors.navy : AppColors.ink,
          ),
        ),
        Text(
          formatINR(amount),
          style: TextStyle(
            fontSize: isHighlighted ? 16 : 14,
            fontWeight: isHighlighted ? FontWeight.w700 : FontWeight.w500,
            color: isHighlighted ? color : AppColors.ink,
          ),
        ),
      ],
    );
  }

  Widget _buildActivitySection({
    required String title,
    required List<Map<String, dynamic>> items,
    required num netTotal,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.06),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color),
                  ),
                ),
              ],
            ),
          ),

          // Items
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('No items', style: TextStyle(fontSize: 13, color: AppColors.muted)),
            )
          else
            ...items.asMap().entries.map((entry) {
              final item = entry.value;
              final name = item['name'] ?? item['description'] ?? item['label'] ?? '';
              final amount = (item['amount'] ?? item['total'] ?? 0) as num;
              final amountColor = amount >= 0 ? AppColors.green : AppColors.red;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: AppColors.borderLight)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '$name',
                        style: const TextStyle(fontSize: 13, color: AppColors.ink),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      formatINR(amount),
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: amountColor),
                    ),
                  ],
                ),
              );
            }),

          // Net total
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Net Total',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.ink),
                ),
                Text(
                  formatINR(netTotal),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: netTotal >= 0 ? AppColors.green : AppColors.red,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
