import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class QuotationDetailScreen extends ConsumerStatefulWidget {
  final String quotationId;
  const QuotationDetailScreen({super.key, required this.quotationId});
  @override
  ConsumerState<QuotationDetailScreen> createState() => _QuotationDetailScreenState();
}

class _QuotationDetailScreenState extends ConsumerState<QuotationDetailScreen> {
  Map<String, dynamic>? _quotation;
  bool _loading = true;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _loadQuotation();
  }

  Future<void> _loadQuotation() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/bill/quotations/${widget.quotationId}');
      final data = res['data'] ?? res;
      setState(() {
        _quotation = Map<String, dynamic>.from(data is Map ? data : {});
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/bill/quotations/${widget.quotationId}/status', data: {'status': newStatus});
      await _loadQuotation();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Quotation marked as $newStatus')),
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

  Future<void> _convertToInvoice() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Convert to Invoice'),
        content: const Text('This will create a new invoice from this quotation. Continue?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy, foregroundColor: AppColors.white),
            child: const Text('Convert'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/bill/quotations/${widget.quotationId}/convert-to-invoice');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invoice created from quotation')),
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

  Future<void> _deleteQuotation() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Quotation'),
        content: const Text('Are you sure you want to delete this quotation? This action cannot be undone.'),
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
      await api.delete('/bill/quotations/${widget.quotationId}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Quotation deleted')),
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
        title: Text(_quotation != null
            ? (_quotation!['quotationNumber'] ?? _quotation!['quotation_number'] ?? _quotation!['number'] ?? 'Quotation').toString()
            : 'Quotation'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _quotation == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: AppColors.muted.withOpacity(0.4)),
                      const SizedBox(height: 16),
                      Text('Failed to load quotation', style: TextStyle(color: AppColors.muted, fontSize: 16)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadQuotation,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildStatusSection(),
                      const SizedBox(height: 16),
                      _buildCustomerInfoSection(),
                      const SizedBox(height: 16),
                      _buildDatesSection(),
                      const SizedBox(height: 16),
                      _buildLineItemsSection(),
                      const SizedBox(height: 16),
                      _buildAmountSummarySection(),
                      const SizedBox(height: 16),
                      _buildNotesTermsSection(),
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
    final status = (_quotation!['status'] ?? 'draft').toString().toLowerCase();
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
                formatINR(
                  (_quotation!['total'] ?? _quotation!['amount'] ?? _quotation!['grandTotal'] ?? _quotation!['grand_total'] ?? 0)
                      .toDouble(),
                ),
                style: TextStyle(color: AppColors.ink, fontSize: 24, fontWeight: FontWeight.w700),
              ),
            ),
            StatusBadge(status: status),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerInfoSection() {
    final customer = _quotation!['customer'] as Map<String, dynamic>?;
    final customerName = _quotation!['customerName'] ?? _quotation!['customer_name'] ?? customer?['name'] ?? '-';
    final gstin = _quotation!['customerGstin'] ?? _quotation!['customer_gstin'] ?? customer?['gstin'] ?? '';

    return _buildSectionCard(
      title: 'Customer',
      children: [
        _buildDetailRow('Name', customerName.toString()),
        if (gstin.toString().isNotEmpty) ...[
          const SizedBox(height: 8),
          _buildDetailRow('GSTIN', gstin.toString()),
        ],
      ],
    );
  }

  Widget _buildDatesSection() {
    final date = _quotation!['date'] ?? _quotation!['quotationDate'] ?? _quotation!['quotation_date'] ?? '';
    final validUntil = _quotation!['validUntil'] ?? _quotation!['valid_until'] ?? _quotation!['expiryDate'] ?? '';

    return _buildSectionCard(
      title: 'Dates',
      children: [
        _buildDetailRow('Quotation Date', formatDate(date.toString())),
        const SizedBox(height: 8),
        _buildDetailRow('Valid Until', formatDate(validUntil.toString())),
      ],
    );
  }

  Widget _buildLineItemsSection() {
    final items = _quotation!['items'] ?? _quotation!['lineItems'] ?? _quotation!['line_items'] ?? [];
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
    final subtotal = (_quotation!['subtotal'] ?? _quotation!['subTotal'] ?? _quotation!['sub_total'] ?? 0).toDouble();
    final discount = (_quotation!['discount'] ?? _quotation!['totalDiscount'] ?? _quotation!['total_discount'] ?? 0).toDouble();
    final tax = (_quotation!['tax'] ?? _quotation!['totalTax'] ?? _quotation!['total_tax'] ?? 0).toDouble();
    final total =
        (_quotation!['total'] ?? _quotation!['grandTotal'] ?? _quotation!['grand_total'] ?? _quotation!['amount'] ?? 0).toDouble();

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

  Widget _buildNotesTermsSection() {
    final terms = (_quotation!['termsAndConditions'] ?? _quotation!['terms_and_conditions'] ?? _quotation!['terms'] ?? '')
        .toString();
    final notes = (_quotation!['notes'] ?? '').toString();

    if (terms.isEmpty && notes.isEmpty) return const SizedBox.shrink();

    return _buildSectionCard(
      title: 'Notes & Terms',
      children: [
        if (notes.isNotEmpty) ...[
          Text('Notes', style: TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(notes, style: TextStyle(color: AppColors.ink, fontSize: 14)),
        ],
        if (notes.isNotEmpty && terms.isNotEmpty) const SizedBox(height: 12),
        if (terms.isNotEmpty) ...[
          Text('Terms & Conditions', style: TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(terms, style: TextStyle(color: AppColors.ink, fontSize: 14)),
        ],
      ],
    );
  }

  Widget _buildActionsSection() {
    final status = (_quotation!['status'] ?? 'draft').toString().toLowerCase();
    final canConvert = status != 'rejected' && status != 'expired';

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
            if (status == 'draft') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _actionLoading ? null : () => _updateStatus('sent'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.navy,
                        foregroundColor: AppColors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: _actionLoading
                          ? const SizedBox(
                              height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Mark Sent', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _actionLoading ? null : _deleteQuotation,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.red,
                        side: BorderSide(color: AppColors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Delete', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ],
            if (status == 'sent') ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _actionLoading ? null : () => _updateStatus('accepted'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.green,
                        foregroundColor: AppColors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: _actionLoading
                          ? const SizedBox(
                              height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Accept', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _actionLoading ? null : () => _updateStatus('rejected'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.red,
                        side: BorderSide(color: AppColors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Reject', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ],
            if (canConvert) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _actionLoading ? null : _convertToInvoice,
                  icon: Icon(Icons.receipt_long_outlined, size: 18, color: AppColors.navy),
                  label: Text('Convert to Invoice', style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.navy),
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
