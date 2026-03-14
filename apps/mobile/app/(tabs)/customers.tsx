import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/lib/colors';
import api from '@/lib/api';

interface CustomerItem {
  id: string;
  name: string;
  company_name: string | null;
  gstin: string | null;
  phone: string | null;
  outstanding: number;
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const params: Record<string, any> = {
        page: 1,
        limit: 50,
        type: 'customer',
      };
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get('/bill/contacts', { params });
      const items = (data?.data ?? data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        company_name: c.company_name,
        gstin: c.gstin,
        phone: c.phone,
        outstanding: c.opening_balance ?? 0,
      }));
      setCustomers(items);
    } catch {
      // Fail silently
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchCustomers().finally(() => setLoading(false));
  }, [fetchCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

  const renderCustomer = ({ item }: { item: CustomerItem }) => (
    <TouchableOpacity style={styles.customerCard} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.company_name && (
          <Text style={styles.companyName} numberOfLines={1}>
            {item.company_name}
          </Text>
        )}
        {item.gstin && (
          <Text style={styles.gstin}>GSTIN: {item.gstin}</Text>
        )}
      </View>
      <View style={styles.customerRight}>
        {item.outstanding > 0 && (
          <Text style={styles.outstanding}>
            {'\u20B9'}{item.outstanding.toLocaleString('en-IN')}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={customers.length === 0 ? styles.emptyList : styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyText}>No customers found</Text>
              <Text style={styles.emptySubtext}>
                {search ? 'Try a different search term' : 'Add your first customer'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="person-add" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  customerInfo: {
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
  },
  companyName: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 1,
  },
  gstin: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  customerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  outstanding: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  separator: {
    height: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
