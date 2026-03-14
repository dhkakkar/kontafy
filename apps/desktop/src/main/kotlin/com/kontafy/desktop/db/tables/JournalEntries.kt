package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object JournalEntries : Table("journal_entries") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val entryNumber = varchar("entry_number", 50)
    val date = varchar("date", 20)
    val narration = text("narration").nullable()
    val type = varchar("type", 20) // manual, auto
    val referenceType = varchar("reference_type", 50).nullable()
    val referenceId = varchar("reference_id", 64).nullable()
    val isPosted = bool("is_posted").default(false)
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)
}
