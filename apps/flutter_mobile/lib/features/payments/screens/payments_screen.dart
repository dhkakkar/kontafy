import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

// Payments provider
final _paymentsReceivedProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(Endpoints.payments, queryParameters: {'type': 'received', 'limit': '50'});
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['items'] ?? data['payments'] ?? []);
});

final _paymentsMadeProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(Endpoints.payments, queryParameters: {'type': 'made', 'limit': '50'});
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['items'] ?? data['payments'] ?? []);
});

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Tab bar
        Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          decoration: BoxDecoration(
            color: AppColors.borderLight,
            borderRadius: BorderRadius.circular(10),
          ),
          child: TabBar(
            controller: _tabController,
            indicator: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: Colors.transparent,
            labelColor: AppColors.navy,
            unselectedLabelColor: AppColors.muted,
            labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            padding: const EdgeInsets.all(4),
            tabs: const [
              Tab(text: 'Received'),
              Tab(text: 'Made'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Tab content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _PaymentsList(provider: _paymentsReceivedProvider, emptyLabel: 'No payments received yet'),
              _PaymentsList(provider: _paymentsMadeProvider, emptyLabel: 'No payments made yet'),
            ],
          ),
        ),
      ],
    );
  }
}

class _PaymentsList extends ConsumerWidget {
  final AutoDisposeFutureProvider<List<Map<String, dynamic>>> provider;
  final String emptyLabel;

  const _PaymentsList({required this.provider, required this.emptyLabel});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(provider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(provider),
      child: paymentsAsync.when(
        data: (payments) {
          if (payments.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.account_balance_wallet_outlined, size: 56, color: AppColors.muted),
                  const SizedBox(height: 12),
                  Text(emptyLabel, style: TextStyle(color: AppColors.muted, fontSize: 15)),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () => context.push('/payments/new'),
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Record Payment'),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: payments.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final p = payments[index];
              final contactName = p['contactName'] ?? p['contact_name'] ?? p['contact']?['name'] ?? '-';
              final amount = p['amount'] ?? 0;
              final date = p['date'] ?? p['paymentDate'] ?? p['payment_date'] ?? '';
              final method = p['method'] ?? p['paymentMethod'] ?? p['payment_method'] ?? '';
              final status = p['status'] ?? 'success';
              final reference = p['reference'] ?? p['referenceNumber'] ?? p['reference_number'] ?? '';

              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          contactName,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        formatINR(amount),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(
                      children: [
                        if (method.isNotEmpty) ...[
                          Icon(Icons.payment, size: 14, color: AppColors.muted),
                          const SizedBox(width: 4),
                          Text(
                            method,
                            style: TextStyle(color: AppColors.muted, fontSize: 12),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (reference.isNotEmpty) ...[
                          Text(
                            '#$reference',
                            style: TextStyle(color: AppColors.muted, fontSize: 12),
                          ),
                          const SizedBox(width: 12),
                        ],
                        const Spacer(),
                        StatusBadge(status: status),
                      ],
                    ),
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        formatDateShort(date),
                        style: TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                  onTap: () {
                    final id = p['id'];
                    if (id != null) context.push('/payments/$id');
                  },
                ),
              );
            },
          );
        },
        loading: () => Shimmer.fromColors(
          baseColor: AppColors.borderLight,
          highlightColor: AppColors.white,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 8,
            itemBuilder: (_, __) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Card(
                child: Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off_outlined, size: 48, color: AppColors.muted),
              const SizedBox(height: 12),
              Text('Failed to load payments', style: TextStyle(color: AppColors.muted)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(provider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
