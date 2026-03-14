package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object SyncQueue : Table("sync_queue") {
    val id = integer("id").autoIncrement()
    val entityType = varchar("entity_type", 50)
    val entityId = varchar("entity_id", 64)
    val action = varchar("action", 20) // create, update, delete
    val payload = text("payload") // JSON
    val status = varchar("status", 20).default("pending") // pending, syncing, synced, failed
    val retryCount = integer("retry_count").default(0)
    val errorMessage = text("error_message").nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val syncedAt = datetime("synced_at").nullable()

    override val primaryKey = PrimaryKey(id)
}
