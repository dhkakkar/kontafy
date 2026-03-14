package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.SyncQueueItem
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.SyncQueue
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

class SyncQueueRepository {

    fun getAll(): List<SyncQueueItem> = dbQuery {
        SyncQueue.selectAll()
            .orderBy(SyncQueue.createdAt to SortOrder.ASC)
            .map { it.toSyncQueueItem() }
    }

    fun getById(id: Int): SyncQueueItem? = dbQuery {
        SyncQueue.selectAll().where { SyncQueue.id eq id }
            .map { it.toSyncQueueItem() }
            .singleOrNull()
    }

    fun create(
        entityType: String,
        entityId: String,
        action: String,
        payload: String,
    ): SyncQueueItem = dbQuery {
        val insertedId = SyncQueue.insert {
            it[SyncQueue.entityType] = entityType
            it[SyncQueue.entityId] = entityId
            it[SyncQueue.action] = action
            it[SyncQueue.payload] = payload
            it[status] = "pending"
            it[retryCount] = 0
            it[createdAt] = LocalDateTime.now()
        } get SyncQueue.id

        SyncQueueItem(
            id = insertedId,
            entityType = entityType,
            entityId = entityId,
            action = action,
            payload = payload,
            status = "pending",
            retryCount = 0,
            errorMessage = null,
            createdAt = LocalDateTime.now(),
            syncedAt = null,
        )
    }

    fun delete(id: Int): Boolean = dbQuery {
        SyncQueue.deleteWhere { SyncQueue.id eq id } > 0
    }

    fun search(query: String): List<SyncQueueItem> = dbQuery {
        SyncQueue.selectAll().where {
            (SyncQueue.entityType like "%$query%") or
                (SyncQueue.entityId like "%$query%")
        }.map { it.toSyncQueueItem() }
    }

    fun getPending(): List<SyncQueueItem> = dbQuery {
        SyncQueue.selectAll().where { SyncQueue.status eq "pending" }
            .orderBy(SyncQueue.createdAt to SortOrder.ASC)
            .map { it.toSyncQueueItem() }
    }

    fun getByStatus(status: String): List<SyncQueueItem> = dbQuery {
        SyncQueue.selectAll().where { SyncQueue.status eq status }
            .orderBy(SyncQueue.createdAt to SortOrder.ASC)
            .map { it.toSyncQueueItem() }
    }

    fun markSyncing(id: Int): Boolean = dbQuery {
        SyncQueue.update({ SyncQueue.id eq id }) {
            it[status] = "syncing"
        } > 0
    }

    fun markSynced(id: Int): Boolean = dbQuery {
        SyncQueue.update({ SyncQueue.id eq id }) {
            it[status] = "synced"
            it[syncedAt] = LocalDateTime.now()
        } > 0
    }

    fun markFailed(id: Int, errorMessage: String): Boolean = dbQuery {
        // First get current retry count
        val current = SyncQueue.selectAll().where { SyncQueue.id eq id }
            .firstOrNull()?.get(SyncQueue.retryCount) ?: 0
        SyncQueue.update({ SyncQueue.id eq id }) {
            it[status] = "failed"
            it[SyncQueue.errorMessage] = errorMessage
            it[retryCount] = current + 1
        } > 0
    }

    fun resetFailed(maxRetries: Int = 3): Int = dbQuery {
        SyncQueue.update({
            (SyncQueue.status eq "failed") and (SyncQueue.retryCount less maxRetries)
        }) {
            it[status] = "pending"
        }
    }

    fun clearSynced(): Int = dbQuery {
        SyncQueue.deleteWhere { SyncQueue.status eq "synced" }
    }

    fun getPendingCount(): Long = dbQuery {
        SyncQueue.selectAll().where {
            (SyncQueue.status eq "pending") or (SyncQueue.status eq "failed")
        }.count()
    }

    private fun ResultRow.toSyncQueueItem() = SyncQueueItem(
        id = this[SyncQueue.id],
        entityType = this[SyncQueue.entityType],
        entityId = this[SyncQueue.entityId],
        action = this[SyncQueue.action],
        payload = this[SyncQueue.payload],
        status = this[SyncQueue.status],
        retryCount = this[SyncQueue.retryCount],
        errorMessage = this[SyncQueue.errorMessage],
        createdAt = this[SyncQueue.createdAt],
        syncedAt = this[SyncQueue.syncedAt],
    )
}
