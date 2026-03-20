import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

final _insightsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/ai/insights');
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['insights'] ?? []);
});

final _anomaliesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/ai/anomalies');
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['anomalies'] ?? []);
});

class InsightsScreen extends ConsumerStatefulWidget {
  const InsightsScreen({super.key});

  @override
  ConsumerState<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends ConsumerState<InsightsScreen>
    with SingleTickerProviderStateMixin {
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

  void _refresh() {
    ref.invalidate(_insightsProvider);
    ref.invalidate(_anomaliesProvider);
  }

  Color _severityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'danger':
      case 'high':
        return AppColors.red;
      case 'warning':
      case 'medium':
        return AppColors.amber;
      case 'success':
        return AppColors.green;
      case 'info':
      case 'low':
        return AppColors.blue;
      default:
        return AppColors.muted;
    }
  }

  Color _severityBg(String severity) {
    switch (severity.toLowerCase()) {
      case 'danger':
      case 'high':
        return AppColors.redLight;
      case 'warning':
      case 'medium':
        return AppColors.amberLight;
      case 'success':
        return AppColors.green.withOpacity(0.1);
      case 'info':
      case 'low':
        return AppColors.blueLight;
      default:
        return AppColors.borderLight;
    }
  }

  String _anomalyTypeLabel(String type) {
    switch (type) {
      case 'unusual_amount':
        return 'Unusual Amount';
      case 'duplicate_invoice':
        return 'Duplicate Invoice';
      case 'missing_sequence':
        return 'Missing Sequence';
      case 'expense_spike':
        return 'Expense Spike';
      default:
        return type.replaceAll('_', ' ');
    }
  }

  Future<void> _dismissInsight(String id) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/ai/insights/$id/dismiss');
      ref.invalidate(_insightsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to dismiss: $e'),
            backgroundColor: AppColors.red,
          ),
        );
      }
    }
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
            unselectedLabelStyle:
                const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            padding: const EdgeInsets.all(4),
            tabs: const [
              Tab(text: 'Insights'),
              Tab(text: 'Anomalies'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Tab content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildInsightsTab(),
              _buildAnomaliesTab(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInsightsTab() {
    final insightsAsync = ref.watch(_insightsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(_insightsProvider),
      child: insightsAsync.when(
        data: (insights) {
          if (insights.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.auto_awesome_outlined, size: 56, color: AppColors.muted),
                  const SizedBox(height: 12),
                  Text(
                    'No insights available',
                    style: TextStyle(color: AppColors.muted, fontSize: 15),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: insights.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final insight = insights[index];
              final id = insight['id']?.toString() ?? '';
              final title = insight['title'] ?? '';
              final description = insight['description'] ?? '';
              final severity = insight['severity'] ?? 'info';
              final actionLabel = insight['actionLabel'] ?? insight['action_label'];

              return Dismissible(
                key: Key(id.isNotEmpty ? id : 'insight_$index'),
                direction: DismissDirection.endToStart,
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 20),
                  decoration: BoxDecoration(
                    color: AppColors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.close, color: AppColors.red),
                ),
                onDismissed: (_) {
                  if (id.isNotEmpty) _dismissInsight(id);
                },
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: AppColors.border),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border(
                        left: BorderSide(
                          color: _severityColor(severity.toString()),
                          width: 4,
                        ),
                      ),
                    ),
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title.toString(),
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                            color: AppColors.ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          description.toString(),
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.muted,
                            height: 1.4,
                          ),
                        ),
                        if (actionLabel != null &&
                            actionLabel.toString().isNotEmpty) ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 32,
                            child: TextButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Action coming soon'),
                                  ),
                                );
                              },
                              style: TextButton.styleFrom(
                                foregroundColor: _severityColor(severity.toString()),
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                textStyle: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              child: Text(actionLabel.toString()),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
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
            itemCount: 6,
            itemBuilder: (_, __) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.auto_awesome_outlined, size: 56, color: AppColors.muted),
              const SizedBox(height: 12),
              Text(
                'No insights available',
                style: TextStyle(color: AppColors.muted, fontSize: 15),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(_insightsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnomaliesTab() {
    final anomaliesAsync = ref.watch(_anomaliesProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(_anomaliesProvider),
      child: anomaliesAsync.when(
        data: (anomalies) {
          if (anomalies.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 56, color: AppColors.muted),
                  const SizedBox(height: 12),
                  Text(
                    'No anomalies detected',
                    style: TextStyle(color: AppColors.muted, fontSize: 15),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: anomalies.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final anomaly = anomalies[index];
              final title = anomaly['title'] ?? '';
              final description = anomaly['description'] ?? '';
              final severity = anomaly['severity'] ?? 'low';
              final type = anomaly['type'] ?? '';
              final amount = anomaly['amount'];
              final detectedAt =
                  anomaly['detectedAt'] ?? anomaly['detected_at'] ?? '';

              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          // Severity badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: _severityBg(severity.toString()),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              severity.toString()[0].toUpperCase() +
                                  severity.toString().substring(1),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: _severityColor(severity.toString()),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Type badge
                          if (type.toString().isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.purpleLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _anomalyTypeLabel(type.toString()),
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.purple,
                                ),
                              ),
                            ),
                          const Spacer(),
                          if (amount != null)
                            Text(
                              formatINR(amount is num ? amount : num.tryParse(amount.toString()) ?? 0),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: AppColors.ink,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        title.toString(),
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        description.toString(),
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.muted,
                          height: 1.4,
                        ),
                      ),
                      if (detectedAt.toString().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Detected: ${formatDate(detectedAt.toString())}',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
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
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 6,
            itemBuilder: (_, __) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                height: 120,
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shield_outlined, size: 56, color: AppColors.muted),
              const SizedBox(height: 12),
              Text(
                'No anomalies detected',
                style: TextStyle(color: AppColors.muted, fontSize: 15),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(_anomaliesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
