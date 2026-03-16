package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.AuditLogs
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime
import java.util.UUID

data class AuditLogEntry(
    val id: String = UUID.randomUUID().toString(),
    val orgId: String,
    val entityType: String,
    val entityId: String,
    val action: String,
    val fieldChanged: String? = null,
    val oldValue: String? = null,
    val newValue: String? = null,
    val description: String,
    val userId: String? = null,
    val userName: String? = null,
    val createdAt: LocalDateTime = LocalDateTime.now(),
)

class AuditLogRepository {

    fun create(entry: AuditLogEntry): AuditLogEntry = dbQuery {
        AuditLogs.insert {
            it[id] = entry.id
            it[orgId] = entry.orgId
            it[entityType] = entry.entityType
            it[entityId] = entry.entityId
            it[action] = entry.action
            it[fieldChanged] = entry.fieldChanged
            it[oldValue] = entry.oldValue
            it[newValue] = entry.newValue
            it[description] = entry.description
            it[userId] = entry.userId
            it[userName] = entry.userName
            it[createdAt] = entry.createdAt
        }
        entry
    }

    fun getByEntity(entityType: String, entityId: String): List<AuditLogEntry> = dbQuery {
        AuditLogs.selectAll().where {
            (AuditLogs.entityType eq entityType) and (AuditLogs.entityId eq entityId)
        }.orderBy(AuditLogs.createdAt to SortOrder.DESC)
            .map { it.toAuditLogEntry() }
    }

    fun getByOrgId(orgId: String, limit: Int = 100): List<AuditLogEntry> = dbQuery {
        AuditLogs.selectAll().where { AuditLogs.orgId eq orgId }
            .orderBy(AuditLogs.createdAt to SortOrder.DESC)
            .limit(limit)
            .map { it.toAuditLogEntry() }
    }

    fun getByEntityType(orgId: String, entityType: String, limit: Int = 100): List<AuditLogEntry> = dbQuery {
        AuditLogs.selectAll().where {
            (AuditLogs.orgId eq orgId) and (AuditLogs.entityType eq entityType)
        }.orderBy(AuditLogs.createdAt to SortOrder.DESC)
            .limit(limit)
            .map { it.toAuditLogEntry() }
    }

    fun getStockMovements(orgId: String, limit: Int = 500): List<AuditLogEntry> = dbQuery {
        AuditLogs.selectAll().where {
            (AuditLogs.orgId eq orgId) and (AuditLogs.entityType eq "product") and
                (AuditLogs.action inList listOf("STOCK_RECEIVED", "STOCK_SOLD", "STOCK_ADJUSTED"))
        }.orderBy(AuditLogs.createdAt to SortOrder.DESC)
            .limit(limit)
            .map { it.toAuditLogEntry() }
    }

    private fun ResultRow.toAuditLogEntry() = AuditLogEntry(
        id = this[AuditLogs.id],
        orgId = this[AuditLogs.orgId],
        entityType = this[AuditLogs.entityType],
        entityId = this[AuditLogs.entityId],
        action = this[AuditLogs.action],
        fieldChanged = this[AuditLogs.fieldChanged],
        oldValue = this[AuditLogs.oldValue],
        newValue = this[AuditLogs.newValue],
        description = this[AuditLogs.description],
        userId = this[AuditLogs.userId],
        userName = this[AuditLogs.userName],
        createdAt = this[AuditLogs.createdAt],
    )
}
