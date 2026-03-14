import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/lib/colors';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/Card';
import { InvoiceRow } from '@/components/InvoiceRow';
import api from '@/lib/api';

interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  receivables: number;
  payables: number;
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    contact_name: string;
    total: number;
    status: string;
    date: string;
  }>;
}

function formatINR(amount: number): string {
  const absNum = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absNum >= 10000000) return sign + '\u20B9' + (absNum / 10000000).toFixed(2) + ' Cr';
  if (absNum >= 100000) return sign + '\u20B9' + (absNum / 100000).toFixed(2) + ' L';
  if (absNum >= 1000) return sign + '\u20B9' + (absNum / 1000).toFixed(1) + 'K';
  return sign + '\u20B9' + absNum.toFixed(0);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    totalExpenses: 0,
    receivables: 0,
    payables: 0,
    recentInvoices: [],
  });

  const orgName = user?.organizations?.[0]?.name ?? 'Your Business';

  const fetchDashboard = useCallback(async () => {
    try {
      // Fetch recent invoices as the main data source
      const invoicesRes = await api.get('/bill/invoices', {
        params: { page: 1, limit: 5 },
      });
      const invoices = invoicesRes.data?.data ?? invoicesRes.data ?? [];

      // Calculate summary from invoices
      let revenue = 0;
      let receivables = 0;
      for (const inv of invoices) {
        if (inv.type === 'sale') {
          revenue += inv.total ?? 0;
          if (['sent', 'partially_paid', 'overdue'].includes(inv.status)) {
            receivables += inv.balance_due ?? 0;
          }
        }
      }

      setData({
        totalRevenue: revenue,
        totalExpenses: 0,
        receivables,
        payables: 0,
        recentInvoices: invoices.map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          contact_name: inv.contact?.name ?? inv.contact_name ?? 'Unknown',
          total: inv.total,
          status: inv.status,
          date: inv.date,
        })),
      });
    } catch {
      // Silently fail - user will see empty dashboard
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.orgName}>{orgName}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <Card
            title="Revenue"
            value={formatINR(data.totalRevenue)}
            icon="trending-up-outline"
            iconColor={Colors.green}
            iconBg={Colors.greenLight}
          />
          <Card
            title="Expenses"
            value={formatINR(data.totalExpenses)}
            icon="trending-down-outline"
            iconColor={Colors.red}
            iconBg={Colors.redLight}
          />
        </View>
        <View style={styles.cardsRow}>
          <Card
            title="Receivables"
            value={formatINR(data.receivables)}
            icon="arrow-down-circle-outline"
            iconColor={Colors.blue}
            iconBg={Colors.blueLight}
          />
          <Card
            title="Payables"
            value={formatINR(data.payables)}
            icon="arrow-up-circle-outline"
            iconColor={Colors.amber}
            iconBg={Colors.amberLight}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.greenLight }]}>
                <Ionicons name="add-circle-outline" size={22} color={Colors.green} />
              </View>
              <Text style={styles.actionLabel}>New Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.blueLight }]}>
                <Ionicons name="person-add-outline" size={22} color={Colors.blue} />
              </View>
              <Text style={styles.actionLabel}>New Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.amberLight }]}>
                <Ionicons name="receipt-outline" size={22} color={Colors.amber} />
              </View>
              <Text style={styles.actionLabel}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Invoices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/invoices')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.invoicesList}>
            {data.recentInvoices.length > 0 ? (
              data.recentInvoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoiceNumber={inv.invoice_number}
                  customerName={inv.contact_name}
                  amount={`\u20B9${inv.total.toLocaleString('en-IN')}`}
                  date={formatDate(inv.date)}
                  status={inv.status as any}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyText}>No invoices yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first invoice to get started
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 2,
  },
  orgName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.green,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    textAlign: 'center',
  },
  invoicesList: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
