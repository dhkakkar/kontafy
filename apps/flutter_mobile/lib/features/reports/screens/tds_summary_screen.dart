import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class TdsSummaryScreen extends ConsumerStatefulWidget {
  const TdsSummaryScreen({super.key});

  @override
  ConsumerState<TdsSummaryScreen> createState() => _TdsSummaryScreenState();
}

class _TdsSummaryScreenState extends ConsumerState<TdsSummaryScreen> {
  DateTime _fromDate =
      DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _toDate = DateTime.now();
  String? _sectionFilter;
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic> _data = {};
  List<Map<String, dynamic>> _sectionSummary = [];
  List<Map<String, dynamic>> _entries = [];
  final List<String> _availableSections = [];

  final TextEditingController _sectionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _sectionController.dispose();
    super.dispose();
  }

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{
        'fromDate': _fmtDate(_fromDate),
        'toDate': _fmtDate(_toDate),
      };
      if (_sectionFilter != null && _sectionFilter!.isNotEmpty) {
        params['section'] = _sectionFilter!;
      }
      final res = await api.get(
        '${Endpoints.reports}/tds-summary',
        queryParameters: params,
      );
      final data = res['data'] ?? res;

      final List<dynamic> rawSections =
          data['section_summary'] ?? data['sectionSummary'] ?? [];
      final List<dynamic> rawEntries =
          data['entries'] ?? data['details'] ?? data['items'] ?? [];

      // Collect available sections for filter dropdown
      final sections = <String>{};
      for (final s in rawSections) {
        final sec = s['section']?.toString() ?? '';
        if (sec.isNotEmpty) sections.add(sec);
      }

      setState(() {
        _data = Map<String, dynamic>.from(data);
        _sectionSummary =
            rawSections.map((s) => Map<String, dynamic>.from(s)).toList();
        _entries =
            rawEntries.map((e) => Map<String, dynamic>.from(e)).toList();
        _availableSections
          ..clear()
          ..addAll(sections.toList()..sort());
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _fromDate, end: _toDate),
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked.start;
        _toDate = picked.end;
      });
      _fetchData();
    }
  }

  void _showSectionFilterDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Filter by Section'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _sectionController,
                decoration: InputDecoration(
                  hintText: 'e.g. 194C, 194J',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
              if (_availableSections.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _availableSections.map((s) {
                    return ActionChip(
                      label: Text(s, style: const TextStyle(fontSize: 12)),
                      onPressed: () {
                        _sectionController.text = s;
                      },
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                _sectionController.clear();
                setState(() => _sectionFilter = null);
                Navigator.pop(ctx);
                _fetchData();
              },
              child: const Text('Clear'),
            ),
            TextButton(
              onPressed: () {
                setState(() => _sectionFilter =
                    _sectionController.text.trim().isEmpty
                        ? null
                        : _sectionController.text.trim());
                Navigator.pop(ctx);
                _fetchData();
              },
              child: const Text('Apply'),
            ),
          ],
        );
      },
    );
  }

  num _getNum(dynamic v) => (v ?? 0) as num;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TDS Summary'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0.5,
      ),
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // Filters
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.white,
            child: Column(
              children: [
                // Date range
                InkWell(
                  onTap: _pickDateRange,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.date_range,
                            size: 16, color: AppColors.muted),
                        const SizedBox(width: 8),
                        Text(
                          '${formatDate(_fromDate.toIso8601String())} - ${formatDate(_toDate.toIso8601String())}',
                          style:
                              TextStyle(color: AppColors.ink, fontSize: 14),
                        ),
                        const Spacer(),
                        Icon(Icons.arrow_drop_down, color: AppColors.muted),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Section filter
                InkWell(
                  onTap: _showSectionFilterDialog,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.filter_list,
                            size: 16, color: AppColors.muted),
                        const SizedBox(width: 8),
                        Text(
                          _sectionFilter != null
                              ? 'Section: $_sectionFilter'
                              : 'All Sections',
                          style:
                              TextStyle(color: AppColors.ink, fontSize: 14),
                        ),
                        const Spacer(),
                        if (_sectionFilter != null)
                          GestureDetector(
                            onTap: () {
                              setState(() => _sectionFilter = null);
                              _sectionController.clear();
                              _fetchData();
                            },
                            child: Icon(Icons.close,
                                size: 16, color: AppColors.muted),
                          )
                        else
                          Icon(Icons.arrow_drop_down, color: AppColors.muted),
                      ],
                    ),
                  ),
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
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.cloud_off_outlined,
                                size: 48, color: AppColors.muted),
                            const SizedBox(height: 12),
                            Text('Failed to load data',
                                style: TextStyle(color: AppColors.muted)),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _fetchData,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchData,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildSummaryCards(),
                            const SizedBox(height: 20),
                            if (_sectionSummary.isNotEmpty) ...[
                              _buildSectionHeader('Section-wise Summary'),
                              const SizedBox(height: 8),
                              ..._sectionSummary.map(_buildSectionCard),
                              const SizedBox(height: 20),
                            ],
                            _buildSectionHeader('Detail Entries'),
                            const SizedBox(height: 8),
                            if (_entries.isEmpty)
                              Padding(
                                padding: const EdgeInsets.all(32),
                                child: Center(
                                  child: Text(
                                    'No TDS entries in this period',
                                    style: TextStyle(
                                        color: AppColors.muted, fontSize: 14),
                                  ),
                                ),
                              )
                            else
                              ..._entries.map(_buildEntryCard),
                          ],
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final totalEntries =
        _getNum(_data['total_entries'] ?? _data['totalEntries'] ?? _entries.length);
    final grossAmount =
        _getNum(_data['total_gross'] ?? _data['totalGross']);
    final totalTds =
        _getNum(_data['total_tds'] ?? _data['totalTds']);
    final pendingDeposit =
        _getNum(_data['pending_deposit'] ?? _data['pendingDeposit']);

    return Column(
      children: [
        Row(
          children: [
            _summaryCard('Total Entries', '$totalEntries', AppColors.navy,
                Icons.list_alt),
            const SizedBox(width: 8),
            _summaryCard('Gross Amount', abbreviateINR(grossAmount),
                AppColors.blue, Icons.account_balance_outlined),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _summaryCard('Total TDS', abbreviateINR(totalTds),
                AppColors.green, Icons.receipt_long_outlined),
            const SizedBox(width: 8),
            _summaryCard('Pending Deposit', abbreviateINR(pendingDeposit),
                AppColors.amber, Icons.pending_actions_outlined),
          ],
        ),
      ],
    );
  }

  Widget _summaryCard(
      String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: 10,
                          color: color,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: color),
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
      ),
    );
  }

  Widget _buildSectionCard(Map<String, dynamic> section) {
    final sectionCode = section['section'] ?? '-';
    final entries = _getNum(section['entries'] ?? section['count']);
    final grossAmount =
        _getNum(section['gross_amount'] ?? section['grossAmount']);
    final tdsAmount =
        _getNum(section['tds_amount'] ?? section['tdsAmount']);
    final pending = _getNum(section['pending'] ?? section['pending_deposit']);
    final deposited =
        _getNum(section['deposited'] ?? section['deposited_amount']);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.navy.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Section $sectionCode',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy),
                  ),
                ),
                const Spacer(),
                Text(
                  '${entries.toInt()} entries',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _miniChip('Gross', formatINR(grossAmount), AppColors.ink),
                  const SizedBox(width: 6),
                  _miniChip('TDS', formatINR(tdsAmount), AppColors.blue),
                  const SizedBox(width: 6),
                  _miniChip('Pending', formatINR(pending), AppColors.amber),
                  const SizedBox(width: 6),
                  _miniChip(
                      'Deposited', formatINR(deposited), AppColors.green),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 9, color: color, fontWeight: FontWeight.w500)),
          const SizedBox(height: 1),
          Text(value,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _buildEntryCard(Map<String, dynamic> entry) {
    final date = entry['date'] ?? entry['deduction_date'] ?? '';
    final section = entry['section'] ?? '-';
    final deducteeName =
        entry['deductee_name'] ?? entry['deducteeName'] ?? entry['name'] ?? '-';
    final pan = entry['pan'] ?? entry['deductee_pan'] ?? '-';
    final grossAmount =
        _getNum(entry['gross_amount'] ?? entry['grossAmount']);
    final rate = entry['rate'] ?? entry['tds_rate'] ?? 0;
    final tdsAmount = _getNum(entry['tds_amount'] ?? entry['tdsAmount']);
    final status = entry['status'] ?? 'pending';

    final isDeposited = status.toString().toLowerCase() == 'deposited';
    final statusColor = isDeposited ? AppColors.green : AppColors.amber;
    final statusLabel = isDeposited ? 'Deposited' : 'Pending';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        deducteeName,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: AppColors.ink,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text('PAN: $pan',
                              style: TextStyle(
                                  color: AppColors.muted, fontSize: 11)),
                          const SizedBox(width: 12),
                          Text('Sec $section',
                              style: TextStyle(
                                  color: AppColors.muted, fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(formatDate(date),
                        style:
                            TextStyle(color: AppColors.muted, fontSize: 11)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: statusColor),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _miniLabel('Gross Amount', formatINR(grossAmount)),
                _miniLabel('Rate', '$rate%'),
                _miniLabel('TDS Amount', formatINR(tdsAmount), bold: true),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniLabel(String label, String value, {bool bold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 10, color: AppColors.muted)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: bold ? FontWeight.w600 : FontWeight.normal,
            color: AppColors.ink,
          ),
        ),
      ],
    );
  }
}
