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

class DayBookScreen extends ConsumerStatefulWidget {
  const DayBookScreen({super.key});

  @override
  ConsumerState<DayBookScreen> createState() => _DayBookScreenState();
}

class _DayBookScreenState extends ConsumerState<DayBookScreen> {
  DateTime _startDate = _fyStart();
  DateTime _endDate = _fyEnd();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _entries = [];
  int _currentPage = 1;
  int _totalEntries = 0;
  int _totalPages = 1;
  static const int _limit = 50;

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
        '/reports/day-book',
        queryParameters: {
          'fromDate': DateFormat('yyyy-MM-dd').format(_startDate),
          'toDate': DateFormat('yyyy-MM-dd').format(_endDate),
          'page': _currentPage.toString(),
          'limit': _limit.toString(),
        },
      );
      final data = res['data'] ?? res;
      final List<dynamic> entries = data['entries'] ?? data['rows'] ?? data['items'] ?? (data is List ? data : []);
      final total = (data['total'] ?? data['totalEntries'] ?? data['total_entries'] ?? entries.length) as int;
      final pages = (data['totalPages'] ?? data['total_pages'] ?? (total / _limit).ceil()) as int;

      setState(() {
        _entries = List<Map<String, dynamic>>.from(entries);
        _totalEntries = total;
        _totalPages = pages < 1 ? 1 : pages;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _goToPage(int page) {
    if (page < 1 || page > _totalPages || page == _currentPage) return;
    setState(() => _currentPage = page);
    _fetchData();
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: _endDate,
    );
    if (picked != null && picked != _startDate) {
      setState(() {
        _startDate = picked;
        _currentPage = 1;
      });
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
      setState(() {
        _endDate = picked;
        _currentPage = 1;
      });
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Day Book')),
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
                    : _entries.isEmpty
                        ? const Center(
                            child: Text('No entries found', style: TextStyle(fontSize: 15, color: AppColors.muted)),
                          )
                        : _buildContent(),
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
    return Column(
      children: [
        // Entry count
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppColors.surface,
          child: Row(
            children: [
              Text(
                '$_totalEntries entries',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.muted),
              ),
              const Spacer(),
              Text(
                'Page $_currentPage of $_totalPages',
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
            ],
          ),
        ),

        // Entries list
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchData,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _entries.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final entry = _entries[index];
                return _buildEntryCard(entry);
              },
            ),
          ),
        ),

        // Pagination
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _paginationButton(
                icon: Icons.chevron_left,
                label: 'Previous',
                enabled: _currentPage > 1,
                onTap: () => _goToPage(_currentPage - 1),
              ),
              const SizedBox(width: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.navy.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$_currentPage / $_totalPages',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.navy,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              _paginationButton(
                icon: Icons.chevron_right,
                label: 'Next',
                enabled: _currentPage < _totalPages,
                onTap: () => _goToPage(_currentPage + 1),
                iconRight: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _paginationButton({
    required IconData icon,
    required String label,
    required bool enabled,
    required VoidCallback onTap,
    bool iconRight = false,
  }) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: enabled ? AppColors.navy : AppColors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!iconRight) Icon(icon, size: 18, color: enabled ? AppColors.navy : AppColors.muted),
            if (!iconRight) const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: enabled ? AppColors.navy : AppColors.muted,
              ),
            ),
            if (iconRight) const SizedBox(width: 4),
            if (iconRight) Icon(icon, size: 18, color: enabled ? AppColors.navy : AppColors.muted),
          ],
        ),
      ),
    );
  }

  Widget _buildEntryCard(Map<String, dynamic> entry) {
    final date = entry['date'] ?? entry['entryDate'] ?? entry['entry_date'] ?? '';
    final entryNo = entry['entryNumber'] ?? entry['entry_number'] ?? entry['number'] ?? entry['ref'] ?? '';
    final narration = entry['narration'] ?? entry['description'] ?? entry['memo'] ?? '';
    final lines = List<Map<String, dynamic>>.from(
      entry['lines'] ?? entry['entries'] ?? entry['items'] ?? entry['accounts'] ?? [],
    );

    return Container(
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
      child: Column(
        children: [
          // Entry header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.navy.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    entryNo.toString().isNotEmpty ? '#$entryNo' : '-',
                    style: const TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                      color: AppColors.navy,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    narration.toString().isNotEmpty ? narration.toString() : 'No narration',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: narration.toString().isNotEmpty ? AppColors.ink : AppColors.muted,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  formatDate(date.toString()),
                  style: const TextStyle(fontSize: 11, color: AppColors.muted),
                ),
              ],
            ),
          ),

          // Line items
          if (lines.isEmpty)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('No line items', style: TextStyle(fontSize: 12, color: AppColors.muted)),
            )
          else
            ...lines.asMap().entries.map((lineEntry) {
              final line = lineEntry.value;
              final isLast = lineEntry.key == lines.length - 1;
              final accountName = line['accountName'] ?? line['account_name'] ?? line['name'] ?? line['account'] ?? '';
              final debit = (line['debit'] ?? 0) as num;
              final credit = (line['credit'] ?? 0) as num;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  border: isLast
                      ? null
                      : const Border(bottom: BorderSide(color: AppColors.borderLight)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '$accountName',
                        style: const TextStyle(fontSize: 13, color: AppColors.ink),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (debit > 0)
                      SizedBox(
                        width: 80,
                        child: Text(
                          formatINR(debit),
                          style: const TextStyle(fontSize: 12, color: AppColors.green, fontWeight: FontWeight.w500),
                          textAlign: TextAlign.right,
                        ),
                      )
                    else
                      const SizedBox(width: 80),
                    const SizedBox(width: 8),
                    if (credit > 0)
                      SizedBox(
                        width: 80,
                        child: Text(
                          formatINR(credit),
                          style: const TextStyle(fontSize: 12, color: AppColors.red, fontWeight: FontWeight.w500),
                          textAlign: TextAlign.right,
                        ),
                      )
                    else
                      const SizedBox(width: 80),
                  ],
                ),
              );
            }),

          // Line items column header hint (if there are lines)
          if (lines.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.surface.withOpacity(0.5),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  const Expanded(child: SizedBox()),
                  SizedBox(
                    width: 80,
                    child: Text(
                      'Debit',
                      style: TextStyle(fontSize: 10, color: AppColors.muted.withOpacity(0.7)),
                      textAlign: TextAlign.right,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 80,
                    child: Text(
                      'Credit',
                      style: TextStyle(fontSize: 10, color: AppColors.muted.withOpacity(0.7)),
                      textAlign: TextAlign.right,
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
