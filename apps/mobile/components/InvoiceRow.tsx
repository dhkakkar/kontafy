import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/lib/colors';

interface InvoiceRowProps {
  invoiceNumber: string;
  customerName: string;
  amount: string;
  date: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  onPress?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: Colors.amber, bg: Colors.amberLight },
  sent: { label: 'Sent', color: Colors.blue, bg: Colors.blueLight },
  partially_paid: { label: 'Partial', color: Colors.amber, bg: Colors.amberLight },
  paid: { label: 'Paid', color: Colors.green, bg: Colors.greenLight },
  overdue: { label: 'Overdue', color: Colors.red, bg: Colors.redLight },
  cancelled: { label: 'Cancelled', color: Colors.muted, bg: Colors.surface },
};

export function InvoiceRow({
  invoiceNumber,
  customerName,
  amount,
  date,
  status,
  onPress,
}: InvoiceRowProps) {
  const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
        <Text style={styles.customerName} numberOfLines={1}>
          {customerName}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{amount}</Text>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    color: Colors.muted,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: Colors.muted,
  },
});
