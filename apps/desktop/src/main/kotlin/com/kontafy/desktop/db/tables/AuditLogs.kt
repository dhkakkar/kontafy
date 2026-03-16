package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object AuditLogs : Table("audit_logs") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64)
    val entityType = varchar("entity_type", 50) // invoice, journal_entry, payment, contact, product, bank_account
    val entityId = varchar("entity_id", 64)
    val action = varchar("action", 20) // CREATED, UPDATED, DELETED, STATUS_CHANGE, STOCK_RECEIVED
    val fieldChanged = varchar("field_changed", 100).nullable()
    val oldValue = text("old_value").nullable()
    val newValue = text("new_value").nullable()
    val description = text("description")
    val userId = varchar("user_id", 64).nullable()
    val userName = varchar("user_name", 100).nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)

    init {
        index(isUnique = false, orgId)
        index(isUnique = false, entityType, entityId)
        index(isUnique = false, createdAt)
    }
}
