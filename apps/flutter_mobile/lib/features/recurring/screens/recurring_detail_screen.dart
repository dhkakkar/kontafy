import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class RecurringDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const RecurringDetailScreen({super.key, required this.id});
  @override
  ConsumerState<RecurringDetailScreen> createState() => _RecurringDetailScreenState();
}

class _RecurringDetailScreenState extends ConsumerState<RecurringDetailScreen> {
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _history = [];
  bool _loading = true;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/bill/recurring-invoices/${widget.id}'),
        api.get('/bill/recurring-invoices/${widget.id}/history'),
      ]);

      final profileData = results[0]['data'] ?? results[0];
      final historyData = results[1]['data'] ?? results[1];

      setState(() {
        _profile = Map<String, dynamic>.from(profileData is Map ? profileData : {});
        _history = List<Map<String, dynamic>>.from(historyData is List ? historyData : []);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _pauseProfile() async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/bill/recurring-invoices/${widget.id}/pause');
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Recurring invoice paused')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _resumeProfile() async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/bill/recurring-invoices/${widget.id}/resume');
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Recurring invoice resumed')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _deleteProfile() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Recurring Invoice'),
        content: const Text('Are you sure you want to delete this recurring invoice profile? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red, foregroundColor: AppColors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/bill/recurring-invoices/${widget.id}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Recurring invoice deleted')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(_profile != null
            ? (_profile!['name'] ?? _profile!['profile_name'] ?? _profile!['profileName'] ?? 'Recurring Invoice').toString()
            : 'Recurring Invoice'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _profile == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: AppColors.muted.withOpacity(0.4)),
                      const SizedBox(height: 16),
                      Text('Failed to load recurring invoice', style: TextStyle(color: AppColors.muted, fontSize: 16)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildStatusSection(),
                      const SizedBox(height: 16),
                      _buildScheduleSection(),
                      const SizedBox(height: 16),
                      _buildContactSection(),
                      const SizedBox(height: 16),
                      _buildLineItemsSection(),
                      const SizedBox(height: 16),
                      _buildAmountSummarySection(),
                      const SizedBox(height: 16),
                      _buildNotesSection(),
                      const SizedBox(height: 16),
                      _buildHistorySection(),
                      const SizedBox(height: 16),
                      _buildActionsSection(),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSectionCard({required String title, required List<Widget> children}) {
    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildStatusSection() {
    final status = (_profile!['status'] ?? 'active').toString().toLowerCase();
    final amount = (_profile!['total'] ?? _profile!['amount'] ?? _profile!['grandTotal'] ?? _profile!['grand_total'] ?? 0).toDouble();

    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Text(
                formatINR(amount),
                style: TextStyle(color: AppColors.ink, fontSize: 24, fontWeight: FontWeight.w700),
              ),
            ),
            StatusBadge(status: status),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleSection() {
    final frequency = (_profile!['frequency'] ?? _profile!['recurrence'] ?? 'monthly').toString();
    final startDate = _profile!['start_date'] ?? _profile!['startDate'] ?? '';
    final endDate = _profile!['end_date'] ?? _profile!['endDate'] ?? '';
    final nextIssueDate = _profile!['next_issue_date'] ?? _profile!['nextIssueDate'] ?? '';
    final autoSend = _profile!['auto_send'] ?? _profile!['autoSend'] ?? false;

    return _buildSectionCard(
      title: 'Schedule',
      children: [
        _buildDetailRow('Frequency', frequency[0].toUpperCase() + frequency.substring(1)),
        const SizedBox(height: 8),
        _buildDetailRow('Start Date', formatDate(startDate.toString())),
        if (endDate.toString().isNotEmpty) ...[
          const SizedBox(height: 8),
          _buildDetailRow('End Date', formatDate(endDate.toString())),
        ],
        if (nextIssueDate.toString().isNotEmpty) ...[
          const SizedBox(height: 8),
          _buildDetailRow('Next Issue', formatDate(nextIssueDate.toString())),
        ],
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 120,
              child: Text('Auto Send', style: TextStyle(color: AppColors.muted, fontSize: 13)),
            ),
            Icon(
              autoSend == true ? Icons.check_circle : Icons.cancel,
              size: 18,
              color: autoSend == true ? AppColors.green : AppColors.muted,
            ),
            const SizedBox(width: 4),
            Text(
              autoSend == true ? 'Yes' : 'No',
              style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildContactSection() {
    final contact = _profile!['contact'] as Map<String, dynamic>?;
    final contactName = _profile!['contact_name'] ??
        _profile!['contactName'] ??
        contact?['company_name'] ??
        contact?['companyName'] ??
        contact?['name'] ??
        '-';
    final gstin = _profile!['contact_gstin'] ?? _profile!['contactGstin'] ?? contact?['gstin'] ?? '';

    return _buildSectionCard(
      title: 'Contact',
      children: [
        _buildDetailRow('Name', contactName.toString()),
        if (gstin.toString().isNotEmpty) ...[
          const SizedBox(height: 8),
          _buildDetailRow('GSTIN', gstin.toString()),
        ],
      ],
    );
  }

  Widget _buildLineItemsSection() {
    final items = _profile!['items'] ?? _profile!['lineItems'] ?? _profile!['line_items'] ?? [];
    final lineItems = List<Map<String, dynamic>>.from(items is List ? items : []);

    return _buildSectionCard(
      title: 'Line Items',
      children: [
        if (lineItems.isEmpty)
          Text('No items', style: TextStyle(color: AppColors.muted, fontSize: 14))
        else
          ...lineItems.asMap().entries.map((entry) {
            final i = entry.key;
            final item = entry.value;
            final product = item['product'] ?? item['name'] ?? item['productName'] ?? '-';
            final description = item['description'] ?? '';
            final hsn = item['hsnSac'] ?? item['hsn_sac'] ?? item['hsn'] ?? '';
            final qty = (item['quantity'] ?? item['qty'] ?? 0).toDouble();
            final rate = (item['rate'] ?? item['price'] ?? 0).toDouble();
            final amount = (item['amount'] ?? item['total'] ?? (qty * rate)).toDouble();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (i > 0) const Divider(height: 20),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          '${i + 1}',
                          style: TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.toString(),
                            style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                          ),
                          if (description.toString().isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              description.toString(),
                              style: TextStyle(color: AppColors.muted, fontSize: 12),
                            ),
                          ],
                          if (hsn.toString().isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              'HSN: $hsn',
                              style: TextStyle(color: AppColors.muted, fontSize: 12),
                            ),
                          ],
                          const SizedBox(height: 4),
                          Text(
                            '${qty.toStringAsFixed(qty.truncateToDouble() == qty ? 0 : 2)} x ${formatINR(rate)}',
                            style: TextStyle(color: AppColors.muted, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      formatINR(amount),
                      style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            );
          }),
      ],
    );
  }

  Widget _buildAmountSummarySection() {
    final subtotal = (_profile!['subtotal'] ?? _profile!['subTotal'] ?? _profile!['sub_total'] ?? 0).toDouble();
    final discount = (_profile!['discount'] ?? _profile!['totalDiscount'] ?? _profile!['total_discount'] ?? 0).toDouble();
    final tax = (_profile!['tax'] ?? _profile!['totalTax'] ?? _profile!['total_tax'] ?? 0).toDouble();
    final total =
        (_profile!['total'] ?? _profile!['grandTotal'] ?? _profile!['grand_total'] ?? _profile!['amount'] ?? 0).toDouble();

    return _buildSectionCard(
      title: 'Amount Summary',
      children: [
        _buildSummaryRow('Subtotal', formatINR(subtotal)),
        if (discount > 0) ...[
          const SizedBox(height: 8),
          _buildSummaryRow('Discount', '- ${formatINR(discount)}'),
        ],
        if (tax > 0) ...[
          const SizedBox(height: 8),
          _buildSummaryRow('Tax', formatINR(tax)),
        ],
        const Divider(height: 20),
        _buildSummaryRow('Total', formatINR(total), bold: true),
      ],
    );
  }

  Widget _buildNotesSection() {
    final notes = (_profile!['notes'] ?? '').toString();
    if (notes.isEmpty) return const SizedBox.shrink();

    return _buildSectionCard(
      title: 'Notes',
      children: [
        Text(notes, style: TextStyle(color: AppColors.ink, fontSize: 14)),
      ],
    );
  }

  Widget _buildHistorySection() {
    return _buildSectionCard(
      title: 'Generation History',
      children: [
        if (_history.isEmpty)
          Text('No invoices generated yet', style: TextStyle(color: AppColors.muted, fontSize: 14))
        else
          ..._history.asMap().entries.map((entry) {
            final i = entry.key;
            final invoice = entry.value;
            final number = invoice['invoice_number'] ?? invoice['invoiceNumber'] ?? invoice['number'] ?? '-';
            final date = invoice['date'] ?? invoice['createdAt'] ?? '';
            final amount = (invoice['total'] ?? invoice['amount'] ?? 0).toDouble();
            final status = (invoice['status'] ?? 'draft').toString().toLowerCase();

            return Column(
              children: [
                if (i > 0) const Divider(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            number.toString(),
                            style: TextStyle(color: AppColors.navy, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatDate(date.toString()),
                            style: TextStyle(color: AppColors.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          formatINR(amount),
                          style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        StatusBadge(status: status),
                      ],
                    ),
                  ],
                ),
              ],
            );
          }),
      ],
    );
  }

  Widget _buildActionsSection() {
    final status = (_profile!['status'] ?? 'active').toString().toLowerCase();

    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Actions',
              style: TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            if (status == 'active') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _actionLoading ? null : _pauseProfile,
                      icon: const Icon(Icons.pause, size: 18),
                      label: _actionLoading
                          ? const SizedBox(
                              height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Pause', style: TextStyle(fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.amber,
                        foregroundColor: AppColors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _actionLoading ? null : _deleteProfile,
                      icon: Icon(Icons.delete_outline, size: 18, color: AppColors.red),
                      label: Text('Delete', style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.red,
                        side: BorderSide(color: AppColors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
            if (status == 'paused') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _actionLoading ? null : _resumeProfile,
                      icon: const Icon(Icons.play_arrow, size: 18),
                      label: _actionLoading
                          ? const SizedBox(
                              height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Resume', style: TextStyle(fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.green,
                        foregroundColor: AppColors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _actionLoading ? null : _deleteProfile,
                      icon: Icon(Icons.delete_outline, size: 18, color: AppColors.red),
                      label: Text('Delete', style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.red,
                        side: BorderSide(color: AppColors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
            if (status == 'stopped') ...[
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _actionLoading ? null : _deleteProfile,
                  icon: Icon(Icons.delete_outline, size: 18, color: AppColors.red),
                  label: _actionLoading
                      ? SizedBox(
                          height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red))
                      : Text('Delete', style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.red,
                    side: BorderSide(color: AppColors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(label, style: TextStyle(color: AppColors.muted, fontSize: 13)),
        ),
        Expanded(
          child: Text(value, style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500)),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: bold ? AppColors.ink : AppColors.muted,
            fontSize: bold ? 15 : 14,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: AppColors.ink,
            fontSize: bold ? 16 : 14,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
