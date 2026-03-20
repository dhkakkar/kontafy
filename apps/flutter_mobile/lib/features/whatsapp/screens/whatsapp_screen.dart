import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

final _whatsappStatsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/whatsapp/stats');
  return res['data'] ?? res;
});

final _whatsappRecentProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/whatsapp/recent');
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['messages'] ?? []);
});

class WhatsAppScreen extends ConsumerStatefulWidget {
  const WhatsAppScreen({super.key});

  @override
  ConsumerState<WhatsAppScreen> createState() => _WhatsAppScreenState();
}

class _WhatsAppScreenState extends ConsumerState<WhatsAppScreen> {
  bool _sending = false;

  Future<void> _sendBulkReminders() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send Bulk Reminders'),
        content: const Text(
          'This will send WhatsApp reminders to all contacts with overdue invoices. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Send'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _sending = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post('/whatsapp/bulk-reminders');
      final data = res['data'] ?? res;
      final queued = data['queued'] ?? 0;
      final failed = data['failed'] ?? 0;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Queued: $queued, Failed: $failed'),
            backgroundColor: failed > 0 ? AppColors.amber : AppColors.green,
          ),
        );
        ref.invalidate(_whatsappStatsProvider);
        ref.invalidate(_whatsappRecentProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send reminders: $e'),
            backgroundColor: AppColors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Color _typeBadgeColor(String type) {
    switch (type.toLowerCase()) {
      case 'invoice':
        return AppColors.blue;
      case 'reminder':
        return AppColors.amber;
      case 'receipt':
        return AppColors.green;
      default:
        return AppColors.muted;
    }
  }

  Color _typeBadgeBg(String type) {
    switch (type.toLowerCase()) {
      case 'invoice':
        return AppColors.blueLight;
      case 'reminder':
        return AppColors.amberLight;
      case 'receipt':
        return AppColors.green.withOpacity(0.1);
      default:
        return AppColors.borderLight;
    }
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return AppColors.green;
      case 'read':
        return AppColors.blue;
      case 'sent':
        return AppColors.muted;
      case 'queued':
        return AppColors.amber;
      case 'failed':
        return AppColors.red;
      default:
        return AppColors.muted;
    }
  }

  Color _statusBg(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return AppColors.green.withOpacity(0.1);
      case 'read':
        return AppColors.blueLight;
      case 'sent':
        return AppColors.borderLight;
      case 'queued':
        return AppColors.amberLight;
      case 'failed':
        return AppColors.redLight;
      default:
        return AppColors.borderLight;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statsAsync = ref.watch(_whatsappStatsProvider);
    final recentAsync = ref.watch(_whatsappRecentProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(_whatsappStatsProvider);
        ref.invalidate(_whatsappRecentProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // KPI Cards
          statsAsync.when(
            data: (stats) {
              final sentToday = stats['sent_today'] ?? stats['sentToday'] ?? 0;
              final delivered = stats['delivered'] ?? 0;
              final failed = stats['failed'] ?? 0;
              final total = stats['total'] ?? 0;

              return Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _KpiCard(
                          label: 'Sent Today',
                          value: sentToday.toString(),
                          icon: Icons.send,
                          color: AppColors.navy,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _KpiCard(
                          label: 'Delivered',
                          value: delivered.toString(),
                          icon: Icons.done_all,
                          color: AppColors.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _KpiCard(
                          label: 'Failed',
                          value: failed.toString(),
                          icon: Icons.error_outline,
                          color: AppColors.red,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _KpiCard(
                          label: 'Total',
                          value: total.toString(),
                          icon: Icons.chat_outlined,
                          color: AppColors.blue,
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
            loading: () => Shimmer.fromColors(
              baseColor: AppColors.borderLight,
              highlightColor: AppColors.white,
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: Container(height: 80, decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12)))),
                      const SizedBox(width: 12),
                      Expanded(child: Container(height: 80, decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12)))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: Container(height: 80, decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12)))),
                      const SizedBox(width: 12),
                      Expanded(child: Container(height: 80, decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12)))),
                    ],
                  ),
                ],
              ),
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),

          const SizedBox(height: 16),

          // Bulk Reminders Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _sending ? null : _sendBulkReminders,
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.white,
                      ),
                    )
                  : const Icon(Icons.campaign, size: 20),
              label: const Text('Send Bulk Reminders'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Recent Messages Header
          const Text(
            'Recent Messages',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 12),

          // Recent Messages List
          recentAsync.when(
            data: (messages) {
              if (messages.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.only(top: 40),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(Icons.chat_outlined, size: 56, color: AppColors.muted),
                        const SizedBox(height: 12),
                        Text(
                          'No recent messages',
                          style: TextStyle(color: AppColors.muted, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: messages.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final phone = msg['phone'] ?? msg['phone_number'] ?? '-';
                  final type = msg['type'] ?? '';
                  final status = msg['status'] ?? '';
                  final sentAt = msg['sent_at'] ?? msg['sentAt'] ?? '';

                  return Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.phone_android, size: 20, color: AppColors.muted),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  phone.toString(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: AppColors.ink,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  formatDate(sentAt.toString()),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (type.toString().isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: _typeBadgeBg(type.toString()),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                type.toString()[0].toUpperCase() +
                                    type.toString().substring(1),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _typeBadgeColor(type.toString()),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          if (status.toString().isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: _statusBg(status.toString()),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                status.toString()[0].toUpperCase() +
                                    status.toString().substring(1),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _statusColor(status.toString()),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
            loading: () => Shimmer.fromColors(
              baseColor: AppColors.borderLight,
              highlightColor: AppColors.white,
              child: Column(
                children: List.generate(
                  5,
                  (_) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            error: (_, __) => Center(
              child: Column(
                children: [
                  Icon(Icons.chat_outlined, size: 56, color: AppColors.muted),
                  const SizedBox(height: 12),
                  Text(
                    'No recent messages',
                    style: TextStyle(color: AppColors.muted, fontSize: 15),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
