import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class PurchaseOrderDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const PurchaseOrderDetailScreen({super.key, required this.id});
  @override
  ConsumerState<PurchaseOrderDetailScreen> createState() => _PurchaseOrderDetailScreenState();
}

class _PurchaseOrderDetailScreenState extends ConsumerState<PurchaseOrderDetailScreen> {
  Map<String, dynamic>? _po;
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
      final res = await api.get('/bill/purchase-orders/${widget.id}');
      final data = res['data'] ?? res;
      setState(() {
        _po = data is Map<String, dynamic> ? data : null;
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
      await api.patch('/bill/purchase-orders/${widget.id}', data: {'status': newStatus});
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status updated to ${newStatus[0].toUpperCase()}${newStatus.substring(1)}')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  Future<void> _deletePO() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Purchase Order'),
        content: const Text('Are you sure you want to delete this purchase order? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Delete', style: TextStyle(color: AppColors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/bill/purchase-orders/${widget.id}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Purchase order deleted')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete: $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  Future<void> _convertToBill() async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/bill/purchase-orders/${widget.id}/convert-to-bill');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Converted to bill successfully')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to convert: $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(_po != null
            ? (_po!['purchaseOrderNumber'] ?? _po!['purchase_order_number'] ?? _po!['poNumber'] ?? _po!['number'] ?? 'Purchase Order').toString()
            : 'Purchase Order'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: _buildAppBarActions(),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _po == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: AppColors.muted.withOpacity(0.4)),
                      const SizedBox(height: 16),
                      Text('Purchase order not found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: _buildBody(),
                ),
    );
  }

  List<Widget> _buildAppBarActions() {
    if (_po == null || _actionLoading) return [];
    final status = (_po!['status'] ?? 'draft').toString().toLowerCase();
    return [
      PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert),
        onSelected: (value) {
          switch (value) {
            case 'sent':
              _updateStatus('sent');
              break;
            case 'acknowledged':
              _updateStatus('acknowledged');
              break;
            case 'received':
              _updateStatus('received');
              break;
            case 'cancelled':
              _updateStatus('cancelled');
              break;
            case 'delete':
              _deletePO();
              break;
            case 'convert':
              _convertToBill();
              break;
          }
        },
        itemBuilder: (ctx) {
          final items = <PopupMenuEntry<String>>[];

          if (status == 'draft') {
            items.add(const PopupMenuItem(value: 'sent', child: Text('Mark Sent')));
            items.add(const PopupMenuItem(value: 'cancelled', child: Text('Cancel')));
            items.add(PopupMenuItem(
              value: 'delete',
              child: Text('Delete', style: TextStyle(color: AppColors.red)),
            ));
          } else if (status == 'sent') {
            items.add(const PopupMenuItem(value: 'acknowledged', child: Text('Mark Acknowledged')));
          } else if (status == 'acknowledged') {
            items.add(const PopupMenuItem(value: 'received', child: Text('Mark Received')));
          }

          if (status != 'cancelled' && status != 'received') {
            items.add(const PopupMenuDivider());
            items.add(const PopupMenuItem(value: 'convert', child: Text('Convert to Bill')));
          }

          return items;
        },
      ),
    ];
  }

  Widget _buildBody() {
    final status = (_po!['status'] ?? 'draft').toString().toLowerCase();
    final vendorName = _po!['vendorName'] ?? _po!['vendor_name'] ?? _po!['vendor']?['name'] ?? '-';
    final vendorEmail = _po!['vendorEmail'] ?? _po!['vendor_email'] ?? _po!['vendor']?['email'] ?? '';
    final vendorPhone = _po!['vendorPhone'] ?? _po!['vendor_phone'] ?? _po!['vendor']?['phone'] ?? '';
    final orderDate = _po!['orderDate'] ?? _po!['order_date'] ?? _po!['date'] ?? '';
    final deliveryDate = _po!['deliveryDate'] ?? _po!['delivery_date'] ?? _po!['expectedDeliveryDate'] ?? '';
    final shippingAddress = _po!['shippingAddress'] ?? _po!['shipping_address'] ?? '';
    final notes = _po!['notes'] ?? '';
    final terms = _po!['terms'] ?? _po!['termsAndConditions'] ?? _po!['terms_and_conditions'] ?? '';
    final subtotal = (_po!['subtotal'] ?? _po!['subTotal'] ?? _po!['sub_total'] ?? 0).toDouble();
    final tax = (_po!['tax'] ?? _po!['taxAmount'] ?? _po!['tax_amount'] ?? 0).toDouble();
    final discount = (_po!['discount'] ?? _po!['discountAmount'] ?? _po!['discount_amount'] ?? 0).toDouble();
    final total = (_po!['total'] ?? _po!['grandTotal'] ?? _po!['grand_total'] ?? _po!['amount'] ?? 0).toDouble();
    final lineItems = _po!['items'] ?? _po!['lineItems'] ?? _po!['line_items'] ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status
        _buildSection(
          child: Row(
            children: [
              Text('Status', style: TextStyle(color: AppColors.muted, fontSize: 14)),
              const Spacer(),
              StatusBadge(status: status),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Vendor info
        _buildSection(
          title: 'Vendor',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(vendorName.toString(), style: TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600)),
              if (vendorEmail.toString().isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.email_outlined, size: 14, color: AppColors.muted),
                    const SizedBox(width: 6),
                    Text(vendorEmail.toString(), style: TextStyle(color: AppColors.muted, fontSize: 13)),
                  ],
                ),
              ],
              if (vendorPhone.toString().isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.phone_outlined, size: 14, color: AppColors.muted),
                    const SizedBox(width: 6),
                    Text(vendorPhone.toString(), style: TextStyle(color: AppColors.muted, fontSize: 13)),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Dates
        _buildSection(
          title: 'Dates',
          child: Column(
            children: [
              _buildInfoRow('Order Date', formatDate(orderDate.toString())),
              if (deliveryDate.toString().isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildInfoRow('Delivery Date', formatDate(deliveryDate.toString())),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Shipping Address
        if (shippingAddress.toString().isNotEmpty) ...[
          _buildSection(
            title: 'Shipping Address',
            child: Text(shippingAddress.toString(), style: TextStyle(color: AppColors.ink, fontSize: 14)),
          ),
          const SizedBox(height: 12),
        ],

        // Line Items
        if (lineItems is List && lineItems.isNotEmpty) ...[
          _buildSection(
            title: 'Line Items',
            child: Column(
              children: [
                for (int i = 0; i < lineItems.length; i++) ...[
                  if (i > 0) Divider(color: AppColors.border, height: 16),
                  _buildLineItem(lineItems[i], i + 1),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Amount Summary
        _buildSection(
          title: 'Amount Summary',
          child: Column(
            children: [
              _buildInfoRow('Subtotal', formatINR(subtotal)),
              if (discount > 0) ...[
                const SizedBox(height: 8),
                _buildInfoRow('Discount', '- ${formatINR(discount)}'),
              ],
              if (tax > 0) ...[
                const SizedBox(height: 8),
                _buildInfoRow('Tax', formatINR(tax)),
              ],
              const SizedBox(height: 8),
              const Divider(color: AppColors.border),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Total', style: TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w700)),
                  Text(formatINR(total), style: TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Notes
        if (notes.toString().isNotEmpty) ...[
          _buildSection(
            title: 'Notes',
            child: Text(notes.toString(), style: TextStyle(color: AppColors.ink, fontSize: 14)),
          ),
          const SizedBox(height: 12),
        ],

        // Terms
        if (terms.toString().isNotEmpty) ...[
          _buildSection(
            title: 'Terms & Conditions',
            child: Text(terms.toString(), style: TextStyle(color: AppColors.ink, fontSize: 14)),
          ),
          const SizedBox(height: 12),
        ],

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildSection({String? title, required Widget child}) {
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
            if (title != null) ...[
              Text(title, style: TextStyle(color: AppColors.navy, fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
            ],
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: AppColors.muted, fontSize: 14)),
        Text(value, style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildLineItem(dynamic item, int index) {
    final name = item['name'] ?? item['description'] ?? item['productName'] ?? item['product_name'] ?? '-';
    final qty = (item['quantity'] ?? item['qty'] ?? 1).toString();
    final rate = (item['rate'] ?? item['unitPrice'] ?? item['unit_price'] ?? item['price'] ?? 0).toDouble();
    final amount = (item['amount'] ?? item['total'] ?? 0).toDouble();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 24,
          child: Text('$index.', style: TextStyle(color: AppColors.muted, fontSize: 13)),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name.toString(), style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text(
                '$qty x ${formatINR(rate)}',
                style: TextStyle(color: AppColors.muted, fontSize: 13),
              ),
            ],
          ),
        ),
        Text(
          formatINR(amount > 0 ? amount : rate * (double.tryParse(qty) ?? 1)),
          style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
