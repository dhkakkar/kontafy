package com.kontafy.desktop.sync

import com.kontafy.desktop.api.*
import com.kontafy.desktop.db.repositories.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import java.time.LocalDateTime

class SyncEngine(
    private val apiClient: ApiClient,
    private val networkMonitor: NetworkMonitor,
    private val organizationRepository: OrganizationRepository,
    private val accountRepository: AccountRepository,
    private val contactRepository: ContactRepository,
    private val invoiceRepository: InvoiceRepository,
    private val invoiceItemRepository: InvoiceItemRepository,
    private val journalEntryRepository: JournalEntryRepository,
    private val journalLineRepository: JournalLineRepository,
    private val productRepository: ProductRepository,
    private val paymentRepository: PaymentRepository,
    private val bankAccountRepository: BankAccountRepository,
    private val syncQueueRepository: SyncQueueRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val syncIntervalMs: Long = 5 * 60 * 1000L, // 5 minutes
) {
    private val _syncState = MutableStateFlow(SyncState())
    val syncState: StateFlow<SyncState> = _syncState.asStateFlow()

    private var syncJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    fun start() {
        // Start network monitoring with auto-sync on reconnect
        networkMonitor.start(scope) {
            scope.launch { startSync() }
        }

        // Start periodic sync
        syncJob?.cancel()
        syncJob = scope.launch {
            while (isActive) {
                if (networkMonitor.isOnline.value) {
                    startSync()
                } else {
                    _syncState.value = _syncState.value.copy(
                        status = SyncStatus.OFFLINE,
                    )
                }
                delay(syncIntervalMs)
            }
        }
    }

    fun stop() {
        syncJob?.cancel()
        syncJob = null
        networkMonitor.stop()
        scope.cancel()
    }

    suspend fun startSync() {
        if (_syncState.value.status == SyncStatus.SYNCING) return

        if (!networkMonitor.isOnline.value) {
            _syncState.value = _syncState.value.copy(
                status = SyncStatus.OFFLINE,
                pendingChanges = syncQueueRepository.getPendingCount(),
            )
            return
        }

        try {
            _syncState.value = _syncState.value.copy(status = SyncStatus.SYNCING)

            // Push local changes first
            pushChanges()

            // Then pull server changes
            pullChanges()

            // Clean up synced items
            syncQueueRepository.clearSynced()

            _syncState.value = SyncState(
                status = SyncStatus.IDLE,
                lastSyncTime = LocalDateTime.now(),
                pendingChanges = syncQueueRepository.getPendingCount(),
            )

            appSettingsRepository.set(LAST_SYNC_KEY, LocalDateTime.now().toString())
        } catch (e: Exception) {
            _syncState.value = SyncState(
                status = SyncStatus.ERROR,
                lastSyncTime = _syncState.value.lastSyncTime,
                pendingChanges = syncQueueRepository.getPendingCount(),
                errorMessage = e.message ?: "Sync failed",
            )
        }
    }

    suspend fun fullSync() {
        if (!networkMonitor.isOnline.value) {
            _syncState.value = _syncState.value.copy(status = SyncStatus.OFFLINE)
            return
        }

        try {
            _syncState.value = _syncState.value.copy(status = SyncStatus.SYNCING)

            // Pull all data from server (full refresh)
            pullAllData()

            _syncState.value = SyncState(
                status = SyncStatus.IDLE,
                lastSyncTime = LocalDateTime.now(),
                pendingChanges = 0,
            )

            appSettingsRepository.set(LAST_SYNC_KEY, LocalDateTime.now().toString())
            appSettingsRepository.set(FULL_SYNC_COMPLETED_KEY, "true")
        } catch (e: Exception) {
            _syncState.value = SyncState(
                status = SyncStatus.ERROR,
                lastSyncTime = _syncState.value.lastSyncTime,
                pendingChanges = syncQueueRepository.getPendingCount(),
                errorMessage = "Full sync failed: ${e.message}",
            )
        }
    }

    private suspend fun pushChanges() {
        // Reset previously failed items for retry
        syncQueueRepository.resetFailed()

        val pendingItems = syncQueueRepository.getPending()
        for (item in pendingItems) {
            try {
                syncQueueRepository.markSyncing(item.id)

                val success = pushEntityToServer(
                    entityType = item.entityType,
                    entityId = item.entityId,
                    action = item.action,
                    payload = item.payload,
                )

                if (success) {
                    syncQueueRepository.markSynced(item.id)
                } else {
                    syncQueueRepository.markFailed(item.id, "Server rejected the change")
                }
            } catch (e: Exception) {
                syncQueueRepository.markFailed(item.id, e.message ?: "Unknown error")
            }
        }
    }

    private suspend fun pushEntityToServer(
        entityType: String,
        entityId: String,
        action: String,
        payload: String,
    ): Boolean {
        // Route to the appropriate API endpoint based on entity type and action
        // This is a framework -- actual API calls depend on server endpoints
        return try {
            when (entityType) {
                "invoice" -> when (action) {
                    "create", "update" -> {
                        // apiClient.createOrUpdateInvoice(payload) -- to be wired
                        true
                    }
                    "delete" -> {
                        // apiClient.deleteInvoice(entityId) -- to be wired
                        true
                    }
                    else -> false
                }
                "contact" -> when (action) {
                    "create", "update" -> true // apiClient.createOrUpdateContact(payload)
                    "delete" -> true // apiClient.deleteContact(entityId)
                    else -> false
                }
                "payment" -> when (action) {
                    "create", "update" -> true // apiClient.createOrUpdatePayment(payload)
                    "delete" -> true // apiClient.deletePayment(entityId)
                    else -> false
                }
                "journal_entry" -> when (action) {
                    "create", "update" -> true
                    "delete" -> true
                    else -> false
                }
                "product" -> when (action) {
                    "create", "update" -> true
                    "delete" -> true
                    else -> false
                }
                else -> {
                    // Unknown entity type -- skip
                    false
                }
            }
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun pullChanges() {
        val lastSync = appSettingsRepository.get(LAST_SYNC_KEY)

        // Pull updated invoices from server
        val invoicesResult = apiClient.getInvoices(page = 1, pageSize = 100)
        invoicesResult.onSuccess { invoices ->
            for (dto in invoices) {
                val model = dto.toInvoiceModel()
                invoiceRepository.upsert(model)

                // Also upsert invoice items
                for (itemDto in dto.items) {
                    val itemModel = itemDto.toInvoiceItemModel(dto.id)
                    invoiceItemRepository.upsert(itemModel)
                }
            }
        }

        // Pull updated customers/contacts
        val customersResult = apiClient.getCustomers(page = 1, pageSize = 100)
        customersResult.onSuccess { customers ->
            for (dto in customers) {
                val model = dto.toContactModel()
                contactRepository.upsert(model)
            }
        }
    }

    private suspend fun pullAllData() {
        // Full pull of all entities
        pullChanges()
        // Additional entity types can be pulled here as API endpoints are added
    }

    fun resolveConflicts(localUpdatedAt: LocalDateTime?, serverUpdatedAt: LocalDateTime?): Boolean {
        // Server-wins strategy: return true if server version should win
        if (serverUpdatedAt == null) return false
        if (localUpdatedAt == null) return true
        return serverUpdatedAt.isAfter(localUpdatedAt)
    }

    fun getSyncStatus(): SyncState = _syncState.value

    // Queue a local change for sync
    fun queueChange(entityType: String, entityId: String, action: String, payload: String) {
        syncQueueRepository.create(entityType, entityId, action, payload)
        _syncState.value = _syncState.value.copy(
            pendingChanges = syncQueueRepository.getPendingCount(),
        )
    }

    companion object {
        private const val LAST_SYNC_KEY = "last_sync_time"
        private const val FULL_SYNC_COMPLETED_KEY = "full_sync_completed"
    }
}
